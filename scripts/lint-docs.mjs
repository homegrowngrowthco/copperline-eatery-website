#!/usr/bin/env node
// Docs guardrail (node-only, zero deps). Run via `npm run qa:docs`.
// FAILS (exit 1) when:
//   - CLAUDE.md exceeds 400 lines (session history is creeping back in; it belongs in docs/SESSION_LOG.md)
//   - ../TODO.md (one level above the repo, if present) contains completed `- [x]` items (purge them; history lives in docs/SESSION_LOG.md)
// WARNS (exit 0) when an open TODO item exceeds 400 characters (trim it; detail belongs in the linked doc).

import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;

// 1. CLAUDE.md line count
const claudePath = resolve(repoRoot, 'CLAUDE.md');
const claudeLines = readFileSync(claudePath, 'utf8').split('\n').length;
if (claudeLines > 400) {
  console.error(`FAIL: CLAUDE.md is ${claudeLines} lines (limit 400). Move session history to docs/SESSION_LOG.md.`);
  failed = true;
} else {
  console.log(`ok: CLAUDE.md is ${claudeLines} lines (limit 400).`);
}

// 2. ../TODO.md (lives one level ABOVE the repo root; untracked by this repo, so it may be absent e.g. in CI)
const todoPath = resolve(repoRoot, '..', 'TODO.md');
if (!existsSync(todoPath)) {
  console.log('ok: ../TODO.md not present (skipping TODO checks).');
} else {
  const todoRaw = readFileSync(todoPath, 'utf8').split('\n');
  const doneItems = [];
  const longOpenItems = [];
  todoRaw.forEach((line, i) => {
    if (/^\s*-\s*\[x\]/i.test(line)) doneItems.push(i + 1);
    else if (/^\s*-\s*\[ \]/.test(line) && line.length > 400) longOpenItems.push({ line: i + 1, len: line.length });
  });
  if (doneItems.length > 0) {
    console.error(`FAIL: ../TODO.md contains ${doneItems.length} completed [x] item(s) at line(s) ${doneItems.join(', ')}. Purge them (record outcomes in docs/SESSION_LOG.md first).`);
    failed = true;
  } else {
    console.log('ok: ../TODO.md has no [x] items.');
  }
  for (const { line, len } of longOpenItems) {
    console.warn(`warn: ../TODO.md line ${line} is ${len} chars (>400). Trim it; put detail in the linked doc.`);
  }
  if (longOpenItems.length === 0) console.log('ok: no open TODO item exceeds 400 chars.');
}

process.exit(failed ? 1 : 0);
