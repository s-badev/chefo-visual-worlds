import type { Photo } from "@/content/photos";

/** A fixed canonical sequence is planned for all CSS breakpoints during SSR. */
export const ALBUM_BATCH_SIZE = 12;
export type MosaicPhoto = Pick<Photo, "slug" | "width" | "height">;
export type MosaicBreakpoint = "mobile" | "smallTablet" | "mediumTablet" | "tablet" | "desktop";

export const mosaicBreakpoints = {
  mobile: {
    width: 320,
    widest: 440,
    gap: 12,
    targetHeight: 195,
    maxHeight: 450,
    minTile: 104,
    maxBlocks: 2,
  },
  smallTablet: {
    width: 426,
    widest: 505,
    gap: 14,
    targetHeight: 230,
    maxHeight: 500,
    minTile: 130,
    maxBlocks: 3,
  },
  mediumTablet: {
    width: 505,
    widest: 712,
    gap: 14,
    targetHeight: 245,
    maxHeight: 520,
    minTile: 115,
    maxBlocks: 3,
  },
  tablet: {
    width: 689,
    widest: 945,
    gap: 16,
    targetHeight: 270,
    maxHeight: 550,
    minTile: 130,
    maxBlocks: 3,
  },
  desktop: {
    width: 945,
    widest: 1216,
    gap: 16,
    targetHeight: 320,
    maxHeight: 630,
    minTile: 160,
    maxBlocks: 4,
  },
} as const;

export interface LinearSize {
  a: number;
  b: number;
}
export interface MosaicBlock {
  start: number;
  end: number;
  width: LinearSize;
}
export interface MosaicRow {
  start: number;
  end: number;
  height: LinearSize;
  blocks: MosaicBlock[];
  panorama: boolean;
  partial: boolean;
}
export interface MosaicCell {
  row: number;
  block: number;
  stackPosition: 0 | 1;
  x: LinearSize;
  y: LinearSize;
  width: LinearSize;
  height: LinearSize;
}
export interface MosaicPlan {
  batchEnds: number[];
  rows: Record<MosaicBreakpoint, MosaicRow[]>;
  cells: Record<MosaicBreakpoint, MosaicCell[]>;
  revealHeights: Record<MosaicBreakpoint, LinearSize[]>;
}

const ratio = (photo: MosaicPhoto) => photo.width / photo.height;
const add = (one: LinearSize, two: LinearSize): LinearSize => ({
  a: one.a + two.a,
  b: one.b + two.b,
});
const subtract = (one: LinearSize, two: LinearSize): LinearSize => ({
  a: one.a - two.a,
  b: one.b - two.b,
});
const scale = (size: LinearSize, factor: number): LinearSize => ({
  a: size.a * factor,
  b: size.b * factor,
});
const pixels = (value: number): LinearSize => ({ a: 0, b: value });
export const mosaicPixels = (size: LinearSize, width: number) => size.a * width + size.b;
export const mosaicCss = (size: LinearSize) =>
  `calc(${(size.a * 100).toFixed(9)}cqw ${size.b < 0 ? "-" : "+"} ${Math.abs(size.b).toFixed(6)}px)`;

/** Full, immutable twelve-photo batches; only the final batch may be shorter. */
export function mosaicBatchEnds(length: number): number[] {
  const ends: number[] = [];
  let shown = 0;
  while (shown < length) {
    const remaining = length - shown;
    shown += remaining <= ALBUM_BATCH_SIZE + 2 ? remaining : ALBUM_BATCH_SIZE;
    ends.push(shown);
  }
  return ends;
}

type Mode = (typeof mosaicBreakpoints)[MosaicBreakpoint];
type Candidate = { end: number; row: MosaicRow; cost: number };

