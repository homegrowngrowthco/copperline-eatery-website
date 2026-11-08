// Everything the blog generator is allowed to say about the restaurant, read
// from files that already ship on the site (op #1549, blog redesign
// 2026-11-08). Ian's rule: no invented facts about the restaurant; anything
// not stated here becomes a "Please confirm" question in the draft's issue.
//
// Sources: src/data/restaurant.ts (NAP, hours, awards, alcohol note,
// GROUNDING_FACTS), src/data/menuData.json (dish names, prices,
// descriptions), src/data/specials.json (this week's board and the dated
// history), the FAQ page's Q&A schema, and the About page's own paragraphs.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const decode = (s) =>
  s
    .replace(/&amp;/g, '&')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\"/g, '"');

// FAQ answers live in the page's FAQPage JSON-LD as
// { '@type': 'Question', name: '...', acceptedAnswer: { '@type': 'Answer', text: '...' } }.
export function loadFaq(repoRoot) {
  const src = readFileSync(resolve(repoRoot, 'src/pages/faq.astro'), 'utf8');
  const re = /'@type': 'Question', name: (['"])((?:\\.|(?!\1).)*)\1, acceptedAnswer: \{ '@type': 'Answer', text: (['"])((?:\\.|(?!\3).)*)\3/g;
  const out = [];
  for (const m of src.matchAll(re)) out.push({ q: decode(m[2]), a: decode(m[4]) });
  return out;
}

// The About page's body paragraphs (long <p> lines), tags stripped.
export function loadAbout(repoRoot) {
  const src = readFileSync(resolve(repoRoot, 'src/pages/about.astro'), 'utf8');
  return [...src.matchAll(/<p>([^<]{80,})<\/p>/g)].map((m) => decode(m[1].trim()));
}

export function loadSpecials(repoRoot) {
  return JSON.parse(readFileSync(resolve(repoRoot, 'src/data/specials.json'), 'utf8'));
}

const describeInclude = (inc) => (typeof inc === 'string' ? inc : `${inc.label}: ${inc.items.join(', ')}`);

export function menuSummary(repoRoot) {
  const menuData = JSON.parse(readFileSync(resolve(repoRoot, 'src/data/menuData.json'), 'utf8'));
  return menuData.sections
    .map((s) => {
      const header = [
        `${s.name} (${s.service})`,
        s.note ? `note: ${s.note}` : '',
        s.included ? `included with every order: ${s.included.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('. ');
      const items = s.items
        .map((i) => {
          const parts = [`- ${i.name}${i.price ? ` ($${i.price})` : ''}`];
          if (i.description) parts.push(i.description);
          if (Array.isArray(i.includes) && i.includes.length) parts.push(`includes ${i.includes.map(describeInclude).join('; ')}`);
          return parts.join(': ');
        })
        .join('\n');
      const extras = s.extras?.groups
        ? `\n  ${s.extras.title} (${s.extras.note}): ${s.extras.groups.map(describeInclude).join('; ')}`
        : '';
      return `${header}\n${items}${extras}`;
    })
    .join('\n\n');
}

export async function loadRestaurant(repoRoot) {
  return import(pathToFileURL(resolve(repoRoot, 'src/data/restaurant.ts')).href);
}

// One text block with every allowed fact, labelled by source so the model
// can cite where a claim came from.
export async function groundingText(repoRoot) {
  const r = await loadRestaurant(repoRoot);
  const faq = loadFaq(repoRoot);
  const about = loadAbout(repoRoot);
  const specials = loadSpecials(repoRoot);
  const boardNow = (specials.specials ?? []).map((s) => `${s.name}${s.description ? ` (${s.description})` : ''}${s.price ? ` ${s.price}` : ''}`);
  return [
    '## restaurant.ts',
    `- Name: ${r.RESTAURANT_NAME}. Phone ${r.PHONE_DISPLAY}. Address ${r.ADDRESS.streetAddress}, ${r.ADDRESS.addressLocality}, ${r.ADDRESS.addressRegion} ${r.ADDRESS.postalCode}.`,
    `- Hours: ${r.HOURS_DISPLAY}`,
    `- Awards (the only ones): ${r.AWARDS.join('; ')}`,
    `- Alcohol: ${r.ALCOHOL_NOTE}`,
    ...r.GROUNDING_FACTS.map((f) => `- ${f}`),
    '',
    '## FAQ page (question and the answer the site gives)',
    ...faq.map((f) => `- Q: ${f.q} A: ${f.a}`),
    '',
    "## About page (the family's own words; also the voice reference)",
    ...about.map((p) => `- ${p}`),
    '',
    `## Specials board this week (specials.json, updated ${specials.updatedAt ?? 'unknown'})`,
    ...boardNow.map((s) => `- ${s}`),
    '',
    '## Full menu (menuData.json; dish names must be copied exactly)',
    menuSummary(repoRoot),
  ].join('\n');
}
