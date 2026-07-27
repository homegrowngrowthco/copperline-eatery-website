# Copperline Eatery — Full Site Audit (a11y · security · code · SEO)

> RESOLVED — all 8 fixes deployed Session 13; superseded by the July audits (`AUDIT-GROWTH-2026-07-03.md`, `AUDIT-SEO-2026-07-07.md`). Archived 2026-07-18.

**Site:** https://copperlineeatery.com
**Date:** 2026-06-22 (Session 13)
**Scope:** Accessibility (WCAG / axe), Security (deps, CSP, specials Netlify function), Code quality, and an SEO/content/schema delta re-check. Builds on the 2026-06-14 technical-SEO/perf audit (Session 10).
**Method:** Full source read; `npm audit`; strict `tsc`; clean `astro build`; live `curl` (headers/redirects/robots/sitemap); Lighthouse 13.4.0 mobile (perf + accessibility + SEO + best-practices) on `/`, `/menu`, `/about`, `/contact`; JSON-LD parse/type validation on built DOM; headless-browser (Playwright, 360–390 px) keyboard/ARIA + layout-overflow + LayoutShift-API CLS attribution; external-link probes.

> All fixes below were applied, built, **verified on the local production build**, and deployed in one revertable commit. Re-verified on prod after deploy.

---

## Executive summary

- **No critical defects. No security exposure.** Secrets clean; the specials Netlify function is well-hardened; technical SEO remains green across the board.
- **8 issues fixed and deployed** this session — concentrated in **accessibility** (the dimension prior audits had only skimmed) plus one **reproducible CWV regression** and one **pre-existing mobile-header bug**:
  1. *(Moderate, a11y)* Menu tabs were a **keyboard trap** — fixed.
  2. *(Moderate, a11y)* Mobile menu button `aria-expanded` never updated — fixed.
  3. *(Moderate, responsive — pre-existing on prod)* Hamburger toggle **clipped off-screen on phones ≤ ~385 px** — fixed.
  4. *(Moderate, perf/CWV)* `/menu` **CLS 0.296 → 0.001** (font-swap reflow) — fixed.
  5–7. *(Minor, a11y)* Tap-target sizes, a label/name mismatch, and a colour-only in-text link — fixed (`/menu` axe score **93 → 100**).
  8. *(Low, security)* **6 of 8** npm advisories resolved (non-breaking).
- **2 items reported for your decision** (not auto-changed): the em/en-dash style question, and the Astro 7 upgrade (breaking; clears the last 3 build-time advisories).

---

## 1. Accessibility — biggest gap closed (all fixed)

Measured with Lighthouse/axe (mobile) + manual headless-browser keyboard and ARIA testing.

| # | Severity | Finding | WCAG | Fix |
|---|---|---|---|---|
| 1 | Moderate | **Menu-tab keyboard trap.** The four menu tabs use a roving `tabindex` (only the active tab is tabbable) but had **no arrow-key handler**, so keyboard users could not switch to Lunch/Catering/Specials at all. | 2.1.1 | Added `ArrowLeft/Right/Up/Down` + `Home/End` handler in `main.ts` (ARIA Tabs APG, automatic activation). Verified: Arrow steps breakfast→lunch→catering, Home wraps to first. |
| 2 | Moderate | **Mobile menu toggle `aria-expanded` never changed.** Hardcoded `false`; `main.ts` toggled the class only. Screen-reader users got no open/closed state. | 4.1.2 | Toggle now flips `aria-expanded` on open/close (and on nav-link close); added `aria-controls="mainNav"`. |
| 3 | Minor | **Tap targets < 24×24** — nav social icons (20 px), carousel dots (8 px), stacked footer Contact links. | 2.5.8 (AA) | Icons → 24 px min hit area; dots → 8 px visual kept but 24 px hit area via `padding`+`content-box`; footer links → `inline-block` + vertical padding. |
| 4 | Minor | **Label/name mismatch** — the three "Download Menu" buttons had `aria-label`s ("Download breakfast menu image") that didn't contain the visible text. | 2.5.3 | `aria-label`s changed to `Download Menu (breakfast/lunch/catering)` — contain the visible text and stay unique. |
| 5 | Minor | **Colour-only in-text link** — the `tel:` link inside the menu-legend paragraph wasn't underlined. | 1.4.1 | Underlined `.menu-legend a`. |

**Result:** `/menu` axe score **93 → 100** (zero failures); `/`, `/about`, `/contact` already 95–96 and clean of the above. The `<details>`-based FAQ and `role="tablist"` markup were already correct.

---

## 2. Performance / Core Web Vitals (one real regression — fixed)

Fresh Lighthouse mobile. `/about` and `/contact` are **100**; `/` is **99** (an initial 75 reading was single-run noise on a loaded machine — re-measured 99, LCP 1.7 s).

