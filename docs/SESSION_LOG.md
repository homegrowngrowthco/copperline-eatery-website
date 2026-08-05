# Copperline Eatery Website — Session Log (append-only archive)

Merged from CLAUDE.md `## Session Log` + STATUS.md `### Session N` entries on 2026-07-18. The two logs were near-1:1 duplicates; for each session the fuller entry was kept and any unique facts from the other were folded in. Strictly reverse-chronological. Historical text is preserved as written (including its dashes).

**New-entry convention:** one entry per session, 20 lines or fewer (what shipped / commit SHAs / how it was verified / revert path / gotchas), written ONCE here at the top. Never duplicate a session entry into CLAUDE.md or STATUS.md; CLAUDE.md stays evergreen and STATUS.md stays a short live-state snapshot.

---

### Session 32 — 2026-08-04 — forms health check + http-vs-https audit + /catering/quote discovery gap
Q from Ian: anything left for the forms to go live, and why is the http page still "most popular"? **Forms: nothing left.** Netlify API confirms `catering-quote` registered (id `6a67c077908fb60008923d11`, 29 fields, honeypot) and `catering-inquiry` healthy; zero real quote leads since the 7/27 e2e test is a demand signal, not breakage. Reminder logged: check Forms -> Spam occasionally (Netlify silently bins suspicious posts).
**http mystery solved, config NOT at fault:** curl-verified http->https 301 + www->non-www + HSTS preload; URL Inspection shows Google canonical = https for BOTH variants and http = "Page with redirect". Yet 81% of homepage GSC clicks (338/418, stable 12w) attribute to http:// — that pattern can only come from the local-pack/GBP Website button, which GSC reports under the exact URL in the GBP website field. Fix is in GBP (DAD item in ../TODO.md), zero code changes.
**Real finding: /catering/quote is "URL unknown to Google"** (never crawled, 0 impressions 28d) — STATUS's "(indexed)" claim was wrong, corrected. On-site SEO verified live (sitemap, canonical, index/follow, links from /catering + /menu + town pages). Shipped: homepage Catering info-card now links to /catering/quote ("Get an instant catering quote"). Ian to Request Indexing in GSC (new top TODO item).
**Verified:** build 36 pages + grep dist homepage for the new link; qa:docs green. **Revert:** `git revert <this sha>`.
**Gotcha:** GSC page reports on a domain property can attribute clicks to a non-indexed URL variant when the GBP website field carries that variant; check GBP before suspecting redirects.

---

### Session 31d — 2026-07-27 — catering-quote form accidentally deleted in dashboard; recovered
Ian deleted the `catering-quote` FORM (meaning to delete its stale email notification). Netlify registers forms by parsing deployed HTML, so recovery = one empty-commit redeploy (`d72369d`): form re-registered with all 29 fields + honeypot under a NEW form id `6a67c077908fb60008923d11` (old id in earlier log entries is dead; scripts/notifications keyed by form NAME are unaffected — `submission-created.ts` filters on `form_name`, so the PDF email pipeline needed no changes). Prior submissions on the deleted form are gone (all were tests; zero real leads). `catering-inquiry` untouched. Side effect: the stale raw notification died with the form — nothing left for Ian to delete.
**Verified:** full browser walk of the builder on prod (Buffet Package #3, 35 guests) — submission registered on the new form, PDF email From Copperline Catering arrived 4s later, test lead deleted.

---

### Session 31c — 2026-07-27 — quote PDF v3: faithful replica of the on-site print sheet
Ian's feedback on v2: the emailed PDF "doesn't look anything like" the visitor's Save-as-PDF sheet. v3 rebuilds `lib/quote-pdf.ts` as a true replica of `#printSheet` + the `@media print` CSS: real logo (public/logo.jpg, 190px centered), REAL BRAND FONTS — the same @fontsource Oswald 400/700 + Merriweather 400/700 woffs the site serves, embedded via `@pdf-lib/fontkit` (subset) — red 16pt CATERING ESTIMATE title, "Prepared <date>", 2.5px red head rule, two-column Your info / Your event, dotted row rules with Oswald-uppercase dt + Merriweather-bold right-aligned dd ("Not given" for empties, like the sheet), package-line h4 + picked-course rows (Comes with/NOTE lines excluded, as on the sheet), allergies/notes print-cols, totals with the exact builder labels ("Service charge (15%)") parsed from `menu-selection`'s totals block, red-ruled 11pt red estimated total, and the sheet's own disclaimer with bold lead-in. All CSS px -> pt at 0.75.
**Assets:** `scripts/embed-fn-assets.mjs` generates `netlify/functions/lib/assets.ts` (base64 fonts + logo, ~300KB source) so the function bundles them with zero runtime fs/netlify.toml plumbing; rerun after @fontsource bumps or a logo swap. PDF ~86KB.
**Verified:** tsc strict clean; qa:functions (model assertions vs a full realistic payload + PDF round-trip load, >50KB floor) all PASS; rendered sample visually compared against the print sheet's markup/CSS — layout, fonts, colors, rules all match; live e2e via a REAL Playwright browser walk of all 5 builder steps on the prod site — email From Copperline Catering with the replica PDF attached, 3s after submit; test lead deleted.
**Gotcha:** repeated curl form posts get silently spam-binned by Netlify (3rd identical-shape bot-UA post from one IP never reached verified submissions, so no submission-created event and no email). E2E-test the quote pipeline through a real browser session, not curl.
**Revert:** `git revert <this sha>`.

---

### Session 31b — 2026-07-27 — quote email v2 per Ian: PDF attachment + separate catering sender
Ian's feedback on v1: the HTML body was still hard to read ("just attach the PDF"), and the email came from the specials bot address. v2: `submission-created.ts` now sends a SHORT plain-text summary (name, phone, email, guests, date, est. total) with a generated **PDF quote sheet attached** — `netlify/functions/lib/quote-pdf.ts`, built with `pdf-lib` (pure JS, +0 npm advisories), mirroring the on-site print sheet: header + NAP (imported from `src/data/restaurant.ts`, single source), Contact/Event/Menu/Estimate/notes, disclaimer. The visitor-facing "Save as PDF" is the browser print dialog, so the emailed copy must be server-generated; it cannot be captured from the client.
**Sender separation:** new `QUOTE_FROM_ADDRESS` env (set: `catering@parse.copperlineeatery.com`, functions scope; falls back to `SPECIALS_FROM_ADDRESS`), display name `Copperline Catering`. Works because Postmark verifies the parse subdomain at the DOMAIN level. Note: if a customer emails that address directly it lands in the specials inbound webhook (same MX) and is safely ignored there; replies to Ian's own replies go to the customer (Reply-To).
**Verified:** tsc strict clean; `qa:functions` grew model + PDF round-trip checks (raw-byte grep on the PDF does NOT work — pdf-lib Flate-compresses streams; assert on the parsed model + `PDFDocument.load`); sample PDF visually inspected (layout correct, single page); live e2e test submission → email landed From `Copperline Catering`, PDF attached and opens; test lead deleted from Netlify Forms.
**Revert:** `git revert <this sha>`; optionally delete `QUOTE_FROM_ADDRESS` in Netlify env.

---

### Session 31 — 2026-07-27 — formatted catering-quote notification email (replaces Netlify's raw field dump)
Ian's first real quote submission arrived as Netlify's default form notification: every raw field (29 of them, incl. hidden money fields and the `menu-selection` blob) dumped unformatted. Netlify's built-in notifications cannot be templated, so shipped `netlify/functions/submission-created.ts`: an event-triggered function (filename is the trigger; not publicly routable) that ignores every form except `catering-quote` and sends a clean sectioned email via the existing Postmark server — Contact / Event / Menu (parsed from the builder's own `menu-selection` summary) / Estimate table / Kitchen notes. Subject carries name, guest count, date, est. total; **Reply-To = the customer**, so replying answers them directly. All user text HTML-escaped; always returns 200 (the lead is already stored in Netlify Forms; a send failure must never look like a failed submission).
**New env var:** `QUOTE_NOTIFY_EMAILS` (comma-separated, falls back to `REVIEWER_EMAILS`) — set to Ian's gmail via Netlify API, functions scope, all contexts. Documented in `.env.example`.
**Verified:** tsc strict clean on all 3 functions; `qa:functions` extended (bundle + GET→405 + other-form ignored + quote-without-token exits clean + `renderQuoteEmail` output asserted on a realistic payload) all PASS; then a REAL end-to-end test submission through the live form.
**For Ian:** the old raw Netlify notification for `catering-quote` still fires in parallel — once the formatted email looks good, delete it in Netlify dashboard → Forms → catering-quote → Notifications (keep the `catering-inquiry` one).
**Revert:** `git revert <this sha>`; optionally delete `QUOTE_NOTIFY_EMAILS` in Netlify env.

---

