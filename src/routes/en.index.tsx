import { createFileRoute } from "@tanstack/react-router";
import { HomeView, homeHead } from "@/views/home";

export const Route = createFileRoute("/en/")({
  head: () => homeHead("en"),
  component: HomeView,
});
