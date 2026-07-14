# Copperline Eatery — Website Status

**Site:** https://copperlineeatery.com  
**Stack:** Astro 5 + TypeScript · Vanilla CSS · Hosted on Netlify · Deployed via GitHub Actions  
**Last updated:** 2026-07-14

---

## Recent Updates (2026-07-14)

### Session 26 — /catering/quote interactive quote builder (PR #4 OPEN, NOT DEPLOYED)

New page at `/catering/quote`: a five-step Netlify Form (info, event, pick a buffet, build your menu, estimate). Picking a buffet opens that buffet's own build screen, where the dishes are selectable cards (not form controls) with the real choose-2 and choose-3 limits enforced, a live per-course progress pill, and an order-summary rail that fills in as they pick. The estimate prices the job: food subtotal, 15% service charge, 7% MA meals tax on food-plus-service, and a total. A "Save as PDF" button prints a one-page branded quote sheet the guest can forward. The lead email arrives fully itemized instead of as a paragraph of free text.

Pricing stays off /catering and the 25 town pages exactly as before: the builder is the only catering page with dollar figures, and it is reached by clicking through a "Build Your Catering Quote" CTA. Per Ian's call this session the page **is indexed** (targets "catering prices" and "catering quote" queries), so the same per-person prices already public on /menu are now also on a page Google can rank.

Packages, options, upcharges, and the service/tax rates are derived at build time from the catering sections of `menuData.json` via the new `src/data/cateringPackages.ts`, so prices cannot drift from /menu or the printed PDF. The parser throws at build time on any upcharge it cannot read. The same PR also carries the /catering polish pass (CTAs above the fold, centred intros, inline How-It-Works step numbers) and a 5-column footer. Details in CLAUDE.md Session 26.

**Ian's one required follow-up before this earns anything: add an email notification for the new `catering-quote` form** in the Netlify dashboard (Forms → catering-quote → notifications). It is a separate form from `catering-inquiry`, and form notifications are dashboard-only (no API), so without it the leads pool unseen, exactly as they did in Session 23.

**Open question:** the thanks-page hours Ian dictated (Sat 6:30am, Sun 7:00am) disagree with `restaurant.ts` (Sat 6:00am, Sun 6:30am), which drives the Restaurant schema, footer, and contact page. The page renders the real hours; Ian is confirming whether Sunday actually opens at 7am.

### Session 25 — SEO audit + fix wave (via PR)

