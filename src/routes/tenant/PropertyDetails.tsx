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
  Trash2,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { toast } from "sonner";

import { DemoBadge } from "@/components/app/DemoBadge";
import { EmptyState, ErrorState } from "@/components/app/States";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { ApiError } from "@/lib/api/client";
import { getProperty } from "@/lib/api/properties";
import { createReview, deleteReview, listReviews } from "@/lib/api/reviews";
import type { Review, Unit } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";
import { demoSpecs } from "@/lib/demo/tenant";
import { useFavorites } from "@/lib/favorites/FavoritesProvider";
import { formatAmenity, formatDate, formatKes, formatLocation, formatRentPerMonth } from "@/lib/format";
import { useAsync } from "@/lib/hooks/use-async";
import { cn } from "@/lib/utils";

export default function TenantPropertyDetails() {
  const { propertyId } = useParams<{ propertyId: string }>();
  const { user } = useAuth();
  const { isSaved, toggle, isPending } = useFavorites();
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewItems, setReviewItems] = useState<Review[]>([]);

  const property = useAsync(
    (signal) => getProperty(propertyId ?? "", signal),
    [propertyId],
  );

  const reviews = useAsync(
    (signal) =>
      listReviews(
        propertyId ?? "",
        { page: reviewPage, limit: 20 },
        signal,
      ),
    [propertyId, reviewPage],
  );

  useEffect(() => {
    setReviewPage(1);
    setReviewItems([]);
  }, [propertyId]);

  useEffect(() => {
    if (!reviews.data) return;
    const responsePage = reviews.data.pagination?.page ?? 1;
    setReviewItems((previous) => {
      if (responsePage === 1) return reviews.data?.items ?? [];
      const byId = new Map(previous.map((review) => [review.id, review]));
      for (const review of reviews.data?.items ?? []) byId.set(review.id, review);
      return Array.from(byId.values());
    });
  }, [reviews.data]);

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
            body="It may have been rented out or taken down. There are other homes to look at."
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
  const favoritePending = isPending(data.id);
  const specs = demoSpecs(data.id);
  const landlordName = data.landlord?.businessName?.trim() || "Private landlord";
  const cheapest = data.units.reduce<number | null>(
    (low, unit) => (low === null || unit.rent < low ? unit.rent : low),
    null,
  );
  const vacantTypes = data.units.filter((unit) => unit.vacancy).length;
  const averageRating = reviews.data?.meta?.averageRating ?? data.averageRating;
  const totalReviews = reviews.data?.meta?.totalReviews ?? data.totalReviews ?? reviewItems.length;
  const reviewPagination = reviews.data?.pagination;
  const hasMoreReviews = Boolean(
    reviewPagination && reviewPagination.page < reviewPagination.totalPages,
  );

  const refreshReviews = () => {
    setReviewItems([]);
    if (reviewPage === 1) reviews.reload();
    else setReviewPage(1);
  };

  const handleReviewAdded = () => {
    refreshReviews();
    void property.reload();
  };

  const handleReviewDeleted = async (reviewId: string) => {
    try {
      await deleteReview(reviewId);
      toast.success("Review deleted.");
      refreshReviews();
      void property.reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to delete review.");
    }
  };

  return (
    <div className="space-y-6">
      <Button asChild variant="ghost" size="sm" className="-ml-2">
        <Link to="/tenant/search">
          <ArrowLeft className="size-4" />
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
                disabled={favoritePending}
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

              {typeof averageRating === "number" && averageRating > 0 ? (
                <span className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
                  <Star aria-hidden="true" className="size-4 fill-warning text-warning" />
                  <span className="tabular-nums font-semibold text-foreground">{averageRating.toFixed(1)}</span>
                  <span>({totalReviews} {totalReviews === 1 ? "review" : "reviews"})</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5 text-body-sm text-muted-foreground">
                  <Star aria-hidden="true" className="size-4 text-muted-foreground/30" />
                  <span>No reviews yet</span>
                </span>
              )}
            </div>
          </section>

          {/* At a glance specs */}
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

          {/* Real Reviews Section */}
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-h3 text-foreground">Reviews</h2>
                <p className="text-body-sm text-muted-foreground">
                  {totalReviews > 0
                    ? `${totalReviews} ${totalReviews === 1 ? "review" : "reviews"} from tenants`
                    : "No reviews yet for this home"}
                </p>
              </div>

              {user?.role === "TENANT" ? (
                <ReviewModal propertyId={data.id} onSubmitted={handleReviewAdded} />
              ) : null}
            </div>

            {reviews.loading && !reviews.data ? (
              <div className="space-y-3">
                <Skeleton className="h-24 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </div>
            ) : reviews.error && reviewItems.length === 0 ? (
              <ErrorState error={reviews.error} onRetry={reviews.reload} />
            ) : reviewItems.length === 0 ? (
              <div className="rounded-xl border border-border bg-card p-6 text-center">
                <p className="text-body text-muted-foreground">
                  No one has reviewed this property yet.
                </p>
              </div>
            ) : (
              <ul className="space-y-3">
                {reviewItems.map((rev) => (
                  <ReviewItem
                    key={rev.id}
                    review={rev}
                    canDelete={rev.isOwn}
                    onDelete={() => handleReviewDeleted(rev.id)}
                  />
                ))}
              </ul>
            )}

            {reviews.error && reviewItems.length > 0 ? (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                <p className="text-body-sm text-destructive-strong">
                  Couldn&apos;t load more reviews.
                </p>
                <Button type="button" variant="outline" size="sm" onClick={reviews.reload}>
                  Retry
                </Button>
              </div>
            ) : hasMoreReviews ? (
              <div className="flex justify-center">
                <Button
                  type="button"
                  variant="outline"
                  disabled={reviews.loading}
                  onClick={() => setReviewPage((page) => page + 1)}
                >
                  {reviews.loading ? "Loading…" : "Load more reviews"}
                </Button>
              </div>
            ) : null}
          </section>
        </div>

        {/* Landlord card. Sticky from lg up so the contact details stay reachable */}
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
                  <a href={`tel:${data.landlord.mpesaNumber}`}>
                    <Phone className="size-4" />
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
                <MessageSquare className="size-4" />
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

function ReviewItem({
  review,
  canDelete,
  onDelete,
}: {
  review: Review;
  canDelete: boolean;
  onDelete: () => void;
}) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    try {
      await onDelete();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <li className="rounded-xl border border-border bg-card p-4 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-body font-semibold text-foreground">{review.tenant.name}</p>
          <p className="mt-0.5 text-caption text-muted-foreground">{formatDate(review.createdAt)}</p>
        </div>

        <div className="flex items-center gap-3">
          <span className="flex shrink-0 items-center gap-1 text-caption text-muted-foreground">
            <Star aria-hidden="true" className="size-3.5 fill-warning text-warning" />
            <span className="tabular-nums font-semibold">{review.rating}.0</span>
          </span>

          {canDelete ? (
            <button
              type="button"
              onClick={handleDelete}
              disabled={deleting}
              aria-label="Delete review"
              className="text-muted-foreground/60 hover:text-destructive transition-colors disabled:opacity-50"
            >
              <Trash2 className="size-4" />
            </button>
          ) : null}
        </div>
      </div>

      {review.comment ? (
        <p className="mt-2.5 text-body-sm text-muted-foreground whitespace-pre-line">
          {review.comment}
        </p>
      ) : null}
    </li>
  );
}

