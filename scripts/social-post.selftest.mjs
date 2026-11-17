#!/usr/bin/env node
// Offline selftest for the specials social post (op #1658): caption builder,
// ISO week key, idempotency, staleness, dry run, and a live run against a
// mocked Graph API and mocked git. No network: fetch and git are stubs that
// fail the test if anything unexpected is called. Run: npm run qa:social

import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  buildCaption, isoWeek, plan, imageFor, cleanText, parseLsRemoteTags, parsePlatforms, tagName, CAPTION_MAX,
} from './lib/social-post.mjs';
import { main } from './social-post.mjs';

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
    console.log(`ok   ${name}`);
  } catch (err) {
    console.log(`FAIL ${name}\n     ${err.message}`);
    process.exitCode = 1;
  }
}

const board = {
  updatedAt: '2026-11-14T11:13:15.654Z',
  specials: [
    { name: 'Roast Beef Hash', description: 'With 2 eggs and toast', price: '$12.25' },
    { name: 'Pineapple French Toast', description: null, price: '$9.50' },
    { name: 'Pulled Pork Omelet', description: null, price: null },
  ],
  board: { key: '2026-11-14-522feff0-3a55-4a0c-94b0-31e2f0388c7e.jpg', contentType: 'image/jpeg' },
};
const NOW = new Date('2026-11-14T15:00:00Z');
const EN = String.fromCharCode(0x2013);
const EM = String.fromCharCode(0x2014);
const DASHES = new RegExp(`[${EN}${EM}]`);

const noFetch = async (url) => { throw new Error(`unexpected network call: ${url}`); };
const noGit = (args) => { throw new Error(`unexpected git call: ${args.join(' ')}`); };
const capture = () => { const lines = []; return { lines, log: (s) => lines.push(String(s)) }; };
const fixtureFile = (data) => {
  const dir = mkdtempSync(join(tmpdir(), 'social-post-'));
  const f = join(dir, 'specials.json');
  writeFileSync(f, JSON.stringify(data));
  return f;
};

