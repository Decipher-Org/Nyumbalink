/** Canonical service area shared by search and property creation controls. */
export const COASTAL_COUNTIES = [
  "Kilifi",
  "Mombasa",
  "Kwale",
  "Lamu",
  "Tana River",
  "Taita-Taveta",
] as const;

export type CoastalCounty = (typeof COASTAL_COUNTIES)[number];

export const TOWNS_BY_COUNTY = {
  Kilifi: [
    "Kilifi Town",
    "Mtwapa",
    "Malindi",
    "Watamu",
    "Kikambala",
    "Mnarani",
    "Mariakani",
    "Vipingo",
    "Takaungu",
    "Gede",
    "Bofa",
    "Mavueni",
    "Kaloleni",
    "Rabai",
    "Bamba",
    "Ganze",
    "Marafa",
    "Tezo",
    "Matsangoni",
    "Chonyi",
  ],
  Mombasa: [
    "Mombasa",
    "Nyali",
    "Bamburi",
    "Kisauni",
    "Likoni",
    "Changamwe",
    "Mvita",
    "Jomvu",
    "Shanzu",
  ],
  Kwale: [
    "Kwale",
    "Diani",
    "Ukunda",
    "Msambweni",
    "Tiwi",
    "Kinango",
    "Lunga Lunga",
    "Samburu",
  ],
  Lamu: [
    "Lamu Town",
    "Shela",
    "Mokowe",
    "Mpeketoni",
    "Witu",
    "Hindi",
    "Faza",
    "Kiunga",
  ],
  "Tana River": ["Hola", "Garsen", "Bura", "Madogo", "Kipini", "Ngao"],
  "Taita-Taveta": ["Voi", "Wundanyi", "Mwatate", "Taveta", "Maungu"],
} as const satisfies Record<CoastalCounty, readonly string[]>;

export const ALL_COASTAL_TOWNS = Object.values(TOWNS_BY_COUNTY).flat();

export const POPULAR_LOCATIONS: ReadonlyArray<{
  county: CoastalCounty;
  town: string;
}> = [
  { county: "Kilifi", town: "Mtwapa" },
  { county: "Mombasa", town: "Nyali" },
  { county: "Kwale", town: "Diani" },
  { county: "Lamu", town: "Lamu Town" },
  { county: "Tana River", town: "Garsen" },
  { county: "Taita-Taveta", town: "Voi" },
];

export function isCoastalCounty(value: string): value is CoastalCounty {
  return COASTAL_COUNTIES.some((county) => county === value);
}

export function townsForCounty(county: string): readonly string[] {
  return isCoastalCounty(county) ? TOWNS_BY_COUNTY[county] : ALL_COASTAL_TOWNS;
}

export type PriceBracket = {
  /** Stable key used as the <Select> value. */
  id: string;
  label: string;
  minPrice?: number;
  maxPrice?: number;
};

/** Brackets map onto the minPrice/maxPrice query params the API already accepts. */
export const PRICE_BRACKETS: PriceBracket[] = [
  { id: "under-10k", label: "Under 10,000", maxPrice: 10_000 },
  {
    id: "10k-20k",
    label: "10,000 – 20,000",
    minPrice: 10_000,
    maxPrice: 20_000,
  },
  {
    id: "20k-35k",
    label: "20,000 – 35,000",
    minPrice: 20_000,
    maxPrice: 35_000,
  },
  {
    id: "35k-50k",
    label: "35,000 – 50,000",
    minPrice: 35_000,
    maxPrice: 50_000,
  },
  {
    id: "50k-80k",
    label: "50,000 – 80,000",
    minPrice: 50_000,
    maxPrice: 80_000,
  },
  { id: "80k-plus", label: "80,000+", minPrice: 80_000 },
];
