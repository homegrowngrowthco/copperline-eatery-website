// Finds a freely licensed photo on Wikimedia Commons for a blog post and
// downloads it into public/blog/ (op #1715). Ian, 2026-11-20 (claude-projects-ops
// #223): every post needs a relevant photo that is not Copperline's own, unless
// the post is about Copperline. Local-event posts therefore get a photo of the
// event or its venue, with the credit Commons requires shown under the photo.
//
// Only CC0, public domain, CC BY and CC BY-SA files are taken. The download is
// Commons' own 1200 px rendering (a .jpg), so no resize step is needed.
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const API = 'https://commons.wikimedia.org/w/api.php';
const UA = 'copperline-blog-engine/1.0 (https://copperlineeatery.com)';
const WIDTH = 1200;
const OK_LICENSE = /^(cc0|public domain|pd\b|cc by(-sa)? \d)/i;

const stripHtml = (s = '') => s.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: 'json', origin: '*', ...params })}`;
  const r = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`Commons API ${r.status}`);
  return r.json();
}

// Pure: picks the best candidate from imageinfo pages. Exported for the self-test.
export function pickCandidate(pages) {
  const out = [];
  for (const p of pages) {
    const ii = p.imageinfo?.[0];
    if (!ii) continue;
    const md = ii.extmetadata ?? {};
    const license = stripHtml(md.LicenseShortName?.value);
    const artist = stripHtml(md.Artist?.value) || stripHtml(md.Credit?.value);
    if (!OK_LICENSE.test(license) || !artist) continue;
    if (!/^image\/jpeg$/.test(ii.mime ?? '')) continue;
    if (!(ii.width >= 1000 && ii.width > ii.height)) continue;
    out.push({
      title: p.title,
      thumbUrl: ii.thumburl ?? ii.url,
      descriptionUrl: ii.descriptionurl,
      license,
      artist: artist.slice(0, 120),
      width: ii.width,
      height: ii.height,
      index: p.index ?? 0,
    });
  }
  out.sort((a, b) => a.index - b.index);
  return out[0] ?? null;
}

// Tries each query in turn; returns the first usable candidate or null.
export async function findPhoto(queries) {
  for (const q of queries.filter(Boolean)) {
    const j = await api({
      action: 'query',
      generator: 'search',
      gsrsearch: `${q} filetype:bitmap`,
      gsrnamespace: '6',
      gsrlimit: '10',
      prop: 'imageinfo',
      iiprop: 'url|extmetadata|size|mime',
      iiurlwidth: String(WIDTH),
    });
    const pages = Object.values(j.query?.pages ?? {});
    const hit = pickCandidate(pages);
    if (hit) return { ...hit, query: q };
  }
  return null;
}

// One named Commons file ("File:..."), with the same license checks as a search hit.
export async function getFile(title) {
  const j = await api({
    action: 'query',
    titles: title.startsWith('File:') ? title : `File:${title}`,
    prop: 'imageinfo',
    iiprop: 'url|extmetadata|size|mime',
    iiurlwidth: String(WIDTH),
  });
  const hit = pickCandidate(Object.values(j.query?.pages ?? {}));
  return hit ? { ...hit, query: `file ${title}` } : null;
}

export async function downloadPhoto(candidate, outPath) {
  const r = await fetch(candidate.thumbUrl, { headers: { 'User-Agent': UA } });
  if (!r.ok) throw new Error(`download ${r.status} for ${candidate.thumbUrl}`);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, Buffer.from(await r.arrayBuffer()));
}

// Short enough for one line under the photo on a phone; the link (imageCreditUrl)
// goes to the Commons file page, which carries the full license.
export const creditLine = (c) => `${c.artist}, ${c.license}`;
