# Copperline Eatery — Website Status (live state)

**Site:** https://copperlineeatery.com (Astro 7 + TypeScript, vanilla CSS, Netlify via GitHub Actions, default branch `master`)
**Last updated:** 2026-07-27

## What is live on prod (through Session 31: formatted catering-quote email via Postmark; Session 30 dep upgrades, audit down to 3 upstream moderates; Session 29 Astro 7 + Sunday-hours fix)
- 36 pages: 7 core routes + 25 town catering pages (22 MA + 5 CT incl. region hub) + `/catering/quote` + catering-thanks + submit-specials.
- **`/catering/quote` interactive quote builder LIVE** (indexed): pick a buffet, build the menu with real choose-N limits, live priced estimate (15% service + 7% MA meals tax), Save-as-PDF. Lead arrives itemized via the `catering-quote` Netlify form. `/catering` + all 25 town pages stay price-free.
- /catering is a full landing page (no pricing, per owner call) with the `catering-inquiry` Netlify form; email notification configured, leads arrive by email.
- Specials pipeline live: email/web photo upload, Claude vision, YES-gated publish to /menu. Inbound webhook (`inbound-email.ts`) hardened `841cf09`: auto-publish requires aligned-DKIM auth (spoof-proof, fail-safe to the YES-gate), timing-safe Basic auth, public path throttled 20/hr.
- Quote leads arrive as a short Postmark email + attached PDF that replicates the on-site print sheet (logo, Oswald/Merriweather, red-ruled totals), From `Copperline Catering <catering@parse...>` (separate from the specials bot), Reply-To = customer, recipients in `QUOTE_NOTIFY_EMAILS`. The raw Netlify dashboard notification still fires in parallel until Ian deletes it (Forms -> catering-quote -> Notifications).
- GA4 + Clarity live (idle-loaded); IndexNow pings on every prod deploy.

## Known open questions
- ~~Sat/Sun opening hours discrepancy~~ resolved 2026-07-27 (Session 29): Google Business Profile is authoritative — Sat 6:00am-1:30pm, Sun 7:00am-1:00pm. Site now matches everywhere (schema + visible + llms.txt).
- ~~3 MA town pages unindexed~~ resolved 2026-07-27: Request Indexing re-run confirmed, all 3 now indexed.
- Quote-builder tax treatment (7% MA meals tax applied on food + 15% service charge) confirmed correct by owner 2026-07-27.

## Pointers
- Session-by-session history: [docs/SESSION_LOG.md](docs/SESSION_LOG.md) (append-only archive; audits in [audits/](audits/)).
- Open tasks: [../TODO.md](../TODO.md) (single source of truth, todo-sync to Notion).
- Evergreen project brief: [CLAUDE.md](CLAUDE.md).
