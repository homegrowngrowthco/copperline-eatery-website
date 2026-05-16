---
description: Re-run Lighthouse against a given URL (desktop + mobile) and diff against the pre-migration baseline
argument-hint: <url> (full URL, e.g. https://copperlineeatery.com/menu)
---

Re-run Lighthouse on `$ARGUMENTS` and compare against the pre-migration baseline at `_baseline/lighthouse-2026-05-16/`.

## Steps

1. **Parse the URL** to get a filename-safe slug (e.g., `https://copperlineeatery.com/menu` → `menu`; root `/` → `home`).
2. **Verify** the matching baseline pair exists at `_baseline/lighthouse-2026-05-16/{slug}-desktop.json` and `{slug}-mobile.json`. If not, tell me which baselines DO exist and stop — we don't want to compare a fresh page against a missing baseline.
3. **Run Lighthouse fresh** (use the same CLI invocation as the pre-flight, for apples-to-apples):
   ```
   npx lighthouse {URL} --preset=desktop --output=json --output-path=/tmp/lh-{slug}-desktop.json --quiet --chrome-flags="--headless --no-sandbox"
   npx lighthouse {URL} --output=json --output-path=/tmp/lh-{slug}-mobile.json --quiet --chrome-flags="--headless --no-sandbox"
   ```
4. **Compute deltas** for each report (use `node -pe` or a small JS one-liner):
   - Performance score (was vs now)
   - Accessibility score
   - Best Practices score
   - SEO score
   - First Contentful Paint (mobile)
   - Total Blocking Time (mobile)
5. **Present as a 2-column table**: Metric | Baseline | Now | Delta.
6. **Flag regressions** (any score that dropped, especially mobile Performance below the baseline floor; for copperline that's about-mobile at 0.57 and menu-mobile at 0.73).
7. **Also run Google's Rich Results test pointer** — print the URL `https://search.google.com/test/rich-results?url={URL}` so I can open it manually. JSON-LD validation is not scriptable without auth.

## Performance budget reminder

| Metric | Threshold |
|---|---|
| Performance (desktop) | ≥ baseline JSON value (range 0.96–0.98) |
| Performance (mobile) | ≥ baseline JSON value (range 0.57–0.77; about-mobile is the weak point at 0.57) |
| Accessibility | ≥ 0.91 |
| Best Practices | ≥ 0.95 (most pages baseline at 1.00) |
| SEO | 1.00 |

Anything below threshold gets called out explicitly. Don't bury regressions in prose.
