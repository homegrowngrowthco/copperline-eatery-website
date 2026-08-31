#!/usr/bin/env node
// Prints the id of the first "proposed" content/backlog.json entry to stdout,
// or nothing (exit 0) if the backlog is empty of proposed topics. Used by
// .github/workflows/weekly-post.yml to pick a topic when none is given
// explicitly via workflow_dispatch.
import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const backlog = JSON.parse(readFileSync(resolve(repoRoot, 'content/backlog.json'), 'utf8'));
const next = backlog.find((t) => t.status === 'proposed');
if (next) process.stdout.write(next.id);
