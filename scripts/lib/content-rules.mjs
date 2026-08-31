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
];
