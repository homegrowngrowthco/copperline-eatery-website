#!/usr/bin/env node
// Drafts one blog post from a monthly plan item (rewritten 2026-11-08, op
// #1549, after Ian's blog direction; the old generator is in
// _archive/2026-11-08/generate-post.mjs).
//
// Ian's rules, built in here and backed by scripts/blog-gates.mjs:
// - Nothing about the restaurant that the site's own data does not state
//   (restaurant.ts, menuData.json, specials.json, the FAQ and About pages,
//   all loaded by scripts/lib/grounding.mjs). Anything else the post would
//   want to say becomes a question in "pleaseConfirm", which the workflow
//   prints in the draft's needs-ian issue. The post body never carries it.
// - Topics are local: a real event within 25 miles of 01020 (from
//   scripts/research-events.mjs, with its source URLs), or a question
//   customers ask (content/backlog.json). Specials posts are an optional
//   extra, never the weekly post.
// - Voice: the family's own, as on the About page. Local guide or a short,
//   warm answer to a customer question.
// - No filler written for search engines, no hours block, no repeated
//   address or phone line, no closing "find us" section. Length follows the
//   content.
//
// Two passes: a draft, then a separate fact-check edit whose only job is to
// cut every unsupported claim (moving it into pleaseConfirm) and every
// filler paragraph. A dedicated second pass catches what a single prompt
// lets through (memory: deterministic sanitizer over prompt).
//
// Usage: node scripts/generate-post.mjs --plan=<plan.json> --slot=<n|extra> --meta-out=<file.json>
//        node scripts/generate-post.mjs --dry-run   (no API call; exercises
//        the title/description cap enforcement against fixtures)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  BANNED_PHRASES,
  findContrastPatterns,
  findUnsourcedClaims,
  CONTRAST_PATTERN_HARD_LIMIT,
  TITLE_MAX_CHARS,
  DESCRIPTION_MIN_CHARS,
  DESCRIPTION_MAX_CHARS,
} from './lib/content-rules.mjs';
import { groundingText, loadSpecials, loadRestaurant } from './lib/grounding.mjs';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BLOG_DIR = resolve(repoRoot, 'src/content/blog');

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }),
);

// Defensive dash strip even though every pass forbids them (LLMs slip).
const dashFree = (s) => String(s).replace(/[–—]/g, '-');

// ---------------------------------------------------------------------------
// Metadata cap enforcement (kept from the 2026-10-01 version): if the title
// is over TITLE_MAX_CHARS after the edit pass, ask once for a shorter one,
// and if that is still too long, fail before any file is written. Never
// truncate.
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

async function fitMetadata({ title, description, retry, log = console }) {
  const problems = metadataProblems(title, description);
  if (!problems.length) return { title, description, retried: false };

  log.warn(`Metadata out of range: ${problems.join('; ')}. Asking the model once for a shorter version (never truncating).`);
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
      `${titleProblem} after one retry: "${next.title}". Refusing to truncate mid-word and refusing to write the post.`,
    );
  }
  for (const p of remaining) {
    log.warn(`warn: ${p} after the retry; blog-gates.mjs will soft-warn the same and a reviewer should trim it.`);
  }
  return { ...next, retried: true };
}

