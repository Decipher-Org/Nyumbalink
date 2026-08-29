/**
 * Tenant notifications — live data from the Milestone 7 backend.
 *
 * Identical to the landlord's version: the backend serves notifications
 * role-agnostically (scoped to `userId`), and the shared `NotificationList`
 * component already maps each `NotificationType` to its icon.
 */

import NotificationList from "@/components/app/NotificationList";

export default function TenantNotifications() {
  return <NotificationList />;
}
