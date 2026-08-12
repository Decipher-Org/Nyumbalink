import {
  ArrowLeft,
  BadgeCheck,
  Bath,
  BedDouble,
  Building2,
  Heart,
  ImageOff,
  MapPin,
  MessageSquare,
  Phone,
  Ruler,
  Sofa,
  Star,
} from "lucide-react";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import { DemoBadge } from "@/components/app/DemoBadge";
import { EmptyState, ErrorState } from "@/components/app/States";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api/client";
import { getProperty } from "@/lib/api/properties";
import type { Unit } from "@/lib/api/types";
import { useFavourites } from "@/lib/demo/favourites";
import { demoRating, demoReviews, demoSpecs } from "@/lib/demo/tenant";
import { formatAmenity, formatDate, formatKes, formatLocation, formatRentPerMonth } from "@/lib/format";
import { useAsync } from "@/lib/hooks/use-async";
import { cn } from "@/lib/utils";

/**
 * One listing in full.
 *
 * ## Real
 *
 * Title, description, town, estate, every image, and each unit type with its
 * rent, deposit, amenities and live vacancy count — all from
 * `GET /properties/:id`. The landlord card too, from the embedded `landlord`
 * object.
 *
 * ## Not real, and marked
 *
 * The rating and review list are seeded (Milestone 8). Property type, bathrooms,
 * size and furnishing do not exist on the `Property` model at all, so they are
 * seeded and sit behind a single shared marker rather than being scattered as
 * four separate fake facts. In-app messaging is not on the roadmap, so the
 * Message button is inert — but **Call is real**, because `mpesaNumber` is a
 * genuine phone number the landlord supplied.
 *
 * ## The 403 matters here
 *
 * A listing can be hidden or archived between the search results being rendered
 * and this page being opened, and the backend answers `403 PROPERTY_HIDDEN`
 * rather than a 404. Treating that as a generic failure would tell a tenant
 * "something went wrong" when the truthful answer is "this one is no longer
 * listed", so it gets its own branch.
 */
