# Copperline Eatery — Website Status (live state)

**Site:** https://copperlineeatery.com (Astro 5 + TypeScript, vanilla CSS, Netlify via GitHub Actions, default branch `master`)
**Last updated:** 2026-07-18

## What is live on prod (through Session 25, commit `c511da2`)
- 35 pages: 7 core routes + 25 town catering pages (22 MA + 5 CT incl. region hub) + catering-thanks + submit-specials.
- /catering is a full landing page (no pricing, per owner call) with the `catering-inquiry` Netlify form; email notification configured, leads arrive by email.
- Specials pipeline live: email/web photo upload, Claude vision, YES-gated publish to /menu.
- SEO fix wave (meta trims, webp re-encode, FAQ a11y, footer Where We Cater link) deployed.
- GA4 + Clarity live (idle-loaded); IndexNow pings on every prod deploy.

## In flight (NOT deployed)
- **PR #4 OPEN** (branch `catering-quote-builder`): /catering/quote interactive quote builder + /catering polish + 5-column footer. Awaiting Ian's review/merge. After merge: add the Netlify email notification for the NEW `catering-quote` form (dashboard-only).

## Known open questions
- Sat/Sun opening hours discrepancy (Ian dictated Sat 6:30/Sun 7:00; `restaurant.ts` says Sat 6:00/Sun 6:30 and drives the site). Awaiting Ian's confirmation.
- 3 MA town pages (hadley/monson/southwick) still unindexed; needs a GSC Request Indexing re-run (open since 2026-07-07).

## Pointers
- Session-by-session history: [docs/SESSION_LOG.md](docs/SESSION_LOG.md) (append-only archive; audits in [audits/](audits/)).
- Open tasks: [../TODO.md](../TODO.md) (single source of truth, todo-sync to Notion).
- Evergreen project brief: [CLAUDE.md](CLAUDE.md).
