// Structured model of the catering menu, for the /catering/quote builder.
//
// menuData.json stays the single source of truth for the packages, their
// options, and every price: this module only restructures the three catering
// sections into a shape a form can render (choice groups with real min/max
// limits, upcharges as numbers rather than "(+$2/pp)" baked into a label).
// Editing a price or an entree in menuData.json changes /menu, the PDF-parity
// menu page, and this builder together. Nothing here re-states a price.
//
// The parse throws at build time on any upcharge it cannot read, so a typo in
// menuData.json fails the build instead of silently quoting $0.

import menuData from './menuData.json';

export interface ChoiceOption {
  name: string;
  /** Dollars per person on top of the package base price. 0 when none. */
  upcharge: number;
  /** Qualifier that came with the upcharge, e.g. "Carving". */
  note?: string;
  /** Sub-heading inside a group, e.g. "Chicken" vs "Beef & Seafood". */
  section?: string;
}

/** An always-included item, with its parenthetical split off onto its own line. */
export interface IncludeItem {
  name: string;
  /** "Roast Beef / Ham / Turkey" under a "Cold Cuts" bullet. */
  detail?: string;
}

/** Menu prose is long; "with" costs a whole line in a narrow card. */
function shorten(name: string): string {
  return name.replace(/\bwith\b/g, 'w/');
}

function toInclude(raw: string): IncludeItem {
  const match = raw.match(/^(.*?)\s*\(([^)]+)\)$/);
  if (match && match[2].includes(',')) {
    return {
      name: shorten(match[1].trim()),
      detail: match[2]
        .split(',')
        .map((part) => part.trim())
        .join(' / '),
    };
  }
  return { name: shorten(raw) };
}

export interface ChoiceGroup {
  id: string;
  label: string;
  /** How many the guest must pick. min === max for every group we have today. */
  min: number;
  max: number;
  /** true renders checkboxes (pick several), false renders radios (pick one). */
  multi: boolean;
  options: ChoiceOption[];
}

export interface CateringPackage {
  id: string;
  name: string;
  /** Per person, in dollars. */
  basePrice: number;
  minGuests: number;
  /** Always included, nothing to choose. */
  includes: IncludeItem[];
  groups: ChoiceGroup[];
  popular: boolean;
  category: PackageCategory;
}

export type PackageCategory = 'set' | 'choice';

interface RawGroup {
  label: string;
  items: string[];
}

interface RawItem {
  name: string;
  description?: string;
  price?: string;
  popular?: boolean;
  includes?: unknown;
}

interface RawSection {
  id: string;
  name: string;
  service: string;
  note?: string;
  included?: string[];
  items: RawItem[];
  extras?: { title?: string; note?: string; groups: RawGroup[] };
}

const SECTIONS = menuData.sections as unknown as RawSection[];

// "(+$2/pp)" or "(Carving +$3/pp)" appended to an option name.
const UPCHARGE_RE = /\s*\(\s*([^)]*?)\s*\+\$([0-9]+(?:\.[0-9]{1,2})?)\s*\/\s*pp\s*\)/;

function toOption(raw: string, section?: string): ChoiceOption {
  const match = raw.match(UPCHARGE_RE);
  if (!match) {
    if (raw.includes('+$')) {
      throw new Error(
        `cateringPackages: "${raw}" carries an upcharge this parser cannot read. ` +
          'Expected the form "Name (+$2/pp)" or "Name (Carving +$3/pp)".'
      );
    }
    const plain = shorten(raw);
    return section ? { name: plain, upcharge: 0, section } : { name: plain, upcharge: 0 };
  }
  const note = match[1].trim();
  const option: ChoiceOption = {
    name: shorten(raw.replace(UPCHARGE_RE, '').trim()),
    upcharge: Number.parseFloat(match[2]),
  };
  if (note) option.note = note;
  if (section) option.section = section;
  return option;
}

function section(id: string): RawSection {
  const found = SECTIONS.find((s) => s.id === id);
  if (!found) throw new Error(`cateringPackages: menuData.json has no section "${id}"`);
  return found;
}

