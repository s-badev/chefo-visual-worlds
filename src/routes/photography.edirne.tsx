import { createFileRoute, redirect } from "@tanstack/react-router";

/** Preserve the short owner-facing URL while using the existing album route. */
export const Route = createFileRoute("/photography/edirne")({
  beforeLoad: () => {
    throw redirect({ to: "/photography/albums/$slug", params: { slug: "edirne" } });
  },
});
