// Shared, side-effect-free content rules for the weekly local-post engine.
// Imported by both generate-post.mjs (to instruct the humanize pass) and
// blog-gates.mjs (as a deterministic backstop check) so the two never drift.

// Words/phrases that read as generated-content tells.
export const BANNED_PHRASES = [
  'delve', 'crucial', 'game changer', 'game-changer', 'streamline', 'leverage',
  'robust', 'utilize', "it's worth noting", 'in conclusion', "in today's",
  'cutting edge', 'cutting-edge', 'seamlessly', 'navigating the', 'unlock the',
  'dive into', 'at the end of the day', 'moving the needle', 'low-hanging fruit',
  'elevate your', 'next level', 'whether you', 'when it comes to', 'no fluff',
  'a testament to', 'we keep it simple', 'the most honest thing',
  // Added 2026-09-06 after Ian flagged the first three posts as reading like AI.
  // Every one of these appeared in a shipped or drafted post.
  'the kind of thing that', 'feature, not a flaw', 'quiet workhorse',
  'worth lingering', 'does not need much else', "doesn't need much else",
  'genuinely', 'intentional rather than', 'more than it sounds',
  'as much about', 'is only part of the story', 'the story behind',
  'has a way of', 'a good mood', 'grounding meal', 'composed',
  'built to order', 'made with care', 'labor of love', 'stands on its own',
  'front and center', 'the main event', 'speaks for itself', 'a bit more',
  'a little more personality', 'there for anyone who', 'for anyone who wants',
];

// Rhetorical contrast patterns ("X, not Y", "rather than Y", "isn't about X")
// are the single strongest generated-prose tell in the posts Ian rejected.
// A real person writing about their diner states the fact; they do not keep
// framing it against an imagined alternative. Counted, not banned outright:
// one in a post is fine, three or more fails the gate.
export const CONTRAST_PATTERNS = [
  /\brather than\b/gi,
  /\binstead of (?:being|just|simply|merely)\b/gi,
  /,\s*not (?:a |an |the |just |some )?[a-z][a-z\s-]{2,40}[.,;]/gi,
  /\bis not about\b|\bisn't about\b|\bis less about\b|\bis as much about\b/gi,
  /\bnot because\b[^.]{0,60}\bbut because\b/gi,
  /\bthat is not what\b|\bthat's not what\b/gi,
];
export const CONTRAST_PATTERN_HARD_LIMIT = 3;

// Claims no grounding source can back. menuData.json carries names, prices,
// and short ingredient descriptions only; restaurant.ts carries NAP, hours,
// awards, the alcohol note, and GROUNDING_FACTS. Anything past that is
// invented. Two tiers:
//
// HARD: dish history ("on the menu since"), cooking method ("griddle",
// "recipe"), and crowd claims ("most people order"). None of these has ever
// been true in a post and there is no source that could make one true, so
// the gate fails. The 2026-08-31 hash draft (PR #10) had eleven of them.
export const UNSOURCED_CLAIMS_HARD = [
  'griddle', 'flat-top', 'flattop', 'flat top', 'recipe', 'secret',
  'since we opened', 'since the early days', 'for decades', 'for generations',
  'same way since', 'on the menu since', 'on our menu since', 'permanent spot',
  'regulars already know', 'a lot of people', 'most people', 'plenty of people',
  'people come in for', 'a lot of regulars', 'our regulars',
];
// SOFT: sensory and setting words. Usually invented, occasionally quoted from
// a menu description ("golden-brown French toast" is in menuData), so a
// reviewer reads the sentence instead of the gate deciding.
export const UNSOURCED_CLAIMS_SOFT = [
  'slow-cooked', 'slow cooked', 'seasoned', 'crispy', 'tender', 'golden',
  'window seat', 'dining room', 'the room', 'booth', 'counter seat',
  'production line', 'the pace', 'for years', 'usually more forgiving',
  'in a good mood',
];

export function findContrastPatterns(text) {
  const hits = [];
  for (const re of CONTRAST_PATTERNS) {
    re.lastIndex = 0;
    for (const m of text.matchAll(re)) hits.push(m[0].trim());
  }
  return hits;
}

export function findUnsourcedClaims(text) {
  const lower = text.toLowerCase();
  return {
    hard: UNSOURCED_CLAIMS_HARD.filter((w) => lower.includes(w)),
    soft: UNSOURCED_CLAIMS_SOFT.filter((w) => lower.includes(w)),
  };
}
