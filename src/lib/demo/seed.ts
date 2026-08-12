/**
 * Deterministic pseudo-values for the demo layer.
 *
 * Every fake figure in this app is derived from a key rather than drawn from
 * `Math.random()`, so a property shows the same rating on the Home screen, in
 * search results and on its own detail page. Random values would make two
 * screens disagree about the same "fact" and would jitter on every render,
 * which reads as a bug rather than as sample data.
 *
 * Shared by `demo/landlord.ts` and `demo/tenant.ts` so the two cannot drift
 * apart and start seeding the same id differently.
 */

/**
 * Small FNV-1a hash. Not cryptographic and not trying to be — it only has to
 * turn an id into a stable-looking number.
 */
export function seedFrom(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return Math.abs(hash);
}

/** A stable pseudo-value in `[min, max]` for a given key. */
export function seededBetween(key: string, min: number, max: number): number {
  if (max <= min) return min;
  return min + (seedFrom(key) % (max - min + 1));
}

/**
 * A stable pick from a list. Used where the fake value is a label rather than a
 * number — a furnishing state, a property type.
 */
export function seededPick<T>(key: string, options: readonly T[]): T {
  return options[seedFrom(key) % options.length];
}
