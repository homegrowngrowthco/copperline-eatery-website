#!/usr/bin/env node
// Weekly specials board -> Facebook Page photo post + Instagram post (op #1658).
//
// Runs from .github/workflows/social-post.yml after every successful production
// deploy of master (a specials publish is a commit to master, so that is the
// moment a new board is live) and once a day as a backstop.
//
// DRY RUN IS THE DEFAULT. It only posts when SOCIAL_POST_LIVE=true (the repo
// variable of the same name) and --dry-run is not passed. A dry run still reads
// the live /specials page and the image, then prints the caption and image URL.
//
// Idempotency: each successful post pushes a git tag
// social-posted/<platform>/<ISO week of the board>, e.g.
// social-posted/facebook/2026-W46. A week that already has its tag is skipped,
// per platform, so a Facebook success plus an Instagram failure retries only
// Instagram. Tags do not trigger the deploy workflow (it runs on branch pushes).
//
// Failure: one ::error:: line and exit 1 (a red run, which the ops health
// digest reports). This workflow is separate from the deploy, so it can never
// block a site publish.
//
// Env: SOCIAL_POST_LIVE, SOCIAL_POST_PLATFORMS (default facebook,instagram),
// META_PAGE_ID, META_PAGE_TOKEN (a long-lived Page access token), optional
// META_IG_USER_ID (otherwise read from the Page's instagram_business_account).
//
// Flags: --data=<path> (default src/data/specials.json), --dry-run,
// --max-age-days=<n>, --offline (no network and no git: needs --posted-tags,
// used by the selftest), --posted-tags=<comma list>, --now=<ISO time>.

import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  GRAPH_VERSION, SPECIALS_URL, TAG_PREFIX, DEFAULT_MAX_AGE_DAYS,
  plan, parseLsRemoteTags, parsePlatforms,
} from './lib/social-post.mjs';

const GRAPH = `https://graph.facebook.com/${GRAPH_VERSION}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseArgs(argv) {
  const out = {};
  for (const a of argv) {
    const m = a.match(/^--([a-z-]+)(?:=(.*))?$/);
    if (m) out[m[1]] = m[2] === undefined ? true : m[2];
  }
  return out;
}

const realGit = (args) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

// Graph API call. The token goes in the POST body or an Authorization header,
// never in a printed URL; errors print Meta's message only.
async function graph(fetchFn, method, path, params, token) {
  const url = `${GRAPH}/${path}`;
  const init = { method, headers: { Authorization: `Bearer ${token}` } };
  let target = url;
  if (method === 'GET') {
    const qs = new URLSearchParams(params || {}).toString();
    if (qs) target = `${url}?${qs}`;
  } else {
    init.body = new URLSearchParams({ ...(params || {}), access_token: token });
  }
  const res = await fetchFn(target, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || body.error) {
    const e = body.error || {};
    throw new Error(`Graph ${method} ${path.split('?')[0]} failed: HTTP ${res.status} ${e.type || ''} code ${e.code ?? '?'}${e.error_subcode ? `/${e.error_subcode}` : ''}: ${e.message || 'no message'}`);
  }
  return body;
}

async function checkLive(fetchFn, data, log, { tries = 6, waitMs = 20000 } = {}) {
  // The board is live when /specials carries its photo key (or, for a
  // text-only board, its first item). The deploy just finished, so retry a
  // little for CDN propagation.
  const marker = data.board?.key || data.specials?.[0]?.name;
  for (let i = 1; i <= tries; i++) {
    const res = await fetchFn(SPECIALS_URL, { headers: { 'Cache-Control': 'no-cache' } });
    const html = res.ok ? await res.text() : '';
    if (marker && html.includes(marker)) return;
    log(`live check ${i}/${tries}: ${SPECIALS_URL} does not show this board yet`);
    if (i < tries) await sleep(waitMs);
  }
  throw new Error(`${SPECIALS_URL} never showed the board from specials.json (${marker}); not posting`);
}

async function checkImage(fetchFn, url) {
  const res = await fetchFn(url, { method: 'GET' });
  const type = res.headers.get('content-type') || '';
  const len = Number(res.headers.get('content-length') || 0);
  if (!res.ok || !type.startsWith('image/jpeg')) throw new Error(`image check failed: HTTP ${res.status}, content-type ${type || 'none'}`);
  if (len > 8 * 1024 * 1024) throw new Error(`image is ${len} bytes; Instagram's cap is 8 MB`);
  return { type, len };
}

async function postFacebook(fetchFn, env, p, target) {
  if (target.mode === 'photo') {
    const r = await graph(fetchFn, 'POST', `${env.META_PAGE_ID}/photos`, { url: p.image, caption: p.caption, published: 'true' }, env.META_PAGE_TOKEN);
    return r.post_id || r.id;
  }
  const r = await graph(fetchFn, 'POST', `${env.META_PAGE_ID}/feed`, { message: p.caption, link: SPECIALS_URL }, env.META_PAGE_TOKEN);
  return r.id;
}

