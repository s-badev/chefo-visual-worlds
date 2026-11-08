/**
 * Small copies (96 px wide WebP in public/deck) of the AI covers in the deck, which shows them at
 * 30 x 38 px: the full-size artworks would cost hundreds of kilobytes for three tiny cards.
 */
const DECK_COVER_THUMBS = new Set([
  "chefo-srednovekoven-ritsar",
  "chefo-taxi-driver",
  "chefo-v-badeshteto",
]);
export const deckCoverSrc = (cover: { slug: string; image: string }) =>
  DECK_COVER_THUMBS.has(cover.slug) ? `/deck/${cover.slug}.webp` : cover.image;
