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
    opens: '06:30',
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
