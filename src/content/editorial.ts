import type { AiWork } from "./ai-works";
import type { Album } from "./albums";
import type { Photo } from "./photos";

type PhotoSlug = Photo["slug"];
type ArtworkSlug = AiWork["slug"];
type AlbumSlug = Album["slug"];

export type GridColumn = `${number} / ${number}`;
export type AspectRatio = `${number} / ${number}`;
export type RemOffset = `${number}rem`;

export interface EditorialImage {
  readonly photoSlug: PhotoSlug;
  readonly column?: GridColumn;
  readonly aspectRatio?: AspectRatio;
  readonly marginTop?: RemOffset;
  readonly half?: boolean;
  readonly wide?: boolean;
}

export interface EditorialChapter {
  readonly images: readonly EditorialImage[];
  /**
   * How many images share each justified row, in order. Each row keeps the images' own aspect
   * ratios and gives them one common height. Without it, rows follow the column placement.
   */
  readonly rows?: readonly number[];
}

/** Rows as the 12-column grid placed them: an image starts a new row when its column starts
 * before the previous image ended; wide and full-width images take a row of their own. */
export const deriveRows = (images: readonly EditorialImage[]): number[] => {
  const rows: number[] = [];
  let cursor: number | null = null;
  for (const image of images) {
    const full = image.wide || !image.column;
    const [start, end] = (image.column ?? "1 / 13").split("/").map(Number) as [number, number];
    if (full || cursor === null || start < cursor) rows.push(1);
    else rows[rows.length - 1]! += 1;
    cursor = full ? null : end;
  }
  return rows;
};

export const getChapterRows = (chapter: EditorialChapter) =>
  chapter.rows ?? deriveRows(chapter.images);

export interface EditorialAlbum {
  readonly albumSlug: AlbumSlug;
  readonly treatment: "calm" | "reportage";
  readonly chapters: readonly EditorialChapter[];
}

export type PilotLayoutRole = "wide" | "landscape" | "portrait";
export interface PilotEditorialAlbum {
  readonly albumSlug: AlbumSlug;
  readonly variant: "coast" | "city" | "harbor" | "mountain";
  /** The first slug is always the published album cover. */
  readonly highlights: readonly { readonly photoSlug: PhotoSlug; readonly role: PilotLayoutRole }[];
  readonly coverObjectPosition?: string;
}

const edirneHighlights = [
  { photoSlug: "edirne-006", role: "wide" },
  { photoSlug: "edirne-011", role: "portrait" },
  { photoSlug: "edirne-005", role: "landscape" },
  { photoSlug: "edirne-021", role: "portrait" },
  { photoSlug: "edirne-015", role: "wide" },
] as const satisfies readonly {
  readonly photoSlug: PhotoSlug;
  readonly role: PilotLayoutRole;
}[];

export interface EditorialConfig {
  readonly photography: {
    readonly opening: {
      readonly photoSlug: PhotoSlug;
      readonly objectPosition: string;
    };
    readonly reportage: {
      readonly albumSlug: AlbumSlug;
      readonly photoSlugs: readonly PhotoSlug[];
    };
    readonly panoramaPhotoSlug: PhotoSlug;
  };
  readonly albums: readonly EditorialAlbum[];
  readonly pilotAlbums: readonly PilotEditorialAlbum[];
  readonly about: {
    readonly photoSlugs: readonly PhotoSlug[];
    readonly artworkSlugs: readonly ArtworkSlug[];
  };
  readonly artworks: {
    readonly representativeSlugs: readonly ArtworkSlug[];
  };
}

