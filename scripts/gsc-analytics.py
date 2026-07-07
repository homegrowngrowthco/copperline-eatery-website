#!/usr/bin/env python3
"""GSC search-analytics pull for copperlineeatery.com.

Prints 28d-vs-prior-28d totals, top queries, branded/non-branded split,
catering-query detail, per-page rows (town pages broken out), and the
http-vs-https homepage consolidation check.

Auth: shared OAuth user creds at ~/.gsc/ (same token as the HGC/TAG
gsc-index-status.py scripts; webmasters.readonly scope).

Usage:
  C:\\Users\\Ian\\.venvs\\gsc\\Scripts\\python scripts/gsc-analytics.py [host]
  host defaults to copperlineeatery.com (matched against the GSC site list)
"""
import os
import sys
from datetime import date, timedelta

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

GSC_DIR = os.path.expanduser("~/.gsc")
TOKEN = os.path.join(GSC_DIR, "token.json")
SCOPES = ["https://www.googleapis.com/auth/webmasters.readonly"]

HOST = (sys.argv[1] if len(sys.argv) > 1 else "copperlineeatery.com")
BARE = HOST.split("://", 1)[-1].rstrip("/")
BRAND_TERMS = ("copperline", "copper line", "coperline", "cooperline")

creds = Credentials.from_authorized_user_file(TOKEN, SCOPES)
svc = build("searchconsole", "v1", credentials=creds)

site = None
for s in svc.sites().list().execute().get("siteEntry", []):
    if BARE in s["siteUrl"]:
        site = s["siteUrl"]
        break
if not site:
    sys.exit(f"No GSC property matching {BARE} for this token.")
print(f"property: {site}")

end = date.today() - timedelta(days=3)  # GSC data lags ~2 days
start = end - timedelta(days=27)
prev_end = start - timedelta(days=1)
prev_start = prev_end - timedelta(days=27)
print(f"current window: {start} .. {end} | prior: {prev_start} .. {prev_end}")


def q(body):
    return svc.searchanalytics().query(siteUrl=site, body=body).execute().get("rows", [])


def totals(s, e):
    rows = q({"startDate": str(s), "endDate": str(e), "dimensions": []})
    return rows[0] if rows else {"clicks": 0, "impressions": 0, "position": 0}


cur, prev = totals(start, end), totals(prev_start, prev_end)
print("\n== TOTALS (28d vs prior 28d) ==")
for label, t in (("current", cur), ("prior  ", prev)):
    ctr = t["clicks"] / t["impressions"] * 100 if t["impressions"] else 0
    print(f"{label}: {t['clicks']:.0f} clicks / {t['impressions']:.0f} impr / "
          f"{ctr:.1f}% CTR / pos {t.get('position', 0):.1f}")

print("\n== TOP 25 QUERIES (28d) ==")
rows = q({"startDate": str(start), "endDate": str(end), "dimensions": ["query"], "rowLimit": 500})
nb_c = nb_i = b_c = b_i = 0
for r in rows:
    if any(t in r["keys"][0] for t in BRAND_TERMS):
        b_c += r["clicks"]; b_i += r["impressions"]
    else:
        nb_c += r["clicks"]; nb_i += r["impressions"]
for r in rows[:25]:
    print(f"  {r['keys'][0][:52]:<52} {r['clicks']:>4.0f}c {r['impressions']:>6.0f}i pos {r['position']:>5.1f}")
print(f"\nbranded:     {b_c:.0f} clicks / {b_i:.0f} impr")
print(f"non-branded: {nb_c:.0f} clicks / {nb_i:.0f} impr "
      f"({nb_c / nb_i * 100 if nb_i else 0:.1f}% CTR)")

print("\n== CATERING QUERIES (28d) ==")
cat = [r for r in rows if "cater" in r["keys"][0]]
for r in sorted(cat, key=lambda r: -r["impressions"])[:20]:
    print(f"  {r['keys'][0][:52]:<52} {r['clicks']:>4.0f}c {r['impressions']:>6.0f}i pos {r['position']:>5.1f}")
print(f"  catering totals: {sum(r['clicks'] for r in cat):.0f} clicks / "
      f"{sum(r['impressions'] for r in cat):.0f} impr across {len(cat)} queries")

print("\n== PAGES (28d) ==")
rows = q({"startDate": str(start), "endDate": str(end), "dimensions": ["page"], "rowLimit": 100})
town = [r for r in rows if "/catering/" in r["keys"][0]]
other = [r for r in rows if "/catering/" not in r["keys"][0]]
for r in other[:12]:
    p = r["keys"][0].replace(f"https://{BARE}", "") or "/"
    print(f"  {p[:44]:<44} {r['clicks']:>4.0f}c {r['impressions']:>6.0f}i pos {r['position']:>5.1f}")
print(f"\n== TOWN/SERVICE-AREA PAGES ({len(town)} with impressions) ==")
for r in sorted(town, key=lambda r: -r["impressions"]):
    p = r["keys"][0].replace(f"https://{BARE}", "")
    print(f"  {p[:44]:<44} {r['clicks']:>4.0f}c {r['impressions']:>6.0f}i pos {r['position']:>5.1f}")

print("\n== HTTP vs HTTPS homepage consolidation (28d) ==")
for page in (f"http://{BARE}/", f"https://{BARE}/"):
    rows = q({"startDate": str(start), "endDate": str(end), "dimensions": ["page"],
              "dimensionFilterGroups": [{"filters": [
                  {"dimension": "page", "operator": "equals", "expression": page}]}]})
    r = rows[0] if rows else {"clicks": 0, "impressions": 0}
    print(f"  {page:<38} {r['clicks']:>5.0f}c {r['impressions']:>7.0f}i")
