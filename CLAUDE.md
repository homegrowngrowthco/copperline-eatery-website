# Copperline Eatery — Website

This file is an index: state, a pointer, no history, no counts. Detail is on demand and leaves with its task.
Narrative goes to the session log (`docs/SESSION_LOG.md`), never here. (Tier rule from the markdown hygiene audit, op #1357, 2026-10-21.)

## Purpose
Static marketing site for Copperline Eatery, a breakfast/lunch restaurant in Chicopee, MA. Engineered for SEO/local-search performance, structured data (Restaurant + Menu schemas), and Google Business Profile signals. Live state in `STATUS.md`; full history in `docs/SESSION_LOG.md`; open tasks in `../TODO.md`.

## Tech Stack
- **Astro 7** + **TypeScript strict** + **vanilla CSS** (no Tailwind; the existing design system in `src/styles/global.css` is the canonical source). `compressHTML: true` is load-bearing: Astro 7's default `'jsx'` whitespace mode glues text to inline elements written on separate source lines (Session 29); don't remove it.
- `output: 'static'` + `build.format: 'file'` (produces flat `dist/<slug>.html`, served at `/<slug>` natively by Netlify without trailing-slash 301s)
- `@astrojs/sitemap` integration autogenerates sitemap at build time (filters out `/404`)
- Google Fonts (Oswald + Merriweather) via `<link>` in BaseLayout
- Netlify hosting + GitHub Actions deploy (`npm ci && npm run build && netlify deploy --dir=dist`)
- `NODE_VERSION="24"` pinned in `netlify.toml` (matches local Node 24.15)
- `netlify-cli@22` pinned in deploy workflow
- GA4 analytics (Measurement ID `G-DXYNCF0G79`) + Microsoft Clarity (project `x7y38jzmw3`, heatmaps + session recordings); both deferred to browser idle for CWV
- IndexNow auto-ping on every prod deploy

## Live site / current state (2026-11-10)
- Production: https://copperlineeatery.com
- GitHub: https://github.com/homegrowngrowthco/copperline-eatery-website
- Default branch: `master`
- Blog engine live since 2026-11-10 (PR #29, op #1549 design): the "Weekly Local Post" workflow is enabled, drafts next month's posts on the 20th as draft PRs for Ian, and publishes Mondays. A merged post stays hidden until its `pubDate`. What is live vs waiting on Ian: `STATUS.md` and the open draft PRs (`gh pr list`).

## Key Files & Folders
- `src/pages/`: one file per URL (`git ls-files src/pages` lists them), plus dynamic route families: `specials/[date].astro` (one page per archived board, `getStaticPaths()` over `specials.json`'s `history[]` plus the current board), `blog/[slug].astro` (one page per live post in `src/content/blog/`), `catering/[town].astro` (the town catering pages) and `llms.txt.ts` (build-time `llms.txt`).
- `src/layouts/BaseLayout.astro` — full `<head>` (charset/viewport, GA4 inline script, title/description, geo meta, canonical, favicons, manifest, OG/Twitter, JSON-LD via JsonLd component, Google Fonts); body with Nav, `<slot />`, Footer, bundled `main.ts`. Props: `title`, `description`, `canonical`, `ogType?`, `ogTitle?`, `ogDescription?`, `ogImage?`, `ogImageAlt?`, `twitterTitle?`, `twitterDescription?`, `noindex?`, `schema?`, `hideNavCanonical?`.
- `src/components/` — `Nav.astro` (header with logo, nav links, social icons, DoorDash button, mobile menu toggle; active class via `Astro.url.pathname`), `Footer.astro` (6-column footer), `JsonLd.astro` (single or array, with `</script>` XSS-escape), `MenuSection.astro` (renders one menu section: header + items + extras; same HTML structure the prior `scripts/build-menu.py` produced).
- `src/data/restaurant.ts` — NAP, hours, phone, email, geo, sameAs, aggregateRating, awards, area served, `ALCOHOL_NOTE` (beer/wine license, mimosas run as an occasional special, not a standing menu item; added 2026-08-31 after a generated blog post wrongly claimed no liquor license). Single source of truth for the Restaurant schema fields and blog-generator grounding facts reused across pages. `HOURS_DISPLAY` + `GROUNDING_FACTS` (added 2026-09-06) are the COMPLETE list of non-menu facts the generator may state; anything about cooking, the room, staff, or dish history is invented unless it is written there.
- `src/data/menuData.json` — 22 sections, 153 menu items + dietary flags + signature markers. Imported by `src/pages/menu.astro` at build time; the page renders both the visible HTML and full JSON-LD Menu schema from this file.
- `src/styles/global.css` — single shared stylesheet (was `site/styles.css` pre-migration). Imported once in `BaseLayout.astro`; Vite bundles, hashes, and emits to `/_astro/*.css`.
- `src/scripts/main.ts` — mobile menu, reviews carousel, menu tabs, GA4 click event tracking (`click_phone`, `click_email`, `click_doordash`, `click_directions`, `download_pdf`). TypeScript strict.
- `src/components/DailySpecials.astro` — renders the current specials at build time from `src/data/specials.json`: text list always; a `board` photo (left, via `/specials-board/<key>`) and a `credit` "Thank you X from Y" line render only when those optional fields are present. Empty state inline. Used on `/specials` and `/menu#specials`.
- `src/pages/specials.astro` — indexable specials page (own title, board photo as `og:image` when present) plus a "Past Specials Boards" list linking the last 12 archived dates; nav + homepage link here, `/menu#specials` still renders the same component.
- `src/pages/specials/[date].astro` — one page per archived board (Tier A, shipped 2026-08-31): reuses `DailySpecials.astro` via its optional `data` prop so the archive markup never drifts from the live page.
- `src/data/specials.json` — current live specials + optional `board` (`{key, contentType}`), `credit` (`{name, from?}` or `null`), `source` (`'customer' | 'staff'`), and `history` (`HistoryEntry[]`, capped 52, most-recent-first) fields, all additive (an older file without them still renders text-only). Written by the shared `commitSpecialsToRepo()` in `netlify/functions/lib/specials.ts` via the GitHub Contents API after a YES confirmation; each publish archives the outgoing board into `history` before overwriting. Edit by hand only as a fallback (not the normal path).
- `src/content.config.ts` + `src/content/blog/*.md`: the blog's content collection; the frontmatter schema is in `src/content.config.ts`.
- `src/lib/publish-window.mjs`: the one rule for scheduled posts: a production build leaves out every post whose `pubDate` is in the future (blog pages, homepage, `llms.txt`, sitemap lastmod). PR builds and `SHOW_FUTURE_POSTS=1` show them.
- `src/pages/blog/index.astro` + `src/pages/blog/[slug].astro` — post list and detail pages.
- Blog engine (PR #29, op #1549; the old generator, backlog and workflow are in `_archive/2026-11-08/`): `scripts/research-events.mjs` (real local events within 25 miles of 01020, sources checked against what the search returned), `scripts/plan-month.mjs` (one post per Monday, events and customer questions from `content/backlog.json`, a seed list Ian can edit; a specials post is only an optional extra), `scripts/generate-post.mjs` (restaurant facts only from `scripts/lib/grounding.mjs`, anything else becomes a "Please confirm" question; a fact-check pass cuts unsupported sentences), `scripts/lib/claude.mjs` (API calls; the model id lives here), `scripts/draft-bodies.mjs` (draft PR and needs-ian issue bodies), `scripts/due-posts.mjs` (posts that became due, for the publish job). Treat any generated draft as a starting point, not copy.
- `scripts/blog-gates.mjs` (`npm run qa:blog-gates`): deterministic post gates; the rules and their thresholds are in the file and `scripts/lib/content-rules.mjs`. Hard-fails include missing frontmatter, an em/en dash, a missing or denylisted image, a `dishRefs` entry not in `menuData.json`, a wrong phone number, contrast constructions and unsourced claims; posts dated from 2026-11-09 also fail on an hours block, a repeated address or phone, or the word cap.
- `.github/workflows/weekly-post.yml` ("Weekly Local Post", enabled 2026-11-10): two jobs. `draft-month` (the 20th, or dispatch): research, plan, draft, gate, then one **draft PR** per post plus one needs-ian issue per PR in claude-projects-ops; merging a PR approves its post, nothing auto-merges. `publish` (Mondays): rebuilds and deploys master when a post became due. Secrets (names only): `ANTHROPIC_API_KEY`, `NETLIFY_AUTH_TOKEN`, `NETLIFY_SITE_ID`, `OPS_REPO_TOKEN`. Its header comment still says "disabled"; that comment is stale.
- `netlify/functions/lib/specials.ts` — shared by both intake functions: Claude vision extraction, `storeBoardPhoto()` (persists the reviewed photo to the `specials-boards` Blobs store at publish), `commitSpecialsToRepo()`, `sanitizeCredit()`/`formatCredit()` (the optional shoutout, blank name = no credit line, ever), `parseCorrectionResult()` (lets an email reply add/change/remove the credit via natural language; an unrelated correction preserves the existing one).
- `netlify/functions/specials-board.ts` — serves a stored board photo at `/specials-board/<key>` with an immutable cache header (Netlify Functions v2 `config.path` routing).
- `netlify/functions/inbound-email.ts` — Postmark inbound webhook. Validates Basic auth, allowlists sender, calls Claude vision, stores pending batch in Netlify Blobs, sends YES-gated confirmation reply, publishes (photo + optional credit) via `lib/specials.ts` on YES.
- `netlify/functions/submission-created.ts` — Netlify form-submission event function (filename is the trigger). Sends `catering-quote` submissions as a short email + attached PDF that replicates the on-site print sheet (`lib/quote-pdf.ts`, pdf-lib + fontkit, brand fonts/logo from `lib/assets.ts`) via Postmark from `QUOTE_FROM_ADDRESS` (Reply-To = customer); ignores all other forms.
- `public/` — served at site root as-is: favicons, `site.webmanifest`, `robots.txt`, logo.jpg, breakfast/lunch/catering menu images (jpg + webp), catering PDFs, IndexNow verification file.
- `_baseline/lighthouse-2026-05-16/*.json` — pre-migration Lighthouse reports (12 JSONs: 6 routes × desktop+mobile) kept as the performance budget reference. Astro doesn't process this folder (only `src/`).
- `netlify.toml` — build (NODE_VERSION="24"), security headers (CSP with `frame-ancestors 'none'`, HSTS, Permissions-Policy, X-Frame-Options DENY), cache rules, legacy `.html` → clean URL 301s, www → non-www redirect, trailing 404 fallback.
- `astro.config.mjs` — `site`, `output: 'static'`, `trailingSlash: 'never'`, `build.format: 'file'`, sitemap integration with the `/404` filter.
- `tsconfig.json` — extends `astro/tsconfigs/strict`; excludes `dist`, `node_modules`, `_baseline`, `site`, `scripts`.
- `.github/workflows/deploy.yml` — `actions/setup-node@v6` + `npm ci` + `npm run build` + `netlify-cli@22` deploy + `node scripts/indexnow-ping.mjs` (prod only).
- `scripts/indexnow-ping.mjs` — pings IndexNow with the static page list plus the current `/specials/<date>` archive URL and every `/blog/<slug>` post, read from disk at deploy time.
- `.claude/settings.json` (committed) — shared project allowlist for safe-default commands (git, npm, gh, netlify, curl, lighthouse).
- `.claude/settings.local.json` (gitignored) — per-machine overrides.
- `.claude/commands/` — slash commands (`/preview`, `/build-check`, `/add-page`, `/audit-seo`, `/seo-audit`).
- `audits/` — archived audit reports (`copperline_audit_report.md` 2026-06-22, `AUDIT-GROWTH-2026-07-03.md`, `AUDIT-SEO-2026-07-07.md`, `AUDIT-GROWTH-2026-08-29.md` = re-measure + scope for the specials-board rework and content stream, `AUDIT-SEO-2026-09-24.md` = full audit + ranked fixes, with raw `local-pack-<date>.json` pulls for the next diff).
- `docs/SESSION_LOG.md` — the single append-only session history (see Documentation Conventions below).
- `scripts/` — `gsc-analytics.py` (GSC 28d pull, `~/.gsc` OAuth), `local-pack-check.mjs` (DataForSEO local pack from 4 coordinates + 12 km competitor listings, ~$0.15, `node --env-file=../../growth-engine/.env scripts/local-pack-check.mjs`; a pull from the restaurant's own coordinates alone is proximity-biased), `seo-crawl.mjs`, `lint-docs.mjs` (docs guardrail, `npm run qa:docs`), `fn-check.mjs` (Netlify-function bundle + handler smoke, `npm run qa:functions` — run after any dependency or function change), `embed-fn-assets.mjs` (regenerates `netlify/functions/lib/assets.ts` — base64 brand fonts + logo for the quote PDF; rerun after @fontsource bumps or logo changes).
- `SECURITY.md`, `LICENSE` — vulnerability reporting policy + proprietary license.
- `STATUS.md` — short live-state snapshot (deployed URL, what is live vs in flight); NOT a history file.

## External Dependencies
- Netlify (hosting + edge)
- GA4 (Measurement ID `G-DXYNCF0G79`, public)
- Microsoft Clarity (project `x7y38jzmw3`, public; heatmaps + session recordings, idle-loaded)
- IndexNow protocol (Bing/Yandex; key `670b4b1e5abe94d9050c77bc3a1011e2`, public)
- Anthropic Claude API: vision extraction in the specials Netlify Function (model id in `netlify/functions/lib/specials.ts`) and the blog engine (model id in `scripts/lib/claude.mjs`)
- Postmark — inbound email parsing + outbound replies for the specials pipeline
- DoorDash, Google Maps, TripAdvisor, Yelp, The Q 99.7, LinkedIn (citations / external links only — no API integration)

## Environment Variables
None for build. Deploy uses two GitHub Actions secrets:
- `NETLIFY_AUTH_TOKEN`
- `NETLIFY_SITE_ID`

The Netlify Functions read runtime env vars from Netlify Site Settings (not from GitHub). See `.env.example` for the full list: `ANTHROPIC_API_KEY`, `POSTMARK_SERVER_TOKEN`, `POSTMARK_WEBHOOK_USER`, `POSTMARK_WEBHOOK_PASS`, `SPECIALS_FROM_ADDRESS`, `ALLOWED_SENDER_EMAILS`, `REVIEWER_EMAILS`, `QUOTE_NOTIFY_EMAILS`, `QUOTE_FROM_ADDRESS`, `GITHUB_TOKEN`, `GITHUB_REPO`, `GITHUB_BRANCH`.

## Deployment
Push to `master` → GitHub Actions runs `npm ci && npm run build && netlify deploy --dir=dist --prod` then pings IndexNow with the canonical URL list. End-to-end ~1 minute.

**When adding a new page**, use the `/add-page <slug>` slash command — it scaffolds `src/pages/<slug>.astro` from the BaseLayout template and appends the URL to the IndexNow list in `deploy.yml` in one shot. The sitemap is autogenerated by `@astrojs/sitemap` and the nav/footer are shared components, so no longer-list-of-files-to-update like the pre-Astro era.

**When editing the menu**, edit `src/data/menuData.json` and run `npm run build` (or `/build-check`). No more `scripts/build-menu.py`; the menu page imports the JSON directly and renders both visible HTML and full JSON-LD Menu schema at build time.

## Data Sources
- `src/data/menuData.json` was extracted by vision from `breakfast-menu.jpg` and `lunch-menu.jpg`. See `docs/SESSION_LOG.md` (2026-04-27 Round 3) for context.
- All other content authored directly in `.astro` files.

## Deliberate non-fixes

Open tasks live in [../TODO.md](../TODO.md) (todo-sync); most are gated on Ian's dad, who owns the restaurant and holds the business-platform accounts. Closed tech debt (Astro 5 migration, Netlify config merge, CSP `frame-ancestors`, cache-bust retirement, breadcrumbs, WebP) is in [docs/SESSION_LOG.md](docs/SESSION_LOG.md). Kept as-is on purpose:

- **`public/logo.jpg` has no `.webp` twin**: closed as "not worth the diff". If one is ever added, wrap it in a `<picture>` with the `.jpg` fallback and keep the `.jpg` for `og:image` (Facebook and X don't all consume `.webp`).
- **`'unsafe-inline'` in `script-src` and `style-src`** — removing requires per-build SHA-256 hashing of all inline JSON-LD blocks + Astro's bundled module scripts, with a custom build step to inject hashes into the netlify.toml CSP header on every deploy. ~2–4 hour focused task that doesn't unblock a specific user-facing security threat (static marketing site, no user-generated content, no auth surface). Astro 5's `experimental.csp` doesn't help — SSR-only, ships CSP via meta tag not header, won't work with our `output: 'static'` setup. Revisit when there's a specific compliance/audit driver.
- **Self-hosting Google Fonts** — Oswald + Merriweather still load from fonts.googleapis.com. CSP already permits the necessary origins. Self-hosting would save one DNS lookup but adds build complexity. Defer.
- **Branch protection on `master`** — explicitly skipped while solo. Friction cost is real, security benefit is near-zero on a static marketing site with no secrets in the repo. Revisit if a collaborator joins.

## Recovery Notes
This project survived the **2026-05-04** complete machine wipe.

**Preserved:**
- Full git history on GitHub.
- Live production site at copperlineeatery.com (untouched).
- GitHub Actions secrets (Netlify token + site ID — stored in GitHub, never local).
- Rich `STATUS.md` documenting all prior work (that history now lives in `docs/SESSION_LOG.md`).

**Lost:**
- Local `.claude/settings.local.json` overrides.
- Local Claude Code session history.

**Followup needed:**
- If you intend to deploy from this machine, verify `git push` works to the remote.
- Re-auth `netlify` CLI if you want local Netlify CLI access (deploys go via GH Actions, so not strictly needed).
- Rotate `NETLIFY_AUTH_TOKEN` in GitHub Actions secrets as part of post-malware rotation (see `claude_projects/ROTATION-LIST.md`).
- Verify GA4 firing on the live site.

## Documentation & Logging Conventions
- **`docs/SESSION_LOG.md` is the ONLY session history.** At session close, write ONE entry there (20 lines or fewer: what shipped, commit SHAs, how verified, revert path, gotchas), newest first. Never duplicate the entry into this file or STATUS.md.
- **STATUS.md is a live-state snapshot only** (25 lines or fewer): deployed URL, what is live vs in flight, pointers. Update it in place; move nothing into it.
- **This file stays evergreen** (purpose, stack, key files, conventions). No session history here; keep it under ~150 lines.
- **Audit reports go in `audits/`** with a dated filename; mark superseded ones RESOLVED at the top.
- **Open tasks live only in `../TODO.md`** (todo-sync format, synced to Notion). Check items off there; purge stale `[x]` rows.
- **Guardrail:** `npm run qa:docs` (`scripts/lint-docs.mjs`; its header lists every check) fails if CLAUDE.md exceeds 400 lines, `../TODO.md` still contains `[x]` items, the dated current-state heading above is more than 14 days behind the latest code change, or the latest code commit's short SHA is still missing from `docs/SESSION_LOG.md` after 14 days. Run it before committing doc changes.
- No em or en dashes in newly authored text (hard rule; commas/periods/parens instead).

## Key Credentials & IDs (public identifiers only — secret NAMES, never values)

| Item | Value |
|------|-------|
| Google Analytics Measurement ID | G-DXYNCF0G79 |
| Microsoft Clarity project | x7y38jzmw3 |
| IndexNow Key (public by protocol design) | 670b4b1e5abe94d9050c77bc3a1011e2 |
| Netlify Auth Token | GitHub secret: `NETLIFY_AUTH_TOKEN` |
| Netlify Site ID | GitHub secret: `NETLIFY_SITE_ID` |

## Decision queue (cross-project, since 2026-10-15, op #1297)

Anything that needs Ian (a decision, a click, a secret) is a GitHub issue on `homegrowngrowthco/claude-projects-ops` labelled `needs-ian` plus `project:copperline`; never a "NEEDS FROM IAN" block in a prompt file, never a Slack DM, never an `@ian` TODO tag (convert any you meet into an issue and drop the tag). A new issue rings Ian once in Slack `#claude-inbox`; every session start prints the open list. A session acts only on its own project's issues plus `[ops]`; Ian may answer on GitHub (comment, issue left open), then the next session for this project does the follow-up and closes it with a `[claude op #N] done:` comment. Rules and the gh commands: workspace root `CLAUDE.md`, section "The decision queue". Cloud routines for this project, if any, report the same way.
