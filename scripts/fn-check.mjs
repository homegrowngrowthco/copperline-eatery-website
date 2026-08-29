// Function verification harness: bundle both Netlify functions with esbuild
// (mirrors zip-it-and-ship-it) then invoke the handlers on side-effect-free
// paths: GET -> 405 for both; POST without basic auth -> 401 (inbound-email).
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const outDir = mkdtempSync(join(tmpdir(), 'fn-check-'));
const fns = ['inbound-email', 'submit-specials', 'submission-created', 'specials-board'];

for (const fn of fns) {
  await build({
    entryPoints: [`netlify/functions/${fn}.ts`],
    bundle: true,
    platform: 'node',
    format: 'esm',
    target: 'node22',
    outfile: join(outDir, `${fn}.mjs`),
    logLevel: 'error',
    // Node built-ins only; all npm deps get bundled so resolution is proven.
    banner: { js: "import { createRequire } from 'node:module'; const require = createRequire(import.meta.url);" },
  });
  console.log(`bundle OK: ${fn}`);
}

const checks = [];
for (const fn of fns) {
  const mod = await import(pathToFileURL(join(outDir, `${fn}.mjs`)).href);
  if (typeof mod.default !== 'function') throw new Error(`${fn}: no default handler export`);
  if (fn === 'specials-board') continue; // GET is its supported method; checked separately below.
  const resGet = await mod.default(new Request('http://localhost/x', { method: 'GET' }), { ip: '127.0.0.1' });
  checks.push([`${fn} GET`, resGet.status, 405]);
}

// submission-created: non-quote forms are ignored; a quote submission with no
// Postmark token configured must exit cleanly without any network I/O; and
// the exported formatter must produce a readable email from a real payload.
delete process.env.POSTMARK_SERVER_TOKEN;
const submission = await import(pathToFileURL(join(outDir, 'submission-created.mjs')).href);
const quoteData = {
  'name': 'Test Person',
  'phone': '413-555-0100',
  'email': 'test@example.com',
  'event-date': '2026-08-12',
  'guest-count': '50',
  'event-town': 'Springfield, MA',
  'event-type': 'Corporate / office',
  'service-style': 'Drop-off, hot and ready',
  'package': 'Deluxe Buffet',
  'menu-selection':
    'Deluxe Buffet at $24.99 per person\nEntrees: Chicken Marsala, Baked Haddock\nComes with: garden salad, rolls\n\nPer person: $24.99\nGuests: 50\nFood subtotal: $1,249.50\nService charge (15%): $187.43\nTax (7%): $100.58\nEstimated total: $1,537.51',
  'per-person': '$24.99',
  'food-subtotal': '$1,249.50',
  'service-charge': '$187.43',
  'tax': '$100.58',
  'estimated-total': '$1,537.51',
  'allergies': 'Nut allergy at one table',
};
const resOtherForm = await submission.default(
  new Request('http://localhost/x', {
    method: 'POST',
    body: JSON.stringify({ payload: { form_name: 'catering-inquiry', data: {} } }),
  }),
  {},
);
checks.push(['submission-created other form', resOtherForm.status, 200]);
const resQuoteNoEnv = await submission.default(
  new Request('http://localhost/x', {
    method: 'POST',
    body: JSON.stringify({ payload: { form_name: 'catering-quote', number: 1, data: quoteData } }),
  }),
  {},
);
checks.push(['submission-created quote w/o env', resQuoteNoEnv.status, 200]);
const email = submission.renderQuoteEmail(quoteData);
const emailOk =
  email.subject.includes('Test Person') &&
  email.subject.includes('50 guests') &&
  email.text.includes('$1,537.51') &&
  email.text.includes('attached as a PDF') &&
  email.attachmentName === 'catering-quote-test-person.pdf';
checks.push(['submission-created email render', emailOk ? 'ok' : 'bad', 'ok']);

// The parsed model feeds every line the PDF draws, so assert content there
// (compressed PDF streams are not raw-searchable), then prove the generated
// bytes are a loadable one-page PDF via a pdf-lib round trip.
const model = submission.buildQuoteModel(quoteData, 'July 27, 2026');
const modelOk =
  model.packageLine === 'Deluxe Buffet at $24.99 per person' &&
  model.courseRows.some(([label, v]) => label === 'Entrees' && v.includes('Chicken Marsala')) &&
  model.contact.length === 3 &&
  model.event.length === 5 &&
  model.totals.some(([label, v]) => label === 'Estimated total' && v === '$1,537.51') &&
  model.allergies.includes('Nut allergy');
checks.push(['submission-created quote model', modelOk ? 'ok' : 'bad', 'ok']);
// The print-sheet replica embeds 4 brand fonts + the logo, so a healthy PDF
// is well into six figures of bytes and reloads as a parseable document.
const pdfBytes = await submission.buildQuotePdf(model);
const { PDFDocument } = await import('pdf-lib');
const reloaded = await PDFDocument.load(pdfBytes);
const pdfOk =
  Buffer.from(pdfBytes).toString('latin1', 0, 5) === '%PDF-' &&
  pdfBytes.length > 50_000 &&
  reloaded.getPageCount() >= 1;
checks.push(['submission-created PDF render', pdfOk ? 'ok' : 'bad', 'ok']);

// inbound-email: POST without auth env vars set must 401 before any I/O.
delete process.env.POSTMARK_WEBHOOK_USER;
delete process.env.POSTMARK_WEBHOOK_PASS;
const inbound = await import(pathToFileURL(join(outDir, 'inbound-email.mjs')).href);
const resPost = await inbound.default(
  new Request('http://localhost/x', { method: 'POST', body: '{}' }),
  {},
);
checks.push(['inbound-email POST unauthed', resPost.status, 401]);

// specials-board: GET is the supported method (not POST), and an empty key
// must 404 WITHOUT ever calling Blobs, keeping this check side-effect-free.
const board = await import(pathToFileURL(join(outDir, 'specials-board.mjs')).href);
const resBoardPost = await board.default(new Request('http://localhost/specials-board/test.jpg', { method: 'POST' }), {});
checks.push(['specials-board POST', resBoardPost.status, 405]);
const resBoardEmptyKey = await board.default(new Request('http://localhost/specials-board/', { method: 'GET' }), {});
checks.push(['specials-board GET empty key', resBoardEmptyKey.status, 404]);

let fail = 0;
for (const [name, got, want] of checks) {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name} -> ${got} (want ${want})`);
}
process.exit(fail ? 1 : 0);
