# Copperline Eatery — Technical & SEO Audit
**Site:** https://copperlineeatery.com
**Date:** 2026-06-14 (updated same day with measured Lighthouse data + post-fix results)
**Method:** Live read-only HTTP inspection of all 7 routes (raw HTML, headers, redirects), robots/sitemap fetch, and Lighthouse mobile runs (local Chrome — the keyless PageSpeed Insights API is now quota-blocked).

> **Update (2026-06-14, post-fix):** The `/about` performance issue identified below was fixed the same day via a click-to-load YouTube facade — mobile perf **58 → 98**, LCP **9.8 s → 2.0 s**. Header logo also moved to WebP. See the "Resolution" notes inline and the `STATUS.md` session entry.

---

## Executive Summary

1. **No critical or moderate technical-SEO defects.** All three previously-known issues are confirmed **resolved**: HTTP→HTTPS is a clean single-hop 301, `.html` legacy URLs 301 to clean equivalents, and `/menu` + `/catering` canonicals are correct and self-referencing.
2. **(Moderate, performance — NOW FIXED)** The `/about` page was the one CWV outlier: measured mobile perf **58 / LCP 9.8 s**, caused by an eagerly-loaded YouTube `<iframe>`. The other three pages were already excellent (perf 97–99). Fixed 2026-06-14 with a click-to-load facade → **perf 98 / LCP 2.0 s**. *(The `/contact` Google Maps iframe was already `loading="lazy"` — no action needed.)*
3. **Performance measured with local Lighthouse** (mobile). The keyless PSI v5 API is now quota-blocked (`429 / quota=0`), so the report's earlier pre-migration baseline was replaced with fresh Lighthouse runs. Current state: `/` 99, `/menu` 97, `/catering` 99, `/about` 58→**98** after fix.
4. **On-page, schema, and local-SEO coverage are strong across the board** — unique titles/descriptions on every page, one H1 each, self-referencing canonicals, complete Open Graph, rich JSON-LD (Restaurant, Menu, FAQPage, Review, AggregateRating, BreadcrumbList), consistent NAP + `tel:` link + Maps embed.
5. **(Low) Minor polish:** `logo.jpg` now paired with `logo.webp` (done 2026-06-14, header logo served via `<picture>`). Remaining: sitemap homepage entry omits the trailing slash the canonical uses (cosmetic, deferred); external citations still need http→https updates (owner-gated GBP/citation work).

---

## 1. Technical SEO Findings

| URL | Status | Canonical | Title (unique?) | H1 | Issues |
|---|---|---|---|---|---|
| `/` | 200 | `https://copperlineeatery.com/` (self) | ✅ unique | 1 — "Best Breakfast & Lunch in Western MA!" | None |
| `/menu` | 200 | `…/menu` (self) | ✅ unique | 1 — "Best Breakfast & Lunch Menu in Chicopee, MA" | None |
| `/catering` | 200 | `…/catering` (self) | ✅ unique | 1 — "Catering Services" | None |
| `/about` | 200 | `…/about` (self) | ✅ unique | 1 — "Family Owned Since 1993" | None (perf — see §2) |
| `/contact` | 200 | `…/contact` (self) | ✅ unique | 1 — "Visit Us" | None (perf — see §2) |
| `/faq` | 200 | `…/faq` (self) | ✅ unique | 1 — "Frequently Asked Questions" | None |

**Redirects (all verified single-hop 301):**
- `http://copperlineeatery.com/` → `https://copperlineeatery.com/` ✅ (HSTS `max-age=31536000; includeSubDomains; preload`)
- `https://www.copperlineeatery.com/` → `https://copperlineeatery.com/` ✅
- `/menu.html → /menu`, `/catering.html → /catering`, `/about.html → /about`, `/contact.html → /contact`, `/faq.html → /faq`, `/index.html → /` ✅ (all 301, clean target)
- `/sitemap.xml → /sitemap-index.xml` (301) ✅

**robots.txt:** present, `User-agent: * / Allow: /`, advertises `https://copperlineeatery.com/sitemap-index.xml`. Not blocking any important page. ✅

**Sitemap:** `/sitemap-index.xml` → `/sitemap-0.xml` listing **6 URLs** (`/`, `/about`, `/catering`, `/contact`, `/faq`, `/menu`). All return **200** — none 404 or redirect. `/404` correctly excluded. ✅
- ⚠️ **Minor:** the homepage entry in the sitemap is `https://copperlineeatery.com` (no trailing slash) while the page's canonical is `https://copperlineeatery.com/` (with slash). Google treats these as equivalent so impact is negligible, but aligning the sitemap to the canonical form is tidy.

**Duplicate titles/descriptions:** none — all 6 indexable pages have distinct, well-formed titles and meta descriptions.
**Missing/multiple H1:** none — every page has exactly one H1.
**Missing canonicals:** none — every page self-references.

