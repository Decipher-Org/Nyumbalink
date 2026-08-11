import { Building2, MapPin, Search, Wallet } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COUNTY_OPTIONS, POPULAR_SEARCHES, PRICE_BRACKETS } from "@/lib/content/locations";
import { browsePath, signupPath } from "@/lib/search-params";

export function Hero() {
  const navigate = useNavigate();
  const [county, setCounty] = useState<string>("");
  const [priceBracketId, setPriceBracketId] = useState<string>("");

  /**
   * Browsing needs a session, so a visitor's criteria ride along in `next` and
   * are applied to /browse once they have an account.
   */
  function runSearch(nextCounty: string = county) {
    const destination = browsePath({ county: nextCounty || undefined, priceBracketId: priceBracketId || undefined });
    navigate(signupPath("tenant", destination));
  }

  return (
    <section className="relative isolate overflow-hidden">
      {/* Placeholder hero image; swap for real photography when available. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,#0f5132_0%,#177049_45%,#3f9c6b_100%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_78%_28%,rgba(255,255,255,0.35),transparent_55%)]"
      />
      <div
        aria-hidden="true"
        className="absolute inset-y-0 right-0 -z-10 hidden w-1/2 bg-[radial-gradient(circle_at_60%_45%,rgba(240,120,60,0.35),transparent_60%)] lg:block"
      />

      <div className="mx-auto w-full max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-24">
        <div className="max-w-xl">
          <h1 className="font-serif text-4xl leading-tight font-semibold text-white sm:text-5xl lg:text-6xl">
            Find your next home with ease
          </h1>
          <p className="mt-5 text-base leading-relaxed text-white/85 sm:text-lg">
            NyumbaLink connects tenants and landlords across Kenya. Verified listings, updated
            daily. Connect directly with landlords you trust.
          </p>
        </div>

        <div className="mt-9 max-w-3xl rounded-2xl bg-card p-4 shadow-xl ring-1 ring-black/5 sm:p-5">
          <form
            onSubmit={(event) => {
              event.preventDefault();
              runSearch();
            }}
            className="flex flex-col gap-3 sm:flex-row sm:items-end"
          >
            <div className="flex-1">
              <label
                htmlFor="hero-county"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Where do you want to live?
              </label>
              <div className="relative">
                <MapPin
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-primary"
                />
                <Select value={county} onValueChange={setCounty}>
                  <SelectTrigger id="hero-county" className="w-full pl-9">
                    <SelectValue placeholder="County, town or area" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTY_OPTIONS.map((option) => (
                      <SelectItem key={option} value={option}>
                        {option}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex-1">
              <label
                htmlFor="hero-price"
                className="mb-1.5 block text-xs font-medium text-muted-foreground"
              >
                Price range (KES / month)
              </label>
              <div className="relative">
                <Wallet
                  aria-hidden="true"
                  className="pointer-events-none absolute top-1/2 left-3 z-10 size-4 -translate-y-1/2 text-primary"
                />
                <Select value={priceBracketId} onValueChange={setPriceBracketId}>
                  <SelectTrigger id="hero-price" className="w-full pl-9">
                    <SelectValue placeholder="Min – Max" />
                  </SelectTrigger>
                  <SelectContent>
                    {PRICE_BRACKETS.map((bracket) => (
                      <SelectItem key={bracket.id} value={bracket.id}>
                        {bracket.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button type="submit" size="lg" className="sm:w-auto">
              <Search />
              Search homes
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-muted-foreground">Popular searches:</span>
            {POPULAR_SEARCHES.map((place) => (
              <button
                key={place}
                type="button"
                onClick={() => {
                  setCounty(place);
                  runSearch(place);
                }}
                className="rounded-full bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-primary hover:text-primary-foreground"
              >
                {place}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5 flex max-w-2xl flex-col gap-3 rounded-xl bg-card/95 p-4 shadow-lg ring-1 ring-black/5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-secondary text-primary">
              <Building2 className="size-4.5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-foreground">Have a property to rent out?</p>
              <p className="text-xs text-muted-foreground">
                List it on NyumbaLink and reach thousands of verified tenants.
              </p>
            </div>
          </div>
          <Button asChild variant="outlineAccent" className="shrink-0">
            <Link to={signupPath("landlord")}>List your property</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
