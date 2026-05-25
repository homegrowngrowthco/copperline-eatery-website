# Copperline Eatery — Website

## Purpose
Static marketing site for Copperline Eatery, a breakfast/lunch restaurant in Chicopee, MA. Engineered for SEO/local-search performance, structured data (Restaurant + Menu schemas), and Google Business Profile signals. See `STATUS.md` for the current punch list.

## Tech Stack
- **Astro 5** + **TypeScript strict** + **vanilla CSS** (no Tailwind; the existing design system in `src/styles/global.css` is the canonical source)
- `output: 'static'` + `build.format: 'file'` (produces flat `dist/<slug>.html`, served at `/<slug>` natively by Netlify without trailing-slash 301s)
- `@astrojs/sitemap` integration autogenerates sitemap at build time (filters out `/404`)
- Google Fonts (Oswald + Merriweather) via `<link>` in BaseLayout
- Netlify hosting + GitHub Actions deploy (`npm ci && npm run build && netlify deploy --dir=dist`)
- `NODE_VERSION="24"` pinned in `netlify.toml` (matches local Node 24.15)
- `netlify-cli@22` pinned in deploy workflow
- GA4 analytics (Measurement ID `G-DXYNCF0G79`); no Microsoft Clarity
- IndexNow auto-ping on every prod deploy

## Live site
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
- `public/` — served at site root as-is: favicons, `site.webmanifest`, `robots.txt`, logo.jpg, breakfast/lunch/catering menu images (jpg + webp), catering PDFs, IndexNow verification file.
- `_baseline/lighthouse-2026-05-16/*.json` — pre-migration Lighthouse reports (12 JSONs: 6 routes × desktop+mobile) kept as the performance budget reference. Astro doesn't process this folder (only `src/`).
- `netlify.toml` — build (NODE_VERSION="24"), security headers (CSP with `frame-ancestors 'none'`, HSTS, Permissions-Policy, X-Frame-Options DENY), cache rules, legacy `.html` → clean URL 301s, www → non-www redirect, trailing 404 fallback.
- `astro.config.mjs` — `site`, `output: 'static'`, `trailingSlash: 'never'`, `build.format: 'file'`, sitemap integration with the `/404` filter.
- `tsconfig.json` — extends `astro/tsconfigs/strict`; excludes `dist`, `node_modules`, `_baseline`, `site`, `scripts`.
- `.github/workflows/deploy.yml` — `actions/setup-node@v4` + `npm ci` + `npm run build` + `netlify-cli@22` deploy + IndexNow ping (prod only)
- `.claude/settings.json` (committed) — shared project allowlist for safe-default commands (git, npm, gh, netlify, curl, lighthouse).
- `.claude/settings.local.json` (gitignored) — per-machine overrides.
- `.claude/commands/` — slash commands (`/preview`, `/build-check`, `/add-page`, `/audit-seo`).
- `SECURITY.md`, `LICENSE` — vulnerability reporting policy + proprietary license.
- `STATUS.md` — running checklist of completed/remaining work (authoritative).

## External Dependencies
- Netlify (hosting + edge)
- GA4 (Measurement ID `G-DXYNCF0G79`, public)
- IndexNow protocol (Bing/Yandex; key `670b4b1e5abe94d9050c77bc3a1011e2`, public)
- Anthropic Claude API (`claude-sonnet-4-6`) — vision extraction in the specials Netlify Function
- Postmark — inbound email parsing + outbound replies for the specials pipeline
- DoorDash, Google Maps, TripAdvisor, Yelp, The Q 99.7, LinkedIn (citations / external links only — no API integration)

## Environment Variables
None for build. Deploy uses two GitHub Actions secrets:
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

The specials Netlify Function reads runtime env vars from Netlify Site Settings (not from GitHub). See `.env.example` for the full list: `ANTHROPIC_API_KEY`, `POSTMARK_SERVER_TOKEN`, `POSTMARK_WEBHOOK_USER`, `POSTMARK_WEBHOOK_PASS`, `SPECIALS_FROM_ADDRESS`, `ALLOWED_SENDER_EMAILS`, `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH`.

