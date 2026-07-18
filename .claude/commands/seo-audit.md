# /seo-audit — full SEO audit of copperlineeatery.com

Run a current-state SEO audit of the live site and report findings as a delta against the most recent `audits/AUDIT-*.md` (read it first so you don't repeat known/accepted items). Do not change code or content as part of the audit; findings only.

## Steps

1. **Read the latest audit doc** (`audits/AUDIT-SEO-*.md` / `audits/AUDIT-GROWTH-*.md`, newest date) for the baseline numbers and the list of accepted/known items (e.g. Lighthouse BP 77 = GA4/Clarity third-party cookies).

2. **Indexation** — every sitemap URL through the GSC URL Inspection API (shared OAuth token at `~/.gsc/`, venv at `C:\Users\Ian\.venvs\gsc`):
   ```
   C:\Users\Ian\.venvs\gsc\Scripts\python ..\..\homegrown-growthco\scripts\gsc-index-status.py https://copperlineeatery.com
   ```
   Anything not "Submitted and indexed" goes in the report with a Request-Indexing action for Ian.

3. **Search analytics** — 28d vs prior 28d, branded/non-branded split, catering queries, town-page impressions, http-vs-https homepage consolidation:
   ```
   C:\Users\Ian\.venvs\gsc\Scripts\python scripts/gsc-analytics.py
   ```

4. **On-page crawl lint** — titles/descriptions/canonicals/H1s/duplicates/em-dashes across every sitemap URL:
   ```
   node scripts/seo-crawl.mjs
   ```
   Limits enforced: title 20-65 chars, description 60-170, exactly one H1, self-canonical, zero em/en dashes.

5. **Technical spot checks** (curl): robots.txt reachable + points at sitemap-index; `http://`, `www.`, `.html`, and trailing-slash variants all 301 single-hop; unknown URL returns 404; `/llms.txt` 200; IndexNow key file 200.

6. **Lighthouse (mobile)** on 2-3 key pages, at minimum `/catering` plus any page that changed since the last audit:
   ```
   npx lighthouse <url> --output=json --output-path=<scratchpad>/lh-<slug>.json --only-categories=performance,accessibility,best-practices,seo --chrome-flags="--headless=new" --quiet
   ```
   Note: the CLI exits 1 even on success (chrome-launcher temp cleanup); parse the JSON regardless. BP 77 is the accepted third-party-cookie cap.

## Report

Write the findings as a dated `audits/AUDIT-SEO-YYYY-MM-DD.md`, matching the structure of the previous one: verdict up front, indexation table, technical-checks table, Lighthouse table, GSC delta table, new findings (numbered, with effort estimates), and re-ranked standing items. Separate what Claude can fix from what needs Ian vs his dad (account owner). Then summarize in chat, leading with the headline and the single most valuable action.
