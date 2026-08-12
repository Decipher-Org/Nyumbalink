/**
 * Saved properties — the demo store behind every heart button.
 *
 * A module-level `Set` of property ids, not copies of the listings: the listing
 * itself is real and comes from the API, and only the *saved* relationship is
 * fake. When Milestone 8 lands this file is replaced by three endpoint calls and
 * no card markup changes.
 *
 * ## Why a store rather than component state
 *
 * The same property can be on screen in three places at once — a Home carousel,
 * a search result, the Favourites list. Local state per card would let those
 * disagree: hearting a card on Home would leave the identical card in search
 * results looking unsaved. `useSyncExternalStore` gives every subscriber the one
 * set, so all copies of a property update together.
 *
 * It is in memory on purpose. There is no `localStorage` write, because
 * persisting to the browser would make a fake feature look like a real one that
 * simply hasn't synced yet — and would then survive a sign-out, which is worse
 * than resetting. `DEMO_FEATURES.favorites` says it resets on reload; this is
 * the code that makes that true.
 */

import { useCallback, useSyncExternalStore } from "react";

const saved = new Set<string>();
const listeners = new Set<() => void>();

/**
 * Bumped on every change so `getSnapshot` can return a primitive.
 *
 * `useSyncExternalStore` compares snapshots with `Object.is`. Returning the
 * `Set` itself would compare equal after a mutation and nothing would re-render;
 * returning a fresh copy would allocate on every render and loop. A version
 * counter sidesteps both.
 */
let version = 0;

function emit() {
  version += 1;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const getVersion = () => version;

export function useFavourites() {
  useSyncExternalStore(subscribe, getVersion, getVersion);

  const toggle = useCallback((propertyId: string) => {
    if (saved.has(propertyId)) saved.delete(propertyId);
    else saved.add(propertyId);
    emit();
  }, []);

  const isSaved = useCallback((propertyId: string) => saved.has(propertyId), []);

  return {
    isSaved,
    toggle,
    /** Insertion order, so the Favourites list is "most recently saved last". */
    ids: Array.from(saved),
    count: saved.size,
  };
}
