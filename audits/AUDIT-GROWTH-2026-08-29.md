# Copperline Eatery: Growth Audit + Scope (specials board rework, ongoing content, competitor comparison)

**Date:** 2026-08-29 (Session 33). Companion to `AUDIT-GROWTH-2026-07-03.md` (baseline) and `AUDIT-SEO-2026-07-07.md` (delta). This is the ~8-week re-measure the July audit scheduled for ~08-15, plus the scoping Ian asked for.
**Asked:** (1) rework the specials intake so the specials page shows the board photo itself and thanks the submitter by name; (2) an ongoing content stream "like TAG" to bring more people to the site; (3) a more detailed traffic audit and how Copperline compares to other restaurants in the area.
**Status of this file:** scope + findings. Open decisions are listed in section 5; nothing here is built yet. Remediation items move to `../TODO.md` once Ian answers.

---

## 0. Verdict up front

- **The website is not the bottleneck.** It is the best restaurant website in its competitive set by a wide margin (section 3.4): 7 of the 17 nearby breakfast/diner competitors have no website at all, and only one (Crepes Tea House, on Toast) has comparable structured data. Lighthouse, schema, indexation and redirects were all re-verified green in July and nothing has regressed.
- **Traffic is flat because the site is a branded destination.** 69% of clicks are people typing "copperline" (343 of 495 in the last 28 days). Non-branded organic is 43 clicks on 3,082 impressions. The discovery surface for a breakfast restaurant is the Google local pack, and from anywhere other than its own block Copperline is **still absent from the "breakfast near me" pack** (section 3.3), exactly as in July. The pack is driven by Google Business Profile signals (proximity, review velocity, posts, photos, category), which the website can only feed indirectly.
- **The DAD items from July are still the highest-leverage moves and are still open:** the GBP website field still points at `http://` (75% of homepage clicks are still attributed to the http row, unchanged for 12+ weeks), no catering section on GBP, no posting cadence.
- **The specials pipeline is the one thing on this site that produces fresh, real, weekly content** (12 publishes since May, roughly weekly since late June), and today it throws the photo away at publish time. Item 1 fixes that and, as a side effect, produces the weekly photo asset a GBP/Facebook posting cadence needs. That is the cheapest content engine this site can have, and it should ship before any blog.
- **A TAG-style engine transfers as a pattern, not as a product.** Recommendation: a weekly, human-reviewed local post stream (Tier B below) hosted in GitHub Actions like TAG's topic builder, with deterministic gates that check every dish and price against `menuData.json`. Expect long-tail catering/occasion clicks from it, not "breakfast near me" clicks; those come from the pack.

---

## 1. Specials intake rework (board photo + shoutout)

### 1.1 How it works today (read from the code, 2026-08-29)

Two intake paths feed one review loop:

| Path | Entry | Function | Who sees the review |
|---|---|---|---|
| Email | photo to `specials@parse.copperlineeatery.com` (Postmark inbound) | `netlify/functions/inbound-email.ts` (706 lines) | trusted sender (allowlist) gets the YES-gate back; unknown sender routes to `REVIEWER_EMAILS`; trusted + aligned-DKIM + confidence >= 85 auto-publishes |
| Web | `/submit-specials` (noindex, QR-code discovery) | `netlify/functions/submit-specials.ts` (208 lines) | always routes to `REVIEWER_EMAILS` |

Both call Claude Sonnet vision (`lib/specials.ts`), store a `PendingBatch` in Netlify Blobs (`pending-specials`) **including the base64 photo**, email a YES/NO/corrections prompt with the photo inlined, and on YES call `commitSpecialsToRepo()` which writes `src/data/specials.json` (`{updatedAt, specials[]}`) through the GitHub Contents API. The push rebuilds the site and `src/components/DailySpecials.astro` renders the list on `/menu#specials` at build time.

What is missing for the ask:
- **The photo travels the whole pipeline and is dropped at the last step.** `commitSpecialsToRepo()` writes only the text. Nothing on the site references an image.
- **No name is captured anywhere.** The web form has a free-text `note` only; the email path ignores `FromFull.Name`. `PendingBatch` records `submissionSource` (`email`/`web`) and, for public email, `submittedBy` (an address), which must never be shown publicly.
- **There is no `/specials` page.** "Specials" in the nav and homepage link to `/menu#specials`. GSC shows `/menu#specials` earning 314 impressions and 0 clicks in 28 days.