async function runDryRun() {
  const LONG_TITLE = 'Corporate Breakfast Catering in Springfield: What Offices Actually Order';
  const SHORT_TITLE = 'Corporate Breakfast Catering in Springfield';
  const OK_DESC = 'What offices around Springfield order from us for a morning meeting, and how to get a quote sized to your headcount.';
  const LONG_DESC = `${OK_DESC} We deliver to Springfield, Chicopee, Holyoke, and West Springfield.`;
  const quiet = { warn: () => {} };
  const neverCalled = () => {
    throw new Error('retry was called but should not have been');
  };
  const cases = [
    {
      name: 'in-range title and description pass through untouched, no retry',
      input: { title: SHORT_TITLE, description: OK_DESC, retry: neverCalled },
      expect: (r) => !r.retried && r.title === SHORT_TITLE && r.description === OK_DESC,
    },
    {
      name: 'over-cap title is fixed by one retry, output is the retry text verbatim',
      input: { title: LONG_TITLE, description: OK_DESC, retry: async () => ({ title: SHORT_TITLE, description: OK_DESC }) },
      expect: (r) => r.retried && r.title === SHORT_TITLE,
    },
    {
      name: 'title still over the cap after the retry fails loudly, nothing truncated',
      input: { title: LONG_TITLE, description: OK_DESC, retry: async () => ({ title: `${LONG_TITLE} and More` }) },
      expectThrow: /over the 65-char cap after one retry/,
    },
    {
      name: 'em dash in the retry text is normalized',
      input: { title: LONG_TITLE, description: OK_DESC, retry: async () => ({ title: 'Corporate Breakfast Catering — Springfield' }) },
      expect: (r) => r.retried && r.title === 'Corporate Breakfast Catering - Springfield',
    },
    {
      name: 'description still out of range after the retry only warns',
      input: { title: SHORT_TITLE, description: LONG_DESC, retry: async () => ({ title: SHORT_TITLE, description: LONG_DESC }) },
      expect: (r) => r.retried && r.description === LONG_DESC,
    },
  ];
  let failures = 0;
  for (const c of cases) {
    try {
      const r = await fitMetadata({ ...c.input, log: quiet });
      if (c.expectThrow || !c.expect(r)) {
        failures++;
        console.error(`FAIL: ${c.name}: ${JSON.stringify(r)}`);
      } else console.log(`ok: ${c.name}`);
    } catch (err) {
      if (c.expectThrow && c.expectThrow.test(err.message)) console.log(`ok: ${c.name}`);
      else {
        failures++;
        console.error(`FAIL: ${c.name}: ${err.message}`);
      }
    }
  }
  console.log(failures ? `${failures} dry-run case(s) failed` : `All ${cases.length} dry-run cases passed.`);
  return failures ? 1 : 0;
}

if (args['dry-run']) {
  process.exit(await runDryRun());
}

if (!args.plan || !args.slot || !args['meta-out']) {
  console.error('Usage: node scripts/generate-post.mjs --plan=<plan.json> --slot=<n|extra> --meta-out=<file.json>   or   --dry-run');
  process.exit(1);
}

const planItems = JSON.parse(readFileSync(args.plan, 'utf8'));
const item = planItems.find((p) => String(p.slot) === String(args.slot));
if (!item || !item.id) {
  console.error(`No plannable item for slot ${args.slot} in ${args.plan}`);
  process.exit(1);
}
const outPath = resolve(BLOG_DIR, `${item.id}.md`);
if (existsSync(outPath)) {
  console.error(`${outPath} already exists; refusing to overwrite a post.`);
  process.exit(1);
}

const { ask, lastJson } = await import('./lib/claude.mjs');
const restaurant = await loadRestaurant(repoRoot);
const grounding = await groundingText(repoRoot);

// catering-menu-1.jpg/2.jpg stay excluded (stale price sheet, 2026-08-31).
const AVAILABLE_IMAGES = [
  { path: '/breakfast-menu.jpg', description: 'photo of the printed breakfast menu' },
  { path: '/lunch-menu.jpg', description: 'photo of the printed lunch menu' },
  { path: '/catering-breakfast.jpg', description: 'catering breakfast buffet spread' },
];

function topicBrief() {
  if (item.kind === 'local-event') {
    const e = item.event;
    const also = (item.alsoEvents ?? [])
      .map((a) => `- ${a.name}: ${a.startDate}${a.endDate && a.endDate !== a.startDate ? ` to ${a.endDate}` : ''}${a.startTime ? `, ${a.startTime}` : ''}, ${a.venue}, ${a.town}. ${a.summary} Source: ${a.sourceUrls[0]}`)
      .join('\n');
    return `POST TYPE: local guide. The post goes live on Monday ${item.pubDate}.
Main event (researched; these fields are everything you know about it):
${JSON.stringify(e, null, 2)}
${also ? `Also happening that week (one short line each at most, or leave out):\n${also}` : ''}

Tell neighbors what is happening, when and where, in plain words, and how a breakfast or lunch at the diner fits around it (for example before a morning race or parade, or after a museum visit), using only the diner's real hours and menu. Link the event's source page in the sentence that names the event, as a Markdown link, so readers can check details. Say nothing about the event beyond its fields above.`;
  }
  if (item.kind === 'customer-question') {
    return `POST TYPE: answer to a customer question. The post goes live on Monday ${item.pubDate}.
Question: ${item.question.question}
Notes from the queue: ${item.question.notes}

Answer the question in the first sentence, then add only what helps someone who asked it. Short is fine. If the honest answer needs a fact the sources do not give, write the part you can support and put the rest in pleaseConfirm.`;
  }
  if (item.kind === 'specials-extra') {
    const specials = loadSpecials(repoRoot);
    const recent = (specials.history ?? []).slice(0, 5);
    return `POST TYPE: specials board extra (optional, in addition to the weekly posts). The post goes live on ${item.pubDate}.
The last weeks of the specials board (specials.json history; names and prices are exact, nothing else is known about these dishes):
${JSON.stringify(recent, null, 2)}

A short note on what has been on the board lately, naming a few specials exactly as written. Do not describe how they taste or how they are made. Point readers to /specials for this week's board.`;
  }
  throw new Error(`Unknown plan item kind "${item.kind}"`);
}

