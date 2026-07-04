// Catering service-area registry. One entry per town page at /catering/<slug>.
// driveMin values are reviewed estimates from 409 Broadway, Chicopee.
// Every venue URL was fetched and content-verified on 2026-07-03; photos are
// town images from Wikimedia Commons (free licenses, credit rendered on-page).
export interface TownVenue {
  name: string;
  url: string;
}

export interface TownPhoto {
  /** Base path without extension; .jpg + .webp both exist in public/towns/. */
  base: string;
  alt: string;
  w: number;
  h: number;
  creditArtist: string;
  creditLicense: string;
  creditUrl: string;
}

export interface ServiceArea {
  slug: string;
  town: string;
  state: 'MA';
  county: 'Hampden County' | 'Hampshire County';
  lat: number;
  lng: number;
  driveMin: number;
  /** 2-3 sentences of true, town-specific context. Facts only. */
  intro: string;
  /** Sentence framing the venues list; venues are places that host events, not claimed clients. */
  aroundTown: string;
  venues: TownVenue[];
  neighborhoods?: string[];
  photo: TownPhoto;
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
    intro:
      'Springfield is a ten-to-twelve minute run down I-291 from our Chicopee kitchen, close enough that coffee, eggs, bacon, and French toast arrive hot at a downtown office before the first meeting starts.',
    aroundTown:
      'The city has one of the busiest event calendars in Western Mass. We deliver to offices, function rooms, and workplaces all over town, in the neighborhoods around places like:',
    venues: [
      { name: 'MassMutual Center', url: 'https://www.massmutualcenter.com' },
      { name: 'Naismith Basketball Hall of Fame', url: 'https://www.hoophall.com' },
      { name: 'Springfield Museums', url: 'https://springfieldmuseums.org' },
      { name: 'Baystate Medical Center', url: 'https://www.baystatehealth.org' },
          { name: 'MGM Springfield', url: 'https://mgmspringfield.mgmresorts.com' },
    ],
    neighborhoods: ['Downtown', 'Forest Park', 'East Springfield', 'Sixteen Acres', 'Indian Orchard', 'Pine Point'],
    photo: {
      base: '/towns/springfield-ma',
      alt: 'Downtown Springfield, Massachusetts skyline along the Connecticut River',
      w: 1000, h: 600,
      creditArtist: 'Quintin Soloviev',
      creditLicense: 'CC BY 4.0',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:Springfield%2C_MA.jpg',
    },
  },
  {
    slug: 'holyoke-ma',
    town: 'Holyoke',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.2043,
    lng: -72.6162,
    driveMin: 12,
    intro:
      'Holyoke sits just up Route 116 and I-391 from us, close enough that a hot buffet is still steaming when it hits the table. From the downtown canal district to the Ingleside retail corridor, delivery is quick and predictable.',
    aroundTown:
      'Between the colleges, the hospital, and the mills converted to offices and studios, Holyoke hosts plenty of meetings and functions. We deliver throughout the city, including the areas around:',
    venues: [
      { name: 'Holyoke Community College', url: 'https://www.hcc.edu' },
      { name: 'Holyoke Medical Center', url: 'https://www.holyokehealth.com' },
      { name: 'Holyoke Mall', url: 'https://www.holyokemall.com' },
      { name: 'Wistariahurst Museum', url: 'https://wistariahurst.org' },
          { name: 'The Log Cabin', url: 'https://www.thelogcabin.com' },
    ],
    neighborhoods: ['Downtown', 'Ingleside', 'Highlands', 'Elmwood'],
    photo: {
      base: '/towns/holyoke-ma',
      alt: 'Holyoke, Massachusetts skyline with mill buildings and church steeples',
      w: 1000, h: 665,
      creditArtist: 'Simtropolitan',
      creditLicense: 'CC BY-SA 3.0',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:Holyoke_Skyline.jpg',
    },
  },
  {
    slug: 'west-springfield-ma',
    town: 'West Springfield',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.107,
    lng: -72.6204,
    driveMin: 14,
    intro:
      'West Springfield is just across the Connecticut River, an easy run over via Memorial Avenue or Route 5. Office parks along the Riverdale Street corridor make for an easy lunch-delivery run.',
    aroundTown:
      "West Side's event scene centers on the Eastern States Exposition grounds, which host functions year-round beyond the fair itself. We deliver across town, including the neighborhoods around:",
    venues: [
      { name: 'Eastern States Exposition (The Big E)', url: 'https://www.thebige.com' },
          { name: 'Storrowton Village Museum', url: 'https://www.thebige.com/p/about/storrowton-village' },
      { name: 'Springfield Country Club', url: 'https://www.springfieldcountryclub.com' },
    ],
    neighborhoods: ['Merrick', 'Riverdale', 'Mittineague'],
    photo: {
      base: '/towns/west-springfield-ma',
      alt: 'Storrowton Green on the Eastern States Exposition grounds in West Springfield',
      w: 1000, h: 666,
      creditArtist: 'John Phelan',
      creditLicense: 'CC BY 3.0',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:Storrowton_Green%2C_Eastern_States_Exposition%2C_West_Springfield_MA.jpg',
    },
  },
  {
    slug: 'agawam-ma',
    town: 'Agawam',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.0695,
    lng: -72.6151,
    driveMin: 18,
    intro:
      'Agawam and Feeding Hills are about eighteen minutes from our door, down Route 5 and across the river. Graduation parties, backyard celebrations, and workplace lunches along the Main Street and Route 57 corridors are all comfortable delivery territory.',
    aroundTown:
      'Agawam is best known as the home of Six Flags New England, and the town keeps a busy calendar of school, sports, and community functions. Local anchors include:',
    venues: [
      { name: 'Six Flags New England', url: 'https://www.sixflags.com/newengland' },
      { name: 'Town of Agawam', url: 'https://www.agawam.ma.us' },
          { name: 'Crestview Country Club', url: 'https://www.crestviewcc.org' },
      { name: 'Oak Ridge Golf Club', url: 'https://www.oakridgegc.com' },
    ],
    neighborhoods: ['Feeding Hills'],
    photo: {
      base: '/towns/agawam-ma',
      alt: 'The historic Captain Charles Leonard House in Agawam, Massachusetts',
      w: 1000, h: 750,
      creditArtist: 'John Phelan',
      creditLicense: 'CC BY 3.0',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:Capt._Charles_Leonard_House%2C_Agawam_MA.jpg',
    },
  },
  {
    slug: 'westfield-ma',
    town: 'Westfield',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.1251,
    lng: -72.7495,
    driveMin: 22,
    intro:
      'Westfield is a straight shot out the Mass Pike or Route 20, a bit over twenty minutes from Chicopee. The Whip City gets everything from drop-off office lunches to full-service buffets for family celebrations.',
    aroundTown:
      'With a university, a classic downtown around Park Square, and one of the nicest parks in the region, Westfield has no shortage of gathering spots. We deliver all over the city, including near:',
    venues: [
      { name: 'Westfield State University', url: 'https://www.westfield.ma.edu' },
      { name: 'Stanley Park', url: 'https://www.stanleypark.org' },
      { name: 'City of Westfield', url: 'https://www.cityofwestfield.org' },
          { name: 'East Mountain Country Club', url: 'https://www.eastmountaincc.com' },
      { name: 'Tekoa Country Club', url: 'https://www.tekoacountryclub.com' },
    ],
    photo: {
      base: '/towns/westfield-ma',
      alt: 'Park Square green in downtown Westfield, Massachusetts',
      w: 1000, h: 667,
      creditArtist: 'Jeff Jason II (jeffjason.com)',
      creditLicense: 'CC BY-SA 3.0',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:Westfield-park-square-july-05-2012.jpeg',
    },
  },
  {
    slug: 'ludlow-ma',
    town: 'Ludlow',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.16,
    lng: -72.4759,
    driveMin: 12,
    intro:
      'Ludlow is one of our closest neighbors, right over the Chicopee River via Fuller Road or Route 21. Twelve minutes door to door means even a full hot breakfast spread travels well.',
    aroundTown:
      'From the Ludlow Mills riverfront redevelopment to the Center Street business strip, the town has steady demand for workplace and family catering. Local anchors include:',
    venues: [
      { name: 'Town of Ludlow', url: 'https://www.ludlow.ma.us' },
          { name: 'Gremio Lusitano Club', url: 'https://www.gremiolusitano.com' },
    ],
    photo: {
      base: '/towns/ludlow-ma',
      alt: 'The town green in Ludlow, Massachusetts',
      w: 1000, h: 667,
      creditArtist: 'John Phelan',
      creditLicense: 'CC BY 3.0',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:Ludlow_Town_Green%2C_MA.jpg',
    },
  },
  {
    slug: 'south-hadley-ma',
    town: 'South Hadley',
    state: 'MA',
    county: 'Hampshire County',
    lat: 42.2584,
    lng: -72.5745,
    driveMin: 14,
    intro:
      'South Hadley is a short ride up Route 116, about fourteen minutes from the restaurant. Showers, graduations, and department meetings near the college are all quick, familiar runs for our crew.',
    aroundTown:
      'The town centers on Mount Holyoke College and the shops of the Village Commons across the street. We deliver throughout South Hadley and the Falls, including the areas around:',
    venues: [
      { name: 'Mount Holyoke College', url: 'https://www.mtholyoke.edu' },
      { name: 'The Orchards Golf Club', url: 'https://www.orchardsgolf.com' },
      { name: 'Town of South Hadley', url: 'https://southhadley.org' },
    ],
    neighborhoods: ['South Hadley Falls'],
    photo: {
      base: '/towns/south-hadley-ma',
      alt: 'The town common in South Hadley, Massachusetts',
      w: 1000, h: 664,
      creditArtist: 'Denimadept',
      creditLicense: 'CC BY-SA 3.0 US',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:South_Hadley_(Green)_20090103_0037.jpg',
    },
  },
  {
    slug: 'granby-ma',
    town: 'Granby',
    state: 'MA',
    county: 'Hampshire County',
    lat: 42.2565,
    lng: -72.5162,
    driveMin: 16,
    intro:
      'Granby is a quick trip up Route 202, about sixteen minutes from our kitchen. It is a small town with a full calendar: family parties, church functions, and school events along the 202 corridor.',
    aroundTown:
      'Town life centers on the common and the schools, and most functions happen in halls, homes, and fields we already know how to find. The town itself is the best starting point:',
    venues: [
      { name: 'Town of Granby', url: 'https://www.granby-ma.gov' },
          { name: 'The MacDuffie School', url: 'https://www.macduffie.org' },
    ],
    photo: {
      base: '/towns/granby-ma',
      alt: 'Kellogg Hall in Granby, Massachusetts',
      w: 1000, h: 667,
      creditArtist: 'John Phelan',
      creditLicense: 'CC BY 3.0',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:Kellogg_Hall%2C_Granby_MA.jpg',
    },
  },
  {
    slug: 'easthampton-ma',
    town: 'Easthampton',
    state: 'MA',
    county: 'Hampshire County',
    lat: 42.2668,
    lng: -72.6687,
    driveMin: 24,
    intro:
      'Easthampton sits about twenty-five minutes northwest, up Route 141 over the shoulder of Mount Tom. The old mill buildings downtown have become studios, offices, and event spaces.',
    aroundTown:
      'The Eastworks building anchors a genuinely lively small-city scene of makers, nonprofits, and small businesses. We deliver across Easthampton, including the areas around:',
    venues: [
      { name: 'Eastworks', url: 'https://www.eastworks.com' },
      { name: 'Williston Northampton School', url: 'https://www.williston.com' },
      { name: 'City of Easthampton', url: 'https://easthamptonma.gov' },
          { name: 'Arcadia Wildlife Sanctuary', url: 'https://www.massaudubon.org/places-to-explore/wildlife-sanctuaries/arcadia' },
    ],
    photo: {
      base: '/towns/easthampton-ma',
      alt: 'Aerial view of Easthampton, Massachusetts with Mount Tom in the distance',
      w: 1000, h: 600,
      creditArtist: 'Quintin Soloviev',
      creditLicense: 'CC BY 4.0',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:Easthampton%2C_Massachusetts_(cropped).jpg',
    },
  },
  {
    slug: 'northampton-ma',
    town: 'Northampton',
    state: 'MA',
    county: 'Hampshire County',
    lat: 42.3251,
    lng: -72.6412,
    driveMin: 26,
    intro:
      'Northampton is about half an hour up I-91 from Chicopee. It is the far edge of our regular delivery range, and worth the drive: business meetings downtown, campus events, and family parties out in Florence are all within our delivery range.',
    aroundTown:
      'Few towns in the valley host more gatherings per capita. We deliver throughout Northampton, Florence, and Leeds, including the areas around:',
    venues: [
      { name: 'Smith College', url: 'https://www.smith.edu' },
      { name: 'Look Park', url: 'https://lookpark.org' },
      { name: 'Academy of Music Theatre', url: 'https://aomtheatre.com' },
          { name: 'Hotel Northampton', url: 'https://www.hotelnorthampton.com' },
    ],
    neighborhoods: ['Florence', 'Leeds'],
    photo: {
      base: '/towns/northampton-ma',
      alt: 'Aerial view of downtown Northampton, Massachusetts',
      w: 1000, h: 600,
      creditArtist: 'Quintin Soloviev',
      creditLicense: 'CC BY 4.0',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:Northampton%2C_Massachusetts_(cropped).jpg',
    },
  },
  {
    slug: 'longmeadow-ma',
    town: 'Longmeadow',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.0501,
    lng: -72.5828,
    driveMin: 18,
    intro:
      'Longmeadow is a straight run down I-91 or Route 5, about eighteen minutes from the restaurant. Showers, graduation brunches, and meetings near the town green and the Longmeadow Shops are all comfortable territory.',
    aroundTown:
      'The town is largely residential with a strong school and club calendar, plus a university campus. Local anchors include:',
    venues: [
      { name: 'Bay Path University', url: 'https://www.baypath.edu' },
      { name: 'Town of Longmeadow', url: 'https://www.longmeadow.org' },
          { name: 'Twin Hills Country Club', url: 'https://www.twinhillscc.com' },
      { name: 'Longmeadow Country Club', url: 'https://www.longmeadowcountryclub.com' },
      { name: 'Storrs Library', url: 'https://www.longmeadowlibrary.org' },
    ],
    photo: {
      base: '/towns/longmeadow-ma',
      alt: 'Longmeadow Town Hall in Longmeadow, Massachusetts',
      w: 1000, h: 667,
      creditArtist: 'John Phelan',
      creditLicense: 'CC BY 3.0',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:Longmeadow_Town_Hall%2C_MA.jpg',
    },
  },
  {
    slug: 'east-longmeadow-ma',
    town: 'East Longmeadow',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.0654,
    lng: -72.5148,
    driveMin: 18,
    intro:
      'East Longmeadow is an easy drive south on Route 83, about eighteen minutes out. The industrial park and the North Main Street businesses generate steady office-lunch orders, and the rotary is a landmark every delivery driver in the county knows.',
    aroundTown:
      'Workplace lunches, school functions, and family parties all sit comfortably inside our delivery range here. The town is the best local starting point:',
    venues: [
      { name: 'Town of East Longmeadow', url: 'https://www.eastlongmeadowma.gov' },
          { name: 'East Longmeadow Public Library', url: 'https://www.elpl.org' },
    ],
    photo: {
      base: '/towns/east-longmeadow-ma',
      alt: 'East Longmeadow Town Hall in East Longmeadow, Massachusetts',
      w: 1000, h: 1500,
      creditArtist: 'C0shea94',
      creditLicense: 'CC BY-SA 4.0',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:East_Longmeadow%2C_MA_Town_Hall.jpg',
    },
  },
  {
    slug: 'wilbraham-ma',
    town: 'Wilbraham',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.1237,
    lng: -72.4312,
    driveMin: 16,
    intro:
      'Wilbraham is about sixteen minutes out Boston Road (Route 20). Businesses along the Boston Road corridor and families across town order everything from continental breakfast drop-offs to full graduation-party buffets.',
    aroundTown:
      'The town pairs a classic New England center with a busy commercial strip. Local anchors include:',
    venues: [
      { name: 'Wilbraham & Monson Academy', url: 'https://www.wma.us' },
      { name: 'Town of Wilbraham', url: 'https://www.wilbraham-ma.gov' },
          { name: 'Rice Fruit Farm', url: 'https://www.ricefruitfarm.com' },
    ],
    photo: {
      base: '/towns/wilbraham-ma',
      alt: 'Veterans memorial in Wilbraham, Massachusetts',
      w: 1000, h: 667,
      creditArtist: 'Daderot',
      creditLicense: 'CC0',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:Veterans_Memorial_-_Wilbraham%2C_Massachusetts_-_DSC02463.JPG',
    },
  },
  {
    slug: 'palmer-ma',
    town: 'Palmer',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.1584,
    lng: -72.3287,
    driveMin: 24,
    intro:
      'Palmer, the Town of Seven Railroads, is about twenty-five minutes east on Route 20 or the Pike. We handle drop-off and pick-up catering for workplaces and family events in Palmer village, Three Rivers, Thorndike, and Bondsville.',
    aroundTown:
      'Palmer anchors the eastern edge of our delivery range, with Baystate Wing Hospital among the larger employers in town. The town office is the best local starting point:',
    venues: [
      { name: 'Town of Palmer', url: 'https://www.townofpalmer.com' },
          { name: 'Steaming Tender Restaurant', url: 'https://www.steamingtender.com' },
    ],
    neighborhoods: ['Three Rivers', 'Thorndike', 'Bondsville'],
    photo: {
      base: '/towns/palmer-ma',
      alt: "St. Paul's Church in Palmer, Massachusetts",
      w: 1000, h: 1497,
      creditArtist: 'John Phelan',
      creditLicense: 'CC BY 3.0',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:St_Pauls_Church%2C_Palmer_MA.jpg',
    },
  },
  {
    slug: 'belchertown-ma',
    town: 'Belchertown',
    state: 'MA',
    county: 'Hampshire County',
    lat: 42.277,
    lng: -72.401,
    driveMin: 24,
    intro:
      'Belchertown is an easy drive up Routes 202 and 21, about twenty-five minutes from the restaurant. We deliver from the historic town common out to the Route 9 corridor, with plenty of school and town functions in between.',
    aroundTown:
      'The gateway to the Quabbin is a growing family town with an active community calendar. Local anchors include:',
    venues: [
      { name: 'Town of Belchertown', url: 'https://www.belchertown.org' },
      { name: 'Quabbin Reservoir', url: 'https://www.mass.gov/locations/quabbin-reservoir' },
          { name: 'Cold Spring Country Club', url: 'https://www.coldspringcc.com' },
    ],
    photo: {
      base: '/towns/belchertown-ma',
      alt: 'The town common in Belchertown, Massachusetts',
      w: 1000, h: 750,
      creditArtist: 'Nwalsh',
      creditLicense: 'CC BY-SA 3.0',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:Belchertown_MA_USA.jpg',
    },
  },
  {
    slug: 'amherst-ma',
    town: 'Amherst',
    state: 'MA',
    county: 'Hampshire County',
    lat: 42.3732,
    lng: -72.5199,
    driveMin: 30,
    intro:
      'Amherst is about thirty minutes north on Route 116, the top of our regular delivery range. Department meetings, campus-adjacent events, and downtown business lunches are all within a comfortable morning run.',
    aroundTown:
      'With three campuses in and around town, Amherst probably hosts more catered meetings per square mile than anywhere else in the valley. We deliver throughout town, including the areas around:',
    venues: [
      { name: 'UMass Amherst', url: 'https://www.umass.edu' },
      { name: 'Amherst College', url: 'https://www.amherst.edu' },
      { name: 'Mullins Center', url: 'https://www.mullinscenter.com' },
          { name: 'Hampshire College', url: 'https://www.hampshire.edu' },
    ],
    neighborhoods: ['North Amherst', 'South Amherst'],
    photo: {
      base: '/towns/amherst-ma',
      alt: 'Aerial view of downtown Amherst, Massachusetts',
      w: 1000, h: 563,
      creditArtist: 'Quintin Soloviev',
      creditLicense: 'CC BY 4.0',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:Amherst,_MA_(cropped)_2.jpg',
    },
  },
  {
    slug: 'hampden-ma',
    town: 'Hampden',
    state: 'MA',
    county: 'Hampden County',
    lat: 42.0645,
    lng: -72.4134,
    driveMin: 22,
    intro:
      'Hampden is a pleasant drive out through Wilbraham on Main Street, a little over twenty minutes from our door. Church socials, town events, and family celebrations in this close-knit community are a natural fit for drop-off catering.',
    aroundTown:
      'Town life runs through the Main Street corridor, the schools, and the Scantic River valley. Local anchors include:',
    venues: [
      { name: 'Town of Hampden', url: 'https://www.hampdenma.gov' },
      { name: 'Laughing Brook Wildlife Sanctuary', url: 'https://www.massaudubon.org/places-to-explore/wildlife-sanctuaries/laughing-brook' },
          { name: 'GreatHorse', url: 'https://www.greathorse.com' },
    ],
    photo: {
      base: '/towns/hampden-ma',
      alt: 'The historic Hampden Town House in Hampden, Massachusetts',
      w: 1000, h: 1501,
      creditArtist: 'John Phelan',
      creditLicense: 'CC BY 3.0',
      creditUrl: 'https://commons.wikimedia.org/wiki/File:Hampden_Town_House%2C_MA.jpg',
    },
  },
];
