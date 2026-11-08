#!/usr/bin/env node
// Writes the draft PR body and the needs-ian issue body for one generated
// post (op #1549, blog redesign 2026-11-08). Used by the draft-month job in
// .github/workflows/weekly-post.yml.
//
// Usage: node scripts/draft-bodies.mjs --meta=<meta.json> --kind=pr --out=<file> [--preview=<url>]
//        node scripts/draft-bodies.mjs --meta=<meta.json> --kind=issue --pr-url=<url> --out=<file>
import { readFileSync, writeFileSync } from 'node:fs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }),
);
const meta = JSON.parse(readFileSync(args.meta, 'utf8'));
const kindLabel = {
  'local-event': 'local guide (event)',
  'customer-question': 'customer question',
  'specials-extra': 'specials board extra (not a weekly slot)',
}[meta.kind] ?? meta.kind;

const sourcesBlock = meta.sources.length
  ? meta.sources.map((s) => `- ${s.label}: ${s.url}`).join('\n')
  : '- Restaurant facts only (restaurant.ts, menuData.json, specials.json, FAQ and About pages); no outside sources.';
const confirmBlock = meta.pleaseConfirm.length
  ? meta.pleaseConfirm.map((q) => `- [ ] ${q}`).join('\n')
  : '- Nothing: every statement in the post is backed by the site data or the sources above.';
const removedBlock = meta.removed.length ? meta.removed.map((r) => `- ${r}`).join('\n') : '- Nothing removed.';

let out;
if (args.kind === 'pr') {
  out = `Blog draft for **${meta.pubDate}** (${kindLabel}), ${meta.words} words. Drafted by the monthly run of "Weekly Local Post".

Read it in **Files changed**${args.preview ? `, or on the preview with this month's drafts: ${args.preview}/blog/${meta.id}` : ''}.

### Sources
${sourcesBlock}

### Please confirm (these were left OUT of the post until you answer)
${confirmBlock}

### Cut by the fact-check pass
${removedBlock}
${meta.tooThin ? '\n**The fact-check pass flagged this post as too thin after cutting. Closing it is fine.**\n' : ''}
### How it goes live
Merging approves it. It stays hidden until its pubDate (${meta.pubDate}); the Monday publish job rebuilds the site that morning and it appears. Close the PR to drop it. Nothing auto-merges.`;
} else if (args.kind === 'issue') {
  const recommended = meta.pleaseConfirm.length
    ? `1. **Recommended:** answer the Please confirm questions below in a comment here; a session adds your answers to the post, then you merge it.
2. Merge it as is (the questions stay out of the post).
3. Close the PR (the post is dropped).`
    : `1. **Recommended:** merge it as is.
2. Comment here with changes; a session edits the post before you merge.
3. Close the PR (the post is dropped).`;
  out = `[claude routine] Weekly Local Post, monthly draft run

Approve the blog post for **${meta.pubDate}**: "${meta.title}" (${kindLabel})?

PR: ${args['pr-url']}

Options:
${recommended}

Please confirm:
${confirmBlock}

Sources:
${sourcesBlock}

Evidence: the PR body lists what the fact-check pass cut. Approved posts go live one per week on their Monday, so all of this month's drafts can be reviewed in one sitting.`;
} else {
  console.error('--kind must be pr or issue');
  process.exit(1);
}
writeFileSync(args.out, out + '\n');
console.log(`Wrote ${args.out}`);
