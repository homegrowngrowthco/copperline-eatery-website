# Copperline Eatery — Website Status (live state)

**Site:** https://copperlineeatery.com (Astro 5 + TypeScript, vanilla CSS, Netlify via GitHub Actions, default branch `master`)
**Last updated:** 2026-07-27

## What is live on prod (through Session 28, PR #4 merged as `33b10e1`)
- 36 pages: 7 core routes + 25 town catering pages (22 MA + 5 CT incl. region hub) + `/catering/quote` + catering-thanks + submit-specials.
- **`/catering/quote` interactive quote builder LIVE** (indexed): pick a buffet, build the menu with real choose-N limits, live priced estimate (15% service + 7% MA meals tax), Save-as-PDF. Lead arrives itemized via the `catering-quote` Netlify form. `/catering` + all 25 town pages stay price-free.
- /catering is a full landing page (no pricing, per owner call) with the `catering-inquiry` Netlify form; email notification configured, leads arrive by email.
- Specials pipeline live: email/web photo upload, Claude vision, YES-gated publish to /menu.
- GA4 + Clarity live (idle-loaded); IndexNow pings on every prod deploy.

## Action needed (dashboard-only, no API)
- **Add the email notification for the `catering-quote` form** (form id `6a554f01121b750009f6cd80`). Netlify → copperlineeatery → Forms → catering-quote → Add notification → Email, matching whatever `catering-inquiry` sends to. Until then, quote leads pool in the dashboard unseen (1 QA submission already sitting there).

## Known open questions
- Sat/Sun opening hours discrepancy (Ian dictated Sat 6:30/Sun 7:00; `restaurant.ts` says Sat 6:00/Sun 6:30 and drives the site). Awaiting Ian's confirmation.
- ~~3 MA town pages unindexed~~ resolved 2026-07-27: Request Indexing re-run confirmed, all 3 now indexed.
- Quote-builder tax treatment (7% MA meals tax applied on food + 15% service charge) confirmed correct by owner 2026-07-27.

## Pointers
- Session-by-session history: [docs/SESSION_LOG.md](docs/SESSION_LOG.md) (append-only archive; audits in [audits/](audits/)).
- Open tasks: [../TODO.md](../TODO.md) (single source of truth, todo-sync to Notion).
- Evergreen project brief: [CLAUDE.md](CLAUDE.md).
