---
description: Start the Astro dev server in the background and print the localhost URL
---

Start the Astro dev server for live local development:

1. Run `npm run dev` in the background (use the Bash tool with `run_in_background: true`).
2. Read the background task output until Astro prints the "Local" URL (usually `http://localhost:4321/`).
3. Print that URL back to me so I can open it in a browser.
4. Leave the dev server running. I'll kill it when I'm done; don't try to clean it up on your own.

Notes:
- Astro hot-reloads on file changes in `src/`, so once it's running I can edit and the browser refreshes.
- If port 4321 is in use, Astro will pick the next free port — report whatever it actually used.
- If `node_modules/` isn't present yet, run `npm install` first.