Usage reality (from bot commits on `origin/master`): 12 publishes since 2026-05-23, 11 of them since 06-26, i.e. about one per week, mostly Friday/Saturday, 4 to 9 items per board. The on-page copy says "updated each morning"; the "Updated Saturday, August 29" label already tells the truth, and the copy should match it.

### 1.2 Design (recommended)

**Data model.** `specials.json` grows three optional fields; `DailySpecials.astro` treats them as optional so the existing JSON and every old commit still build.

```json
{
  "updatedAt": "2026-08-29T12:02:18Z",
  "board": { "key": "2026-08-29-<batchId>", "width": 1600, "height": 1200 },
  "credit": { "name": "Sarah", "from": "Chicopee" },
  "source": "customer",
  "specials": [ ... ]
}
```

**Where the photo lives: Netlify Blobs + a tiny GET function + Netlify Image CDN (Option A, recommended).**
- At publish (YES reply or staff auto-publish), write the pending image to a `specials-boards` Blobs store under a dated key. The bytes are already in the pending batch, so this is one `store.set()` in the shared publish step (move `commitSpecialsToRepo` into `lib/specials.ts` so both functions share it).
- A new `netlify/functions/specials-board.ts` serves `GET /specials-board/<key>` from Blobs with `Cache-Control: public, max-age=31536000, immutable` (keys are content-addressed by date + batch id, so they never change).
- The page references the photo through Netlify Image CDN (`/.netlify/images?url=/specials-board/<key>&w=900&fm=webp`), which resizes the 2 to 5 MB phone photo, converts to WebP, and honors EXIF rotation. No `sharp` in the functions bundle, no new npm dependency.
- Rejected: committing the JPEG into the repo next to `specials.json` (simplest, but 2 to 5 MB per week of permanent git history, and no resize before commit); an external image host (another vendor and another key for a 1-photo-a-week job).
- To verify during build: Blobs quota on the current Netlify plan (52 photos/year at up to 5 MB is ~260 MB/year; fine on paid, check free-tier limits), and that Image CDN accepts a function-backed same-site path (it accepts any same-site URL; a redirect rule maps the clean path to the function).

**Name capture.**
- `/submit-specials` gets two optional fields under the photo: **First name** and **From** (town, workplace, team; see question Q1), plus a one-line consent: "Add my name to the thank-you on the specials page." Filling in the name is the opt-in; leaving it blank means no shoutout. Max 40/60 characters, URLs/emails/HTML stripped, no em dashes (the existing content rule), rendered escaped by Astro.
- Email path (public senders): the reviewer email shows "Shoutout: none (email had no name)". The reviewer can add one with the existing corrections reply ("credit Sarah from Chicopee"); `applyCorrections()` gets the credit object added to its prompt and JSON shape. `FromFull.Name` is offered as a suggestion in the reviewer email but never auto-applied (display names are often full names or business names).
- Staff path (trusted sender, auto-publish): `source: "staff"`, no credit. The page shows the photo with "Photo from the kitchen" or nothing (Q1).
- Every reviewer email gains one explicit line: "If you reply YES, this photo and the name below will be shown publicly on copperlineeatery.com." The photo has always been in the review email, so the human gate already covers faces/reflections; the line makes it deliberate.

**Rendering.**
- `DailySpecials.astro`: photo left, extracted list right at >= 900px, stacked on mobile; `<img>` with explicit `width`/`height` (zero CLS), `loading="lazy"` on `/menu`, eager on `/specials`; alt text "Today's specials board at The Copperline Eatery, photographed Saturday, August 29".
- Credit line under the photo: "Thank you, Sarah from Chicopee, for helping keep our specials board updated!" (only when `credit` is present).
- **New `/specials` page (Q2).** Indexable, title "Today's Specials in Chicopee, MA | The Copperline Eatery", `og:image` = the board photo (so a Facebook share of the link shows the board), `Menu`/`MenuSection` JSON-LD with `image`, breadcrumb, "Updated <date>" and a link to `/submit-specials` ("See a newer board? Share a photo"). `/menu#specials` keeps rendering the same component. The nav "Specials" link and the homepage buttons point at `/specials`. Add to the IndexNow list in `deploy.yml`.
- Archive hook (feeds section 2): `specials.json` keeps a `history[]` of `{date, boardKey, credit, specials}` (metadata only, capped at 52), which section 2 Tier A turns into dated pages.