function rowGeometry(
  photos: readonly MosaicPhoto[],
  start: number,
  blockSizes: readonly number[],
  mode: Mode,
  finalAlbumRow: boolean,
): Candidate | null {
  const blocks: MosaicBlock[] = [];
  let at = start;
  let singleSum = 0;
  let stackSum = 0;
  let stackCount = 0;
  let portraitSingle = false;
  let panorama = false;
  for (const size of blockSizes) {
    const first = photos[at];
    if (!first) return null;
    const r1 = ratio(first);
    if (r1 > 2) panorama = true;
    if (size === 2) {
      const second = photos[at + 1];
      if (!second || r1 < 1.15 || r1 > 2 || ratio(second) < 1.15 || ratio(second) > 2) return null;
      stackCount++;
      stackSum += 1 / (1 / r1 + 1 / ratio(second));
    } else {
      singleSum += r1;
      if (r1 < 0.9) portraitSingle = true;
    }
    blocks.push({ start: at, end: at + size, width: pixels(0) });
    at += size;
  }
  if (panorama && (at - start !== 1 || blockSizes.length !== 1)) return null;
  if (stackCount && !portraitSingle) return null;
  const g = mode.gap;
  const denominator = singleSum + stackSum;
  const fullHeight: LinearSize = {
    a: 1 / denominator,
    b: (-(blocks.length - 1) * g + g * stackSum) / denominator,
  };
  // The only underfilled row allowed is the end of the complete album.
  const finalCap = mode.targetHeight * 1.25;
  const partial =
    finalAlbumRow &&
    mosaicPixels(fullHeight, mode.widest) > mode.maxHeight &&
    mosaicPixels(fullHeight, mode.width) > finalCap;
  const height = partial ? pixels(finalCap) : fullHeight;
  for (const block of blocks) {
    if (block.end - block.start === 1) block.width = scale(height, ratio(photos[block.start]!));
    else {
      const s = 1 / ratio(photos[block.start]!) + 1 / ratio(photos[block.start + 1]!);
      block.width = scale(subtract(height, pixels(g)), 1 / s);
    }
  }
  const widthsAtMin = blocks.map((block) => mosaicPixels(block.width, mode.width));
  const minWidth = Math.min(...widthsAtMin);
  // Reject unreadable strips. A lone portrait may then exceed the soft row
  // height target; preserving the complete photograph takes precedence.
  if (minWidth < mode.minTile - 0.001) return null;
  const minStackHeight = Math.min(
    ...blocks.flatMap((block) => {
      if (block.end - block.start === 1) return [mosaicPixels(height, mode.width)];
      const width = mosaicPixels(block.width, mode.width);
      return [width / ratio(photos[block.start]!), width / ratio(photos[block.start + 1]!)];
    }),
  );
  const tall = mosaicPixels(height, mode.widest);
  const middle = mosaicPixels(height, (mode.width + mode.widest) / 2);
  // Scoring: strong size/height penalties, target-height fit, and a modest
  // portrait/landscape-stack reward. Enumeration order is the deterministic tie-breaker.
  let cost = 1.25 + 5 * Math.log(Math.max(1, middle) / mode.targetHeight) ** 2;
  if (minStackHeight < 90) cost += 20 + 30 * (90 / Math.max(1, minStackHeight) - 1) ** 2;
  if (tall > mode.maxHeight && !panorama && !partial) {
    const excess = tall / mode.maxHeight - 1;
    cost += 80 * excess ** 2 + 20 * excess;
  }
  if (stackCount) cost -= 0.85;
  if (partial) cost += 1.5;
  if (panorama) cost += 0.1;
  return { end: at, row: { start, end: at, height, blocks, panorama, partial }, cost };
}

function planBatch(
  photos: readonly MosaicPhoto[],
  from: number,
  to: number,
  mode: Mode,
): MosaicRow[] {
  const best: ({ cost: number; rows: MosaicRow[] } | undefined)[] = Array(to + 1);
  best[to] = { cost: 0, rows: [] };
  for (let start = to - 1; start >= from; start--) {
    const consider = (sizes: number[], end: number) => {
      const candidate = rowGeometry(photos, start, sizes, mode, end === photos.length);
      const tail = best[end];
      if (!candidate || !tail) return;
      const cost = candidate.cost + tail.cost;
      if (!best[start] || cost < best[start]!.cost - 1e-9)
        best[start] = { cost, rows: [candidate.row, ...tail.rows] };
    };
    const enumerate = (sizes: number[], end: number, stacks: number) => {
      if (sizes.length) consider(sizes, end);
      if (sizes.length === mode.maxBlocks || end >= to) return;
      enumerate([...sizes, 1], end + 1, stacks);
      if (!stacks && end + 1 < to) enumerate([...sizes, 2], end + 2, stacks + 1);
    };
    enumerate([], start, 0);
  }
  return best[from]?.rows ?? [];
}