### Session 30 — 2026-07-27 — dependency follow-ups: postmark 5 / @netlify/functions 5 / @netlify/blobs 10 / @anthropic-ai/sdk 0.115 + `qa:functions` harness
All four function-side deps upgraded in one commit, each proven ONE AT A TIME in a fresh C:\tmp\copperline-deps-test sandbox before touching this tree: `postmark` 4.0.7→5.1.0 (v5 has ZERO runtime deps — the axios advisory chain is gone), `@netlify/functions` 4.3.0→5.3.0 (v5 dropped the bundled zip-it-and-ship-it toolchain, -370 packages, kills the tar/svgo/brace-expansion advisories; we only import `type Context`), `@netlify/blobs` 9.1.6→10.7.10 (v10 was already what functions 4.3 bundled internally, so runtime-proven), `@anthropic-ai/sdk` 0.39.0→0.115.0. Then `npm audit fix` bumped astro's bundled `sharp`→0.35.3 (clears the libvips CVE batch) and `svgo`→4.0.2. **Audit: 7 → 3 moderate**, all three = `@opentelemetry/core@2.7.1` pinned inside Netlify's own `@netlify/otel` (dep of blobs 10) — upstream's pin, clears when Netlify bumps, nothing for us to do.
**New QA asset:** `scripts/fn-check.mjs` (`npm run qa:functions`) — bundles both Netlify functions with esbuild (mirrors Netlify's pipeline, proves import resolution against installed deps) then invokes the handlers on side-effect-free paths (GET→405 both; unauthed POST→401 on inbound-email). Run it after ANY dependency or function change.
**Verified:** per-dep in sandbox (tsc strict on both functions + fn-check + astro build) at every step; in this tree `astro check` 0 errors, 36-page build, **dist byte-identical** to the pre-upgrade build (`diff -r` clean), qa:functions + qa:docs green. Runtime email/vision/blobs paths are unexercised locally by design (they spend/send) — watch the function log on the next real specials email.
**Revert:** `git revert <this sha>` (package.json + package-lock + scripts/fn-check.mjs in one commit).

---

### Session 29 — 2026-07-27 — Astro 5→7 upgrade + Sunday hours fix (7:00am, per Google) + llms.txt refresh
Astro `5.18.2`→`7.1.4` + `@astrojs/sitemap`→`3.7.3` in one commit. Clears the 3 Astro-attributable npm advisory groups (astro XSS/SSRF batch, bundled esbuild, js-yaml/postcss); audit drops 10→7 findings, remainder is postmark→axios + the `@netlify/functions` toolchain (tar/brace-expansion/svgo) + astro's own bundled sharp 0.34 (needs 0.35 upstream) — separate follow-ups, tracked in ../TODO.md.
**Key decision:** `compressHTML: true` added to astro.config.mjs. Astro 7 defaults to `'jsx'` whitespace stripping, which glued "Call(413) 594-8332." on /catering/quote (text and link on separate source lines). With `true`, a scripted per-element text diff of all 36 pages vs the v5 build showed zero inline-text changes.
**Sunday hours 6:30→7:00am** (open question in STATUS resolved): read the live GBP listing via Google Maps — Mon-Fri 6-2, Sat 6-1:30, Sun **7**-1. Ian's earlier dictated "Sat 6:30" was wrong; Sat 6:00 stands. Fixed in `restaurant.ts` (drives all Restaurant schema) + hard-coded copies in Footer, contact (incl. meta/OG), faq (visible + FAQPage schema), index x2, menu x2, and `public/llms.txt` (already existed; also added the /catering/quote link to it). Grep confirms zero `6:30` left in src.
Also: `typecheck` npm script (`astro check`, new devDeps `@astrojs/check` + `typescript`).
**Verified:** `astro check` 0 errors; build 36 pages; sitemap URL list byte-identical to v5; all JSON-LD parses (FAQ schema now says Sunday 7:00 AM); scripted glue-check across all 36 pages shows the ONLY text diffs are the intended hour strings; Playwright QA desktop 1280 + mobile 375 on /, /contact, /catering/quote — spacing correct, 0 console errors. Dry-run rehearsed first in C:\tmp\copperline-astro-upgrade-test.
**Revert:** `git revert <this sha>` (single commit; package-lock included).
**Gotcha for future sessions:** any new multi-line "text then inline element" markup is safe under `compressHTML: true`, but do NOT remove that config line without re-running the glue check.

---

### Session 28 — 2026-07-27 — PR #4 merged (quote builder live) + full security audit
Audited the quote builder and the whole site, then merged PR #4 as a merge commit (`33b10e1`; the 7 feature commits stay independently revertable). `npm run build` (36 pages) + `tsc --noEmit` clean; verified in `dist` that no `$` figure leaks onto `/catering` or the 25 town pages, `/catering/quote` is canonical + in the sitemap + not noindex, and the `catering-quote` Netlify form registered with all 29 fields (id `6a554f01121b750009f6cd80`, already picked up from PR deploy-previews).

**Quote-builder findings (all low-impact, none blocked merge):** estimate totals are client-computed and submitted in spoofable hidden fields — nil impact, it is a quote *request* not a transaction, staff re-quote before booking; no-JS submissions drop the entree checkboxes (they are intentionally name-less, serialized into `menu-selection` by JS only) — mitigated by the `<noscript>` "call us" copy; tax-on-service-charge math **confirmed correct by owner**.

**Site-wide security (all PRE-EXISTING, not introduced by PR #4):** HIGH — `netlify/functions/inbound-email.ts:263` auto-publishes specials to the live repo when `trusted && confidence>=85`, and `trusted` keys on the forgeable `From` header (`:82`,`:134`) with no SPF/DKIM check → a spoofed email can deface the homepage specials (bounded: output is escaped, so defacement/spam not code-exec). MEDIUM — no rate-limit/spend-cap on the inbound Claude-vision path; deploy secrets exposed to PR-triggered builds (`deploy.yml:6`, low real risk on a private solo repo, and it is what enables preview deploys). LOW — Basic-auth uses `===` not `timingSafeEqual`; Actions pinned to tags not SHAs. `npm audit` 10 advisories but **zero exploitable** against a static site (build-time toolchain / trusted-host runtime); astro 5→7 (TODO) clears the runtime-looking ones. JsonLd `</script>`+`<!--` escaping correct; no committed secrets; forms honeypotted.

**Security fixes shipped same session (`841cf09`):** closed the HIGH plus two lower items in `inbound-email.ts`. Auto-publish now requires `senderPassedAuth()` in addition to the allowlist: Postmark surfaces SpamAssassin results in `X-Spam-Tests`, and `DKIM_VALID_AU` (valid DKIM signature ALIGNED to the From domain) is the anti-spoof signal a forger cannot produce. `SPF_PASS` alone is deliberately NOT accepted (it authenticates the envelope, not the header From). **Fail-safe:** any unauthenticated message falls back to the existing manual YES-gate, whose UUID reply goes to the real From address, so a spoofer can never confirm and a legit send is never broken — only unattended publish is withheld for unverified mail. Also: Basic-auth check now `timingSafeEqual`; the public (unknown-sender) path gets a global 20/hr throttle before the vision call (fail-open, trusted senders + UUID confirmations exempt). Verified `tsc`+build clean; parsing logic unit-checked against real `X-Spam-Tests` strings incl. a substring-trap. On the next real specials email the function log prints `authed=<bool> (X-Spam-Tests=...)` — if a legit send logs `authed=false`, read the real tokens there and widen the accepted set (only to other author-aligned DKIM tokens; never bare `DKIM_VALID` or `SPF_PASS`).

**Item #1 (catering-quote notification) — DONE** by Ian in the Netlify dashboard.

**Still queued (not code-closable here):** deploy.yml PR-secret exposure (tradeoff — it enables preview deploys; low risk on a private solo repo); SHA-pin GitHub Actions; Astro 5→7 major (own verified pass, TODO). Verify: `npm run qa:docs` green. Revert: `git revert 841cf09` (security fix) / `33b10e1` (the merge).

---

### Session 27 — 2026-07-18 — docs consolidation + guardrails (portfolio cleanup arc)

`f268b1c` (this branch, rides PR #4): CLAUDE.md 487->133 lines (brief + credentials table), STATUS.md 521->23 lines (live-state pointer), the duplicated CLAUDE/STATUS session logs merged into THIS file (~18 dupes de-duped, ordering unscrambled, the two "Session 3" entries disambiguated, the Session-9 "PENDING DEPLOY" claim corrected to DEPLOYED `7579c2d`), audits -> `audits/`. `f2dfcdb`: stale-current-state check in scripts/lint-docs.mjs. `../TODO.md` purged of 12 done items and force-tracked in the claude-projects-ops repo (was under NO version control); the 3-MA-pages Request Indexing item tagged @ian (feeds the Mon+Thu Slack queue digest). Verify: `npm run qa:docs` green; todo-sync drift clean. Revert: `git revert f268b1c` / `f2dfcdb`. Note: all of this lands on master when PR #4 merges.

---

### Session 26 — 2026-07-13/14 — /catering/quote interactive quote builder (7 commits, PR #4 OPEN, NOT deployed)
Ian: "what would it take to rework the catering form to make it more interactive? i.e. they enter the specific package / options they want, optional upgrades / upcharges." Answer: the catering sections of `menuData.json` were ALREADY a configurator spec (5 fixed Buffet Packages, a choose-2-entrees Hot Item Buffet, 3 choose-3-entrees Specialty Buffets, upcharges written inline as "(+$2/pp)"), so this was a restructure, not a content job. The real question was the 2026-07-03 owner decision to strip pricing from /catering. **Ian's calls this session:** the builder lives on its own page behind the "Request a Quote" click (so anyone landing there is explicitly asking for prices); **index it** (targets "catering prices / quote" queries); show a **priced** estimate; and the choice-buffet UI must not "look like janky HTML." The lead email arrives fully itemized instead of as a paragraph of free text.

**Ships as PR #4** (branch `catering-quote-builder`, 7 commits, `ad474eb` to `c8ba9f7`). **Not merged, not deployed.**

- **[cateringPackages.ts](../src/data/cateringPackages.ts)** — typed model derived at build time from the 3 catering sections of menuData.json. Upcharges parsed out of the option names into real numbers (`Roast Sirloin (Carving +$3/pp)` becomes name + note + 3.00); choose-N limits explicit; the Hot Item Buffet's "two chicken, two beef/seafood, or one of each" rule modeled as ONE 2-pick entree group with chicken/beef sub-headings. **menuData.json stays the single source of truth for every price**, and the parser **throws at build time** on any upcharge string it cannot read rather than silently quoting $0. Also holds the builder-only display layer: `shorten()` ("with" to "w/"), `toInclude()` (splits "Cold Cuts (Roast Beef, Ham, Turkey)" into a bullet + sub-line), `POPULAR_IDS` (an owner call about what to push, deliberately NOT menuData's own `popular` markers, which drive /menu), and the `SERVICE_CHARGE_RATE` / `TAX_RATE` constants. **/menu renders unchanged.**
- **[CateringQuoteBuilder.astro](../src/components/CateringQuoteBuilder.astro) + [/catering/quote](../src/pages/catering/quote.astro)** — FIVE steps as ONE Netlify Form (`catering-quote`): info, event, pick a buffet, build your menu, estimate. **Picking a buffet opens that buffet's own build screen**, so nobody scrolls past nine packages to reach their dishes. Every input is in the static HTML because **Netlify registers a form's fields by parsing the deployed page and silently drops anything JS creates at runtime**. Non-selected package panels have their inputs `disabled`, so an abandoned buffet can never ride along in the submission.
- **Step 4 is an ordering UI, not a form** — dishes are selectable cards (a real checkbox/radio, visually hidden inside the label) with a check indicator, hover lift, and an upcharge pill; each course carries a live "2 of 3 picked" pill; at the limit the unpicked dishes fade with a "tap a picked dish to swap" hint; an **order-summary rail** fills in beside them (sticky on desktop, stacked on mobile where the fixed total bar takes over). Missing courses outline red and the error names what is short ("Still to pick: 1 more starch"). This replaced two rejected iterations: a checkbox grid ("text not aligned with the checkbox") and then `<select>` dropdowns ("still looks like janky HTML").
- **Priced estimate** — food subtotal, **15% service charge** on food, **7% MA meals tax** on food-plus-service, total. Rates live in cateringPackages.ts and reach the client as **data attributes** rather than pulling menuData.json into the browser bundle. Step 5 also reviews contact + event details with Edit buttons back to each step. Note: Ian's request to add service + tax contradicted his own requested disclaimer ("tax quoted separately"), so the disclaimer was reworded rather than shipped as a lie.
- **"Save as PDF"** — prints a real one-page quote sheet (logo, linked NAP, red CATERING ESTIMATE title, contact, event, menu, allergies/notes, priced breakdown, disclaimer) via a print stylesheet. **No PDF library, no bundle weight**; `document.title` is swapped during print so the file saves as "Copperline Eatery Catering Estimate.pdf". Verified by rendering through Chrome's real pagination (CSS `@page` + the browser's header/footer band): 1 page plain, still 1 page worst-case with allergies AND notes filled. (First pass shipped 2 pages because the Playwright check omitted the browser's own margins and header band; allergies + notes now print side by side.)
- **Entry points** — the "Request a Catering Quote" CTAs on /catering, the 25 town pages, the region hub, /faq, /menu#catering, and CateringMenus now go to /catering/quote (29 pages link it). /catering keeps its short free-text form, re-framed "Or Just Send Us a Note". /catering and every town page stay **price-free** (verified in dist). Sitemap 32 to 33 URLs; IndexNow updated; 36 pages build.
- **/catering polish (same PR)** — header says "Western MA" so "Mass" no longer orphans a line on a phone; CTA buttons moved above the lead (first screen at 390px and 1280px); lead + "Where We Cater" + "Events We've Catered" + the CateringMenus note shortened and centred at a 720px measure; How It Works puts the step number inline with its title.
- **Footer** — Explore split into Explore (Menu, Catering, Where We Cater) + a new **About** column (About, FAQ, Contact): 5 shorter columns instead of 4.
- **Thanks page** — now shows business hours, rendered from `OPENING_HOURS` so it cannot drift from the schema/footer NAP.

**Four CSS/DOM traps hit and fixed (all measured, none eyeballed):**
1. `body { overflow-x: hidden }` makes body a scroll container, which **silently breaks `position: sticky` for every descendant** sitewide. Switched to `overflow-x: clip` (clips without creating a scroll container). This is what broke both the fixed total bar and the summary rail.
2. `.quote-form fieldset { margin: 0 }` (0,1,1) **outranks a bare `.dish-group`** (0,1,0), so the 34px gap between courses computed to **exactly 0**. Needs the `.quote-form` prefix.
3. `.content-section h2` (0,1,1) **outranks `.print-title`** (0,1,0), which is why the PDF title kept printing in the dark blue-green instead of brand red.
4. A scripted CSS splice **silently deleted the `.review-*` rules**, which is why the estimate step rendered as unstyled text in Ian's screenshot. Restored.

**QA:** build (36 pages) + `tsc --noEmit` clean throughout; Playwright at 390px and 1280px drove the whole flow every round (no-package block, incomplete-course block, choose-2 limit greying out a third entree, package switch not leaking stale picks, `$15.95 + $2.00 scampi x 25 = $448.75`, `Choice Buffet #2 + $5 tenderloin x 60 = $1,377 food + $206.55 service + $110.85 tax = $1,694.40`, below-minimum warning, exact POST payload via FormData); 0 console errors, 0 horizontal overflow, 44-52px tap targets, every choice group a `fieldset` + `legend` with an `aria-live` counter. The PDF was verified as a rendered PDF, not as markup.

**Revert:** `git revert` any of the 7 commits independently; the 3 new files are additive.

**BLOCKING follow-up for Ian, after merge:** add the email notification for the new **`catering-quote`** Netlify form (Forms, then catering-quote, then notifications). It is a **separate form** from `catering-inquiry`, and form notifications are dashboard-only (no API op exists, confirmed Session 23), so without it the leads pool unseen exactly as they did before Session 23.

**Open question for Ian:** he asked the thanks page to read "Saturday: 6:30 AM" and "Sunday: 7:00 AM", but `restaurant.ts` (and therefore the Restaurant schema, footer, and contact page) says **Sat 6:00am-1:30pm / Sun 6:30am-1:00pm**. Rendered the real hours rather than create a NAP inconsistency on one page. Ian is checking whether Sunday actually opens at 7am; if the hours did change it is a one-line fix in `restaurant.ts` that propagates everywhere.

### Session 25 — 2026-07-07 — SEO audit + fix wave (meta trims, webp re-encode, FAQ a11y, footer link, /seo-audit command)
Ian asked for an SEO audit ("I thought there was a skill but I can't find it" — there wasn't; one now exists) then "do all of this now."

- **Audit first** (report at [audits/AUDIT-SEO-2026-07-07.md](../audits/AUDIT-SEO-2026-07-07.md), delta vs the 7/03 growth audit): 29/32 indexed — all 5 CT pages indexed within 24h of the S24 deploy; the 3 new MA pages (hadley/monson/southwick) are "URL is unknown to Google" → **Ian: re-run Request Indexing on those 3**. Technical stack all green; Lighthouse mobile /catering 96 + enfield-ct 97, a11y 100, SEO 100. GSC 28d: 441c/9,003i (dip vs prior 533c reads seasonal; position stable); http homepage row still carries 320 of 441 clicks (citation task unchanged as #1 lever).
- **F1/F2 meta trims:** titles + descriptions on the 6 core pages ([index](../src/pages/index.astro), [menu](../src/pages/menu.astro), [catering](../src/pages/catering.astro), [about](../src/pages/about.astro), [contact](../src/pages/contact.astro), [faq](../src/pages/faq.astro)) trimmed to ≤65-char titles / ≤170-char descriptions (menu title was 117 chars, home desc 265). [western-massachusetts](../src/pages/catering/western-massachusetts.astro) title now "Western Mass & Northern CT Catering" (page has listed CT since S24). The [[town].astro](../src/pages/catering/[town].astro) description template tightened (was emitting 216-226, now ≤170 for the longest town names). Keywords kept: brunch stays in the home title (7/03 S3 win), eggs benedict/corned beef hash stay in the menu description.
- **F3 image re-encode:** 8 oversized `public/towns/*.webp` re-encoded via sharp (scratchpad, not a repo dep) so every webp is now smaller than its jpg fallback (the 5 S24 CT webp were LARGER than their jpgs, e.g. suffield 207KB→145KB); east-longmeadow-ma.jpg 348KB→311KB (portrait outlier). Quality q62-72, eyeballed OK.
- **F4 + a11y:** Footer "Explore" gains a **Where We Cater** link → /catering/western-massachusetts (town cluster now linked sitewide, was only reachable via /catering). The 7/03 audit's S6 item finally fixed: `.faq-item a` + `.faq-a a` in [global.css](../src/styles/global.css) get underlines (link-in-text-block, color-only links).
- **`/seo-audit` slash command** ([.claude/commands/seo-audit.md](../.claude/commands/seo-audit.md)) + two repo scripts: [scripts/gsc-analytics.py](../scripts/gsc-analytics.py) (28d-vs-prior GSC pull: totals, branded split, catering queries, town pages, http-vs-https check; shared ~/.gsc OAuth, gsc venv) and [scripts/seo-crawl.mjs](../scripts/seo-crawl.mjs) (zero-dep live crawl lint of every sitemap URL). Index-status reuses HGC's `scripts/gsc-index-status.py` with the copperline host arg.

**QA:** build clean (35 pages); dist-wide lint: all titles ≤65 + descriptions ≤170, 0 em/en dashes, footer link on all 32 pages, both underline rules in the CSS bundle. **Revert:** `git revert <this commit>`. Shipped via PR (direct master push is classifier-gated for docs+code sessions now; PR #2 carried the audit doc). Merged by Ian 2026-07-07 as `c511da2` (PR #3); prod deploy green + spot-checked live.

### Session 24 — 2026-07-07 — /catering restructure + 8 new service-area towns incl. northern Connecticut (single commit, DEPLOYED)
Ian's asks: (1) remove the massive photo on /catering, (2) make "Where We Cater" more visible when clicking Catering, (3) add more cities/towns, with CT explicitly fair game within 30-45 min of Chicopee.

- **/catering restructure ([catering.astro](../src/pages/catering.astro)):** the full-width `catering-hero-media` breakfast photo removed (image files stay in `public/` — still the og:image everywhere); orphaned CSS dropped from global.css. "Where We Cater" moved from below the inquiry form (second-to-last section) to directly under the top CTA row — Playwright-measured at y=770/844 viewport @390px and y=522/900 @1280px, so it's on the first screen. Section order now: lead → CTAs → Where We Cater → What We Cater → How It Works → Events → form → CTA box.
- **8 new towns in [serviceAreas.ts](../src/data/serviceAreas.ts)** (now 25 entries): Southwick, Monson, Hadley (MA) + **Enfield, Suffield, Windsor Locks, East Windsor, Somers (CT)**. Interface extended: `state: 'MA' | 'CT'`, county union adds Hartford/Tolland County. Each entry follows the Session-21 quality bar: distinct food/events headings + blurbs (airport-corridor meeting food for Windsor Locks, CT-side office breakfasts for Enfield, brunch-milestones for Suffield, hall buffets for East Windsor/Broad Brook, lake-season trays for Southwick...), menu-verified dishes, honest drive times (20-30 min), real neighborhoods (Thompsonville/Hazardville, Broad Brook/Warehouse Point, Somersville, West Suffield, North Hadley).
- **Photos:** all 8 from Wikimedia Commons, license-checked via the API (all John Phelan; CC BY 3.0/4.0 + BY-SA 3.0/4.0), downloaded at 1280px and resized to 1000px jpg+webp via sharp (scratchpad pipeline; sharp is NOT a repo dep). Credit lines render on-page as before.
- **Venues:** every URL curl-fetched + keyword-verified. Notable rejects: `westviewfarmscreamery.com` is **domain-hijacked (casino spam)**, `norcrossws.org` is a GoDaddy parked page, fourtownfair.com/shallowbrook/powder-hollow dead or suspicious — all dropped. `hadleyfarmsmeetinghouse.com` is 403-bot-walled but content-matched (included per the S21 institutional-403 precedent). CT State Asnuntuck lives at `ctstate.edu/asnuntuck` (asnuntuck.edu DNS is dead).
- **State-awareness ([catering/[town].astro](../src/pages/catering/[town].astro)):** title/description/H1/breadcrumb/og/twitter/schema all use `area.state` + a `stateName` for the FoodEstablishment description; MA pages byte-compatible with before.
- **CT surfaced everywhere:** "Northern Connecticut" pill group (5 towns) on /catering + [western-massachusetts.astro](../src/pages/catering/western-massachusetts.astro) (its "just over the Connecticut line?" escape line reworded since we now HAVE CT pages); /catering FAQPage areas answer, meta description, lead + CTA-box note; /faq visible + schema catering answers; `AREA_SERVED` in restaurant.ts adds Enfield + Northern Connecticut; llms.txt Serves list (also fixed two stale llms.txt lines while there: takeout "15-20 minutes" → "under 30 minutes" to match the S20-fu3 claim, and removed the "Hot Item Buffets" jargon killed in S20-fu2).
- **Infra:** deploy.yml IndexNow list 24 → 32 URLs; sitemap auto-includes (32 URLs); 35 pages build (was 27).

**QA:** `npm run build` clean (35 pages) + `npx tsc --noEmit` clean; JSON-LD parses on all 8 new pages; zero em/en dashes in new copy; Playwright @390px (hub + Enfield + portrait-photo Southwick: 0 overflow, webp loads, 3 equal CTA buttons, sensible nearby cross-links Enfield→Windsor Locks/Suffield/Longmeadow/East Windsor) + @1280px (hub above-the-fold check, nav active state). **Revert:** `git revert <this commit>` (single commit; town photos are additive files).

**Post-deploy note for Ian:** the 8 new pages will get IndexNow-pinged automatically; GSC "Request Indexing" for the 5 CT pages is the optional accelerant.

### Session 23 — 2026-07-06 — catering-inquiry email notification wired + first 2 real leads surfaced (no code change)
The `catering-inquiry` Netlify form had been live and verified since Session 20 but the **email notification was never configured**, so submissions were pooling unseen in the Netlify dashboard (the standing @high TODO). Two real leads had in fact already arrived the same day — a ~50-guest bridal-shower brunch in Agawam (2026-08-29) and a ~125-175-guest jack-and-jill in Ludlow (2027-01-16, food drop-off) — both retrieved from the Netlify Forms API and handed to Ian directly. **Lead contact PII is not stored in this repo; the record of record is Netlify Forms** (form id `6a48646ca2800e00083d0e58`, siteId `73d0a21f-de9d-4486-b941-dda11f320c7f`).

Ian configured the notification himself in the Netlify dashboard (Forms → catering-inquiry → notifications; dashboard-only — no Netlify API/MCP op exists for form notifications, confirmed). Future submissions now email automatically. Offered but declined: a `submission-created` Netlify Function firing Postmark (would remove the dashboard dependency) — available if the dashboard notification ever proves unreliable. No repo change this session; TODO.md top @high item closed.

### Session 22 — 2026-07-04 — Amherst copy fix + full copy sweep + GSC link-profile analysis (commit `f4ef51d`, DEPLOYED)
Ian flagged the Amherst heading "Menus That Respect a Mixed Table" as potentially reading racist. It was meant as mixed *dietary* needs but the double meaning is real: replaced with "Menus With Real Vegetarian Options" and the blurb now opens "College-town events" instead of "Amherst events always seat...". Swept all 17 towns' intros/headings/blurbs + both page templates for other double-meaning phrasing (grep for loaded terms + manual read): clean. Prod-verified. Revert: `git revert f4ef51d`.

Also analyzed Ian's GSC "More sample links" export (2026-07-04, ~180 URLs) into a new snapshot section in [BACKLINK-OUTREACH.md](../BACKLINK-OUTREACH.md): the link profile is almost entirely programmatic directories (Waze/Wanderlog locale variants, YP network, Seniorly widgets, Sirved, MapQuest); real editorial links are only MassLive (2016), offbeateats (2018), thebostondaybook, funinnewengland, The Q 99.7 — confirming Tier 1/2 outreach is the upside. Export also confirms the Nextdoor page and an Apple Maps place record exist unclaimed, and the "Broadway St" NAP variant lives in Waze URLs too. Doc QA: removed stale per-person pricing from the Tier 2 venue email template + the "pricing in HTML" line (pricing was scrapped 2026-07-03).

### Session 21 — 2026-07-04 — town-page content variety + 59 more verified links (commit `cb5e82e`, DEPLOYED)
Ian: 8-10 links per page, more customizable, and "shouldn't look like copy paste!!"
- **De-templated the 17 town pages.** New per-town fields in [serviceAreas.ts](../src/data/serviceAreas.ts): `foodHeading/foodBlurb/dishes` (menu-verified dishes with a town-specific angle: corporate breakfast trays for Springfield, hot chafing-dish buffets for Holyoke, graduation/backyard food for Agawam, brunch-for-showers for South Hadley, vegetarian-aware menus for Amherst, office lunches for East Longmeadow...), `eventsHeading/eventsBlurb/eventTypes`, and a layout `variant`. Variant 'a' leads with venues, 'b' leads with food and flips the hero photo left on desktop. Verified in dist: 17/17 pages have distinct heading-triples. Shared `CateringMenus` + the identical events cards were removed from town pages (still on hub + region). Dishes/events render as chips. Copy is recommendation-framed (what fits the town), not invented order history.
- **+59 URL-verified venue links** (three curl+keyword batches; dead candidates dropped; anti-bot 403/406s on official town/library/mass.gov institutional sites included by authority per the established precedent). Per-page link counts now: Springfield/Holyoke/Northampton 10, Amherst 9, Westfield/South Hadley/Longmeadow 8, West Springfield 7, Agawam/Easthampton/Wilbraham/Palmer/Belchertown 6, Granby/Hampden 5, Ludlow/East Longmeadow 4 — small towns capped honestly rather than padded with junk. Every venue list + all copy are plain one-line-editable fields in serviceAreas.ts.
- QA: build 27 pages + tsc clean, dash-clean, Playwright 390px (variant b) + 1280px flip check, prod curl-verified (distinct first-h2 per town, venue counts live). Revert: `git revert cb5e82e`.

### Session 20 follow-up #3 — 2026-07-03 (same day) — local-page polish round 2 + honest-copy fixes (commit `bb564dc`, DEPLOYED)
From Ian's second mobile review: (1) town facts strip reworked from ragged 2+1 flex cards to ONE card with divided label/value rows; (2) CTA row is now 3 equal buttons in a single row at every width: "Catering Quote" (renamed per Ian, mentions catering) + "Call Us" + new "Get Directions" (Google Maps directions to 409 Broadway); (3) Wikimedia photo credit moved from under the photo to a small line at the page bottom (still license-compliant); (4) **+21 URL-verified venues** across the towns (West Springfield went 1→3 with Storrowton Village + Springfield Country Club; added MGM Springfield, The Log Cabin, GreatHorse, Steaming Tender, MacDuffie, Hotel Northampton, Hampshire College, country clubs, libraries — every URL fetched + content-checked, dead candidates dropped); (5) homepage takeout claim "15-20 minutes" → "under 30 minutes" (also /faq visible + schema); (6) "hearty dinner plates" removed from the homepage lunch blurb and /menu lunch intro ("homemade soups" instead) since there's no dinner service — the menu's actual "Dinners" section (dinner-style plates served during open hours) is untouched. QA: build+tsc clean, Playwright 390px (3 buttons 105px each in one row, 0 overflow), prod curl-verified. Revert: `git revert bb564dc`.

### Session 20 follow-up #2 — 2026-07-03 (same day) — pricing scrapped per owner + self-audit pass (commit `ad872b8`, DEPLOYED)
Ian: "scrap the catering buffet pricing (irrelevant for a diner/brunch)" + "full audit of both updates... handle everything."
- **Pricing removed everywhere except the actual menu**: `CateringPackages.astro` deleted; new [CateringMenus.astro](../src/components/CateringMenus.astro) "What We Cater" block (breakfast/lunch/dinner highlights, every dish verified against menuData; no prices, "custom menu, request a quote" framing). Stripped $-figures from /catering + all 17 town pages + region page (meta/og/twitter/JSON-LD/FAQPage/facts strip/cta notes), the /faq catering answers, and llms.txt. The /menu Catering tab deliberately keeps the printed menu with prices (it IS the menu). Town facts strip now shows "Google rating 4.5★ 1,100+ reviews" instead of a from-price.
- **Self-audit findings, all fixed**: (a) nav never highlighted Catering on `/catering/*` subpages (`isActive` exact-match; now prefix-aware); (b) the Service/Cuisine/Meal-Styles card row became redundant with What We Cater → replaced by a numbered 3-step "How It Works"; (c) "Hot Item Buffet (40-person minimum)" jargon removed from booking FAQs on both /catering and /faq; (d) hub/town/region titles trimmed to SERP width (`Catering in {town}, MA | The Copperline Eatery`).
- **QA**: build 27 pages + tsc clean; zero price strings outside /menu in dist; JSON-LD parses on all changed pages; Playwright at 390px + 1280px across hub, portrait-photo town (Hampden), homepage, thanks page, /menu#catering; local Lighthouse: /catering 98/100/77/100, town page 97/100/77/100 (BP 77 = the documented GA4/Clarity third-party-cookie penalty). Prod curl-verified post-deploy: 0 price mentions on catering pages/faq/llms.txt, menu intact, nav active state live. Revert: `git revert ad872b8`.

### Session 20 follow-up — 2026-07-03 (same day) — polish pass from Ian's mobile review (commit `e08e6dd`, DEPLOYED)
Ian flagged 4 issues from his phone; all fixed + live:
1. **Town pages redesigned** ("super janky / AI-written"): each of the 17 pages now opens with a real town photo (Wikimedia Commons, free licenses, per-photo credit line rendered on-page; fetched/license-checked via `scratchpad/town_photos.mjs` pipeline), a facts strip (drive time / from-price / service options), rewritten varied per-town copy (formulaic openers killed; unverifiable "our regular orders" claims softened to capability framing), and an "Around {town}" block of **30+ real institutions with outbound links, every URL fetched + content-verified** (dead ones dropped: Storrowton Tavern, Ludlow CC; West Springfield town site bot-walled, skipped). Nearby towns render as pills.
2. **iOS form bug**: the Event Date input jutted off the card on iPhone (iOS date inputs have intrinsic width inside grid). Fix: `min-width: 0` on `.form-field` + `appearance: none` on `input[type=date]`.
3. **Catering hub polish**: long paragraphs left-aligned (were fully centered), CTA buttons equal-width, package cards content-height (`align-items: start` kills the empty-bottom stretch), and the 18-link "Catering in X, MA" wall replaced with town-name pills (also de-spams the repeated exact-match anchors).
4. **/menu Catering tab** now carries a "Request a Catering Quote" button + a quote link in the legend, both to `/catering#catering-inquiry`.
QA: build 27 pages + tsc clean; Playwright 390px (0 overflow, date input inside card) + 1280px; dash lint clean. Revert: `git revert e08e6dd`.

### Session 20 — 2026-07-03 (same day as the Session 19 audit; executes its ship-now items per Ian's answers)
**Catering growth build: /catering rebuilt as a real landing page + 18 service-area pages + Netlify inquiry form + brunch/lunch tuning + GEO hardening. 27 pages now build (was 9).**

**Ian's scope answers:** no reservations (audit item I1 dropped); maximize geo coverage; no ezCater; use review images where possible (see photo note below); add backlinks where possible.

- **/menu#catering tab bug fixed ([main.ts](../src/scripts/main.ts)):** initial-load hash handling only recognized `#specials`, so anyone landing on `/menu#catering` (or `#lunch`) saw the Breakfast tab. Generalized to activate any tab named by the hash. Playwright-verified: `/menu#catering` activates the Catering tab with all 3 sections rendered.
- **/catering rebuilt ([catering.astro](../src/pages/catering.astro)):** packages + per-person pricing as HTML via new `CateringPackages.astro` (deleted in S20 follow-up #2 when pricing was scrapped; renders from `menuData.json` so prices can't drift from /menu or the PDFs); catering-specific FAQPage JSON-LD (incl. a pricing Q&A); photo (`public/catering-breakfast.{jpg,webp}` — the one owner-authored photo on the Google listing, fetched via Places API, resized via sharp); **Netlify Forms inquiry form** (`catering-inquiry`: name/phone/email/date/guests/type/town/notes, honeypot, posts to new noindex [catering-thanks.astro](../src/pages/catering-thanks.astro), GA4 `catering_inquiry_submit` event in main.ts). CSP already had `form-action 'self'`. **Deploy gotcha found + fixed live:** Netlify now ships form detection DISABLED by default — the first deploy's form POST 404'd. Enabled forms via the Netlify MCP (`update-forms`), empty-commit redeployed (`1881e4c`), and verified end-to-end: form registered with all 9 fields + honeypot, test POST returned 200, submission visible via API, test submission deleted. **Remaining Ian action: add an email notification** (Netlify dashboard → Forms → catering-inquiry → notifications; dashboard-only, no API op) or leads pool unseen.
- **18 service-area pages:** new [serviceAreas.ts](../src/data/serviceAreas.ts) registry (17 towns: Springfield, Holyoke, West Springfield, Agawam, Westfield, Ludlow, South Hadley, Granby, Easthampton, Northampton, Longmeadow, East Longmeadow, Wilbraham, Palmer, Belchertown, Amherst, Hampden — each with reviewed drive-time + true local context + neighborhoods) → dynamic [catering/[town].astro](../src/pages/catering/[town].astro) + a [western-massachusetts](../src/pages/catering/western-massachusetts.astro) region hub. Each page: unique intro/local copy, shared packages block, FoodEstablishment schema with per-town `areaServed`, breadcrumbs, closest-4 nearby cross-links. Hub links on /catering. Facts kept to offer-framing + geography; no invented past-event claims. Chicopee itself deliberately has no town page (/catering is the Chicopee page).
- **Brunch/lunch tuning ([index.astro](../src/pages/index.astro)):** title/H1 now "Best Breakfast, Brunch & Lunch…" + "Walk-ins welcome" (targets the zero-CTR pos-6.7 "best brunch spots near me" from the audit); new lunch section (Reuben/grinders/soups, all menu-verified) linking /menu#lunch.
- **GEO:** [public/llms.txt](../public/llms.txt) (facts + catering pricing + page index) + explicit AI-crawler allows in [robots.txt](../public/robots.txt) (GPTBot/ClaudeBot/PerplexityBot/OAI-SearchBot/Google-Extended/Applebot-Extended/CCBot).
- **Data fixes:** FAQ buffet price corrected $12.95→$13.95 (menuData is source of truth); `AGGREGATE_RATING.reviewCount` 1119→1130 (Google exact 1,106 via Places API 2026-07-03 + TA ~24; re-check quarterly); FAQ in-text links underlined (closes the Session-19 a11y 96 on /faq).
- **Infra:** sitemap auto-includes the 18 new pages (24 URLs; catering-thanks excluded in astro.config); deploy.yml IndexNow list extended to all 24.
- **Photo rights note:** Ian asked for review photos; customer Google-review photos are the reviewers' copyright, so only the owner-authored listing photo was used. FB page photos are login-walled at usable resolution. The unblock is Dad exporting from FB Page admin / GBP dashboard (TODO @high).
- **GBP finding:** Places API shows `primaryTypeDisplayName: "Breakfast Restaurant"` — the long-standing (DAD) category task was already done; checked off in ../TODO.md. The "breakfast near me" pack absence is therefore proximity/engagement, not category — remaining GBP levers are photos, catering services section, posts, reviews.
- **[BACKLINK-OUTREACH.md](../BACKLINK-OUTREACH.md):** staged Tier 1-3 citation/backlink actions (Macaroni KID pitch, Nextdoor claim, Bing Places, Apple Business Connect, venue preferred-caterer email template) — all need a human sender.

**QA:** `npm run build` clean (27 pages), `npx tsc --noEmit` clean, JSON-LD parses on all new pages, sitemap 24 URLs, no new em/en dashes, form attrs verified in dist, Playwright at 390px + 1280px (no overflow; form, packages, service-area lists, lunch section all render), /menu#catering tab activation verified.

**Revert:** `git revert <this commit>` (single commit). New pages/data/CSS are additive; the catering.astro rewrite is the only replaced surface, restored by the revert.

### Session 19 — 2026-07-03
**Full growth audit (SEO + GEO + local pack + off-site), analysis-only — report at [audits/AUDIT-GROWTH-2026-07-03.md](../audits/AUDIT-GROWTH-2026-07-03.md). No code/content changes.**

Baseline captured (Lighthouse mobile 97-100 all routes, LCP ≤1.9s, CLS ~0; PSI API still keyless-blocked 429). GSC 90d: 1,469 clicks / 26,180 impr; non-branded only 128 clicks on 8,759 impr. Real local-pack checks via DataForSEO (Chicopee geo, $0.02): **pack #1 for "brunch chicopee ma", pack #3 "breakfast chicopee ma", ABSENT from "breakfast near me" pack** (despite organic #1 there — GBP category/relevance problem, quantifies the existing DAD GBP task), and **invisible for "catering chicopee ma"** (no pack, no top-20 organic, AI Overview present) while already organic #1 for "breakfast catering near me". Top ship-now finding: rebuild /catering into a real landing page (pricing as HTML — it already exists on /faq but not /catering, menu HTML, Netlify Forms inquiry, FAQ schema, photos) + 3 town catering pages. Known issues verified: http→https + .html canonicals resolved code-side but the http homepage GSC row still carries 75% of branded clicks (citations to https remains the DAD accelerant); /about perf regression was single-run noise (re-run 99). TAG-repurpose verdict: don't port the engine; the LP-builder two-phase pattern + deterministic lint gates are the transferable pieces. New reusable tooling in session scratchpad: GSC search-analytics miner + DataForSEO local-pack checker (both read-only, reusable next re-measure ~2026-08-15).

### Session 18 — 2026-06-27
**GSC index-status audit: all 6 sitemap URLs submitted and indexed. Trailing-slash homepage investigation: no fix needed.**

Ran `theautomationsguide/gsc-index-status.py https://copperlineeatery.com` against `sc-domain:copperlineeatery.com`. All 6 URLs PASS (Submitted and indexed): `/`, `/about`, `/catering`, `/contact`, `/faq`, `/menu`. Last crawl dates current.

Investigated the trailing-slash homepage question (GSC sometimes shows `https://copperlineeatery.com/` as "not indexed" separately from the canonical `https://copperlineeatery.com`). Confirmed: `trailingSlash: 'never'` is set in `astro.config.mjs`, canonical + sitemap both use the slashless form, and `/` returns 200 without redirect (HTTP treats both forms as path `/` — a server-side 301 between them is not possible). GSC treating the slash form as "not indexed" is correct behavior: Google is honoring the canonical and indexing only the canonical URL. No code change needed.

### Session 17 — 2026-06-27
**YES-reply fix: first-line intent detection + resilient batchMatch + routing log -- commit `c541953`, deployed to copperlineeatery.com. Confirmed working (Ian tested live).**

**Root cause:** `YES_PATTERN` tested the full stripped body, not just the reviewer's typed text. `stripEmailQuoting` removes `>` quote lines, "On...wrote:" blocks, and `-- ` sig delimiters -- but a bare email signature (name/org on a new line, no `-- ` prefix) survived stripping. So Ian's reply body was `"YES\nIan Chamberland\n..."` which didn't match the strict pattern that requires the entire body to be a YES variant. It fell through to `applyCorrections`, the AI returned the same specials unchanged, a new batch was created, and the reviewer got back the same specials email with "Reply YES to publish" (nothing was published).

**Fix 1 -- first-line detection (`handleConfirmationReply`):** YES/NO is now tested against only the first non-empty line of the stripped body (`body.split('\n').map(l => l.trim()).find(l => l.length > 0)`). The full body is still passed to `applyCorrections` when neither YES nor NO is on line 1 -- correction instructions spanning multiple lines still work.

**Fix 2 -- resilient `batchMatch` regex:** Changed `/<batch-([a-f0-9-]+)@/i` to `/<?\s*batch-([a-f0-9-]+)@/i` so it also matches if an intermediate mail server strips the leading `<` from the `In-Reply-To` header value.

**Fix 3 -- routing log:** Added `console.log` at entry: `Routing: sender=..., inReplyTo=..., batchMatch=..., trusted=...` and `First line for intent detection: "..."` to make future failures diagnosable from Netlify function logs without a code change.

**Revert:** `git revert c541953 && git push origin master`.

### Session 16 — 2026-06-26
**CSP `blob:` fix -- photo preview now renders on `/submit-specials` -- commit `8b19427`, deployed to copperlineeatery.com.**

**Root cause:** `URL.createObjectURL(file)` returns a `blob:https://copperlineeatery.com/...` URL. The `Content-Security-Policy` in `netlify.toml` listed `img-src 'self' data: ...` but was missing `blob:`. Every browser silently refused to load the preview `<img>` against that policy -- the upload-preview div showed up but the image itself never rendered. The `data:` entry already present was not sufficient; blob URLs are a distinct scheme.

**Fix (`netlify.toml`):** Added `blob:` to the `img-src` directive: `img-src 'self' data: blob: ...`. `blob:` URLs for images are same-origin by definition (the browser generates them from local file data; they cannot point to any external resource), so this does not widen the effective attack surface.

**Revert:** `git revert 8b19427 && git push origin master`.

### Session 15 — 2026-06-26
**Gmail threading fix (unique subject per submission) + low-count warning + photo composition tip -- commit `9f1fe03`, deployed to copperlineeatery.com.**

**Root cause A -- Gmail threading collapse:** Both reviewer emails had the identical static subject `'Specials Submission — Review Required'`. Gmail threaded them together and collapsed the second email's body behind the "..." expander. The reviewer only saw the first email's specials. The second email's body (the newer submission) was invisible unless the reviewer clicked to expand. This was not a code bug in the extraction logic -- the vision model correctly extracted 8 items from Email 1 and correctly extracted only the 2-3 visible items from Email 2. The threading was the display issue.

**Root cause B -- partial board photo:** Email 2's photo showed only the bottom-right corner of the specials board (visible text: "SWEET PO..." and "FRESH FR..."). The AI extracted only what was legible -- not an extraction failure. The reviewer would have caught this visually in the email, but the subject collapse meant they didn't see the email body at all.

**Fix 1 -- unique subject per submission (`inbound-email.ts`):** Reviewer email subject changed from the static string to `Specials Submission -- N items -- Review Required` (e.g. "Specials Submission -- 8 items -- Review Required"). Each submission now produces a distinct Gmail thread. Item count is also useful context for the reviewer at a glance.

**Fix 2 -- low-count warning in reviewer email (`inbound-email.ts`):** When ≤3 items are extracted, the email body now includes: `⚠️ Only N item(s) extracted -- the photo may not show the full board. Check the image above before publishing.` This prompts the reviewer to inspect the attached photo before publishing, catching partial-board submissions before they go live.

**Fix 3 -- photo composition tip on upload form (`src/pages/submit-specials.astro`):** Added a third line of text in the upload placeholder: `"Tip: make sure the entire board is in frame"` (styled `.upload-tip`, 0.78rem italic in `var(--tan)`). Visible before any photo is selected, on both mobile and desktop.

**Build verification:** `npm run build` clean (8 pages, 0 warnings), `npx tsc --noEmit --strict` clean/silent.

**Commit on master:** `9f1fe03` (fix(specials): unique email subject per submission + low-count warning + photo tip). Deployed green. Revert: `git revert 9f1fe03 && git push origin master`.

### Session 14 — 2026-06-26
**Crowd-source specials pipeline — Option A (open email gate) + Option B (web upload form) — shipped in two commits; deployed to copperlineeatery.com.**

**Option A — open email gate (rewritten `netlify/functions/inbound-email.ts`):** Unknown senders (not in `ALLOWED_SENDER_EMAILS`) no longer get a 400 or a silent drop. Their photos run through Claude vision and are stored as a pending batch with `reviewerMode: true`; `sendDirectEmail()` fires a Postmark email directly to `REVIEWER_EMAILS` (comma-separated env var, defaulting to `ian@homegrowngrowth.co,copperlineeatery@yahoo.com`) with a YES/NO prompt. The batch UUID is embedded in the `Message-ID` header so the reviewer's YES reply threads back through `inbound-email.ts` exactly like a trusted-sender confirmation. First reviewer to reply YES publishes; second gets the "already published" message. Trusted senders get the existing YES-gate — except at ≥85% confidence (configurable via `AUTO_PUBLISH_THRESHOLD` env var, default 85) they auto-publish without a YES prompt.

**New shared lib (`netlify/functions/lib/specials.ts`):** Extracted vision extraction + JSON parsing from `inbound-email.ts` so `submit-specials.ts` could reuse it without duplication. Exports `extractSpecialsFromImage()`, `parseExtractionResult()`, `VISION_MODEL`, `PENDING_STORE`, `ALLOWED_IMAGE_TYPES`, `MAX_IMAGE_BYTES`, `Special`, `ExtractionResult`. Vision prompt now requests a `confidence` field (0-100) alongside the specials array; the model rates image clarity, text readability, and whether it clearly shows a specials board.

**Option B — web form (`netlify/functions/submit-specials.ts` + `src/pages/submit-specials.astro`):** Customer-facing upload form at `/submit-specials` (noindex, excluded from sitemap, not linked from nav/footer — discoverable via QR code near the specials board). No PIN. Accepts `multipart/form-data` via Web API `Request.formData()` (no extra npm dep). IP rate-limited at 5 submissions/hour via Netlify Blobs store `submit-ratelimit`. After vision extraction, sends reviewer email with `Message-ID: <batch-{uuid}@copperlineeatery.com>` so the YES reply resolves via the normal confirmation flow. UI: three-step how-it-works strip (photo → AI reads → we publish), dashed upload area with image preview (`URL.createObjectURL()`), optional note field, disabled submit until photo selected, success state with "View the Menu" CTA.

**Mobile bug (commit `aad826a`):** `capture="environment"` forces the camera open directly on iOS/Android — camera roll is inaccessible. Desktop ignores the attribute. User reported: "can only take a new photo on mobile, but the upload button works on desktop." Fix: removed `capture="environment"`, left only `accept="image/*"` which shows the standard action sheet (Take Photo + Choose from Library + Browse Files).

**TypeScript notes:** Netlify esbuild resolves `.ts` imports without extensions — `./lib/specials` works fine despite `--moduleResolution NodeNext` complaints from bare `tsc`. Correct flag for this bundler context is `--moduleResolution bundler` (confirmed clean). Explicit `(s: Special, i: number)` annotations needed on one `.map()` call inside an array literal.

**env vars added to Netlify:** `REVIEWER_EMAILS=ian@homegrowngrowth.co,copperlineeatery@yahoo.com`, `AUTO_PUBLISH_THRESHOLD=85`. Documented in `.env.example`.

**Commits on master:** `a95760c` (feat: crowd-source specials via open email gate + web upload form) → `aad826a` (fix: remove capture=environment so mobile users can pick from library). Both deployed green. Revert: `git revert aad826a && git revert a95760c && git push origin master`.

**QA note for staff:** anyone can now email `specials@parse.copperlineeatery.com` (or use the `/submit-specials` form) to submit a photo. Trusted senders (in `ALLOWED_SENDER_EMAILS`) continue to get the direct YES-gate or auto-publish. All other submissions land in the reviewer inbox for approval before the site updates.

### Session 13 — 2026-06-22
**Full four-dimension audit (accessibility + security + code + SEO/content/schema delta) — 8 fixes shipped in one commit; 2 items reported for Ian's call.** Report refreshed at `audits/copperline_audit_report.md`. No critical defects, no security exposure.

**Accessibility (the dimension prior audits skimmed) — all fixed, `/menu` axe 93 → 100:** (1) menu-tab keyboard trap — roving `tabindex` had no arrow handler, so keyboard users couldn't switch to Lunch/Catering/Specials; added Arrow/Home/End handler in `main.ts` (ARIA Tabs APG, auto-activation), verified in headless browser. (2) mobile-menu toggle `aria-expanded` never updated + no `aria-controls` — fixed in `main.ts` + `Nav.astro`. (3) tap targets <24px (nav social icons, carousel dots, footer Contact links) → 24px hit areas in `global.css` (dots keep 8px visual via `padding`+`background-clip:content-box`). (4) Download-menu buttons label/name mismatch (WCAG 2.5.3) → `aria-label` now contains visible "Download Menu" text + stays unique. (5) colour-only in-text `tel:` link in menu-legend → underlined.

**Perf — one reproducible CWV regression fixed:** `/menu` CLS **0.296 → 0.001** (perf 83 → 98). Confirmed via the browser LayoutShift API that self-hosted Oswald/Merriweather (`font-display:swap`, no preload) reflowed the text-dense menu page ~35-40px on swap. Fix: preload Oswald 700/600 + Merriweather 400 via hash-stable `@fontsource/.../files/*.woff2?url` imports in `BaseLayout.astro` (Vite dedupes — still 7 woff2). Home/about unchanged 99/100. (Home's one-off 75 reading was noise; re-measured 99/LCP 1.7s.)

**Responsive bug (pre-existing on prod, also fixed):** the hamburger toggle was clipped off the right edge on phones ≤ ~385px (single nowrap header row: logo + 5 social icons + DoorDash + toggle overflowed). Fixed by hiding the redundant Facebook/Instagram icons in the mobile header (≤640px; both remain in the footer) + trimming `.header-actions`/`.social-icons` gaps. Now fits to ~330px; kept the actionable phone/email/directions icons at 24px.

**Security — clean, 1 safe fix:** `npm audit fix` (non-breaking) cleared 6 of 8 advisories (form-data CRLF, js-yaml, tar, tmp, vite). Remaining 3 (astro/esbuild + zip-it-and-ship-it) need Astro 7 (breaking, build-time-only) — deferred. Reviewed `inbound-email.ts` end-to-end: well-hardened (Basic auth + sender allowlist + image type/size validation + LLM-output JSON validation + `escapeHtml` + orphan purge); no changes. Headers/secrets/CSP clean; CSP `'unsafe-inline'` kept (same documented trade-off).

**Verified green (no action):** redirects (http→https, www, .html×6, sitemap.xml) all single-hop 301; HSTS preload; robots/sitemap/canonicals correct; 404→404; JSON-LD parses with correct `@type`s on all 7 routes; external links healthy (DoorDash/Yelp/TripAdvisor/MassLive 403s = anti-bot, not broken). best-practices 77 = GA4+Clarity third-party cookies (expected; accept).

**Reported, NOT auto-changed (await Ian):** (a) em/en-dash style rule — ~34 dash occurrences in content incl. 2 verbatim customer-review quotes + standard hours en-dashes; recommend replacing in marketing prose/hours only, leaving quotes; (b) Astro 7 upgrade (breaking; clears last 3 build-time advisories) — schedule as its own pass.

**Update (same session, after Ian's go-ahead):** (a) DONE — em/en dashes replaced across `index/menu/about/faq` (visible copy + meta + JSON-LD schema text): hours ranges to hyphens, sentence-break em dashes to commas/periods/colons, one parenthetical to parens; the two verbatim customer-review quotes left intact. Commit `0d5611a`, deployed + prod-verified (`/faq` and `/menu` show 0 entity/en dashes; review-quote em dash still present). (b) Astro 7 deferred to its own session, now tracked in `../TODO.md` @low.

**QA + revert:** clean `astro build`, strict `tsc` on `main.ts`; local prod build re-measured pre-deploy (menu CLS 0.001, a11y 100, header fits @360px, keyboard tabs step + wrap); prod re-checked post-deploy. Revert: `git revert <commit> && git push origin master` (5 source files + `package-lock.json` + report + STATUS + the CLAUDE.md entry). Font preloads inert if reverted; a11y/CSS additive.

### Session 12 — 2026-06-16
**Microsoft Clarity added (heatmaps + session recordings), idle-loaded (DEPLOYED).** Closed the "Set up Microsoft Clarity" @low TODO item. Clarity project `x7y38jzmw3` (Ian created it; the project ID is all that's needed — no copy-paste of the vendor snippet).

**Install (`src/layouts/BaseLayout.astro`).** Added a second inline `<script is:inline>` after the GA4 block. The `clarity()` command queue is set up immediately, but the tag-library download (`https://www.clarity.ms/tag/x7y38jzmw3`) is deferred to `requestIdleCallback` (3s timeout; `load`+1.2s fallback) — **not** the vendor's default blocking-async snippet. This mirrors the GA4 CWV deferral from Session 9 so Clarity stays off the critical render path (no queued events lost).

**CSP (`netlify.toml`).** Extended the three relevant directives for Clarity's origins: `script-src` += `https://www.clarity.ms https://*.clarity.ms`; `img-src` += `https://*.clarity.ms https://c.bing.com`; `connect-src` += `https://*.clarity.ms https://c.bing.com` (Clarity uploads session data to `*.clarity.ms`; `c.bing.com` is needed in **both** `connect-src` and `img-src` for the Bing UET sync — the sync pixel is an `<img>` `c.gif`, caught in runtime QA when only connect-src had it). No other directive touched.

**QA (all green).** `npm run build` clean; static assertions — Clarity snippet + project ID present on all 7 built pages, GA4 idle loader intact, CSP carries the clarity origins. Runtime verified on prod via headless Chrome (Playwright): the `www.clarity.ms/tag/x7y38jzmw3` request fires after idle, `window.clarity` is defined, zero CSP/console errors. **Data appears in the Clarity dashboard within a few minutes to ~2h of first real traffic** — owner can confirm at clarity.microsoft.com.

**Revert path:** `git revert <this commit> && git push origin master` — single commit (`BaseLayout.astro` + `netlify.toml` + STATUS entry + CLAUDE.md). Clarity can also be paused from the Clarity dashboard without a code change.

### Session 11 — 2026-06-16
**Homepage URL form aligned slashless across canonical + sitemap + breadcrumbs (DEPLOYED).** Closed the long-deferred "align sitemap homepage URL to the canonical trailing slash" item (was @low, cosmetic). **The planned fix was impossible:** `@astrojs/sitemap` 3.7.2 runs a hardcoded XML-text stream-replace in `write-sitemap.js` that strips the root trailing slash whenever `trailingSlash:'never'` **or** `build.format:'file'` — copperline has both. That replace runs *after* the `serialize` hook, so no config/hook can make the sitemap emit a slashed root short of forking the package or a post-build rewrite.

**Resolved the other direction instead** — made the homepage URL slashless everywhere so it matches the sitemap (and the whole site's `trailingSlash:'never'` identity). Discovery showed the homepage canonical (`${SITE_URL}/`) and its auto-derived `og:url` were already the *lone* slash outliers — the homepage Restaurant/WebSite JSON-LD `url` fields were already slashless. So this removed an existing internal inconsistency rather than creating one.

**6 one-character edits (`${SITE_URL}/` → `${SITE_URL}` for the homepage URL only):**
- `src/pages/index.astro` — homepage canonical (also flips the derived `og:url`).
- `src/pages/{about,catering,contact,faq,menu}.astro` — the `BreadcrumbList` "Home" `item` URL (included so they don't become a new inconsistency vs the home canonical).

All other `${SITE_URL}/...` refs are real paths (`/menu`, `/logo.jpg`, `/404`) — untouched.

**Risk review:** the two forms `https://copperlineeatery.com` and `https://copperlineeatery.com/` are the same resource per RFC 3986 §6.2.3 and Google canonicalizes them together, so SEO impact is ~nil; the change *reduces* risk by making canonical match the sitemap. Verified the slashless root serves `200` with `0` redirects (no redirect chain introduced).

**QA (pre-deploy, all green):** `npm run build` clean; built-DOM assertions — homepage canonical + `og:url` slashless, homepage JSON-LD `url` still slashless, all 5 breadcrumb Home items slashless, sitemap root now equals the canonical; grep confirms no `${SITE_URL}/`-as-homepage refs remain.

**Revert path:** `git revert <this commit> && git push origin master` — single commit (6 source pages + STATUS entry + CLAUDE.md Session 11). Pure URL-string change; nothing functional depends on the slash.

### Session 10 — 2026-06-14
**Full SEO/technical audit + fixed the one Core Web Vitals outlier (`/about` YouTube facade) + finished header logo WebP. Deployed (commit `deec810`).**

Ran a fresh end-to-end audit (saved as `copperline_audit_report.md`, now in `audits/`): crawled all routes, verified redirects/canonicals/titles/H1s/schema/OG/robots/sitemap. **All previously-known technical-SEO issues confirmed resolved** (HTTP→HTTPS single-hop 301 + HSTS preload; `.html`→clean 301s; self-referencing canonicals; sitemap-index correct). No critical/moderate defects.

**Performance — measured, not assumed.** The keyless PageSpeed Insights v5 API is now hard-blocked (`429 / quota=0`, no Google API key here), so used **local Lighthouse 13.4.0 mobile**. Current prod: `/` 99, `/menu` 97, `/catering` 99 — but **`/about` 58** (LCP 9.8 s), the lone outlier. Root cause: an eagerly-loaded `youtube.com/embed/lPCIlXEzSPs` `<iframe>` (the LCP element + a heavy third-party payload). This is the "underperforming /about" from the brief — a *performance*, not content/indexing, problem.

**Fix 1 — `/about` click-to-load facade** (`src/pages/about.astro` + `src/scripts/main.ts` + `src/styles/global.css` + `public/about-video-poster.{jpg,webp}`). Replaced the iframe with an accessible `<button class="video-facade">` showing a local poster (`<picture>` WebP+JPG) inside the existing responsive `.video-embed` box; new `initVideoFacade()` injects the real `youtube.com/embed/...?autoplay=1` iframe on click. **No CSP change** — existing `frame-src www.youtube.com` + `img-src img.youtube.com` already cover it. Result: **mobile perf 58 → 98, LCP 9.8 s → 1.6 s on prod** (preview measured 2.0 s), CLS unchanged (~0.06).

**Fix 2 — header logo WebP** (`public/logo.webp` + `src/components/Nav.astro` + `src/layouts/BaseLayout.astro`). Logo served via `<picture>` (WebP ~20 KB vs JPG 62 KB, JPG fallback). Preload retargeted `logo.jpg` → `logo.webp` (`type="image/webp"`) to avoid a double download. `og:image` deliberately kept as `logo.jpg` (social-card compatibility). Closes the lone WebP-coverage gap noted in the 2026-05-22 audit.

**Not changed:** `/contact` Maps iframe was already `loading="lazy"` (corrected an over-statement in the audit draft). Sitemap-root trailing-slash + http→https external citations deliberately deferred (cosmetic / owner-gated; sitemap item now tracked in `../TODO.md` @low).

**Verification (every gate green):** `npm run build` clean; strict `tsc` on `main.ts` exit 0; static `dist/` assertions (no eager `<iframe>`, facade present, logo WebP `<source>`+preload, `og:image` still JPG, contact map still lazy); **headless Chrome (Playwright, mobile 390×844)** — zero youtube.com/googlevideo.com requests on `/about` load, only `.webp` assets fetched (no JPG double-download), click **and** keyboard (Enter) both hydrate the iframe, zero console/CSP errors; Lighthouse before(prod)/after(preview+prod); post-deploy `curl` of prod confirms facade live + assets 200. GH Actions deploy success (59s) + IndexNow ping.

**Revert path:** `git revert deec810 && git push origin master` — single commit (5 source files + 3 public assets + `copperline_audit_report.md` + `STATUS.md`). Facade degrades gracefully (poster renders, `og:image` untouched) even if `main.ts` fails to load.

### Session 9 — 2026-06-02
**Defer GA4 to idle (CWV) + inline the source photo in the specials confirmation reply — commit `7579c2d`, DEPLOYED.** Two low-priority items shipped as one commit on master; GH Actions deploy green; both verified live on prod. (Merge note 2026-07-18: the STATUS.md copy of this entry was stale — it still said "CODE-COMPLETE, PENDING DEPLOY / not yet pushed". The commit shipped; this archive entry is the corrected record.)

- **GA4 deferred (`src/layouts/BaseLayout.astro`).** The GA4 gtag.js library was the only JS still loading eagerly (`main.ts` is already a bundled, deferred ES module). Kept the tiny inline `dataLayer` + `gtag('js')` + `gtag('config')` block (so the pageview command queues immediately — **no analytics loss**) but removed the eager `<script async src=gtag/js>` and now inject the library on `requestIdleCallback` (3s timeout; `load`+1.2s fallback for browsers without rIC). The library download moves off the critical render path; queued commands flush when it lands. Verified in built `dist/index.html` (eager tag gone, idle loader + inline config present) and live (`curl` of prod shows the idle loader, no eager tag).
- **Source photo inlined in confirmation reply (`netlify/functions/inbound-email.ts`).** Deferred enhancement #2 from Session 3. The inbound board photo is now stored on the pending batch (`PendingBatch.image`: base64 + contentType + name, so it survives correction rounds) and `sendReply` attaches it inline (Postmark `Attachments` with `ContentID`) under an `HtmlBody` that shows the photo above the extracted-specials text. Plain `TextBody` unchanged as the fallback; all error/status replies stay text-only. Lets staff eyeball the extraction against the board at a glance. `tsc --noEmit --strict` passes.
- **Revert path:** `git revert 7579c2d && git push origin master` (single commit: BaseLayout.astro + inbound-email.ts + STATUS entry). GA change is inert if reverted (returns to eager async load); the specials function can also be neutralized at runtime by clearing its Netlify env vars.

### Session 8 — 2026-06-02
**GSC review: HTTP/HTTPS "issue" verified already resolved + GA4 install verified (analysis-only, no code changes).** Triggered by a benchmarking review of the GSC export (`copperlineeatery.com-Performance-on-Search-2026-06-02.zip`, last-3-months Web). A separate session flagged `http://copperlineeatery.com/` outranking the HTTPS homepage (766 clicks / 12,389 impr vs 182 / 7,922) and recommended adding a 301 + HTTPS canonical. **That recommendation is moot — the redirects/canonical/HSTS already exist and were verified live today.**

**HTTP→HTTPS — verified resolved (live `curl` against prod 2026-06-02):**
- `http://copperlineeatery.com/` → **301 → `https://copperlineeatery.com/`** (single hop, correct target).
- `https://copperlineeatery.com/` → 200 with `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload`.
- Homepage canonical tag: `<link rel="canonical" href="https://copperlineeatery.com/">`.
- `.html` legacy redirects live: `…/menu.html` → 301 → `/menu`; `http://www…/catering.html` chains http→https→non-www→`/catering`→200.

**Why GSC still shows the http row (the diagnostic the other session missed):** In `Pages.csv`, the ONLY `http://` entry is the bare homepage root. Every other page (`/menu`, `/catering`, `/about`, `/contact`, `/faq`, and the `.html` variants) appears as `https://` only. So this is not a site-wide HTTP indexing problem — it's the single most-backlinked URL form (the bare `http://` domain root, historically written that way by directories / GBP / citations) draining out of Google's index as it reprocesses the 301 + HTTPS canonical. The split position (http at 13.6 vs https at 7.3) is the temporary cost of mid-consolidation; it resolves with recrawl. This is a **lagging GSC report, not an active defect.**

**Only real accelerant:** update external citations still pointing at `http://copperlineeatery.com` (GBP website field, Yelp, TripAdvisor, The Q 99.7, directories) to `https://`. Already part of the dad-gated GBP/citation work — not new scope. Optional nudge: GSC URL Inspection → Request Indexing on `https://copperlineeatery.com/`.

**`/about` low-CTR flag — not a defect.** Other session read `/about` (1,011 impr, 2 clicks, 0.2% CTR, pos 6) as a broken title/meta. The live title (`About The Copperline Eatery | Family-Owned Restaurant Since 1993 | Chicopee, MA`) and meta description are well-optimized. The near-zero CTR is the normal branded-SERP secondary-listing effect (the homepage takes the branded click; About/Contact/`menu#specials` ride underneath). No action.

**GA4 install — verified present + well-formed on every route.** `curl` of `/`, `/menu`, `/catering`, `/contact`, `/about`, `/faq`, and a 404 each returns the standard gtag.js install via BaseLayout: async `googletagmanager.com/gtag/js?id=G-DXYNCF0G79` loader + exactly one `gtag('config', 'G-DXYNCF0G79')` per page (no double-fire). Custom events wired in `main.ts` (`click_phone`, `click_email`, `click_doordash`, `click_directions`, `download_pdf`). CSP permits `googletagmanager.com` (script-src) + `google-analytics.com` (connect-src/img-src). Static install is conclusive; live *firing* still requires a browser check (GA4 Realtime / DebugView) since `curl` doesn't execute JS — walked the user through both. No commit beyond docs.

### Session 7 — 2026-05-23
**Specials pipeline reply-parsing bugs (commits `8536a5d`, `e543fc2`) + first real specials publish (`43259a4`).** User submitted photo + corrections + YES; got back a blank email; site not updated. Diagnosed two distinct bugs in the inbound function's reply parser; both fixed in same-day deploys; 8 specials now live on `/menu` for the first time since the pipeline shipped in Session 3.

**Diagnosis from Netlify Function logs:**
- 11:40:55 / 720ms = empty-body branch hit (Gmail sent HTML-only reply with no `TextBody`).
- 11:47:38 / 7350ms = vision call (new photo round).
- 11:48:21 / 2356ms = Haiku corrections call (legitimate edits round).
- 12:03:55 / 2970ms = YES attempt reinterpreted as corrections because the body string `"yes\n\nOn Sat, May 23, 2026 at 11:48 AM <bot>\nwrote:"` (len 86) failed the YES_PATTERN due to incomplete quote-stripping.

**Bug 1 (commit `8536a5d`) — HTML-only inbound replies:** Some mail clients send replies with only `HtmlBody` populated. Function read only `TextBody`, hit the empty-body branch, sent "I got an empty reply" message which threaded under the user's existing conversation in Gmail and appeared blank in the user's inbox view. Fix: new `htmlToText()` regex helper (strips style/script blocks, converts block closers + `<br>` to newlines, decodes common entities). New `extractReplyBody()` prefers `TextBody`, falls back to `htmlToText(HtmlBody)`. Also added mobile-signature stripping to `stripEmailQuoting` for iPhone/iPad/Android/Galaxy/Get Outlook footers (which don't use the standard `-- ` separator and were polluting parsed bodies). Added `console.log` of the reply body to every confirmation-reply invocation — this log surfaced Bug 2 in the next deploy.

**Bug 2 (commit `e543fc2`) — "On <date>, <sender> wrote:" attribution not stripped without trailing newline:** The Gmail attribution line was supposed to be stripped by the existing regex `\n+On .{0,200}wrote:\s*\n`, but: (a) `.{0,200}` doesn't span newlines (Gmail wraps long attributions across two lines), and (b) when `wrote:` ends up as the last line of the body after `>`-quoted lines are stripped, there is no trailing newline. Fix: `\n+On [\s\S]{0,300}?wrote:[ \t]*\n?` uses `[\s\S]` to span newlines, non-greedy `{0,300}?`, and makes the trailing `\n` optional. Also added an Outlook "From:" / "-----Original Message-----" header strip in case of Outlook MIME quirks.

**First successful publish (auto-commit `43259a4`):** 8 specials live on `/menu` via the `<DailySpecials />` component at build time. Verified by `curl https://copperlineeatery.com/menu` matching "Southwest Chicken Hash", "Pineapple French Toast", "Rueben Omelet". One source-image typo flagged to user for next correction round: "Rueben" → "Reuben".

**Blank-email mystery partially unresolved.** Every code path post-parse sends a non-empty body by construction (verified by reading every branch). User reported truly blank content even after expanding "trimmed content" in Gmail. Best theory: client-side rendering bug specific to threaded specials-bot replies (multiple "Updated specials" previews collapsing in a way that hides the latest). Not pursued further once Bug 2 unblocked publishing. If it recurs, ask user to forward + inspect "Show original" headers + raw MIME.

**Revert paths:**
- `git revert e543fc2 && git push` — reverts the regex fix only. Would re-introduce Bug 2 for Gmail/Apple Mail replies.
- `git revert 8536a5d && git push` — reverts the HtmlBody fallback only. Would re-introduce Bug 1 for HTML-only mail clients.
- `git revert 43259a4 && git push` — resets `src/data/specials.json` to empty `{ "updatedAt": null, "specials": [] }`. Site rebuilds with no specials.

### Session 6 — 2026-05-22 (later same day)
**Schema enrichment + home description rewrite + footer redesign + catering mobile button fix.** Bundle of SEO + UX work after the user asked whether a Gemini-suggested Restaurant JSON-LD snippet would improve "Springfield area" AI discoverability. Single feature commit `5ee2ac3`; docs commit `d045236`. Deploy ~51s green; live + verified.

**Assessment of Gemini's snippet:** the user's existing Restaurant schema was already richer than what Gemini proposed (Gemini's draft missed `aggregateRating`, `review`, `award`, `sameAs`, `openingHoursSpecification`, `knowsAbout`, and had a `telePhone` typo + rougher geo coordinates). Adopted only the one valid idea: typing `areaServed` entries as `AdministrativeArea` objects instead of bare strings. Also added the four genuinely missing factual fields. Framed for the user: schema alone does not get a restaurant into "best breakfast in Springfield" AI answers — Google Business Profile, editorial mentions, citations, and on-page geographic prose are the real levers.

**Schema enrichment (`src/data/restaurant.ts` + `src/pages/index.astro` + `src/pages/about.astro`):**
- `AREA_SERVED` upgraded from a bare string array to typed `AdministrativeArea` objects; added West Springfield, South Hadley, Pioneer Valley (8 entries total, up from 5).
- New `PAYMENT_ACCEPTED` ("Cash, Credit Card, Visa, Mastercard, American Express, Discover") and `CURRENCIES_ACCEPTED` ("USD") constants sourced from FAQ Q20.
- Restaurant schema on index + about pages gains `paymentAccepted`, `currenciesAccepted`, `acceptsReservations: false` (boolean, not the string "False"), `hasMenu: ${SITE_URL}/menu`.

**Home meta + descriptions rewritten (`src/pages/index.astro`):** page meta description, OG description, Restaurant schema description, and WebSite schema description all rewritten to lead with the user's preferred dish list (eggs benedict, homemade corned beef hash, banana bread French toast) and demote the previous "homemade eggs benedict, corned beef hash, hollandaise sauce, brunch, lunch & catering" string the user flagged. New page meta description: "Family-owned Chicopee restaurant since 1993, serving brunch classics like eggs benedict, homemade corned beef hash, and banana bread French toast. Voted Best Breakfast in Western MA. Catering available across Springfield, Holyoke, and Hampden County." Grep confirmed the problematic copy was only in `index.astro`.

**About-page location anchor (`src/pages/about.astro`):** new paragraph inserted between the existing signature-dishes paragraph and the closing thank-you paragraph: "Located at 409 Broadway in Chicopee, we proudly serve guests from across the Pioneer Valley, including Springfield, Holyoke, West Springfield, South Hadley, and all of Hampden County. Whether you're driving in from downtown Springfield for our award-winning eggs benedict, picking up catering for an event in Holyoke, or visiting from anywhere in Western Massachusetts, you'll find a warm welcome and a meal worth the trip." On-page geographic prose for LLMs that read rendered content rather than just schema.

**Catering mobile button overflow (`src/styles/global.css`):** bug — at <=640px, the "Download Catering Order Form" button label extended beyond the button on both sides. Root cause: the global mobile `.btn` rule applied `flex: 1` + `white-space: nowrap` + `display: flex`, combined with a long label. Fix: scoped those mobile overrides to `.cta-buttons .btn` only (the home-page hero CTA row), since they were never meant for other CTA contexts. Added a separate `.catering-cta-row .btn` block with `white-space: normal`, `max-width: 100%`, `padding: 12px 18px`, `font-size: 0.85rem` so labels wrap inside the button on narrow screens.

**Footer redesign (`src/components/Footer.astro` + `src/styles/global.css`):** user reported the footer took >50% of the mobile viewport. Was 6 stacked sections (Name+Address, Hours, Contact, Quick Links, Follow Us, Find Us Online) × ~4 lines each. Reworked to a 4-column grid (NAP, Hours, Contact, Explore) plus a single inline Connect bar with Facebook · Instagram · Yelp · TripAdvisor · Yellow Pages between thin dividers. Padding tightened (40/20 → 28/14 desktop, 25/15 → 20/12 mobile); h3 1.1rem → 0.95rem; body 0.95 → 0.9 desktop and 0.85 → 0.82 mobile. Mobile uses 2-col grid; <380px collapses to single column. Class renames: `footer-content` → `footer-grid`; `footer-section` → `footer-col`; new `footer-list` for the Explore links; new `footer-connect` block. Old `.email-btn` styling preserved for `/contact`.

**Verification:** post-deploy curl confirmed live: new meta description, `acceptsReservations":false` (boolean serialization correct), 8 `AdministrativeArea` entries in JSON-LD, `/catering` returns 200, `footer-grid` class present in rendered DOM.

**Revert path:** `git revert 5ee2ac3 && git push` reverts the whole bundle (5 files: Footer.astro, restaurant.ts, about.astro, index.astro, global.css). The `d045236` docs commit is doc-only and safe to keep or revert independently.

### Session 5 — 2026-05-22 (later same day)
**Specials pipeline enhancements + font self-hosting.** Two unrelated work tracks shipped as separate commits same day, after Session 4 morning's robots.txt fix.

**Specials function (`netlify/functions/inbound-email.ts`, commit `46e7608`):**
- **Threaded replies.** Outbound replies now set `In-Reply-To` + `References` (RFC 2822) referencing the inbound `MessageID`. Gmail threads the YES-gate confirmation into the original photo email's conversation, so staff can scroll up to see the source photo whenever they need to reference it. Picked over base64-inlining the image (lighter, equivalent UX).
- **Free-form natural-language edit-via-reply.** Reply branch distinguishes YES / PUBLISH / CONFIRM / Y (tight regex, body must be just the word → publish + cleanup), NO / NOPE / CANCEL / STOP / DECLINE / DISCARD / NEVERMIND (tight regex → discard + cleanup), and anything else (corrections). Corrections call Haiku 4.5 (`claude-haiku-4-5-20251001`) with current specials JSON + staff reply, apply edits (rename / re-price / remove / add / reorder), write a new pending blob with a fresh `batchId`, send a corrected confirmation threaded to staff's reply. Loops until publish or discard. Quoted-previous-message text stripped before pattern-matching + Claude call.
- **Opportunistic orphan purge.** Top of every handler invocation (after auth + sender check) lists `pending-specials` blobs, deletes any with `createdAt` >24h old. Handles the orphans created during Session 3 diagnosis + future no-reply scenarios. Runs on every email (low volume, free-tier safe).
- Vision call stays on Sonnet 4.6 (image-in-text-out). Corrections call uses Haiku 4.5 (structured text-in-text-out). Right-sized per `feedback_right_size_models.md` memory.

Daily auto-expiry of specials themselves intentionally NOT implemented — ops cadence (boards update Fridays, run until sold out mid-week, new Thursday) doesn't fit an `updatedAt`-based time check (would kick in too soon mid-week or too late Thursday).

**Font self-hosting (`src/layouts/BaseLayout.astro` + `netlify.toml`, commit `6ca3237`):**
- `@fontsource/oswald` + `@fontsource/merriweather` ESM imports in BaseLayout replace the Google Fonts `<link>` + 2 preconnects. Latin subset only (validated: only non-ASCII in source is `é` in `menuData.json`, U+00E9, included in latin subset). Vite bundles 7 woff2 files (4 Oswald weights 400/500/600/700 + 3 Merriweather weights 300/400/700) into `/_astro/` with hashed filenames + existing immutable cache headers.
- CSP tightened: `style-src` drops `https://fonts.googleapis.com`; `font-src` is now `'self'` only.
- Same fonts, same weights, served from self; removes 2 external DNS lookups per page load.

**Revert paths:**
- `git revert 46e7608 && git push` — reverts specials function to Session 3 state. Corrections become declines, no threading, no orphan purge.
- `git revert 6ca3237 && git push` — reverts fonts back to Google Fonts CDN (re-loosens CSP in same commit).
- `git revert d0b6b69 && git push` is a no-op (empty commit); to undo the FROM revert, change `SPECIALS_FROM_ADDRESS` in Netlify back to `specials-bot@homegrowngrowth.co` + another empty-commit redeploy.

**Postmark FROM revert complete** (commit `d0b6b69`, empty-commit redeploy). Postmark account approval landed this session; user flipped `SPECIALS_FROM_ADDRESS` in Netlify Site Settings from the workaround `specials-bot@homegrowngrowth.co` back to canonical `specials-bot@parse.copperlineeatery.com`; empty commit forced the Netlify Function to pick up the new env var (per `reference_netlify_function_envvars_redeploy.md` memory). Reply-To header constant in code stays — harmless when From and Reply-To match.

### Session 4 — 2026-05-22
**Sitemap discovery fix (robots.txt + 301 for legacy `/sitemap.xml`).** User asked about 7 GSC "Page with redirect" entries; diagnosed those as informational (HTTP→HTTPS + legacy `.html` → clean-URL 301s working correctly, no fix needed). While inspecting, found `public/robots.txt` was still advertising `https://copperlineeatery.com/sitemap.xml` (404 — Astro's `@astrojs/sitemap` generates `sitemap-index.xml` not `sitemap.xml`). Stale since Astro 5 migration on 2026-05-16 — so crawlers had no live sitemap to discover and were leaning on stale memory of pre-migration `.html` URLs. Same bug class HGC Session 7 fixed earlier same day; caught here by the `feedback_robots_sitemap_after_migration.md` memory saved at that session's close ~6h prior. Two changes in commit `e31ba08`:

- `public/robots.txt` — `Sitemap:` line `/sitemap.xml` → `/sitemap-index.xml`.
- `netlify.toml` — added 301 `from = "/sitemap.xml"` → `to = "/sitemap-index.xml"` (force=true) in the legacy-301 block before the www→non-www rule, so old GSC/Bing entries land on the right file.

`STATUS.md` Session 4 entry was bundled into the same commit. GH Actions deployed clean.

**Manual follow-up in GSC** (user action): Sitemaps → remove `sitemap.xml` → submit `sitemap-index.xml`. The 7 "Page with redirect" entries that triggered the diagnostic age out on their own; no code action.

**Revert path**: `git revert e31ba08 && git push` reverts the robots.txt + netlify.toml + project STATUS.md in one shot. Would re-introduce the 404 sitemap discovery; don't actually revert.

### Session 3b — 2026-05-18
**Automated daily-specials pipeline shipped end-to-end + same-day configuration journey through Postmark constraints + credentials rotation.** Replaces the prior Google Sheets gviz client-side fetch (now removed) with a real email pipeline that bakes specials into static HTML. (See also the Session 3 — 2026-05-16 entry below: the pipeline build started later the same day as the Astro migration; this entry is the full ship + configuration record.)

**Pipeline (feature commit `4af2b9a`):**
- `netlify/functions/inbound-email.ts` — web-standard `Request`/`Response` handler (~290 lines incl. types + Reply-To addition). Validates Basic auth, allowlists `From` against `ALLOWED_SENDER_EMAILS`, branches on `In-Reply-To` (new-photo vs YES-reply).
- New-photo branch: validates image (JPEG/PNG/GIF/WebP, max 5 MB), calls Claude `claude-sonnet-4-6` vision, parses + validates JSON, stores pending batch in Netlify Blobs `pending-specials` keyed by UUID, sends Postmark reply with `Message-ID: <batch-{uuid}@copperlineeatery.com>` asking for YES.
- Reply branch: extracts UUID from `In-Reply-To`, loads pending blob, on YES commits `src/data/specials.json` via Octokit + GitHub Contents API, deletes blob, sends published confirmation. Non-YES deletes blob and sends declined note.
- `src/components/DailySpecials.astro` reads `src/data/specials.json` at build time, renders inline empty state if absent. Bakes specials into static HTML (indexable, no JS fetch).
- `[functions]` block added to `netlify.toml`; `--functions=netlify/functions` flag added to `deploy.yml`; ~80 lines of Sheet-fetch JS stripped from `main.ts`; `docs.google.com` removed from CSP `connect-src`. `.env.example` documents the 9 runtime env vars (set in Netlify Site Settings, not GitHub). New runtime deps: `@anthropic-ai/sdk`, `@netlify/blobs`, `@netlify/functions`, `@octokit/rest`, `postmark`.

**Pipeline flow:** staff emails a photo to `specials@parse.copperlineeatery.com` (inbound MX on the parse subdomain points at Postmark; inbound is free and unlimited) → Postmark POSTs parsed email + base64 attachment to `/.netlify/functions/inbound-email` with HTTP Basic auth → function validates + branches → YES commit triggers GH Actions, Astro rebuild bakes specials into static HTML, IndexNow pings, total ~30 s.

**6 prod deploys to land the configuration:**
- `4af2b9a` (feat) — pipeline + Astro component + env.example + workflow + memory + tracking docs.
- `0c350b8` (chore) — empty-commit redeploy after discovering Netlify Functions bake env vars at deploy time. Env vars set AFTER first deploy meant the function returned 401 with correct credentials. Reference memory saved: `reference_netlify_function_envvars_redeploy.md`.
- `4c9d4ca` (chore) — empty-commit redeploy after correcting `POSTMARK_SERVER_TOKEN`. User initially used the Postmark **Account API Token** instead of the **Server API Token**. Function logs showed `InvalidAPIKeyError statusCode 401 code 10`.
- `2e3e120` (feat) — added `Reply-To: specials-bot@parse.copperlineeatery.com` constant so YES replies route back through the parse-subdomain MX regardless of the FROM. Needed for the Postmark pending-approval workaround. **This commit also accidentally included a credentials screenshot** via `git add -A` (see Credentials rotation).
- `e4b2821` (chore) — untracked the accidentally-committed screenshot + `.eml` and gitignored `Screenshots/` + `*.eml`. Files remain in git history of `2e3e120`.
- `afdefb8` (chore) — empty-commit redeploy after webhook credentials rotation.

**Postmark pending-approval workaround:** new (pending-approval) Postmark accounts may only send when the recipient domain equals the sender domain (`ApiInputError statusCode 422 code 412`). Workaround: (1) `SPECIALS_FROM_ADDRESS` temporarily switched to `specials-bot@homegrowngrowth.co` (also verified in Postmark); (2) code adds `Reply-To: specials-bot@parse.copperlineeatery.com` so YES replies still route through the parse-subdomain inbound MX (not homegrowngrowth.co which has Google Workspace MX); (3) revert the env var after approval lands + empty-commit redeploy (done in Session 5, commit `d0b6b69`).

**Credentials rotation incident:** commit `2e3e120` was made with `git add -A` (despite guidance against it). It swept `Screenshots/netlify_postmark_screenshot.jpg` (containing `POSTMARK_WEBHOOK_USER` + `POSTMARK_WEBHOOK_PASS` in plaintext) and `Today's Specials List.eml` into the public repo. Cleanup commit `e4b2821` removed both from HEAD and gitignored their patterns. Credentials rotated immediately in Netlify env vars + Postmark webhook URL; old values remain readable in the diff of `2e3e120` but are inert (not scrubbed via filter-repo). Feedback memory saved: `feedback_never_git_add_dash_a.md`.

**Verification (end-to-end):** curl probes confirmed every state (old creds → 401; new creds + no body → 400; new creds + valid body from allowlisted sender → 200 + reply email sent; allowlist accepts `ian@homegrowngrowth.co`). User sent a real test email with photo; bot replied with extracted specials. User did NOT reply YES (test photo was outdated specials), so `src/data/specials.json` remained in its initial empty state `{"updatedAt": null, "specials": []}`.

**3 enhancement proposals discussed, deferred pending user pickup:** (1) free-form natural-language edit mechanism in reply (Claude re-parses corrections, loops to YES — shipped Session 5); (2) include the extracted-from image inline atop the confirmation reply (shipped Session 9); (3) daily auto-expiry via scheduled rebuild (later rejected as a bad fit for the ops cadence, Session 5). Recommended bundle order at the time: 2+3 first, then 1.

**Free-tier sizing:** Netlify Functions 125k/mo (use ~60), Netlify Blobs 100k reads / 1k writes/mo (use ~6/day), Postmark inbound unlimited + outbound 100/mo (lifts after approval). Anthropic vision call ~$0.01-0.02 per photo via Sonnet 4.6.

**Required infra setup (done outside the repo):** Postmark server with inbound stream + sender signatures verified for `parse.copperlineeatery.com` (canonical) and `homegrowngrowth.co` (workaround); MX record `parse.copperlineeatery.com IN MX 10 inbound.postmarkapp.com` (verified globally via Cloudflare resolver); Postmark webhook URL `https://USER:PASS@copperlineeatery.com/.netlify/functions/inbound-email`; fine-grained GitHub PAT with `contents:write` on the repo (1Password: "GitHub PAT — Copperline Specials Bot", expires 2027-05-18); 9 runtime env vars in Netlify Site Settings (see `.env.example`).

**Revert path:** each commit in the 6-deploy chain reverts individually with `git revert <sha>` + push. Runtime kill switch: clear the function's env vars in Netlify (no code change). To restore the Google Sheet flow: `git revert 4af2b9a`.

### Session 3 — 2026-05-16 (later same day)
**Automated daily specials pipeline (initial build).** Replaced the Google Sheets gviz client-side fetch with: Postmark inbound email -> Netlify Function (`netlify/functions/inbound-email.ts`) -> Claude `claude-sonnet-4-6` vision extraction -> Netlify Blobs pending state -> YES-gated email confirmation -> GitHub Contents API commit to `src/data/specials.json` -> Astro rebuild bakes specials into static HTML. New `<DailySpecials />` component reads the JSON at build time so the specials are indexable rather than JS-fetched. Added `[functions]` block to `netlify.toml`, `--functions=netlify/functions` to the GH Actions deploy step, and `.env.example` documenting the 9 new runtime env vars (set in Netlify Site Settings, not GitHub). Stripped ~80 lines of Sheet code from `main.ts` and dropped `https://docs.google.com` from the CSP `connect-src`. See the Session 3b — 2026-05-18 entry above for full setup notes, the Postmark configuration journey, and revert paths. New runtime deps: `@anthropic-ai/sdk`, `@netlify/blobs`, `@netlify/functions`, `@octokit/rest`, `postmark`.

### Session 2 — 2026-05-16
**Astro 5 migration, end-to-end.** Site moved from raw static HTML/CSS/JS deployed via `nwtgck/actions-netlify@v3` onto the same Astro 5 stack as homegrowngrowth.co (which shipped its own migration earlier the same day). Done on a feature branch (`astro-migration`) with a `--no-ff` merge. Live-site behavior unchanged — same 7 routes, same content, same URL shape (clean, no trailing slash).

**Architecture:**
- 7 `.astro` pages under `src/pages/`. Single `BaseLayout.astro` renders head/nav/footer/analytics for every page. `Nav.astro` reads `Astro.url.pathname` (stripping `.html`/trailing slash) and applies the `active` class.
- `JsonLd.astro` supports both a single schema object and an array (used by pages with multiple schemas — `/about` has 5: Restaurant + VideoObject + 2 NewsArticle + BreadcrumbList; `/` has Restaurant + WebSite; `/menu` has Restaurant-with-Menu + BreadcrumbList; etc.). Uses the `</script>`-escape XSS-defensive pattern preemptively.
- `src/data/restaurant.ts` extracts the NAP / hours / sameAs / aggregateRating / awards constants that were previously hand-duplicated across 5 HTML files into a single source of truth.
- `src/components/MenuSection.astro` + `src/pages/menu.astro` together replace `scripts/build-menu.py`. The page imports `src/data/menuData.json` directly, filters by service (breakfast / lunch / catering), and renders both the visible HTML and the full JSON-LD Menu schema (with `Offer.price`, `priceCurrency`, `suitableForDiet`). Python dependency dropped.

**Infra:**
- `NODE_VERSION="24"` pinned in netlify.toml (matches local).
- `deploy.yml` rewritten: `actions/setup-node@v4` (node 24) + `npm ci` + `npm run build` + `npm install -g netlify-cli@22` + `netlify deploy --dir=dist`. IndexNow ping unchanged (master push only).
- The legacy GitHub Action `sha256sum` cache-bust step was **deleted** — Astro/Vite hashes `/_astro/*.css|.js` filenames automatically, so cache invalidation is built in.
- `netlify.toml` consolidates everything: build env, security headers (CSP tightened: `frame-ancestors 'self'` → `'none'`), cache rules, 7 legacy `.html` → clean URL 301s, www → non-www, trailing 404 fallback. `site/_headers` + `site/_redirects` deleted.
- `build.format: 'file'` (produces flat `dist/<slug>.html`) preserves the existing no-trailing-slash URL shape and avoids the 301-chain footgun HGC hit mid-migration.

**Phase C + D bundled in:**
- `.claude/settings.json` (committed audited allowlist) + 4 slash commands (`/preview`, `/build-check`, `/add-page`, `/audit-seo`) adapted from HGC for copperline's 7-route surface.
- `SECURITY.md` + `LICENSE` added.

**Pre-flight Lighthouse baseline** at `_baseline/lighthouse-2026-05-16/*.json` (12 JSONs, 6 routes × desktop+mobile) committed. Performance budget reference for the `--no-ff` merge verification step.

**CSP audit finding** confirmed before migration: Clarity is NOT in use on copperline (script-src only allows googletagmanager + google-analytics). The Clarity fix from the open-questions TODO is N/A. (Clarity was later added deliberately in Session 12.)

**Verification:** All 7 routes build clean. JSON-LD per page: 1 schema on `/404`, 2 on `/`, `/menu`, `/catering`, `/contact`, `/faq`; 5 on `/about`. Sitemap autogenerated with 6 indexable routes (excludes `/404`).

**Deleted:** `site/` (whole tree), `scripts/build-menu.py`, `scripts/`, `sitemap.xml` (autogenerated).

**Revert path:** Netlify dashboard → previous prod deploy → "Publish deploy" (instant rollback) — THEN `git revert -m 1 <merge-sha>` AND revert `netlify.toml` build config in the same commit to keep repo state in sync with rolled-back deploy (otherwise GH Actions tries `npm run build` against a tree with no `package.json`).

**Same-day security follow-up (commit `fed3dbb`, evening of 2026-05-16):** GitHub secret scanning flagged a Google Maps JS API key in `_baseline/lighthouse-2026-05-16/contact-{mobile,desktop}.json`. Investigation confirmed it's Google's own referrer-restricted Maps embed key, captured by Lighthouse from the `google.com/maps/embed?pb=...` iframe on `/contact` — not Copperline's secret. Scrubbed all 39 occurrences (19 mobile + 20 desktop) across the 2 baseline JSONs, replacing with literal `REDACTED_GOOGLE_EMBED_KEY`. Source/build untouched; site output byte-identical. Existing alert at commit `e635575` remains in git history; manual UI dismissal as false positive is the disposition (history rewrite via `git filter-repo` not worth the disruption for a referrer-bound key). Revert: `git revert fed3dbb`.

### 2026-05-07 — GSC clean-URL migration + 404 canonical fix (pre-Astro)
GSC was flagging `/menu`, `/catering`, `/contact`, `/about`, `/faq` as "Alternate page with proper canonical tag" and stale orphan URLs (e.g., HVAC-related `condensing-units-cal-series.html` from a prior owner of the domain) as "Duplicate without user-selected canonical." Two distinct root causes, both fixed:

**1. Duplicate URLs at `/page` and `/page.html`** — Netlify was serving identical content at both URL forms with no redirect between them. Google was treating the `.html` versions as canonical (per the canonical tag) and the bare URLs as alternates. Fix: switched the entire site to clean URLs (no `.html`) and added 301 redirects from `.html` → clean URLs.
  - `_redirects` — added 5 new 301 rules (`/menu.html → /menu`, etc.)
  - All 5 main HTML files — updated canonical, `og:url`, JSON-LD `url`, BreadcrumbList `item` from `.html` → clean URLs
  - All 7 HTML files (incl. index.html, 404.html) — updated all internal nav `href`s from relative `.html` paths to root-absolute clean URLs
  - `sitemap.xml` — switched to clean URLs, `lastmod` bumped to 2026-05-07
  - `.github/workflows/deploy.yml` — IndexNow ping list updated to clean URLs
  - `scripts/build-menu.py` — fixed `Restaurant.url` in the JSON-LD generator so a future regen doesn't clobber `menu.html`'s canonical

**2. 404.html had a self-referential canonical to homepage** — every non-existent URL on the site was returning a 404 body claiming `<link rel="canonical" href="https://copperlineeatery.com/">`, causing GSC to flag dozens of stale URLs as duplicates of the homepage. Fix: removed the canonical tag from 404.html; the existing `<meta name="robots" content="noindex, follow">` is the correct, sufficient signal.

**Verification:** post-deploy curl on each `.html` URL returns 301; clean URL returns 200. Live nav click-tested. **GSC follow-up (manual, performed by Ian post-deploy):** sitemap re-submitted; Request Indexing run on each clean URL; orphan URLs submitted to the GSC Removals tool.

### Session 1 — 2026-05-05
- Recovered from machine wipe; CLAUDE.md created.
- `.gitignore` rewritten cleanly.

### 2026-04-27 — Assessment fix rounds 1-3 (pre-Astro static site)

**Round 1 — Critical + HIGH:**
- **Migrated `netlify.toml` headers/redirects → `_headers` and `_redirects` files in `site/`.** The GitHub Actions deploy method (`nwtgck/actions-netlify@v3`) bypasses `netlify.toml`, so security headers and 1-year asset cache rules were silently dropped in production. Verified post-fix with `curl -sI`: `Cache-Control: max-age=31536000, immutable` on CSS/JS/JPG.
- **Fixed `aggregateRating` in `index.html`:** was implausible 5.0/200, now accurate 4.5/1119 (Google: 4.5/1095 + TripAdvisor: 4.7/24, weighted).
- **Added required `datePublished: "2023-11-28"` to WWLP NewsArticle schema** in `about.html` for rich-result eligibility.
- **Refreshed all `<lastmod>` entries in `sitemap.xml`** to 2026-04-27.
- **Generated proper favicon set** from `logo.png` (cropped to the C-with-THE brand mark): `favicon.ico` (16/32/48), `favicon-16x16.png`, `favicon-32x32.png`, `apple-touch-icon.png` (180×180), `android-chrome-192x192.png`, `android-chrome-512x512.png`. Created `site.webmanifest`. Replaced `logo.jpg` favicon references in all 6 HTML pages.

**Round 2 — MEDIUM + LOW:**
- **Security:** `rel="noopener"` added to 30 external `target="_blank"` links across 5 pages; new `Content-Security-Policy` (allows GA, fonts, YouTube, Maps, Sheets gviz; locks down `default-src`, `object-src`, `frame-ancestors`); new `Permissions-Policy` (disables camera/mic/geo/payment/etc + FLoC).
- **Accessibility:** Skip-to-main-content link on all 6 pages; ARIA `tablist`/`tab`/`tabpanel` roles on menu tabs (with `aria-selected` updated by JS); `aria-label` on carousel prev/next buttons; carousel pause-on-hover/focus (WCAG 2.2.2); explicit `width`/`height` on every `<img>` (prevents CLS); accessible `title` on Maps iframe.
- **SEO:** `BreadcrumbList` JSON-LD on menu/about/contact/catering; dropped ignored `<meta name="keywords">` and `<changefreq>` from sitemap; removed off-brand Powerball news link from About.
- **Performance:** WebP variants for all 4 menu images (42-46% smaller, served via `<picture>` + JPG fallback); new cache rules for `.webp`/`.png`/`site.webmanifest`.
- **Analytics:** GA4 click-event tracking on phone (`tel:`), email (`mailto:`), DoorDash, Google Maps directions, PDF downloads; 404 page sends a `page_not_found` event.
- **Cleanup:** moved inline `style="..."` attrs from catering.html and menu.html to CSS classes; `/index.html` → `/` 301 redirect.

**Round 3 — Hybrid AI-discoverable menu page:**
- **`site/menuData.json`** — single source of truth for all menu items, prices, dietary flags, and signature/popular markers. 22 sections, 153 items extracted by vision from `breakfast-menu.jpg` and `lunch-menu.jpg`.
- **`scripts/build-menu.py`** — regenerates `menu.html` blocks from `menuData.json`. Run after any menu edit. (Retired in the Astro migration, Session 2.)
- **menu.html restructured:** topical H1 ("Best Breakfast & Lunch Menu in Chicopee, MA") + H2 anchoring "Hampden County's Favorite Brunch Spot Since 1993"; tabs reordered Browse Menu (text grid, default) · Visual Menu (printed JPGs) · Catering · Daily Specials; all 153 items with prices, dietary tags, popular badges in a responsive grid; full `Menu` / `MenuSection` / `MenuItem` JSON-LD with `Offer.price`, `priceCurrency`, `suitableForDiet` URIs.
- Removed skip-to-main-content link (visually noisy on desktop). Whitelisted Netlify RUM endpoint (`ingesteer.services-prod.nsvcs.net`) in CSP `connect-src`.

**Skipped intentionally at the time (need user input or net-new infra):** templating/shared header-footer (later solved by Astro), live Google Reviews widget, contact form (later solved by Netlify Forms), hero food photo, self-hosting Google Fonts (later done Session 5), HTML linter / Lighthouse CI.

**2026-04-27 GSC "Page with redirect" review:** GSC flagged 6 URL variants as "Page with redirect" (not indexed). Verified all redirect chains resolve correctly to canonical `https://copperlineeatery.com/` (http→https 301; www→non-www 301; index.html variants chain to canonical; `https://copperlineeatery.com/index.html` returns 200 with canonical tag pointing to `/`). Working as intended — Google indexes the canonical destination; no action, do not re-request indexing for these URLs.

**Google indexing note:** Google does **not** participate in IndexNow, and its Indexing API is restricted to `JobPosting`/`BroadcastEvent` — not applicable. Discovery works via the submitted sitemap, Googlebot's regular crawl, and GSC URL Inspection → Request Indexing for urgent one-offs.

### April 2026 — Initial build-out baseline (pre-assessment checklist, from the old STATUS.md "Completed Work")

**Infrastructure & Deployment:** GitHub repo → Netlify via GitHub Actions (`.github/workflows/deploy.yml`); auto-deploy on push to `master`; Node 20 deprecation fixed (`FORCE_JAVASCRIPT_ACTIONS_TO_NODE24: true`); `netlify.toml` with security headers, cache headers, www→non-www 301; `.gitignore` (original PNGs, `.netlify`, OS/editor files).

**SEO — technical:** `sitemap.xml` (5 URLs, submitted to GSC); `robots.txt`; canonical tags on all 5 pages; full Open Graph + Twitter Card meta on all pages; fixed invalid `og:type "restaurant"` → `"website"` on homepage; full meta (description, keywords, geo) on about.html + contact.html; Google Fonts preconnect; favicon references; `loading="lazy"` + improved alt text on menu images; logo preload; custom branded `404.html` with `noindex`.

**SEO — structured data:** `index.html` Restaurant schema with aggregateRating, sameAs (8 platforms), dual award array (MassLive + WWLP), FAQPage, WebSite, 5 Review items; `menu.html` MenuItem schema for 5 signature breakfast items; `about.html` VideoObject + 2 NewsArticle schemas; `contact.html` Contact JSON-LD with full openingHoursSpecification; `catering.html` FoodEstablishment JSON-LD.

**Content & citations:** TripAdvisor, Yelp, The Q 99.7, LinkedIn added to `sameAs`; WWLP "Best French Toast in Western Massachusetts" award added to homepage + about; WWLP article in "In The News"; visible FAQ section on homepage (matches FAQPage schema); visible "Signature Dishes" section on menu page (matches MenuItem schema).

**Analytics:** GA4 installed on all 5 pages (Measurement ID `G-DXYNCF0G79`).

**IndexNow:** key verification file (`670b4b1e5abe94d9050c77bc3a1011e2.txt`); automatic ping to Bing/Yandex on every successful deploy; confirmed working (first deploy returned 202).

**Image compression:** `logo.jpg` 1157KB PNG → 61KB JPEG (94% reduction, 1200px wide); breakfast/lunch menus ~67% smaller; catering menus ~25% smaller.
