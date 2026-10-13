import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/en/photography/edirne")({
  beforeLoad: () => {
    throw redirect({ to: "/en/photography/albums/$slug", params: { slug: "edirne" } });
  },
});
