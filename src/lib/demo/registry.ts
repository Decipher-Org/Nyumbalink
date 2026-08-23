/**
 * The registry of everything in this app that is **not** backed by a real
 * endpoint.
 *
 * The backend is complete through Milestone 5 (auth, profiles, properties, units,
 * payments, subscriptions). The designs cover a good deal more, so those surfaces are
 * built but fed from `lib/demo/` and labelled with `<DemoBadge>`. This file is the
 * index: one entry per fake feature, naming the milestone that replaces it.
 *
 * The rule this enforces: **nothing fake is unlabelled.** A screen that reads
 * from `lib/demo/` must render the badge, and a value that isn't in `lib/demo/`
 * must have come from the API. That makes replacing a mock a one-file change,
 * and makes an audit a `grep` rather than a reading exercise.
 *
 * ## Retiring an entry
 *
 * Delete it from the union **first**, then let `tsc` fail on every `<DemoBadge>` and
 * `<StatCard demo=…>` that still names it. That is what this file is for: the
 * compiler enumerates the surfaces to revisit, so a badge cannot be left behind on a
 * screen that has since become real. `subscriptions` (M5) and `payments` (M4) were
 * removed this way once the backend started serving them.
 */

export type DemoFeatureId =
  | "favorites"
  | "reviews"
  | "views"
  | "messages"
  | "notifications"
  | "amenityFilter"
  | "sorting"
  | "map"
  | "propertySpecs";

export type DemoFeature = {
  label: string;
  /** Which backend milestone makes this real. */
  milestone: string;
  /** Shown in tooltips and banners; plain language, no jargon. */
  note: string;
};

export const DEMO_FEATURES: Record<DemoFeatureId, DemoFeature> = {
  favorites: {
    label: "Favourites",
    milestone: "Milestone 8",
    note: "Saving a property is a preview — favourites are not stored yet, so they reset on reload.",
  },
  reviews: {
    label: "Ratings & reviews",
    milestone: "Milestone 8",
    note: "Sample ratings. Real reviews arrive with the reviews milestone.",
  },
  views: {
    label: "Views & trends",
    milestone: "not yet scheduled",
    note: "Sample figures. The platform does not track listing views yet.",
  },
  messages: {
    label: "Messages",
    milestone: "not on the roadmap",
    note: "Sample conversations. In-app chat is not built — use the landlord's phone number for now.",
  },
  notifications: {
    label: "Notifications",
    milestone: "Milestone 7",
    note: "Sample alerts. No notifications are generated or delivered yet.",
  },
  amenityFilter: {
    label: "Amenity filter",
    milestone: "Milestone 6",
    note: "Amenities are shown on each listing but cannot be filtered on yet.",
  },
  sorting: {
    label: "Sorting",
    milestone: "Milestone 6",
    note: "Sorting is applied to the results already loaded, not across every listing.",
  },
  map: {
    label: "Map view",
    milestone: "Milestone 6",
    note: "Coordinates are stored, but the map and distance search are not built.",
  },
  propertySpecs: {
    label: "Property type, bathrooms, size, furnishing",
    milestone: "needs a schema change",
    note: "These cannot be saved yet — the fields do not exist on a property.",
  },
};
