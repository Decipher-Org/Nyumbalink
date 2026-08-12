/**
 * Amenity suggestions for the unit editor.
 *
 * Amenity **values** are real: they are stored on `Unit.amenities` and shown on
 * every listing. Only *filtering* by them is unbuilt (Milestone 6), so this list
 * belongs in content rather than `lib/demo/`.
 *
 * The backend stores whatever it is given, lowercased and de-duplicated, with no
 * whitelist. This is therefore a set of suggestions — a landlord can type
 * anything — chosen for what actually gets advertised on the Kenyan coast.
 */

export const AMENITY_SUGGESTIONS = [
  "water",
  "borehole",
  "electricity",
  "tokens",
  "wifi",
  "parking",
  "security",
  "cctv",
  "gate",
  "balcony",
  "furnished",
  "tiled",
  "ensuite",
  "wardrobe",
  "kitchen",
  "pantry",
  "hot shower",
  "solar",
  "backup generator",
  "borehole water",
  "garden",
  "swimming pool",
  "lift",
  "gym",
  "servant quarter",
  "sea view",
  "pets allowed",
] as const;

/** The backend's own ceilings, from `checkAmenities`. */
export const AMENITY_LIMITS = { max: 40, itemMax: 40 } as const;

/** Matches the server's normalisation, so the UI shows what will be stored. */
export function normaliseAmenity(value: string): string {
  return value.trim().toLowerCase();
}
