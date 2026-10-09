import { createFileRoute } from "@tanstack/react-router";
import { AboutView, aboutHead } from "@/views/about";

export const Route = createFileRoute("/en/about")({
  head: () => aboutHead("en"),
  component: AboutView,
});
