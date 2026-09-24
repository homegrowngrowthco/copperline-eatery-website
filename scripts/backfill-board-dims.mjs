#!/usr/bin/env node
// One-time backfill for AUDIT-SEO-2026-09-24.md section 6, fix 2: the
// live boards in src/data/specials.json (current + history[]) were all
// published before storeBoardPhoto() started measuring width/height, so
// they render with no explicit size and trip Lighthouse's CLS check on
// /specials. Fetches each board that lacks dims from its public URL,
// measures it the same way storeBoardPhoto() does (image-size, EXIF
// orientation 5-8 swaps width/height), and writes width/height back into
// specials.json in place, touching nothing else. Run once by hand:
//   node scripts/backfill-board-dims.mjs
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { imageSize } from 'image-size';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DATA_PATH = resolve(repoRoot, 'src/data/specials.json');
const BOARD_BASE_URL = 'https://copperlineeatery.com/specials-board';

// Matches netlify/functions/lib/specials.ts's storeBoardPhoto() rotation
// handling: the Netlify Image CDN honors EXIF rotation, so the persisted
// width/height need to match the rotated (as-displayed) image.
const EXIF_ROTATED_ORIENTATIONS = new Set([5, 6, 7, 8]);

async function measure(key) {
  const url = `${BOARD_BASE_URL}/${key}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`fetch ${url} -> ${res.status}`);
  const bytes = new Uint8Array(await res.arrayBuffer());
  const size = imageSize(bytes);
  let { width, height } = size;
  if (size.orientation && EXIF_ROTATED_ORIENTATIONS.has(size.orientation)) {
    [width, height] = [height, width];
  }
  return { width, height };
}

async function backfillBoard(board, label) {
  if (!board || (board.width && board.height)) return false;
  try {
    const { width, height } = await measure(board.key);
    board.width = width;
    board.height = height;
    console.log(`ok: ${label} (${board.key}) -> ${width}x${height}`);
    return true;
  } catch (e) {
    console.error(`skip: ${label} (${board.key}): ${(e && e.message) || e}`);
    return false;
  }
}

const data = JSON.parse(readFileSync(DATA_PATH, 'utf8'));
let changed = false;

changed = (await backfillBoard(data.board, 'current')) || changed;
for (const entry of data.history ?? []) {
  changed = (await backfillBoard(entry.board, `history ${entry.date}`)) || changed;
}

if (changed) {
  writeFileSync(DATA_PATH, JSON.stringify(data, null, 2) + '\n');
  console.log('specials.json updated.');
} else {
  console.log('No boards needed backfilling.');
}
