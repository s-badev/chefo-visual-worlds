import type { Photo } from "./photos";

/** Two original Sveti Vlas photographs, kept in their natural portrait proportions. */
export const svetiVlasAdditions: Photo[] = [
  {
    slug: "sveti-vlas-009",
    image: "/photos/sveti-vlas/sveti-vlas-009.webp",
    width: 1126,
    height: 2000,
    title: "Панорама към морето",
    alt: "Панорама към морето и крайбрежието над зелена поляна",
    location: "Свети Влас",
    category: "Море",
    themes: ["sea", "nature", "travel"],
    en: {
      title: "Panoramic Sea View",
      alt: "Panoramic view of the sea and coastline beyond a green meadow",
    },
  },
  {
    slug: "sveti-vlas-010",
    image: "/photos/sveti-vlas/sveti-vlas-010.webp",
    width: 1126,
    height: 2000,
    title: "Люлка с изглед към морето",
    alt: "Дървена люлка на хълм с изглед към морето и крайбрежието",
    location: "Свети Влас",
    category: "Море",
    themes: ["sea", "nature", "travel"],
    en: {
      title: "Swing Overlooking the Sea",
      alt: "Wooden swing on a hillside overlooking the sea and coastline",
    },
  },
];
