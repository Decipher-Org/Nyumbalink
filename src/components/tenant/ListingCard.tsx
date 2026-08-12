import { Heart, ImageOff, MapPin, Star } from "lucide-react";
import { Link } from "react-router-dom";

import { Badge } from "@/components/ui/badge";
import type { PropertyCard } from "@/lib/api/types";
import { useFavourites } from "@/lib/demo/favourites";
import { demoRating } from "@/lib/demo/tenant";
import { formatLocation, formatRentPerMonth } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * One listing, as a tenant sees it. Shared by Home, Search and Favourites so a
 * property looks identical wherever it appears.
 *
 * ## What is real and what isn't
 *
 * Title, town, estate, image and "from" price are all from `GET /properties`.
 * The rating is seeded sample data (`DEMO_FEATURES.reviews`) and the heart writes
 * to an in-memory store (`DEMO_FEATURES.favorites`) — both carry their own
 * marker, and the card takes `showRating` so a caller can leave the fake number
 * off entirely rather than being forced to display it.
 *
 * No status badge: `GET /properties` returns only `ACTIVE` rows to a tenant, so
 * a status pill on every card would say the same word every time and teach
 * nothing.
 */
export function ListingCard({
  property,
  showRating = true,
  className,
}: {
  property: PropertyCard;
  showRating?: boolean;
  className?: string;
}) {
  const { isSaved, toggle } = useFavourites();
  const saved = isSaved(property.id);
  const rating = demoRating(property.id);
  const cover = property.images[0];

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-xl border border-border bg-card transition-shadow focus-within:ring-2 focus-within:ring-ring/50 hover:shadow-md",
        className,
      )}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden bg-muted">
        {cover ? (
          <img
            src={cover}
            alt=""
            loading="lazy"
            className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex size-full flex-col items-center justify-center gap-1.5 text-muted-foreground">
            <ImageOff aria-hidden="true" className="size-6" />
            <span className="text-caption">No photo yet</span>
          </div>
        )}

        {/* Sits above the card-wide link so it stays clickable. */}
        <button
          type="button"
          onClick={() => toggle(property.id)}
          aria-pressed={saved}
          aria-label={saved ? `Remove ${property.title} from favourites` : `Save ${property.title}`}
          className="absolute top-2.5 right-2.5 z-10 flex size-11 items-center justify-center rounded-full bg-card/90 text-muted-foreground backdrop-blur transition-colors hover:text-destructive-strong focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        >
          <Heart
            aria-hidden="true"
            className={cn("size-5", saved && "fill-destructive-strong text-destructive-strong")}
          />
        </button>
      </div>

      <div className="p-4">
        <div className="flex items-start justify-between gap-2">
          {/* The whole card is the link target; `absolute inset-0` below covers
              it without nesting interactive elements inside an anchor. */}
          <h3 className="text-body font-semibold text-foreground">
            <Link to={`/tenant/properties/${property.id}`} className="hover:underline">
              <span className="absolute inset-0 z-0" aria-hidden="true" />
              <span className="line-clamp-2">{property.title}</span>
            </Link>
          </h3>

          {showRating ? (
            <span
              className="flex shrink-0 items-center gap-1 text-caption text-muted-foreground"
              title="Sample rating — reviews are not built yet"
            >
              <Star aria-hidden="true" className="size-3.5 fill-warning text-warning" />
              <span className="tabular-nums">{rating.score.toFixed(1)}</span>
            </span>
          ) : null}
        </div>

        <p className="mt-1.5 flex items-center gap-1.5 text-body-sm text-muted-foreground">
          <MapPin aria-hidden="true" className="size-3.5 shrink-0" />
          <span className="truncate">
            {formatLocation({ town: property.town, estate: property.estate })}
          </span>
        </p>

        <div className="mt-3 flex items-end justify-between gap-2">
          {property.unitsFrom === null ? (
            // A live listing with no unit types yet has no price to show. Saying
            // so beats "KSh 0", which reads as free.
            <Badge variant="secondary">Price on request</Badge>
          ) : (
            <p className="text-body font-semibold text-primary">
              <span className="text-caption font-normal text-muted-foreground">from </span>
              {formatRentPerMonth(property.unitsFrom)}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}
