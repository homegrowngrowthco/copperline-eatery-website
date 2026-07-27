#!/usr/bin/env node
// Docs guardrail (node-only, zero deps). Run via `npm run qa:docs`.
// FAILS (exit 1) when:
//   - CLAUDE.md exceeds 400 lines (session history is creeping back in; it belongs in docs/SESSION_LOG.md)
//   - ../TODO.md (one level above the repo, if present) contains completed `- [x]` items (purge them; history lives in docs/SESSION_LOG.md)
//   - CLAUDE.md's dated "current state" heading is >14 days behind the latest non-docs commit
// WARNS (exit 0) when an open TODO item exceeds 400 characters (trim it; detail belongs in the linked doc),
// or when the dated current-state heading is missing entirely.

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;

// 1. CLAUDE.md line count
const claudePath = resolve(repoRoot, 'CLAUDE.md');
const claudeText = readFileSync(claudePath, 'utf8');
const claudeLines = claudeText.split('\n').length;
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

// 3. Stale current-state check: the dated "current state" heading in CLAUDE.md must not
//    lag the newest non-docs commit by more than 14 days.
const stateMatch = claudeText
  .split(/\r?\n/)
  .filter((l) => /^#{1,6}\s/.test(l))
  .map((l) => l.match(/current.*state.*\((\d{4}-\d{2}-\d{2})\)/i))
  .find(Boolean);
const stateDate = stateMatch ? stateMatch[1] : null;
let codeDate = '';
try {
  codeDate = execFileSync(
    'git',
    ['log', '-1', '--format=%cs', '--', '.', ':(exclude)*.md', ':(exclude)docs/', ':(exclude)audits/'],
    { cwd: repoRoot, encoding: 'utf8' },
  ).trim();
} catch {
  // git unavailable or not a repo; skip the staleness comparison
}
if (!stateDate) {
  console.warn('warn: CLAUDE.md has no dated current-state heading (expected e.g. "## Live site / current state (YYYY-MM-DD)").');
} else if (codeDate) {
  const lagDays = (Date.parse(codeDate) - Date.parse(stateDate)) / 86400000;
  if (lagDays > 14) {
    console.error(`FAIL: CLAUDE.md current-state header (${stateDate}) is >14 days behind the latest code change (${codeDate}). Update the section and its date.`);
    failed = true;
  } else {
    console.log(`ok: CLAUDE.md current-state date ${stateDate} is within 14 days of the latest code change (${codeDate}).`);
  }
}

process.exit(failed ? 1 : 0);
