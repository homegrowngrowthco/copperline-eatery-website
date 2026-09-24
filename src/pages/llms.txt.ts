import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import {
  ADDRESS,
  AGGREGATE_RATING,
  AWARDS,
  EMAIL,
  GROUNDING_FACTS,
  HOURS_DISPLAY,
  PHONE_DISPLAY,
  SITE_URL,
} from '../data/restaurant';
import specialsData from '../data/specials.json';

// Generated at build time (AUDIT-SEO-2026-09-24.md section 6, fix 6).
// public/llms.txt used to be hand-maintained and went stale for two months
// (no /specials, no /blog, and it claimed the price-free /catering page had
// "packages, pricing"). Every fact below is read from src/data/restaurant.ts,
// specials.json, or the blog collection at build time, so it cannot drift
// from the schema again. Keep this endpoint and delete public/llms.txt in the
// same commit; the two would otherwise collide on the same URL.

function formatSpecialPrice(price: string | null): string | null {
  if (!price) return null;
  return price.startsWith('$') ? price : `$${price}`;
}

const bookingLeadFact = GROUNDING_FACTS.find((f) => f.startsWith('Catering lead time:'));
const bookingLeadTime = bookingLeadFact
  ? bookingLeadFact.replace(/^Catering lead time:\s*/, '').replace(/\.$/, '')
  : 'one to two weeks for most events; three to four weeks for larger events and weekend dates';

const reviewFloor = Math.floor(AGGREGATE_RATING.reviewCount / 100) * 100;
const awardsLine = AWARDS.map((a) => {
  const [name, org] = a.split(' - ');
  return org ? `${name} (${org})` : name;
}).join(', ');

export const GET: APIRoute = async () => {
  const posts = (await getCollection('blog')).sort(
    (a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf(),
  );

  const blogLines = posts
    .map((post) => `- [${post.data.title}](${SITE_URL}/blog/${post.id}): ${post.data.description}`)
    .join('\n');

  const specialsLines = (specialsData.specials ?? [])
    .map((s) => {
      const price = formatSpecialPrice(s.price);
      return price ? `- ${s.name} (${price})` : `- ${s.name}`;
    })
    .join('\n');

  const specialsUpdated = specialsData.updatedAt
    ? new Date(specialsData.updatedAt).toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : null;

  const body = `# The Copperline Eatery

> Family-owned breakfast and lunch restaurant in Chicopee, Massachusetts, open since 1993. Voted Best Breakfast in Western Massachusetts by MassLive readers and Best French Toast in Western Massachusetts by WWLP 22News. Also a full-service caterer for Western Massachusetts and northern Connecticut.

## Key facts

- Address: ${ADDRESS.streetAddress}, ${ADDRESS.addressLocality}, ${ADDRESS.addressRegion} ${ADDRESS.postalCode} (Hampden County, Pioneer Valley)
- Phone: ${PHONE_DISPLAY}
- Email: ${EMAIL}
- Hours: ${HOURS_DISPLAY} (open 7 days)
- Rating: ${AGGREGATE_RATING.ratingValue} stars on Google (${reviewFloor.toLocaleString('en-US')}+ reviews)
- Awards: ${awardsLine}
- Seating: first-come, first-serve; call ahead for groups of 8+
- Takeout: call ${PHONE_DISPLAY}, ready in under 30 minutes. Delivery via DoorDash.
- Known for: eggs benedict with house-made hollandaise, homemade corned beef hash, banana bread French toast, the Copperline Special
- Payment: cash and all major credit cards

## Catering

- Serves: Chicopee, Springfield, Holyoke, West Springfield, South Hadley, Hampden County, Pioneer Valley, Western Massachusetts, Enfield, and northern Connecticut
- Menus: custom-built per event, from breakfast and brunch spreads (eggs, bacon, French toast, pancakes) to cold-cut platters and hot dinner buffets (roasted chicken, ziti and meatballs, lasagna, roast turkey, baked scrod). Contact for a quote.
- Service styles: on-site, drop-off, or pick-up; buffet, to-go buffet, or individual portions
- Events: corporate meetings, weddings, showers, graduations, birthdays, holiday parties, church socials, school functions, fundraisers, memorial services
- Booking: ${bookingLeadTime}

## Pages

- [Home](${SITE_URL}): overview, hours, reviews
- [Menu](${SITE_URL}/menu): full breakfast, lunch, and catering menus with prices, plus today's specials
- [Catering](${SITE_URL}/catering): service areas, event types, service styles, and the inquiry form; pricing is quoted per event through the quote builder
- [Catering quote builder](${SITE_URL}/catering/quote): pick a buffet and see per-person pricing live
- [Today's specials](${SITE_URL}/specials): this week's specials board, photographed and updated weekly, with an archive of past boards at /specials/<date>
- [FAQ](${SITE_URL}/faq): 23 common questions (hours, parking, dietary options, gift cards, catering)
- [About](${SITE_URL}/about): family story, awards, and press
- [Contact](${SITE_URL}/contact): directions, hours, map
- [Blog](${SITE_URL}/blog)
${blogLines}

## This week's specials

${specialsUpdated ? `Updated ${specialsUpdated}.` : 'No specials posted currently.'}
${specialsLines}

## Catering service-area pages

All of Western Massachusetts: ${SITE_URL}/catering/western-massachusetts
Town pages for each served town live at ${SITE_URL}/catering/<town-slug> (for example /catering/springfield-ma).
`;

  return new Response(body, {
    status: 200,
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