// Caption builder
await test('caption lists every item, the /specials link and no dashes', () => {
  const c = buildCaption(board);
  assert.match(c, /^This week's specials at The Copperline Eatery in Chicopee:/);
  assert.ok(c.includes('• Roast Beef Hash (with 2 eggs and toast), $12.25'));
  assert.ok(c.includes('• Pineapple French Toast, $9.50'));
  assert.ok(c.includes('• Pulled Pork Omelet\n'), 'a null price adds nothing');
  assert.ok(c.includes('See the board: https://copperlineeatery.com/specials'));
  assert.ok(!DASHES.test(c));
});
await test('em and en dashes from the vision extraction are cleaned', () => {
  assert.equal(cleanText(`Hash ${EM} with eggs`), 'Hash, with eggs');
  assert.equal(cleanText(`  Toast${EN}  `), 'Toast');
  const c = buildCaption({ ...board, specials: [{ name: `Hash ${EM} House`, description: `eggs ${EN} toast`, price: '$9' }] });
  assert.ok(!DASHES.test(c));
});
await test('a very long board stays under the Instagram caption cap', () => {
  const many = Array.from({ length: 200 }, (_, i) => ({ name: `Special number ${i} with a long name`, description: 'with two eggs and toast', price: '$10.00' }));
  const c = buildCaption({ ...board, specials: many });
  assert.ok(c.length <= CAPTION_MAX, `length ${c.length}`);
  assert.ok(c.includes('and more on the board'));
  assert.ok(c.includes('https://copperlineeatery.com/specials'), 'the link survives truncation');
});

// Week key and image
await test('ISO week keys', () => {
  assert.equal(isoWeek('2026-11-14'), '2026-W46');
  assert.equal(isoWeek('2026-11-15'), '2026-W46'); // Sunday, same week as Saturday
  assert.equal(isoWeek('2026-11-16'), '2026-W47'); // Monday starts a new week
  assert.equal(isoWeek('2026-01-01'), '2026-W01');
  assert.equal(isoWeek('2027-01-01'), '2026-W53');
});
await test('image is the board through the CDN at 1080x1350 JPEG; bad keys give none', () => {
  assert.equal(imageFor(board), 'https://copperlineeatery.com/.netlify/images?url=/specials-board/2026-11-14-522feff0-3a55-4a0c-94b0-31e2f0388c7e.jpg&w=1080&h=1350&fit=cover&fm=jpg&q=85');
  assert.equal(imageFor({ board: { key: '../etc/passwd?x=1' } }), null);
  assert.equal(imageFor({}), null);
});

// Idempotency
await test('nothing posted yet: both platforms, photo mode', () => {
  const p = plan({ data: board, now: NOW });
  assert.equal(p.action, 'post');
  assert.equal(p.week, '2026-W46');
  assert.deepEqual(p.targets.map((t) => `${t.platform}:${t.mode}:${t.tag}`), [
    'facebook:photo:social-posted/facebook/2026-W46',
    'instagram:photo:social-posted/instagram/2026-W46',
  ]);
});
await test('both tags present: skip, the week never posts twice', () => {
  const tags = new Set([tagName('facebook', '2026-W46'), tagName('instagram', '2026-W46')]);
  const p = plan({ data: board, postedTags: tags, now: NOW });
  assert.equal(p.action, 'skip');
  assert.match(p.reason, /already posted for 2026-W46/);
});
await test('a same-week correction (Sunday republish) does not post again', () => {
  const tags = new Set([tagName('facebook', '2026-W46'), tagName('instagram', '2026-W46')]);
  const sunday = { ...board, updatedAt: '2026-11-15T14:00:00.000Z' };
  assert.equal(plan({ data: sunday, postedTags: tags, now: new Date('2026-11-15T15:00:00Z') }).action, 'skip');
});
await test('Facebook done, Instagram failed last time: retries Instagram only', () => {
  const p = plan({ data: board, postedTags: new Set([tagName('facebook', '2026-W46')]), now: NOW });
  assert.deepEqual(p.targets.map((t) => t.platform), ['instagram']);
});
await test('a stale board is never posted', () => {
  const p = plan({ data: board, now: new Date('2026-11-22T15:00:00Z') });
  assert.equal(p.action, 'skip');
  assert.match(p.reason, /older than 6 days/);
  assert.equal(plan({ data: board, now: new Date('2026-11-20T23:00:00Z') }).action, 'post', 'still fine on Friday');
});
await test('text-only board: Facebook link post, Instagram skipped with a warning', () => {
  const p = plan({ data: { ...board, board: undefined }, now: NOW });
  assert.deepEqual(p.targets.map((t) => `${t.platform}:${t.mode}`), ['facebook:link']);
  assert.match(p.warnings[0], /Instagram is skipped/);
});
await test('platform list from SOCIAL_POST_PLATFORMS', () => {
  assert.deepEqual(parsePlatforms(undefined), ['facebook', 'instagram']);
  assert.deepEqual(parsePlatforms('facebook'), ['facebook']);
  assert.throws(() => parsePlatforms('facebook,tiktok'), /unknown platform/);
  assert.deepEqual(plan({ data: board, now: NOW, platforms: ['facebook'] }).targets.map((t) => t.platform), ['facebook']);
});
await test('git ls-remote output parses to tag names', () => {
  const out = 'abc\trefs/tags/social-posted/facebook/2026-W46\nabc\trefs/tags/social-posted/facebook/2026-W46^{}\ndef\trefs/tags/social-posted/instagram/2026-W45\n';
  assert.deepEqual([...parseLsRemoteTags(out)].sort(), ['social-posted/facebook/2026-W46', 'social-posted/instagram/2026-W45']);
});

// Dry run (the default)
await test('dry run is the default: prints caption and image, no network, no git, exit 0', async () => {
  const { lines, log } = capture();
  const env = { META_PAGE_ID: 'x', META_PAGE_TOKEN: 'y' }; // credentials present, but no SOCIAL_POST_LIVE
  const code = await main(['--offline', `--data=${fixtureFile(board)}`, `--now=${NOW.toISOString()}`], env, { fetch: noFetch, git: noGit, log });
  const out = lines.join('\n');
  assert.equal(code, 0, out);
  assert.match(out, /mode DRY_RUN/);
  assert.match(out, /DRY_RUN: nothing posted/);
  assert.ok(out.includes('Roast Beef Hash (with 2 eggs and toast), $12.25'));
  assert.ok(out.includes('fit=cover&fm=jpg'));
});
await test('dry run skips a week already tagged', async () => {
  const { lines, log } = capture();
  const code = await main(['--offline', `--data=${fixtureFile(board)}`, `--now=${NOW.toISOString()}`, '--posted-tags=social-posted/facebook/2026-W46,social-posted/instagram/2026-W46'], {}, { fetch: noFetch, git: noGit, log });
  assert.equal(code, 0);
  assert.match(lines.join('\n'), /skip: already posted/);
});
await test('--offline refuses to post live', async () => {
  const { lines, log } = capture();
  const code = await main(['--offline', `--data=${fixtureFile(board)}`], { SOCIAL_POST_LIVE: 'true' }, { fetch: noFetch, git: noGit, log });
  assert.equal(code, 2);
  assert.match(lines.join('\n'), /cannot post/);
});
await test('--dry-run wins over SOCIAL_POST_LIVE=true', async () => {
  const { lines, log } = capture();
  const code = await main(['--offline', '--dry-run', `--data=${fixtureFile(board)}`, `--now=${NOW.toISOString()}`], { SOCIAL_POST_LIVE: 'true' }, { fetch: noFetch, git: noGit, log });
  assert.equal(code, 0, lines.join('\n'));
  assert.match(lines.join('\n'), /DRY_RUN: nothing posted/);
});

// Live run against a mocked Graph API (no real network)
function mockMeta({ igFails = false } = {}) {
  const calls = [];
  const fetch = async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', body: init.body ? String(init.body) : '' });
    const json = (status, body) => ({ ok: status < 400, status, json: async () => body, text: async () => JSON.stringify(body), headers: new Map() });
    if (url === 'https://copperlineeatery.com/specials') return { ok: true, status: 200, text: async () => `<img src="/specials-board/${board.board.key}">`, headers: new Map() };
    if (String(url).includes('/.netlify/images')) return { ok: true, status: 200, headers: new Map([['content-type', 'image/jpeg'], ['content-length', '268633']]) };
    if (String(url).endsWith('/PAGE1/photos')) return json(200, { id: 'photo1', post_id: 'PAGE1_post1' });
    if (String(url).includes('/PAGE1?fields=instagram_business_account')) return json(200, { instagram_business_account: { id: 'IG1' }, id: 'PAGE1' });
    if (String(url).endsWith('/IG1/media')) return igFails ? json(400, { error: { message: 'Invalid image', type: 'OAuthException', code: 9004 } }) : json(200, { id: 'C1' });
    if (String(url).includes('/C1?fields=status_code')) return json(200, { status_code: 'FINISHED', id: 'C1' });
    if (String(url).endsWith('/IG1/media_publish')) return json(200, { id: 'IGPOST1' });
    throw new Error(`unexpected call ${url}`);
  };
  return { fetch, calls };
}
const fakeGit = () => {
  const calls = [];
  return { calls, git: (args) => { calls.push(args.join(' ')); return args[0] === 'ls-remote' ? '' : ''; } };
};
const ENV_LIVE = { SOCIAL_POST_LIVE: 'true', META_PAGE_ID: 'PAGE1', META_PAGE_TOKEN: 'TOKEN-SECRET' };
const fast = { live: { tries: 1, waitMs: 0 }, ig: { pollMs: 0 } };

