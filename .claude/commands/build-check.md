---
description: Run a full production build locally and serve it via Astro preview to sanity-check the output
---

Run the prod build locally and serve `dist/` so I can verify what would actually ship:

1. `npm run build` — produce `dist/`.
2. Report: page count, total build time, any warnings/errors.
3. List `dist/` contents (top-level only) so I can confirm:
   - Every expected `*.html` file is present (7 routes total: index, menu, catering, contact, about, faq, 404).
   - `_astro/` directory has the bundled CSS/JS.
   - Public assets (favicons, manifest, robots.txt, menu images/PDFs, IndexNow key, logo.jpg) are at root.
   - `sitemap-index.xml` + `sitemap-0.xml` were generated.
4. Start `npm run preview` in the background and print the localhost URL.
5. Curl the homepage from the preview URL and grep for `<title>` and the bundled CSS link to confirm the page renders.

If the build fails, stop and report the error verbatim. Don't try to "fix" build errors without surfacing them first.

If the prod CSS bundle path or sitemap is missing from `dist/`, something is wrong with `astro.config.mjs` or the page imports — flag it.
