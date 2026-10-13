import { createFileRoute, notFound } from "@tanstack/react-router";
import { getAiWork } from "@/content/ai-works";
import { getDestination } from "@/content/ai-destinations";
import { AiDetailView, aiDetailHead, AiNotFoundView } from "@/views/ai-worlds";
import { DestinationView, destinationHead } from "@/components/ai-atlas";

export const Route = createFileRoute("/ai-worlds/$slug")({
  // A "Chefo Around the World" destination owns its slug; its portrait, once published,
  // is the AiWork with the same slug and is shown on the destination page.
  loader: ({ params }) => {
    const destination = getDestination(params.slug);
    if (destination) return { destination, work: undefined };
    const work = getAiWork(params.slug);
    if (!work) throw notFound();
    return { work, destination: undefined };
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
  return destination ? (
    <DestinationView destination={destination} />
  ) : (
    <AiDetailView work={work!} />
  );
}
