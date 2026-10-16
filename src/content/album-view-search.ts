export type AlbumSearch = Record<string, string | undefined> & { view?: "all" | undefined };

/** Preserve meaningful string parameters while validating the pilot gallery view. */
export const validateAlbumSearch = (search: Record<string, unknown>): AlbumSearch => ({
  ...Object.fromEntries(
    Object.entries(search).filter(([key, value]) => key !== "view" && typeof value === "string"),
  ),
  view: search["view"] === "all" ? "all" : undefined,
});