> **Verdict:** All previously-known technical issues (HTTP/HTTPS fragmentation, `.html` canonical mismatch on `/menu` + `/catering`) are resolved. (Consistent with CLAUDE.md Sessions 4 & 8.)

---

## 2. Page Speed & Core Web Vitals (measured)

**Note on method:** the keyless PageSpeed Insights v5 API is now quota-blocked (`HTTP 429 / quota_limit_value: "0"` — Google no longer serves anonymous requests, and no Google API key is configured here). All numbers below are from **local Lighthouse 13.4.0, mobile form factor**, run against the live prod URLs (and, for the after-fix column, the local production build via `astro preview`).

**Measured mobile performance (2026-06-14):**

| Page | Mobile Score | LCP | CLS | TBT | Flags |
|---|---|---|---|---|---|
| Home (`/`) | **99** | 1.9 s | 0.039 | 40 ms | — |
| Menu (`/menu`) | **97** | 1.9 s | 0 | 70 ms | — |
| Catering (`/catering`) | **99** | 1.7 s | 0.028 | 60 ms | — |
| About (`/about`) — *before* | **58** | **9.8 s** | 0.061 | 0 ms | Eager YouTube embed → severe LCP |
| About (`/about`) — *after fix* | **98** | **2.0 s** | 0.06 | 80 ms | ✅ resolved |

**Interpretation:**
- The Astro migration had already lifted three of four pages to near-perfect mobile scores (97–99). The earlier pre-migration baseline (kept in `_baseline/lighthouse-2026-05-16/`) drastically *understated* current performance and has been superseded by these measured numbers.
- **`/about` was the sole outlier** (58 / 9.8 s LCP). Root cause: the eagerly-loaded `youtube.com/embed/lPCIlXEzSPs` `<iframe>` — the LCP element and a large third-party payload. This was the "underperforming /about page" from the brief: a **performance** problem, not a content/indexing one (its title, meta, schema, and local copy are all well-optimized; CLAUDE.md Session 8 correctly attributes its low SERP CTR to the branded-secondary-listing effect).
- **Resolution (2026-06-14):** replaced the eager iframe with a **click-to-load facade** (local poster image + play button; the real YouTube iframe is injected only on click). Result: **perf 58 → 98, LCP 9.8 s → 2.0 s**, CLS unchanged, no console/CSP errors. Verified in a headless browser: **zero** youtube.com requests fire until the user clicks. *(CSP already permitted `frame-src youtube.com` + `img-src img.youtube.com`, so no header change was needed.)*
- **`/contact`** Google Maps `<iframe>` is already `loading="lazy"` (`src/pages/contact.astro`) — no action required; this corrects an over-statement in the original draft.

---

## 3. On-Page Content

| Page | Title Tag | Meta Description | Local Signal? | Schema? |
|---|---|---|---|---|
| `/` | "The Copperline Eatery - Best Breakfast & Lunch in Western Massachusetts \| Chicopee, Springfield, Holyoke" | ✅ rich, dish-led, 33-yr/award/area | ✅ strong (Chicopee, Western MA, Springfield, Holyoke, Hampden) | ✅ Restaurant + WebSite + AggregateRating + 5 Review + 8 AdministrativeArea + OpeningHours |
| `/menu` | "Breakfast & Lunch Menu - Eggs Benedict, Corned Beef Hash & Daily Specials \| …Chicopee MA" | ✅ specific dishes + location | ✅ | ✅ Restaurant + Menu (165 MenuItem / 162 Offer) + BreadcrumbList |
| `/catering` | "Catering Services - Western MA Breakfast, Lunch & Dinner Catering \| …" | ✅ services + cities + phone | ✅ | ✅ FoodEstablishment + Menu + 8 AdministrativeArea + BreadcrumbList |
| `/about` | "About The Copperline Eatery \| Family-Owned Restaurant Since 1993 \| Chicopee, MA" | ✅ heritage + award + team | ✅ strong | ✅ Restaurant + Organization + 2 NewsArticle + VideoObject + BreadcrumbList |
| `/contact` | "Contact & Hours - …\| 409 Broadway, Chicopee MA \| (413) 594-8332" | ✅ full NAP + hours | ✅ | ✅ Restaurant + GeoCoordinates + OpeningHours + BreadcrumbList |
| `/faq` | "FAQ - Hours, Reservations, Catering & More \| …Chicopee MA" | ✅ topic list + heritage | ✅ | ✅ FAQPage (23 Q&A) + BreadcrumbList |

