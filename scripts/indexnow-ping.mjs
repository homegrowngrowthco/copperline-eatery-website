#!/usr/bin/env node
// Pings IndexNow with the static page list plus any dynamic URLs that exist
// at build time (today's specials archive date, published blog posts). Run
// after a prod deploy: `node scripts/indexnow-ping.mjs`.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const HOST = 'copperlineeatery.com';
const KEY = '670b4b1e5abe94d9050c77bc3a1011e2';

const STATIC_PATHS = [
  '/',
  '/menu',
  '/specials',
  '/catering',
  '/catering/quote',
  '/contact',
  '/about',
  '/faq',
  '/catering/western-massachusetts',
  '/catering/springfield-ma',
  '/catering/holyoke-ma',
  '/catering/west-springfield-ma',
  '/catering/agawam-ma',
  '/catering/westfield-ma',
  '/catering/ludlow-ma',
  '/catering/south-hadley-ma',
  '/catering/granby-ma',
  '/catering/easthampton-ma',
  '/catering/northampton-ma',
  '/catering/longmeadow-ma',
  '/catering/east-longmeadow-ma',
  '/catering/wilbraham-ma',
  '/catering/palmer-ma',
  '/catering/belchertown-ma',
  '/catering/amherst-ma',
  '/catering/hampden-ma',
  '/catering/southwick-ma',
  '/catering/monson-ma',
  '/catering/hadley-ma',
  '/catering/enfield-ct',
  '/catering/suffield-ct',
  '/catering/windsor-locks-ct',
  '/catering/east-windsor-ct',
  '/catering/somers-ct',
];

const paths = [...STATIC_PATHS];

try {
  const specials = JSON.parse(readFileSync(resolve(repoRoot, 'src/data/specials.json'), 'utf8'));
  if (specials.updatedAt) paths.push(`/specials/${specials.updatedAt.slice(0, 10)}`);
} catch (e) {
  console.warn(`indexnow: could not read specials.json (${e.message}), skipping its archive URL`);
}

const blogDir = resolve(repoRoot, 'src/content/blog');
if (existsSync(blogDir)) {
  paths.push('/blog');
  for (const f of readdirSync(blogDir)) {
    if (/\.md$/.test(f)) paths.push(`/blog/${f.replace(/\.md$/, '')}`);
  }
}

const urlList = paths.map((p) => `https://${HOST}${p}`);

const res = await fetch('https://api.indexnow.org/indexnow', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json; charset=utf-8' },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList,
  }),
});

console.log(`IndexNow response: ${res.status} (${urlList.length} URLs)`);
if (res.status !== 200 && res.status !== 202) {
  console.warn(`Warning: IndexNow returned unexpected status ${res.status}`);
}
