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
    // Absolute site-root path to an existing public/ image, or a /specials-board/<key>
    // path for a Tier A archive photo. blog-gates.mjs verifies it actually resolves.
    image: z.string(),
    imageAlt: z.string(),
    // Dish names this post cites; blog-gates.mjs checks each exists in menuData.json.
    dishRefs: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { blog };