async function igUserId(fetchFn, env) {
  if (env.META_IG_USER_ID) return env.META_IG_USER_ID;
  const r = await graph(fetchFn, 'GET', `${env.META_PAGE_ID}`, { fields: 'instagram_business_account' }, env.META_PAGE_TOKEN);
  const id = r.instagram_business_account?.id;
  if (!id) throw new Error('the Facebook Page has no linked Instagram professional account (instagram_business_account is empty)');
  return id;
}

async function postInstagram(fetchFn, env, p, { pollMs = 10000 } = {}) {
  const ig = await igUserId(fetchFn, env);
  const container = await graph(fetchFn, 'POST', `${ig}/media`, { image_url: p.image, caption: p.caption }, env.META_PAGE_TOKEN);
  for (let i = 0; i < 6; i++) {
    const s = await graph(fetchFn, 'GET', `${container.id}`, { fields: 'status_code' }, env.META_PAGE_TOKEN);
    if (s.status_code === 'FINISHED') break;
    if (s.status_code === 'ERROR' || s.status_code === 'EXPIRED') throw new Error(`Instagram container ${s.status_code}`);
    if (i === 5) throw new Error(`Instagram container not ready after polling (last status ${s.status_code})`);
    await sleep(pollMs);
  }
  const pub = await graph(fetchFn, 'POST', `${ig}/media_publish`, { creation_id: container.id }, env.META_PAGE_TOKEN);
  return pub.id;
}

export async function main(argv = process.argv.slice(2), env = process.env, deps = {}) {
  const fetchFn = deps.fetch || globalThis.fetch;
  const git = deps.git || realGit;
  const log = deps.log || ((s) => console.log(s));
  const timing = deps.timing || {};
  const args = parseArgs(argv);

  const live = env.SOCIAL_POST_LIVE === 'true' && !args['dry-run'];
  const offline = Boolean(args.offline);
  if (offline && live) {
    log('::error::--offline cannot post; it is for dry runs and the selftest only');
    return 2;
  }

  const data = JSON.parse(readFileSync(args.data || 'src/data/specials.json', 'utf8'));
  const platforms = parsePlatforms(env.SOCIAL_POST_PLATFORMS);
  const maxAgeDays = args['max-age-days'] !== undefined ? Number(args['max-age-days']) : DEFAULT_MAX_AGE_DAYS;
  const now = args.now ? new Date(args.now) : new Date();

  let postedTags;
  if (offline || args['posted-tags'] !== undefined) {
    postedTags = new Set(String(args['posted-tags'] || '').split(',').map((s) => s.trim()).filter(Boolean));
  } else {
    postedTags = parseLsRemoteTags(git(['ls-remote', '--tags', 'origin', `refs/tags/${TAG_PREFIX}/*`]));
  }

  const p = plan({ data, postedTags, now, maxAgeDays, platforms });
  for (const w of p.warnings || []) log(`::warning::${w}`);
  if (p.action === 'skip') {
    log(`skip: ${p.reason}`);
    return 0;
  }

  log(`board ${p.date} (${p.week}), mode ${live ? 'LIVE' : 'DRY_RUN'}, targets: ${p.targets.map((t) => `${t.platform}:${t.mode}`).join(', ')}`);
  log(`image: ${p.image || 'none (text-only board)'}`);
  log('caption:\n----\n' + p.caption + '\n----');

  if (!offline) {
    await checkLive(fetchFn, data, log, timing.live);
    log(`live check ok: ${SPECIALS_URL} shows this board`);
    if (p.image) {
      const img = await checkImage(fetchFn, p.image);
      log(`image check ok: ${img.type}, ${img.len || 'unknown'} bytes`);
    }
  }

  if (!live) {
    log(`DRY_RUN: nothing posted. Would post to ${p.targets.map((t) => t.platform).join(' and ')} and push tags ${p.targets.map((t) => t.tag).join(', ')}.`);
    return 0;
  }

  const missing = ['META_PAGE_ID', 'META_PAGE_TOKEN'].filter((k) => !env[k]);
  if (missing.length) {
    log(`::error::SOCIAL_POST_LIVE is true but ${missing.join(' and ')} ${missing.length > 1 ? 'are' : 'is'} not set; nothing posted`);
    return 1;
  }

  const failures = [];
  for (const t of p.targets) {
    let id;
    try {
      id = t.platform === 'facebook' ? await postFacebook(fetchFn, env, p, t) : await postInstagram(fetchFn, env, p, timing.ig);
      log(`${t.platform}: posted, id ${id}`);
    } catch (err) {
      failures.push(`${t.platform}: ${err.message}`);
      continue;
    }
    try {
      git(['tag', '-a', t.tag, '-m', `${t.platform} post ${id} for the ${p.date} specials board`]);
      git(['push', 'origin', `refs/tags/${t.tag}`]);
      log(`${t.platform}: recorded as tag ${t.tag}`);
    } catch (err) {
      failures.push(`${t.platform} POSTED (id ${id}) but tag ${t.tag} was not pushed, so a rerun would post it again; push the tag by hand first`);
    }
  }
  if (failures.length) {
    log(`::error::Specials social post for ${p.date}: ${failures.join(' | ')}`);
    return 1;
  }
  return 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  main().then((code) => process.exit(code), (err) => {
    console.log(`::error::Specials social post crashed: ${err.message}`);
    process.exit(1);
  });
}
