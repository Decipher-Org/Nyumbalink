/**
 * Wire types for `propertyHubBackend`.
 *
 * These mirror the API's serialisers exactly — the shapes returned by
 * `src/routes/*.js`, not the Prisma models. Where the two differ (a list card is
 * far thinner than a detail record) there is a separate type, so a screen can
 * never read a field the endpoint it called does not send.
 *
 * Nothing invented lives here. Fields the mockups show but the schema lacks
 * (`propertyType`, `bathrooms`, `size`, `furnishing`) and features on later
 * milestones (favourites, reviews, view counts) belong to `lib/demo/`.
 */

export type Role = "TENANT" | "LANDLORD" | "ADMIN";

export type UserStatus = "ACTIVE" | "SUSPENDED" | "DEACTIVATED";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: Role;
  status: UserStatus;
  phoneNumber?: string | null;
  phoneNumberVerified?: boolean | null;
  createdAt?: string;
  updatedAt?: string;
};

/** `POST /api/auth/sign-up/email` and `sign-in/email`. Sign-up returns `token: null`. */
export type AuthResponse = {
  token: string | null;
  user: AuthUser;
  redirect?: boolean;
};

/** `GET /api/auth/get-session` — both fields are null when unauthenticated. */
export type SessionResponse = {
  session: { id: string; expiresAt: string } | null;
  user: AuthUser | null;
} | null;

// ---------------------------------------------------------------- profiles

export type LandlordProfile = {
  id: string;
  userId: string;
  nationalId: string;
  businessName: string | null;
  mpesaNumber: string | null;
  profilePhoto: string | null;
  /** Admin-controlled. Property writes are `403 LANDLORD_NOT_VERIFIED` until true. */
  verified: boolean;
  /** Placeholder until Milestone 5; the backend returns a constant "PENDING". */
  subscriptionStatus: string;
  /** Placeholder; the backend returns a constant 0. Derive real counts from the list. */
  propertiesCount: number;
  createdAt: string;
  updatedAt: string;
};

export type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

export type TenantProfile = {
  id: string;
  userId: string;
  occupation: string | null;
  gender: Gender | null;
  profilePhoto: string | null;
  /** Placeholder until Milestone 5. */
  subscription: { status: string; expiresAt: string | null };
  createdAt: string;
  updatedAt: string;
};

// -------------------------------------------------------------- properties

export type PropertyStatus = "DRAFT" | "ACTIVE" | "HIDDEN" | "ARCHIVED";

/**
 * Legal status moves, straight from `src/validators/properties.js`. The editor
 * must offer only these or the request comes back
 * `400 INVALID_STATUS_TRANSITION`. Re-sending the current status is a no-op, so
 * a form may PATCH an unchanged value safely.
 */
export const STATUS_TRANSITIONS: Record<PropertyStatus, PropertyStatus[]> = {
  DRAFT: ["ACTIVE", "ARCHIVED"],
  ACTIVE: ["HIDDEN", "ARCHIVED"],
  HIDDEN: ["ACTIVE", "ARCHIVED"],
  ARCHIVED: [],
};

/**
 * `GET /properties` — deliberately thin. No unit counts and no `updatedAt`:
 * screens that need those fetch units per row or open the detail record.
 */
export type PropertyCard = {
  id: string;
  title: string;
  county: string;
  town: string;
  estate: string | null;
  /** At most one image; the serialiser slices the set. */
  images: string[];
  status: PropertyStatus;
  /** Cheapest unit rent in KES, or null when no units exist yet. */
  unitsFrom: number | null;
  createdAt: string;
};

/** The public landlord block embedded in a property detail. Never `nationalId`. */
export type PropertyLandlord = {
  id: string;
  businessName: string | null;
  mpesaNumber: string | null;
  profilePhoto: string | null;
  verified: boolean;
};