export default function TenantPropertyDetails() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { isSaved, toggle } = useFavourites();

  const property = useAsync(
    (signal) => getProperty(propertyId ?? "", signal),
    [propertyId],
  );

  if (property.loading) {
    return <DetailSkeleton />;
  }

  if (property.error) {
    const err = property.error;
    const gone =
      err instanceof ApiError && (err.code === "PROPERTY_HIDDEN" || err.code === "PROPERTY_NOT_FOUND");

    if (gone) {
      return (
        <div className="mx-auto max-w-xl">
          <EmptyState
            icon={Building2}
            title="This listing isn't available"
            body="It may have been rented out or taken down. There are other homes in Kilifi to look at."
            action={
              <Button asChild>
                <Link to="/tenant/search">Back to search</Link>
              </Button>
            }
          />
        </div>
      );
    }

    return <ErrorState error={err} onRetry={property.reload} />;
  }

  const data = property.data;
  if (!data) return null;

  const saved = isSaved(data.id);
  const rating = demoRating(data.id);
  const reviews = demoReviews(data.id);
  const specs = demoSpecs(data.id);
  const landlordName = data.landlord?.businessName?.trim() || "Private landlord";
  const cheapest = data.units.reduce<number | null>(
    (low, unit) => (low === null || unit.rent < low ? unit.rent : low),
    null,
  );
  const vacantTypes = data.units.filter((unit) => unit.vacancy).length;

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/tenant/search">
          <ArrowLeft />
          Back to search
        </Link>
      </Button>

      <Gallery images={data.images} title={data.title} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h1 className="text-h1 text-foreground">{data.title}</h1>
                <p className="mt-1.5 flex items-center gap-1.5 text-body text-muted-foreground">
                  <MapPin aria-hidden="true" className="size-4 shrink-0" />
                  {formatLocation({
                    estate: data.estate,
                    town: data.town,
                    county: data.county,
                  })}
                </p>
              </div>

              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => toggle(data.id)}
                aria-pressed={saved}
                aria-label={saved ? "Remove from favourites" : "Save this listing"}
                className="shrink-0"
              >
                <Heart
                  className={cn(saved && "fill-destructive-strong text-destructive-strong")}
                />
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              {cheapest !== null ? (
                <p className="text-h2 text-primary">
                  <span className="text-body font-normal text-muted-foreground">from </span>
                  {formatRentPerMonth(cheapest)}
                </p>
              ) : (
                <Badge variant="secondary">Price on request</Badge>
              )}

              <span className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
                <Star aria-hidden="true" className="size-4 fill-warning text-warning" />
                <span className="tabular-nums">{rating.score.toFixed(1)}</span>
                <span>({rating.count})</span>
                <DemoBadge feature="reviews" />
              </span>
            </div>
          </section>

          {/* One marker for the whole row rather than four scattered badges: every
              value in it comes from the same missing-schema gap. */}
          <section className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h3 text-foreground">At a glance</h2>
              <DemoBadge feature="propertySpecs" />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <SpecItem icon={Building2} label="Type" value={specs.propertyType} />
              <SpecItem icon={Bath} label="Bathrooms" value={String(specs.bathrooms)} />
              <SpecItem icon={Ruler} label="Size" value={`${specs.sizeSqM} m²`} />
              <SpecItem icon={Sofa} label="Furnishing" value={specs.furnishing} />
            </dl>
            <p className="mt-4 text-caption text-muted-foreground">
              These four aren’t stored on a listing yet, so the figures above are samples. The
              rent, deposit and availability below are real.
            </p>
          </section>

          {data.description ? (
            <section>
              <h2 className="text-h3 text-foreground">About this place</h2>
              <p className="mt-2 text-body whitespace-pre-line text-muted-foreground">
                {data.description}
              </p>
            </section>
          ) : null}

          <section>
            <div className="flex items-end justify-between gap-3">
              <h2 className="text-h3 text-foreground">
                {data.units.length === 1 ? "Unit" : "Units"} available
              </h2>
              {data.units.length > 0 ? (
                <p className="text-body-sm text-muted-foreground">
                  {vacantTypes} of {data.units.length} with vacancies
                </p>
              ) : null}
            </div>

            {data.units.length === 0 ? (
              <EmptyState
                className="mt-3"
                icon={BedDouble}
                title="No unit types listed yet"
                body="The landlord hasn't added rents for this property. Get in touch using the details on the right."
              />
            ) : (
              <ul className="mt-3 space-y-3">
                {data.units.map((unit) => (
                  <UnitRow key={unit.id} unit={unit} />
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-h3 text-foreground">Reviews</h2>
              <DemoBadge feature="reviews" showLabel />
            </div>
            <ul className="mt-3 space-y-3">
              {reviews.map((review) => (
                <li key={review.id} className="rounded-xl border border-border bg-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-body font-semibold text-foreground">{review.author}</p>
                    <span className="flex shrink-0 items-center gap-1 text-caption text-muted-foreground">
                      {/* Number as well as stars: the count is the fact, the
                          stars are decoration. */}
                      <Star aria-hidden="true" className="size-3.5 fill-warning text-warning" />
                      <span className="tabular-nums">{review.rating}.0</span>
                    </span>
                  </div>
                  <p className="mt-1 text-caption text-muted-foreground">
                    {formatDate(review.at)}
                  </p>
                  <p className="mt-2 text-body-sm text-muted-foreground">{review.body}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>

        {/* Landlord card. Sticky from lg up so the contact details stay reachable
            while reading a long description. */}
        <aside className="lg:col-span-1">
          <div className="space-y-4 rounded-xl border border-border bg-card p-5 lg:sticky lg:top-22">
            <div className="flex items-center gap-3">
              <Avatar className="size-12">
                <AvatarImage src={data.landlord?.profilePhoto ?? undefined} alt="" />
                <AvatarFallback className="bg-secondary text-secondary-foreground">
                  {landlordName.charAt(0).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-body font-semibold text-foreground">{landlordName}</p>
                {data.landlord?.verified ? (
                  <span className="mt-0.5 inline-flex items-center gap-1 text-caption font-medium text-success-strong">
                    <BadgeCheck aria-hidden="true" className="size-3.5" />
                    ID verified
                  </span>
                ) : (
                  <span className="text-caption text-muted-foreground">Not yet verified</span>
                )}
              </div>
            </div>

            <Separator />

            {data.landlord?.mpesaNumber ? (
              <>
                <Button asChild className="w-full">
                  {/* Real: the number the landlord gave us. */}
                  <a href={`tel:${data.landlord.mpesaNumber}`}>
                    <Phone />
                    Call {data.landlord.mpesaNumber}
                  </a>
                </Button>
                <p className="text-caption text-muted-foreground">
                  Calling is the quickest way to arrange a viewing.
                </p>
              </>
            ) : (
              <p className="text-body-sm text-muted-foreground">
                This landlord hasn’t added a phone number yet.
              </p>
            )}

            <div className="space-y-2">
              <Button type="button" variant="outline" className="w-full" disabled>
                <MessageSquare />
                Message landlord
              </Button>
              <p className="flex items-start gap-1.5 text-caption text-muted-foreground">
                <DemoBadge feature="messages" />
                <span>In-app chat isn’t built — use the number above.</span>
              </p>
            </div>

            <Separator />

            <p className="text-caption text-muted-foreground">
              Listed {formatDate(data.createdAt)}
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}

function SpecItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Bath;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <dt className="text-caption text-muted-foreground">{label}</dt>
        <dd className="truncate text-body-sm font-medium text-foreground">{value}</dd>
      </div>
    </div>
  );
}

/**
 * A unit type. `vacancy` is derived server-side from `availableUnits > 0` and is
 * never stored, so the count is the fact and the label follows from it — the
 * status carries an icon-free but worded badge rather than colour alone.
 */
function UnitRow({ unit }: { unit: Unit }) {
  return (
    <li className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-body font-semibold text-foreground">{unit.unitType}</p>
          <p className="mt-0.5 text-body-sm text-muted-foreground">
            {formatRentPerMonth(unit.rent)}
            {unit.deposit ? ` · ${formatKes(unit.deposit)} deposit` : ""}
          </p>
        </div>

        {unit.vacancy ? (
          <Badge className="shrink-0 border-transparent bg-success-soft text-success-strong">
            {unit.availableUnits} of {unit.totalUnits} vacant
          </Badge>
        ) : (
          <Badge className="shrink-0 border-transparent bg-inactive-soft text-inactive-strong">
            Fully occupied
          </Badge>
        )}
      </div>

      {unit.amenities && unit.amenities.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-1.5">
          {unit.amenities.map((amenity) => (
            <li
              key={amenity}
              className="rounded-full bg-muted px-2.5 py-0.5 text-caption text-muted-foreground"
            >
              {formatAmenity(amenity)}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

/**
 * Image gallery: one large frame plus thumbnails.
 *
 * The backend caps a set at 12 and may store none at all, so the empty case is a
 * real state rather than a defensive branch.
 */
function Gallery({ images, title }: { images: string[]; title: string }) {
  const [active, setActive] = useState(0);

  if (images.length === 0) {
    return (
      <div className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-xl border border-border bg-muted text-muted-foreground">
        <ImageOff aria-hidden="true" className="size-8" />
        <p className="text-body-sm">No photos for this listing yet</p>
      </div>
    );
  }

  const current = Math.min(active, images.length - 1);

  return (
    <div className="space-y-2">
      <div className="relative aspect-[16/9] w-full overflow-hidden rounded-xl bg-muted">
        <img
          src={images[current]}
          alt={`${title} — photo ${current + 1} of ${images.length}`}
          className="size-full object-cover"
        />
        {images.length > 1 ? (
          <span className="absolute right-3 bottom-3 rounded-full bg-foreground/75 px-2.5 py-1 text-caption font-medium text-background">
            {current + 1} / {images.length}
          </span>
        ) : null}
      </div>

      {images.length > 1 ? (
        <ul className="flex gap-2 overflow-x-auto pb-1">
          {images.map((src, index) => (
            <li key={src} className="shrink-0">
              <button
                type="button"
                onClick={() => setActive(index)}
                aria-label={`Show photo ${index + 1}`}
                aria-current={index === current}
                className={cn(
                  "size-16 overflow-hidden rounded-lg border-2 transition-colors sm:size-20",
                  index === current ? "border-primary" : "border-transparent hover:border-border",
                )}
              >
                <img src={src} alt="" loading="lazy" className="size-full object-cover" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="aspect-[16/9] w-full rounded-xl" />
      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-28 w-full rounded-xl" />
          <Skeleton className="h-20 w-full rounded-xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  );
}
