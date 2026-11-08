import { createFileRoute, notFound } from "@tanstack/react-router";
import { getAiWork } from "@/content/ai-works";
import { getDestination } from "@/content/ai-destinations";
import { AiDetailView, aiDetailHead, AiNotFoundView } from "@/views/ai-worlds";
import { DestinationView, destinationHead } from "@/components/ai-atlas";

export const Route = createFileRoute("/en/ai-worlds/$slug")({
  // See ai-worlds.$slug.tsx: published portraits share the artwork presentation.
  loader: ({ params }) => {
    const destination = getDestination(params.slug);
    const work = getAiWork(params.slug);
    if (work) return { work, destination };
    if (destination) return { destination, work: undefined };
    throw notFound();
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
  return work ? <AiDetailView work={work} /> : <DestinationView destination={destination!} />;
}
