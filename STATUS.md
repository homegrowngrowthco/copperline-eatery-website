# Copperline Eatery — Website Status

**Site:** https://copperlineeatery.com  
**Stack:** Static HTML/CSS/JS · Hosted on Netlify · Deployed via GitHub Actions  
**Last updated:** 2026-05-07

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
