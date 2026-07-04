// Catering service-area registry. One entry per town page at /catering/<slug>.
// driveMin values are reviewed estimates from 409 Broadway, Chicopee (not
// API-derived); coords kept for future distance/sorting needs.
export interface ServiceArea {
  slug: string;
  town: string;
  state: 'MA';
  county: 'Hampden County' | 'Hampshire County';
  lat: number;
  lng: number;
  driveMin: number;
  // 1-2 sentences of true, town-specific context (routes, neighborhoods,
  // institutions). Facts only — never invent past-event claims.
  local: string;
  // Optional list of neighborhoods/villages for on-page mention + areaServed.
  neighborhoods?: string[];
}

export const SERVICE_AREAS: ServiceArea[] = [
  {
    slug: 'springfield-ma',
    town: 'Springfield',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.1015,
    lng: -72.5898,
    driveMin: 12,
    local:
      'We are a quick trip down I-291 or Route 116 from downtown Springfield, which makes morning drop-offs easy for offices, medical facilities, and event spaces across the city, from the Metro Center and the MassMutual Center area to Baystate Medical Center and Mercy Medical Center.',
    neighborhoods: ['Downtown Springfield', 'Forest Park', 'East Springfield', 'Sixteen Acres', 'Indian Orchard', 'Pine Point'],
  },
  {
    slug: 'holyoke-ma',
    town: 'Holyoke',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.2043,
    lng: -72.6162,
    driveMin: 12,
    local:
      'Holyoke is right up Route 116 and I-391 from our Chicopee kitchen. We deliver hot buffets to workplaces and functions around the city, from the downtown canal district to the Holyoke Mall and Ingleside area, Holyoke Medical Center, and Holyoke Community College.',
    neighborhoods: ['Downtown Holyoke', 'Ingleside', 'Highlands', 'Elmwood'],
  },
  {
    slug: 'west-springfield-ma',
    town: 'West Springfield',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.107,
    lng: -72.6204,
    driveMin: 14,
    local:
      'West Springfield sits just across the Connecticut River from us, an easy run via Route 5 or Memorial Avenue. We cater office lunches and events along the Riverdale Street corridor and functions connected to the Eastern States Exposition (Big E) neighborhood.',
    neighborhoods: ['Merrick', 'Riverdale', 'Mittineague'],
  },
  {
    slug: 'agawam-ma',
    town: 'Agawam',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.0695,
    lng: -72.6151,
    driveMin: 18,
    local:
      'Agawam and Feeding Hills are an easy delivery run down Route 5 and across the river. We bring breakfast and lunch spreads to workplaces, school functions, and family celebrations throughout town, including the Route 57 and Main Street corridors near Six Flags New England.',
    neighborhoods: ['Feeding Hills'],
  },
  {
    slug: 'westfield-ma',
    town: 'Westfield',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.1251,
    lng: -72.7495,
    driveMin: 22,
    local:
      'Westfield is a straight shot out Routes 90 and 20. We deliver catering for corporate meetings, Westfield State University area events, and family occasions across the Whip City, including downtown and the Barnes Airport industrial corridor.',
  },
  {
    slug: 'ludlow-ma',
    town: 'Ludlow',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.16,
    lng: -72.4759,
    driveMin: 12,
    local:
      'Ludlow is one of our closest neighbors, just over the Chicopee River via Fuller Road or Route 21. We cater workplace lunches and functions around town, including the Ludlow Mills riverfront district and the Center Street business corridor.',
  },
  {
    slug: 'south-hadley-ma',
    town: 'South Hadley',
    state: 'MA',
    county: 'Hampshire County',
    lat: 42.2584,
    lng: -72.5745,
    driveMin: 14,
    local:
      'South Hadley is a short drive up Route 116 from our door. We deliver breakfast and lunch catering for campus-adjacent events near Mount Holyoke College and the Village Commons, plus showers, graduations, and church functions across town.',
    neighborhoods: ['South Hadley Falls'],
  },
  {
    slug: 'granby-ma',
    town: 'Granby',
    state: 'MA',
    county: 'Hampshire County',
    lat: 42.2565,
    lng: -72.5162,
    driveMin: 16,
    local:
      'Granby is a quick trip up Route 202 from Chicopee. We handle drop-off and full-service catering for family gatherings, school and town functions, and workplace events along the Route 202 corridor.',
  },
  {
    slug: 'easthampton-ma',
    town: 'Easthampton',
    state: 'MA',
    county: 'Hampshire County',
    lat: 42.2668,
    lng: -72.6687,
    driveMin: 24,
    local:
      'Easthampton is an easy run up Route 141 over the Mount Tom range. We deliver catering to the Eastworks and mill-district event spaces, downtown businesses, and family celebrations across town.',
  },
  {
    slug: 'northampton-ma',
    town: 'Northampton',
    state: 'MA',
    county: 'Hampshire County',
    lat: 42.3251,
    lng: -72.6412,
    driveMin: 26,
    local:
      'Northampton is about half an hour up I-91 from our kitchen. We cater business meetings and events downtown and near Smith College, plus functions around Florence and the Cooley Dickinson Hospital area.',
    neighborhoods: ['Florence', 'Leeds'],
  },
  {
    slug: 'longmeadow-ma',
    town: 'Longmeadow',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.0501,
    lng: -72.5828,
    driveMin: 18,
    local:
      'Longmeadow is a straight run down I-91 or Route 5. We deliver breakfast and lunch catering for meetings near Bay Path University, the Longmeadow Shops area, and family occasions throughout town.',
  },
  {
    slug: 'east-longmeadow-ma',
    town: 'East Longmeadow',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.0654,
    lng: -72.5148,
    driveMin: 18,
    local:
      'East Longmeadow is an easy delivery south on Route 83. We cater office lunches for the North Main Street and industrial-park businesses, plus graduations, showers, and holiday parties across town.',
  },
  {
    slug: 'wilbraham-ma',
    town: 'Wilbraham',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.1237,
    lng: -72.4312,
    driveMin: 16,
    local:
      'Wilbraham is a short drive out Boston Road (Route 20). We deliver catering to businesses along the Boston Road corridor and to family and school events around town, including functions near Minnechaug Regional High School.',
  },
  {
    slug: 'palmer-ma',
    town: 'Palmer',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.1584,
    lng: -72.3287,
    driveMin: 24,
    local:
      'Palmer is a straight run out Route 20 or the Mass Pike. We handle drop-off and pick-up catering for workplaces, town functions, and family events in Palmer, Three Rivers, Thorndike, and Bondsville.',
    neighborhoods: ['Three Rivers', 'Thorndike', 'Bondsville'],
  },
  {
    slug: 'belchertown-ma',
    town: 'Belchertown',
    state: 'MA',
    county: 'Hampshire County',
    lat: 42.277,
    lng: -72.401,
    driveMin: 24,
    local:
      'Belchertown is an easy drive up Routes 202 and 21. We deliver breakfast and lunch catering for town events, school functions, and family gatherings from the town common out to the Route 9 corridor.',
  },
  {
    slug: 'amherst-ma',
    town: 'Amherst',
    state: 'MA',
    county: 'Hampshire County',
    lat: 42.3732,
    lng: -72.5199,
    driveMin: 30,
    local:
      'Amherst is about 30 minutes north via Route 116. We cater department meetings and events in the UMass Amherst and Amherst College area, plus business and family functions downtown.',
    neighborhoods: ['North Amherst', 'South Amherst'],
  },
  {
    slug: 'hampden-ma',
    town: 'Hampden',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.0645,
    lng: -72.4134,
    driveMin: 22,
    local:
      'Hampden is a pleasant drive out through Wilbraham on Main Street. We handle drop-off catering for town events, church socials, and family celebrations throughout this close-knit community.',
  },
];
