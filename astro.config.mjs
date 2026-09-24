// @ts-check
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import matter from 'gray-matter';

const SITE_URL = 'https://copperlineeatery.com';
const specialsDataPath = fileURLToPath(new URL('./src/data/specials.json', import.meta.url));
const blogDir = fileURLToPath(new URL('./src/content/blog/', import.meta.url));

// Builds date-family lastmod lookups once at config-load time (astro:content
// is not available in this file, so blog frontmatter is read directly with
// gray-matter over node:fs, matching the pattern scripts/blog-gates.mjs uses).
function loadLastmods() {
  const specials = JSON.parse(readFileSync(specialsDataPath, 'utf8'));

  // /specials/<date> archive pages: current board (dated by updatedAt) plus
  // every history entry (dated by its own "date" field).
  const archiveDates = new Map();
  if (specials.updatedAt) {
    archiveDates.set(specials.updatedAt.slice(0, 10), specials.updatedAt.slice(0, 10));
  }
  for (const entry of specials.history ?? []) {
    if (entry.date) archiveDates.set(entry.date, entry.date);
  }

  const posts = readdirSync(blogDir)
    .filter((f) => f.endsWith('.md'))
    .map((f) => {
      const { data } = matter(readFileSync(blogDir + f, 'utf8'));
      const slug = f.replace(/\.md$/, '');
      const pubDate = data.pubDate ? new Date(data.pubDate) : null;
      const updatedDate = data.updatedDate ? new Date(data.updatedDate) : null;
      const lastmod = (updatedDate ?? pubDate)?.toISOString().slice(0, 10) ?? null;
      return { slug, lastmod, pubDate };
    })
    .filter((p) => p.lastmod);

  const postLastmod = new Map(posts.map((p) => [p.slug, p.lastmod]));

  // /blog index: newest post's own date, not a build timestamp. Sort
  // descending by pubDate (missing pubDate sorts last) and take the first.
  const postsByDate = [...posts].sort((a, b) => {
    if (!a.pubDate) return 1;
    if (!b.pubDate) return -1;
    return b.pubDate.getTime() - a.pubDate.getTime();
  });

  return {
    specialsIndexLastmod: specials.updatedAt ? specials.updatedAt.slice(0, 10) : null,
    archiveDates,
    postLastmod,
    blogIndexLastmod: postsByDate[0]?.lastmod ?? null,
  };
}

const { specialsIndexLastmod, archiveDates, postLastmod, blogIndexLastmod } = loadLastmods();

export default defineConfig({
  site: SITE_URL,
  output: 'static',
  // Astro 7 defaults to compressHTML: 'jsx', which strips whitespace at
  // newline boundaries between text and inline elements (glued "Call" to the
  // phone link on /catering/quote). true = the Astro 5 behavior.
  compressHTML: true,
  trailingSlash: 'never',
  build: {
    // 'file' produces dist/<slug>.html so Netlify serves /<slug> without a
    // trailing-slash 301. Matches the URL shape the prod site has always had.
    format: 'file',
  },
  integrations: [
    sitemap({
      filter: (page) =>
        !page.endsWith('/404') &&
        !page.endsWith('/404/') &&
        !page.endsWith('/submit-specials') &&
        !page.endsWith('/submit-specials/') &&
        !page.endsWith('/catering-thanks') &&
        !page.endsWith('/catering-thanks/'),
      // Only sets lastmod for URL families with a real, sourced freshness
      // date (specials + blog). Everything else (menu, town pages, static
      // pages) is left unset: a build-time timestamp on every URL is worse
      // than no lastmod at all, because Google starts ignoring lastmod it
      // catches lying (AUDIT-SEO-2026-09-24.md section 6, fix 1).
      serialize(item) {
        const path = new URL(item.url).pathname.replace(/\/$/, '');

        if (path === '/specials') {
          if (specialsIndexLastmod) item.lastmod = specialsIndexLastmod;
          return item;
        }

        const archiveMatch = path.match(/^\/specials\/(\d{4}-\d{2}-\d{2})$/);
        if (archiveMatch) {
          const date = archiveDates.get(archiveMatch[1]);
          if (date) item.lastmod = date;
          return item;
        }

        if (path === '/blog') {
          if (blogIndexLastmod) item.lastmod = blogIndexLastmod;
          return item;
        }

        const postMatch = path.match(/^\/blog\/([^/]+)$/);
        if (postMatch) {
          const lastmod = postLastmod.get(postMatch[1]);
          if (lastmod) item.lastmod = lastmod;
          return item;
        }

        return item;
      },
    }),
  ],
});
