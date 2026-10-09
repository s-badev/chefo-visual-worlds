import { createFileRoute, notFound } from "@tanstack/react-router";
import { getPhoto } from "@/content/photos";
import { PhotoDetailView, photoDetailHead, PhotoNotFoundView } from "@/views/photography";

export const Route = createFileRoute("/photography/$slug")({
  loader: ({ params }) => {
    const photo = getPhoto(params.slug);
    if (!photo) throw notFound();
    return { photo };
  },
  head: ({ loaderData }) => photoDetailHead("bg", loaderData?.photo),
  notFoundComponent: PhotoNotFoundView,
  component: Detail,
});

function Detail() {
  const { photo } = Route.useLoaderData();
  return <PhotoDetailView photo={photo} />;
}
