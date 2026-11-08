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
//        node scripts/generate-post.mjs --dry-run   (no API call; exercises
//        the title/description cap enforcement against fixtures and exits
//        non-zero if any case misbehaves)
import Anthropic from '@anthropic-ai/sdk';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
  BANNED_PHRASES,
  findContrastPatterns,
  findUnsourcedClaims,
  CONTRAST_PATTERN_HARD_LIMIT,
  TITLE_MAX_CHARS,
  DESCRIPTION_MIN_CHARS,
  DESCRIPTION_MAX_CHARS,
} from './lib/content-rules.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BACKLOG_PATH = resolve(repoRoot, 'content/backlog.json');
const BLOG_DIR = resolve(repoRoot, 'src/content/blog');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }),
);

// Defensive dash strip even though every pass forbids them (LLMs slip).
const dashFree = (s) => String(s).replace(/[\u2013\u2014]/g, '-');

// ---------------------------------------------------------------------------
// Metadata cap enforcement (added 2026-10-01). The 2026-09-28 cron run
// (36469814544) drafted a 72-char title; blog-gates.mjs rejected it, which
// is the gate doing its job, but the generator had never been told the cap
// and had no way to recover, so the week's post was simply lost. Now the
// cap is (1) stated in both prompts and (2) enforced here: if the title is
// still over TITLE_MAX_CHARS after the humanize pass, ask the model ONCE
// for a shorter one, and if that is still too long, fail loudly before any
// file is written. Never truncate: a title cut mid-word is worse than no
// post, and the gate would pass it.
// ---------------------------------------------------------------------------
function metadataProblems(title, description) {
  const problems = [];
  if (title.length > TITLE_MAX_CHARS) {
    problems.push(`title is ${title.length} chars, over the ${TITLE_MAX_CHARS}-char cap`);
  }
  if (description.length < DESCRIPTION_MIN_CHARS || description.length > DESCRIPTION_MAX_CHARS) {
    problems.push(
      `description is ${description.length} chars, outside the ${DESCRIPTION_MIN_CHARS}-${DESCRIPTION_MAX_CHARS} range`,
    );
  }
  return problems;
}

// `retry` is an async ({ title, description, problems }) => { title?,
// description? } so the real run can hand in a Claude call and --dry-run can
// hand in a stub. Returns { title, description, retried }. Throws when the
// title is still over the cap after the single retry; a description still
// out of range only warns, matching the gate (soft there, two legacy posts).
async function fitMetadata({ title, description, retry, log = console }) {
  const problems = metadataProblems(title, description);
  if (!problems.length) return { title, description, retried: false };

  log.warn(`Metadata out of range after humanize: ${problems.join('; ')}. Asking the model once for a shorter version (never truncating).`);
  const fixed = await retry({ title, description, problems });
  const pick = (candidate, fallback) =>
    typeof candidate === 'string' && candidate.trim() ? dashFree(candidate.trim()) : fallback;
  const next = {
    title: pick(fixed?.title, title),
    description: pick(fixed?.description, description),
  };

  const remaining = metadataProblems(next.title, next.description);
  const titleProblem = remaining.find((p) => p.startsWith('title'));
  if (titleProblem) {
    throw new Error(
      `${titleProblem} after one retry: "${next.title}". Refusing to truncate mid-word and refusing to write the post, so this fails here instead of at blog-gates. Shorten the "title" direction for this topic in content/backlog.json (it steers the drafted title) and re-run.`,
    );
  }
  for (const p of remaining) {
    log.warn(`warn: ${p} after the retry; blog-gates.mjs will soft-warn the same and a reviewer should trim it.`);
  }
  return { ...next, retried: true };
}

