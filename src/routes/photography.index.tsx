import { createFileRoute, redirect } from "@tanstack/react-router";
import { PhotographyView, photographyHead, validatePhotoSearch } from "@/views/photography";

export const Route = createFileRoute("/photography/")({
  validateSearch: validatePhotoSearch,
  // All photos no longer filters by place (stage 9c, as in the mock): an old ?location= link
  // opens that place's album.
  beforeLoad: ({ search }) => {
    if (search.location)
      throw redirect({ to: "/photography/albums/$slug", params: { slug: search.location } });
  },
  head: () => photographyHead("bg"),
  component: PhotographyView,
});
