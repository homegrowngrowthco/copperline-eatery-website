# Copperline Eatery — Website Status

**Site:** https://copperlineeatery.com  
**Stack:** Astro 5 + TypeScript · Vanilla CSS · Hosted on Netlify · Deployed via GitHub Actions  
**Last updated:** 2026-05-22

---

## Recent Updates (2026-05-22)

### Session 4 — Sitemap discovery fix (robots.txt + 301 for legacy /sitemap.xml)

Investigating 7 GSC "Page with redirect" entries (mix of `http://` and `.html` URLs) surfaced a real bug behind the noise: `public/robots.txt` was still pointing at `https://copperlineeatery.com/sitemap.xml`, but `@astrojs/sitemap` generates `sitemap-index.xml`. Old path was 404ing, so crawlers had no live sitemap to discover and were leaning on stale memory of pre-migration `.html` URLs.

The "Page with redirect" entries themselves are not a bug — they're GSC's informational status when it crawls a URL that 301s to a canonical one (Netlify's HTTP→HTTPS auto-redirect + the legacy `.html` → clean-URL 301s in `netlify.toml` doing their job). Those drop off on their own; no code change needed.

**Changes:**
- `public/robots.txt` — `Sitemap:` line updated `/sitemap.xml` → `/sitemap-index.xml`.
- `netlify.toml` — added 301 `from = "/sitemap.xml"` → `to = "/sitemap-index.xml"` so any old GSC/Bing entries land on the right file.

**Manual follow-up in Google Search Console:**
1. Sitemaps → remove `sitemap.xml`.
2. Sitemaps → submit `sitemap-index.xml`.
3. Leave the 7 "Page with redirect" entries alone; they'll age out.

**Revert path**: `git revert <sha>` of this commit. Single commit, two files, no infra changes.

---

## Recent Updates (2026-05-18)

### Session 3 — Automated daily-specials pipeline shipped + Postmark workarounds + credentials rotation

Replaced the prior public Google Sheets gviz client-side fetch with an end-to-end email pipeline: staff emails a photo of the chalkboard to a Postmark inbound address, Claude vision (`claude-sonnet-4-6`) extracts the items, the system replies with the parsed specials and asks for YES, and on confirmation it commits `src/data/specials.json` back to the repo via the GitHub Contents API. The Astro rebuild bakes the specials into static HTML (indexable by search engines and AI ingest, not a JS-only client-side fetch).

**New files (commit `4af2b9a`):**
- `netlify/functions/inbound-email.ts` (Netlify Function, web-standard `Request`/`Response` handler with Basic-auth webhook validation, sender allowlist, In-Reply-To branch for YES gate, 5 MB / JPEG-PNG-GIF-WebP image guard; ~290 lines incl. types + Reply-To addition)
- `src/components/DailySpecials.astro` (build-time JSON import, empty state inline)
- `src/data/specials.json` (initial empty state, written by the function via Octokit)
- `.env.example` (9 runtime env vars documented)

**Modified files (same feature commit):**
- `package.json` — runtime deps: `@anthropic-ai/sdk`, `@netlify/blobs`, `@netlify/functions`, `@octokit/rest`, `postmark`
- `src/pages/menu.astro` — placeholder replaced with `<DailySpecials />`
- `src/scripts/main.ts` — removed `SHEET_*` constants, `loadDailySpecials()`, `escapeHtml` helper, 5-minute polling interval, tab-click lazy-load branch (~80 lines gone)
- `netlify.toml` — added `[functions]` block; removed `https://docs.google.com` from CSP `connect-src`
- `.github/workflows/deploy.yml` — added `--functions=netlify/functions` flag

**Pipeline flow:**
1. Staff emails a photo to `specials@parse.copperlineeatery.com` (inbound MX on parse subdomain points at Postmark; inbound is free and unlimited).
2. Postmark POSTs the parsed email + base64 attachment to `/.netlify/functions/inbound-email` with HTTP Basic auth.
3. Function validates auth, checks `From` against `ALLOWED_SENDER_EMAILS`, branches on whether `In-Reply-To` matches a pending batch id.
4. **New-photo branch**: validates image, calls Claude, parses + validates JSON, stores pending batch in Netlify Blobs `pending-specials` keyed by UUID, sends Postmark reply with `Message-ID: <batch-{uuid}@copperlineeatery.com>` asking for YES.
5. **Reply branch**: extracts UUID from `In-Reply-To`, loads pending blob, on YES commits to `src/data/specials.json` via Octokit, deletes blob, sends "published" confirmation. Non-YES deletes blob and sends a "not published" note.
6. Commit triggers GH Actions, Astro rebuild bakes specials into static HTML, IndexNow pings on prod, total ~30 s.

**6 prod deploys to land the configuration:**
- `4af2b9a` (feat) — pipeline + Astro component + env.example + workflow + memory + tracking docs.
- `0c350b8` (chore) — empty-commit redeploy after discovering Netlify Functions bake env vars at deploy time. Initial env vars set AFTER first deploy meant the function returned 401 with correct credentials. Reference memory saved: `reference_netlify_function_envvars_redeploy.md`.
- `4c9d4ca` (chore) — empty-commit redeploy after correcting `POSTMARK_SERVER_TOKEN`. User initially used the Postmark **Account API Token** (account-wide) instead of the **Server API Token** (per-server send permission). Function logs showed `InvalidAPIKeyError statusCode 401 code 10` from Postmark.
- `2e3e120` (feat) — added `Reply-To: specials-bot@parse.copperlineeatery.com` constant in function code so YES replies route back through the parse-subdomain MX regardless of what FROM the bot sends from. Needed for the Postmark pending-approval workaround (see below). **This commit also accidentally included a credentials screenshot** via `git add -A` (see Credentials Rotation).
- `e4b2821` (chore) — untracked the accidentally-committed screenshot + `.eml` and gitignored `Screenshots/` + `*.eml`. Files remain in git history of `2e3e120`.
- `afdefb8` (chore) — empty-commit redeploy after webhook credentials rotation.

**Postmark pending-approval workaround:**

Postmark restricts new (pending-approval) accounts: outbound recipient domain must match the sender (From) domain. With `FROM = specials-bot@parse.copperlineeatery.com` and `TO = ian@homegrowngrowth.co`, sends were blocked with `ApiInputError statusCode 422 code 412`.

Workaround applied:
1. `SPECIALS_FROM_ADDRESS` env var temporarily switched to `specials-bot@homegrowngrowth.co` (homegrowngrowth.co domain also verified in Postmark for sending).
2. Function code adds `Reply-To: specials-bot@parse.copperlineeatery.com` so YES replies still route through the parse-subdomain inbound MX (not hgc.com which has Google Workspace MX).
3. **Revert after Postmark approval lands**: change `SPECIALS_FROM_ADDRESS` env var back to `specials-bot@parse.copperlineeatery.com` + empty-commit redeploy. Reply-To header can stay in code (harmless when From and Reply-To match).

**Credentials rotation incident:**

Commit `2e3e120` was made with `git add -A` (despite system-prompt guidance against this pattern). It swept up `Screenshots/netlify_postmark_screenshot.jpg` (containing `POSTMARK_WEBHOOK_USER` + `POSTMARK_WEBHOOK_PASS` in plaintext) and `Today's Specials List.eml` (a test email) into the public repo. Cleanup commit `e4b2821` removed both files from HEAD and gitignored their patterns. Old credentials are inert (rotated immediately in Netlify env vars + Postmark webhook URL). Old values remain readable in the diff of commit `2e3e120` on the public repo; not scrubbed via filter-repo since the chars are inert. Feedback memory saved: `feedback_never_git_add_dash_a.md`.

**Verification (end-to-end):**
- Curl probes confirmed every state: old creds → 401, new creds + no body → 400, new creds + valid body from allowlisted sender → 200 + reply email sent.
- User sent real test email from `ian@homegrowngrowth.co` with photo attached; bot replied with extracted specials. User did NOT reply YES (test photo was an outdated specials list); waiting for a fresh real-board photo to do the full publish-to-site round trip. So `src/data/specials.json` is still in its initial empty state.

**3 enhancement proposals discussed, deferred pending user pickup:**
1. **Edit mechanism**: free-form natural-language corrections in the reply ("Change Salmon Benny to Salmon Eggs Benedict", "Item 3 should be $14"). Function pipes original parsed JSON + staff reply to Claude with a corrections prompt, gets back updated JSON, sends fresh confirmation email asking YES on the new version. Loops naturally.
2. **Image in reply**: include the original extracted-from image inline at the top of the confirmation email so staff can spot extraction errors at a glance. Requires storing the image base64 in the pending Netlify Blob (along with parsed specials) so corrections rounds can re-show it.
3. **Daily auto-expiry**: component renders empty state if `updatedAt` is more than ~18h old at build time. Add a scheduled GH Actions workflow that triggers a rebuild around 5 UTC daily so stale specials auto-clear without staff doing anything extra.

Recommended bundle order: **2 + 3 first** (small, no UX changes for staff), then **1** as a follow-up (changes staff workflow).

**Free-tier sizing**: Netlify Functions 125k/mo (use ~60), Netlify Blobs 100k reads / 1k writes/mo (use ~6/day), Postmark inbound unlimited + outbound 100/mo (free, lifts after approval). Anthropic vision call ~$0.01-0.02 per photo via Sonnet 4.6.

**Required infra setup (done outside the repo):**
- Postmark server with inbound stream + sender signatures verified for both `parse.copperlineeatery.com` (canonical) and `homegrowngrowth.co` (workaround sending).
- MX record `parse.copperlineeatery.com IN MX 10 inbound.postmarkapp.com` (verified globally via Cloudflare resolver).
- Postmark webhook URL set to `https://USER:PASS@copperlineeatery.com/.netlify/functions/inbound-email`.
- Fine-grained GitHub PAT with `contents:write` on the repo (1Password: "GitHub PAT — Copperline Specials Bot", expires 2027-05-18).
- 9 runtime env vars in Netlify Site Settings (see `.env.example`).

**Revert path**: each commit in the 6-deploy chain can be reverted individually with `git revert <sha>` + push. Runtime kill switch: clear the function's env vars in Netlify (no code change needed). To restore the Google Sheet flow: `git revert 4af2b9a` reverts the entire feature in one shot.

---

## Recent Updates (2026-05-16)

### Astro 5 migration (mirrors homegrowngrowth.co)
Site migrated from raw static HTML/CSS/JS to Astro 5 + TypeScript on a feature branch (`astro-migration`) with `--no-ff` merge. Same 7 routes, same URLs (clean, no trailing slash), same content — but now sharing one BaseLayout + Nav + Footer instead of 7 duplicated copies, and the menu page renders both visible HTML and full JSON-LD Menu schema from `src/data/menuData.json` at build time (no more `scripts/build-menu.py` Python step).

**Key changes:**
- New folder layout: `src/{pages,layouts,components,styles,scripts,data}/`, `public/` for static assets, `_baseline/lighthouse-2026-05-16/` for the pre-migration Lighthouse budget reference.
- `netlify.toml` consolidates everything (build env, security headers, cache rules, legacy `.html` → clean URL 301s); `site/_headers` and `site/_redirects` deleted.
- `deploy.yml` rewritten to `actions/setup-node@v4` + `npm ci` + `npm run build` + `netlify-cli@22` deploy. The `nwtgck/actions-netlify@v3` action and the `sha256sum` cache-bust step are gone — Vite hashes `/_astro/*` filenames so cache-busting is automatic.
- CSP `frame-ancestors` tightened from `'self'` to `'none'` (no self-framing on this site).
- `NODE_VERSION="24"` pinned to match local.
- `.claude/settings.json` (committed) + 4 slash commands (`/preview`, `/build-check`, `/add-page`, `/audit-seo`) added.
- `SECURITY.md` + `LICENSE` added at repo root.

**Pre-flight CSP audit**: Microsoft Clarity is NOT in use on copperline (script-src only allows googletagmanager + google-analytics, confirmed via `curl -sI`). The `scripts.clarity.ms` fix from the prior CLAUDE.md TODO list is N/A here and was dropped from the migration plan.

**Verification**: All 7 routes build clean (`npm run build`). JSON-LD per page: 1 schema on `/404`, 2 on `/`, `/menu`, `/catering`, `/contact`, `/faq`; 5 on `/about` (Restaurant + VideoObject + 2 NewsArticle + BreadcrumbList). Sitemap autogenerated with 6 indexable routes (excludes `/404`). Lighthouse budget: see `_baseline/lighthouse-2026-05-16/`.

**Revert path**: Netlify dashboard → previous prod deploy → "Publish deploy" (instant), THEN `git revert -m 1 <merge-sha>` on master AND revert `netlify.toml` build config in the same commit (otherwise GH Actions tries `npm run build` against a tree with no `package.json`).

---

## Recent Updates (2026-05-07)

### GSC clean-URL migration + 404 canonical fix
GSC was flagging `/menu`, `/catering`, `/contact`, `/about`, `/faq` as "Alternate page with proper canonical tag" and stale orphan URLs (e.g., HVAC-related `condensing-units-cal-series.html` from a prior owner of the domain) as "Duplicate without user-selected canonical." Two distinct root causes, both fixed:

**1. Duplicate URLs at `/page` and `/page.html`** — Netlify was serving identical content at both URL forms with no redirect between them. Google was treating the `.html` versions as canonical (per the canonical tag) and the bare URLs as alternates. Fix: switched the entire site to clean URLs (no `.html`) — the modern best practice — and added 301 redirects from `.html` → clean URLs.
  - `_redirects` — added 5 new 301 rules (`/menu.html → /menu`, etc.)
  - All 5 main HTML files — updated canonical, `og:url`, JSON-LD `url`, BreadcrumbList `item` from `.html` → clean URLs
  - All 7 HTML files (incl. index.html, 404.html) — updated all internal nav `href`s from relative `.html` paths to root-absolute clean URLs (`href="menu.html"` → `href="/menu"`)
  - `sitemap.xml` — switched to clean URLs, `lastmod` bumped to 2026-05-07
  - `.github/workflows/deploy.yml` — IndexNow ping list updated to clean URLs
  - `scripts/build-menu.py` — fixed `Restaurant.url` in JSON-LD generator so a future regen doesn't clobber `menu.html`'s canonical

**2. 404.html had a self-referential canonical to homepage** — every non-existent URL on the site (orphans, typos, ghost URLs from prior ownership) was returning a 404 body claiming `<link rel="canonical" href="https://copperlineeatery.com/">`. This caused GSC to flag dozens of stale URLs as duplicates of the homepage. Fix: removed the canonical tag from 404.html. The existing `<meta name="robots" content="noindex, follow">` is the correct, sufficient signal for a 404 page.

**Verification:** post-deploy curl on each `.html` URL returns 301; clean URL returns 200. Live nav click-tested.

**GSC follow-up (manual, performed by Ian post-deploy):** sitemap re-submitted; URL Inspection → Request Indexing run on each clean URL; `condensing-units-cal-series.html` and any other orphan URLs submitted to GSC Removals tool.

---

## Recent Updates (2026-04-27)

### Round 1 — Critical + HIGH from assessment
- **Migrated `netlify.toml` headers/redirects → `_headers` and `_redirects` files in `site/`.** The GitHub Actions deploy method (`nwtgck/actions-netlify@v3`) bypasses `netlify.toml`, so security headers and 1-year asset cache rules were silently dropped in production. Verified post-fix with `curl -sI`: `Cache-Control: max-age=31536000, immutable` on CSS/JS/JPG.
- **Fixed `aggregateRating` in `index.html`:** was implausible 5.0/200, now accurate 4.5/1119 (Google: 4.5/1095 + TripAdvisor: 4.7/24, weighted).
- **Added required `datePublished: "2023-11-28"` to WWLP NewsArticle schema** in `about.html` so it's eligible for rich results.
- **Refreshed all `<lastmod>` entries in `sitemap.xml`** to 2026-04-27.
- **Generated proper favicon set** from `logo.png` (cropped to the C-with-THE brand mark): `favicon.ico` (16/32/48), `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (180×180), `android-chrome-192x192.png`, `android-chrome-512x512.png`. Created `site.webmanifest` for Android/PWA. Replaced `logo.jpg` favicon references in all 6 HTML pages.

### Round 2 — MEDIUM + LOW from assessment
- **Security:** `rel="noopener"` added to 30 external `target="_blank"` links across 5 pages; new `Content-Security-Policy` (allows GA, fonts, YouTube, Maps, Sheets gviz; locks down `default-src`, `object-src`, `frame-ancestors`); new `Permissions-Policy` (disables camera/mic/geo/payment/etc + FLoC).
- **Accessibility:** Skip-to-main-content link on all 6 pages; ARIA `tablist`/`tab`/`tabpanel` roles on menu tabs (with `aria-selected` updated by JS); `aria-label` on carousel prev/next buttons; carousel pause-on-hover/focus (WCAG 2.2.2); explicit `width`/`height` on every `<img>` (prevents CLS); accessible `title` on Maps iframe.
- **SEO:** `BreadcrumbList` JSON-LD on menu/about/contact/catering; dropped ignored `<meta name="keywords">` and `<changefreq>` from sitemap; removed off-brand Powerball news link from About.
- **Performance:** WebP variants for all 4 menu images (42–46% smaller, served via `<picture>` + JPG fallback); new cache rules for `.webp`/`.png`/`site.webmanifest`.
- **Analytics:** GA4 click-event tracking on phone (`tel:`), email (`mailto:`), DoorDash, Google Maps directions, PDF downloads; 404 page sends a `page_not_found` event.
- **Cleanup:** moved inline `style="..."` attrs from catering.html and menu.html to CSS classes; `/index.html` → `/` 301 redirect.

### Round 3 — Hybrid AI-discoverable menu page
- **`site/menuData.json`** — single source of truth for all menu items, prices, dietary flags, and signature/popular markers. 22 sections, 153 items extracted by vision from `breakfast-menu.jpg` and `lunch-menu.jpg`.
- **`scripts/build-menu.py`** — regenerates `menu.html` blocks from `menuData.json`. Run it after any menu edit.
- **menu.html restructured:**
  - Topical H1 ("Best Breakfast & Lunch Menu in Chicopee, MA") and H2 subhead anchoring "Hampden County's Favorite Brunch Spot Since 1993" — for regional entity recognition.
  - Tabs reordered: **Browse Menu** (text grid, default) · **Visual Menu** (printed JPGs) · Catering · Daily Specials.
  - Browse Menu renders all 153 items with prices, dietary tags, popular badges, organized in a responsive grid (1 col mobile / 2–3 cols desktop).
  - Existing Restaurant + simplified `hasMenu` schema replaced by full `Menu` / `MenuSection` / `MenuItem` JSON-LD with `Offer.price`, `priceCurrency`, and `suitableForDiet` URIs — Google + AI ingest priced items directly.
- Removed skip-to-main-content link (was visually noisy on desktop).
- Whitelisted Netlify RUM endpoint (`ingesteer.services-prod.nsvcs.net`) in CSP `connect-src`.

### Skipped intentionally (need user input or net-new infra)
- Templating / shared header–footer (would require a build tool)
- Live Google Reviews widget (third-party signup)
- Contact form (need backend decision)
- Hero food photo (need a photo)
- Self-hosting Google Fonts (over-engineered for the gain)
- HTML linter / Lighthouse CI (net-new infrastructure)

---

## Completed Work

### Infrastructure & Deployment
- [x] Connected GitHub repo → Netlify via GitHub Actions workflow (`.github/workflows/deploy.yml`)
- [x] Auto-deploys on every push to `master` branch
- [x] Fixed Node.js 20 deprecation warning (`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`)
- [x] Created `netlify.toml` with security headers, cache headers, and www → non-www 301 redirect
- [x] Created `.gitignore` (excludes original PNGs, `.netlify` folder, OS/editor files)

### SEO — Technical
- [x] Created `sitemap.xml` (5 URLs with priority/changefreq) — submitted to Google Search Console
- [x] Created `robots.txt` (allow all, sitemap pointer)
- [x] Added canonical tags to all 5 pages
- [x] Added full Open Graph + Twitter Card meta tags to all pages
- [x] Fixed invalid `og:type "restaurant"` → `"website"` on homepage
- [x] Added full meta (description, keywords, geo tags) to about.html and contact.html
- [x] Added `<link rel="preconnect">` for Google Fonts to all pages
- [x] Added favicon references to all pages
- [x] Added `loading="lazy"` + improved alt text to all menu images
- [x] Added logo preload (`<link rel="preload">`) to all pages
- [x] Created custom branded `404.html` with navigation links and `noindex`

### SEO — Structured Data (Schema.org JSON-LD)
- [x] `index.html` — Restaurant schema with aggregateRating (4.8/5, 200 reviews), sameAs array (8 platforms), dual award array (MassLive + WWLP), FAQPage schema, WebSite schema, 5 Review items
- [x] `menu.html` — MenuItem schema for 5 signature breakfast items
- [x] `about.html` — VideoObject schema (YouTube embed), 2 NewsArticle schemas (MassLive + WWLP French Toast)
- [x] `contact.html` — Contact JSON-LD with full openingHoursSpecification
- [x] `catering.html` — FoodEstablishment JSON-LD

### Content & Citations
- [x] Added TripAdvisor, Yelp, The Q 99.7, LinkedIn to `sameAs` entity graph
- [x] Added WWLP "Best French Toast in Western Massachusetts" award to homepage and about page
- [x] Added WWLP French Toast article to "In The News" section on about.html
- [x] Added visible FAQ section to homepage (matches FAQPage schema)
- [x] Added visible "Signature Dishes" section to menu page (matches MenuItem schema)

### Analytics
- [x] Google Analytics 4 installed on all 5 pages (Measurement ID: G-DXYNCF0G79)
- [x] Tracks pageviews automatically; events and conversions can be configured in GA4 dashboard

### IndexNow
- [x] Created key verification file (`site/670b4b1e5abe94d9050c77bc3a1011e2.txt`)
- [x] Configured automatic IndexNow ping to Bing/Yandex/others on every successful deploy
- [x] Confirmed working — first deploy returned 202 response

### Image Compression
- [x] `logo.jpg` — 1157KB PNG → 61KB JPEG (94% reduction, resized to 1200px wide)
- [x] `breakfast-menu.jpg` — ~67% size reduction
- [x] `lunch-menu.jpg` — ~67% size reduction
- [x] `catering-menu-1.jpg` — ~25% size reduction
- [x] `catering-menu-2.jpg` — ~25% size reduction

---

## Remaining Items

### You Can Do Now (No Dev Work Needed)

| Task | Where | Why |
|------|--------|-----|
| **Google Business Profile** — Set primary category to "Breakfast Restaurant" | business.google.com | Increases local pack visibility |
| **Google Business Profile** — Add interior/food photos | business.google.com | Photos increase click-through rate |
| **Google Business Profile** — Fill in menu editor | business.google.com | Shows in search results directly |
| **Google Business Profile** — Enable messaging | business.google.com | Customers can message directly from search |
| **Google Business Profile** — Post weekly updates | business.google.com | Signals active business to Google |
| **Review solicitation** — Add QR code at register linking to your Google review page | Print | More reviews = better local rankings |
| **Citation audit** — Verify exact NAP match on Yelp, TripAdvisor, Yellow Pages | Each platform | Inconsistent name/address/phone hurts local SEO |
| **DoorDash menu audit** — Verify prices and items are current | DoorDash dashboard | Outdated menus frustrate customers |
| **Google Search Console** — Monitor Core Web Vitals and coverage errors | search.google.com/search-console | Catch crawl issues early |

### Low-Priority Dev Tasks (Nice to Have)

| Task | Effort | Why |
|------|--------|-----|
| **Breadcrumb schema** on all pages | Low | Minor SEO signal, adds breadcrumb display in SERPs |
| **WebP image conversion** | Low | Further image size reduction (~30% vs JPEG) |
| **Defer non-critical JS** | Low | Minor Core Web Vitals improvement |
| **Redirect `/index.html` → `/`** via `netlify.toml` | Low | Canonical tag already consolidates these; redirect would be tidier |

---

## Verifications & Audits

### 2026-04-27 — Google Search Console "Page with redirect" review
GSC flagged 6 URL variants as "Page with redirect" (not indexed). Verified all redirect chains resolve correctly to canonical `https://copperlineeatery.com/`:

| URL | Behavior |
|-----|----------|
| `http://copperlineeatery.com/` | 301 → `https://copperlineeatery.com/` |
| `http://www.copperlineeatery.com/` | 301 → `https://www.copperlineeatery.com/` → `https://copperlineeatery.com/` |
| `https://www.copperlineeatery.com/` | 301 → `https://copperlineeatery.com/` |
| `http://copperlineeatery.com/index.html` | 301 chain → canonical |
| `http://www.copperlineeatery.com/index.html` | 301 chain → canonical |
| `https://copperlineeatery.com/index.html` | 200 (canonical tag points to `/`) |

**Conclusion:** Working as intended. "Page with redirect" is expected/desired behavior — Google indexes the canonical destination. No action needed; do not re-request indexing for these URLs.

### Google Indexing (No Automation Available)
Google does **not** participate in IndexNow. Their Indexing API is restricted to `JobPosting` and `BroadcastEvent` schema types — not applicable here.

For copperlineeatery.com, Google discovery works through:
1. **Sitemap** (already submitted in GSC) — processed on Google's own schedule
2. **Googlebot's regular crawl** — frequency increases with site activity
3. **GSC URL Inspection → "Request Indexing"** — for urgent one-off reindexing when you update a page

---

## Key Credentials & IDs

| Item | Value |
|------|-------|
| Google Analytics Measurement ID | G-DXYNCF0G79 |
| IndexNow Key | 670b4b1e5abe94d9050c77bc3a1011e2 |
| Netlify Auth Token | GitHub secret: `NETLIFY_AUTH_TOKEN` |
| Netlify Site ID | GitHub secret: `NETLIFY_SITE_ID` |