- **`/menu` CLS = 0.296 (FAILING), reproduced across runs.** Root cause confirmed via the browser LayoutShift API: the self-hosted Oswald/Merriweather fonts load with `font-display: swap` and **nothing preloads them**, so on the text-dense menu page the page-header subtitle + tab row reflow ~35–40 px when the real fonts arrive (FOUT). Home uses the same fonts but shifts little, so it slipped past prior audits.
- **Fix:** preload the three above-the-fold weights (Oswald 700/600, Merriweather 400) via hash-stable `@fontsource` asset imports in `BaseLayout`. **`/menu` CLS 0.296 → 0.001, perf 83 → 98**; `/` and `/about` unchanged (99/100). Fonts deduped (still 7 woff2, no extra download).

**Best-practices = 77 on every page** is driven solely by `third-party-cookies` (GA4 + Clarity) and the related inspector notice — expected for analytics on a static site; **accept** (removing analytics is the only "fix").

---

## 3. Security — clean (1 safe fix applied)

- **Dependencies:** `npm audit` showed 8 advisories. `npm audit fix` (non-breaking) resolved **6** — `form-data` CRLF (high), `js-yaml`/`tar`/`tmp` (moderate), `vite` (high). The remaining **3** (astro/esbuild XSS-SSRF + `@netlify/zip-it-and-ship-it`→esbuild) require **Astro 7** (breaking) and are **build-time only** — deferred (see §6). None are runtime-exploitable on a static marketing site with no user input surface.
- **Specials Netlify function (`inbound-email.ts`) — well-hardened, no changes needed.** Reviewed end-to-end: Basic-auth gate → sender allowlist (lower-cased, silent 200 drop for non-allowlisted) → image type+size validation → LLM output is JSON-parsed, shape-validated, and string-coerced → outbound HTML is `escapeHtml`-escaped → orphan pending-batch purge (>24 h). GitHub write happens only on an allowlisted "YES". *Low note (no action):* auth compares with `===` (not constant-time) — negligible over HTTPS with random creds.
- **Headers (verified live):** full CSP, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, HSTS `preload`. Strong.
- **Secrets:** none tracked (`git ls-files`/`git grep` clean); `.gitignore` covers `.env*`, `Screenshots/`, `*.eml`. `.env.example` has no values.
- **CSP `'unsafe-inline'`** remains in `script-src`/`style-src` (inline GA4/Clarity + JSON-LD). Same deliberate, documented trade-off — static site, no auth/UGC surface. Not changed.

---

## 4. Code quality — clean

- `astro build` clean, zero warnings; strict `tsc` on `main.ts` passes; built JSON-LD on all 7 routes parses with correct `@type`s (Restaurant/WebSite, Menu, FAQPage, NewsArticle/VideoObject, BreadcrumbList, FoodEstablishment).
- Single source of truth (`restaurant.ts`) + shared components; no duplication or dead code of note. Function uses right-sized models (Sonnet vision / Haiku corrections).

---

## 5. SEO / content / schema delta — green (matches Session 10)

- **Redirects (all single-hop 301, live):** `http→https`, `www→non-www`, six `/*.html→/clean`, `/sitemap.xml→/sitemap-index.xml`. 404 returns 404. HSTS preload present.
- **robots.txt** advertises `sitemap-index.xml`; **sitemap** lists the 6 indexable URLs; `/404` excluded; canonicals self-reference; homepage URL form slashless-consistent (Session 11).
- **External links:** `linkedin` / `theq997` / `wwlp` → 200. `doordash` / `yelp` / `tripadvisor` / `masslive` → 403 = **anti-bot blocking of automated user-agents, not broken links** (confirmed live in-browser previously).
- **NAP / hours** consistent across pages, schema, footer, and contact table.

---

## 6. Reported for your decision (not auto-changed)

- **Em/en dashes vs your "no dashes" style rule.** ~34 dash occurrences in content: FAQ `&mdash;`/`&ndash;`, menu hours en-dashes, two meta descriptions, the About + FAQ schema, and **two verbatim customer-review quotes**. Left unchanged because (a) altering customer quotes is wrong, and (b) en-dashes in time ranges are standard typography while the footer/contact already use plain hyphens. **Recommended (on your go-ahead):** replace dashes in *marketing prose + hours ranges* with hyphens/commas to match the footer and your rule; leave the two review quotes verbatim. Code comments are out of scope.
- **Astro 7 upgrade.** Clears the last 3 (build-time-only) advisories but is a breaking major migration — schedule as its own verified pass, not bundled here.

---

## Deploy & revert

All fixes shipped in **one commit** (5 source files + `package-lock.json` + this report + STATUS/CLAUDE log). Revert: `git revert <sha> && git push origin master`. Each change degrades gracefully — the font preloads are inert if reverted (returns to the prior swap behaviour), and the a11y/CSS changes are additive.

*Verification: local production build re-measured (menu CLS 0.001, a11y 100, home 99) before deploy; prod re-checked post-deploy (headers + menu CLS).*
