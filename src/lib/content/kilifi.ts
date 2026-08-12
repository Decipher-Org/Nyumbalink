/**
 * Launch geography. NyumbaLink starts in Kilifi County only, so county is a
 * constant rather than a user choice — every search and every property the app
 * creates carries `county: "Kilifi"`.
 *
 * The backend has no locations endpoint (and no county whitelist), so this list
 * is the single source of truth on the client. When a second county opens, this
 * file grows a map of county -> towns and `COUNTY` becomes a selection again;
 * nothing else should need to change.
 */

export const COUNTY = "Kilifi" as const;

/** Towns and urban areas within Kilifi County, used for the `town` filter. */
export const KILIFI_TOWNS = [
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
] as const;

export type KilifiTown = (typeof KILIFI_TOWNS)[number];

/** Surfaced as quick-pick chips on the hero and the tenant search screen. */
export const POPULAR_TOWNS = [
  "Kilifi Town",
  "Mtwapa",
  "Malindi",
  "Watamu",
  "Kikambala",
] as const;
