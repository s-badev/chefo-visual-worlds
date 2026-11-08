import { createFileRoute, notFound } from "@tanstack/react-router";
import { getAiWork } from "@/content/ai-works";
import { getDestination } from "@/content/ai-destinations";
import { AiDetailView, aiDetailHead, AiNotFoundView } from "@/views/ai-worlds";
import { DestinationView, destinationHead } from "@/components/ai-atlas";

export const Route = createFileRoute("/ai-worlds/$slug")({
  // Published destination portraits use the shared artwork presentation while keeping the
  // destination's established metadata. Planned destinations retain their atlas detail page.
  loader: ({ params }) => {
    const destination = getDestination(params.slug);
    const work = getAiWork(params.slug);
    if (work) return { work, destination };
    if (destination) return { destination, work: undefined };
    throw notFound();
  },
  head: ({ loaderData }) =>
    loaderData?.destination
      ? destinationHead("bg", loaderData.destination)
      : aiDetailHead("bg", loaderData?.work),
  notFoundComponent: AiNotFoundView,
  component: Detail,
});

function Detail() {
  const { work, destination } = Route.useLoaderData();
  return work ? <AiDetailView work={work} /> : <DestinationView destination={destination!} />;
}
