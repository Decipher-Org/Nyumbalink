/**
 * Sample data for the tenant surfaces the backend does not implement yet.
 *
 * Everything here is fake and every screen that reads it renders a `<DemoBadge>`
 * or `<DemoNotice>` — see `lib/demo/registry.ts` for the rule.
 *
 * Two things are deliberately *not* faked:
 *
 *  - **Listings.** Every property, unit, rent, town and image on a tenant screen
 *    comes from `GET /properties`. Nothing in this file invents a home.
 *  - **The paywall.** The designs show a "KSh 20/day to browse" gate. That is
 *    Milestone 5 and unenforced, so it appears as an informational banner and
 *    never blocks a real listing. A fake paywall would be the one piece of demo
 *    data that changes what a user can do, which is not a preview — it's a bug.
 */

import { seedFrom, seededBetween, seededPick } from "@/lib/demo/seed";

// Favourites live in `demo/favourites.ts` — they need a store and a subscription
// rather than a pure function, since four screens share the same set.

// ------------------------------------------------------------- ratings & reviews

export type DemoReview = {
  id: string;
  author: string;
  rating: number;
  at: string;
  body: string;
};

export type DemoRating = {
  /** One decimal place, 3.6–5.0. */
  score: number;
  count: number;
};

/**
 * A stable rating for a property.
 *
 * Seeded from the id so the same listing shows 4.6 on the Home screen, in
 * search results and on its detail page. Ratings start at 3.6 rather than 1.0
 * because a sample listing carrying a one-star average reads as a real verdict
 * on a real landlord, which is not something sample data should imply.
 */
export function demoRating(propertyId: string): DemoRating {
  return {
    score: seededBetween(`${propertyId}:score`, 36, 50) / 10,
    count: seededBetween(`${propertyId}:reviews`, 3, 48),
  };
}

const REVIEW_AUTHORS = [
  "Amina H.",
  "Brian K.",
  "Cynthia W.",
  "Dennis O.",
  "Fatuma S.",
  "Joseph M.",
  "Mercy A.",
  "Said R.",
] as const;

const REVIEW_BODIES = [
  "Clean, quiet and the water never went off while I was there. Caretaker responds quickly.",
  "Good value for the area. The road in gets rough after heavy rain but the house itself is solid.",
  "Landlord was straightforward about the deposit and let me view twice before deciding.",
  "Close to the matatu stage, which made the commute easy. Would recommend to anyone working in town.",
  "Spacious for the price. Bring your own curtains — the windows are large.",
  "Secure compound with a gate. Neighbours are friendly and it's a good spot for a family.",
] as const;

/**
 * Fixed dates, not offsets from today. The demo layer must not call `Date.now()`
 * — it would make the same review drift from "2 days ago" to "3 days ago"
 * mid-session and would differ between two screens rendered a tick apart.
 */
const REVIEW_DATES = [
  "2026-07-28T09:15:00.000Z",
  "2026-07-11T16:40:00.000Z",
  "2026-06-23T11:05:00.000Z",
  "2026-05-30T14:20:00.000Z",
] as const;

/** Three seeded reviews for a property, stable across renders. */
export function demoReviews(propertyId: string): DemoReview[] {
  return Array.from({ length: 3 }, (_, index) => {
    const key = `${propertyId}:review:${index}`;
    return {
      id: key,
      author: seededPick(key, REVIEW_AUTHORS),
      rating: seededBetween(`${key}:stars`, 3, 5),
      at: REVIEW_DATES[seedFrom(key) % REVIEW_DATES.length],
      body: seededPick(`${key}:body`, REVIEW_BODIES),
    };
  });
}

// ------------------------------------------------------- specs the schema lacks

/**
 * `propertyType`, `bathrooms`, `size` and `furnishing` are on the designs but
 * not on the `Property` model, so they cannot be read or saved. They are seeded
 * here and rendered behind a demo marker rather than omitted, because the
 * designs use them as the main comparison row and an empty row would be read as
 * "this listing didn't fill it in" rather than "the platform can't store it".
 */
export type DemoSpecs = {
  propertyType: string;
  bathrooms: number;
  sizeSqM: number;
  furnishing: string;
};

const PROPERTY_TYPES = ["Apartment", "Bedsitter", "House", "Maisonette", "Studio"] as const;
const FURNISHINGS = ["Unfurnished", "Semi-furnished", "Furnished"] as const;

export function demoSpecs(propertyId: string): DemoSpecs {
  return {
    propertyType: seededPick(`${propertyId}:type`, PROPERTY_TYPES),
    bathrooms: seededBetween(`${propertyId}:baths`, 1, 3),
    sizeSqM: seededBetween(`${propertyId}:size`, 28, 140),
    furnishing: seededPick(`${propertyId}:furnish`, FURNISHINGS),
  };
}

// ----------------------------------------------------------------------- chats

export type DemoChat = {
  id: string;
  landlord: string;
  property: string;
  preview: string;
  at: string;
  unread: boolean;
};

export const DEMO_CHATS: DemoChat[] = [
  {
    id: "chat-1",
    landlord: "Bahari Properties",
    property: "2 Bedroom in Mtwapa",
    preview: "Yes, the unit is still available. You can come see it tomorrow after 10am.",
    at: "2026-08-11T07:30:00.000Z",
    unread: true,
  },
  {
    id: "chat-2",
    landlord: "Mnarani Homes",
    property: "Bedsitter in Kilifi Town",
    preview: "Deposit is one month and rent is paid by the 5th.",
    at: "2026-08-09T15:12:00.000Z",
    unread: false,
  },
  {
    id: "chat-3",
    landlord: "Watamu Coast Rentals",
    property: "3 Bedroom in Watamu",
    preview: "Thanks for viewing. Let me know once you decide.",
    at: "2026-08-04T12:00:00.000Z",
    unread: false,
  },
];

// --------------------------------------------------------- the browsing "gate"

/**
 * Copy for the subscription banner. Deliberately phrased as something that will
 * happen rather than something in force, because nothing is charged and every
 * listing is fully browsable today.
 */
export const DEMO_BROWSE_GATE = {
  price: "KSh 20 / day",
  note: "Unlimited browsing is planned as a daily pass. Nothing is charged yet and every listing here is already open to you.",
} as const;
