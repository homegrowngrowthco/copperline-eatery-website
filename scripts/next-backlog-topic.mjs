#!/usr/bin/env node
// Prints the id of the first "proposed" content/backlog.json entry to stdout,
// or nothing (exit 0) if the backlog is empty of proposed topics. Used by
// .github/workflows/weekly-post.yml to pick a topic when none is given
// explicitly via workflow_dispatch.
//
// --exclude=<comma-separated ids> (added 2026-09-24, AUDIT-SEO-2026-09-24.md
// section 6, fix 4) skips those ids. The workflow's "Pick topic" step uses
// this to walk past a topic that already has an open PR or a merged post
// whose backlog status flip never landed on master (the backlog.json status
// flip lives only in the PR branch until it merges, so the cron generated
// "breakfast-catering-quantities" three Mondays running before #16 merged).
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backlog = JSON.parse(readFileSync(resolve(repoRoot, 'content/backlog.json'), 'utf8'));

const excludeArg = process.argv.find((a) => a.startsWith('--exclude='));
const excluded = new Set(
  excludeArg
    ? excludeArg
        .slice('--exclude='.length)
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : [],
);

const next = backlog.find((t) => t.status === 'proposed' && !excluded.has(t.id));
if (next) process.stdout.write(next.id);
