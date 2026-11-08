/** Glow under each hall's works (the approved mock's GLOW values, by collection slug). */
export const HALL_GLOW: Record<string, string> = {
  "historical-eras-rulers": "rgb(224 150 58 / 0.55)",
  "professions-roles": "rgb(110 152 218 / 0.5)",
  "cinema-archetypes": "rgb(214 112 78 / 0.5)",
  "chefo-around-the-world": "rgb(236 192 112 / 0.5)",
};

/** DOM id of a collection's hall on /ai-worlds. */
export const hallId = (slug: string) => `hall-${slug}`;
