import { createFileRoute } from "@tanstack/react-router";
import { AiWorldsView, aiWorldsHead, validateAiSearch } from "@/views/ai-worlds";

export const Route = createFileRoute("/ai-worlds/")({
  validateSearch: validateAiSearch,
  head: () => aiWorldsHead("bg"),
  component: AiWorldsView,
});
