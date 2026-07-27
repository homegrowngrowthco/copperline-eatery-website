# Copperline Eatery — Website

## Purpose
Static marketing site for Copperline Eatery, a breakfast/lunch restaurant in Chicopee, MA. Engineered for SEO/local-search performance, structured data (Restaurant + Menu schemas), and Google Business Profile signals. Live state in `STATUS.md`; full history in `docs/SESSION_LOG.md`; open tasks in `../TODO.md`.

## Tech Stack
- **Astro 7** + **TypeScript strict** + **vanilla CSS** (no Tailwind; the existing design system in `src/styles/global.css` is the canonical source). `compressHTML: true` is load-bearing: Astro 7's default `'jsx'` whitespace mode glues text to inline elements written on separate source lines (Session 29); don't remove it.
- `output: 'static'` + `build.format: 'file'` (produces flat `dist/<slug>.html`, served at `/<slug>` natively by Netlify without trailing-slash 301s)
- `@astrojs/sitemap` integration autogenerates sitemap at build time (filters out `/404`)
- Google Fonts (Oswald + Merriweather) via `<link>` in BaseLayout
- Netlify hosting + GitHub Actions deploy (`npm ci && npm run build && netlify deploy --dir=dist`)
- `NODE_VERSION="24"` pinned in `netlify.toml` (matches local Node 24.15)
- `netlify-cli@22` pinned in deploy workflow
- GA4 analytics (Measurement ID `G-DXYNCF0G79`) + Microsoft Clarity (project `x7y38jzmw3`, heatmaps + session recordings); both deferred to browser idle for CWV
- IndexNow auto-ping on every prod deploy

## Live site / current state (2026-07-17)
- Production: https://copperlineeatery.com
- GitHub: https://github.com/homegrowngrowthco/copperline-eatery-website
- Default branch: `master`

## Key Files & Folders
- `src/pages/*.astro` — 7 routes, 1:1 to URLs (`index`, `menu`, `catering`, `contact`, `about`, `faq`, `404`).
- `src/layouts/BaseLayout.astro` — full `<head>` (charset/viewport, GA4 inline script, title/description, geo meta, canonical, favicons, manifest, OG/Twitter, JSON-LD via JsonLd component, Google Fonts); body with Nav, `<slot />`, Footer, bundled `main.ts`. Props: `title`, `description`, `canonical`, `ogType?`, `ogTitle?`, `ogDescription?`, `ogImage?`, `ogImageAlt?`, `twitterTitle?`, `twitterDescription?`, `noindex?`, `schema?`, `hideNavCanonical?`.
- `src/components/` — `Nav.astro` (header with logo, nav links, social icons, DoorDash button, mobile menu toggle; active class via `Astro.url.pathname`), `Footer.astro` (6-column footer), `JsonLd.astro` (single or array, with `</script>` XSS-escape), `MenuSection.astro` (renders one menu section: header + items + extras; same HTML structure the prior `scripts/build-menu.py` produced).
- `src/data/restaurant.ts` — NAP, hours, phone, email, geo, sameAs, aggregateRating, awards, area served. Single source of truth for the Restaurant schema fields reused across pages.
- `src/data/menuData.json` — 22 sections, 153 menu items + dietary flags + signature markers. Imported by `src/pages/menu.astro` at build time; the page renders both the visible HTML and full JSON-LD Menu schema from this file.
- `src/styles/global.css` — single shared stylesheet (was `site/styles.css` pre-migration). Imported once in `BaseLayout.astro`; Vite bundles, hashes, and emits to `/_astro/*.css`.
- `src/scripts/main.ts` — mobile menu, reviews carousel, menu tabs, GA4 click event tracking (`click_phone`, `click_email`, `click_doordash`, `click_directions`, `download_pdf`). TypeScript strict.
- `src/components/DailySpecials.astro` — renders today's specials at build time from `src/data/specials.json`. Empty state inline.
- `src/data/specials.json` — current live specials. Written by `netlify/functions/inbound-email.ts` via the GitHub Contents API after a YES confirmation. Edit by hand only as a fallback (not the normal path).
- `netlify/functions/inbound-email.ts` — Postmark inbound webhook. Validates Basic auth, allowlists sender, calls Claude vision, stores pending batch in Netlify Blobs, sends YES-gated confirmation reply, commits confirmed specials to the repo on YES.
- `netlify/functions/submission-created.ts` — Netlify form-submission event function (filename is the trigger). Sends `catering-quote` submissions as a short email + attached PDF that replicates the on-site print sheet (`lib/quote-pdf.ts`, pdf-lib + fontkit, brand fonts/logo from `lib/assets.ts`) via Postmark from `QUOTE_FROM_ADDRESS` (Reply-To = customer); ignores all other forms.
- `public/` — served at site root as-is: favicons, `site.webmanifest`, `robots.txt`, logo.jpg, breakfast/lunch/catering menu images (jpg + webp), catering PDFs, IndexNow verification file.
- `_baseline/lighthouse-2026-05-16/*.json` — pre-migration Lighthouse reports (12 JSONs: 6 routes × desktop+mobile) kept as the performance budget reference. Astro doesn't process this folder (only `src/`).
- `netlify.toml` — build (NODE_VERSION="24"), security headers (CSP with `frame-ancestors 'none'`, HSTS, Permissions-Policy, X-Frame-Options DENY), cache rules, legacy `.html` → clean URL 301s, www → non-www redirect, trailing 404 fallback.
- `astro.config.mjs` — `site`, `output: 'static'`, `trailingSlash: 'never'`, `build.format: 'file'`, sitemap integration with the `/404` filter.
- `tsconfig.json` — extends `astro/tsconfigs/strict`; excludes `dist`, `node_modules`, `_baseline`, `site`, `scripts`.
- `.github/workflows/deploy.yml` — `actions/setup-node@v4` + `npm ci` + `npm run build` + `netlify-cli@22` deploy + IndexNow ping (prod only)
- `.claude/settings.json` (committed) — shared project allowlist for safe-default commands (git, npm, gh, netlify, curl, lighthouse).
- `.claude/settings.local.json` (gitignored) — per-machine overrides.
- `.claude/commands/` — slash commands (`/preview`, `/build-check`, `/add-page`, `/audit-seo`, `/seo-audit`).
- `audits/` — archived audit reports (`copperline_audit_report.md` 2026-06-22, `AUDIT-GROWTH-2026-07-03.md`, `AUDIT-SEO-2026-07-07.md`).
- `docs/SESSION_LOG.md` — the single append-only session history (see Documentation Conventions below).
- `scripts/` — `gsc-analytics.py`, `seo-crawl.mjs`, `lint-docs.mjs` (docs guardrail, `npm run qa:docs`), `fn-check.mjs` (Netlify-function bundle + handler smoke, `npm run qa:functions` — run after any dependency or function change), `embed-fn-assets.mjs` (regenerates `netlify/functions/lib/assets.ts` — base64 brand fonts + logo for the quote PDF; rerun after @fontsource bumps or logo changes).
- `SECURITY.md`, `LICENSE` — vulnerability reporting policy + proprietary license.
- `STATUS.md` — short live-state snapshot (deployed URL, what is live vs in flight); NOT a history file.

