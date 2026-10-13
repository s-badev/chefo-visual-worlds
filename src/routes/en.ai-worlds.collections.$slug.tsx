import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { getAiCollection, isRetiredAiCollectionSlug } from "@/content/ai-collections";
import { AiCollectionView, aiCollectionHead, AiCollectionNotFoundView } from "@/views/ai-worlds";

export const Route = createFileRoute("/en/ai-worlds/collections/$slug")({
  loader: ({ params }) => {
    if (isRetiredAiCollectionSlug(params.slug)) throw redirect({ to: "/en/ai-worlds" });
    const collection = getAiCollection(params.slug);
    if (!collection) throw notFound();
    return { collection };
  },
  head: ({ loaderData }) => aiCollectionHead("en", loaderData?.collection),
  notFoundComponent: AiCollectionNotFoundView,
  component: CollectionRoute,
});

function CollectionRoute() {
  const { collection } = Route.useLoaderData();
  return <AiCollectionView collection={collection} />;
}