await test('live (mocked): Facebook photo, Instagram container then publish, two tags pushed', async () => {
  const { lines, log } = capture();
  const meta = mockMeta();
  const g = fakeGit();
  const code = await main([`--data=${fixtureFile(board)}`, `--now=${NOW.toISOString()}`], ENV_LIVE, { fetch: meta.fetch, git: g.git, log, timing: fast });
  const out = lines.join('\n');
  assert.equal(code, 0, out);
  const posts = meta.calls.filter((c) => c.method === 'POST').map((c) => c.url.replace('https://graph.facebook.com/v27.0/', ''));
  assert.deepEqual(posts, ['PAGE1/photos', 'IG1/media', 'IG1/media_publish']);
  const photo = new URLSearchParams(meta.calls.find((c) => c.url.endsWith('/photos')).body);
  assert.equal(photo.get('url'), imageFor(board));
  assert.ok(photo.get('caption').includes('https://copperlineeatery.com/specials'));
  assert.deepEqual(g.calls.filter((c) => c.startsWith('push')), ['push origin refs/tags/social-posted/facebook/2026-W46', 'push origin refs/tags/social-posted/instagram/2026-W46']);
  assert.ok(!out.includes('TOKEN-SECRET'), 'the token is never printed');
  assert.ok(meta.calls.every((c) => !c.url.includes('TOKEN-SECRET')), 'the token is never in a URL');
});
await test('live (mocked): Instagram fails, Facebook still tagged, one ::error:: line, exit 1', async () => {
  const { lines, log } = capture();
  const meta = mockMeta({ igFails: true });
  const g = fakeGit();
  const code = await main([`--data=${fixtureFile(board)}`, `--now=${NOW.toISOString()}`], ENV_LIVE, { fetch: meta.fetch, git: g.git, log, timing: fast });
  assert.equal(code, 1);
  assert.deepEqual(g.calls.filter((c) => c.startsWith('push')), ['push origin refs/tags/social-posted/facebook/2026-W46']);
  const errors = lines.filter((l) => l.startsWith('::error::'));
  assert.equal(errors.length, 1);
  assert.match(errors[0], /instagram: Graph POST IG1\/media failed: HTTP 400 OAuthException code 9004: Invalid image/);
});
await test('live without credentials fails loudly and posts nothing', async () => {
  const { lines, log } = capture();
  const meta = mockMeta();
  const code = await main([`--data=${fixtureFile(board)}`, `--now=${NOW.toISOString()}`], { SOCIAL_POST_LIVE: 'true' }, { fetch: meta.fetch, git: fakeGit().git, log, timing: fast });
  assert.equal(code, 1);
  assert.match(lines.join('\n'), /::error::SOCIAL_POST_LIVE is true but META_PAGE_ID and META_PAGE_TOKEN are not set/);
  assert.equal(meta.calls.filter((c) => c.method === 'POST').length, 0);
});

console.log(`\n${passed} passed${process.exitCode ? ', some FAILED' : ', all green'}`);
