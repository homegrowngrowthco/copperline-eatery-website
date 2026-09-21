#!/usr/bin/env node
// Docs guardrail (node-only, zero deps). Run via `npm run qa:docs` (also runs in CI on every push, non-blocking
// for the session-log check below; see .github/workflows/deploy.yml).
// FAILS (exit 1) when:
//   - CLAUDE.md exceeds 400 lines (session history is creeping back in; it belongs in docs/SESSION_LOG.md)
//   - ../TODO.md (one level above the repo, if present) contains completed `- [x]` items (purge them; history lives in docs/SESSION_LOG.md)
//   - CLAUDE.md's dated "current state" heading is >14 days behind the latest non-docs commit
//   - the latest non-docs, non-automated commit's short SHA is still uncited in docs/SESSION_LOG.md after >14 days
//     (same grace period as the CLAUDE.md staleness check above; a fix that ships and is never logged)
// WARNS (exit 0) when an open TODO item exceeds 400 characters (trim it; detail belongs in the linked doc),
// when the dated current-state heading is missing entirely, or when that latest commit is uncited but still
// within the 14-day grace period (session may still be in progress).

import { readFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
let failed = false;

// Emits a normal console line, plus a GitHub Actions annotation (visible on the run summary,
// not just buried in logs) when running in CI.
function note(level, msg) {
  const text = `${level.toUpperCase()}: ${msg}`;
  if (level === 'fail') console.error(text);
  else console.warn(text);
  if (process.env.GITHUB_ACTIONS) {
    console.log(`::${level === 'fail' ? 'error' : 'warning'}::${msg}`);
  }
}

// 1. CLAUDE.md line count
const claudePath = resolve(repoRoot, 'CLAUDE.md');
const claudeText = readFileSync(claudePath, 'utf8');
const claudeLines = claudeText.split('\n').length;
if (claudeLines > 400) {
  note('fail', `CLAUDE.md is ${claudeLines} lines (limit 400). Move session history to docs/SESSION_LOG.md.`);
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
    note('fail', `../TODO.md contains ${doneItems.length} completed [x] item(s) at line(s) ${doneItems.join(', ')}. Purge them (record outcomes in docs/SESSION_LOG.md first).`);
    failed = true;
  } else {
    console.log('ok: ../TODO.md has no [x] items.');
  }
  for (const { line, len } of longOpenItems) {
    note('warn', `../TODO.md line ${line} is ${len} chars (>400). Trim it; put detail in the linked doc.`);
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
  note('warn', 'CLAUDE.md has no dated current-state heading (expected e.g. "## Live site / current state (YYYY-MM-DD)").');
} else if (codeDate) {
  const lagDays = (Date.parse(codeDate) - Date.parse(stateDate)) / 86400000;
  if (lagDays > 14) {
    note('fail', `CLAUDE.md current-state header (${stateDate}) is >14 days behind the latest code change (${codeDate}). Update the section and its date.`);
    failed = true;
  } else {
    console.log(`ok: CLAUDE.md current-state date ${stateDate} is within 14 days of the latest code change (${codeDate}).`);
  }
}

// 4. Session-log citation check: the latest commit that isn't a docs edit or the automated
//    specials-publish pipeline should be cited (by short SHA) somewhere in docs/SESSION_LOG.md.
//    Catches exactly the failure mode from 2026-09-17 (commit 7279a99 shipped and was never logged).
const sessionLogPath = resolve(repoRoot, 'docs', 'SESSION_LOG.md');
let lastRealCommit = '';
try {
  lastRealCommit = execFileSync(
    'git',
    [
      'log', '-1', '--format=%h|%cs', '--',
      '.', ':(exclude)*.md', ':(exclude)docs/', ':(exclude)audits/', ':(exclude)src/data/specials.json',
    ],
    { cwd: repoRoot, encoding: 'utf8' },
  ).trim();
} catch {
  // git unavailable or not a repo; skip
}
if (lastRealCommit && existsSync(sessionLogPath)) {
  const [sha, commitDate] = lastRealCommit.split('|');
  const sessionLogText = readFileSync(sessionLogPath, 'utf8');
  if (sessionLogText.includes(sha)) {
    console.log(`ok: latest shipped commit ${sha} (${commitDate}) is cited in docs/SESSION_LOG.md.`);
  } else {
    const lagDays = (Date.now() - Date.parse(commitDate)) / 86400000;
    const msg = `latest shipped commit ${sha} (${commitDate}) is not cited anywhere in docs/SESSION_LOG.md. Add a session entry (see convention at the top of that file).`;
    if (lagDays > 14) {
      note('fail', msg);
      failed = true;
    } else {
      note('warn', msg);
    }
  }
}

process.exit(failed ? 1 : 0);
