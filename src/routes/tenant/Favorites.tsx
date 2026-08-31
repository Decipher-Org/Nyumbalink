import { Heart, Search } from "lucide-react";
import { Link } from "react-router-dom";

import { PageHeader } from "@/components/app/PageHeader";
import { CardSkeleton, EmptyState, ErrorState } from "@/components/app/States";
import { ListingCard } from "@/components/tenant/ListingCard";
import { Button } from "@/components/ui/button";
import type { PropertyCard } from "@/lib/api/types";
import { useFavorites } from "@/lib/favorites/FavoritesProvider";

/**
 * Saved listings for the authenticated tenant.
 * Backed by `GET /api/v1/favorites`.
 */
export default function TenantFavourites() {
  const { items, loading, error, refresh } = useFavorites();
  const properties = items.map(
    (fav): PropertyCard => ({
      id: fav.property.id,
      title: fav.property.title,
      county: fav.property.county,
      town: fav.property.town,
      estate: fav.property.estate,
      images: fav.property.images,
      status: "ACTIVE",
      unitsFrom: fav.property.unitsFrom,
      createdAt: fav.createdAt,
    }),
  );
  const count = properties.length;

  return (
    <>
      <PageHeader
        title="Saved homes"
        description={count === 0 ? undefined : `${count} saved ${count === 1 ? "home" : "homes"}.`}
      />

      {loading && items.length === 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }, (_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : error && items.length === 0 ? (
        <ErrorState error={error} onRetry={() => void refresh()} />
      ) : count === 0 ? (
        <EmptyState
          icon={Heart}
          title="Nothing saved yet"
          body="Tap the heart on any listing to keep it here while you compare."
          action={
            <Button asChild>
              <Link to="/tenant/search">
                <Search className="size-4" />
                Find a home
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {properties.map((property) => (
              <ListingCard key={property.id} property={property} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
