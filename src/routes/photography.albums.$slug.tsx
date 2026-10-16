import { createFileRoute, notFound } from "@tanstack/react-router";
import { getAlbum } from "@/content/albums";
import { validateAlbumSearch } from "@/content/album-view-search";
import { AlbumView, albumHead, AlbumNotFoundView } from "@/views/photography";

export const Route = createFileRoute("/photography/albums/$slug")({
  validateSearch: validateAlbumSearch,
  loader: ({ params }) => {
    const album = getAlbum(params.slug);
    if (!album) throw notFound();
    return { album };
  },
  head: ({ loaderData }) => albumHead("bg", loaderData?.album),
  notFoundComponent: AlbumNotFoundView,
  component: AlbumRoute,
});

function AlbumRoute() {
  const { album } = Route.useLoaderData();
  const { view } = Route.useSearch();
  return <AlbumView album={album} view={view} />;
}