const voiceAndRules = `You write for the blog of The Copperline Eatery, a family-owned breakfast and lunch diner in Chicopee, MA, open since 1993. You write as the family, in first person plural (we, our, us), in the voice of their own About page: warm, plain, neighborly, glad to see people, never salesy. Read the About page paragraphs in the sources for the tone.

THE RULE THAT MATTERS MOST: every statement about the restaurant (its food, prices, hours, policies, people, history, the room, what customers do) must be stated in the SOURCES below. If you would like to say something the sources do not state, do not write it; add a short, specific question for the owner to the "pleaseConfirm" list instead (for example "Are you open the Friday after Thanksgiving?"). An unsupported sentence in the post is a failure even if it is probably true.

Other rules:
- Statements about an event come only from the event fields you are given. General statements about the reader's day are fine ("a parade morning starts early").
- Dish names copied exactly from the menu or specials board. Prices only as written there. Do not describe taste, texture, cooking method or recipe.
- No filler written for search engines: no paragraph that would read the same for any other restaurant, no lists of town names, no keyword phrases, no "whether you are X or Y" lines.
- No hours block and no "find us", "visit us" or "before you come" closing section. Mention an opening or closing time only where it matters to the topic, once, inline. The street address at most once, the phone number at most once.
- Mention an award only if the post is about that dish.
- No testimonials or claims about what customers say, love or order most.
- Never use an em dash or en dash. Use commas, periods or parentheses.
- Avoid these phrases: ${BANNED_PHRASES.join(', ')}. Avoid "X, not Y" and "rather than" constructions.
- Length follows the content: most posts are 150 to 400 words, never over 600. Use ## subheadings only if the post is long enough to need them. Markdown body only, no frontmatter, no h1.
- Title ${TITLE_MAX_CHARS} characters or fewer. Description ${DESCRIPTION_MIN_CHARS} to ${DESCRIPTION_MAX_CHARS} characters, one or two sentences that say what the post tells the reader.
- Pick one image by exact path: ${AVAILABLE_IMAGES.map((i) => `${i.path} (${i.description})`).join('; ')}.
- ${restaurant.ALCOHOL_NOTE}

SOURCES (the complete list of what is known about the restaurant):
${grounding}`;

const draftUser = `${topicBrief()}

Respond with your draft, then end with a single JSON object and nothing after it:
{
  "title": string,
  "description": string,
  "image": string,
  "imageAlt": string,
  "dishRefs": string[] (exact menu dish names cited in the body; specials-board names do not go here),
  "tags": string[] (2-4 short lowercase tags),
  "body": string (the Markdown post body),
  "pleaseConfirm": string[] (questions for the owner; empty if none)
}`;

console.log(`Drafting ${item.kind} "${item.id}" for ${item.pubDate}...`);
const draft = lastJson((await ask({ system: voiceAndRules, user: draftUser, effort: 'high' })).text);

const checkSystem = `You are the fact-check editor for The Copperline Eatery's blog. You receive a draft and the complete SOURCES. Your job is to cut, never to add.

1. Read the body sentence by sentence. Any statement about the restaurant that the SOURCES do not state (food details, prices, hours, policies, the room, staff, history, what customers do, holiday openings, specials not on the board) must be removed. For each one removed, add a short question for the owner to "pleaseConfirm" so the owner can supply it, and record the removed sentence in "removed".
2. Any statement about an event that is not in the event fields given must be removed the same way.
3. Remove filler written for search engines: paragraphs that would read the same for any restaurant, lists of towns, keyword phrases, an hours block, a closing "find us" or "visit us" section, a second mention of the address or phone number.
4. Keep the family's warm, plain first person plural voice. Fix any em or en dash. Do not change dish names, prices, links, the phone number or the address.
5. If cutting leaves the post too thin to be useful (under about 100 words), say so in "tooThin": true; do not pad it.

${voiceAndRules.slice(voiceAndRules.indexOf('SOURCES (the complete list'))}`;