// --dry-run: exercises fitMetadata against fixtures with a stubbed retry, no
// API key, no backlog read, no file writes. Exit 0 when every case behaves.
async function runDryRun() {
  // The exact title the 2026-09-28 cron run produced (72 chars).
  const LONG_TITLE = 'Corporate Breakfast Catering in Springfield: What Offices Actually Order';
  const SHORT_TITLE = 'Corporate Breakfast Catering in Springfield';
  const OK_DESC = 'What offices around Springfield order from us for a morning meeting, and how to get a quote sized to your headcount.';
  const LONG_DESC = `${OK_DESC} We deliver to Springfield, Chicopee, Holyoke, and West Springfield.`;
  const quiet = { warn: () => {} };
  const neverCalled = () => {
    throw new Error('retry was called but should not have been');
  };

  // Fixture sanity so a case cannot pass for the wrong reason.
  const pre = [
    [LONG_TITLE.length > TITLE_MAX_CHARS, `LONG_TITLE must exceed ${TITLE_MAX_CHARS} (is ${LONG_TITLE.length})`],
    [SHORT_TITLE.length <= TITLE_MAX_CHARS, `SHORT_TITLE must fit (is ${SHORT_TITLE.length})`],
    [OK_DESC.length >= DESCRIPTION_MIN_CHARS && OK_DESC.length <= DESCRIPTION_MAX_CHARS, `OK_DESC must be in range (is ${OK_DESC.length})`],
    [LONG_DESC.length > DESCRIPTION_MAX_CHARS, `LONG_DESC must exceed ${DESCRIPTION_MAX_CHARS} (is ${LONG_DESC.length})`],
  ];
  for (const [ok, msg] of pre) {
    if (!ok) {
      console.error(`FAIL: fixture: ${msg}`);
      return 1;
    }
  }

  const cases = [
    {
      name: 'in-range title and description pass through untouched, no retry',
      input: { title: SHORT_TITLE, description: OK_DESC, retry: neverCalled },
      expect: (r) => !r.retried && r.title === SHORT_TITLE && r.description === OK_DESC,
    },
    {
      name: `${LONG_TITLE.length}-char title (the 2026-09-28 failure) is fixed by one retry, output is the retry text verbatim`,
      input: { title: LONG_TITLE, description: OK_DESC, retry: async () => ({ title: SHORT_TITLE, description: OK_DESC }) },
      expect: (r) => r.retried && r.title === SHORT_TITLE && !r.title.includes('...'),
    },
    {
      name: 'title still over the cap after the retry fails loudly, nothing truncated',
      input: { title: LONG_TITLE, description: OK_DESC, retry: async () => ({ title: `${LONG_TITLE} and More` }) },
      expectThrow: /over the 65-char cap after one retry/,
    },
    {
      name: 'retry returning a blank title falls back to the original and still fails loudly',
      input: { title: LONG_TITLE, description: OK_DESC, retry: async () => ({ title: '   ' }) },
      expectThrow: new RegExp(`${LONG_TITLE.length} chars, over the ${TITLE_MAX_CHARS}-char cap after one retry`),
    },
    {
      name: 'em dash in the retry text is normalized, title length re-measured after that',
      input: { title: LONG_TITLE, description: OK_DESC, retry: async () => ({ title: 'Corporate Breakfast Catering \u2014 Springfield' }) },
      expect: (r) => r.retried && r.title === 'Corporate Breakfast Catering - Springfield',
    },
    {
      name: 'out-of-range description alone triggers the retry and is accepted when fixed',
      input: { title: SHORT_TITLE, description: LONG_DESC, retry: async () => ({ title: SHORT_TITLE, description: OK_DESC }) },
      expect: (r) => r.retried && r.description === OK_DESC,
    },
    {
      name: 'description still out of range after the retry only warns (soft, matches the gate)',
      input: { title: SHORT_TITLE, description: LONG_DESC, retry: async () => ({ title: SHORT_TITLE, description: LONG_DESC }) },
      expect: (r) => r.retried && r.title === SHORT_TITLE && r.description === LONG_DESC,
    },
  ];

  let failures = 0;
  for (const c of cases) {
    try {
      const r = await fitMetadata({ ...c.input, log: quiet });
      if (c.expectThrow) {
        failures++;
        console.error(`FAIL: ${c.name}: expected a throw, got ${JSON.stringify(r)}`);
      } else if (!c.expect(r)) {
        failures++;
        console.error(`FAIL: ${c.name}: unexpected result ${JSON.stringify(r)}`);
      } else {
        console.log(`ok: ${c.name}`);
      }
    } catch (err) {
      if (c.expectThrow && c.expectThrow.test(err.message)) {
        console.log(`ok: ${c.name}`);
      } else {
        failures++;
        console.error(`FAIL: ${c.name}: ${c.expectThrow ? 'threw the wrong message' : 'threw unexpectedly'}: ${err.message}`);
      }
    }
  }
  console.log(failures ? `${failures} dry-run case(s) failed` : `All ${cases.length} dry-run cases passed (title cap ${TITLE_MAX_CHARS}, description ${DESCRIPTION_MIN_CHARS}-${DESCRIPTION_MAX_CHARS}).`);
  return failures ? 1 : 0;
}