## External Dependencies
- Netlify (hosting + edge)
- GA4 (Measurement ID `G-DXYNCF0G79`, public)
- Microsoft Clarity (project `x7y38jzmw3`, public; heatmaps + session recordings, idle-loaded)
- IndexNow protocol (Bing/Yandex; key `670b4b1e5abe94d9050c77bc3a1011e2`, public)
- Anthropic Claude API (`claude-sonnet-4-6`) — vision extraction in the specials Netlify Function
- Postmark — inbound email parsing + outbound replies for the specials pipeline
- DoorDash, Google Maps, TripAdvisor, Yelp, The Q 99.7, LinkedIn (citations / external links only — no API integration)

## Environment Variables
None for build. Deploy uses two GitHub Actions secrets:
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

The Netlify Functions read runtime env vars from Netlify Site Settings (not from GitHub). See `.env.example` for the full list: `ANTHROPIC_API_KEY`, `POSTMARK_SERVER_TOKEN`, `POSTMARK_WEBHOOK_USER`, `POSTMARK_WEBHOOK_PASS`, `SPECIALS_FROM_ADDRESS`, `ALLOWED_SENDER_EMAILS`, `REVIEWER_EMAILS`, `QUOTE_NOTIFY_EMAILS`, `QUOTE_FROM_ADDRESS`, `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH`.

## Deployment
Push to `master` → GitHub Actions runs `npm ci && npm run build && netlify deploy --dir=dist --prod` then pings IndexNow with the canonical URL list. End-to-end ~1 minute.

**When adding a new page**, use the `/add-page <slug>` slash command — it scaffolds `src/pages/<slug>.astro` from the BaseLayout template and appends the URL to the IndexNow list in `deploy.yml` in one shot. The sitemap is autogenerated by `@astrojs/sitemap` and the nav/footer are shared components, so no longer-list-of-files-to-update like the pre-Astro era.

**When editing the menu**, edit `src/data/menuData.json` and run `npm run build` (or `/build-check`). No more `scripts/build-menu.py`; the menu page imports the JSON directly and renders both visible HTML and full JSON-LD Menu schema at build time.

## Data Sources
- `src/data/menuData.json` was extracted by vision from `breakfast-menu.jpg` and `lunch-menu.jpg`. See `docs/SESSION_LOG.md` (2026-04-27 Round 3) for context.
- All other content authored directly in `.astro` files.

## Open Questions / TODO

Open tasks live in [../TODO.md](../TODO.md) (single source of truth, synced to Notion): Google Business Profile setup, citation audits. Distribution/content work, not code; both are gated on Ian's dad's involvement since he owns the restaurant and holds the business-platform accounts (see memory `project_copperline_ownership.md`).

