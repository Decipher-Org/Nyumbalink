import { Bell } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNotifications } from "@/lib/notifications/NotificationProvider";

/**
 * A bell icon button for the app shell header. Shows a red badge with the
 * unread count when > 0. Navigates to the role-appropriate notifications page.
 */
export function NotificationBell({ role }: { role: "LANDLORD" | "TENANT" }) {
  const { unreadCount } = useNotifications();
  const to = role === "LANDLORD" ? "/landlord/notifications" : "/tenant/notifications";

  const label =
    unreadCount > 0
      ? `Notifications, ${unreadCount} unread`
      : "Notifications";

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" asChild>
          <Link to={to} aria-label={label}>
            <Bell className="size-5" />
            {unreadCount > 0 ? (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground"
              >
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            ) : null}
          </Link>
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}
