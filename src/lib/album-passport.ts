export type PassportState = ReadonlySet<string>;

export const EMPTY_PASSPORT: PassportState = new Set<string>();

/**
 * Thirteen spread positions [x%, y%] across the left (02) and right (03) pages of the passport book.
 * Selected via `(index * 5) % 13` so neighbouring albums in the list land on different parts of the spread.
 * If total albums ever exceed 13, positions wrap modularly across the 13 slots.
 */
export const POSITIONS: readonly (readonly [number, number])[] = [
  [15, 24],
  [39, 31],
  [14, 44],
  [38, 53],
  [16, 64],
  [39, 74],
  [15, 83],
  [63, 30],
  [87, 22],
  [62, 52],
  [86, 42],
  [63, 74],
  [87, 63],
] as const;

export function addStamp(
  state: PassportState,
  slug: string,
): { state: PassportState; isNew: boolean } {
  if (state.has(slug)) {
    return { state, isNew: false };
  }
  const next = new Set(state);
  next.add(slug);
  return { state: next, isNew: true };
}

export function stampSpot(
  index: number,
  _total: number = POSITIONS.length,
): readonly [number, number] {
  const safeIndex = Math.max(0, Math.trunc(index));
  return POSITIONS[(safeIndex * 5) % POSITIONS.length]!;
}

export function stampRotation(index: number): number {
  const safeIndex = Math.max(0, Math.trunc(index));
  return ((safeIndex * 37) % 32) - 16;
}
