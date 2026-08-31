/**
 * Application navigation, per role.
 *
 * `demo` marks a destination whose screen is sample data — the shell renders a
 * small dot on those items so the nav itself is honest about what works, rather
 * than the user finding out after the click.
 */

import {
  Bell,
  Building2,
  CreditCard,
  Heart,
  Home,
  LayoutDashboard,
  MessageSquare,
  Search,
  Settings,
  User,
  Wallet,
} from "lucide-react";
import type { ComponentType } from "react";

import type { DemoFeatureId } from "@/lib/demo/registry";

export type NavItem = {
  to: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  /** Present when the destination is sample data. */
  demo?: DemoFeatureId;
  /** Shown in the bottom bar on small screens. Keep this list to five. */
  primary?: boolean;
};

export const LANDLORD_NAV: NavItem[] = [
  { to: "/landlord", label: "Dashboard", icon: LayoutDashboard, primary: true },
  {
    to: "/landlord/properties",
    label: "Properties",
    icon: Building2,
    primary: true,
  },
  { to: "/landlord/units", label: "Units", icon: Home, primary: true },
  { to: "/landlord/subscriptions", label: "Subscription", icon: Wallet },
  { to: "/landlord/payments", label: "Payments", icon: CreditCard },
  {
    to: "/landlord/notifications",
    label: "Notifications",
    icon: Bell,
    primary: true,
  },
  { to: "/landlord/profile", label: "Profile", icon: User, primary: true },
  { to: "/landlord/settings", label: "Settings", icon: Settings },
];

export const TENANT_NAV: NavItem[] = [
  { to: "/tenant", label: "Home", icon: Home, primary: true },
  { to: "/tenant/search", label: "Search", icon: Search, primary: true },
  { to: "/tenant/favorites", label: "Favourites", icon: Heart, primary: true },
  {
    to: "/tenant/chats",
    label: "Chats",
    icon: MessageSquare,
    demo: "messages",
    primary: true,
  },
  { to: "/tenant/notifications", label: "Notifications", icon: Bell },
  { to: "/tenant/profile", label: "Profile", icon: User, primary: true },
];
