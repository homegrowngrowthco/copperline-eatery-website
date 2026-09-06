export const SITE_URL = 'https://copperlineeatery.com';
export const RESTAURANT_NAME = 'The Copperline Eatery';
export const PHONE = '+1-413-594-8332';
export const PHONE_DISPLAY = '(413) 594-8332';
export const EMAIL = 'copperlineeatery@yahoo.com';
export const DOORDASH_URL = 'https://www.doordash.com/store/the-copperline-eatery-chicopee-36368789/81460747';
export const MAPS_DIRECTIONS_URL = 'https://www.google.com/maps/dir//409+Broadway,+Chicopee,+MA+01020';
export const GA4_ID = 'G-DXYNCF0G79';

export const ADDRESS = {
  '@type': 'PostalAddress',
  streetAddress: '409 Broadway',
  addressLocality: 'Chicopee',
  addressRegion: 'MA',
  postalCode: '01020',
  addressCountry: 'US',
} as const;

export const GEO = {
  '@type': 'GeoCoordinates',
  latitude: 42.146927,
  longitude: -72.579556,
} as const;

export const OPENING_HOURS = [
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    opens: '06:00',
    closes: '14:00',
  },
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: 'Saturday',
    opens: '06:00',
    closes: '13:30',
  },
  {
    '@type': 'OpeningHoursSpecification',
    dayOfWeek: 'Sunday',
    opens: '07:00',
    closes: '13:00',
  },
] as const;

export const SAME_AS = [
  'https://www.facebook.com/CopperlineEatery/',
  'https://www.instagram.com/copperlineeatery/',
  'https://www.yelp.com/biz/the-copperline-eatery-chicopee-3',
  'https://www.tripadvisor.com/Restaurant_Review-g41507-d4177681-Reviews-The_Copperline_Eatery-Chicopee_Massachusetts.html',
  'https://www.yellowpages.com/chicopee-ma/mip/copperline-eatery-6724625',
  'https://www.doordash.com/store/the-copperline-eatery-chicopee-36368789/81460747',
  'https://www.linkedin.com/company/the-copperline-eatery',
  'https://www.theq997.com/directory/business/the-copperline-eatery/',
] as const;

export const AREA_SERVED = [
  { '@type': 'AdministrativeArea', name: 'Chicopee' },
  { '@type': 'AdministrativeArea', name: 'Springfield' },
  { '@type': 'AdministrativeArea', name: 'Holyoke' },
  { '@type': 'AdministrativeArea', name: 'West Springfield' },
  { '@type': 'AdministrativeArea', name: 'South Hadley' },
  { '@type': 'AdministrativeArea', name: 'Hampden County' },
  { '@type': 'AdministrativeArea', name: 'Pioneer Valley' },
  { '@type': 'AdministrativeArea', name: 'Western Massachusetts' },
  { '@type': 'AdministrativeArea', name: 'Enfield' },
  { '@type': 'AdministrativeArea', name: 'Northern Connecticut' },
] as const;

export const PAYMENT_ACCEPTED = 'Cash, Credit Card, Visa, Mastercard, American Express, Discover';
export const CURRENCIES_ACCEPTED = 'USD';

// Ian, 2026-08-31: the diner holds a beer and wine license. Mimosas and other
// drink specials show up occasionally as a special, not a standing menu item,
// so never claim there is no liquor license or that mimosas are unavailable.
export const ALCOHOL_NOTE =
  'The Copperline Eatery holds a beer and wine license. Mimosas and similar drinks are offered sometimes as a special, not as a permanent menu item, so availability varies day to day.';

export const AWARDS = [
  'Best Breakfast Western Massachusetts - MassLive Readers Choice',
  'Best French Toast Western Massachusetts - WWLP 22News',
] as const;

// Google 1,106 (checked 2026-07-03 via Places API) + TripAdvisor ~24, weighted.
// Re-check quarterly; the count drifts.
export const AGGREGATE_RATING = {
  '@type': 'AggregateRating',
  ratingValue: '4.5',
  bestRating: '5',
  worstRating: '1',
  reviewCount: 1130,
} as const;

// Ian, 2026-09-06: grounding facts for the blog generator, all copied from
// pages that already ship (about, faq, catering). The generator may state
// these and the menu data, and nothing else about the restaurant. Anything
// about cooking method, the dining room, staff, or how long a dish has been
// served is invented unless it is written here.
export const HOURS_DISPLAY =
  'Monday through Friday 6 a.m. to 2 p.m., Saturday 6 a.m. to 1:30 p.m., Sunday 7 a.m. to 1 p.m.';

export const GROUNDING_FACTS = [
  'Family-owned and operated since 1993 at 409 Broadway, Chicopee.',
  'Known for the homemade corned beef hash and the house-made hollandaise on the Eggs Benedict (about page).',
  'MassLive readers voted the diner Best Breakfast in Western Massachusetts; WWLP 22News listed it among the best French toast in Western Massachusetts on National French Toast Day.',
  'No reservations. High chairs and booster seats available.',
  "Children's menu for guests under 12: one egg and toast, two French toast, or two pancakes, with bacon, sausage, or ham, plus milk or juice, $7.50.",
  'Catering: on-site service, hot drop-off, or pick-up at the restaurant; buffet style, to-go buffet, or individual portions.',
  'Catering lead time: one to two weeks for most events; three to four weeks for larger events and weekend dates.',
  'Breakfast and brunch catering (eggs, bacon and sausage, home fries, French toast, pancakes) is quoted per event; the priced packages in the menu data are the lunch and dinner buffets.',
  'Online quote builder at /catering/quote; full catering menu PDF at /catering-menu.pdf.',
] as const;
