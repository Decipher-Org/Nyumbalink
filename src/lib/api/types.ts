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
  /**
   * Milestone 5 replaced `subscriptionStatus` with this breakdown rather than
   * filling the old field in, because subscriptions are **per property**: a
   * landlord with four blocks — two paid, one lapsed, one still a draft — has no
   * single status. `GET /subscriptions/landlord` has the per-property detail.
   */
  subscriptions: { properties: number; active: number; lapsed: number };
  /** Real since Milestone 3; equals `subscriptions.properties`. */
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
  /**
   * Real since Milestone 5. `status` stayed a string rather than becoming the
   * service layer's `active` boolean because this field name and shape were
   * bound in Milestone 2 — `expiresAt` is what carries the new information.
   *
   * Not a substitute for `getTenantAccess()`: a tenant profile is optional, so
   * this record 404s for most tenants while their pass is perfectly valid.
   */
  subscription: {
    status: "ACTIVE" | "INACTIVE";
    startedAt: string | null;
    expiresAt: string | null;
  };
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
 * A number M-Pesa can actually charge. Mirrors `KE_MOBILE_RE` in
 * `src/validators/payments.js`.
 *
 * Deliberately narrower than `E164_RE`: a profile may hold any international
 * number, but an STK push only reaches a Kenyan mobile, so a checkout has to
 * reject what a profile form would accept.
 */
export const KE_MOBILE_RE = /^\+254(1|7)\d{8}$/;

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

// ---------------------------------------------------------------- payments

/** `PaymentStatus` in `prisma/schema.prisma`. */
export type PaymentStatus = "PENDING" | "QUEUED" | "SUCCESS" | "FAILED" | "CANCELLED";

/** `PaymentPurpose`. The first two are priced per unit; the rest are flat lookups. */
export type PaymentPurpose =
  | "LANDLORD_SUBSCRIPTION"
  | "LANDLORD_UNIT_TOPUP"
  | "TENANT_DAILY_ACCESS"
  | "BOOST_LISTING"
  | "FEATURED_PROPERTY";

/**
 * A payment stops changing once it reaches one of these, which is what makes it
 * safe for `use-stk-payment` to stop polling. `PENDING`/`QUEUED` both mean "the
 * STK prompt is out there and nobody has answered it yet".
 */
export const TERMINAL_PAYMENT_STATUSES = ["SUCCESS", "FAILED", "CANCELLED"] as const;

export function isTerminalPayment(status: PaymentStatus): boolean {
  return (TERMINAL_PAYMENT_STATUSES as readonly string[]).includes(status);
}

/** What each purpose is called in front of a customer. */
export const PURPOSE_LABELS: Record<PaymentPurpose, string> = {
  LANDLORD_SUBSCRIPTION: "Listing subscription",
  LANDLORD_UNIT_TOPUP: "Extra units",
  TENANT_DAILY_ACCESS: "Browsing pass",
  BOOST_LISTING: "Boosted listing",
  FEATURED_PROPERTY: "Featured property",
};

/**
 * `toPaymentDto` in `src/services/payments.js`. `callbackToken` is deliberately
 * absent from the wire — it is the webhook's bearer secret.
 */
