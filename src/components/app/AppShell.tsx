import { LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";

import { Logo, LogoMark } from "@/components/brand/Logo";
import type { NavItem } from "@/components/app/nav-config";
import { LANDLORD_NAV, TENANT_NAV } from "@/components/app/nav-config";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/lib/auth/AuthProvider";
import { cn } from "@/lib/utils";

/**
 * The application chrome, shared by both roles.
 *
 * Responsive rule, from the design sheet: a persistent sidebar from `lg` up, and
 * a bottom tab bar below it — the same navigation, not a reduced one. The
 * overflow items a bottom bar cannot hold (five tabs maximum, per the sheet's
 * touch-target sizing) stay reachable through the hamburger sheet, so nothing
 * becomes desktop-only.
 */

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).slice(0, 2);
  const letters = parts.map((part) => part[0]).join("");
  return letters.toUpperCase() || "?";
}

/** A dot rather than a word: the nav is tight, and the screen itself explains. */
function DemoDot() {
  return (
    <span
      aria-label="preview feature"
      title="Preview — sample data"
      className="ml-auto size-1.5 shrink-0 rounded-full bg-warning"
    />
  );
}

function SidebarLink({ item, onNavigate }: { item: NavItem; onNavigate?: () => void }) {
  const { icon: Icon, label, to, demo } = item;

  return (
    <NavLink
      to={to}
      end={to.split("/").length <= 2}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          "flex min-h-11 items-center gap-3 rounded-lg px-3 py-2 text-body-sm font-medium transition-colors",
          isActive
            ? "bg-secondary text-secondary-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )
      }
    >
      <Icon className="size-4.5 shrink-0" />
      <span className="truncate">{label}</span>
      {demo ? <DemoDot /> : null}
    </NavLink>
  );
}

function NavList({ items, onNavigate }: { items: NavItem[]; onNavigate?: () => void }) {
  return (
    <nav className="flex flex-col gap-1">
      {items.map((item) => (
        <SidebarLink key={item.to} item={item} onNavigate={onNavigate} />
      ))}
    </nav>
  );
}

/**
 * Bottom tab bar for small screens. `pb-[env(safe-area-inset-bottom)]` keeps the
 * tabs clear of the iOS home indicator, which would otherwise sit on top of them.
 */
function BottomNav({ items }: { items: NavItem[] }) {
  const tabs = items.filter((item) => item.primary).slice(0, 5);

  return (
    <nav
      aria-label="Main"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-card pb-[env(safe-area-inset-bottom)] lg:hidden"
    >
      <ul className="flex">
        {tabs.map(({ to, label, icon: Icon, demo }) => (
          <li key={to} className="flex-1">
            <NavLink
              to={to}
              end={to.split("/").length <= 2}
              className={({ isActive }) =>
                cn(
                  "relative flex min-h-14 flex-col items-center justify-center gap-1 px-1 py-2 text-caption font-medium transition-colors",
                  isActive ? "text-primary" : "text-muted-foreground",
                )
              }
            >
              <Icon className="size-5" />
              <span className="truncate">{label}</span>
              {demo ? (
                <span
                  aria-hidden="true"
                  className="absolute top-2 right-1/4 size-1.5 rounded-full bg-warning"
                />
              ) : null}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function AppShell({ role }: { role: "LANDLORD" | "TENANT" }) {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [sheetOpen, setSheetOpen] = useState(false);

  const items = role === "LANDLORD" ? LANDLORD_NAV : TENANT_NAV;
  const homePath = role === "LANDLORD" ? "/landlord" : "/tenant";

  async function handleSignOut() {
    await signOut();
    navigate("/", { replace: true });
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="min-h-screen bg-background">
        {/* Sidebar — lg and up. */}
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border bg-card lg:flex">
          <div className="px-5 py-5">
            <Link to={homePath} className="inline-flex" aria-label="NyumbaLink home">
              <Logo />
            </Link>
          </div>
          <div className="flex-1 overflow-y-auto px-3 pb-4">
            <NavList items={items} />
          </div>
          <div className="border-t border-border p-3">
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-muted-foreground hover:text-foreground"
              onClick={handleSignOut}
            >
              <LogOut className="size-4.5" />
              Sign out
            </Button>
          </div>
        </aside>

        <div className="lg:pl-64">
          {/* Top bar — the only navigation affordance below lg besides the tabs. */}
          <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur sm:px-6">
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="lg:hidden"
                  aria-label="Open navigation"
                >
                  <Menu />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0">
                <SheetTitle className="sr-only">Navigation</SheetTitle>
                <div className="px-5 py-5">
                  <Logo />
                </div>
                <div className="px-3 pb-4">
                  <NavList items={items} onNavigate={() => setSheetOpen(false)} />
                </div>
                <div className="mt-auto border-t border-border p-3">
                  <Button
                    variant="ghost"
                    className="w-full justify-start gap-3 text-muted-foreground"
                    onClick={handleSignOut}
                  >
                    <LogOut className="size-4.5" />
                    Sign out
                  </Button>
                </div>
              </SheetContent>
            </Sheet>

            <Link to={homePath} className="lg:hidden" aria-label="NyumbaLink home">
              <LogoMark className="size-8" />
            </Link>

            <div className="ml-auto flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-body-sm font-semibold text-foreground">{user?.name}</p>
                <p className="text-caption text-muted-foreground">
                  {role === "LANDLORD" ? "Landlord" : "Tenant"}
                </p>
              </div>
              <Avatar className="size-9">
                <AvatarImage alt="" />
                <AvatarFallback className="bg-secondary text-body-sm font-semibold text-secondary-foreground">
                  {initialsOf(user?.name ?? "")}
                </AvatarFallback>
              </Avatar>
            </div>
          </header>

          {/* pb-20 keeps the last row clear of the fixed bottom tab bar. */}
          <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-24 sm:px-6 lg:px-8 lg:pb-10">
            <Outlet />
          </main>
        </div>

        <BottomNav items={items} />
      </div>
    </TooltipProvider>
  );
}