Full SEO audit ([AUDIT-SEO-2026-07-07.md](AUDIT-SEO-2026-07-07.md)): 29/32 indexed (all 5 CT pages within 24h; the 3 new MA towns need a Request-Indexing re-run — Ian), technical stack all green, Lighthouse mobile 96-97/100/77/100. Fix wave shipped: titles + meta descriptions trimmed to SERP limits on the 6 core pages, the region hub, and the `[town]` template (menu title was 117 chars); 8 oversized town webp re-encoded so webp < jpg everywhere; footer gains a sitewide "Where We Cater" link; FAQ in-text links underlined (the 7/03 audit's last open a11y item); new `/seo-audit` slash command + `scripts/gsc-analytics.py` + `scripts/seo-crawl.mjs` make the audit one call next time. Details in CLAUDE.md Session 25.

### Session 24 — /catering restructure + 8 new towns incl. northern Connecticut (DEPLOYED with this commit)

Per Ian: removed the full-width hero photo from /catering, moved "Where We Cater" from below the inquiry form to directly under the top CTA buttons (now visible on the first screen at 390px and 1280px), and extended the service area into Connecticut (anything within ~30-45 min of Chicopee). 8 new town pages: Southwick, Monson, Hadley (MA) + Enfield, Suffield, Windsor Locks, East Windsor, Somers (CT) — each with a license-verified Wikimedia photo (all John Phelan, CC BY/BY-SA), URL-verified venues, distinct copy, and state-aware titles/schema (`[town].astro` no longer hardcodes MA). New "Northern Connecticut" pill group on /catering + the region hub. FAQ/llms.txt/AREA_SERVED updated for northern CT; IndexNow list now 32 URLs; 35 pages build. Details in CLAUDE.md Session 24.

---

## Recent Updates (2026-07-04)

### Sessions 21-22 — Town-page content variety, +59 verified links, copy QA (DEPLOYED)

S21 (`cb5e82e`): de-templated the 17 town pages (per-town food/events sections + layout variants; 17/17 distinct in dist) and added 59 URL-verified venue links (big towns 8-10 links, small towns honest 4-6 max). S22 (`f4ef51d`): Amherst "Menus That Respect a Mixed Table" heading replaced with "Menus With Real Vegetarian Options" after Ian flagged the double meaning; full copy sweep of all pages found no other double-meaning phrasing. GSC link-profile snapshot from Ian's sample-links export analyzed into [BACKLINK-OUTREACH.md](BACKLINK-OUTREACH.md) (profile is directory-heavy; editorial links are 2016/2018-era; Nextdoor + Apple Maps confirmed unclaimed). Details in CLAUDE.md Sessions 21-22.

---

## Recent Updates (2026-07-03)

### Session 20 — Catering growth build (DEPLOYED with this commit)

Executes the Session 19 audit's ship-now items: /catering rebuilt as a real landing page (pricing HTML from menuData, catering FAQPage schema, photo, Netlify inquiry form → /catering-thanks + GA4 event), 17 town catering pages + a Western Massachusetts region hub from a new `serviceAreas.ts` registry, /menu#catering hash-tab bug fixed, homepage brunch title/H1 + lunch section, llms.txt + AI-crawler robots allows, FAQ $13.95 price fix + link underlines, reviewCount 1130 (Google exact 1,106 via Places API). 27 pages build (was 9); sitemap 24 URLs; IndexNow list extended. **Post-deploy actions: Netlify → Forms (verify `catering-inquiry` detected + add email notification) and GSC Request Indexing for the new pages.** Details in CLAUDE.md Session 20; backlink actions staged in [BACKLINK-OUTREACH.md](BACKLINK-OUTREACH.md).

### Session 19 — Growth audit (SEO + GEO + local pack + off-site), analysis-only

Full report: [AUDIT-GROWTH-2026-07-03.md](AUDIT-GROWTH-2026-07-03.md) — prioritized ship-now / needs-Ian / needs-Dad findings with baseline metrics (Lighthouse + GSC 90d + DataForSEO local-pack positions) for post-fix comparison. Headline: catering is the gap (invisible for "catering chicopee ma" while organic #1 for "breakfast catering near me"; /catering page is a brochure with pricing locked in PDFs), GBP category is the walk-in lever (absent from "breakfast near me" pack despite organic #1), and http→https citation updates remain the branded-consolidation accelerant. No code changed.

---

## Recent Updates (2026-06-22)

### Session 13 — Full audit (a11y + security + code + SEO delta): 8 fixes DEPLOYED

Ran a full four-dimension audit (report: `copperline_audit_report.md`). No critical defects, no security exposure. Eight issues fixed in one commit; two reported for Ian's decision (em/en-dash style rule; Astro 7 upgrade).

**Follow-up (same session):** Ian approved the dash change. Em/en dashes replaced across `index/menu/about/faq` (visible copy + meta + JSON-LD) with hyphens/commas/periods/parens; the two verbatim customer-review quotes kept. Commit `0d5611a`, deployed + prod-verified. Astro 7 upgrade deferred to its own session, tracked in `../TODO.md` @low.

**Accessibility (the prior gap), all fixed — `/menu` axe 93 → 100:**
1. Menu-tab **keyboard trap** (roving tabindex, no arrow handler): keyboard users could not reach Lunch/Catering/Specials. Added Arrow/Home/End handler in `main.ts` (ARIA Tabs APG). Verified in-browser.
2. Mobile menu button `aria-expanded` never updated (+ no `aria-controls`): fixed in `main.ts` + `Nav.astro`.
3. Tap targets < 24px (nav social icons, carousel dots, footer Contact links): 24px hit areas in `global.css` (dots keep 8px visual via padding + content-box).
4. Download-menu buttons label/name mismatch: `aria-label`s now contain visible text, "Download Menu (breakfast/lunch/catering)".
5. Colour-only in-text `tel:` link in menu legend: underlined.

**Performance — one real, reproducible CWV regression fixed:**
6. `/menu` **CLS 0.296 → 0.001** (perf 83 → 98). Root cause (confirmed via LayoutShift API): self-hosted fonts use `font-display:swap` with no preload, so the text-dense menu page reflowed ~35-40px on font swap. Fix: preload Oswald 700/600 + Merriweather 400 (hash-stable `@fontsource` asset imports) in `BaseLayout.astro`. Home/about unchanged (99/100); fonts deduped (still 7 woff2). (An initial home reading of 75 was single-run noise; re-measured 99.)

**Responsive bug (pre-existing on prod), fixed:**
7. Hamburger toggle was **clipped off the right edge on phones up to ~385px** (header crammed logo + 5 social icons + DoorDash + toggle on one nowrap row). Fixed by hiding the redundant Facebook/Instagram icons in the mobile header (both still in the footer) + trimming header gaps. Now fits down to ~330px with the toggle on-screen; kept the phone/email/directions icons (each a 24px target).

**Security (1 safe fix):**
8. `npm audit fix` (non-breaking) resolved 6 of 8 advisories (form-data CRLF high, js-yaml/tar/tmp moderate, vite high). Remaining 3 need Astro 7 (breaking, build-time-only) — deferred. The specials Netlify function reviewed end-to-end: well-hardened (auth + allowlist + image validation + LLM-output validation + escapeHtml), no changes needed. Headers/secrets/CSP all clean (CSP `'unsafe-inline'` kept, same documented trade-off).

**Verified clean, no action:** all redirects single-hop 301, robots/sitemap/canonicals correct, JSON-LD parses with correct types on all 7 pages, external links healthy (DoorDash/Yelp/TripAdvisor/MassLive 403s are anti-bot, not broken). best-practices 77 is third-party analytics cookies (expected).

**QA:** clean build + strict tsc; local production build re-measured before deploy (menu CLS 0.001, a11y 100, header fits at 360px, keyboard tabs work); prod re-checked post-deploy.

**Revert path:** `git revert <commit> && git push origin master` — one commit (5 source files + `package-lock.json` + report + this entry + CLAUDE.md Session 13). Font preloads are inert if reverted; a11y/CSS changes are additive.

---

## Recent Updates (2026-06-16)

### Session 12 — Microsoft Clarity added (heatmaps + session recordings), idle-loaded (DEPLOYED)

Closed the "Set up Microsoft Clarity" @low TODO item. Clarity project `x7y38jzmw3` (Ian created it; the project ID is all that's needed — no copy-paste of the vendor snippet).

**Install (`src/layouts/BaseLayout.astro`).** Added a second inline `<script is:inline>` after the GA4 block. The `clarity()` command queue is set up immediately, but the tag-library download (`https://www.clarity.ms/tag/x7y38jzmw3`) is deferred to `requestIdleCallback` (3s timeout; `load`+1.2s fallback) — **not** the vendor's default blocking-async snippet. This mirrors the GA4 CWV deferral from Session 9 so Clarity stays off the critical render path (no queued events lost).

**CSP (`netlify.toml`).** Extended the three relevant directives for Clarity's origins: `script-src` += `https://www.clarity.ms https://*.clarity.ms`; `img-src` += `https://*.clarity.ms https://c.bing.com`; `connect-src` += `https://*.clarity.ms https://c.bing.com` (Clarity uploads session data to `*.clarity.ms`; `c.bing.com` is needed in **both** `connect-src` and `img-src` for the Bing UET sync — the sync pixel is an `<img>` `c.gif`, caught in runtime QA when only connect-src had it). No other directive touched.

**QA (all green).** `npm run build` clean; static assertions — Clarity snippet + project ID present on all 7 built pages, GA4 idle loader intact, CSP carries the clarity origins. Runtime verified on prod via headless Chrome (Playwright): the `www.clarity.ms/tag/x7y38jzmw3` request fires after idle, `window.clarity` is defined, zero CSP/console errors. **Data appears in the Clarity dashboard within a few minutes to ~2h of first real traffic** — owner can confirm at clarity.microsoft.com.

**Revert path:** `git revert <this commit> && git push origin master` — single commit (`BaseLayout.astro` + `netlify.toml` + this STATUS entry + CLAUDE.md). Clarity can also be paused from the Clarity dashboard without a code change.

### Session 11 — Homepage URL form aligned slashless across canonical + sitemap + breadcrumbs (DEPLOYED)

Closed the long-deferred "align sitemap homepage URL to the canonical trailing slash" item (was @low, cosmetic). **The planned fix was impossible:** `@astrojs/sitemap` 3.7.2 runs a hardcoded XML-text stream-replace in `write-sitemap.js` that strips the root trailing slash whenever `trailingSlash:'never'` **or** `build.format:'file'` — copperline has both. That replace runs *after* the `serialize` hook, so no config/hook can make the sitemap emit a slashed root short of forking the package or a post-build rewrite.

**Resolved the other direction instead** — made the homepage URL slashless everywhere so it matches the sitemap (and the whole site's `trailingSlash:'never'` identity). Discovery showed the homepage canonical (`${SITE_URL}/`) and its auto-derived `og:url` were already the *lone* slash outliers — the homepage Restaurant/WebSite JSON-LD `url` fields were already slashless. So this removed an existing internal inconsistency rather than creating one.

**6 one-character edits (`${SITE_URL}/` → `${SITE_URL}` for the homepage URL only):**
- `src/pages/index.astro` — homepage canonical (also flips the derived `og:url`).
- `src/pages/{about,catering,contact,faq,menu}.astro` — the `BreadcrumbList` "Home" `item` URL (included so they don't become a new inconsistency vs the home canonical).

All other `${SITE_URL}/...` refs are real paths (`/menu`, `/logo.jpg`, `/404`) — untouched.

**Risk review:** the two forms `https://copperlineeatery.com` and `https://copperlineeatery.com/` are the same resource per RFC 3986 §6.2.3 and Google canonicalizes them together, so SEO impact is ~nil; the change *reduces* risk by making canonical match the sitemap. Verified the slashless root serves `200` with `0` redirects (no redirect chain introduced).

**QA (pre-deploy, all green):** `npm run build` clean; built-DOM assertions — homepage canonical + `og:url` slashless, homepage JSON-LD `url` still slashless, all 5 breadcrumb Home items slashless, sitemap root now equals the canonical; grep confirms no `${SITE_URL}/`-as-homepage refs remain.

**Revert path:** `git revert <this commit> && git push origin master` — single commit (6 source pages + this STATUS entry + CLAUDE.md Session 11). Pure URL-string change; nothing functional depends on the slash.

---

## Recent Updates (2026-06-14)

### Session 10 — Full SEO/technical audit + `/about` YouTube facade + logo WebP (DEPLOYED, commit `deec810`)

Ran a fresh end-to-end audit (saved as `copperline_audit_report.md`). Site is healthy — all previously-known technical-SEO issues confirmed resolved. Measured mobile Lighthouse: `/` 99, `/menu` 97, `/catering` 99, **`/about` 58** — the lone outlier, dragged by an eagerly-loaded YouTube `<iframe>` (LCP 9.8 s). Fixed it plus finished WebP coverage on the header logo. **Shipped + verified live** (commit `deec810` → GH Actions deploy success 59s): prod `/about` now **perf 98 / LCP 1.6 s**; `curl` confirms no eager iframe + `logo.webp` served + assets 200.

**1. `/about` YouTube click-to-load facade** (`src/pages/about.astro`, `src/scripts/main.ts`, `src/styles/global.css`, `public/about-video-poster.{jpg,webp}`). Replaced the eager iframe with an accessible `<button class="video-facade">` showing a local poster (`<picture>` WebP + JPG) over the existing responsive `.video-embed` box; new `initVideoFacade()` in `main.ts` injects the real `youtube.com/embed/...?autoplay=1` iframe on click. **No CSP change needed** (existing `frame-src youtube.com` + `img-src img.youtube.com` already cover it). Measured result: **perf 58 → 98, LCP 9.8 s → 2.0 s**, CLS unchanged (~0.06).

**2. Header logo WebP** (`public/logo.webp`, `src/components/Nav.astro`, `src/layouts/BaseLayout.astro`). Logo now served via `<picture>` (WebP source ~20 KB vs JPG 62 KB, JPG fallback). Preload retargeted from `logo.jpg` → `logo.webp` (`type="image/webp"`) to avoid a double download. `og:image` kept as `logo.jpg` (social-card compatibility).

**Note:** `/contact` Maps iframe was already `loading="lazy"` — no change. Sitemap-root trailing-slash + http→https citations deliberately deferred (owner-gated / cosmetic).

**Verification (all green):** `npm run build` clean; strict `tsc` on `main.ts` exit 0; static `dist/` assertions (no eager iframe, facade present, logo WebP `<source>` + preload, og:image still JPG, contact map still lazy); **headless Chrome (Playwright, mobile 390×844)** — zero youtube.com/googlevideo.com requests on `/about` load, only `.webp` assets fetched (no JPG double-download), click + keyboard (Enter) both hydrate the iframe, **zero console/CSP errors**; Lighthouse before(prod)/after(preview) as above.

**Revert path:** `git revert deec810 && git push origin master` — single commit touching the 5 source files + 3 new public assets + `copperline_audit_report.md` + this STATUS entry. Facade degrades gracefully (poster still renders, `og:image` untouched) even if `main.ts` fails to load.

---

## Recent Updates (2026-06-02)

### Session 9 — Defer GA4 (CWV) + inline source photo in specials confirmation reply (CODE-COMPLETE, PENDING DEPLOY)

Two low-priority items closed in code; **built + typechecked locally, not yet pushed** (deploy = push to `master` → GitHub Actions). Both intended to ship as one revertable commit.

**1. Defer non-critical JS for Core Web Vitals (`src/layouts/BaseLayout.astro`).** The GA4 gtag.js library was the only JS still loading eagerly (`main.ts` is already a bundled, deferred ES module). Kept the tiny inline `dataLayer` + `gtag('js')` + `gtag('config')` block (so the pageview command queues immediately — **no analytics loss**) but removed the eager `<script async src=gtag/js>` and now inject that library on `requestIdleCallback` (3s timeout fallback; `load`+1.2s for browsers without rIC). Net effect: the ~library download moves off the critical render path; queued commands flush when it lands. Verified in built `dist/index.html`: eager tag gone, idle loader + inline config present.

**2. Inline the source photo atop the specials confirmation reply (`netlify/functions/inbound-email.ts`).** Deferred enhancement #2 from Session 3. The inbound board photo is now stored on the pending batch (`PendingBatch.image`, base64 + contentType + name) so it survives correction rounds, and `sendReply` attaches it inline (Postmark `Attachments` with `ContentID`) and renders an `HtmlBody` showing the photo above the extracted-specials text. Plain `TextBody` is unchanged as the fallback; all error/status replies stay text-only (no image, no HTML). Lets staff eyeball the extraction against the board at a glance. `tsc --noEmit --strict` passes.

**Revert path (once committed):** `git revert <sha>` — single commit touching `BaseLayout.astro` + `inbound-email.ts` + this STATUS entry. The specials function can also be neutralized at runtime by clearing its Netlify env vars; the GA change is inert if reverted (returns to eager async load).

### Session 8 — GSC review: HTTP/HTTPS "issue" verified already resolved + GA4 install verified (no code changes)

Analysis-only session triggered by a benchmarking review of the GSC export (`copperlineeatery.com-Performance-on-Search-2026-06-02.zip`, last-3-months Web). A separate session flagged `http://copperlineeatery.com/` outranking the HTTPS homepage (766 clicks / 12,389 impr vs 182 / 7,922) and recommended adding a 301 + HTTPS canonical. **That recommendation is moot — the redirects/canonical/HSTS already exist and were verified live today.** No code action taken or needed.

**HTTP→HTTPS — verified resolved (live `curl` against prod 2026-06-02):**
- `http://copperlineeatery.com/` → **301 → `https://copperlineeatery.com/`** (single hop, correct target).
- `https://copperlineeatery.com/` → 200 with `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.
- Homepage canonical tag: `<link rel="canonical" href="https://copperlineeatery.com/">`.
- `.html` legacy redirects live: `…/menu.html` → 301 → `/menu`; `http://www…/catering.html` chains http→https→non-www→`/catering`→200.

**Why GSC still shows the http row (the diagnostic the other session missed):** In `Pages.csv`, the ONLY `http://` entry is the bare homepage root. Every other page (`/menu`, `/catering`, `/about`, `/contact`, `/faq`, and the `.html` variants) appears as `https://` only. So this is not a site-wide HTTP indexing problem — it's the single most-backlinked URL form (the bare `http://` domain root, historically written that way by directories / GBP / citations) draining out of Google's index as it reprocesses the 301 + HTTPS canonical. The split position (http at 13.6 vs https at 7.3) is the temporary cost of mid-consolidation; it resolves with recrawl. This is a **lagging GSC report, not an active defect.**

**Only real accelerant:** update external citations still pointing at `http://copperlineeatery.com` (GBP website field, Yelp, TripAdvisor, The Q 99.7, directories) to `https://`. This is already part of the dad-gated GBP/citation work in "Remaining Items" — not new scope. Optional nudge: GSC URL Inspection → Request Indexing on `https://copperlineeatery.com/`.

**`/about` low-CTR flag — not a defect.** Other session read `/about` (1,011 impr, 2 clicks, 0.2% CTR, pos 6) as a broken title/meta. The live title (`About The Copperline Eatery | Family-Owned Restaurant Since 1993 | Chicopee, MA`) and meta description are well-optimized. The near-zero CTR is the normal branded-SERP secondary-listing effect (the homepage takes the branded click; About/Contact/`menu#specials` ride underneath). No action.

**GA4 install — verified present + well-formed on every route.** `curl` of `/`, `/menu`, `/catering`, `/contact`, `/about`, `/faq`, and a 404 each returns the standard gtag.js install via BaseLayout: async `googletagmanager.com/gtag/js?id=G-DXYNCF0G79` loader + exactly one `gtag('config', 'G-DXYNCF0G79')` per page (no double-fire). Custom events wired in `main.ts` (`click_phone`, `click_email`, `click_doordash`, `click_directions`, `download_pdf`). CSP permits `googletagmanager.com` (script-src) + `google-analytics.com` (connect-src/img-src). Static install is conclusive; live *firing* still requires a browser check (GA4 Realtime / DebugView) since `curl` doesn't execute JS.

**No commit this session** — verification + STATUS doc only.

---

## Recent Updates (2026-05-23)

### Session 7 — Specials pipeline reply-parsing bugs (commits `8536a5d`, `e543fc2`) + first real publish (`43259a4`)

User reported: submitted photo, submitted corrections successfully, replied YES, got a blank email back, site not updated. Two distinct bugs in the inbound-email function's reply parser. Both fixed; specials are now live on `/menu` for the first time since the pipeline shipped (Session 3, commit `4af2b9a`).

**Diagnosis from Netlify Function logs:**
- 11:40:55 / 720ms invocation: hit the `if (!body)` empty-reply branch — Gmail/Apple Mail had sent the reply HTML-only with no `TextBody` populated.
- 11:47:38 / 7350ms: vision-call invocation (new photo round).
- 11:48:21 / 2356ms: Haiku corrections call (legitimate edits round).
- 12:03:55 / 2970ms: YES attempt reinterpreted as corrections because the body string `"yes\n\nOn Sat, May 23, 2026 at 11:48 AM <bot>\nwrote:"` (len 86) failed the YES_PATTERN due to incomplete quote-stripping.

**Bug 1 — HTML-only inbound replies (commit `8536a5d`):**
- Some mail clients send replies with only `HtmlBody` populated and an empty `TextBody`. Function read only `TextBody`, hit the empty-body branch, and sent a "I got an empty reply" message that the user's threaded view collapsed (so it looked blank).
- Fix: new `htmlToText()` helper (pure regex, no DOM parser dependency) that strips style/script blocks, converts `</p>`, `</div>`, `</li>`, `<br>` to newlines, removes remaining tags, decodes common entities. New `extractReplyBody()` chooses `TextBody` when populated, falls back to `htmlToText(HtmlBody)` when not.
- Also added mobile-signature stripping for "Sent from my iPhone/iPad/Android/Galaxy" and "Get Outlook for iOS/Android" footers, which don't use the standard `-- ` signature separator and were previously polluting the parsed body and breaking the tight YES/NO regex matching.
- Added a `console.log(\`Reply body (batch=..., len=N): ...\`)` to every confirmation-reply invocation. This is what surfaced Bug 2 below — without the log, the second failure mode would have been indistinguishable from the first.

**Bug 2 — "On <date>, <sender> wrote:" attribution not stripped without trailing newline (commit `e543fc2`):**
- After Bug 1's HtmlBody fallback shipped, the user's second YES attempt hit the new log line and revealed: the user's reply body, after `>`-prefix line filtering, ended with `"yes\n\nOn Sat, May 23, 2026 at 11:48 AM <bot>\nwrote:"`. The Gmail attribution line was supposed to be stripped by the existing `\n+On .{0,200}wrote:\s*\n` regex, but two real-world issues broke that regex:
  - `.{0,200}` doesn't match newlines (Gmail puts a newline between sender and `wrote:` on long attribution lines).
  - Trailing `\n` was required, but after the `>` lines below are stripped, `wrote:` becomes the LAST line of the body with no trailing newline.
- Fix: `\n+On [\s\S]{0,300}?wrote:[ \t]*\n?` — `[\s\S]` matches across newlines; non-greedy `{0,300}?`; trailing `\n` is optional. Also added an Outlook-style "From:" / "-----Original Message-----" header strip in case of Outlook MIME quirks.

**The "blank email" piece is still partly unsolved.** The function definitely sent a non-empty body in every code path post-parse (verified by reading every branch). The user observed truly blank content even after expanding "trimmed content" in Gmail. Best theory: client-side rendering bug specific to threaded specials-bot replies (possibly multiple identical "Updated specials" previews collapsing in a way that hides the latest). Not pursued further once Bug 2 fix unblocked publishing. If it recurs, ask user to forward the email and inspect "Show original" headers + raw MIME.

**First successful publish (auto-commit `43259a4`):** 8 specials live on `/menu` via the DailySpecials component at build time. Verified by `curl https://copperlineeatery.com/menu` matching "Southwest Chicken Hash", "Pineapple French Toast", "Rueben Omelet". One typo in source ("Rueben" → "Reuben") flagged to user for next correction round.

**Revert path:** `git revert e543fc2 && git revert 8536a5d` reverts both function patches independently. The `43259a4` auto-commit is data, not code — revert if specials need to be reset.

---

## Recent Updates (2026-05-22)

### Session 6 — Schema enrichment, home description rewrite, footer redesign, catering mobile button fix (commit `5ee2ac3`)

Single bundled commit; deploy ~51s green; live + verified.

**AI / SERP discoverability (schema)**
- `src/data/restaurant.ts`: `AREA_SERVED` upgraded from bare string array to typed `AdministrativeArea` objects. Added West Springfield, South Hadley, Pioneer Valley (8 total). New `PAYMENT_ACCEPTED` ("Cash, Credit Card, Visa, Mastercard, American Express, Discover") and `CURRENCIES_ACCEPTED` ("USD") constants, sourced from FAQ Q20.
- `src/pages/index.astro` + `src/pages/about.astro`: Restaurant schema gains `paymentAccepted`, `currenciesAccepted`, `acceptsReservations: false` (boolean, not the string "False"), `hasMenu: ${SITE_URL}/menu`. Origin: Gemini suggested a Restaurant schema snippet for "Springfield area" inclusion; assessment was that the user's existing schema was already richer than Gemini's draft, so we kept what we had and borrowed only the typed-AdministrativeArea idea + added the four genuinely missing factual fields. Honest framing for the user: schema alone does not get a restaurant into "best breakfast in Springfield" AI answers — that's driven by Google Business Profile + editorial mentions + citations + on-page geographic prose (latter addressed below). Schema is the table-stakes layer.

**Home meta + descriptions (`src/pages/index.astro`)**
- Page meta description, OG description, Restaurant schema description, and WebSite schema description rewritten to lead with the user's preferred dish list (eggs benedict, homemade corned beef hash, banana bread French toast) and demote the previous "homemade eggs benedict, corned beef hash, hollandaise sauce, brunch, lunch & catering" string. New page meta description: "Family-owned Chicopee restaurant since 1993, serving brunch classics like eggs benedict, homemade corned beef hash, and banana bread French toast. Voted Best Breakfast in Western MA. Catering available across Springfield, Holyoke, and Hampden County." Grep confirmed the old string was only in `index.astro`.

**About page location anchor (`src/pages/about.astro`)**
- New paragraph inserted between the existing signature-dishes paragraph and the closing thank-you paragraph: "Located at 409 Broadway in Chicopee, we proudly serve guests from across the Pioneer Valley, including Springfield, Holyoke, West Springfield, South Hadley, and all of Hampden County. Whether you're driving in from downtown Springfield for our award-winning eggs benedict, picking up catering for an event in Holyoke, or visiting from anywhere in Western Massachusetts, you'll find a warm welcome and a meal worth the trip." Geographic prose for LLMs that read rendered content, not just schema.

**Catering mobile button overflow (`src/styles/global.css`)**
- Bug: at <=640px, the `Download Catering Order Form` button label extended beyond the button on both sides. Root cause: the global mobile `.btn` rule applied `flex: 1` + `white-space: nowrap` + `display: flex`; combined with the long label, the text overflowed the button bounds. Fix: scoped those mobile overrides to `.cta-buttons .btn` only (the home-page hero CTA row), since they were never meant for other CTA contexts. Added a separate `.catering-cta-row .btn` block with `white-space: normal`, `max-width: 100%`, `padding: 12px 18px`, `font-size: 0.85rem` so labels wrap inside the button on narrow screens.

**Footer redesign (`src/components/Footer.astro` + `src/styles/global.css`)**
- User reported footer took >50% of mobile viewport. Was 6 stacked sections (Name+Address, Hours, Contact, Quick Links, Follow Us, Find Us Online) × ~4 lines each = ~24 lines + h3 per row on mobile. Reworked to a 4-column grid (NAP, Hours, Contact, Explore) plus a single inline Connect bar between thin dividers containing Facebook · Instagram · Yelp · TripAdvisor · Yellow Pages. Padding tightened (40/20 → 28/14 desktop, 25/15 → 20/12 mobile), h3 font 1.1rem → 0.95rem, body 0.95rem → 0.9rem desktop and 0.85 → 0.82 mobile. Mobile uses 2-col grid; <380px collapses to single column. Class rename `footer-content` → `footer-grid`; `footer-section` → `footer-col`; new `footer-list` for the Explore links; new `footer-connect` block. Old `.email-btn` styling preserved (still used on `/contact`).

**Verification:** post-deploy curl confirmed live: new meta description, `acceptsReservations":false` (boolean serialization correct), 8 AdministrativeArea entries in JSON-LD, `/catering` 200, `footer-grid` class present in rendered DOM.

**Revert path:** `git revert 5ee2ac3 && git push`. Single revertable commit touching 5 files (Footer.astro, restaurant.ts, about.astro, index.astro, global.css). Reverts schema enrichment, description rewrite, About paragraph, catering CSS scope fix, and footer redesign together.

### Session 5 — Specials pipeline enhancements + font self-hosting

Two unrelated work tracks bundled into the same day (different commits, separate revert paths).

**Specials function (`netlify/functions/inbound-email.ts`, commit `46e7608`):**
- **Threaded replies.** Outbound emails now set `In-Reply-To` + `References` headers (RFC 2822) referencing the inbound `MessageID`. Gmail threads the YES-gate confirmation into the original photo email's conversation, so staff can scroll up in the thread to see the source photo whenever they need to reference it. Picked over base64-inlining the image (lighter, equivalent UX for "available to reference").
- **Free-form natural-language edit-via-reply.** Reply branch now distinguishes three cases:
  - YES / PUBLISH / CONFIRM / Y (tight regex, body must be just the word) → commit + delete pending.
  - NO / NOPE / CANCEL / STOP / DECLINE / DISCARD / NEVERMIND (tight regex, body must be just the word) → delete pending without publish.
  - Anything else → treat as corrections. Pipes current specials JSON + staff reply to Haiku 4.5 (`claude-haiku-4-5-20251001`) with a corrections prompt, applies edits (rename / re-price / remove / add / reorder), writes a new pending blob with a fresh `batchId`, sends a corrected confirmation email threaded to staff's reply. Loops naturally until publish or discard. Quoted previous-message text stripped before pattern-matching and Claude call.
- **Opportunistic orphan purge.** At the top of every function invocation (after auth, after sender allowlist), lists all blobs in `pending-specials`, fetches each, deletes any with `createdAt` older than 24h. Handles the orphans created during Session 3 diagnosis + any future no-reply scenarios. Runs on every email (low volume system, free-tier safe).
- **Model right-sizing.** Vision call stays on Sonnet 4.6 (image-in-text-out). Corrections call uses Haiku 4.5 (text-in-text-out structured task). Memory `feedback_right_size_models.md` applied.

**Daily auto-expiry of specials (`updatedAt` >18h check + scheduled rebuild) was discussed and intentionally not implemented** — the ops cadence doesn't fit (boards update Fridays, run until sold out, typically clear mid-week, new specials Thursday). Auto-expiry would either kick in too soon (mid-week) or too late (Thursday for already-cleared Wednesday specials).

**Font self-hosting (`src/layouts/BaseLayout.astro` + `netlify.toml`, commit `6ca3237`):**
- Replaced Google Fonts `<link>` + 2 `preconnect`s with `@fontsource/oswald` + `@fontsource/merriweather` ESM imports in BaseLayout. Latin subset only (covers all source content; only non-ASCII char in src is `é` in `menuData.json`, U+00E9, which is in the latin subset). Vite bundles 7 woff2 files (4 Oswald weights 400/500/600/700 + 3 Merriweather weights 300/400/700) into `/_astro/` with hashed filenames + the existing immutable cache headers.
- CSP tightened: `style-src` drops `https://fonts.googleapis.com`, `font-src` drops `https://fonts.gstatic.com` (now `'self'` only). Removes 2 external DNS lookups on every page load.
- Net effect: same fonts, same weights, served from self. No visual change expected.

**Postmark FROM revert complete** (commit `d0b6b69`, empty-commit redeploy). Postmark account approval landed this session; user flipped `SPECIALS_FROM_ADDRESS` in Netlify Site Settings from `specials-bot@homegrowngrowth.co` back to `specials-bot@parse.copperlineeatery.com`; empty commit forced the Netlify Function to pick up the new env var.

**Revert paths:**
- `git revert 46e7608 && git push` — reverts specials function to Session 3 state (YES/non-YES binary, no threading, no purge). Reply branch behavior changes: corrections become declines. Re-introduces orphan accumulation.
- `git revert 6ca3237 && git push` — reverts fonts to Google Fonts CDN. Need to also re-add the loosened CSP (or just revert the commit which does that). 7 woff2 files removed from bundle.
- `git revert d0b6b69 && git push` is a no-op since the commit is empty; to revert the FROM revert, change `SPECIALS_FROM_ADDRESS` in Netlify back to `specials-bot@homegrowngrowth.co` and trigger another empty-commit redeploy.

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

Open tasks are tracked in [../TODO.md](../TODO.md) (single source of truth, synced to Notion), not enumerated here, to avoid drift. The open work is the (DAD) Google Business Profile setup, citation NAP audit, and DoorDash menu audit, all gated on Ian's dad (he holds those business-platform accounts). The earlier "Low-Priority Dev Tasks" list is superseded: breadcrumb schema, WebP conversion, and defer-JS are all done (see Website/CLAUDE.md), Microsoft Clarity is live (Session 12), and the optional `/index.html` redirect is unnecessary because the canonical tag already consolidates it.

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
