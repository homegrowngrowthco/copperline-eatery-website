#!/usr/bin/env node
// Plans one month of weekly posts (op #1549, blog redesign 2026-11-08).
// No API call: deterministic picks from the researched events file and the
// customer-question queue in content/backlog.json.
//
// One slot per Monday of the month, pubDate = that Monday (the post goes
// live that morning; see src/lib/publish-window.mjs). Odd weeks try a local
// event first, even weeks a customer question first, each falling back to
// the other, so the month is a mix of local guide and question posts.
// A specials post is never a weekly slot: --specials-extra adds it as an
// extra item on the Thursday after the first Monday.
//
// Usage: node scripts/plan-month.mjs --month=2026-12 --events=<events.json>
//          --out=<plan.json> [--exclude=id1,id2] [--specials-extra]
//        node scripts/plan-month.mjs --self-test   (fixtures only)
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DAY = 86400000;
const iso = (d) => d.toISOString().slice(0, 10);

const args = Object.fromEntries(
  process.argv.slice(2).map((a) => {
    const m = a.match(/^--([^=]+)=(.*)$/);
    return m ? [m[1], m[2]] : [a.replace(/^--/, ''), true];
  }),
);

export function mondaysOf(month) {
  const [y, m] = month.split('-').map(Number);
  const out = [];
  for (let d = new Date(Date.UTC(y, m - 1, 1)); d.getUTCMonth() === m - 1; d = new Date(d.getTime() + DAY)) {
    if (d.getUTCDay() === 1) out.push(d);
  }
  return out;
}

const DAYTIME = new Set(['morning', 'daytime', 'all-day', 'multi-day']);

export function plan({ month, events, questions, exclude = new Set(), postExists = () => false, specialsExtra = false }) {
  const usedEvents = new Set();
  const usedQuestions = new Set();
  const items = [];

  const pickEvent = (monday) => {
    const from = monday.getTime();
    const to = from + 13 * DAY;
    const candidates = events
      .filter((e) => !usedEvents.has(e.id) && !exclude.has(e.id) && !postExists(e.id))
      .filter((e) => {
        const s = new Date(`${e.startDate}T00:00:00Z`).getTime();
        const end = new Date(`${e.endDate || e.startDate}T00:00:00Z`).getTime();
        return end >= from && s <= to;
      })
      .sort((a, b) => (DAYTIME.has(b.timeOfDay) ? 1 : 0) - (DAYTIME.has(a.timeOfDay) ? 1 : 0) || a.startDate.localeCompare(b.startDate));
    const main = candidates[0];
    if (!main) return null;
    usedEvents.add(main.id);
    // Up to two more events in the same week, for a short "also this week" line.
    const also = candidates
      .slice(1)
      .filter((e) => new Date(`${e.startDate}T00:00:00Z`).getTime() <= from + 7 * DAY)
      .slice(0, 2);
    for (const e of also) usedEvents.add(e.id);
    return { kind: 'local-event', id: main.id, event: main, alsoEvents: also };
  };

  const pickQuestion = () => {
    const q = questions.find((x) => !usedQuestions.has(x.id) && !exclude.has(x.id) && !postExists(x.id));
    if (!q) return null;
    usedQuestions.add(q.id);
    return { kind: 'customer-question', id: q.id, question: q };
  };

  mondaysOf(month).forEach((monday, i) => {
    const eventFirst = i % 2 === 0;
    const item = eventFirst ? pickEvent(monday) ?? pickQuestion() : pickQuestion() ?? pickEvent(monday);
    if (item) items.push({ slot: i + 1, pubDate: iso(monday), ...item });
    else items.push({ slot: i + 1, pubDate: iso(monday), kind: 'empty', id: null });
  });

  if (specialsExtra) {
    const first = mondaysOf(month)[0];
    items.push({ slot: 'extra', pubDate: iso(new Date(first.getTime() + 3 * DAY)), kind: 'specials-extra', id: `specials-board-${month}` });
  }
  return items;
}

function selfTest() {
  const events = [
    { id: 'parade-2026-12-05', startDate: '2026-12-05', endDate: '2026-12-05', timeOfDay: 'morning' },
    { id: 'lights-2026-11-25', startDate: '2026-11-25', endDate: '2027-01-03', timeOfDay: 'evening' },
    { id: 'race-2026-12-12', startDate: '2026-12-12', endDate: '2026-12-12', timeOfDay: 'morning' },
  ];
  const questions = [{ id: 'q1' }, { id: 'q2' }, { id: 'q3' }];
  const p = plan({ month: '2026-12', events, questions, specialsExtra: true });
  const checks = [
    [p.filter((x) => x.slot !== 'extra').length === 4, 'December 2026 has 4 Mondays'],
    [p[0].pubDate === '2026-12-07', 'first slot is Monday 2026-12-07'],
    [p.every((x) => x.kind === 'specials-extra' || x.slot !== 'extra'), 'specials post only as the extra'],
    [p.find((x) => x.slot === 'extra')?.pubDate === '2026-12-10', 'extra lands on Thursday'],
    [p[0].kind === 'local-event' && p[0].id === 'race-2026-12-12', 'week 1 picks the daytime event in the next 2 weeks (12-05 is before the slot)'],
    [p[1].kind === 'customer-question' && p[1].id === 'q1', 'week 2 is a question'],
    [new Set(p.map((x) => x.id)).size === p.length, 'no topic used twice'],
    [plan({ month: '2026-12', events, questions, exclude: new Set(['q1']) })[1].id === 'q2', 'excluded ids are skipped'],
  ];
  let bad = 0;
  for (const [ok, name] of checks) {
    console.log(`${ok ? 'ok' : 'FAIL'}: ${name}`);
    if (!ok) bad++;
  }
  return bad ? 1 : 0;
}

if (args['self-test']) process.exit(selfTest());

if (!/^\d{4}-\d{2}$/.test(args.month ?? '') || !args.events || !args.out) {
  console.error('Usage: node scripts/plan-month.mjs --month=YYYY-MM --events=<events.json> --out=<plan.json> [--exclude=a,b] [--specials-extra]');
  process.exit(1);
}
const events = JSON.parse(readFileSync(args.events, 'utf8')).events ?? [];
const backlog = JSON.parse(readFileSync(resolve(repoRoot, 'content/backlog.json'), 'utf8'));
const exclude = new Set(String(args.exclude ?? '').split(',').map((s) => s.trim()).filter(Boolean));
const postExists = (id) => existsSync(resolve(repoRoot, 'src/content/blog', `${id}.md`));
const items = plan({ month: args.month, events, questions: backlog.questions ?? [], exclude, postExists, specialsExtra: Boolean(args['specials-extra']) });
writeFileSync(args.out, JSON.stringify(items, null, 2) + '\n');
for (const it of items) console.log(`${it.pubDate} slot ${it.slot}: ${it.kind} ${it.id ?? '(nothing left to plan)'}`);
if (items.some((it) => it.kind === 'empty')) console.warn('warn: some weeks have no topic; add questions to content/backlog.json');
