#!/usr/bin/env node
// Lists scheduled posts that became due in the last N days (default 7), for
// the weekly publish job in .github/workflows/weekly-post.yml (op #1549).
// A post is due when its pubDate has passed (src/lib/publish-window.mjs);
// the production build only includes it after a rebuild on or after that
// date, which is what the weekly job does. Prints "due=<count>" to
// $GITHUB_OUTPUT when that is set.
import { readFileSync, readdirSync, appendFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const blogDir = resolve(repoRoot, 'src/content/blog');
const daysArg = process.argv.find((a) => a.startsWith('--days='));
const days = daysArg ? Number(daysArg.split('=')[1]) : 7;
const now = Date.now();
const from = now - days * 86400000;

const due = readdirSync(blogDir)
  .filter((f) => f.endsWith('.md'))
  .map((f) => ({ f, pubDate: new Date(matter(readFileSync(resolve(blogDir, f), 'utf8')).data.pubDate) }))
  .filter(({ pubDate }) => pubDate.getTime() > from && pubDate.getTime() <= now);

for (const d of due) console.log(`due: ${d.f} (pubDate ${d.pubDate.toISOString().slice(0, 10)})`);
console.log(`${due.length} post(s) became due in the last ${days} day(s).`);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `due=${due.length}\n`);
