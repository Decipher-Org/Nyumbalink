/**
 * Saved properties (Favorites) state and provider.
 *
 * Replaces the demo in-memory store with live backend sync (`GET /api/v1/favorites`).
 * Provides optimistic toggling for immediate visual feedback across all listing
 * cards, search results, and property detail screens.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { toast } from "sonner";

import {
  addFavorite,
  listFavorites,
  removeFavorite,
} from "@/lib/api/favorites";
import { ApiError } from "@/lib/api/client";
import type { FavoriteItem } from "@/lib/api/types";
import { useAuth } from "@/lib/auth/AuthProvider";

type FavoritesState = {
  /** Check if a property is saved in favorites. */
  isSaved: (propertyId: string) => boolean;
  /** Toggle favorite status for a property with optimistic update. */
  toggle: (propertyId: string) => Promise<void>;
  /** Array of favorited property IDs in current session. */
  ids: string[];
  /** Total count of favorited properties. */
  count: number;
  /** Full saved-property cards returned by the backend. */
  items: FavoriteItem[];
  /** Whether initial favorites are loading. */
  loading: boolean;
  /** Initial/refresh failure, surfaced by the Favorites screen. */
  error: unknown;
  /** Whether this property's optimistic mutation is still in flight. */
  isPending: (propertyId: string) => boolean;
  /** Trigger an immediate reload of favorites from the server. */
  refresh: () => Promise<void>;
};

const FavoritesContext = createContext<FavoritesState | undefined>(undefined);

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [savedSet, setSavedSet] = useState<Set<string>>(new Set());
  const [items, setItems] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [pendingSet, setPendingSet] = useState<Set<string>>(new Set());
  const isTenant = user?.role === "TENANT";

  // Ref to track latest saved set without adding it to toggle dependencies
  const savedSetRef = useRef(savedSet);
  savedSetRef.current = savedSet;
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const pendingSetRef = useRef(pendingSet);
  pendingSetRef.current = pendingSet;

  const fetchFavorites = useCallback(async () => {
    if (!user || !isTenant) {
      setSavedSet(new Set());
      setItems([]);
      setError(null);
      setPendingSet(new Set());
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const nextItems = await listFavorites();
      const ids = new Set(nextItems.map((item) => item.property.id));
      setItems(nextItems);
      setSavedSet(ids);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user, isTenant]);

  useEffect(() => {
    void fetchFavorites();
  }, [fetchFavorites]);

  const toggle = useCallback(
    async (propertyId: string) => {
      if (!user) {
        toast.error("Please sign in to save properties.");
        return;
      }
      if (!isTenant) {
        toast.error("Only tenant accounts can save properties.");
        return;
      }
      if (pendingSetRef.current.has(propertyId)) return;

      const wasSaved = savedSetRef.current.has(propertyId);
      const removedItem = itemsRef.current.find(
        (item) => item.property.id === propertyId,
      );

      const nextPending = new Set(pendingSetRef.current).add(propertyId);
      pendingSetRef.current = nextPending;
      setPendingSet(nextPending);

      // Optimistic update: flip state immediately
      setSavedSet((prev) => {
        const next = new Set(prev);
        if (wasSaved) next.delete(propertyId);
        else next.add(propertyId);
        return next;
      });
      if (wasSaved) {
        setItems((prev) =>
          prev.filter((item) => item.property.id !== propertyId),
        );
      }

      try {
        if (wasSaved) {
          await removeFavorite(propertyId);
          toast.success("Removed from saved homes.");
        } else {
          await addFavorite(propertyId);
          toast.success("Saved to your favourites!");
          // POST returns only the favorite identity, so refresh to obtain the
          // property card needed by the Saved Homes screen.
          void fetchFavorites();
        }
      } catch (err: unknown) {
        // A stale client can be one step behind the server. Treat these two
        // idempotency conflicts as confirmation of the desired end state.
        if (
          err instanceof ApiError &&
          ((!wasSaved && err.code === "ALREADY_FAVORITED") ||
            (wasSaved && err.code === "NOT_FAVORITED"))
        ) {
          if (!wasSaved) void fetchFavorites();
          return;
        }

        // Rollback on failure
        setSavedSet((prev) => {
          const next = new Set(prev);
          if (wasSaved) next.add(propertyId);
          else next.delete(propertyId);
          return next;
        });
        if (wasSaved && removedItem) {
          setItems((prev) =>
            prev.some((item) => item.id === removedItem.id)
              ? prev
              : [removedItem, ...prev],
          );
        }

        const message =
          err instanceof Error ? err.message : "Failed to update favourite.";
        toast.error(message);
      } finally {
        const next = new Set(pendingSetRef.current);
        next.delete(propertyId);
        pendingSetRef.current = next;
        setPendingSet(next);
      }
    },
    [user, isTenant, fetchFavorites],
  );

  const isSaved = useCallback(
    (propertyId: string) => savedSet.has(propertyId),
    [savedSet],
  );
  const isPending = useCallback(
    (propertyId: string) => pendingSet.has(propertyId),
    [pendingSet],
  );

  return (
    <FavoritesContext.Provider
      value={{
        isSaved,
        toggle,
        ids: Array.from(savedSet),
        count: savedSet.size,
        items,
        loading,
        error,
        isPending,
        refresh: fetchFavorites,
      }}
    >
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites(): FavoritesState {
  const context = useContext(FavoritesContext);
  if (!context) {
    throw new Error("useFavorites must be used within a <FavoritesProvider>");
  }
  return context;
}

// Alias for backward compatibility during transition
export const useFavourites = useFavorites;
