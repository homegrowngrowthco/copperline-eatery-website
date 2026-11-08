#!/usr/bin/env node
// Finds real local events for next month's posts (op #1549, blog redesign
// 2026-11-08). Ian wants topics "more local based on local events within 25
// mile radius of 01020", with sources, and nothing invented.
//
// One Claude call with the web search server tool. The model must return
// only events whose own page (or a dated news listing) states the date for
// the target year, with the source URLs it read. A deterministic check then
// drops any event whose sources were not among the URLs the search tool
// actually returned, and any event dated outside the target window.
//
// Usage: node scripts/research-events.mjs --month=2026-12 --out=<file.json>
//        node scripts/research-events.mjs --check=<file.json>   (no API call;
//        re-runs the date-window check on a saved file)
import { writeFileSync, readFileSync } from 'node:fs';
import { ask, lastJson } from './lib/claude.mjs';

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }),
);

export const TOWNS = [
  'Chicopee', 'Springfield', 'Holyoke', 'West Springfield', 'Ludlow', 'South Hadley', 'Granby',
  'Agawam', 'Westfield', 'Longmeadow', 'East Longmeadow', 'Wilbraham', 'Hampden', 'Palmer',
  'Belchertown', 'Easthampton', 'Southampton', 'Northampton', 'Hadley', 'Amherst', 'Southwick',
  'Enfield CT', 'Suffield CT', 'Somers CT',
];

// The window a month's posts can point at: the target month plus the first
// week of the next one (a post dated the last Monday can mention an event a
// few days later).
export function monthWindow(month) {
  const [y, m] = month.split('-').map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 7));
  return { start, end };
}

export function inWindow(ev, month) {
  const { start, end } = monthWindow(month);
  const s = new Date(`${ev.startDate}T00:00:00Z`);
  const e = new Date(`${ev.endDate || ev.startDate}T00:00:00Z`);
  if (Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return false;
  return e >= start && s <= end;
}

// Same page, written two ways: ignore protocol, "www.", query, hash, trailing slash and case.
export const norm = (u) =>
  String(u)
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/[#?].*$/, '')
    .replace(/\/+$/, '');

async function main() {
  if (args.check) {
    const saved = JSON.parse(readFileSync(args.check, 'utf8'));
    const bad = saved.events.filter((e) => !inWindow(e, saved.month));
    console.log(bad.length ? `FAIL: ${bad.length} event(s) outside ${saved.month}` : `ok: ${saved.events.length} event(s) inside ${saved.month}`);
    process.exit(bad.length ? 1 : 0);
  }
  if (!/^\d{4}-\d{2}$/.test(args.month ?? '') || !args.out) {
    console.error('Usage: node scripts/research-events.mjs --month=YYYY-MM --out=<file.json>');
    process.exit(1);
  }
  const month = args.month;
  const { start, end } = monthWindow(month);
  const span = `${start.toISOString().slice(0, 10)} to ${end.toISOString().slice(0, 10)}`;

  const system = `You research local events for the blog of The Copperline Eatery, a family-owned breakfast and lunch diner at 409 Broadway, Chicopee, MA 01020 (open Monday to Friday 6 a.m. to 2 p.m., Saturday 6 a.m. to 1:30 p.m., Sunday 7 a.m. to 1 p.m.). The posts help local people plan their week, so the events must be real and their dates exact.

Rules:
- Only list an event if a page you actually read states its date for ${start.getUTCFullYear()} (the organizer's page first, then a dated news or city calendar listing). If a page only shows a past year's date, leave the event out. Never infer a date from earlier years.
- Within 25 miles of ZIP 01020. Towns in range include ${TOWNS.join(', ')}.
- Prefer events that happen in the morning or daytime, or that run for days or weeks, since the diner closes in the early afternoon. Evening-only events are allowed but mark them.
- Community events people actually go to: parades, road races and fun runs, fairs and festivals, farmers and holiday markets, museum and library events, school and city events, sports at local venues, seasonal attractions. No bars, no paid promotions, no national chains.
- Copy names, dates, times and venues exactly as the source states them. If the source does not give a time, leave startTime empty.`;

  const user = `Find 8 to 15 events dated between ${span}. Search widely (city calendars for Chicopee, Springfield, Holyoke, Westfield, Northampton, Amherst; Springfield Museums; Eastern States Exposition; MassMutual Center; local race calendars; MassLive and Western Mass News event listings).

When you are done, end your reply with a single JSON object and nothing after it:
{"events": [{"name": string, "startDate": "YYYY-MM-DD", "endDate": "YYYY-MM-DD", "startTime": string, "timeOfDay": "morning" | "daytime" | "evening" | "all-day" | "multi-day", "town": string, "venue": string, "summary": string (one plain sentence, only what the source says), "sourceUrls": [string] (the pages you read that state the date)}]}`;

  const { text, searchedUrls } = await ask({
    system,
    user,
    effort: 'high',
    tools: [
      {
        type: 'web_search_20260209',
        name: 'web_search',
        max_uses: 20,
        user_location: { type: 'approximate', city: 'Chicopee', region: 'Massachusetts', country: 'US', timezone: 'America/New_York' },
      },
    ],
  });

  const parsed = lastJson(text);
  const seen = new Set([...searchedUrls].map(norm));
  const kept = [];
  const dropped = [];
  for (const ev of parsed.events ?? []) {
    const sources = (ev.sourceUrls ?? []).filter((u) => seen.has(norm(u)));
    if (!sources.length) {
      dropped.push(`${ev.name}: none of its sources came back from the search tool (${(ev.sourceUrls ?? []).join(', ') || 'no URLs'})`);
      continue;
    }
    if (!inWindow(ev, month)) {
      dropped.push(`${ev.name}: dated ${ev.startDate} to ${ev.endDate}, outside ${span}`);
      continue;
    }
    const slug = String(ev.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 50);
    kept.push({ id: `${slug}-${ev.startDate}`, ...ev, sourceUrls: sources });
  }

  for (const d of dropped) console.warn(`dropped: ${d}`);
  writeFileSync(args.out, JSON.stringify({ month, generatedAt: new Date().toISOString(), events: kept, dropped }, null, 2) + '\n');
  console.log(`Kept ${kept.length} event(s) for ${month}, dropped ${dropped.length}. Wrote ${args.out}`);
  if (!kept.length) process.exit(1);
}

await main();
