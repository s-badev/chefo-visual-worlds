/*
 * Layout breakpoints of the Photography albums section (container widths of `albums-section`;
 * styles.css matches them): the side passport book from 1500px, the mobile model (sticky caption,
 * two taps) at 767px and below.
 */
export const ALBUM_LAYOUT = {
  passportMinWidth: 1500,
  mobileMaxWidth: 767,
  finePointer: "(hover: hover) and (pointer: fine)",
  coarsePointer: "(pointer: coarse)",
} as const;
