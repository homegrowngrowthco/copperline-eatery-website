// Scheduled publishing for blog posts (op #1549, blog redesign 2026-11-08).
//
// Ian approves a month of weekly posts in one sitting by merging their PRs.
// Each post carries a future pubDate (a Monday). A production build leaves
// out every post whose pubDate is still in the future, and the weekly
// "publish" job in .github/workflows/weekly-post.yml rebuilds and deploys
// master each Monday, so one approved post goes live per week with no
// further clicks.
//
// Plain .mjs so astro.config.mjs (sitemap lastmod), the Astro pages and the
// Node scripts all share one rule.
//
// Future posts ARE shown when:
// - the build runs for a pull request (GITHUB_EVENT_NAME=pull_request), so
//   the PR's Netlify preview shows the draft post Ian is reviewing;
// - SHOW_FUTURE_POSTS=1 is set (local preview of a scheduled post);
// - astro dev (the pages also check import.meta.env.DEV).

export function showFuturePosts(env = process.env) {
  return env.SHOW_FUTURE_POSTS === '1' || env.GITHUB_EVENT_NAME === 'pull_request';
}

export function isLive(pubDate, now = new Date(), env = process.env) {
  if (showFuturePosts(env)) return true;
  if (!pubDate) return false;
  return new Date(pubDate).getTime() <= now.getTime();
}
