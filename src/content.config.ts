import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

// Weekly local-post engine (Tier B, AUDIT-GROWTH-2026-08-29.md section 2.2).
// Posts are Markdown files reviewed by Ian before merge (no auto-merge); the
// schema is intentionally minimal since scripts/blog-gates.mjs, not Zod, is
// what enforces the content-safety rules (dish/price grounding, NAP, no dashes).
const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    // Optional: set when a published post is edited after its pubDate. Read by
    // astro.config.mjs's sitemap serialize() for lastmod and by the Article
    // JSON-LD dateModified on the post page.
    updatedDate: z.coerce.date().optional(),
    // Absolute site-root path to an existing public/ image, or a /specials-board/<key>
    // path for a Tier A archive photo. blog-gates.mjs verifies it actually resolves.
    image: z.string(),
    imageAlt: z.string(),
    // Required (by blog-gates.mjs) for any photo that is not Copperline's own
    // (public/blog/, public/towns/): the attribution the license asks for,
    // rendered under the photo, and the Commons file page it links to.
    imageCredit: z.string().optional(),
    imageCreditUrl: z.string().url().optional(),
    // Plan item kind written by generate-post.mjs ('local-event',
    // 'customer-question', 'specials-extra'); blog-gates.mjs uses it.
    kind: z.string().optional(),
    // Dish names this post cites; blog-gates.mjs checks each exists in menuData.json.
    dishRefs: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { blog };
