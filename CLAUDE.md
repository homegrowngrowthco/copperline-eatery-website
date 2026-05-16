# Copperline Eatery — Website

## Purpose
Static marketing site for Copperline Eatery, a breakfast/lunch restaurant in Chicopee, MA. Engineered for SEO/local-search performance, structured data (Restaurant + Menu schemas), and Google Business Profile signals. See `STATUS.md` for the current punch list.

## Tech Stack
- Static HTML5 + vanilla CSS + vanilla JS (no framework)
- Hosted on Netlify
- Deployed via GitHub Actions (`nwtgck/actions-netlify@v3`) — note this bypasses `netlify.toml`, so security headers and cache rules live in `_headers` and `_redirects` files inside `site/`
- GA4 + IndexNow auto-ping integration

## Live site
- Production: https://copperlineeatery.com
- GitHub: https://github.com/homegrowngrowthco/copperline-eatery-website
- Default branch: `master`

## Key Files & Folders
- `site/` — published files (HTML, CSS, JS, images, `_headers`, `_redirects`, `menuData.json`)
- `site/menuData.json` — single source of truth for all menu items, prices, dietary flags. 22 sections, 153 items.
- `scripts/build-menu.py` — regenerates `menu.html` blocks from `menuData.json`. Run after any menu edit.
- `.github/workflows/deploy.yml` — Netlify deploy on push to `master` + IndexNow ping
- `STATUS.md` — running checklist of completed work and remaining items (authoritative)
- `netlify.toml` — present but largely superseded by `_headers`/`_redirects` since the deploy method bypasses it

## External Dependencies
- Netlify (hosting + edge)
- GA4 (Measurement ID `G-DXYNCF0G79`, public)
- IndexNow protocol (Bing/Yandex; key `670b4b1e5abe94d9050c77bc3a1011e2`, public)
- DoorDash, Google Maps, TripAdvisor, Yelp, The Q 99.7, LinkedIn (citations / external links only — no API integration)

## Environment Variables
None for build. Deploy uses two GitHub Actions secrets:
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

## Deployment
Push to `master` → GitHub Actions runs `netlify deploy --prod` then pings IndexNow with the canonical URL list. ~30s end-to-end.

## Data Sources
- `menuData.json` was extracted by vision from `breakfast-menu.jpg` and `lunch-menu.jpg`. See `STATUS.md` "Round 3" for context.
- All other content authored directly in HTML.

## Open Questions / TODO

**Next focused session: Astro 5 migration to mirror homegrowngrowth.co's stack.** Decided 2026-05-16 — the goal is to have both static marketing sites deploying through the same process/structure (Astro 5 + TypeScript + shared BaseLayout + `npm ci && npm run build && netlify deploy --dir=dist`). The HGC migration playbook is fresh; copperline is the next site to apply it to. Specific deltas vs HGC's migration:

- **Smaller scope** — fewer pages, no SMS form, simpler schema. Estimate: ~half a working day.
- **Modernize the menu pipeline** — replace `scripts/build-menu.py` with an Astro page that imports `site/menuData.json` directly and renders the menu at build time. Drops the Python dependency from a Node project; `menuData.json` stays as the single source of truth.
- **Consolidate Netlify config** — move `site/_headers` + `site/_redirects` content into `netlify.toml` to match HGC's pattern. (Current setup has the redirects in two places because the `nwtgck/actions-netlify@v3` deploy bypasses `netlify.toml`.)
- **Update `deploy.yml`** — swap `nwtgck/actions-netlify@v3` (the archived flavor) for `actions/setup-node@v4` + `npm install -g netlify-cli@22` + `npm ci` + `npm run build` + `netlify deploy --dir=dist --prod`. Same shape as HGC's `deploy.yml`.
- **Add `.claude/settings.json`** (committed shared allowlist, copy from HGC) + the 4 slash commands (`/preview`, `/build-check`, `/add-page`, `/audit-seo`).
- **Add `SECURITY.md` + `LICENSE`** at repo root (proprietary, same template as HGC).
- **Branch preview verification → `--no-ff` merge** per the same playbook.
- **Watch out for**: the same trailing-slash 301 footgun HGC hit (`build.format: 'file'` not the default `'directory'`); the same Netlify Forms detection gotcha if any form is added (use a hidden `NetlifyFormStubs` duplicate); CSP header should be hardened from the start (add `scripts.clarity.ms` to script-src if Clarity is in use, `frame-ancestors 'none'`, `upgrade-insecure-requests`).

**Reference plan**: [`~/.claude/plans/homegrown-growthco-2026-04-20-hgc-v8-cl-elegant-corbato.md`](file:///C:/Users/Ian/.claude/plans/homegrown-growthco-2026-04-20-hgc-v8-cl-elegant-corbato.md) — adapt the Phase B step-by-step section. Phase A filesystem-reorg is N/A (copperline's layout is already clean).

Then: see `STATUS.md` "Remaining Items" — Google Business Profile setup, citation audits, optional WebP/breadcrumb improvements. Distribution/content work, not code.

## Recovery Notes
This project survived the **2026-05-04** complete machine wipe.

**Preserved:**
- Full git history on GitHub. Last commit: 2026-04-27 ("Auto-stamp styles.css/script.js cache-bust with content hashes").
- Live production site at copperlineeatery.com (untouched).
- GitHub Actions secrets (Netlify token + site ID — stored in GitHub, never local).
- Rich `STATUS.md` documenting all prior work.

**Lost:**
- Local `.claude/settings.local.json` overrides.
- Local Claude Code session history.

**Followup needed:**
- If you intend to deploy from this machine, verify `git push` works to the remote.
- Re-auth `netlify` CLI if you want local Netlify CLI access (deploys go via GH Actions, so not strictly needed).
- Rotate `NETLIFY_AUTH_TOKEN` in GitHub Actions secrets as part of post-malware rotation (see `claude_projects/ROTATION-LIST.md`).
- Verify GA4 firing on the live site.

## Session Log
### Session 1 — 2026-05-05
- Recovered from machine wipe; CLAUDE.md created.
- `.gitignore` rewritten cleanly (corruption from a prior PowerShell `echo .claude/ >> .gitignore` redirect was fixed; standard env/node_modules/dist/.next/.vercel/.claude blocks added per Option B).