## Deployment
Push to `master` → GitHub Actions runs `npm ci && npm run build && netlify deploy --dir=dist --prod` then pings IndexNow with the canonical URL list. End-to-end ~1 minute.

**When adding a new page**, use the `/add-page <slug>` slash command — it scaffolds `src/pages/<slug>.astro` from the BaseLayout template and appends the URL to the IndexNow list in `deploy.yml` in one shot. The sitemap is autogenerated by `@astrojs/sitemap` and the nav/footer are shared components, so no longer-list-of-files-to-update like the pre-Astro era.

**When editing the menu**, edit `src/data/menuData.json` and run `npm run build` (or `/build-check`). No more `scripts/build-menu.py`; the menu page imports the JSON directly and renders both visible HTML and full JSON-LD Menu schema at build time.

## Data Sources
- `src/data/menuData.json` was extracted by vision from `breakfast-menu.jpg` and `lunch-menu.jpg`. See `STATUS.md` "Round 3" for context.
- All other content authored directly in `.astro` files.

## Open Questions / TODO

See `STATUS.md` "Remaining Items" — Google Business Profile setup, citation audits. Distribution/content work, not code; both are gated on Ian's dad's involvement since he owns the restaurant and holds the business-platform accounts (see memory `project_copperline_ownership.md`).

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
- Rich `STATUS.md` documenting all prior work.

**Lost:**
- Local `.claude/settings.local.json` overrides.
- Local Claude Code session history.

**Followup needed:**
- If you intend to deploy from this machine, verify `git push` works to the remote.
- Re-auth `netlify` CLI if you want local Netlify CLI access (deploys go via GH Actions, so not strictly needed).
- Rotate `NETLIFY_AUTH_TOKEN` in GitHub Actions secrets as part of post-malware rotation (see `claude_projects/ROTATION-LIST.md`).
- Verify GA4 firing on the live site.

## Session Log
### Session 7 — 2026-05-23
**Specials pipeline reply-parsing bugs (commits `8536a5d`, `e543fc2`) + first real specials publish (`43259a4`).** User submitted photo + corrections + YES; got back a blank email; site not updated. Diagnosed two distinct bugs in the inbound function's reply parser; both fixed in same-day deploys; 8 specials now live on `/menu` for the first time since the pipeline shipped in Session 3.

**Diagnosis from Netlify Function logs:**
- 11:40:55 / 720ms = empty-body branch hit (Gmail sent HTML-only reply with no `TextBody`).
- 11:47:38 / 7350ms = vision call (new photo round).
- 11:48:21 / 2356ms = Haiku corrections call (legitimate edits round).
- 12:03:55 / 2970ms = YES attempt reinterpreted as corrections because the body string `"yes\n\nOn Sat, May 23, 2026 at 11:48 AM <bot>\nwrote:"` (len 86) failed the YES_PATTERN due to incomplete quote-stripping.

