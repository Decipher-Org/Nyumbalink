/**
 * Display formatters shared by the dashboards.
 *
 * `formatKes` lives in `lib/content/pricing.ts` and is re-exported here so the
 * app has one import site for formatting, without moving a function the landing
 * page already depends on.
 */

export { formatKes } from "@/lib/content/pricing";

/** Rent with its unit, the way every listing states it. */
export function formatRent(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "Rent not set";
  return `KSh ${new Intl.NumberFormat("en-KE").format(amount)}`;
}

export function formatRentPerMonth(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "Rent not set";
  return `${formatRent(amount)}/mo`;
}

/** Compact absolute date — "12 Aug 2026". Avoids locale-ambiguous 08/12. */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/**
 * "3 days ago". Falls back to an absolute date past a month, where a relative
 * figure stops being easier to read than the date itself.
 */
export function formatRelative(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;

  const days = Math.round(hours / 24);
  if (days < 31) return `${days} ${days === 1 ? "day" : "days"} ago`;

  return formatDate(value);
}

/** "Mtwapa, Kilifi" — estate included only when the backend has one. */
export function formatLocation(parts: {
  estate?: string | null;
  town?: string | null;
  county?: string | null;
}): string {
  return [parts.estate, parts.town, parts.county].filter(Boolean).join(", ");
}

/** Amenities are stored lowercase; titlecase them for display. */
export function formatAmenity(value: string): string {
  if (value.toLowerCase() === "wifi") return "WiFi";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
