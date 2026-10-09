import { createFileRoute } from "@tanstack/react-router";
import { AboutView, aboutHead } from "@/views/about";

export const Route = createFileRoute("/about")({
  head: () => aboutHead("bg"),
  component: AboutView,
});
