import { createFileRoute, notFound } from "@tanstack/react-router";
import { getAlbum } from "@/content/albums";
import { AlbumView, albumHead, AlbumNotFoundView } from "@/views/photography";

export const Route = createFileRoute("/photography/albums/$slug")({
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
  return <AlbumView album={album} />;
}