if (args['dry-run']) {
  process.exit(await runDryRun());
}

if (!args.id) {
  console.error('Usage: node scripts/generate-post.mjs --id=<backlog-id> [--force]   or   --dry-run');
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

// Full item descriptions, package contents, and section notes are passed
// through on purpose. Until 2026-09-06 this list carried names and prices
// only, so the model had nothing to say about a dish except what it guessed,
// and it guessed: the Copperline Special became "two eggs, homefries, toast,
// and a choice of meat" (it is three eggs, two pancakes, homefries, toast),
// the hash became "diced potatoes and seasoned meat" (it is corned beef hash),
// and the lunch buffet packages became a breakfast spread of "eggs and
// homefries". The description IS the only thing the model may say about a dish.
const describeInclude = (inc) =>
  typeof inc === 'string' ? inc : `${inc.label}: ${inc.items.join(', ')}`;
const menuSummary = menuData.sections
  .map((s) => {
    const header = [`${s.name} (${s.service})`, s.note ? `note: ${s.note}` : '', s.included ? `included with every order: ${s.included.join(', ')}` : '']
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

const draftSystemPrompt = `You write short blog posts for The Copperline Eatery, a family-owned breakfast and lunch diner in Chicopee, MA, open since 1993. You write as the family, in first person plural (we, our, us).

You know exactly two things about this restaurant: the facts list and the menu below. That is all anyone has told you. Every sentence must be traceable to one of those two sources or be a plain, general statement about the reader's situation (a graduation party needs a headcount, a Sunday morning is a good time for brunch). If you find yourself writing anything else about the restaurant, delete it.

Hard rules, checked deterministically after you write, so follow them exactly:
- Never use an em dash or en dash. Use commas, periods, or parentheses instead.
- Every dish name you cite must be copied EXACTLY (same capitalization and wording) from the menu list below. Do not invent dishes, prices, or menu sections.
- To say what is in a dish, use the menu description of that dish and nothing else. Do not describe how anything is cooked, what it tastes like, its texture, its recipe, or where an ingredient comes from. The menu does not say those things, so you do not know them.
- Do not describe the dining room, seating, the staff, the pace of service, how busy it gets, or who the regulars are. You have never been there.
- Do not say how long any dish has been on the menu, or that anything is made the same way it always was. Only the restaurant's founding year (1993) is known.
- Every price you cite must be an exact price from the menu list below, or clearly described as your own estimate or total, never presented as a literal menu price if it is not one.
- The restaurant's phone number is ${restaurant.PHONE_DISPLAY} and address is ${restaurant.ADDRESS.streetAddress}, ${restaurant.ADDRESS.addressLocality}, ${restaurant.ADDRESS.addressRegion} ${restaurant.ADDRESS.postalCode}. Never use a different phone number or street address.
- Never fabricate testimonials, reviews, or claims about what customers say, order most, or love. You have no access to real reviews or sales.
- Do not claim any award beyond: ${restaurant.AWARDS.join('; ')}.
- ${restaurant.ALCOHOL_NOTE} Never claim there is no liquor license or that a drink like a mimosa is unavailable; if it comes up, say it appears occasionally as a special, not that it does not exist.
- The catering packages with prices are lunch and dinner buffets (ziti, meatballs, roasted chicken, and so on). Never present them as a breakfast spread. Breakfast and brunch catering exists but is quoted per event.
- Do not recite prices like a menu. Mention a specific price only when it earns its place. Never list three or more prices back to back in the same paragraph.
- The title must be ${TITLE_MAX_CHARS} characters or fewer, counting spaces and punctuation. This is a hard cap enforced by a script after you write; a longer title is rejected. Drop a subtitle or a colon clause before you drop a place name.
- The description must be ${DESCRIPTION_MIN_CHARS} to ${DESCRIPTION_MAX_CHARS} characters, one or two complete sentences.
- Write 350 to 650 words as the post body only, in Markdown, with a few ## subheadings (no frontmatter, no h1). Shorter is better. Do not pad.
- Pick exactly one image from this list and use its exact path: ${AVAILABLE_IMAGES.map((i) => `${i.path} (${i.description})`).join('; ')}.

This is a first draft. Do not worry about polishing the voice, a second pass handles that. Just get the real facts right and leave out everything you do not know.

Facts about the restaurant (the complete list):
- Hours: ${restaurant.HOURS_DISPLAY}
${restaurant.GROUNDING_FACTS.map((f) => `- ${f}`).join('\n')}

The full current menu (grounding data, cite from this only):
${menuSummary}`;

const draftUserPrompt = `Write a first-draft blog post for this topic:
Title direction: ${topic.title}
Angle: ${topic.angle}
Notes: ${topic.notes}

Respond with a single JSON object, no markdown fences, no commentary, matching this shape exactly:
{
  "title": string (${TITLE_MAX_CHARS} characters or fewer; the title direction above is a direction, shorten it if it is longer),
  "description": string (1-2 sentences, ${DESCRIPTION_MIN_CHARS} to ${DESCRIPTION_MAX_CHARS} characters),
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

const humanizeSystemPrompt = `You are an editor. You rewrite AI-drafted diner blog posts so they read like the family that runs The Copperline Eatery in Chicopee, MA wrote them for their own website: plain, short, first person plural (we, our), the way you would answer a customer who asked a question at the register. Your job is to cut, not to add.

DELETE these words and phrases anywhere they appear, and rewrite the sentence around their absence: ${BANNED_PHRASES.join(', ')}.

Other rules:
- Remove every contrast construction: "X, not Y", "rather than Y", "instead of being Y", "is not about X", "that is not what we do", "not because X but because Y". A person describing their own diner states the fact. They do not keep framing it against an imagined alternative. One such construction in the whole post is the maximum.
- Remove any sentence that describes what a dish tastes like, how it is cooked, its texture, the dining room, the seating, the staff, the pace, how busy it is, what regulars do, what most people order, or how long a dish has been served. The draft was told not to write these; if one slipped through, cut it. Do not replace it with a different invented detail.
- Cut any sentence that is generically reassuring without adding new information (a sentence that would still be true if you swapped in any other restaurant's name).
- Do not end the post with a one-line kicker, a scene ("a window seat and a cup of coffee"), or a tagline. End on a practical sentence: hours, a phone number, or how to order.
- Do not open with a scene, a rhetorical question, or a description of the reader searching online. Open with the answer.
- If there is a generic bullet-point block ("things to think about before you call"), cut it or turn it into one or two specific sentences.
- If a paragraph lists three or more prices back to back, cut it to one or two. Removing a price is fine. Never change a price and never invent one.
- ${restaurant.ALCOHOL_NOTE} If the draft claims there is no liquor license or that something like a mimosa is unavailable, fix it to say it appears occasionally as a special instead. Do not otherwise add any factual claim (no new awards, dates, numbers, ingredients, or descriptions) beyond what the draft already states.
- Short sentences are fine. Do not manufacture rhythm. Do not add a one-line paragraph for emphasis.
- Never use an em dash or en dash. Use commas, periods, or parentheses instead.
- Do not change any dish name, phone number, or address.
- The result should be the same length or shorter. Never longer.
- The title must be ${TITLE_MAX_CHARS} characters or fewer and the description ${DESCRIPTION_MIN_CHARS} to ${DESCRIPTION_MAX_CHARS} characters, counting spaces and punctuation. If the draft's title is longer, shorten it as part of the rewrite (drop a colon clause or subtitle first). Never make either one longer than the draft's.

Respond with a single JSON object, no markdown fences, no commentary: { "title": string (${TITLE_MAX_CHARS} chars max), "description": string (${DESCRIPTION_MIN_CHARS} to ${DESCRIPTION_MAX_CHARS} chars), "body": string }`;

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

result.title = dashFree(result.title);
result.description = dashFree(result.description);
result.body = dashFree(result.body);

// Title cap: retry once, then fail before anything is written (see
// fitMetadata above). Runs before the gate-preview checks below so the log
// shows the metadata verdict first, the way the gate itself orders them.
const metadataFixSystemPrompt = `You are an editor fixing the SEO metadata of a short blog post written by the family that runs The Copperline Eatery in Chicopee, MA. Fix only the problems listed. Keep the meaning and the first person plural voice (we, our). The result must be a complete phrase made of whole words: never a cut-off sentence, never an ellipsis. Never use an em dash or en dash. Do not change any dish name, phone number, or address. Do not add any fact that is not already in the title, description, or body you are given.

Limits, counted in characters including spaces and punctuation: title ${TITLE_MAX_CHARS} or fewer; description ${DESCRIPTION_MIN_CHARS} to ${DESCRIPTION_MAX_CHARS}.

Respond with a single JSON object, no markdown fences, no commentary: { "title": string, "description": string }`;

let fitted;
try {
  fitted = await fitMetadata({
    title: result.title,
    description: result.description,
    retry: ({ title, description, problems }) =>
      callClaude(
        metadataFixSystemPrompt,
        `Problems to fix: ${problems.join('; ')}.\n\nTITLE: ${title}\nDESCRIPTION: ${description}\n\nPost body, for context only (do not return it):\n${result.body.slice(0, 1500)}`,
        512,
      ),
  });
} catch (err) {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
}
result.title = fitted.title;
result.description = fitted.description;
console.log(
  `Metadata OK${fitted.retried ? ' after one retry' : ''}: title ${result.title.length}/${TITLE_MAX_CHARS} chars, description ${result.description.length} chars (${DESCRIPTION_MIN_CHARS}-${DESCRIPTION_MAX_CHARS}).`,
);

// Same deterministic checks blog-gates.mjs runs, surfaced here so the run log
// shows WHY a post will fail the gate instead of just that it did. The gate
// stays the enforcement point; this is a preview of it.
const contrastHits = findContrastPatterns(result.body);
if (contrastHits.length) {
  const level = contrastHits.length >= CONTRAST_PATTERN_HARD_LIMIT ? 'FAIL' : 'warn';
  console.warn(`${level}: ${contrastHits.length} contrast construction(s) after humanize: ${contrastHits.map((h) => JSON.stringify(h)).join(', ')}`);
}
const unsourced = findUnsourcedClaims(result.body);
if (unsourced.hard.length) {
  console.warn(`FAIL: unsourced claims after humanize (dish history, cooking method, crowd claims): ${unsourced.hard.join(', ')}`);
}
if (unsourced.soft.length) {
  console.warn(`warn: unsourced detail words after humanize (nothing in menuData/restaurant.ts backs these): ${unsourced.soft.join(', ')}`);
}

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