function ReviewModal({
  propertyId,
  onSubmitted,
}: {
  propertyId: string;
  onSubmitted: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await createReview(propertyId, {
        rating,
        comment: comment.trim() || undefined,
      });
      toast.success("Thank you! Your review has been posted.");
      setOpen(false);
      setComment("");
      setRating(5);
      onSubmitted();
    } catch (err) {
      if (err instanceof ApiError && err.code === "ALREADY_REVIEWED") {
        toast.error("You have already reviewed this property.");
      } else {
        toast.error(err instanceof Error ? err.message : "Failed to submit review.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  const activeRating = hoverRating ?? rating;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Star className="size-3.5" />
          Write a review
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Rate this property</DialogTitle>
            <DialogDescription>
              Share what you noticed about this home. One review per property.
            </DialogDescription>
          </DialogHeader>

          <div className="my-5 space-y-4">
            <div>
              <label className="text-caption font-medium text-foreground block mb-2">
                Your rating
              </label>
              <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Rating">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    aria-label={`${star} star${star === 1 ? "" : "s"}`}
                    aria-checked={rating === star}
                    role="radio"
                    className="p-1 rounded-md transition-transform hover:scale-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <Star
                      className={cn(
                        "size-7 transition-colors",
                        star <= activeRating
                          ? "fill-warning text-warning"
                          : "text-muted-foreground/30 hover:text-muted-foreground/50",
                      )}
                    />
                  </button>
                ))}
                <span className="ml-2 text-body-sm font-medium text-muted-foreground">
                  {activeRating} / 5 stars
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label htmlFor="review-comment" className="text-caption font-medium text-foreground">
                  Feedback (optional)
                </label>
                <span className="text-caption text-muted-foreground">
                  {comment.length}/1000
                </span>
              </div>
              <Textarea
                id="review-comment"
                placeholder="How was the water pressure, landlord responsiveness, neighborhood noise, etc.?"
                value={comment}
                maxLength={1000}
                onChange={(e) => setComment(e.target.value)}
                rows={4}
                className="resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Posting..." : "Post review"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
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
