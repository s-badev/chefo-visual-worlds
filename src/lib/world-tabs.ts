/** Pure helpers behind the AI Worlds collection tabs; the components measure and apply. */

/** The reading line: a hall is current once its top reaches 47% of the viewport height. */
export const ACTIVE_LINE = 0.47;
/** After a tab click the active tab is held until scrolling has been idle this long... */
export const TAB_LOCK_IDLE_MS = 160;
/** ...and never longer than this. */
export const TAB_LOCK_MAX_MS = 900;
/** Gap left between the sticky tab bar and a hall a tab scrolls to. */
export const TAB_SCROLL_GAP = 8;

/**
 * Index of the current hall: the LAST one whose top is at or above the threshold (viewport px).
 * Defaults to the first hall; -1 only for an empty list.
 */
export function activeSceneIndex(slotTops: readonly number[], threshold: number): number {
  if (!slotTops.length) return -1;
  let active = 0;
  slotTops.forEach((top, i) => {
    if (top <= threshold) active = i;
  });
  return active;
}

/** Document scroll position that puts a hall's top just under the header and the tab bar. */
export const tabScrollTarget = (slotDocTop: number, headerHeight: number, tabsHeight: number) =>
  Math.max(0, slotDocTop - (headerHeight + tabsHeight + TAB_SCROLL_GAP));