**Content quality checks:**
- **Thin content:** none below the ~150-word threshold. Visible-word counts: `/menu` 2692, `/faq` 1017, `/` 513, `/about` 321, `/catering` 215, `/contact` 193. `/catering` and `/contact` are leanest but appropriate for their page types (form/CTA and contact-info pages).
- **Keyword stuffing:** not observed — titles are descriptive and natural; local terms appear in context.
- **Generic title/meta:** none — every page is specific and benefit/dish-led.
- **Local signal:** present on every page (Chicopee / Western MA / Springfield / Holyoke / Pioneer Valley / Hampden County).
- **Homepage & /about schema:** both carry full `Restaurant` JSON-LD (homepage also `WebSite` + `AggregateRating` + reviews; `/about` adds `Organization`, `VideoObject`, `NewsArticle`). ✅

---

## 4. Mobile & Accessibility

- ✅ **Viewport meta** present on all 6 indexable pages (`width=device-width, initial-scale=1.0`).
- ✅ **Image alt text:** each page renders a single `<img>` (the logo) and all have non-empty `alt`. Menus and catering visuals are rendered as HTML/CSS rather than `<img>` tags, so there is no missing-alt exposure. *(Note: this also means the page-level image count is low; if decorative menu/food photos are added later as `<img>`, re-audit alt coverage.)*
- ✅ **Phone number:** `(413) 594-8332` present on the homepage as a clickable `tel:+14135948332` link **and** inside the `Restaurant` JSON-LD `telephone` field.
- ✅ **Address:** `409 Broadway, Chicopee, MA 01020` present on the homepage in `PostalAddress` schema and as text; `/contact` adds a Google Maps embed + directions link.
- ✅ **(perf, resolved 2026-06-14):** the `/about` YouTube iframe is now a click-to-load facade; the `/contact` Maps iframe was already `loading="lazy"`. No eager third-party embeds remain.

---

## 5. Local SEO

**Present:**
- ✅ **NAP** consistent and complete on the homepage (name, `409 Broadway, Chicopee, MA 01020`, `(413) 594-8332`) — matched in `PostalAddress` + `telephone` schema and a `tel:` link.
- ✅ **Google Maps:** embedded `<iframe>` on `/contact` plus "directions" deep-links (`google.com/maps/dir//409+Broadway…`) on homepage and contact.
- ✅ **Open Graph:** complete on **all** pages — `og:title`, `og:description`, `og:type`, `og:url`, `og:image`, `og:image:alt`, `og:locale`, `og:site_name` (no missing/malformed tags). `og:image` is `logo.jpg` (`.jpg` correctly retained for social-card compatibility).
- ✅ **Geo signals:** `GeoCoordinates` + `areaServed` (8 typed `AdministrativeArea` entries) + on-page geographic prose.

**Missing / to improve:**
- ⚠️ **External citation hygiene** (off-site, dad-gated): legacy `http://` homepage form still drains from Google's index per the GSC review (CLAUDE.md Session 8). Accelerant is updating GBP/Yelp/TripAdvisor/The Q listings from `http://` → `https://` — this is the existing GBP/citation work that needs the restaurant owner, not a code change.
- ⚠️ **Sitemap homepage URL** lacks the canonical trailing slash (cosmetic; deferred — see §1).

---

## Prioritized Recommendations

1. ✅ **DONE (2026-06-14) — `/about` YouTube facade.** Eager `<iframe>` replaced with a click-to-load facade (local poster + play button; iframe injected on click). Measured perf **58 → 98**, LCP **9.8 s → 2.0 s**. *(`src/pages/about.astro`, `src/scripts/main.ts`, `src/styles/global.css`.)*
2. ✅ **N/A — `/contact` Maps embed** was already `loading="lazy"`. No change required.
3. ✅ **DONE — real Lighthouse measurement** captured (mobile, all four pages) and the report's performance table updated with measured numbers (replacing the pre-migration baseline). PSI API remains keyless-blocked; local Lighthouse is the standing method.
4. ⬜ **(Low, deferred) Align the sitemap homepage URL to the canonical** (`https://copperlineeatery.com/`). Cosmetic — needs a `serialize` hook on `@astrojs/sitemap` in `astro.config.mjs`. Deferred per owner decision.
5. ⬜ **(Low — off-site, owner-gated) Update external citations http→https** (GBP, Yelp, TripAdvisor, The Q). Tracked as the owner-gated GBP/citation work in TODO.md.
6. ✅ **DONE (2026-06-14) — `logo.webp` coverage.** Header logo now served via `<picture>` (WebP source, JPG fallback); preload retargeted to `logo.webp` to avoid a double download; `og:image` kept as `logo.jpg`. *(`public/logo.webp`, `src/components/Nav.astro`, `src/layouts/BaseLayout.astro`.)*

---
*Measurement notes: redirect/header claims verified via `curl -D -`; on-page elements parsed from live HTML (2026-06-14); performance via local Lighthouse 13.4.0 mobile (keyless PSI v5 is quota-blocked). Post-fix `/about` + logo changes verified in a headless browser (zero youtube.com requests until click; WebP-only logo fetch).*
