#!/usr/bin/env node
// Generates one weekly local post from a content/backlog.json topic (Tier B,
// AUDIT-GROWTH-2026-08-29.md section 2.2). Writes src/content/blog/<id>.md
// and marks the backlog entry "generated". Run scripts/blog-gates.mjs on the
// result before opening a PR; nothing here auto-merges (Q4).
//
// Two-pass generation, modeled on theautomationsguide's proven "draft then
// humanize" n8n pipeline: a first pass drafts the post, a second pass rewrites
// it against a banned-phrase list and cadence rules. A single prompt asking
// an LLM not to sound like an LLM does not work reliably; a dedicated second
// pass whose only job is deleting slop and varying rhythm does better (see
// memory feedback_deterministic_sanitizer_over_prompt).
//
// Usage: node scripts/generate-post.mjs --id=<backlog-id> [--force]
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { BANNED_PHRASES } from './lib/content-rules.mjs';

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
  console.error('Usage: node scripts/generate-post.mjs --id=<backlog-id> [--force]');
  process.exit(1);
}

const backlog = JSON.parse(readFileSync(BACKLOG_PATH, 'utf8'));
const topic = backlog.find((t) => t.id === args.id);
if (!topic) {
  console.error(`No backlog entry with id "${args.id}". Available: ${backlog.map((t) => t.id).join(', ')}`);
  process.exit(1);
}
if (topic.status !== 'proposed' && !args.force) {
  console.error(`Backlog entry "${args.id}" has status "${topic.status}", not "proposed". Pass --force to regenerate anyway.`);
  process.exit(1);
}

const restaurant = await import(pathToFileURL(resolve(repoRoot, 'src/data/restaurant.ts')).href);
const menuData = JSON.parse(readFileSync(resolve(repoRoot, 'src/data/menuData.json'), 'utf8'));

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) throw new Error('ANTHROPIC_API_KEY not set');

// catering-menu-1.jpg/2.jpg are deliberately excluded: they're an old scanned
// price sheet that's $1/package cheaper than menuData.json's real catering
// prices (found 2026-08-31 when a generated post cited the real price right
// next to the stale photo). Unused anywhere else on the site for the same
// reason. breakfast-menu.jpg and lunch-menu.jpg were spot-checked against
// menuData.json and are current as of 2026-08-31.
const AVAILABLE_IMAGES = [
  { path: '/breakfast-menu.jpg', description: 'photo of the printed breakfast menu' },
  { path: '/lunch-menu.jpg', description: 'photo of the printed lunch menu' },
  { path: '/catering-breakfast.jpg', description: 'catering breakfast buffet spread' },
];

const menuSummary = menuData.sections
  .map((s) => {
    const items = s.items.map((i) => `${i.name}${i.price ? ` ($${i.price})` : ''}`).join('; ');
    return `${s.name} (${s.service}): ${items}`;
  })
  .join('\n');

const draftSystemPrompt = `You write local blog posts for The Copperline Eatery, a family-owned breakfast and lunch diner in Chicopee, MA, open since 1993.

Hard rules, checked deterministically after you write, so follow them exactly:
- Never use an em dash or en dash. Use commas, periods, or parentheses instead.
- Every dish name you cite must be copied EXACTLY (same capitalization and wording) from the menu list below. Do not invent dishes, prices, or menu sections.
- Every price you cite must be an exact price from the menu list below, or clearly described as your own estimate or total, never presented as a literal menu price if it is not one.
- The restaurant's phone number is ${restaurant.PHONE_DISPLAY} and address is ${restaurant.ADDRESS.streetAddress}, ${restaurant.ADDRESS.addressLocality}, ${restaurant.ADDRESS.addressRegion} ${restaurant.ADDRESS.postalCode}. Never use a different phone number or street address.
- Never fabricate testimonials, reviews, or claims about what customers say or guests love. You have no access to real reviews.
- Do not claim any award beyond: ${restaurant.AWARDS.join('; ')}.
- Write 600 to 1000 words as the post body only, in Markdown, a few ## subheadings (no frontmatter, no h1, the page template renders its own h1 from the title). Do not pad to hit a word count; a shorter post that says something specific beats a longer one that restates itself.
- Pick exactly one image from this list and use its exact path: ${AVAILABLE_IMAGES.map((i) => `${i.path} (${i.description})`).join('; ')}.

This is a first draft. Do not worry about polishing the voice, a second pass handles that. Just get the real facts (dishes, prices, structure) right.

The full current menu (grounding data, cite from this only):
${menuSummary}`;

const draftUserPrompt = `Write a first-draft blog post for this topic:
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

async function callClaude(system, user, maxTokens) {
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system,
    messages: [{ role: 'user', content: user }],
  });
  if (response.stop_reason === 'max_tokens') {
    throw new Error('Generation truncated at max_tokens; increase the budget or shorten the target length before retrying.');
  }
  const textBlock = response.content.find((c) => c.type === 'text');
  if (!textBlock || textBlock.type !== 'text') throw new Error('No text block in response');
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error(`No JSON found in response: ${textBlock.text.slice(0, 300)}`);
  return JSON.parse(jsonMatch[0]);
}

console.log('Drafting...');
const draft = await callClaude(draftSystemPrompt, draftUserPrompt, 4096);

const humanizeSystemPrompt = `You are a sharp editor. You rewrite AI-drafted diner blog posts so they sound like the actual family that has run The Copperline Eatery in Chicopee, MA since 1993 wrote them: plainspoken, specific, opinionated, told like they'd tell a regular customer, not written like marketing copy.

DELETE these words and phrases anywhere they appear, and rewrite the sentence around their absence rather than leaving an awkward gap: ${BANNED_PHRASES.join(', ')}.

Other rules:
- Never use the rhetorical pattern "We're not X, we're Y" or "We keep it X and we keep it Y" or any similar parallel-structure sincerity statement. State the actual fact plainly instead.
- Cut any sentence that is generically reassuring without adding new information (a sentence that would still be true if you swapped in any other restaurant's name). Every sentence should say something only true of this specific place, this specific dish, or this specific situation.
- If there's a generic bullet-point FAQ block ("things to think about before you call"), either cut it or turn it into one or two specific, concrete sentences instead. Only keep a bulleted list if the content is genuinely a sequence or a real enumerated set of options.
- Vary sentence length on purpose. Mix short, blunt sentences with longer ones in the same paragraph. A one-line paragraph for emphasis is fine, use it sparingly.
- Never use an em dash or en dash. Use commas, periods, or parentheses instead.
- Do not change any dish name, price, phone number, or address. Do not add new factual claims (no new awards, no new dates, no new numbers) beyond what the draft already states.
- Keep the same rough length. Do not pad.

Respond with a single JSON object, no markdown fences, no commentary: { "title": string, "description": string, "body": string }`;

const humanizeUserPrompt = `Rewrite this draft.

TITLE: ${draft.title}
DESCRIPTION: ${draft.description}
BODY:
${draft.body}`;

console.log('Humanizing...');
const humanized = await callClaude(humanizeSystemPrompt, humanizeUserPrompt, 4096);

const result = {
  ...draft,
  title: humanized.title || draft.title,
  description: humanized.description || draft.description,
  body: humanized.body || draft.body,
};

// Defensive dash strip even though both passes forbid them (LLMs slip).
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
