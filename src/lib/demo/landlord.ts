/**
 * Sample data for the landlord surfaces the backend does not implement yet.
 *
 * Everything here is fake and every screen that reads it renders a `<DemoBadge>`
 * or `<DemoNotice>` — see `lib/demo/registry.ts` for the rule. Nothing in this
 * file is ever written anywhere; a reload regenerates it.
 *
 * The figures are **derived from a seed rather than random**, so a stat card
 * shows the same number on every render and between reloads. `Math.random()`
 * would make the dashboard visibly jitter and would make two screens disagree
 * about the same "fact".
 */

import type { PropertyCard, PropertyStatus } from "@/lib/api/types";
import { seededBetween } from "@/lib/demo/seed";

// ------------------------------------------------------------- dashboard stats

export type DemoLandlordStats = {
  monthlyViews: number;
  favourites: number;
  unreadMessages: number;
};

/**
 * Engagement figures scaled to how much the landlord has actually listed, so an
 * empty account doesn't claim 400 views. Keyed off the property ids, which means
 * publishing a property changes the numbers the way a real counter would.
 */
export function demoLandlordStats(properties: PropertyCard[]): DemoLandlordStats {
  const active = properties.filter((p) => p.status === "ACTIVE");
  if (active.length === 0) {
    return { monthlyViews: 0, favourites: 0, unreadMessages: 0 };
  }

  const key = active
    .map((p) => p.id)
    .sort()
    .join("|");

  return {
    monthlyViews: active.length * seededBetween(`views:${key}`, 34, 190),
    favourites: active.length * seededBetween(`favs:${key}`, 1, 9),
    unreadMessages: seededBetween(`msgs:${key}`, 0, 4),
  };
}

// -------------------------------------------------------------- views trend

export type DemoViewsPoint = { label: string; views: number };

/**
 * Six months of "views", ending with the current month. The shape trends upward
 * because a flat line reads as broken, but the values are seeded off the
 * property set so the chart is stable.
 */
export function demoViewsTrend(properties: PropertyCard[]): DemoViewsPoint[] {
  const active = properties.filter((p) => p.status === "ACTIVE");
  const key = active
    .map((p) => p.id)
    .sort()
    .join("|");

  const now = new Date();
  const points: DemoViewsPoint[] = [];

  for (let back = 5; back >= 0; back -= 1) {
    const month = new Date(now.getFullYear(), now.getMonth() - back, 1);
    const label = month.toLocaleDateString("en-GB", { month: "short" });

    if (active.length === 0) {
      points.push({ label, views: 0 });
      continue;
    }

    // `5 - back` is 0 for the oldest month and 5 for the current one, so the
    // baseline climbs; the seeded term supplies the wobble.
    const growth = 1 + (5 - back) * 0.18;
    const base = active.length * seededBetween(`trend:${key}:${back}`, 26, 120);
    points.push({ label, views: Math.round(base * growth) });
  }

  return points;
}

// ------------------------------------------------------ status chart palette

/**
 * The donut's colours, matched to `<StatusBadge>` so the same status is the same
 * colour wherever it appears. These are the design system's status hexes as CSS
 * variables rather than literals, so a token change moves the chart too.
 */
export const STATUS_CHART_COLORS: Record<PropertyStatus, string> = {
  ACTIVE: "var(--success)",
  DRAFT: "var(--warning)",
  HIDDEN: "var(--inactive)",
  ARCHIVED: "var(--muted-foreground)",
};
