import { Menu, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { HEADER_LINKS } from "@/lib/content/nav";
import { loginPath, signupPath } from "@/lib/search-params";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <Link to="/" aria-label="NyumbaLink home" className="shrink-0">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-8 md:flex">
          {HEADER_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-sm font-medium text-foreground/80 transition-colors hover:text-primary"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link to={loginPath()}>Log in</Link>
          </Button>
          <Button asChild variant="accent" size="sm">
            <Link to={signupPath("tenant")}>
              <Search />
              Find a home
            </Link>
          </Button>
        </div>

        <Button
          variant="outline"
          size="icon"
          className="md:hidden"
          aria-expanded={mobileOpen}
          aria-controls="mobile-nav"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((open) => !open)}
        >
          <Menu />
        </Button>
      </div>

      <div
        id="mobile-nav"
        hidden={!mobileOpen}
        className={cn("border-t border-border/60 bg-background md:hidden")}
      >
        <nav aria-label="Main" className="mx-auto flex max-w-7xl flex-col gap-1 px-4 py-4 sm:px-6">
          {HEADER_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              onClick={() => setMobileOpen(false)}
              className="rounded-md px-2 py-2.5 text-sm font-medium text-foreground/80 transition-colors hover:bg-secondary hover:text-primary"
            >
              {link.label}
            </a>
          ))}
          <div className="mt-3 flex flex-col gap-2">
            <Button asChild variant="outline">
              <Link to={loginPath()} onClick={() => setMobileOpen(false)}>
                Log in
              </Link>
            </Button>
            <Button asChild variant="accent">
              <Link to={signupPath("tenant")} onClick={() => setMobileOpen(false)}>
                <Search />
                Find a home
              </Link>
            </Button>
          </div>
        </nav>
      </div>
    </header>
  );
}
