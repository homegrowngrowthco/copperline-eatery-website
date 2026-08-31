#!/usr/bin/env node
// Generates one weekly local post from a content/backlog.json topic (Tier B,
// AUDIT-GROWTH-2026-08-29.md section 2.2). Writes src/content/blog/<id>.md
// and marks the backlog entry "generated". Run scripts/blog-gates.mjs on the
// result before opening a PR; nothing here auto-merges (Q4).
//
// Usage: node scripts/generate-post.mjs --id=<backlog-id>
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BACKLOG_PATH = resolve(repoRoot, 'content/backlog.json');
const BLOG_DIR = resolve(repoRoot, 'src/content/blog');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }),
);

if (!args.id) {
  console.error('Usage: node scripts/generate-post.mjs --id=<backlog-id>');
  process.exit(1);
}

const backlog = JSON.parse(readFileSync(BACKLOG_PATH, 'utf8'));
const topic = backlog.find((t) => t.id === args.id);
if (!topic) {
  console.error(`No backlog entry with id "${args.id}". Available: ${backlog.map((t) => t.id).join(', ')}`);
  process.exit(1);
}
if (topic.status !== 'proposed') {
  console.error(`Backlog entry "${args.id}" has status "${topic.status}", not "proposed". Refusing to regenerate.`);
  process.exit(1);
}

const restaurant = await import(pathToFileURL(resolve(repoRoot, 'src/data/restaurant.ts')).href);
const menuData = JSON.parse(readFileSync(resolve(repoRoot, 'src/data/menuData.json'), 'utf8'));

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

const AVAILABLE_IMAGES = [
  { path: '/breakfast-menu.jpg', description: 'photo of the printed breakfast menu' },
  { path: '/lunch-menu.jpg', description: 'photo of the printed lunch menu' },
  { path: '/catering-breakfast.jpg', description: 'catering breakfast buffet spread' },
  { path: '/catering-menu-1.jpg', description: 'catering menu page 1' },
  { path: '/catering-menu-2.jpg', description: 'catering menu page 2' },
];

const menuSummary = menuData.sections
  .map((s) => {
    const items = s.items.map((i) => `${i.name}${i.price ? ` ($${i.price})` : ''}`).join('; ');
    return `${s.name} (${s.service}): ${items}`;
  })
  .join('\n');

const systemPrompt = `You write local SEO blog posts for The Copperline Eatery, a family-owned breakfast and lunch diner in Chicopee, MA, open since 1993. Voice: warm, direct, plainspoken diner-owner voice, not corporate marketing copy. Never write "in conclusion" or generic filler.

Hard rules, all checked deterministically after you write, so follow them exactly:
- Never use an em dash or en dash. Use commas, periods, or parentheses instead.
- Every dish name you cite must be copied EXACTLY (same capitalization and wording) from the menu list below. Do not invent dishes, prices, or menu sections.
- Every price you cite must be an exact price from the menu list below, or clearly described as your own estimate or total, never presented as a literal menu price if it is not one.
- The restaurant's phone number is ${restaurant.PHONE_DISPLAY} and address is ${restaurant.ADDRESS.streetAddress}, ${restaurant.ADDRESS.addressLocality}, ${restaurant.ADDRESS.addressRegion} ${restaurant.ADDRESS.postalCode}. Never use a different phone number or street address.
- Never fabricate testimonials, reviews, or claims about what customers say or guests love. You have no access to real reviews.
- Do not claim any award beyond: ${restaurant.AWARDS.join('; ')}.
- Target 700 to 1100 words, structured with a few h2 subheadings (## in Markdown), written as the post body only (no frontmatter, no h1, the page template renders its own h1 from the title).
- Pick exactly one image from this list and use its exact path: ${AVAILABLE_IMAGES.map((i) => `${i.path} (${i.description})`).join('; ')}.

The full current menu (grounding data, cite from this only):
${menuSummary}`;

const userPrompt = `Write a blog post for this topic:
Title direction: ${topic.title}
Angle: ${topic.angle}
Notes: ${topic.notes}

Respond with a single JSON object, no markdown fences, no commentary, matching this shape exactly:
{
  "title": string,
  "description": string (1-2 sentences, meta description length, under 160 characters),
  "image": string (exact path from the provided image list),
  "imageAlt": string,
  "dishRefs": string[] (exact dish names from the menu list that you cited in the body),
  "tags": string[] (2-4 short lowercase tags),
  "body": string (the full Markdown post body)
}`;

const anthropic = new Anthropic({ apiKey });
const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-6',
  max_tokens: 4096,
  system: systemPrompt,
  messages: [{ role: 'user', content: userPrompt }],
});

if (response.stop_reason === 'max_tokens') {
  throw new Error('Generation truncated at max_tokens; increase the budget or shorten the target length before retrying.');
}

const textBlock = response.content.find((c) => c.type === 'text');
if (!textBlock || textBlock.type !== 'text') throw new Error('No text block in response');

const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
if (!jsonMatch) throw new Error(`No JSON found in response: ${textBlock.text.slice(0, 300)}`);
const result = JSON.parse(jsonMatch[0]);

// Defensive dash strip even though the prompt forbids them (LLMs slip).
const dashFree = (s) => String(s).replace(/[–—]/g, '-');
result.title = dashFree(result.title);
result.description = dashFree(result.description);
result.body = dashFree(result.body);

if (!existsSync(BLOG_DIR)) throw new Error(`${BLOG_DIR} does not exist`);

const frontmatter = [
  '---',
  `title: ${JSON.stringify(result.title)}`,
  `description: ${JSON.stringify(result.description)}`,
  `pubDate: ${new Date().toISOString().slice(0, 10)}`,
  `image: ${JSON.stringify(result.image)}`,
  `imageAlt: ${JSON.stringify(result.imageAlt)}`,
  `dishRefs: ${JSON.stringify(result.dishRefs ?? [])}`,
  `tags: ${JSON.stringify(result.tags ?? [])}`,
  '---',
  '',
].join('\n');

const outPath = resolve(BLOG_DIR, `${topic.id}.md`);
writeFileSync(outPath, frontmatter + result.body.trim() + '\n');
console.log(`Wrote ${outPath}`);

topic.status = 'generated';
writeFileSync(BACKLOG_PATH, JSON.stringify(backlog, null, 2) + '\n');
console.log(`Updated backlog entry "${topic.id}" status -> generated. Next: npm run qa:blog-gates, then open a PR.`);
