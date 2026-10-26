import { createFileRoute, notFound } from "@tanstack/react-router";
import { getAiWork } from "@/content/ai-works";
import { getDestination } from "@/content/ai-destinations";
import { AiDetailView, aiDetailHead, AiNotFoundView } from "@/views/ai-worlds";
import { DestinationView, destinationHead } from "@/components/ai-atlas";

export const Route = createFileRoute("/en/ai-worlds/$slug")({
  // See ai-worlds.$slug.tsx: destinations resolve first, then finished artworks.
  loader: ({ params }) => {
    const destination = getDestination(params.slug);
    if (destination && !destination.artworkTemplate) return { destination, work: undefined };
    const work = getAiWork(params.slug);
    if (!work) throw notFound();
    return { work, destination: undefined };
  },
  head: ({ loaderData }) =>
    loaderData?.destination
      ? destinationHead("en", loaderData.destination)
      : aiDetailHead("en", loaderData?.work),
  notFoundComponent: AiNotFoundView,
  component: Detail,
});

function Detail() {
  const { work, destination } = Route.useLoaderData();
  return destination ? (
    <DestinationView destination={destination} />
  ) : (
    <AiDetailView work={work!} />
  );
}
