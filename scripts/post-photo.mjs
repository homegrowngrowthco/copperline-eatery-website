#!/usr/bin/env node
// Sets a blog post's photo to a freely licensed Wikimedia Commons file (op #1715).
// For a post drafted before the photo rule, or when Ian names a better photo
// than the one the generator found. Downloads the 1200 px rendering to
// public/blog/<post>.jpg and writes image, imageAlt, imageCredit and
// imageCreditUrl into the post's frontmatter.
//
// Usage: node scripts/post-photo.mjs --post=<id> (--file="File:Name.jpg" | --query="search words")
//          [--alt="alt text"] [--kind=local-event] [--apply]
// Without --apply it only prints what it found and changes nothing.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findPhoto, getFile, downloadPhoto, creditLine } from './lib/commons-photo.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }),
);

if (!args.post || !(args.file || args.query)) {
  console.error('Usage: node scripts/post-photo.mjs --post=<id> (--file="File:Name.jpg" | --query="words") [--alt="..."] [--kind=local-event] [--apply]');
  process.exit(1);
}
const postPath = resolve(repoRoot, 'src/content/blog', `${args.post}.md`);
if (!existsSync(postPath)) {
  console.error(`No post at ${postPath}`);
  process.exit(1);
}

const photo = args.file ? await getFile(args.file) : await findPhoto([args.query]);
if (!photo) {
  console.error('No usable photo (needs CC0, public domain, CC BY or CC BY-SA, a JPEG, landscape, at least 1000 px wide).');
  process.exit(1);
}
const alt = args.alt || photo.title.replace(/^File:/, '').replace(/\.\w+$/, '').replace(/[_-]+/g, ' ').trim();
const fields = {
  image: `/blog/${args.post}.jpg`,
  imageAlt: alt,
  imageCredit: creditLine(photo),
  imageCreditUrl: photo.descriptionUrl,
  ...(args.kind ? { kind: args.kind } : {}),
};
console.log(`${photo.title} (${photo.width}x${photo.height})`);
for (const [k, v] of Object.entries(fields)) console.log(`  ${k}: ${v}`);
if (!args.apply) {
  console.log('Dry run: nothing changed. Add --apply to download the photo and update the post.');
  process.exit(0);
}

await downloadPhoto(photo, resolve(repoRoot, 'public/blog', `${args.post}.jpg`));
const raw = readFileSync(postPath, 'utf8');
const end = raw.indexOf('\n---', 4);
let fm = raw.slice(0, end);
const body = raw.slice(end);
for (const [k, v] of Object.entries(fields)) {
  const line = `${k}: ${JSON.stringify(v)}`;
  const re = new RegExp(`^${k}:.*$`, 'm');
  fm = re.test(fm) ? fm.replace(re, line) : fm.replace(/^(imageAlt:.*)$/m, `$1\n${line}`);
}
writeFileSync(postPath, fm + body);
console.log(`Updated ${postPath} and wrote public/blog/${args.post}.jpg`);
