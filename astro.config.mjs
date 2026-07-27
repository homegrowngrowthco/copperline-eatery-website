// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://copperlineeatery.com',
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
    }),
  ],
});
