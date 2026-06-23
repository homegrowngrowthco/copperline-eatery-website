// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://copperlineeatery.com',
  output: 'static',
  trailingSlash: 'never',
  // Astro 7 changed the compressHTML default from `true` to `'jsx'`, which strips
  // whitespace between inline elements and can subtly alter rendered text spacing.
  // Pin it back to the v6 behavior so the upgrade is output-preserving.
  compressHTML: true,
  build: {
    // 'file' produces dist/<slug>.html so Netlify serves /<slug> without a
    // trailing-slash 301. Matches the URL shape the prod site has always had.
    format: 'file',
  },
  integrations: [
    sitemap({
      filter: (page) => !page.endsWith('/404') && !page.endsWith('/404/'),
    }),
  ],
});