### 1.3 What it takes

| Piece | Effort (Claude) | Notes |
|---|---|---|
| Shared publish step: Blobs write + `specials.json` fields + GET function + redirect + Image CDN URL | 3 to 4 h | both functions, back-compat JSON, `qa:functions` harness update |
| Name/credit: form fields, `PendingBatch.credit`, reviewer email line, corrections prompt, sanitizer | 2 to 3 h | `submit-specials.astro` + both functions |
| Render: `DailySpecials` layout, `/specials` page, OG image, schema, CSS, 390/1280 QA | 2 to 3 h | `/add-page specials` scaffold + IndexNow list |
| End-to-end test (one real email submission + one web submission against the deploy preview), Lighthouse/CLS check, docs | 2 h | needs Ian to send the test photos and reply YES |
| **Total** | **about 1.5 days of sessions** | one PR, single revert; old `specials.json` shape keeps working |

Ian: ~20 minutes (review the preview, send two test photos, confirm the reviewer email reads right). Dad: nothing. New env vars: none. Cost: none beyond the existing vision call. Risks: Blobs quota on the current plan; the QR code near the board already points at `/submit-specials`, so no reprint.

---

## 2. Ongoing content ("like TAG")

### 2.1 What the data says content can and cannot do here

- TAG's engine (Notion `Queued` -> Sonnet draft -> sanitize -> PR -> gates -> human merge, daily) is volume infrastructure for an affiliate blog. On a young domain it produced 16 clicks/28d at 1 post/day (TAG CLAUDE.md, 2026-08-12). Copperline's domain is older and its intent is local, so per-post yield should be better, but the ceiling for on-site content is the long tail (catering, occasions, "what to order"), not "breakfast near me". That query has 1,129 impressions/28d for Copperline at position 10.5 and is decided by the local pack.
- What already works on this site: the homepage and `/menu` at position 4 to 7 for "breakfast chicopee (ma)" (three queries, 268 impressions), "mimosas near me" (position 5.7, 3 clicks: a brunch-drinks angle nobody targets), and organic #5 to #7 for "catering chicopee ma" (was absent from the top 20 in July: the catering rebuild landed).
- What has not worked yet: the 27 town/service-area pages collected ~1,590 impressions and **5 clicks** in 28 days at positions 5 to 35. They are indexed and ranking, but position 10+ earns no clicks, and Google is also testing them on wrong-geo queries ("catering brookline ma", "catering bryn mawr pa"), which is why average position slipped from 13.9 to 16.0. Verdict on the July experiment: impressions arrived, clicks did not; hold, do not add more towns, re-measure 10-01.

### 2.2 Three tiers, in the order to build them

**Tier A: the specials archive (automatic, zero writing).** Every published board becomes a dated page (`/specials/2026-08-29`) with the photo, the list, and the shoutout; `/specials` links to the last 8 to 12. Real, unique, weekly, photographed content that no competitor has, plus a permanent URL for each week's board that a Facebook or GBP post can link to. Effort: 3 to 4 h on top of Item 1 (content collection or a `getStaticPaths` over `history[]`, sitemap entries, IndexNow). Ongoing: nothing.

