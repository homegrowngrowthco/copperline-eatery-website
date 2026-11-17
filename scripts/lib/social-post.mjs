// Pure helpers for the weekly specials post to Facebook and Instagram (op #1658).
// No network and no git here, so scripts/social-post.selftest.mjs can test every
// rule offline. The runner is scripts/social-post.mjs; the trigger is
// .github/workflows/social-post.yml.

export const SITE = 'https://copperlineeatery.com';
export const SPECIALS_URL = `${SITE}/specials`;
export const GRAPH_VERSION = 'v27.0'; // latest Graph API version on 2026-11-17 (changelog: introduced 2026-11-04)
export const TAG_PREFIX = 'social-posted';
export const ALL_PLATFORMS = ['facebook', 'instagram'];
export const CAPTION_MAX = 2200; // Instagram caption cap; Facebook allows more
export const DEFAULT_MAX_AGE_DAYS = 6; // a board older than this is never posted (Saturday board, through Friday)

// Same rule as src/pages/specials/[date].astro: the board's date is updatedAt's
// first 10 characters, so the post and the archive page agree on the date.
export function boardDate(data) {
  const u = data && typeof data.updatedAt === 'string' ? data.updatedAt : '';
  return /^\d{4}-\d{2}-\d{2}/.test(u) ? u.slice(0, 10) : null;
}

// ISO 8601 week, e.g. 2026-11-14 -> "2026-W46". The idempotency key is the
// week, not the date, so a same-week correction (Saturday board, Sunday fix)
// never posts a second time.
export function isoWeek(dateStr) {
  const d = new Date(`${dateStr}T12:00:00Z`);
  if (Number.isNaN(d.getTime())) throw new Error(`bad date: ${dateStr}`);
  const day = d.getUTCDay() || 7; // Monday=1 .. Sunday=7
  d.setUTCDate(d.getUTCDate() + 4 - day); // the Thursday of this week decides the year
  const year = d.getUTCFullYear();
  const jan1 = new Date(Date.UTC(year, 0, 1, 12));
  const week = Math.ceil(((d - jan1) / 86400000 + 1) / 7);
  return `${year}-W${String(week).padStart(2, '0')}`;
}

export function tagName(platform, weekKey) {
  return `${TAG_PREFIX}/${platform}/${weekKey}`;
}

// `git ls-remote --tags origin` output -> Set of tag names.
export function parseLsRemoteTags(text) {
  const out = new Set();
  for (const line of String(text || '').split(/\r?\n/)) {
    const m = line.match(/\trefs\/tags\/(.+?)(\^\{\})?$/);
    if (m) out.add(m[1]);
  }
  return out;
}

export function parsePlatforms(str) {
  const list = String(str || ALL_PLATFORMS.join(','))
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  for (const p of list) {
    if (!ALL_PLATFORMS.includes(p)) throw new Error(`unknown platform "${p}" (allowed: ${ALL_PLATFORMS.join(', ')})`);
  }
  return [...new Set(list)];
}

// Deterministic text cleanup: the vision extraction can return em or en dashes
// (banned in anything this project publishes) and stray whitespace. Built from
// char codes so this file itself carries no dash characters.
export const DASH_CHARS = String.fromCharCode(0x2013, 0x2014);
const DASH_RE = new RegExp(`\\s*[${DASH_CHARS}]\\s*`, 'g');
export function cleanText(s) {
  return String(s ?? '')
    .replace(DASH_RE, ', ')
    .replace(/\s+/g, ' ')
    .replace(/^[,\s]+|[,\s]+$/g, '')
    .trim();
}

export function formatItem(item) {
  const name = cleanText(item && item.name);
  if (!name) return null;
  let desc = cleanText(item.description);
  if (desc) desc = desc.charAt(0).toLowerCase() + desc.slice(1);
  const price = cleanText(item.price);
  return `${name}${desc ? ` (${desc})` : ''}${price ? `, ${price}` : ''}`;
}

export function buildCaption(data, { max = CAPTION_MAX } = {}) {
  const items = (data && Array.isArray(data.specials) ? data.specials : []).map(formatItem).filter(Boolean);
  const head = "This week's specials at The Copperline Eatery in Chicopee:";
  const tail = `See the board: ${SPECIALS_URL}\n\n#ChicopeeMA #breakfast #specials`;
  const compose = (list, more) =>
    [head, '', ...list.map((l) => `• ${l}`), ...(more ? ['• and more on the board'] : []), '', tail].join('\n');
  let kept = items.slice();
  let caption = compose(kept, false);
  while (caption.length > max && kept.length > 1) {
    kept = kept.slice(0, -1);
    caption = compose(kept, true);
  }
  return caption.length > max ? caption.slice(0, max) : caption;
}

// The board photo through the Netlify Image CDN, cropped to 1080x1350 (4:5,
// the tallest ratio Instagram accepts; board photos are 3:4) as a JPEG
// (Instagram accepts JPEG only). Same CDN the site already uses for og:image.
export function imageFor(data) {
  const key = data && data.board && data.board.key;
  if (!key || !/^[A-Za-z0-9._-]+$/.test(key)) return null;
  return `${SITE}/.netlify/images?url=/specials-board/${key}&w=1080&h=1350&fit=cover&fm=jpg&q=85`;
}

// Decide what to post. Returns { action: 'skip', reason } or
// { action: 'post', date, week, caption, image, targets, warnings }, where each
// target is { platform, tag, mode: 'photo' | 'link' }.
export function plan({ data, postedTags = new Set(), now = new Date(), maxAgeDays = DEFAULT_MAX_AGE_DAYS, platforms = ALL_PLATFORMS }) {
  const date = boardDate(data);
  if (!date) return { action: 'skip', reason: 'specials.json has no updatedAt date' };
  if (!Array.isArray(data.specials) || data.specials.filter((s) => formatItem(s)).length === 0) {
    return { action: 'skip', reason: 'the current board has no specials' };
  }
  const ageDays = (now.getTime() - new Date(`${date}T00:00:00Z`).getTime()) / 86400000;
  if (ageDays > maxAgeDays + 1) {
    return { action: 'skip', reason: `board ${date} is older than ${maxAgeDays} days; not posting a stale board` };
  }
  const week = isoWeek(date);
  const image = imageFor(data);
  const warnings = [];
  const targets = [];
  const already = [];
  for (const platform of platforms) {
    const tag = tagName(platform, week);
    if (postedTags.has(tag)) {
      already.push(platform);
      continue;
    }
    if (platform === 'instagram' && !image) {
      warnings.push(`board ${date} has no photo; Instagram needs an image, so Instagram is skipped this week`);
      continue;
    }
    targets.push({ platform, tag, mode: image ? 'photo' : 'link' });
  }
  if (targets.length === 0) {
    const why = already.length ? `already posted for ${week} (${already.join(', ')})` : 'nothing to post';
    return { action: 'skip', reason: why, warnings };
  }
  return { action: 'post', date, week, caption: buildCaption(data), image, targets, warnings };
}
