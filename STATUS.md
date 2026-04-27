# Copperline Eatery — Website Status

**Site:** https://copperlineeatery.com  
**Stack:** Static HTML/CSS/JS · Hosted on Netlify · Deployed via GitHub Actions  
**Last updated:** 2026-04-27

---

## Recent Updates (2026-04-27)

Triggered by full website assessment. Critical + High-severity findings resolved:

- **Migrated `netlify.toml` headers/redirects → `_headers` and `_redirects` files in `site/`.** The GitHub Actions deploy method (`nwtgck/actions-netlify@v3`) bypasses `netlify.toml`, so security headers and 1-year asset cache rules were silently dropped in production. Verified via `curl -sI` before fix: `Cache-Control: max-age=0, must-revalidate` and missing `X-Frame-Options`/`X-Content-Type-Options`/`Referrer-Policy`. After deploy, expect `max-age=31536000, immutable` on CSS/JS/JPG.
- **Fixed `aggregateRating` in `index.html`:** was implausible 5.0/200, now accurate 4.5/1119 (Google: 4.5/1095 + TripAdvisor: 4.7/24, weighted).
- **Added required `datePublished: "2023-11-28"` to WWLP NewsArticle schema** in `about.html` so it's eligible for rich results.
- **Refreshed all `<lastmod>` entries in `sitemap.xml`** to 2026-04-27.
- **Generated proper favicon set** from `logo.png` (cropped to the C-with-THE brand mark): `favicon.ico` (16/32/48), `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (180×180), `android-chrome-192x192.png`, `android-chrome-512x512.png`. Created `site.webmanifest` for Android/PWA. Replaced `logo.jpg` favicon references in all 6 HTML pages.

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