export type PropertyDetail = {
  id: string;
  title: string;
  description: string | null;
  county: string;
  town: string;
  estate: string | null;
  latitude: number | null;
  longitude: number | null;
  images: string[];
  status: PropertyStatus;
  landlord: PropertyLandlord | null;
  units: Unit[];
  createdAt?: string;
  updatedAt?: string;
};

/**
 * Every optional field accepts `null` to **clear** it, which is the only way —
 * `description` and `estate` have minimum lengths (10 and 2), so an empty string
 * is a validation error, not an erasure. A field left `undefined` is untouched.
 */
export type PropertyWriteInput = {
  title?: string;
  description?: string | null;
  county?: string;
  town?: string;
  estate?: string | null;
  /** Coordinates must be sent as a pair and fall inside Kenya. */
  latitude?: number | null;
  longitude?: number | null;
  /** Full replacement list of URLs. Uploads win when a request carries both. */
  images?: string[] | null;
  status?: PropertyStatus;
};

/** Kenya's coordinate box, from `KE_BOUNDS` in the backend validator. */
export const KE_BOUNDS = { minLat: -5.5, maxLat: 5.5, minLng: 33.5, maxLng: 42.5 };

/** Field limits, mirrored from `validatePropertyCreate` so forms fail locally first. */
export const PROPERTY_LIMITS = {
  title: { min: 3, max: 150 },
  description: { min: 10, max: 5000 },
  town: { min: 2, max: 60 },
  estate: { min: 2, max: 60 },
  images: { max: 12 },
} as const;

/** Field limits, mirrored from `validateUnitCreate`. */
export const UNIT_LIMITS = {
  unitType: { min: 2, max: 60 },
  rent: { min: 0, max: 100_000_000 },
  deposit: { min: 0, max: 100_000_000 },
  totalUnits: { min: 1, max: 10_000 },
  amenities: { max: 40, itemMax: 40 },
} as const;

/** Field limits, mirrored from `validateLandlordProfileCreate`. */
export const PROFILE_LIMITS = {
  businessName: { min: 2, max: 100 },
  occupation: { min: 2, max: 100 },
} as const;

/** A national ID or passport number: 6–20 letters or digits, no separators. */
export const NATIONAL_ID_RE = /^[A-Za-z0-9]{6,20}$/;

/** What the backend stores a phone as, once normalised. */
export const E164_RE = /^\+[1-9]\d{7,14}$/;

/**
 * Mirrors `normalizePhone` in `src/validators/profiles.js`, so a form can show
 * the landlord the number it is actually about to store. Local formats are
 * promoted to E.164; anything else is passed through to fail validation
 * visibly rather than be silently mangled.
 */
export function normalisePhone(raw: string): string {
  const compact = raw.replace(/[\s()-]/g, "");
  if (/^0\d{9}$/.test(compact)) return `+254${compact.slice(1)}`;
  if (/^254\d{9}$/.test(compact)) return `+${compact}`;
  return compact;
}

// ------------------------------------------------------------------- units

/**
 * A unit is a **type** of dwelling ("Bedsitter", "1 Bedroom"), not one physical
 * door. `vacancy` is derived server-side as `availableUnits > 0` and is never
 * stored, so it is read-only here even though a write may send it as shorthand.
 */
export type Unit = {
  id: string;
  propertyId?: string;
  unitType: string;
  rent: number;
  deposit?: number | null;
  totalUnits: number;
  availableUnits: number;
  vacancy: boolean;
  amenities?: string[];
  updatedAt?: string;
};

export type UnitCreateInput = {
  unitType: string;
  rent: number;
  deposit?: number;
  totalUnits: number;
  /** May not exceed `totalUnits`. */
  availableUnits: number;
  amenities?: string[];
};

export type UnitUpdateInput = {
  unitType?: string;
  rent?: number;
  deposit?: number;
  totalUnits?: number;
  availableUnits?: number;
  /** Shorthand: `false` -> 0 available, `true` -> at least 1. An explicit
   *  `availableUnits` in the same request wins. */
  vacancy?: boolean;
  amenities?: string[];
};
