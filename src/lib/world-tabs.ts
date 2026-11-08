/** Pure helpers behind the AI Worlds collection tabs; the components measure and apply. */
import { WORLD_COUNT, takeoverProgress } from "@/lib/worlds-motion";

/** The reading line: a scene is current once its slot top reaches 47% of the viewport height. */
export const ACTIVE_LINE = 0.47;
/** After a tab click the active tab is held until scrolling has been idle this long... */
export const TAB_LOCK_IDLE_MS = 160;
/** ...and never longer than this. */
export const TAB_LOCK_MAX_MS = 900;
/** Gap left between the sticky tab bar and a scene a tab scrolls to. */
export const TAB_SCROLL_GAP = 8;

/**
 * Index of the current scene: the LAST one whose slot top is at or above the threshold
 * (viewport px). Defaults to the first scene; -1 only for an empty list.
 */
export function activeSceneIndex(slotTops: readonly number[], threshold: number): number {
  if (!slotTops.length) return -1;
  let active = 0;
  slotTops.forEach((top, i) => {
    if (top <= threshold) active = i;
  });
  return active;
}

/**
 * The pinned scene has one track for all worlds. Each world's slot is the part of the track's
 * scroll range in which it holds the stage; its top is placed on the reading line at the moment
 * the world takes over, so activeSceneIndex agrees with the scene that is actually shown.
 */
export function pinnedSlotTops(
  trackTop: number,
  trackHeight: number,
  viewportHeight: number,
  line = viewportHeight * ACTIVE_LINE,
): number[] {
  const travel = Math.max(0, trackHeight - viewportHeight);
  return Array.from(
    { length: WORLD_COUNT },
    (_, i) => trackTop + takeoverProgress(i) * travel + line,
  );
}

/** Document scroll position that puts a scene's slot top just under the header and tab bar. */
export const tabScrollTarget = (slotDocTop: number, headerHeight: number, tabsHeight: number) =>
  Math.max(0, slotDocTop - (headerHeight + tabsHeight + TAB_SCROLL_GAP));
