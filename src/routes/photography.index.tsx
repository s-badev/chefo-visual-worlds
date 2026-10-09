import { createFileRoute } from "@tanstack/react-router";
import { PhotographyView, photographyHead, validatePhotoSearch } from "@/views/photography";

export const Route = createFileRoute("/photography/")({
  validateSearch: validatePhotoSearch,
  head: () => photographyHead("bg"),
  component: PhotographyView,
});
