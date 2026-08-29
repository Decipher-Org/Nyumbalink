/**
 * Shared notification list used by both the landlord and tenant notification
 * pages. The backend serves notifications role-agnostically (scoped to
 * `userId`), so the only difference is the icon mapping per notification type.
 */

import {
  Bell,
  BellOff,
  CreditCard,
  Eye,
  Home,
  Info,
  ShieldAlert,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

import { PageHeader } from "@/components/app/PageHeader";
import { PushNotificationControl } from "@/components/app/PushNotificationControl";
import { EmptyState, ErrorState, RowSkeleton } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import * as notificationsApi from "@/lib/api/notifications";
import type { Notification, NotificationType } from "@/lib/api/types";
import { formatRelative } from "@/lib/format";
import { useAsync } from "@/lib/hooks/use-async";
import { useNotifications } from "@/lib/notifications/NotificationProvider";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------- icon map

type IconConfig = { icon: typeof Bell; className: string };

const TYPE_ICONS: Record<NotificationType, IconConfig> = {
  PAYMENT_SUCCESS: {
    icon: CreditCard,
    className: "bg-success-soft text-success-strong",
  },
  SUBSCRIPTION_EXPIRING: {
    icon: ShieldAlert,
    className: "bg-warning-soft text-warning-strong",
  },
  PROPERTY_HIDDEN: { icon: Home, className: "bg-secondary text-primary" },
  PROPERTY_VIEWED: { icon: Eye, className: "bg-info-soft text-info-strong" },
  NEW_MATCHING_PROPERTY: {
    icon: Sparkles,
    className: "bg-info-soft text-info-strong",
  },
  SYSTEM_ALERT: { icon: Info, className: "bg-secondary text-primary" },
};

function iconFor(type: NotificationType): IconConfig {
  return TYPE_ICONS[type] ?? TYPE_ICONS.SYSTEM_ALERT;
}

// ---------------------------------------------------------------- component

export default function NotificationList() {
  const { refreshUnreadCount, unreadCount: totalUnreadCount } = useNotifications();
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [page, setPage] = useState(1);
  const limit = 20;

  const { data, error, loading, reload, setData } = useAsync(
    (signal) =>
      notificationsApi.listNotifications({ unreadOnly, page, limit }, signal),
    [unreadOnly, page],
  );

  const items = data?.items ?? [];
  const pagination = data?.pagination;
  const pageUnreadCount = items.filter((n) => !n.isRead).length;

  // ---- mutations

  async function handleMarkAsRead(id: string) {
    try {
      const updated = await notificationsApi.markAsRead(id);
      // Optimistic update — swap the item in place.
      setData((prev) => {
        const current = prev ?? { items: [] };
        return {
          ...current,
          items: current.items.map((n) => (n.id === updated.id ? updated : n)),
        };
      });
      refreshUnreadCount();
    } catch {
      // Fall back to a full reload on error.
      reload();
    }
  }

  async function handleMarkAllAsRead() {
    try {
      await notificationsApi.markAllAsRead();
      // Mark every item in the current page as read.
      setData((prev) => {
        const current = prev ?? { items: [] };
        return {
          ...current,
          items: current.items.map((n) => ({
            ...n,
            isRead: true,
            readAt: n.readAt ?? new Date().toISOString(),
          })),
        };
      });
      refreshUnreadCount();
    } catch {
      reload();
    }
  }

  // ---- render

  return (
    <>
      <PageHeader
        title="Notifications"
        description={
          loading
            ? "Loading…"
            : items.length === 0
              ? "You're all caught up."
            : pageUnreadCount === 0
                ? `${items.length} notifications.`
                : `${pageUnreadCount} unread of ${items.length}.`
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <PushNotificationControl />
            <Button
              type="button"
              variant={unreadOnly ? "default" : "outline"}
              size="sm"
              onClick={() => {
                setUnreadOnly((prev) => !prev);
                setPage(1);
              }}
            >
              {unreadOnly ? "Show all" : "Unread only"}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={totalUnreadCount === 0 || loading}
              onClick={handleMarkAllAsRead}
            >
              <BellOff className="size-4" />
              Mark all as read
            </Button>
          </div>
        }
      />

      {loading && !data ? (
        <div className="mt-4 space-y-3">
          {Array.from({ length: 4 }, (_, i) => (
            <RowSkeleton key={i} columns={3} />
          ))}
        </div>
      ) : error ? (
        <ErrorState error={error} onRetry={reload} className="mt-4" />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nothing here"
          body={
            unreadOnly
              ? 'No unread notifications. Switch to "Show all" to see previous alerts.'
              : "Alerts about payments, subscriptions and your listings will land here."
          }
          className="mt-4"
        />
      ) : (
        <>
          <ul className="mt-4 space-y-3">
            {items.map((item) => (
              <NotificationRow
                key={item.id}
                item={item}
                onMarkAsRead={handleMarkAsRead}
              />
            ))}
          </ul>

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-body-sm text-muted-foreground">
                Page {page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </>
      )}
    </>
  );
}

// ---------------------------------------------------------------- row

function NotificationRow({
  item,
  onMarkAsRead,
}: {
  item: Notification;
  onMarkAsRead: (id: string) => void;
}) {
  const { icon: Icon, className } = iconFor(item.type);

  return (
    <li
      className={cn(
        "flex items-start gap-3 rounded-xl border bg-card p-4",
        item.isRead ? "border-border" : "border-primary/30",
      )}
    >
      <span
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-lg",
          className,
        )}
      >
        <Icon aria-hidden="true" className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-3">
          <p className="text-body font-semibold text-foreground">
            {item.title}
            {!item.isRead ? (
              <>
                {" "}
                <span className="align-middle text-caption font-semibold text-primary">
                  • New
                </span>
              </>
            ) : null}
          </p>
          <span className="shrink-0 text-caption text-muted-foreground">
            {formatRelative(item.createdAt)}
          </span>
        </div>
        <p className="mt-0.5 text-body-sm text-muted-foreground">{item.body}</p>

        {!item.isRead ? (
          <div className="mt-2.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="-ml-2 h-8"
              onClick={() => onMarkAsRead(item.id)}
            >
              Mark as read
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
