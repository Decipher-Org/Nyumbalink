import { Link } from "react-router-dom";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";

type StubPageProps = {
  title: string;
  body: string;
  /** Optional monospace detail, e.g. the query the page would run. */
  detail?: string;
};

/**
 * Shared placeholder for routes that header and CTA links point at but whose
 * flows are not built yet — keeps every link on the landing page live rather
 * than dead-ending on a 404.
 */
export function StubPage({ title, body, detail }: StubPageProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b border-border">
        <div className="mx-auto flex h-16 max-w-6xl items-center px-4 sm:px-6 lg:px-8">
          <Link to="/" aria-label="NyumbaLink home">
            <Logo />
          </Link>
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center px-4 py-16 sm:px-6">
        <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center">
          <h1 className="font-serif text-2xl font-semibold">{title}</h1>
          <p className="mt-3 text-sm text-muted-foreground">{body}</p>
          {detail && (
            <p className="mt-4 rounded-lg bg-mint px-3 py-2 font-mono text-xs break-all text-primary">
              {detail}
            </p>
          )}
          <Button asChild className="mt-8 w-full">
            <Link to="/">Back to home</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
