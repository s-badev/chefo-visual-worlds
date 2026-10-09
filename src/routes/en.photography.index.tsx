import { createFileRoute } from "@tanstack/react-router";
import { PhotographyView, photographyHead, validatePhotoSearch } from "@/views/photography";

export const Route = createFileRoute("/en/photography/")({
  validateSearch: validatePhotoSearch,
  head: () => photographyHead("en"),
  component: PhotographyView,
});
