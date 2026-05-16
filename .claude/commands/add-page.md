---
description: Scaffold a new Astro page at src/pages/<slug>.astro and append its URL to the IndexNow list in deploy.yml
argument-hint: <slug> [title] [description]
---

Scaffold a new page. Arguments: `$ARGUMENTS`.

If the user didn't pass enough arguments, ask them for:
- **slug** (kebab-case, no extension, no leading slash) — required, becomes the URL path and filename
- **title** — required, the human-readable page title (will appear as `<title>X | The Copperline Eatery</title>`)
- **description** — required, the meta description (1-2 sentences, used in `<meta name="description">` and OG/Twitter cards)

## Steps

1. **Sanity-check the slug:**
   - Match `^[a-z][a-z0-9-]*$`
   - Doesn't already exist (`src/pages/{slug}.astro` not present)
   - Not a reserved name (`404`, `index`, `menu`, `catering`, `contact`, `about`, `faq`, `sitemap-index`, `sitemap-0`)

2. **Scaffold `src/pages/{slug}.astro`** using BaseLayout. Template:

   ```astro
   ---
   import BaseLayout from '../layouts/BaseLayout.astro';
   import { SITE_URL } from '../data/restaurant';

   const title = '{title} | The Copperline Eatery';
   const description = '{description}';
   const canonical = `${SITE_URL}/{slug}`;

   const breadcrumb = {
     '@context': 'https://schema.org',
     '@type': 'BreadcrumbList',
     itemListElement: [
       { '@type': 'ListItem', position: 1, name: 'Home', item: `${SITE_URL}/` },
       { '@type': 'ListItem', position: 2, name: '{title}', item: canonical },
     ],
   };
   ---

   <BaseLayout
     title={title}
     description={description}
     canonical={canonical}
     schema={breadcrumb}
   >
     <main>
       <section class="page-header">
         <div class="container">
           <h1>{title}</h1>
           <p>TODO: subtitle</p>
         </div>
       </section>

       <section class="content-section">
         <div class="container">
           <p>TODO: page content goes here.</p>
         </div>
       </section>
     </main>
   </BaseLayout>
   ```

3. **Append the URL to the IndexNow list in `.github/workflows/deploy.yml`.** The list is a multi-line JSON array inside a bash heredoc. The reliable insertion pattern: find the line containing the current last URL (probably `"https://copperlineeatery.com/faq"`), then insert `,\n                "https://copperlineeatery.com/{slug}"` after it.

   Use the Edit tool with `old_string` matching the current last URL line including its trailing newline + closing bracket; `new_string` adding the new URL between them. Show me the diff before saving.

4. **Verify:**
   - `npm run build` — confirm 8 (or N+1) page count.
   - Confirm `dist/{slug}.html` exists.
   - Confirm the new URL appears in the auto-generated `dist/sitemap-0.xml`.
   - Confirm `deploy.yml` IndexNow list now has the new URL.

5. **Remind me** of the manual steps that still belong to me:
   - Fill in the actual content (the scaffold has TODO placeholders).
   - If this page needs richer schema (Restaurant, FAQ, etc.), extend the `schema` prop in the .astro frontmatter — pass an array to render multiple schemas.
   - Commit + push when content is ready.
   - Add a footer Quick Links entry in `src/components/Footer.astro` if appropriate.

Do NOT commit anything yourself unless I explicitly say so — this is a scaffold command, not a ship command.
