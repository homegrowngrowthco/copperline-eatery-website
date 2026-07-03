# Copperline Eatery — Growth Audit (SEO + GEO + Off-site)

**Date:** 2026-07-03 (site relaunched 2026-04-01; ~3 months of GSC data)
**Scope:** full site + search + local + off-site. Companion to `copperline_audit_report.md` (Session 13 technical/a11y audit, 2026-06-22).
**Goals key:** 🍳 = more walk-ins · 🎉 = more catering leads · 📅 = more reservations/groups

---

## 0. Baseline snapshot (the "before" state)

### Lighthouse 13.4 mobile, prod, 2026-07-03

| Route | Perf | A11y | BP | SEO | LCP | CLS |
|---|---|---|---|---|---|---|
| / | 99 | 100 | 77 | 100 | 1.7s | 0 |
| /menu | 97 | 100 | 77 | 100 | 1.9s | 0 |
| /catering | 99 | 100 | 77 | 100 | 1.6s | 0 |
| /about | 99* | 100 | 77 | 100 | 1.7s | 0 |
| /contact | 100 | 100 | 77 | 100 | 1.7s | 0 |
| /faq | 97 | **96** | 77 | 100 | 1.6s | 0.002 |

\* first run read 80/LCP 5.2s; re-run 99/1.7s — single-run simulated-throttling noise (same artifact class as Session 13's phantom home-75). BP 77 everywhere = GA4/Clarity third-party cookies (documented, accepted). Raw JSONs in session scratchpad `lh/`.

- **PSI API / CrUX field data:** keyless PSI API still hard-blocked (429, quota=0 — same as Session 10). No CrUX check possible without a Google API key; at this traffic level the site is likely below the CrUX inclusion threshold anyway. Lab data above is the baseline of record.

### GSC, last 90 days (2026-04-02 → 2026-07-01)

- **Totals:** 1,469 clicks / 26,180 impressions / 5.6% CTR / avg pos 12.8
- **Branded:** 1,020 clicks on 5,583 impr. **Non-branded: 128 clicks on 8,759 impr (1.5% CTR)** ← the growth surface
- **Page split:** the legacy `http://copperlineeatery.com/` row still carries 18,033 impr / 1,109 clicks vs the https homepage at 12,953 / 246. Consolidation is still mid-flight 5 months after the 301s went live (they're verified correct; Google is slow-draining the most-backlinked URL form). External citations still pointing at `http://` are the only accelerant.
- **Catering search visibility ≈ zero:** "catering chicopee ma" 11 impr @ pos 20.5; "restaurant catering chicopee ma" 28 impr @ pos 17. The /catering page's actual query mix is branded + breakfast terms, not catering terms.

### Local pack + organic positions (DataForSEO, Chicopee geo, mobile, 2026-07-03; $0.02)

| Query | Local pack | Copperline pack rank | Copperline organic | AI Overview? |
|---|---|---|---|---|
| breakfast near me | Petros · Fluffyflips · Lucky Strike | **absent** | **#1** | no |
| breakfast chicopee ma | Petros · Fluffyflips · Copperline | #3 | #3 | no |
| brunch chicopee ma | **Copperline #1** · Lucky Strike · Petros | **#1** | #4 | no |
| catering chicopee ma | 3 Guys · Shanashil · Wicked Twist · Blue Door | **absent** | **absent (not in top 20)** | **yes** |
| breakfast catering near me | Petros · Lucky Strike · Fifties Diner | absent | **#1** | **yes** |
| lunch chicopee ma | Island Spice · Munich Haus · Wicked Twist | absent | #19 | no |

Review standing: Copperline 4.5★/~1,100 (Google) vs Lucky Strike 4.3/1,300, Petros 4.4/900, Fifties 4.1/1,200. Yelp: 123 reviews.

### Verification of previously-known issues

| Issue | Status |
|---|---|
| HTTP→HTTPS fragmentation | **Code-side resolved** (301 single-hop + HSTS preload verified live). GSC consolidation still in progress — see baseline. Citation updates (DAD) remain the accelerant. |
| Duplicate `.html` canonicals on /menu, /catering | Resolved. `.html` 301s verified live; residual GSC impressions on `.html` rows are small and draining (menu.html 261 impr/90d). |
| /about underperformance | Resolved (perf 99). The low CTR at pos 5.1 is the normal branded-SERP secondary-listing effect, not a defect. |
| Redirects/sitemap/robots/404 | All green: www + http 301 single-hop, sitemap-index (6 URLs, matches GSC "all indexed" from Session 18), robots points at sitemap-index, unknown URLs 404. Zero broken internal links; both catering PDFs 200. |
| Security headers | HSTS preload, CSP, X-Frame-Options DENY, Permissions-Policy all present. |

---

## 1. SHIP NOW (Claude can build; Ian reviews the preview)

Ordered by expected impact.

### S1. Rebuild /catering into a real landing page 🎉 — Effort: M (half day)
The single biggest gap the data shows. Catering demand exists ("catering chicopee ma" has a 4-slot local pack, an AI Overview, and dedicated caterers ranking), Copperline is invisible for it, yet it's already **organic #1 for "breakfast catering near me"** — the authority is there, the page is just thin. Today /catering is a brochure: no prices, no photos, no testimonials, no form; the actual menu lives only in PDFs (invisible to Google and to the AI Overviews that now sit on catering SERPs). Meanwhile the pricing already exists as indexable HTML — on the FAQ page ($12.95pp buffets, 40-person hot-buffet minimum, lead times).
- Put packages + per-person pricing on the page as HTML (source: the catering FAQ answers + PDFs).
- Render the catering menu sections as HTML (the data already exists in `menuData.json` — /menu's Catering tab renders it; link the two).
- Add a catering inquiry form (Netlify Forms, free tier, zero backend; event date/headcount/type + phone fallback). Right now the only paths are a phone call or a yahoo.com email — a form captures after-hours leads and gives you a measurable "catering lead" GA4 event.
- Add catering-specific FAQPage schema on the page (reuse the /faq catering Q&As), a couple of real event/food photos (needs Ian/Dad — see I4), and 1-2 catering testimonials.
- Title/H1 rework toward "Catering in Chicopee, MA" phrasing (current H1 is bare "Catering Services").

### S2. Town catering pages (Springfield, Holyoke, West Springfield) 🎉 — Effort: M (half day for 3, after S1)
GSC shows page-2 rankings for "breakfast holyoke ma" (21.7), "breakfast in springfield ma" (22.8), "best breakfast springfield ma" (24) with zero pages targeting those towns. Build 3 genuinely-differentiated pages (`/catering/springfield-ma` etc.): drive time from 409 Broadway, delivery/setup notes for that town, which local venues/offices/churches you've served, town-specific testimonial if available. **Cap it at 3-4 real towns you actually serve and can say something true about** — templated thin doorway pages at scale is the one way this backfires on a 6-page site. Add to sitemap + nav footer, breadcrumbs, LocalBusiness `areaServed` schema per page. (Occasion pages — weddings/corporate/memorial — are a phase 2 after these prove out; see TAG assessment §4.)

### S3. Brunch + CTR title tuning on home and menu 🍳 — Effort: S (1-2 hrs)
Copperline is **local pack #1 for "brunch chicopee ma"** and pos 6.7 for "best brunch spots near me" — with **0 clicks on 175 impressions** for the latter, and 0/130 on "best breakfast spots near me". The word "brunch" appears nowhere in the homepage title/H1 ("Best Breakfast & Lunch…"). Add brunch to the homepage title/meta/H1 phrasing and menu-page copy, and sharpen the two meta descriptions toward the zero-click queries (superlatives + hours + "walk-ins welcome"). Cheap test, measurable in GSC in ~3-4 weeks against this baseline.

### S4. Lunch visibility block 🍳 — Effort: S-M (2-3 hrs)
"lunch near me" pos 19.4, "lunch chicopee ma" organic #19, no lunch local-pack presence. Breakfast dominates every page. Add a real lunch section to the homepage (signature Reuben, grinders, soups) + a lunch-anchored H2 on /menu targeting "lunch in Chicopee". Not a new page — strengthen existing ones. (Full lunch landing page only if this moves the needle.)

### S5. GEO/AI-answer hardening — Effort: S (1-2 hrs)
Structured data is already strong (Restaurant, full Menu with prices, FAQPage, breadcrumbs — better than nearly any competitor). Remaining gaps for AI ingestion:
- `llms.txt` (404 today) — cheap, lists pages + key facts (hours, NAP, signature dishes, catering packages).
- Explicit AI-crawler allows in robots.txt (GPTBot, ClaudeBot, PerplexityBot, OAI-SearchBot, Google-Extended) — currently implicit via `Allow: /`, explicit is free insurance and self-documents the policy. TAG's robots is the template.
- The S1 catering-pricing-as-HTML work is the biggest GEO lever: AI Overviews on catering queries can only cite what's in HTML.
- One retrieval-shaped paragraph on /catering ("Copperline Eatery caters breakfast and lunch across Chicopee, Springfield, and Holyoke, with buffet packages from $12.95/person…") mirroring what worked on /about.

### S6. FAQ a11y fix — Effort: XS (15 min)
/faq scored 96: `link-in-text-block` (links distinguishable by color only) — same class Session 13 fixed on the menu legend. Underline in-text links in the FAQ answers. Housekeeping; keeps the a11y-100 board clean.

### S7. Review-count refresh + tracking hygiene — Effort: XS (30 min)
`AGGREGATE_RATING.reviewCount` is hardcoded 1119 (April snapshot); Google now shows ~1,100+ and drifting. Update the number and add a `<!-- update quarterly -->` note (per pointers-not-snapshots). While in there: add a GA4 event on the S1 catering form submit so "catering leads" becomes a measured funnel, not vibes.

---

## 2. NEEDS IAN (decisions/inputs before build)

### I1. Reservations goal contradiction 📅 — Effort: decision only
You listed "more reservations" as a goal, but the schema says `acceptsReservations: false` and the FAQ says call-ahead for groups of 8+. Which is true now? Options: (a) it's really "more large-group call-aheads" → we build a "Groups & Private Events" section/page around call-ahead + catering upsell; (b) you actually want table reservations → that's an ops change (and then Google Reserve/OpenTable questions follow). The site can't optimize for a behavior the restaurant doesn't accept.

### I2. ezCater / catering marketplaces 🎉 — Effort: decision + ~1 hr setup
Corporate catering search in Chicopee is partly intermediated by ezCater (ranks on "catering chicopee ma"-adjacent queries) and Thumbtack ("breakfast caterers"). Listing = real corporate lead flow but ~15-20% take rate and menu upkeep. Worth a deliberate yes/no. If yes, it's also two more high-authority NAP citations.

### I3. Town-page scope for S2 — Effort: decision only
Confirm the 3-4 towns worth a page (proposal: Springfield, Holyoke, West Springfield; South Hadley optional) and give me 1-2 true local details per town (venues/offices/events you've actually catered) so the pages are real, not templated filler.

### I4. Photos 🎉🍳 — Effort: Ian/Dad, ~1 hr with a phone
The site has zero real food/interior photography (hero photo was a known skipped item from the first audit; catering page has none). S1/S2 land materially better with 5-10 real shots: 3-4 hero dishes, a catering buffet setup, dining room, storefront. Phone photos in good light are fine. This also feeds the GBP photo task (D3).

### I5. Local backlinks — Effort: outreach, ongoing
Backlink profile is thin: the citation set (Yelp/TA/YP/The Q) + MassLive/WWLP award mentions carry it (no paid backlink tool wired in; deeper crawl needs Ahrefs/Semrush or similar — flag if you want one run). Cheapest real wins: Chicopee Chamber of Commerce listing, Explore Western Mass, Macaroni KID Chicopee (already publishes breakfast roundups — pitch inclusion; they list competitors today), local event venues' "preferred caterers" pages, high school boosters/church event pages you already cater for.

---

## 3. NEEDS DAD (account owner)

All existing TODO items stand; this audit re-ranks and quantifies them.

### D1. GBP primary category + completeness 🍳 — the #1 off-site item, now quantified
Copperline is **missing from the "breakfast near me" local pack** while sitting at organic #1 with a better rating than two of the three pack members (Petros 4.4/900, Fluffyflips 5.0/12, Lucky Strike 4.3/1,300). That pattern = GBP relevance problem, not reputation. Set primary category "Breakfast restaurant" (existing TODO), fill the GBP menu editor, enable messaging, add attributes. "breakfast near me" is 2,965 impr/90d in GSC alone — pack inclusion is worth multiples of every on-site change in this report for walk-ins.

### D2. Citations: http→https + NAP audit — existing @high, now quantified
The http homepage row is where 75% of branded clicks still land (1,109 of 1,469). Update the website field on GBP, Yelp, TripAdvisor, YP, The Q to `https://copperlineeatery.com`. While in there fix NAP variants: Yelp says "409 Broadway **St**"; Wanderlog lists the restaurant under "Springfield, MA". Scraper directories (restaurantji, sirved, wheree, menu-res) carry stale menus — claim/correct where free, ignore the rest.

### D3. GBP catering surface 🎉 — new item
Add Catering as a GBP service/menu section with the $12.95pp packages, a couple of buffet photos, and a monthly GBP post cadence (specials board photo is free content — the specials pipeline already produces the asset). The "catering chicopee ma" pack today is beatable: 3 of its 4 members have <150 reviews; Copperline has ~1,100. GBP catering signals + the S1 page is the two-sided attack.

### D4. Review flywheel — existing QR-code TODO
4.5/1,100 vs Lucky Strike's 1,300: keep the register QR code task moving; add "mention catering in your review" nudge on catering deliveries (catering-keyword reviews are a local-pack relevance signal for D3).

### D5. DoorDash menu audit — existing TODO, unchanged priority. Also confirm whether Grubhub's "breakfast delivery Chicopee" listing includes Copperline (it ranks; absence = free demand going to competitors).

### D6. Social freshness — Facebook page is well-named ("Copperline Eatery & Catering") — keep weekly posts (specials photos already exist); Instagram same. Feeds GBP + GEO indirectly.

---

## 4. TAG-repurpose assessment (asked directly)

**Verdict: don't port the engine; port the LP-builder pattern.** TAG's content engine is a *daily evergreen-article pipeline* (Notion queue → LLM draft → QA gates → PR → auto-merge) built for volume publishing. Copperline needs ~5-8 *one-time, templated-but-true local pages* (S1/S2) and then maybe occasion pages. Running a scheduled generator against a 6-page restaurant site would manufacture thin content and doorway-page risk for no benefit — supply isn't the constraint here; truthful local detail is.

What genuinely transfers, in order of value:
1. **`build-tool-lp.mjs` pattern (TAG Session 23)** — a two-phase generate→review→apply script that takes structured inputs (town, drive time, venues served, testimonial) and emits a complete `.astro` page + sitemap/nav wiring. One batched run for the 3-4 town pages, human-reviewed before apply. Right-sized: a ~150-line script, or honestly just do the 3 pages by hand — only build the script if occasion pages (phase 2) get greenlit, making it 8-10 pages total.
2. **Deterministic QA gates** — a tiny `lint-local-pages.mjs` (NAP string matches `restaurant.ts` exactly, no em dashes, required schema blocks present, no invented facts markers) wired into the existing GH Actions deploy. Cheap insurance if pages multiply.
3. **Already shared:** PR + preview flow, IndexNow ping, the `/add-page` slash command scaffold.

What does NOT transfer: the daily cron, Notion topic queue, auto-merge, Vision QA loop, affiliate/registry machinery — all volume-publishing infrastructure solving problems Copperline doesn't have.

---

## 5. Suggested sequencing

1. **Week 1 (Claude):** S1 catering page + S5 GEO + S3 titles + S6/S7 (one PR each or batched, preview links for review) — while **Dad does D1 + D2** (highest combined leverage).
2. **Week 2:** I1/I3/I4 answers → S2 town pages + S4 lunch block. Dad: D3 GBP catering + D4 QR.
3. **Week 3+:** I2 ezCater decision, I5 backlink outreach, phase-2 occasion pages if catering-lead volume responds.
4. **Measure:** re-run this report's GSC pulls + local-pack checks ~2026-08-15 against §0. Success = catering non-branded impressions 10x (they're near-zero, so the bar is low), "brunch/breakfast" zero-click queries converting, pack inclusion on "breakfast near me".

---

*Method notes: Lighthouse 13.4 local (PSI API keyless-blocked); GSC Search Analytics API via ~/.gsc OAuth (read-only); local-pack via DataForSEO live/advanced, Chicopee geo, mobile, $0.021 total; live-site QA via Playwright at 390px; link sweep via curl. No code or content changed by this audit.*
