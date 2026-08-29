/**
 * Landlord notifications — live data from the Milestone 7 backend.
 *
 * This replaces the demo-data page. All rendering logic lives in the shared
 * `NotificationList` component — this file is just the route entry point.
 */

import NotificationList from "@/components/app/NotificationList";

export default function LandlordNotifications() {
  return <NotificationList />;
}