const checkUser = `${topicBrief()}

DRAFT TITLE: ${draft.title}
DRAFT DESCRIPTION: ${draft.description}
DRAFT pleaseConfirm: ${JSON.stringify(draft.pleaseConfirm ?? [])}
DRAFT BODY:
${draft.body}

End with a single JSON object and nothing after it:
{ "title": string, "description": string, "body": string, "pleaseConfirm": string[] (the draft's questions plus yours), "removed": string[], "tooThin": boolean }`;

console.log('Fact-checking...');
const checked = lastJson((await ask({ system: checkSystem, user: checkUser, effort: 'high' })).text);

const result = {
  ...draft,
  title: dashFree(checked.title || draft.title),
  description: dashFree(checked.description || draft.description),
  body: dashFree(checked.body || draft.body),
  pleaseConfirm: [...new Set([...(checked.pleaseConfirm ?? draft.pleaseConfirm ?? [])].map((q) => dashFree(q)))],
  removed: checked.removed ?? [],
  tooThin: Boolean(checked.tooThin),
};

const metadataFixSystem = `You fix the SEO metadata of a short blog post by the family that runs The Copperline Eatery in Chicopee, MA. Fix only the problems listed. Whole words, no ellipsis, no em or en dash, first person plural. Add no fact that is not in the title, description or body you are given. Limits in characters: title ${TITLE_MAX_CHARS} or fewer; description ${DESCRIPTION_MIN_CHARS} to ${DESCRIPTION_MAX_CHARS}. End with a single JSON object: { "title": string, "description": string }`;

let fitted;
try {
  fitted = await fitMetadata({
    title: result.title,
    description: result.description,
    retry: async ({ title, description, problems }) =>
      lastJson(
        (
          await ask({
            system: metadataFixSystem,
            user: `Problems to fix: ${problems.join('; ')}.\n\nTITLE: ${title}\nDESCRIPTION: ${description}\n\nPost body, for context only:\n${result.body.slice(0, 1500)}`,
            effort: 'low',
            maxTokens: 4000,
          })
        ).text,
      ),
  });
} catch (err) {
  console.error(`FAIL: ${err.message}`);
  process.exit(1);
}
result.title = fitted.title;
result.description = fitted.description;

// Gate preview so the run log shows WHY a post would fail; blog-gates.mjs stays the enforcement point.
const contrastHits = findContrastPatterns(result.body);
if (contrastHits.length) {
  console.warn(`${contrastHits.length >= CONTRAST_PATTERN_HARD_LIMIT ? 'FAIL' : 'warn'}: contrast construction(s): ${contrastHits.map((h) => JSON.stringify(h)).join(', ')}`);
}
const unsourced = findUnsourcedClaims(result.body);
if (unsourced.hard.length) console.warn(`FAIL: unsourced claims: ${unsourced.hard.join(', ')}`);
if (unsourced.soft.length) console.warn(`warn: unsourced detail words: ${unsourced.soft.join(', ')}`);

const frontmatter = [
  '---',
  `title: ${JSON.stringify(result.title)}`,
  `description: ${JSON.stringify(result.description)}`,
  `pubDate: ${item.pubDate}`,
  `image: ${JSON.stringify(result.image)}`,
  `imageAlt: ${JSON.stringify(result.imageAlt)}`,
  `dishRefs: ${JSON.stringify(result.dishRefs ?? [])}`,
  `tags: ${JSON.stringify(result.tags ?? [])}`,
  '---',
  '',
].join('\n');

writeFileSync(outPath, frontmatter + result.body.trim() + '\n');

const sources = [];
if (item.kind === 'local-event') {
  for (const e of [item.event, ...(item.alsoEvents ?? [])]) {
    for (const u of e.sourceUrls ?? []) sources.push({ label: `${e.name} (${e.startDate})`, url: u });
  }
}
const meta = {
  id: item.id,
  kind: item.kind,
  pubDate: item.pubDate,
  title: result.title,
  words: result.body.trim().split(/\s+/).length,
  sources,
  pleaseConfirm: result.pleaseConfirm,
  removed: result.removed,
  tooThin: result.tooThin,
};
writeFileSync(args['meta-out'], JSON.stringify(meta, null, 2) + '\n');
console.log(`Wrote ${outPath} (${meta.words} words, ${meta.pleaseConfirm.length} question(s) for Ian${meta.tooThin ? ', flagged too thin' : ''}).`);