**Bug 1 (commit `8536a5d`) — HTML-only inbound replies:** Some mail clients send replies with only `HtmlBody` populated. Function read only `TextBody`, hit the empty-body branch, sent "I got an empty reply" message which threaded under the user's existing conversation in Gmail and appeared blank in the user's inbox view. Fix: new `htmlToText()` regex helper (strips style/script blocks, converts block closers + `<br>` to newlines, decodes common entities). New `extractReplyBody()` prefers `TextBody`, falls back to `htmlToText(HtmlBody)`. Also added mobile-signature stripping to `stripEmailQuoting` for iPhone/iPad/Android/Galaxy/Get Outlook footers (which don't use the standard `-- ` separator and were polluting parsed bodies). Added `console.log(\`Reply body (batch=..., len=N): ...\`)` to every confirmation-reply invocation — this log surfaced Bug 2 in the next deploy.

**Bug 2 (commit `e543fc2`) — "On <date>, <sender> wrote:" attribution not stripped without trailing newline:** The Gmail attribution line was supposed to be stripped by the existing regex `\n+On .{0,200}wrote:\s*\n`, but: (a) `.{0,200}` doesn't span newlines (Gmail wraps long attributions across two lines), and (b) when `wrote:` ends up as the last line of the body after `>`-quoted lines are stripped, there is no trailing newline. Fix: `\n+On [\s\S]{0,300}?wrote:[ \t]*\n?` uses `[\s\S]` to span newlines, non-greedy `{0,300}?`, and makes the trailing `\n` optional. Also added an Outlook "From:" / "-----Original Message-----" header strip in case of Outlook MIME quirks.

**First successful publish (auto-commit `43259a4`):** 8 specials live on `/menu` via the `<DailySpecials />` component at build time. Verified via curl on the live site. One source-image typo flagged to user for next correction round: "Rueben" → "Reuben".

**Blank-email mystery partially unresolved.** Every code path post-parse sends a non-empty body by construction (verified by reading every branch). User reported truly blank content even after expanding "trimmed content" in Gmail. Best theory: client-side rendering bug specific to threaded specials-bot replies (multiple "Updated specials" previews collapsing in a way that hides the latest). Not pursued further once Bug 2 unblocked publishing. If it recurs, ask user to forward + inspect "Show original" headers + raw MIME.

**Revert paths:**
- `git revert e543fc2 && git push` — reverts the regex fix only. Would re-introduce Bug 2 for Gmail/Apple Mail replies.
- `git revert 8536a5d && git push` — reverts the HtmlBody fallback only. Would re-introduce Bug 1 for HTML-only mail clients.
- `git revert 43259a4 && git push` — resets `src/data/specials.json` to empty `{ "updatedAt": null, "specials": [] }`. Site rebuilds with no specials.

### Session 6 — 2026-05-22 (later same day)
**Schema enrichment + home description rewrite + footer redesign + catering mobile button fix.** Bundle of SEO + UX work after the user asked whether a Gemini-suggested Restaurant JSON-LD snippet would improve "Springfield area" AI discoverability. Single feature commit `5ee2ac3`; docs commit `d045236`.

**Assessment of Gemini's snippet:** the user's existing Restaurant schema was already richer than what Gemini proposed (Gemini's draft missed `aggregateRating`, `review`, `award`, `sameAs`, `openingHoursSpecification`, `knowsAbout`, and had a `telePhone` typo + rougher geo coordinates). Adopted only the one valid idea: typing `areaServed` entries as `AdministrativeArea` objects instead of bare strings. Also added the four genuinely missing factual fields. Framed for the user: schema alone does not get a restaurant into "best breakfast in Springfield" AI answers — Google Business Profile, editorial mentions, citations, and on-page geographic prose are the real levers.

**Schema enrichment (`src/data/restaurant.ts` + `src/pages/index.astro` + `src/pages/about.astro`):**
- `AREA_SERVED` upgraded from a bare string array to typed `AdministrativeArea` objects; added West Springfield, South Hadley, Pioneer Valley (8 entries total, up from 5).
- New `PAYMENT_ACCEPTED` ("Cash, Credit Card, Visa, Mastercard, American Express, Discover") and `CURRENCIES_ACCEPTED` ("USD") constants sourced from FAQ Q20.
- Restaurant schema on index + about pages gains `paymentAccepted`, `currenciesAccepted`, `acceptsReservations: false` (boolean, not the string "False"), `hasMenu: ${SITE_URL}/menu`.

**Home meta + descriptions rewritten (`src/pages/index.astro`):** page meta description, OG description, Restaurant schema description, and WebSite schema description all rewritten to lead with the user's preferred dish list (eggs benedict, homemade corned beef hash, banana bread French toast) and demote the previous "homemade eggs benedict, corned beef hash, hollandaise sauce, brunch, lunch & catering" string the user flagged. Grep confirmed the problematic copy was only in `index.astro`.

**About-page location anchor (`src/pages/about.astro`):** new paragraph inserted between the existing signature-dishes paragraph and the closing thank-you paragraph: "Located at 409 Broadway in Chicopee, we proudly serve guests from across the Pioneer Valley, including Springfield, Holyoke, West Springfield, South Hadley, and all of Hampden County. Whether you're driving in from downtown Springfield for our award-winning eggs benedict, picking up catering for an event in Holyoke, or visiting from anywhere in Western Massachusetts, you'll find a warm welcome and a meal worth the trip." On-page geographic prose for LLMs that read rendered content rather than just schema.

**Catering mobile button overflow (`src/styles/global.css`):** bug — at <=640px, the "Download Catering Order Form" button label extended beyond the button on both sides. Root cause: the global mobile `.btn` rule applied `flex: 1` + `white-space: nowrap` + `display: flex`, combined with a long label. Fix: scoped those mobile overrides to `.cta-buttons .btn` only (the home-page hero CTA row), since they were never meant for other CTA contexts. Added a separate `.catering-cta-row .btn` block with `white-space: normal`, `max-width: 100%`, `padding: 12px 18px`, `font-size: 0.85rem` so labels wrap inside the button on narrow screens.

**Footer redesign (`src/components/Footer.astro` + `src/styles/global.css`):** user reported the footer took >50% of the mobile viewport. Was 6 stacked sections (Name+Address, Hours, Contact, Quick Links, Follow Us, Find Us Online) × ~4 lines each. Reworked to a 4-column grid (NAP, Hours, Contact, Explore) plus a single inline Connect bar with Facebook · Instagram · Yelp · TripAdvisor · Yellow Pages between thin dividers. Padding tightened (40/20 → 28/14 desktop, 25/15 → 20/12 mobile); h3 1.1rem → 0.95rem; body 0.95 → 0.9 desktop and 0.85 → 0.82 mobile. Mobile uses 2-col grid; <380px collapses to single column. Class renames: `footer-content` → `footer-grid`; `footer-section` → `footer-col`; new `footer-list` for the Explore links; new `footer-connect` block. Old `.email-btn` styling preserved for `/contact`.

**Verification:** post-deploy curl confirmed live: new meta description, `acceptsReservations":false` (boolean serialization correct), 8 `AdministrativeArea` entries in JSON-LD, `/catering` returns 200, `footer-grid` class present in rendered DOM.

**Revert path:** `git revert 5ee2ac3 && git push` reverts the whole bundle (5 files: Footer.astro, restaurant.ts, about.astro, index.astro, global.css). The `d045236` docs commit is doc-only and safe to keep or revert independently.

### Session 5 — 2026-05-22 (later same day)
**Specials pipeline enhancements + font self-hosting.** Two unrelated work tracks shipped as separate commits same day, after Session 4 morning's robots.txt fix.

**Specials function (`netlify/functions/inbound-email.ts`, commit `46e7608`):**
- **Threaded replies.** Outbound replies now set `In-Reply-To` + `References` (RFC 2822) referencing the inbound `MessageID`. Gmail threads the YES-gate confirmation into the original photo email's conversation, so staff can scroll up to see the source photo whenever they need to reference it.
- **Free-form natural-language edit-via-reply.** Reply branch distinguishes YES (publish + cleanup), NO/decline keyword (discard + cleanup), and anything else (corrections). Corrections call Haiku 4.5 with current specials JSON + staff reply, apply edits, write a new pending blob with a fresh `batchId`, send a corrected confirmation threaded to staff's reply. Loops until publish or discard. Quoted-previous-message text stripped before pattern-matching + Claude call.
- **Opportunistic orphan purge.** Top of every handler invocation (after auth + sender check) lists `pending-specials` blobs, deletes any with `createdAt` >24h old.
- Vision call stays on Sonnet 4.6 (image-in-text-out). Corrections call uses Haiku 4.5 (structured text-in-text-out). Right-sized per `feedback_right_size_models.md` memory.

Daily auto-expiry of specials themselves intentionally NOT implemented — ops cadence (boards update Fridays, run until sold out mid-week, new Thursday) doesn't fit an `updatedAt`-based time check.

**Font self-hosting (`src/layouts/BaseLayout.astro` + `netlify.toml`, commit `6ca3237`):**
- `@fontsource/oswald` + `@fontsource/merriweather` ESM imports in BaseLayout replace the Google Fonts `<link>` + 2 preconnects. Latin subset only (validated: only non-ASCII in source is `é` in `menuData.json`, U+00E9, included in latin subset). Vite bundles 7 woff2 files (4 Oswald + 3 Merriweather weights) into `/_astro/` with hashed filenames + existing immutable cache headers.
- CSP tightened: `style-src` drops `https://fonts.googleapis.com`; `font-src` is now `'self'` only.
- Same fonts, same weights, served from self; removes 2 external DNS lookups per page load.

**Revert paths:**
- `git revert 46e7608 && git push` — reverts specials function to Session 3 state. Corrections become declines, no threading, no orphan purge.
- `git revert 6ca3237 && git push` — reverts fonts back to Google Fonts CDN (re-loosens CSP in same commit).

**Postmark FROM revert complete** (commit `d0b6b69`, empty-commit redeploy). Postmark account approval landed this session; user flipped `SPECIALS_FROM_ADDRESS` in Netlify Site Settings from the workaround `specials-bot@homegrowngrowth.co` back to canonical `specials-bot@parse.copperlineeatery.com`; empty commit forced the Netlify Function to pick up the new env var (per `reference_netlify_function_envvars_redeploy.md` memory). Reply-To header constant in code stays — harmless when From and Reply-To match.

### Session 4 — 2026-05-22
**Sitemap discovery fix (robots.txt + 301 for legacy `/sitemap.xml`).** User asked about 7 GSC "Page with redirect" entries; diagnosed those as informational (HTTP→HTTPS + legacy `.html` → clean-URL 301s working correctly, no fix needed). While inspecting, found `public/robots.txt` was still advertising `https://copperlineeatery.com/sitemap.xml` (404 — Astro's `@astrojs/sitemap` generates `sitemap-index.xml` not `sitemap.xml`). Stale since Astro 5 migration on 2026-05-16. Same bug class HGC Session 7 fixed earlier same day; caught here by the `feedback_robots_sitemap_after_migration.md` memory saved at that session's close ~6h prior. Two changes in commit `e31ba08`:

- `public/robots.txt` — `Sitemap:` line `/sitemap.xml` → `/sitemap-index.xml`.
- `netlify.toml` — added 301 `from = "/sitemap.xml"` → `to = "/sitemap-index.xml"` (force=true) in the legacy-301 block before the www→non-www rule, so old GSC/Bing entries land on the right file.

`STATUS.md` Session 4 entry was bundled into the same commit. GH Actions deployed clean.

**Manual follow-up in GSC** (user action): Sitemaps → remove `sitemap.xml` → submit `sitemap-index.xml`. The 7 "Page with redirect" entries that triggered the diagnostic age out on their own; no code action.

**Revert path**: `git revert e31ba08 && git push` reverts the robots.txt + netlify.toml + project STATUS.md in one shot. Would re-introduce the 404 sitemap discovery; don't actually revert.

### Session 3 — 2026-05-18
**Automated daily-specials pipeline shipped end-to-end** + same-day configuration journey through Postmark constraints + credentials rotation. Replaces the prior Google Sheets gviz client-side fetch (now removed) with a real email pipeline that bakes specials into static HTML.

**Pipeline (feature commit `4af2b9a`):**
- `netlify/functions/inbound-email.ts` — web-standard `Request`/`Response` handler. Validates Basic auth, allowlists `From` against `ALLOWED_SENDER_EMAILS`, branches on `In-Reply-To` (new-photo vs YES-reply).
- New-photo branch: validates image (JPEG/PNG/GIF/WebP, max 5 MB), calls Claude `claude-sonnet-4-6` vision, parses + validates JSON, stores pending batch in Netlify Blobs `pending-specials` keyed by UUID, sends Postmark reply with `Message-ID: <batch-{uuid}@copperlineeatery.com>` asking for YES.
- Reply branch: extracts UUID from `In-Reply-To`, loads pending blob, on YES commits `src/data/specials.json` via Octokit + GitHub Contents API, deletes blob, sends published confirmation. Non-YES deletes blob and sends declined note.
- `src/components/DailySpecials.astro` reads `src/data/specials.json` at build time, renders inline empty state if absent. Bakes specials into static HTML (indexable, no JS fetch).
- `[functions]` block added to `netlify.toml`; `--functions=netlify/functions` flag added to `deploy.yml`; ~80 lines of Sheet-fetch JS stripped from `main.ts`; `docs.google.com` removed from CSP `connect-src`.

**Same-day post-ship configuration (5 follow-up deploys to land):**
- `0c350b8` — discovered Netlify Functions bake env vars at deploy time. Env vars set AFTER first deploy meant the function returned 401 with correct creds. Empty-commit redeploy is the fix. Saved as reference memory `reference_netlify_function_envvars_redeploy.md`.
- `4c9d4ca` — user initially used the Postmark **Account API Token** instead of the **Server API Token**. Symptom: `InvalidAPIKeyError statusCode 401 code 10` in function logs. Fix: corrected token + redeploy.
- `2e3e120` — Postmark new accounts are in pending approval, restricted to "recipient domain must equal sender domain" (`ApiInputError statusCode 422 code 412`). Workaround: switch `SPECIALS_FROM_ADDRESS` env var to `specials-bot@homegrowngrowth.co` (hgc.com also verified in Postmark) + add `Reply-To: specials-bot@parse.copperlineeatery.com` constant in function code so YES replies still route through the parse-subdomain inbound MX (not hgc.com which uses Google Workspace MX).
- `e4b2821` — cleanup commit after `2e3e120` accidentally swept `Screenshots/netlify_postmark_screenshot.jpg` (containing `POSTMARK_WEBHOOK_USER`/`POSTMARK_WEBHOOK_PASS` in plaintext) and `Today's Specials List.eml` to the public repo via `git add -A`. Removed from HEAD, added `Screenshots/` + `*.eml` to `.gitignore`. Old values remain in git history of `2e3e120`. Webhook credentials rotated in Netlify env vars + Postmark webhook URL. Saved feedback memory `feedback_never_git_add_dash_a.md`.
- `afdefb8` — empty-commit redeploy after webhook credentials rotation.

**Verification:**
- Curl probes confirmed every state: rotated creds work, old creds inert, allowlist accepts `ian@homegrowngrowth.co`, reply-send works (probes triggered real "no image found" replies that landed in inbox).
- User sent real test email from `ian@homegrowngrowth.co` with photo attached; bot replied with extracted specials. User did NOT reply YES (test photo was outdated specials); `src/data/specials.json` remains in initial empty state `{"updatedAt": null, "specials": []}`.

**Current state / pending follow-ups:**
- **Postmark account approval pending.** When it lands: revert `SPECIALS_FROM_ADDRESS` env var back to `specials-bot@parse.copperlineeatery.com` (cleaner brand) + empty-commit redeploy. Reply-To header stays in code (harmless when From and Reply-To match).
- **Orphan pending batches** from probes are sitting in Netlify Blobs `pending-specials` store with no TTL. Harmless (can't be confirmed without a matching In-Reply-To). Manual purge possible via Netlify dashboard.
- **3 enhancement proposals deferred** pending user pickup: (1) free-form natural-language edit mechanism in reply (Claude re-parses corrections, loops to YES); (2) include extracted-from image inline at top of confirmation reply for visual validation; (3) daily auto-expiry (component renders empty state if `updatedAt` >18h old + scheduled GH Action rebuilds at 5 UTC daily). Recommended bundle order: 2+3 first (small, no UX changes for staff), then 1.

**Commits on master (chronological):** `4af2b9a` (feat) → `0c350b8` (redeploy env vars) → `4c9d4ca` (redeploy server token fix) → `2e3e120` (feat: Reply-To, accidentally included screenshot+eml) → `e4b2821` (chore: untrack + gitignore) → `afdefb8` (redeploy: rotated webhook creds). 6 prod deploys verified green. **Revert path**: `git revert <sha>` per commit; the function can be fully disabled at runtime by clearing Netlify env vars without any code change. To restore the Google Sheet flow: revert `4af2b9a`.

### Session 1 — 2026-05-05
- Recovered from machine wipe; CLAUDE.md created.
- `.gitignore` rewritten cleanly.

### Session 2 — 2026-05-16
**Astro 5 migration, end-to-end.** Site moved from raw static HTML/CSS/JS deployed via `nwtgck/actions-netlify@v3` onto the same Astro 5 stack as homegrowngrowth.co (which shipped its own migration earlier the same day). Live-site behavior unchanged — same 7 routes, same content, same URL shape (clean, no trailing slash).

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

**CSP audit finding** confirmed before migration: Clarity is NOT in use on copperline (script-src only allows googletagmanager + google-analytics). The Clarity fix from the open-questions TODO is N/A.

**Deleted:** `site/` (whole tree), `scripts/build-menu.py`, `scripts/`, `sitemap.xml` (autogenerated).

**Revert path:** Netlify dashboard → previous prod deploy → "Publish deploy" (instant rollback) — THEN `git revert -m 1 <merge-sha>` AND revert `netlify.toml` build config in the same commit to keep repo state in sync with rolled-back deploy.

**Same-day security follow-up (commit `fed3dbb`, evening of 2026-05-16):** GitHub secret scanning flagged a Google Maps JS API key in `_baseline/lighthouse-2026-05-16/contact-{mobile,desktop}.json` (the baseline captured in op #136 above). Investigation confirmed it's Google's own referrer-restricted Maps embed key, captured by Lighthouse from the `google.com/maps/embed?pb=...` iframe on `/contact` — not Copperline's secret. Scrubbed all 39 occurrences (19 mobile + 20 desktop) across the 2 baseline JSONs, replacing with literal `REDACTED_GOOGLE_EMBED_KEY`. Source/build untouched; site output byte-identical. Existing alert at commit `e635575` remains in git history; manual UI dismissal as false positive is the disposition (history rewrite via `git filter-repo` not worth the disruption for a referrer-bound key). Revert: `git revert fed3dbb`.

### Session 3 — 2026-05-16 (later same day)
**Automated daily specials pipeline.** Replaced the Google Sheets gviz client-side fetch with: Postmark inbound email -> Netlify Function (`netlify/functions/inbound-email.ts`) -> Claude `claude-sonnet-4-6` vision extraction -> Netlify Blobs pending state -> YES-gated email confirmation -> GitHub Contents API commit to `src/data/specials.json` -> Astro rebuild bakes specials into static HTML. New `<DailySpecials />` component reads the JSON at build time so the specials are indexable rather than JS-fetched. Added `[functions]` block to `netlify.toml`, `--functions=netlify/functions` to the GH Actions deploy step, and `.env.example` documenting the 9 new runtime env vars (set in Netlify Site Settings, not GitHub). Stripped ~80 lines of Sheet code from `main.ts` and dropped `https://docs.google.com` from the CSP `connect-src`. See `STATUS.md` 2026-05-16 for full setup notes and revert path. New runtime deps: `@anthropic-ai/sdk`, `@netlify/blobs`, `@netlify/functions`, `@octokit/rest`, `postmark`.
