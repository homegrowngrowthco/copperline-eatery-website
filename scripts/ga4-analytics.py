#!/usr/bin/env python3
"""GA4 read for copperlineeatery.com (op #1715). Read-only.

Prints: the GA4 property behind measurement ID G-DXYNCF0G79, its key events
(whether the two catering events are marked as key events), and for the last
N days the catering quote/inquiry events by landing page and by session
source, plus sessions by landing page for /blog and /specials. This is the
"catering lead attributable to a post" read for the content gate.

Auth: ~/.gsc/token-ga4.json from scripts/ga4-auth.py (analytics.readonly).

Usage:
  C:\\Users\\Ian\\.venvs\\gsc\\Scripts\\python scripts/ga4-analytics.py [days]   (default 90)
"""
import os
import sys

from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

MEASUREMENT_ID = "G-DXYNCF0G79"
LEAD_EVENTS = ("catering_quote_submit", "catering_inquiry_submit")
TOKEN = os.path.expanduser("~/.gsc/token-ga4.json")
SCOPES = ["https://www.googleapis.com/auth/analytics.readonly"]
DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 90

creds = Credentials.from_authorized_user_file(TOKEN, SCOPES)
admin = build("analyticsadmin", "v1beta", credentials=creds)
data = build("analyticsdata", "v1beta", credentials=creds)

prop = None
for acct in admin.accountSummaries().list().execute().get("accountSummaries", []):
    for p in acct.get("propertySummaries", []):
        streams = admin.properties().dataStreams().list(parent=p["property"]).execute().get("dataStreams", [])
        if any(s.get("webStreamData", {}).get("measurementId") == MEASUREMENT_ID for s in streams):
            prop = p
            break
    if prop:
        break
if not prop:
    sys.exit(f"No GA4 property with measurement ID {MEASUREMENT_ID} is visible to this Google account.")
print(f"property: {prop['displayName']} ({prop['property']})")

keys = admin.properties().keyEvents().list(parent=prop["property"]).execute().get("keyEvents", [])
key_names = {k["eventName"] for k in keys}
print("key events:", ", ".join(sorted(key_names)) or "(none)")
for e in LEAD_EVENTS:
    print(f"  {e}: {'KEY EVENT' if e in key_names else 'not a key event (GA4 Admin > Events > mark as key event)'}")


def report(dimensions, metrics, flt=None, limit=25):
    body = {
        "dateRanges": [{"startDate": f"{DAYS}daysAgo", "endDate": "yesterday"}],
        "dimensions": [{"name": d} for d in dimensions],
        "metrics": [{"name": m} for m in metrics],
        "limit": limit,
        "orderBys": [{"metric": {"metricName": metrics[0]}, "desc": True}],
    }
    if flt:
        body["dimensionFilter"] = flt
    res = data.properties().runReport(property=prop["property"], body=body).execute()
    return [([d["value"] for d in r["dimensionValues"]], [m["value"] for m in r["metricValues"]]) for r in res.get("rows", [])]


lead_filter = {"filter": {"fieldName": "eventName", "inListFilter": {"values": list(LEAD_EVENTS)}}}
print(f"\n== catering lead events, last {DAYS} days, by landing page ==")
for dims, mets in report(["eventName", "landingPagePlusQueryString"], ["eventCount"], lead_filter):
    print(f"  {mets[0]:>4}  {dims[0]:<26} {dims[1]}")
print(f"\n== catering lead events, last {DAYS} days, by session source / medium ==")
for dims, mets in report(["eventName", "sessionSourceMedium"], ["eventCount"], lead_filter):
    print(f"  {mets[0]:>4}  {dims[0]:<26} {dims[1]}")

page_filter = {"orGroup": {"expressions": [
    {"filter": {"fieldName": "landingPage", "stringFilter": {"matchType": "BEGINS_WITH", "value": "/blog"}}},
    {"filter": {"fieldName": "landingPage", "stringFilter": {"matchType": "BEGINS_WITH", "value": "/specials"}}},
]}}
print(f"\n== sessions landing on /blog and /specials, last {DAYS} days ==")
for dims, mets in report(["landingPage"], ["sessions", "engagedSessions"], page_filter):
    print(f"  {mets[0]:>5} sessions ({mets[1]} engaged)  {dims[0]}")
