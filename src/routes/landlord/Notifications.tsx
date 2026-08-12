import { Bell, BellOff, CreditCard, Home, Info, MessageSquare } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { DemoNotice } from "@/components/app/DemoBadge";
import { PageHeader } from "@/components/app/PageHeader";
import { EmptyState } from "@/components/app/States";
import { Button } from "@/components/ui/button";
import { DEMO_NOTIFICATIONS, type DemoNotification } from "@/lib/demo/landlord";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Notifications — entirely sample data.
 *
 * Nothing generates a notification yet (Milestone 7), so this list is fixed and
 * "mark as read" only changes local state: a reload brings the unread dots back.
 * That is stated on the screen rather than hidden, because a read state that
 * silently resets looks like a bug.
 */

const KINDS: Record<DemoNotification["kind"], { icon: typeof Bell; className: string }> = {
  enquiry: { icon: MessageSquare, className: "bg-info-soft text-info-strong" },
  payment: { icon: CreditCard, className: "bg-success-soft text-success-strong" },
  listing: { icon: Home, className: "bg-secondary text-primary" },
  system: { icon: Info, className: "bg-warning-soft text-warning-strong" },
};

export default function LandlordNotifications() {
  const [items, setItems] = useState(DEMO_NOTIFICATIONS);
  const unread = items.filter((item) => item.unread).length;

  function markAllRead() {
    setItems((prev) => prev.map((item) => ({ ...item, unread: false })));
  }

  function toggleRead(id: string) {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, unread: !item.unread } : item)),
    );
  }

  return (
    <>
      <PageHeader
        title="Notifications"
        description={
          unread === 0 ? "You're all caught up." : `${unread} unread of ${items.length}.`
        }
        actions={
          <Button type="button" variant="outline" disabled={unread === 0} onClick={markAllRead}>
            <BellOff />
            Mark all as read
          </Button>
        }
      />

      <DemoNotice feature="notifications" className="mb-6" />

      {items.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="Nothing here"
          body="Alerts about enquiries, payments and your listings will land here."
        />
      ) : (
        <ul className="space-y-3">
          {items.map((item) => {
            const { icon: Icon, className } = KINDS[item.kind];
            return (
              <li
                key={item.id}
                className={cn(
                  "flex items-start gap-3 rounded-xl border bg-card p-4",
                  item.unread ? "border-primary/30" : "border-border",
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
                      {item.unread ? (
                        <>
                          {" "}
                          {/* Text, not a bare dot: a colour-only unread marker is
                              invisible to a screen reader and to anyone who can't
                              see the hue. */}
                          <span className="align-middle text-caption font-semibold text-primary">
                            • New
                          </span>
                        </>
                      ) : null}
                    </p>
                    <span className="shrink-0 text-caption text-muted-foreground">
                      {formatRelative(item.at)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-body-sm text-muted-foreground">{item.body}</p>

                  <div className="mt-2.5">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="-ml-2 h-8"
                      onClick={() => toggleRead(item.id)}
                    >
                      {item.unread ? "Mark as read" : "Mark as unread"}
                    </Button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <p className="mt-6 text-body-sm text-muted-foreground">
        Which alerts you'd get, and where, is set under{" "}
        <Link to="/landlord/settings" className="text-primary underline-offset-4 hover:underline">
          Settings
        </Link>
        .
      </p>
    </>
  );
}
