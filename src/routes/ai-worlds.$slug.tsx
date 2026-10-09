import { createFileRoute, notFound } from "@tanstack/react-router";
import { getAiWork } from "@/content/ai-works";
import { AiDetailView, aiDetailHead, AiNotFoundView } from "@/views/ai-worlds";

export const Route = createFileRoute("/ai-worlds/$slug")({
  loader: ({ params }) => {
    const work = getAiWork(params.slug);
    if (!work) throw notFound();
    return { work };
  },
  head: ({ loaderData }) => aiDetailHead("bg", loaderData?.work),
  notFoundComponent: AiNotFoundView,
  component: Detail,
});

function Detail() {
  const { work } = Route.useLoaderData();
  return <AiDetailView work={work} />;
}
