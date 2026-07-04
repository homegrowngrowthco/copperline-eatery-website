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
  /** Layout variant: 'a' = venues section first, 'b' = food section first (also flips the hero photo side on desktop). */
  variant: 'a' | 'b';
  /** Per-town food section. Dishes must exist in menuData.json; copy is recommendation-framed, not order-history claims. */
  foodHeading: string;
  foodBlurb: string;
  dishes: string[];
  eventsHeading: string;
  eventsBlurb: string;
  eventTypes: string[];
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
          { name: 'Springfield Armory National Historic Site', url: 'https://www.nps.gov/spar/index.htm' },
      { name: 'The Zoo in Forest Park', url: 'https://www.forestparkzoo.org' },
      { name: 'Springfield College', url: 'https://springfield.edu' },
      { name: 'Western New England University', url: 'https://www.wne.edu' },
      { name: 'Springfield Regional Chamber', url: 'https://springfieldregionalchamber.com' },
    ],
    neighborhoods: ['Downtown', 'Forest Park', 'East Springfield', 'Sixteen Acres', 'Indian Orchard', 'Pine Point'],
    variant: 'a',
    foodHeading: 'Breakfast That Travels Well',
    foodBlurb:
      'Springfield leans corporate, so breakfast is the usual play: trays of scrambled eggs and bacon, home fries, French toast, and hot coffee, set up before anyone pours a second cup. For conference-room lunches, cold-cut platters and big salads carry the day.',
    dishes: ['Scrambled eggs & bacon', 'Home fries', 'French toast', 'Muffins, coffee & juice', 'Cold-cut platters', 'Garden salad'],
    eventsHeading: 'Events We Get Called For',
    eventsBlurb:
      'Downtown runs on office breakfasts, trainings, and appreciation days; the residential neighborhoods keep us busy with graduations and family milestones.',
    eventTypes: ['Office breakfasts & lunches', 'Trainings & retreats', 'Employee appreciation', 'Graduations', 'Family reunions'],
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
          { name: 'The Delaney House', url: 'https://www.delaneyhouse.com' },
      { name: 'International Volleyball Hall of Fame', url: 'https://volleyhall.org' },
      { name: 'Holyoke Merry-Go-Round', url: 'https://www.holyokemerrygoround.org' },
      { name: 'City of Holyoke', url: 'https://www.holyoke.org' },
      { name: 'Greater Holyoke Chamber', url: 'https://holyokechamber.com' },
    ],
    neighborhoods: ['Downtown', 'Ingleside', 'Highlands', 'Elmwood'],
    variant: 'b',
    foodHeading: 'Hot Buffets That Arrive Hot',
    foodBlurb:
      'Twelve minutes up I-391 means chafing-dish food actually works in Holyoke. Chicken Marsala, ziti and meatballs, and meat lasagna are the workhorses, with garden salad and rolls rounding out the table.',
    dishes: ['Chicken Marsala', 'Ziti & meatballs', 'Meat lasagna', 'Sausage, peppers & onions', 'Garden salad', 'Rolls & butter'],
    eventsHeading: 'What We Cater in Holyoke',
    eventsBlurb:
      'Workplace lunches, fundraisers, and school functions, plus family parties from the Highlands to Elmwood.',
    eventTypes: ['Workplace lunches', 'Fundraisers & banquets', 'School functions', 'Birthdays & showers', 'Holiday parties'],
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
          { name: 'Majestic Theater', url: 'https://www.majestictheater.com' },
      { name: 'Irish Cultural Center of Western New England', url: 'https://www.irishcenterwne.org' },
      { name: 'West Springfield Public Library', url: 'https://www.wspl.org' },
      { name: 'Town of West Springfield', url: 'https://www.townofwestspringfield.org' },
    ],
    neighborhoods: ['Merrick', 'Riverdale', 'Mittineague'],
    variant: 'a',
    foodHeading: 'From Pancake Breakfasts to Platter Lunches',
    foodBlurb:
      'West Side swings with the calendar: pancake-and-sausage breakfasts for morning crews, grinder and wrap platters with potato salad at midday, and during fair season, anything that feeds a lot of people fast.',
    dishes: ['Pancakes & sausage', 'Eggs benedict', 'Grinder & wrap platters', 'Potato salad', 'Macaroni salad', 'Desserts'],
    eventsHeading: 'Occasions on This Side of the River',
    eventsBlurb:
      'Office lunches along Riverdale Street, crew meals in Big E season, and family celebrations in Merrick and Mittineague.',
    eventTypes: ['Office lunches', 'Seasonal crew meals', 'Family celebrations', 'Showers', 'Networking events'],
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
          { name: 'Agawam Public Library', url: 'https://www.agawamlibrary.org' },
      { name: 'Robinson State Park', url: 'https://www.mass.gov/locations/robinson-state-park' },
    ],
    neighborhoods: ['Feeding Hills'],
    variant: 'b',
    foodHeading: 'Graduation & Backyard Party Food',
    foodBlurb:
      'Agawam is party country: graduations, communions, team banquets. The food that fits is sausage with peppers and onions, kielbasa, ziti and meatballs, and baked beans, all of it built to hold up on a buffet line in a backyard or a hall.',
    dishes: ['Sausage, peppers & onions', 'Kielbasa', 'Ziti & meatballs', 'Baked beans', 'Potato salad', 'Rolls & butter'],
    eventsHeading: 'Agawam Events We Cater',
    eventsBlurb:
      'Backyard graduations in Feeding Hills, sports banquets, workplace lunches along Main Street, and everything around the Six Flags season.',
    eventTypes: ['Graduation parties', 'Team banquets', 'Backyard celebrations', 'Workplace lunches', 'Communions & christenings'],
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
          { name: 'Amelia Park Children\'s Museum', url: 'https://www.ameliaparkmuseum.org' },
      { name: 'Westfield Athenaeum', url: 'https://westath.org' },
      { name: 'Shaker Farms Country Club', url: 'https://www.shakerfarmscc.com' },
    ],
    variant: 'a',
    foodHeading: 'Crowd Food for the Whip City',
    foodBlurb:
      'Westfield events tend to run bigger: university functions, banquets, and family parties that want roasted chicken, ziti, and salads by the tray. Sandwich platters cover the offices out by the airport corridor.',
    dishes: ['Roasted chicken', 'Ziti & meatballs', 'Chicken parmesan', 'Sandwich platters', 'Garden salad', 'Desserts'],
    eventsHeading: 'Westfield Occasions',
    eventsBlurb:
      'University functions, club banquets at the golf courses, school events, and family milestones across town.',
    eventTypes: ['University functions', 'Banquets & fundraisers', 'School events', 'Family parties', 'Office lunches'],
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
          { name: 'Ludlow Boys & Girls Club', url: 'https://www.ludlowbgc.org' },
      { name: 'Randall\'s Farm & Greenhouse', url: 'https://www.randallsfarm.net' },
    ],
    variant: 'b',
    foodHeading: 'Comfort Food, Club-Hall Portions',
    foodBlurb:
      'Ludlow knows how to feed a hall. The spreads that fit here are the hearty ones: sausage with peppers and onions, kielbasa, roasted chicken, and ziti with meatballs, with plenty of rolls and salad alongside.',
    dishes: ['Sausage, peppers & onions', 'Kielbasa', 'Roasted chicken', 'Ziti & meatballs', 'Garden salad', 'Rolls & butter'],
    eventsHeading: 'Ludlow Gatherings',
    eventsBlurb:
      'Club functions, christenings and communions, team banquets, and family parties, plus workplace lunches around the Mills.',
    eventTypes: ['Club functions', 'Christenings & communions', 'Team banquets', 'Family parties', 'Workplace lunches'],
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
          { name: 'The Village Commons', url: 'https://thevillagecommons.com' },
      { name: 'Brunelle\'s Marina', url: 'https://www.brunelles.com' },
      { name: 'The Ledges Golf Club', url: 'https://ledgesgc.com' },
      { name: 'South Hadley Public Library', url: 'https://shadleylib.org' },
      { name: 'Skinner State Park', url: 'https://www.mass.gov/locations/skinner-state-park' },
    ],
    neighborhoods: ['South Hadley Falls'],
    variant: 'a',
    foodHeading: 'Brunch for Showers & Milestones',
    foodBlurb:
      'South Hadley leans brunch: banana bread French toast, eggs benedict, and pancake spreads for shower and graduation mornings, with wrap platters and salads when the party runs into the afternoon.',
    dishes: ['Banana bread French toast', 'Eggs benedict', 'Pancakes & bacon', 'Wrap platters', 'Garden salad', 'Muffins, coffee & juice'],
    eventsHeading: 'Occasions Around the Commons',
    eventsBlurb:
      'Bridal and baby showers, graduation brunches, faculty and staff events near the college, and family gatherings by the river.',
    eventTypes: ['Bridal & baby showers', 'Graduation brunches', 'Campus department events', 'Family gatherings', 'Memorial receptions'],
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
          { name: 'Granby Free Public Library', url: 'https://granbylibrary.com' },
      { name: 'Red Fire Farm', url: 'https://www.redfirefarm.com' },
      { name: 'Mount Holyoke Range State Park', url: 'https://www.mass.gov/locations/mount-holyoke-range-state-park' },
    ],
    variant: 'b',
    foodHeading: 'Homemade, and Plenty of It',
    foodBlurb:
      'Granby keeps it straightforward and generous: roast turkey with gravy, roasted chicken, salads, and dessert trays for church halls, school events, and family reunions along the 202 corridor.',
    dishes: ['Roast turkey with gravy', 'Roasted chicken', 'Garden salad', 'Macaroni salad', 'Rolls & butter', 'Dessert trays'],
    eventsHeading: 'Granby Get-Togethers',
    eventsBlurb:
      'Church socials, school and town functions, family reunions, and celebrations at the farm or the fields.',
    eventTypes: ['Church socials', 'Town & school functions', 'Family reunions', 'Birthdays', 'Memorial receptions'],
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
          { name: 'Mill 180 Park', url: 'https://mill180park.com' },
      { name: 'Mount Tom State Reservation', url: 'https://www.mass.gov/locations/mount-tom-state-reservation' },
    ],
    variant: 'a',
    foodHeading: 'Lunch for Creative Crews',
    foodBlurb:
      'Easthampton\'s mill buildings run on working lunches: individual wraps and grinders, salad bowls, and homemade soup in the cold months. For openings and receptions, the same menu scales up to platters.',
    dishes: ['Wrap & grinder platters', 'Individual boxed portions', 'Garden salad', 'Homemade soups', 'Cold-cut platters', 'Desserts'],
    eventsHeading: 'Easthampton Events',
    eventsBlurb:
      'Studio and office lunches at the mills, school functions, receptions, and family parties across town.',
    eventTypes: ['Studio & office lunches', 'Receptions & openings', 'School functions', 'Family parties', 'Fundraisers'],
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
          { name: 'Cooley Dickinson Hospital', url: 'https://www.cooleydickinson.org' },
      { name: 'Forbes Library', url: 'https://forbeslibrary.org' },
      { name: 'Thornes Marketplace', url: 'https://thornesmarketplace.com' },
      { name: 'Three County Fairgrounds', url: 'https://www.3countyfair.com' },
      { name: 'City of Northampton', url: 'https://www.northamptonma.gov' },
      { name: 'Greater Northampton Chamber', url: 'https://explorenorthampton.com' },
    ],
    neighborhoods: ['Florence', 'Leeds'],
    variant: 'b',
    foodHeading: 'Meetings, Brunches & Receptions',
    foodBlurb:
      'Northampton runs to meetings and receptions: breakfast spreads with eggs benedict and French toast, wrap platters with serious salads, and vegetarian mains like vegetable lasagna always in the mix.',
    dishes: ['Eggs benedict', 'French toast', 'Wrap platters', 'Vegetable lasagna', 'Garden salad', 'Muffins, coffee & juice'],
    eventsHeading: 'What We Cater in Noho',
    eventsBlurb:
      'Business meetings downtown, campus department events, receptions, and family celebrations out to Florence and Leeds.',
    eventTypes: ['Business meetings', 'Campus events', 'Receptions', 'Showers & brunches', 'Family celebrations'],
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
          { name: 'The Longmeadow Shops', url: 'https://thelongmeadowshops.com' },
      { name: 'Springfield JCC', url: 'https://springfieldjcc.org' },
      { name: 'Glenmeadow', url: 'https://glenmeadow.org' },
    ],
    variant: 'a',
    foodHeading: 'Shower & Holiday Spreads',
    foodBlurb:
      'Longmeadow is shower-and-holiday territory: banana bread French toast and pancake brunches in the morning, cold-cut and wrap platters with macaroni salad for afternoon open houses.',
    dishes: ['Banana bread French toast', 'Pancakes & bacon', 'Cold-cut platters', 'Wrap platters', 'Macaroni salad', 'Desserts'],
    eventsHeading: 'Longmeadow Occasions',
    eventsBlurb:
      'Bridal and baby showers, holiday parties, club luncheons, and milestone birthdays, plus campus events at Bay Path.',
    eventTypes: ['Bridal & baby showers', 'Holiday parties', 'Club luncheons', 'Milestone birthdays', 'Campus events'],
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
          { name: 'East Longmeadow Public Schools', url: 'https://www.elps.us' },
      { name: 'Heritage Park', url: 'https://www.eastlongmeadowma.gov/321/Heritage-Park' },
    ],
    variant: 'b',
    foodHeading: 'Office Lunch, Solved',
    foodBlurb:
      'The industrial park runs on dependable lunch: grinder and wrap platters, cold cuts with potato salad, and a dessert tray so the 1 pm meeting goes easier. Family parties get the same food, scaled up.',
    dishes: ['Grinder platters', 'Wrap platters', 'Cold cuts (roast beef, ham, turkey)', 'Potato salad', 'Homemade soups', 'Dessert trays'],
    eventsHeading: 'East Longmeadow Events',
    eventsBlurb:
      'Office lunches and trainings in the industrial park, retirement parties, school functions, and family celebrations around the rotary.',
    eventTypes: ['Office lunches', 'Trainings', 'Retirement parties', 'School functions', 'Family celebrations'],
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
          { name: 'Wilbraham Public Library', url: 'https://www.wilbrahamlibrary.org' },
      { name: 'Hampden-Wilbraham Regional Schools', url: 'https://www.hwrsd.org' },
      { name: 'Interskate 91 South', url: 'https://www.interskate91.com' },
    ],
    variant: 'a',
    foodHeading: 'Family-Style Favorites',
    foodBlurb:
      'Wilbraham parties call for family-style Italian: chicken parmesan, meat lasagna, and ziti with meatballs, with garden salad and rolls alongside. Sports banquets get the same table, just bigger.',
    dishes: ['Chicken parmesan', 'Meat lasagna', 'Ziti & meatballs', 'Roasted chicken', 'Garden salad', 'Rolls & butter'],
    eventsHeading: 'Wilbraham Gatherings',
    eventsBlurb:
      'School and booster events, sports banquets, family milestones, and workplace lunches along Boston Road.',
    eventTypes: ['Sports banquets', 'School & booster events', 'Family milestones', 'Workplace lunches', 'Holiday parties'],
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
          { name: 'Palmer Public Library', url: 'https://www.palmerlibrary.org' },
      { name: 'Pathfinder Tech', url: 'https://www.pathfindertech.org' },
      { name: 'Camp Ramah in New England', url: 'https://www.campramahne.org' },
      { name: 'Baystate Wing Hospital', url: 'https://www.baystatehealth.org' },
    ],
    neighborhoods: ['Three Rivers', 'Thorndike', 'Bondsville'],
    variant: 'b',
    foodHeading: 'Hearty Food for Working Crews',
    foodBlurb:
      'Out on the Route 20 corridor, hearty is the way to go: baked ham, meatballs, sausage with peppers and onions, and baked beans, the kind of table that keeps a crew or a fire-hall fundraiser going.',
    dishes: ['Baked ham', 'Meatballs (Italian or Swedish)', 'Sausage, peppers & onions', 'Baked beans', 'Potato salad', 'Rolls & butter'],
    eventsHeading: 'Palmer & the Villages',
    eventsBlurb:
      'Town functions, fundraisers, crew meals, and family parties across Palmer, Three Rivers, Thorndike, and Bondsville.',
    eventTypes: ['Fundraisers', 'Town functions', 'Crew meals', 'Family parties', 'Memorial receptions'],
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
          { name: 'Clapp Memorial Library', url: 'https://www.clapplibrary.org' },
      { name: 'Belchertown Fair', url: 'https://www.belchertownfair.com' },
      { name: 'Stone House Museum', url: 'https://stonehousemuseum.org' },
    ],
    variant: 'a',
    foodHeading: 'Fair-Town Classics',
    foodBlurb:
      'Belchertown likes the classics: roast pork with gravy, roasted chicken, macaroni salad, and dessert trays, the kind of table that fits a town where the fair still anchors the calendar.',
    dishes: ['Roast pork with gravy', 'Roasted chicken', 'Ziti & meatballs', 'Macaroni salad', 'Garden salad', 'Dessert trays'],
    eventsHeading: 'Belchertown Events',
    eventsBlurb:
      'Town and school functions, scout and club events, family reunions, and graduation parties from the common to Route 9.',
    eventTypes: ['Town & school functions', 'Club events', 'Family reunions', 'Graduation parties', 'Church socials'],
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
          { name: 'Emily Dickinson Museum', url: 'https://www.emilydickinsonmuseum.org' },
      { name: 'Jones Library', url: 'https://www.joneslibrary.org' },
      { name: 'Amherst Area Chamber', url: 'https://www.amherstarea.com' },
      { name: 'The Drake', url: 'https://www.thedrakeamherst.org' },
      { name: 'Town of Amherst', url: 'https://www.amherstma.gov' },
    ],
    neighborhoods: ['North Amherst', 'South Amherst'],
    variant: 'b',
    foodHeading: 'Menus That Respect a Mixed Table',
    foodBlurb:
      'Amherst events always seat a few vegetarians, so we build for it: vegetable lasagna and eggplant rollatini next to roasted chicken, veggie wraps beside the cold cuts, and salads that are more than an afterthought.',
    dishes: ['Vegetable lasagna', 'Eggplant rollatini', 'Veggie wraps', 'Roasted chicken', 'Garden salad', 'Muffins, coffee & juice'],
    eventsHeading: 'Amherst Occasions',
    eventsBlurb:
      'Department meetings, receptions, reunion weekends, graduation parties, and family milestones downtown.',
    eventTypes: ['Department meetings', 'Receptions', 'Reunion weekends', 'Graduation parties', 'Family milestones'],
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
          { name: 'The Starting Gate at GreatHorse', url: 'https://www.thestartinggate.com' },
      { name: 'Hampden-Wilbraham Regional Schools', url: 'https://www.hwrsd.org' },
    ],
    variant: 'a',
    foodHeading: 'Small-Town Spreads',
    foodBlurb:
      'Hampden events are personal: a church social, a golf outing, a family milestone. Roasted chicken, ziti and meatballs, salads, and a dessert tray cover most of them without fuss.',
    dishes: ['Roasted chicken', 'Ziti & meatballs', 'Cold-cut platters', 'Garden salad', 'Rolls & butter', 'Dessert trays'],
    eventsHeading: 'Hampden Gatherings',
    eventsBlurb:
      'Church socials, town events, golf outings, family reunions, and memorial receptions.',
    eventTypes: ['Church socials', 'Town events', 'Golf outings', 'Family reunions', 'Memorial receptions'],
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