**Tier B: weekly local posts (semi-automatic, human-reviewed).** The transferable parts of TAG: the two-phase backlog builder (`backlog/build-backlog.mjs` pattern: propose -> human picks -> generate -> PR with deploy preview -> merge), the deterministic gates, and the GitHub Actions host (no n8n, no Notion dependency; a `content/backlog.json` in the repo, or Notion if Ian wants the same review UX as TAG).
- Topic sources: GSC queries the site already gets impressions for, the catering FAQ, `menuData.json` (153 real dishes), a seasonal calendar (The Big E runs Sept 18 to Oct 4 in West Springfield; graduation season; holiday catering), and Copperline's own history (since 1993, the awards).
- Example posts that fit the demand seen in GSC: "How much breakfast catering to order for 25, 50, 100 people" (matches "breakfast caterers near me with prices"), "Catering a graduation party in Chicopee", "Corporate breakfast in Springfield: what offices actually order", "Brunch and mimosas in Chicopee" (that query converts today), "Where to eat breakfast before The Big E", one dish story per month (roast beef hash, bread pudding French toast), "This month on the specials board" (compiled from Tier A).
- Gates that make it safe: every dish name and price mentioned must exist in `menuData.json` (deterministic, not a prompt rule), NAP must match `restaurant.ts` exactly, no em dashes, no testimonials or order-history claims the script cannot source, required schema present, image required (Tier A photos, the Wikimedia town photos, or Dad's photos).
- Effort: about 2 to 3 days of sessions (Astro content collection + post layout + `/blog` index ~0.5 d; backlog builder port ~0.5 d; generator + PR flow ~0.5 d; gates ~0.5 d; GHA workflow + docs ~0.25 d). Ongoing: Ian 20 to 30 minutes a week to pick a topic and review a PR; Claude API roughly $0.10 to $0.30 per post.
- Cadence: 1 post/week for 12 weeks, then measure (Q3/Q4). Not daily: a 40-page restaurant site publishing daily manufactures thin pages and doorway risk for no upside.

**Tier C: distribution (needs Dad, and it is where the numbers move).** Website content with no distribution does nothing for a restaurant. The weekly board photo + the `/specials` link is a ready-made GBP post and Facebook/Instagram post. Options, cheapest first: (a) Dad posts it manually, ~1 minute a week, from the reviewer email; (b) Dad connects the Facebook Page + Instagram to Buffer (free tier) once and Claude/n8n queues the post; (c) an n8n workflow using the Facebook Graph node with a Page token Dad grants once. GBP Posts through the Google Business Profile API require Google's project-approval form plus owner OAuth (weeks of lead time), so GBP posts stay manual for now. Effort: Dad 15 to 30 minutes once; (c) is about half a day of build.

### 2.3 Expectation to hold the work to

Non-branded clicks are 43/28d today. A fair 90-day gate for Tiers A+B: +50 non-branded clicks/28d, at least one catering quote lead attributable to a post, and `/specials` earning clicks where `/menu#specials` earned 0 on 314 impressions. If Tier C runs alongside, watch GBP Insights (calls, direction requests) instead of GA4 sessions; that is the real conversion for a breakfast restaurant.

---

## 3. Traffic audit and competitor comparison

### 3.1 GSC, 28 days (07-30 to 08-26) vs the prior 28

| Metric | Current | Prior | Read |
|---|---|---|---|
| Clicks / impressions | 495 / 10,156 | 510 / 10,150 | flat |
| CTR / avg position | 4.9% / 16.0 | 5.0% / 13.9 | position slipped because the town cluster accumulates impressions at 10 to 35 |
| Branded | 343 clicks / 1,691 impr | | 69% of clicks |
| Non-branded | 43 clicks / 3,082 impr (1.4% CTR) | | the growth surface |
| Catering queries | 2 clicks / 113 impr / 41 queries | 2 / 20 / 13 (07-07) | 5x the impressions, same clicks |
| `http://` homepage row | 322 clicks / 5,236 impr | 320 / 07-07 | **75% of homepage clicks still attributed to http**; GBP website field is still http (DAD) |
| `/catering` | 10 clicks / 2,233 impr, pos 24.1 | | ranking, not clicking |
| `/catering/quote` | 0 clicks / 13 impr | | 0 real leads since 07-27; indexing was requested 08-05 |
| Town cluster (27 pages) | 5 clicks / ~1,590 impr | first impressions 07-07 | see 2.1 |

Top non-branded queries: "breakfast near me" 14 clicks / 1,129 impr / pos 10.5; "breakfast chicopee" 3 / 122 / 4.4; "mimosas near me" 3 / 21 / 5.7; "best breakfast near me" 2 / 37 / 13.0; "breakfast chicopee ma" 1 / 92 / 4.2; "breakfast in chicopee ma" 1 / 54 / 4.4.

### 3.2 Why traffic is flat (the causal read)

1. The site is a branded destination: people who already know the name look up hours, the menu and specials. That audience is capped by how many people already know Copperline.
2. Discovery happens in the local pack, not in organic results. Copperline is organic #2 to #3 for every breakfast query in Chicopee (behind Yelp/TripAdvisor) and still gets 1.4% CTR on non-branded impressions because the pack sits above it.
3. The pack gap is a GBP-signals gap (section 3.3), and every GBP lever is a DAD item that has been open since July.
4. The organic surfaces added since July (catering, towns) are indexed and ranking at 5 to 35. That earns impressions, not clicks, until authority or pack presence improves.
5. There is no distribution: no posting cadence to GBP/Facebook/Instagram linking back to the site, no email list, no fresh visual content. The specials photos, the one weekly asset the business already produces, currently go nowhere.

### 3.3 Local pack, re-measured (DataForSEO, mobile, 2026-08-29, $0.13 total)

Pack results are proximity-sensitive, so they were pulled from four points. The July audit's single "Chicopee geo" pull is closest to the City Hall row.

| Query | From 409 Broadway | From Chicopee City Hall (1.5 km) | From downtown Springfield | From Holyoke center |
|---|---|---|---|---|
| breakfast near me | **pack #1** (Petros, Fluffy Flips) | **absent** (Petros, Sunny Side Up, Fluffy Flips) | absent | absent |
| breakfast chicopee ma | #1 | #3 | #2 | #3 |
| brunch chicopee ma | #1 | | | |
| lunch chicopee ma | #2 (Playa Bowls #1) | | | |
| diner near me | #3 (Route 66, Fifties) | | | |
| breakfast catering near me | #1 | | | |
| catering chicopee ma | absent, organic #5 | absent, organic #7 | absent, organic #7 | absent, organic #7 |
| breakfast holyoke ma / springfield ma | absent, organic absent | | | |

Change since July: "catering chicopee ma" went from absent in the top 20 organic to #5 to #7 (the catering rebuild worked organically; the pack is still three small caterers with 17 to 79 reviews). "breakfast near me" pack is still absent from anywhere but the restaurant's own block. No AI Overviews appeared on any of these queries this time (July saw them on the two catering queries).

**Why Petros wins the pack with fewer reviews and fewer photos and no website:** the business name literally contains "Breakfast & Lunch" (a strong pack relevance signal that Copperline cannot copy; keyword-stuffing a GBP name violates the guidelines), plus proximity to the searcher and, most likely, review recency. The levers left to Copperline are review velocity (the register QR code, already in TODO), weekly GBP posts, more owner photos, and the catering services section. One new mismatch to fix: the GBP listing carries the **"accepts reservations" attribute** while the site and FAQ say no reservations (Dad, 1 minute).

### 3.4 How Copperline compares (Google listing + website, 12 km radius, breakfast/brunch/diner set)

| Business (town) | Rating | Reviews | GBP photos | Website | Structured data / pages |
|---|---|---|---|---|---|
| **Copperline Eatery (Chicopee)** | **4.5** | **1,106** | 238 | Astro, 36 pages | Restaurant + Menu + FAQ + breadcrumbs; llms.txt; Lighthouse 97 to 100 |
| Lucky Strike (Chicopee) | 4.3 | 1,282 | 354 | none | unclaimed listing |
| Fifties Diner (Chicopee) | 4.1 | 1,179 | 383 | basic, 4 pages | LocalBusiness + FAQ schema |
| Petros Breakfast & Lunch (Chicopee) | 4.4 | 901 | 174 | Facebook only | none |
| Jennifer's Kitchen (Chicopee) | 4.5 | 703 | 175 | Facebook only | none |
| Al's Diner (Chicopee) | 4.4 | 560 | 157 | directory stub | none |
| Fluffy Flips (Chicopee) | 5.0 | 24 | n/a | none | none (new; wins packs on proximity + 5.0) |
| Sunny Side Up (West Springfield) | 4.6 | 900 | 418 | WordPress | no business schema, no sitemap |
| Memo's (West Springfield) | 4.6 | 1,801 | 702 | Wix, has blog | LocalBusiness only; unclaimed listing |
| Little George's (West Springfield) | 4.6 | 1,226 | 400 | custom, 9 pages | Restaurant schema |
| White Hut (West Springfield) | 4.4 | 1,620 | 525 | Squarespace, 13 pages, blog | Organization/LocalBusiness |
| Crepes Tea House (Southwick) | 4.6 | 2,390 | 2,054 | Toast, 55 pages, blog | Restaurant + FAQ schema |
| Rusty's Place (Holyoke) | 4.6 | 757 | 255 | Facebook only | none |
| Egg & I (South Hadley) | 4.2 | 566 | 154 | Wix, has blog | LocalBusiness only |

Reading: on reviews and rating Copperline is top-3 in Chicopee and top-6 in the 12 km set; on GBP photos it is mid-pack (238 vs 354 to 702 for the Chicopee/West Springfield peers with more photos); on the website it is first by a distance. The two competitors that do publish content (Crepes Tea House, White Hut) are the two with the most photos and the most reviews in the set, which is the pattern to copy: photos + posts + reviews, with the site as the place the posts link to.

### 3.5 Ranked recommendations

1. **(DAD, 2 minutes) GBP website field to `https://copperlineeatery.com`** and clear the "accepts reservations" attribute. Open since July; 75% of homepage clicks still land on the http row.
2. **Ship Item 1** (board photo + shoutout + `/specials`). Turns the pipeline's weekly output into a public asset and a shareable URL.
3. **Start the weekly post-the-board loop (Tier C)** the week Item 1 ships: GBP post + Facebook/Instagram, linking to `/specials`. Dad manual or Buffer.
4. **(DAD) Register QR code to the Google review page** (existing TODO): review velocity is the pack lever Copperline controls.
5. **(DAD) Catering services section + buffet photos on GBP** (existing TODO): the "catering chicopee ma" pack is three businesses with fewer than 80 reviews each.
6. **Tier A archive + Tier B weekly posts** for 12 weeks, then measure against section 2.3.
7. **Town cluster: hold.** Re-measure 10-01. If the far CT pages are still at 0 clicks, consider consolidating them into the region hub rather than adding towns.
8. **Do not** port the TAG daily engine, add more town pages, or buy a backlink tool yet.

---

## 4. Effort summary

| Work | Claude sessions | Ian | Dad | Blocks on |
|---|---|---|---|---|
| Item 1: photo + shoutout + `/specials` | ~1.5 days | 20 min test + review | none | Q1, Q2 |
| Tier A archive | +0.5 day | none | none | Item 1 |
| Tier B weekly posts (build) | 2 to 3 days | 20 to 30 min/week ongoing | photos help | Q3, Q4 |
| Tier C distribution | 0 (manual) or 0.5 day (n8n) | none | 15 to 30 min once, then ~1 min/week | Dad's page/GBP access |
| DAD GBP items (1, 4, 5 above) | none | none | ~1 hour total | Dad |
| Re-measure | 1 h (this script set: `scripts/gsc-analytics.py` + the DataForSEO pull, ~$0.13) | | | 10-01 |

---

## 5. Decisions (Ian, 2026-08-29, same session)

- **Q1 shoutout:** the "from" blank is **free text, optional, reviewed and cleaned before publish**. Both fields optional; if the name is blank, **no credit line renders at all** (no placeholder text). Cleaning = the sanitizer in 1.2 plus the reviewer's eyes (the credit is printed in the YES-gate email and editable via the corrections reply). Assumption carried into the build: a credit renders whenever a reviewed name is present regardless of intake path; staff auto-publishes carry no name, so they show the photo only.
- **Q2:** build **`/specials`** (indexable, own title, board photo as `og:image`, nav + homepage repointed, IndexNow entry). `/menu#specials` keeps rendering the same component.
- **Q3:** **A + B + C**: specials archive, one reviewed local post a week for 12 weeks, and Dad posts the weekly board to GBP/Facebook/Instagram linking to `/specials`.
- **Q4:** **explicit merge, no auto-merge** for post PRs.

Build order: Item 1 (one PR) -> Tier A archive (same or next PR) -> Tier B engine (its own PR set) -> Tier C setup with Dad the week Item 1 ships. Tracked in `../TODO.md`.

---

*Method: GSC Search Analytics API via `scripts/gsc-analytics.py` (~/.gsc OAuth, read-only); DataForSEO SERP advanced (mobile, 4 coordinates) + Business Listings (12 km, >= 20 reviews) via `growth-engine/.env` creds, $0.13 total, raw JSON in the session scratchpad; live curl probe of 17 competitor listings' websites (platform, JSON-LD, sitemap size); `git log origin/master --grep="chore(specials)"` for pipeline usage; code read of `inbound-email.ts`, `submit-specials.ts`, `lib/specials.ts`, `DailySpecials.astro`, `submit-specials.astro`. No code or content changed by this audit.*
