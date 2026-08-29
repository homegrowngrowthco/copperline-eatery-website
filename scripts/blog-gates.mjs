#!/usr/bin/env node
// Deterministic safety gates for the weekly local-post engine (Tier B, see
// AUDIT-GROWTH-2026-08-29.md section 2.2). These are checks, not a prompt
// rule, because the generator is an LLM and prompt rules get ignored under
// pressure (see memory feedback_deterministic_sanitizer_over_prompt).
//
// HARD gates fail the run (CI blocks the PR): missing frontmatter, an em/en
// dash, an image that does not exist, a dishRef not in menuData.json, or a
// phone number that is not the restaurant's real one.
// SOFT gates only warn (a human still reviews every post before merge,
// per Q4's no-auto-merge decision): dollar amounts that do not match a known
// menu price, and testimonial-style phrasing the script cannot source.
//
// Usage: node scripts/blog-gates.mjs [file.md ...]  (defaults to every post
// in src/content/blog/).

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BLOG_DIR = resolve(repoRoot, 'src/content/blog');
const CANONICAL_PHONE_DIGITS = '4135948332';
const CANONICAL_STREET = '409 Broadway';
const REQUIRED_FIELDS = ['title', 'description', 'pubDate', 'image', 'imageAlt'];

function loadMenuItems() {
  const data = JSON.parse(readFileSync(resolve(repoRoot, 'src/data/menuData.json'), 'utf8'));
  const items = [];
  for (const section of data.sections) {
    for (const item of section.items) items.push(item);
  }
  return items;
}

function checkPost(filePath, menuItems) {
  const errors = [];
  const warnings = [];
  const raw = readFileSync(filePath, 'utf8');
  const { data: fm, content: body } = matter(raw);
  const fileLabel = basename(filePath);

  for (const field of REQUIRED_FIELDS) {
    if (fm[field] === undefined || fm[field] === null || fm[field] === '') {
      errors.push(`${fileLabel}: missing required frontmatter field "${field}"`);
    }
  }

  if (/[–—]/.test(raw)) {
    errors.push(`${fileLabel}: contains an em or en dash (house rule: commas/periods/parens only)`);
  }

  if (typeof fm.image === 'string') {
    if (fm.image.startsWith('/specials-board/')) {
      if (!/^\/specials-board\/\d{4}-\d{2}-\d{2}-[\w-]+\.\w+$/.test(fm.image)) {
        errors.push(`${fileLabel}: image "${fm.image}" does not look like a real specials-board key`);
      }
    } else if (fm.image.startsWith('/')) {
      if (!existsSync(resolve(repoRoot, 'public', fm.image.slice(1)))) {
        errors.push(`${fileLabel}: image "${fm.image}" does not exist in public/`);
      }
    } else {
      errors.push(`${fileLabel}: image "${fm.image}" must be a site-root absolute path (starts with "/")`);
    }
  }

  const menuNames = new Set(menuItems.map((i) => i.name.toLowerCase()));
  for (const dish of fm.dishRefs ?? []) {
    if (!menuNames.has(String(dish).toLowerCase())) {
      errors.push(`${fileLabel}: dishRefs entry "${dish}" not found in menuData.json`);
    }
  }

  const phoneMatches = body.match(/\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g) ?? [];
  for (const m of phoneMatches) {
    const digits = m.replace(/\D/g, '');
    if (digits.length === 10 && digits !== CANONICAL_PHONE_DIGITS) {
      errors.push(`${fileLabel}: phone number "${m}" does not match the restaurant's real number`);
    }
  }

  const streetMatches = body.match(/\b\d{1,5}\s+[A-Za-z][A-Za-z\s]{2,25}\b(?:Street|St\.?|Ave\.?|Avenue|Road|Rd\.?|Broadway|Blvd\.?|Boulevard|Drive|Dr\.?)\b/g) ?? [];
  for (const m of streetMatches) {
    if (!m.toLowerCase().startsWith(CANONICAL_STREET.toLowerCase())) {
      warnings.push(`${fileLabel}: possible address "${m}" does not match "${CANONICAL_STREET}" (verify by hand)`);
    }
  }

  const menuPriceStrings = new Set(menuItems.filter((i) => i.price).map((i) => `$${i.price}`));
  const dollarMatches = body.match(/\$\d{1,4}(?:\.\d{2})?/g) ?? [];
  for (const m of dollarMatches) {
    if (!menuPriceStrings.has(m)) {
      warnings.push(`${fileLabel}: dollar amount "${m}" is not a literal menu price (fine if it's a computed total or estimate; verify by hand)`);
    }
  }

  const testimonialPhrases = [
    'customers say',
    'our guests love',
    'reviews show',
    'according to our customers',
    'one customer said',
    'guests tell us',
    'people rave about',
  ];
  const lowerBody = body.toLowerCase();
  for (const phrase of testimonialPhrases) {
    if (lowerBody.includes(phrase)) {
      warnings.push(`${fileLabel}: contains unsourceable testimonial-style phrasing ("${phrase}"); verify or cut`);
    }
  }

  return { errors, warnings };
}

const args = process.argv.slice(2);
const files = args.length > 0
  ? args.map((f) => resolve(repoRoot, f))
  : existsSync(BLOG_DIR)
    ? readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md')).map((f) => resolve(BLOG_DIR, f))
    : [];

if (files.length === 0) {
  console.log('blog-gates: no posts to check.');
  process.exit(0);
}

const menuItems = loadMenuItems();
let failed = false;
for (const file of files) {
  const { errors, warnings } = checkPost(file, menuItems);
  for (const e of errors) {
    console.error(`FAIL: ${e}`);
    failed = true;
  }
  for (const w of warnings) {
    console.warn(`warn: ${w}`);
  }
  if (errors.length === 0) console.log(`ok: ${basename(file)} passed all hard gates`);
}

process.exit(failed ? 1 : 0);
