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

// ---------------------------------------------------------------- payments

export type DemoPayment = {
  id: string;
  date: string;
  description: string;
  method: "M-Pesa" | "Card";
  reference: string;
  amount: number;
  status: "Paid" | "Pending" | "Failed";
};

/** Dates are relative to today so the table never looks stale. */
function daysAgoIso(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

export const DEMO_PAYMENTS: DemoPayment[] = [
  {
    id: "pay-1",
    date: daysAgoIso(3),
    description: "Growth plan — monthly",
    method: "M-Pesa",
    reference: "SJK7HD92LP",
    amount: 2500,
    status: "Paid",
  },
  {
    id: "pay-2",
    date: daysAgoIso(34),
    description: "Growth plan — monthly",
    method: "M-Pesa",
    reference: "SJH2KD81MQ",
    amount: 2500,
    status: "Paid",
  },
  {
    id: "pay-3",
    date: daysAgoIso(38),
    description: "Featured listing — Mtwapa 2 Bedroom",
    method: "Card",
    reference: "CH_4419KAX",
    amount: 800,
    status: "Paid",
  },
  {
    id: "pay-4",
    date: daysAgoIso(65),
    description: "Starter plan — monthly",
    method: "M-Pesa",
    reference: "SJG9WQ04ZR",
    amount: 1000,
    status: "Failed",
  },
];

// ----------------------------------------------------------- subscriptions

export type DemoPlan = {
  id: string;
  name: string;
  price: number;
  cadence: string;
  propertyLimit: string;
  features: string[];
  current?: boolean;
  recommended?: boolean;
};

export const DEMO_PLANS: DemoPlan[] = [
  {
    id: "starter",
    name: "Starter",
    price: 1000,
    cadence: "per month",
    propertyLimit: "Up to 3 properties",
    features: ["Listed in search", "Up to 6 photos per property", "Email support"],
  },
  {
    id: "growth",
    name: "Growth",
    price: 2500,
    cadence: "per month",
    propertyLimit: "Up to 15 properties",
    features: [
      "Everything in Starter",
      "Up to 12 photos per property",
      "Priority placement in search",
      "Listing performance stats",
    ],
    current: true,
    recommended: true,
  },
  {
    id: "portfolio",
    name: "Portfolio",
    price: 6000,
    cadence: "per month",
    propertyLimit: "Unlimited properties",
    features: [
      "Everything in Growth",
      "Featured listings included",
      "Bulk unit management",
      "Phone support",
    ],
  },
];

// ---------------------------------------------------------- notifications

export type DemoNotification = {
  id: string;
  title: string;
  body: string;
  at: string;
  unread: boolean;
  kind: "enquiry" | "payment" | "listing" | "system";
};

export const DEMO_NOTIFICATIONS: DemoNotification[] = [
  {
    id: "n-1",
    title: "New enquiry",
    body: "Someone asked about your 2 Bedroom in Mtwapa.",
    at: daysAgoIso(0),
    unread: true,
    kind: "enquiry",
  },
  {
    id: "n-2",
    title: "Payment received",
    body: "Your Growth plan renewed successfully — KSh 2,500.",
    at: daysAgoIso(3),
    unread: true,
    kind: "payment",
  },
  {
    id: "n-3",
    title: "Listing approved",
    body: "Kilifi Town Bedsitters is now visible in search.",
    at: daysAgoIso(6),
    unread: false,
    kind: "listing",
  },
  {
    id: "n-4",
    title: "Add photos to finish your draft",
    body: "Drafts without photos get far fewer enquiries once published.",
    at: daysAgoIso(11),
    unread: false,
    kind: "system",
  },
];

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