export type Payment = {
  id: string;
  userId: string;
  /** Whole KES. Priced server-side; a client-supplied amount is discarded. */
  amount: number;
  currency: string;
  /** Only `MPESA` exists. PayHero is the gateway, M-Pesa is the rail. */
  provider: "MPESA";
  purpose: PaymentPurpose;
  status: PaymentStatus;
  phoneNumber: string;
  /** Set only for the per-unit purposes, so a landlord can see what built the figure. */
  propertyId: string | null;
  unitCount: number | null;
  /** The M-Pesa receipt once settled, our own reference before then. */
  transactionReference: string | null;
  mpesaReceipt: string | null;
  /**
   * Daraja's numeric code, surfaced through PayHero. **Branch on this, not on
   * `resultDesc`** — 1032 is user-cancelled, 1 is insufficient funds, and the
   * strings are not stable enough to match on.
   */
  resultCode: number | null;
  resultDesc: string | null;
  failureReason: string | null;
  settledAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Daraja result codes worth reacting to specifically. `0` is success; the mock
 * gateway emits `1032` for its failure path. The others are Daraja's standard
 * codes — handled if they arrive, not relied upon.
 */
export const RESULT_CODE = {
  SUCCESS: 0,
  /** The prompt was dismissed. Offering a retry is the right move. */
  CANCELLED_BY_USER: 1032,
  INSUFFICIENT_FUNDS: 1,
  /** Nobody touched the handset before the prompt died. */
  TIMEOUT: 1037,
  WRONG_PIN: 2001,
} as const;

/**
 * The `202` body from every initiate. `reused: true` means an identical payment
 * was already in flight and **no second prompt was sent** — the copy has to say
 * "check your phone, we already sent it" rather than imply a fresh push.
 */
export type PaymentInitiation = {
  payment: Payment;
  reused: boolean;
};

// ----------------------------------------------------------- subscriptions

/**
 * `GET /subscriptions/tenant`. A landlord or admin answers `{active: true,
 * exempt: true, expiresAt: null}` — they are not gated, and rendering "your pass
 * expired" at them would be showing them a bill they do not owe.
 */
export type TenantAccess = {
  active: boolean;
  expiresAt: string | null;
  startedAt: string | null;
  exempt: boolean;
  /** Absent for exempt accounts. Read the price from here, never from a literal. */
  price?: number;
  hours?: number;
};

/**
 * One row of `GET /subscriptions/landlord` — the whole portfolio in one query.
 *
 * `unpaidUnits` is `max(0, currentUnits - paidUnits)`, computed server-side. Read
 * it; do not recompute the pricing rule in the client.
 */
export type LandlordSubscriptionRow = {
  propertyId: string;
  title: string;
  status: PropertyStatus;
  active: boolean;
  currentUnits: number;
  paidUnits: number;
  unpaidUnits: number;
  unitPrice: number;
  expiresAt: string | null;
};

/** What a payment added to a subscription. Display-only history. */
export type SubscriptionGrant = {
  kind: "PURCHASE" | "RENEWAL" | "TOPUP";
  units: number;
  amount: number;
  createdAt: string;
};

/** `GET /subscriptions/landlord?propertyId=` — one property, with recent grants. */
export type LandlordSubscriptionDetail = {
  propertyId: string;
  active: boolean;
  paidUnits: number;
  currentUnits: number;
  unitPrice: number;
  expiresAt: string | null;
  startedAt: string | null;
  grants: SubscriptionGrant[];
};

/**
 * `GET /subscriptions/landlord/quote`. Always shown before an STK push: an
 * unexpected prompt is a cancelled push, and ten successive cancellations block
 * that phone number for 24 hours account-wide.
 */
export type SubscriptionQuote = {
  amount: number;
  unitCount: number;
  unitPrice: number;
  purpose: "LANDLORD_SUBSCRIPTION" | "LANDLORD_UNIT_TOPUP";
  currency: string;
  /** Null for a top-up, which extends the term already running. */
  termDays: number | null;
};

/**
 * One element of `ApiError.details` on `403 SUBSCRIPTION_UNITS_EXCEEDED`, thrown
 * by `assertCapacity` and `assertPublishable` when a write would expose more
 * units than were paid for. The backend sends a single-element array, so callers
 * read `err.details[0]`.
 *
 * The server has already done the arithmetic — render the top-up offer from these
 * numbers rather than deriving them again.
 */
export type UnitsExceededDetails = {
  paidUnits: number;
  requestedUnits: number;
  additionalUnits: number;
  topUpAmount: number;
};

/** Narrows `ApiError.details[0]` on a units-exceeded refusal. */
export function unitsExceededFrom(details: unknown): UnitsExceededDetails | null {
  const first = Array.isArray(details) ? details[0] : null;
  if (!first || typeof first !== "object") return null;
  const d = first as Record<string, unknown>;
  return typeof d.additionalUnits === "number" && typeof d.topUpAmount === "number"
    ? {
        paidUnits: Number(d.paidUnits ?? 0),
        requestedUnits: Number(d.requestedUnits ?? 0),
        additionalUnits: d.additionalUnits,
        topUpAmount: d.topUpAmount,
      }
    : null;
}
