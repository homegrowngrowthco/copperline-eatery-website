// Shared by src/components/DailySpecials.astro and src/pages/index.astro
// (AUDIT-SEO-2026-09-24.md section 6, fix 7) so the Netlify Image CDN URL
// pattern and the board alt text are built in exactly one place.

export interface BoardLike {
  key: string;
}

// Netlify Image CDN transform: resize to width w, re-encode as webp at q=75.
// Matches the sizes DailySpecials.astro requests (480/800/1200).
export function cdn(board: BoardLike, w: number): string {
  return `/.netlify/images?url=/specials-board/${board.key}&w=${w}&fm=webp&q=75`;
}

export function boardAlt(updatedLabel: string | null): string {
  return updatedLabel
    ? `Today's specials board at The Copperline Eatery, photographed ${updatedLabel}`
    : "Today's specials board at The Copperline Eatery";
}
