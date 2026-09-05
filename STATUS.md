# Copperline Eatery — Website Status (live state)

**Site:** https://copperlineeatery.com (Astro 7 + TypeScript, vanilla CSS, Netlify via GitHub Actions, default branch `master`)
**Last updated:** 2026-09-05

## What is live on prod (through Session 35: blog pages restyled onto the design system + homepage stripe fix (PR #11, `5cb6245`); Session 34: specials archive + weekly local-post engine shipped and content-quality fixed; Session 33 specials board photo + shoutout + new /specials page)
- 41 pages: 7 core routes + 25 town catering pages (22 MA + 5 CT incl. region hub) + `/catering/quote` + catering-thanks + submit-specials + specials + `/blog` + 2 posts, plus one dated `/specials/<date>` archive page per published board.
- **Specials archive (Tier A) LIVE**: every publish archives the outgoing board into `specials.json`'s `history[]` (capped 52), giving each week a permanent `/specials/<date>` page. `/specials` links to the last 12.
- **Weekly local-post engine (Tier B) LIVE**: Astro content collection (`src/content/blog/`), `content/backlog.json` topic queue, `scripts/generate-post.mjs` (two-pass draft + humanize against a banned-phrase list, modeled on theautomationsguide's real pipeline), `scripts/blog-gates.mjs` deterministic gates, `.github/workflows/weekly-post.yml` (Monday cron + manual dispatch), no auto-merge ever. **Blocked on a repo setting** (see `../TODO.md`): "Allow GitHub Actions to create and approve pull requests" is off, so the automated run can't open its own PR yet. 2 real posts live (`brunch-mimosas-chicopee`, `graduation-party-catering-chicopee`); both got a content revision after Ian caught a factual error (wrongly claimed no liquor license; the diner holds a beer/wine license, mimosas run as an occasional special, see `restaurant.ALCOHOL_NOTE`) and excess pricing detail.
- **`/specials` LIVE**: indexable page rendering the current board (text always; photo + "Thank you X from Y" credit once a submission has gone through the new pipeline — the board live right now predates this feature, so it's still text-only). Nav + homepage repointed from `/menu#specials`, which still renders the same component. New `specials-board` function serves the stored photo immutably-cached.
- **`/catering/quote` interactive quote builder LIVE** (NOT yet indexed, see open questions): pick a buffet, build the menu with real choose-N limits, live priced estimate (15% service + 7% MA meals tax), Save-as-PDF. Lead arrives itemized via the `catering-quote` Netlify form. `/catering` + all 25 town pages stay price-free.
- /catering is a full landing page (no pricing, per owner call) with the `catering-inquiry` Netlify form; email notification configured, leads arrive by email.
- Specials pipeline live: email/web photo upload, Claude vision, YES-gated publish to /menu. Inbound webhook (`inbound-email.ts`) hardened `841cf09`: auto-publish requires aligned-DKIM auth (spoof-proof, fail-safe to the YES-gate), timing-safe Basic auth, public path throttled 20/hr.
- Quote leads arrive as a short Postmark email + attached PDF that replicates the on-site print sheet (logo, Oswald/Merriweather, red-ruled totals), From `Copperline Catering <catering@parse...>` (separate from the specials bot), Reply-To = customer, recipients in `QUOTE_NOTIFY_EMAILS`. The raw Netlify dashboard notification still fires in parallel until Ian deletes it (Forms -> catering-quote -> Notifications).
- GA4 + Clarity live (idle-loaded); IndexNow pings on every prod deploy.

## Known open questions
- **/catering/quote indexing: requested, pending crawl.** Was "URL unknown to Google" (URL Inspection 2026-08-04, 0 impressions, 0 real leads); Ian submitted Request Indexing 2026-08-05. Re-checked via URL Inspection API same day: still shows "URL is unknown to Google" (Google's crawl queue lags the request, typically hours-days) — re-check in a few days before treating this as unresolved. On-site SEO verified correct (sitemap + canonical + index,follow + internal links); homepage link added Session 32.
- **81% of homepage GSC clicks attribute to http://** (338 of 418, stable 12 weeks) even though the 301s + HSTS are correct and Google's canonical is https for both variants. Diagnosis: local-pack/GBP "Website" button reports the exact URL in the GBP website field. Fix = flip GBP field to https (DAD, already in ../TODO.md). Zero user impact (301 lands them on https).
- Quote-builder tax treatment (7% MA meals tax applied on food + 15% service charge) confirmed correct by owner 2026-07-27.

## Pointers
- Session-by-session history: [docs/SESSION_LOG.md](docs/SESSION_LOG.md) (append-only archive; audits in [audits/](audits/)).
- Open tasks: [../TODO.md](../TODO.md) (single source of truth, todo-sync to Notion).
- Evergreen project brief: [CLAUDE.md](CLAUDE.md).
