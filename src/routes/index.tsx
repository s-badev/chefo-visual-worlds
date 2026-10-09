import { createFileRoute } from "@tanstack/react-router";
import { HomeView, homeHead } from "@/views/home";

export const Route = createFileRoute("/")({
  head: () => homeHead("bg"),
  component: HomeView,
});