function price(item: RawItem): number {
  const value = Number.parseFloat(item.price ?? '');
  if (!Number.isFinite(value)) {
    throw new Error(`cateringPackages: "${item.name}" has no readable price in menuData.json`);
  }
  return value;
}

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function minGuests(raw?: string): number {
  const match = raw?.match(/minimum\s+(\d+)\s+people/i);
  return match ? Number.parseInt(match[1], 10) : 1;
}

// 1. Buffet Packages 1-5: fixed bundles, nothing to choose.
const buffets = section('catering-buffet-packages');
const setPackages: CateringPackage[] = buffets.items.map((item) => ({
  id: slug(item.name),
  name: item.name,
  basePrice: price(item),
  minGuests: minGuests(buffets.note),
  includes: ((item.includes as string[]) ?? []).map(toInclude),
  groups: [],
  popular: item.popular === true,
  category: 'set',
}));

// 2. Hot Item Buffet: two entrees drawn from a combined chicken + beef/seafood
// pool ("two chicken, two beef/seafood, or one of each"), plus a dessert.
const hotItem = section('catering-hot-item-buffet');
const hotItemEntry = hotItem.items[0];
const hotItemGroups = hotItemEntry.includes as RawGroup[];

function hotItemOptions(labelStartsWith: string, sectionName: string): ChoiceOption[] {
  const group = hotItemGroups.find((g) => g.label.startsWith(labelStartsWith));
  if (!group) {
    throw new Error(`cateringPackages: Hot Item Buffet has no "${labelStartsWith}" group`);
  }
  return group.items.map((raw) => toOption(raw, sectionName));
}

const hotItemPackage: CateringPackage = {
  id: 'hot-item-buffet',
  name: hotItemEntry.name,
  basePrice: price(hotItemEntry),
  minGuests: minGuests(hotItem.note),
  includes: (hotItem.included ?? []).map(toInclude),
  groups: [
    {
      id: 'entrees',
      label: 'Entrees',
      min: 2,
      max: 2,
      multi: true,
      options: [
        ...hotItemOptions('Chicken', 'Chicken'),
        ...hotItemOptions('Beef', 'Beef & Seafood'),
      ],
    },
    {
      id: 'dessert',
      label: 'Dessert',
      min: 1,
      max: 1,
      multi: false,
      options: hotItemOptions('Dessert', ''),
    },
  ],
  popular: hotItemEntry.popular === true,
  category: 'choice',
};

// 3. Specialty Buffets: three entrees each, plus the starch / vegetable /
// dessert picks that come with every specialty buffet.
const specialty = section('catering-specialty-buffets');
const specialtyExtras: ChoiceGroup[] = (specialty.extras?.groups ?? []).map((group) => ({
  id: slug(group.label.replace(/\(.*\)/, '')),
  label: group.label.replace(/\s*\(.*\)\s*/, '').trim(),
  min: 1,
  max: 1,
  multi: false,
  options: group.items.map((raw) => toOption(raw)),
}));

const specialtyPackages: CateringPackage[] = specialty.items.map((item) => ({
  id: slug(item.name),
  name: item.name,
  basePrice: price(item),
  minGuests: minGuests(specialty.note),
  includes: (specialty.included ?? []).map(toInclude),
  groups: [
    {
      id: 'entrees',
      label: 'Entrees',
      min: 3,
      max: 3,
      multi: true,
      options: (item.includes as string[]).map((raw) => toOption(raw)),
    },
    ...specialtyExtras,
  ],
  popular: item.popular === true,
  category: 'choice',
}));

export const CATERING_PACKAGES: CateringPackage[] = [
  ...setPackages,
  hotItemPackage,
  ...specialtyPackages,
];

export const SET_PACKAGES = CATERING_PACKAGES.filter((p) => p.category === 'set');
export const CHOICE_PACKAGES = CATERING_PACKAGES.filter((p) => p.category === 'choice');

/** Lowest per-person base price on offer, for the page's honest "from" line. */
export const LOWEST_BASE_PRICE = Math.min(...CATERING_PACKAGES.map((p) => p.basePrice));

export function formatPrice(dollars: number): string {
  return `$${dollars.toFixed(2)}`;
}