function placeRows(photos: readonly MosaicPhoto[], rows: MosaicRow[], ends: number[], mode: Mode) {
  const cells: MosaicCell[] = Array(photos.length);
  const revealHeights: LinearSize[] = [];
  let y = pixels(0);
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
    const row = rows[rowIndex]!;
    let x = pixels(0);
    if (row.partial) {
      const used = row.blocks.reduce(
        (sum, block) => add(sum, block.width),
        pixels((row.blocks.length - 1) * mode.gap),
      );
      x = scale(subtract({ a: 1, b: 0 }, used), 0.5);
    }
    row.blocks.forEach((block, blockIndex) => {
      for (let index = block.start; index < block.end; index++) {
        const firstHeight =
          block.end - block.start === 2
            ? scale(block.width, 1 / ratio(photos[block.start]!))
            : row.height;
        cells[index] = {
          row: rowIndex,
          block: blockIndex,
          stackPosition: (index - block.start) as 0 | 1,
          x,
          y: index === block.start ? y : add(y, add(firstHeight, pixels(mode.gap))),
          width: block.width,
          height:
            index === block.start ? firstHeight : scale(block.width, 1 / ratio(photos[index]!)),
        };
      }
      x = add(x, add(block.width, pixels(mode.gap)));
    });
    y = add(y, row.height);
    if (ends.includes(row.end)) revealHeights.push(y);
    if (rowIndex < rows.length - 1) y = add(y, pixels(mode.gap));
  }
  return { cells, revealHeights };
}

export function createMosaicPlan(photos: readonly MosaicPhoto[]): MosaicPlan {
  const batchEnds = mosaicBatchEnds(photos.length);
  const rows = {} as MosaicPlan["rows"];
  const cells = {} as MosaicPlan["cells"];
  const revealHeights = {} as MosaicPlan["revealHeights"];
  for (const key of Object.keys(mosaicBreakpoints) as MosaicBreakpoint[]) {
    const mode = mosaicBreakpoints[key];
    const planned: MosaicRow[] = [];
    let from = 0;
    for (const end of batchEnds) {
      planned.push(...planBatch(photos, from, end, mode));
      from = end;
    }
    rows[key] = planned;
    ({ cells: cells[key], revealHeights: revealHeights[key] } = placeRows(
      photos,
      planned,
      batchEnds,
      mode,
    ));
  }
  return { batchEnds, rows, cells, revealHeights };
}

/** Keep the previously approved proportional Highlights composition unchanged. */
export function createHighlightBasis(photos: readonly MosaicPhoto[]) {
  const modes = {
    tablet: { width: 704, gap: 16, targetHeight: 220, maxItems: 4, minTile: 105, maxHeight: 500 },
    desktop: { width: 1216, gap: 16, targetHeight: 230, maxItems: 5, minTile: 130, maxHeight: 560 },
  } as const;
  const result = {} as Record<keyof typeof modes, string[]>;
  for (const key of Object.keys(modes) as (keyof typeof modes)[]) {
    const mode = modes[key];
    const best: ({ cost: number; groups: number[][] } | undefined)[] = Array(photos.length + 1);
    best[photos.length] = { cost: 0, groups: [] };
    for (let start = photos.length - 1; start >= 0; start--) {
      for (let count = 1; count <= Math.min(mode.maxItems, photos.length - start); count++) {
        const aspects = photos.slice(start, start + count).map(ratio);
        if (aspects.some((value) => value > 2) && count > 1) continue;
        const height =
          (mode.width - (count - 1) * mode.gap) / aspects.reduce((sum, value) => sum + value, 0);
        const narrowest = Math.min(...aspects.map((value) => value * height));
        let cost = 4 * Math.log(height / mode.targetHeight) ** 2 + (count === 1 ? 0.2 : 0);
        if (narrowest < mode.minTile) cost += 15 * (mode.minTile / narrowest - 1) ** 2;
        if (height > mode.maxHeight) cost += 15 * (height / mode.maxHeight - 1) ** 2;
        if (height < 95) cost += 10 * (95 / height - 1) ** 2;
        const tail = best[start + count];
        if (tail && (!best[start] || cost + tail.cost < best[start]!.cost)) {
          best[start] = {
            cost: cost + tail.cost,
            groups: [Array.from({ length: count }, (_, offset) => start + offset), ...tail.groups],
          };
        }
      }
    }
    const basis: string[] = Array(photos.length);
    for (const group of best[0]?.groups ?? []) {
      const sum = group.reduce((value, index) => value + ratio(photos[index]!), 0);
      for (const index of group) {
        const share = ratio(photos[index]!) / sum;
        basis[index] =
          `calc(${(share * 100).toFixed(8)}% - ${((group.length - 1) * mode.gap * share + 0.25).toFixed(8)}px)`;
      }
    }
    result[key] = basis;
  }
  return result;
}
