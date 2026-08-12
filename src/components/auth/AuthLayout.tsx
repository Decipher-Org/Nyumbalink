import type { ReactNode } from "react";
import { Link } from "react-router-dom";

import { Logo } from "@/components/brand/Logo";

/**
 * Chrome for the four auth screens.
 *
 * Deliberately not the marketing shell: no `.marketing` class, so headings stay
 * on Inter per the design sheet, and no site nav — a half-signed-in visitor
 * should be finishing the flow, not browsing away mid-way.
 */
export function AuthLayout({
  title,
  description,
  children,
  footer,
  badge,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  /** e.g. the chosen role pill on the register screen. */
  badge?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border bg-card">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="NyumbaLink home">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:items-center sm:px-6 sm:py-16">
        <div className="w-full max-w-md">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm sm:p-8">
            {badge ? <div className="mb-5 flex justify-center">{badge}</div> : null}
            <h1 className="text-h1 text-foreground">{title}</h1>
            {description ? (
              <p className="mt-2 text-body-sm text-muted-foreground">{description}</p>
            ) : null}
            <div className="mt-6">{children}</div>
          </div>
          {footer ? (
            <div className="mt-5 text-center text-body-sm text-muted-foreground">{footer}</div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
