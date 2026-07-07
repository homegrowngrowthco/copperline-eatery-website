// Live on-page SEO crawl: fetches the prod sitemap, then every URL in it, and
// lints title/description lengths, canonicals, H1 count, duplicates, and
// em/en dashes. Zero deps; run with: node scripts/seo-crawl.mjs [host]
const HOST = (process.argv[2] || 'https://copperlineeatery.com').replace(/\/$/, '');
const UA = { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) seo-crawl' };

const sitemap = await (await fetch(`${HOST}/sitemap-0.xml`, { headers: UA })).text();
const urls = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
console.log(`sitemap URLs: ${urls.length}\n`);

const pick = (html, re) => (html.match(re) || [, ''])[1].replace(/\s+/g, ' ').trim();
const titles = new Map();
const descs = new Map();
let issues = 0;

for (const url of urls) {
  const res = await fetch(url, { headers: UA });
  const html = await res.text();
  const title = pick(html, /<title[^>]*>([^<]*)<\/title>/i);
  const desc = pick(html, /<meta\s+name="description"\s+content="([^"]*)"/i);
  const canonical = pick(html, /<link\s+rel="canonical"\s+href="([^"]*)"/i);
  const h1Count = (html.match(/<h1[\b\s>]/gi) || []).length;
  const dashes = (html.replace(/<script[\s\S]*?<\/script>/gi, '').match(/[–—]/g) || []).length;
  const path = url.replace(HOST, '') || '/';
  titles.set(title, (titles.get(title) || 0) + 1);
  descs.set(desc, (descs.get(desc) || 0) + 1);
  const flags = [
    res.status !== 200 && `HTTP${res.status}`,
    canonical !== url && `CANON:${canonical}`,
    h1Count !== 1 && `H1x${h1Count}`,
    (title.length > 65 || title.length < 20) && `title${title.length}`,
    (desc.length > 170 || desc.length < 60) && `desc${desc.length}`,
    dashes > 0 && `emdash${dashes}`,
  ].filter(Boolean);
  issues += flags.length;
  console.log(`${path.padEnd(38)} t${String(title.length).padStart(3)} d${String(desc.length).padStart(3)} ${flags.join(' ') || 'ok'}`);
}

const dupT = [...titles].filter(([, n]) => n > 1);
const dupD = [...descs].filter(([, n]) => n > 1);
if (dupT.length) { issues += dupT.length; console.log(`\nduplicate titles: ${JSON.stringify(dupT)}`); }
if (dupD.length) { issues += dupD.length; console.log(`duplicate descriptions: ${JSON.stringify(dupD)}`); }
console.log(`\n${issues === 0 ? 'ALL CLEAN' : issues + ' issue flag(s) above'}`);
