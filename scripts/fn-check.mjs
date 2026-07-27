// Function verification harness: bundle both Netlify functions with esbuild
// (mirrors zip-it-and-ship-it) then invoke the handlers on side-effect-free
// paths: GET -> 405 for both; POST without basic auth -> 401 (inbound-email).
import { build } from 'esbuild';
import { pathToFileURL } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const outDir = mkdtempSync(join(tmpdir(), 'fn-check-'));
const fns = ['inbound-email', 'submit-specials'];

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
  const resGet = await mod.default(new Request('http://localhost/x', { method: 'GET' }), { ip: '127.0.0.1' });
  checks.push([`${fn} GET`, resGet.status, fn === 'inbound-email' ? 405 : 405]);
}

// inbound-email: POST without auth env vars set must 401 before any I/O.
delete process.env.POSTMARK_WEBHOOK_USER;
delete process.env.POSTMARK_WEBHOOK_PASS;
const inbound = await import(pathToFileURL(join(outDir, 'inbound-email.mjs')).href);
const resPost = await inbound.default(
  new Request('http://localhost/x', { method: 'POST', body: '{}' }),
  {},
);
checks.push(['inbound-email POST unauthed', resPost.status, 401]);

let fail = 0;
for (const [name, got, want] of checks) {
  const ok = got === want;
  if (!ok) fail++;
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${name} -> ${got} (want ${want})`);
}
process.exit(fail ? 1 : 0);
