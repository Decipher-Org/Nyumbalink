import { ArrowRight, Building2, Search } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { signupPath } from "@/lib/search-params";

export function CtaBand() {
  return (
    <section className="bg-primary py-16 sm:py-20">
      <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
        <h2 className="font-serif text-3xl font-semibold text-primary-foreground sm:text-4xl">
          Ready to find your next home?
        </h2>
        <p className="mx-auto mt-4 max-w-2xl text-sm text-primary-foreground/80 sm:text-base">
          Join thousands of Kenyans renting directly — no agent fees, no run-around. Whether you are
          looking for a home or filling one, it starts here.
        </p>

        <div className="mt-8 flex flex-col items-stretch justify-center gap-3 sm:flex-row sm:items-center">
          <Button asChild variant="accent" size="lg">
            <Link to={signupPath("tenant")}>
              <Search />
              Find a home
              <ArrowRight />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
          >
            <Link to={signupPath("landlord")}>
              <Building2 />
              List your property
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
