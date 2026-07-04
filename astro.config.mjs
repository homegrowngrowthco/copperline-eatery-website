// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://copperlineeatery.com',
  output: 'static',
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