Status of the "optional WebP/breadcrumb improvements" notes that used to live here (audited 2026-05-22):
- **Breadcrumb schemas** — done. 5 of 7 pages have `BreadcrumbList` JSON-LD (`/menu`, `/about`, `/catering`, `/contact`, `/faq`). The 2 that don't (`/` and `/404`) are correct as-is: homepage is the root (no breadcrumb to show); `/404` is `noindex` and out of the sitemap.
- **WebP migration** — effectively done. 4 of 5 `.jpg` files in `public/` are already paired with `.webp` (the 3 menu images + 2 catering images). The lone exception is `public/logo.jpg` (small header logo, already preloaded); converting it would shave a few KB at marginal benefit. Closed as "not worth the diff." If a future audit wants 100% coverage, generate `logo.webp` via `sharp` or `cwebp` and wrap the `<img>` usage in a `<picture>` element with the `.jpg` as the fallback (keep `.jpg` for `og:image` social previews — Facebook/X don't all consume `.webp`).

Long-term tech debt now resolved (2026-05-16):

- ✅ **Astro 5 migration** — shared BaseLayout + Nav + Footer + MenuSection components eliminate the per-page duplication. `scripts/build-menu.py` retired (menu page imports `menuData.json` directly).
- ✅ **Netlify config consolidation** — `_headers` + `_redirects` merged into `netlify.toml`. Deploy now uses `netlify-cli@22` directly, so `netlify.toml` is respected.
- ✅ **CSP `frame-ancestors` tightened** — was `'self'`, now `'none'` (no self-framing needed; matches X-Frame-Options DENY header).
- ✅ **Cache-bust pipeline retired** — Astro/Vite hashes bundled CSS/JS in `/_astro/<hash>.css|.js` filenames automatically. Dropped the `sha256sum` `sed` rewrite step from the GitHub Action.

Deliberately kept as-is, with rationale:

- **`'unsafe-inline'` in `script-src` and `style-src`** — removing requires per-build SHA-256 hashing of all inline JSON-LD blocks + Astro's bundled module scripts, with a custom build step to inject hashes into the netlify.toml CSP header on every deploy. ~2–4 hour focused task that doesn't unblock a specific user-facing security threat (static marketing site, no user-generated content, no auth surface). Astro 5's `experimental.csp` doesn't help — SSR-only, ships CSP via meta tag not header, won't work with our `output: 'static'` setup. Revisit when there's a specific compliance/audit driver.
- **Self-hosting Google Fonts** — Oswald + Merriweather still load from fonts.googleapis.com. CSP already permits the necessary origins. Self-hosting would save one DNS lookup but adds build complexity. Defer.
- **Branch protection on `master`** — explicitly skipped while solo. Friction cost is real, security benefit is near-zero on a static marketing site with no secrets in the repo. Revisit if a collaborator joins.

## Recovery Notes
This project survived the **2026-05-04** complete machine wipe.

**Preserved:**
- Full git history on GitHub.
- Live production site at copperlineeatery.com (untouched).
- GitHub Actions secrets (Netlify token + site ID — stored in GitHub, never local).
- Rich `STATUS.md` documenting all prior work (that history now lives in `docs/SESSION_LOG.md`).

**Lost:**
- Local `.claude/settings.local.json` overrides.
- Local Claude Code session history.

**Followup needed:**
- If you intend to deploy from this machine, verify `git push` works to the remote.
- Re-auth `netlify` CLI if you want local Netlify CLI access (deploys go via GH Actions, so not strictly needed).
- Rotate `NETLIFY_AUTH_TOKEN` in GitHub Actions secrets as part of post-malware rotation (see `claude_projects/ROTATION-LIST.md`).
- Verify GA4 firing on the live site.

## Documentation & Logging Conventions
- **`docs/SESSION_LOG.md` is the ONLY session history.** At session close, write ONE entry there (20 lines or fewer: what shipped, commit SHAs, how verified, revert path, gotchas), newest first. Never duplicate the entry into this file or STATUS.md.
- **STATUS.md is a live-state snapshot only** (25 lines or fewer): deployed URL, what is live vs in flight, pointers. Update it in place; move nothing into it.
- **This file stays evergreen** (purpose, stack, key files, conventions). No session history here; keep it under ~150 lines.
- **Audit reports go in `audits/`** with a dated filename; mark superseded ones RESOLVED at the top.
- **Open tasks live only in `../TODO.md`** (todo-sync format, synced to Notion). Check items off there; purge stale `[x]` rows.
- **Guardrail:** `npm run qa:docs` (`scripts/lint-docs.mjs`) fails if CLAUDE.md exceeds 400 lines or `../TODO.md` still contains `[x]` items; warns on 400+ char open items. Run it before committing doc changes.
- No em or en dashes in newly authored text (hard rule; commas/periods/parens instead).

## Key Credentials & IDs (public identifiers only — secret NAMES, never values)

| Item | Value |
|------|-------|
| Google Analytics Measurement ID | G-DXYNCF0G79 |
| Microsoft Clarity project | x7y38jzmw3 |
| IndexNow Key (public by protocol design) | 670b4b1e5abe94d9050c77bc3a1011e2 |
| Netlify Auth Token | GitHub secret: `NETLIFY_AUTH_TOKEN` |
| Netlify Site ID | GitHub secret: `NETLIFY_SITE_ID` |