/** Optional presentation choices. Published titles, descriptions and media stay in their registries. */
export const editorial = {
  photography: {
    opening: { photoSlug: "paris-005", objectPosition: "50% 50%" },
    reportage: {
      albumSlug: "istanbul",
      photoSlugs: ["istanbul-038", "istanbul-031", "istanbul-037"],
    },
    panoramaPhotoSlug: "rila-008",
  },
  albums: [
    {
      albumSlug: "paris",
      treatment: "calm",
      // Justified rows: same images, order and aspect ratios (crops) as before, equal heights per row.
      chapters: [
        {
          rows: [2, 2],
          images: [
            { photoSlug: "paris-048", aspectRatio: "3 / 2" },
            { photoSlug: "paris-043", aspectRatio: "3 / 4" },
            { photoSlug: "paris-013", aspectRatio: "3 / 2" },
            { photoSlug: "paris-009", aspectRatio: "3 / 2" },
          ],
        },
        {
          rows: [1, 2],
          images: [
            { photoSlug: "paris-055", wide: true },
            { photoSlug: "paris-039", aspectRatio: "9 / 16" },
            { photoSlug: "paris-056", aspectRatio: "4 / 3" },
          ],
        },
        {
          rows: [3],
          images: [
            { photoSlug: "paris-040", aspectRatio: "9 / 16" },
            { photoSlug: "paris-031", aspectRatio: "3 / 2" },
            { photoSlug: "paris-035", aspectRatio: "9 / 16" },
          ],
        },
        {
          rows: [3],
          images: [
            { photoSlug: "paris-045", aspectRatio: "3 / 4" },
            { photoSlug: "paris-047", aspectRatio: "4 / 3" },
            { photoSlug: "paris-044", aspectRatio: "3 / 4" },
          ],
        },
      ],
    },
    {
      albumSlug: "istanbul",
      treatment: "reportage",
      chapters: [
        {
          images: [
            { photoSlug: "istanbul-017", wide: true },
            { photoSlug: "istanbul-009", column: "1 / 8", aspectRatio: "3 / 2", half: true },
            {
              photoSlug: "istanbul-029",
              column: "8 / 12",
              aspectRatio: "9 / 16",
              marginTop: "-4rem",
              half: true,
            },
          ],
        },
        {
          images: [
            { photoSlug: "istanbul-012", column: "1 / 7", aspectRatio: "4 / 3", half: true },
            {
              photoSlug: "istanbul-013",
              column: "7 / 13",
              aspectRatio: "4 / 3",
              marginTop: "5rem",
              half: true,
            },
          ],
        },
        {
          // Placement rows would be [3, 2]: a 384px row above a two-portrait row twice as tall.
          rows: [2, 3],
          images: [
            { photoSlug: "istanbul-032", column: "1 / 4", aspectRatio: "3 / 4", half: true },
            {
              photoSlug: "istanbul-025",
              column: "4 / 10",
              aspectRatio: "3 / 2",
              marginTop: "4rem",
              half: true,
            },
            { photoSlug: "istanbul-040", column: "10 / 13", aspectRatio: "3 / 4", half: true },
            {
              photoSlug: "istanbul-037",
              column: "3 / 7",
              aspectRatio: "3 / 4",
              marginTop: "-2rem",
              half: true,
            },
            {
              photoSlug: "istanbul-031",
              column: "8 / 12",
              aspectRatio: "3 / 4",
              marginTop: "2rem",
              half: true,
            },
          ],
        },
        {
          images: [
            { photoSlug: "istanbul-038", wide: true },
            { photoSlug: "istanbul-030", column: "2 / 6", aspectRatio: "3 / 4", half: true },
            {
              photoSlug: "istanbul-035",
              column: "7 / 11",
              aspectRatio: "3 / 4",
              marginTop: "6rem",
              half: true,
            },
          ],
        },
      ],
    },
  ],
  pilotAlbums: [
    {
      albumSlug: "sunny-beach",
      variant: "coast",
      highlights: [
        { photoSlug: "sunny-beach-010", role: "wide" },
        { photoSlug: "sunny-beach-by-the-sea", role: "portrait" },
        { photoSlug: "sunny-beach-005", role: "landscape" },
        { photoSlug: "sunny-beach-024", role: "wide" },
        { photoSlug: "coastal-sunset-over-the-lit-town", role: "portrait" },
        { photoSlug: "sunny-beach-soft-evening-waves", role: "landscape" },
      ],
    },
    {
      albumSlug: "sofia",
      variant: "city",
      highlights: [
        { photoSlug: "sofia-001", role: "wide" },
        { photoSlug: "sofia-035", role: "wide" },
        { photoSlug: "sofia-038", role: "landscape" },
        { photoSlug: "sofia-042", role: "portrait" },
        { photoSlug: "sofia-028", role: "landscape" },
        { photoSlug: "sofia-030", role: "wide" },
      ],
    },
    {
      albumSlug: "sveti-vlas",
      variant: "harbor",
      highlights: [
        { photoSlug: "sveti-vlas-005", role: "wide" },
        { photoSlug: "sveti-vlas-001", role: "landscape" },
        { photoSlug: "sveti-vlas-003", role: "portrait" },
        { photoSlug: "sveti-vlas-006", role: "landscape" },
        { photoSlug: "sveti-vlas-010", role: "portrait" },
      ],
    },
    {
      albumSlug: "rila",
      variant: "mountain",
      highlights: [
        { photoSlug: "rila-008", role: "wide" },
        { photoSlug: "rila-022", role: "landscape" },
        { photoSlug: "rila-023", role: "portrait" },
        { photoSlug: "rila-014", role: "wide" },
        { photoSlug: "rila-032", role: "landscape" },
        { photoSlug: "rila-035", role: "wide" },
      ],
    },
    {
      albumSlug: "lyon",
      variant: "city",
      highlights: [
        { photoSlug: "lyon-001", role: "wide" },
        { photoSlug: "lyon-006", role: "portrait" },
        { photoSlug: "lyon-013", role: "portrait" },
        { photoSlug: "lyon-016", role: "landscape" },
        { photoSlug: "lyon-023", role: "wide" },
      ],
    },
    {
      albumSlug: "bodrum",
      variant: "coast",
      highlights: [
        { photoSlug: "bodrum-013", role: "wide" },
        { photoSlug: "bodrum-002", role: "wide" },
        { photoSlug: "bodrum-021", role: "portrait" },
        { photoSlug: "bodrum-020", role: "landscape" },
        { photoSlug: "bodrum-024", role: "portrait" },
      ],
    },
    {
      albumSlug: "nessebar",
      variant: "coast",
      highlights: [
        { photoSlug: "nessebar-015", role: "wide" },
        { photoSlug: "nessebar-brick-church", role: "landscape" },
        { photoSlug: "nessebar-023", role: "portrait" },
        { photoSlug: "nessebar-windmill-by-water", role: "portrait" },
        { photoSlug: "nessebar-beach-below-old-town", role: "wide" },
        { photoSlug: "nessebar-012", role: "wide" },
      ],
    },
    {
      albumSlug: "tunisia",
      variant: "coast",
      highlights: [
        { photoSlug: "tunisia-018", role: "wide" },
        { photoSlug: "tunisia-024", role: "landscape" },
        { photoSlug: "tunisia-015", role: "portrait" },
        { photoSlug: "tunisia-011", role: "wide" },
        { photoSlug: "tunisia-013", role: "portrait" },
        { photoSlug: "tunisia-003", role: "landscape" },
      ],
    },
    {
      albumSlug: "edirne",
      variant: "city",
      highlights: edirneHighlights,
    },
    {
      albumSlug: "plovdiv",
      variant: "city",
      coverObjectPosition: "50% 25%",
      highlights: [
        { photoSlug: "plovdiv-011", role: "wide" },
        { photoSlug: "plovdiv-staria-grad", role: "portrait" },
        { photoSlug: "plovdiv-009", role: "landscape" },
        { photoSlug: "plovdiv-006", role: "portrait" },
        { photoSlug: "plovdiv-016", role: "portrait" },
      ],
    },
  ],
  about: {
    photoSlugs: ["sveti-vlas-005", "istanbul-037", "paris-048"],
    artworkSlugs: ["chefo-srednovekoven-ritsar", "renesansov-portret", "chefo-v-badeshteto"],
  },
  artworks: {
    representativeSlugs: [
      "chefo-srednovekoven-ritsar",
      "chefo-taxi-driver",
      "chefo-v-badeshteto",
      "chefo-v-turtsiya",
    ],
  },
} as const satisfies EditorialConfig;

export const getEditorialAlbum = (slug: AlbumSlug): EditorialAlbum | undefined =>
  editorial.albums.find((album) => album.albumSlug === slug);

export const getPilotEditorialAlbum = (slug: AlbumSlug): PilotEditorialAlbum | undefined =>
  editorial.pilotAlbums.find((album) => album.albumSlug === slug);

export const getEditorialChapterImages = (
  slug: AlbumSlug,
  chapterIndex: number,
): readonly EditorialImage[] => getEditorialAlbum(slug)?.chapters[chapterIndex]?.images ?? [];
