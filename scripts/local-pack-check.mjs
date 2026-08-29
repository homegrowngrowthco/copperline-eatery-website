// Local-pack + competitor re-measure for copperlineeatery.com (DataForSEO, read-only, ~$0.15 per run).
//
// Pulls (1) the Google local pack + top organic for a set of breakfast/catering queries from FOUR
// coordinates (pack results are proximity-sensitive; a single pull at the restaurant's own
// coordinates is proximity-biased and over-reports pack rank), and (2) the nearby breakfast/
// brunch/diner/cafe Google listings (rating, reviews, GBP photo count, claimed, website domain).
//
// Usage (creds are DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD in growth-engine/.env):
//   node --env-file=../../growth-engine/.env scripts/local-pack-check.mjs [--out=audits/local-pack-<date>.json]
// First used for audits/AUDIT-GROWTH-2026-08-29.md. Compare against that file's section 3.3 / 3.4.
import { writeFileSync } from 'node:fs';

const login = process.env.DATAFORSEO_LOGIN, pw = process.env.DATAFORSEO_PASSWORD;
if (!login || !pw) { console.error('DATAFORSEO_LOGIN / DATAFORSEO_PASSWORD not in env (use --env-file=../../growth-engine/.env)'); process.exit(1); }
const auth = 'Basic ' + Buffer.from(`${login}:${pw}`).toString('base64');
const outArg = process.argv.find((a) => a.startsWith('--out='));
const outPath = outArg ? outArg.slice(6) : `local-pack-${new Date().toISOString().slice(0, 10)}.json`;

const POINTS = {
  'restaurant (409 Broadway)': '42.146927,-72.579556',
  'chicopee city hall': '42.1487,-72.6079',
  'springfield downtown': '42.1015,-72.5898',
  'holyoke center': '42.2043,-72.6162',
};
const QUERIES = ['breakfast near me', 'breakfast chicopee ma', 'brunch chicopee ma', 'lunch chicopee ma', 'catering chicopee ma', 'breakfast catering near me', 'diner near me'];
const US = /copperline/i;

async function post(path, body) {
  const r = await fetch('https://api.dataforseo.com/v3' + path, { method: 'POST', headers: { Authorization: auth, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const j = await r.json();
  if (j.status_code !== 20000) throw new Error(`${path}: ${j.status_code} ${j.status_message}`);
  return j;
}

let cost = 0;
const out = { pulledAt: new Date().toISOString(), serp: {}, listings: [] };

for (const [point, coord] of Object.entries(POINTS)) {
  console.log(`\n=== from ${point} ===`);
  for (const q of QUERIES) {
    const j = await post('/serp/google/organic/live/advanced', [{ keyword: q, location_coordinate: coord, language_code: 'en', device: 'mobile', os: 'android', depth: 20 }]);
    cost += j.cost || 0;
    const items = j.tasks?.[0]?.result?.[0]?.items || [];
    const pack = items.filter((i) => i.type === 'local_pack' || i.type === 'map').map((i) => ({ title: i.title, rating: i.rating?.value, votes: i.rating?.votes_count }));
    const organic = items.filter((i) => i.type === 'organic').map((i) => ({ rank: i.rank_group, domain: i.domain }));
    const usPack = pack.findIndex((p) => US.test(p.title)) + 1;
    const usOrg = organic.find((o) => o.domain?.includes('copperline'))?.rank ?? null;
    const ai = items.some((i) => i.type === 'ai_overview');
    out.serp[`${point}|${q}`] = { pack, organic: organic.slice(0, 10), usPack, usOrg, ai };
    console.log(`${q.padEnd(28)} pack ${usPack ? '#' + usPack : 'ABSENT'}  organic ${usOrg ? '#' + usOrg : 'absent'}${ai ? '  [AI overview]' : ''}  | ${pack.map((p) => `${p.title} ${p.rating}/${p.votes}`).join(' | ')}`);
  }
}

const bl = await post('/business_data/business_listings/search/live', [{ categories: ['breakfast_restaurant', 'brunch_restaurant', 'diner', 'family_restaurant', 'cafe', 'coffee_shop', 'creperie'], location_coordinate: '42.146927,-72.579556,12', filters: [['rating.votes_count', '>=', 20]], order_by: ['rating.votes_count,desc'], limit: 100 }]);
cost += bl.cost || 0;
const CHAINS = /mcdonald|dunkin|starbucks|panera|ihop|denny|friendly|cracker barrel|wendy|burger king|tim horton|taco bell|chick-fil|olive garden|longhorn|applebee|chili|sonic|golden corral|barnes/i;
out.listings = (bl.tasks?.[0]?.result?.[0]?.items || []).map((r) => ({ title: r.title, category: r.category, rating: r.rating?.value, votes: r.rating?.votes_count, photos: r.total_photos, claimed: r.is_claimed, domain: r.domain, city: r.address_info?.city, place_id: r.place_id, attributes: r.attributes?.available_attributes }));
console.log(`\n=== listings within 12 km, >= 20 reviews, chains hidden (${out.listings.length} total) ===`);
for (const r of out.listings.filter((x) => !CHAINS.test(x.title))) {
  console.log(`${String(r.votes).padStart(5)}  ${r.rating}  ${(US.test(r.title) ? '>> ' : '   ') + r.title.padEnd(38).slice(0, 38)}  ${(r.city || '').padEnd(16)}  photos=${String(r.photos).padEnd(5)} claimed=${r.claimed}  ${r.domain || '(no website)'}`);
}
out.cost = cost;
writeFileSync(outPath, JSON.stringify(out, null, 2));
console.log(`\ncost $${cost.toFixed(3)}  ->  ${outPath}`);
