import {
  RouterProvider,
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
} from "@tanstack/react-router";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  collectionText,
  getAiCollection,
  getAiCollections,
  getCollectionWorkSlugs,
} from "@/content/ai-collections";
import { getAiWork } from "@/content/ai-works";
import { messages } from "@/i18n/messages";
import { AiDetailView } from "@/views/ai-worlds";

const renderAt = async (path: string, view: () => ReactNode) => {
  const root = createRootRoute();
  const router = createRouter({
    routeTree: root.addChildren([
      createRoute({ getParentRoute: () => root, path: "$", component: view }),
    ]),
    history: createMemoryHistory({ initialEntries: [path] }),
  });
  await router.load();
  return render(<RouterProvider router={router} />);
};

beforeEach(() => {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
  Object.defineProperty(Element.prototype, "scrollIntoView", {
    configurable: true,
    value: vi.fn(),
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("AI artwork detail wayfinding", () => {
  it.each(["bg", "en"] as const)(
    "renders every collection and marks the current one in %s",
    async (locale) => {
      const collection = getAiCollection("historical-eras-rulers")!;
      const slug = getCollectionWorkSlugs(collection)[3]!;
      await renderAt(`${locale === "en" ? "/en" : ""}/ai-worlds/${slug}`, () => (
        <AiDetailView work={getAiWork(slug)!} />
      ));

      const button = screen.getByRole("button", {
        name: messages[locale].ai.switchCollectionName(
          collectionText(collection.shortTitle, locale),
        ),
      });
      fireEvent.click(button);
      const menu = screen.getByRole("group", { name: messages[locale].ai.switchCollection });
      const collectionLinks = within(menu).getAllByRole("link");
      expect(collectionLinks).toHaveLength(getAiCollections().length + 1);
      expect(within(menu).getByRole("link", { name: /You are here|Тук сте/ })).toHaveAttribute(
        "aria-current",
        "page",
      );
    },
  );

  it("supports switcher keyboard focus, Escape return and outside close", async () => {
    const collection = getAiCollection("historical-eras-rulers")!;
    const slug = getCollectionWorkSlugs(collection)[0]!;
    await renderAt(`/ai-worlds/${slug}`, () => <AiDetailView work={getAiWork(slug)!} />);
    const button = screen.getByRole("button", {
      name: messages.bg.ai.switchCollectionName(collectionText(collection.shortTitle, "bg")),
    });

    fireEvent.keyDown(button, { key: "ArrowDown" });
    const menu = screen.getByRole("group", { name: messages.bg.ai.switchCollection });
    const items = within(menu).getAllByRole("link").slice(0, 4);
    await waitFor(() => expect(items[0]).toHaveFocus());
    fireEvent.keyDown(items[0]!, { key: "ArrowDown" });
    expect(items[1]).toHaveFocus();
    fireEvent.keyDown(items[1]!, { key: "End" });
    expect(items[3]).toHaveFocus();
    fireEvent.keyDown(items[3]!, { key: "Home" });
    expect(items[0]).toHaveFocus();
    fireEvent.keyDown(items[0]!, { key: "Escape" });
    await waitFor(() => expect(button).toHaveFocus());
    expect(screen.queryByRole("group", { name: messages.bg.ai.switchCollection })).toBeNull();

    fireEvent.click(button);
    expect(
      screen.getByRole("group", { name: messages.bg.ai.switchCollection }),
    ).toBeInTheDocument();
    button.focus();
    fireEvent.keyDown(button, { key: "ArrowDown" });
    expect(
      within(screen.getByRole("group", { name: messages.bg.ai.switchCollection })).getAllByRole(
        "link",
      )[0],
    ).toHaveFocus();
    fireEvent.pointerDown(document.body);
    expect(screen.queryByRole("group", { name: messages.bg.ai.switchCollection })).toBeNull();
  });

  it("ignores global arrow navigation while the switcher is open", async () => {
    const collection = getAiCollection("historical-eras-rulers")!;
    const slug = getCollectionWorkSlugs(collection)[4]!;
    await renderAt(`/ai-worlds/${slug}`, () => <AiDetailView work={getAiWork(slug)!} />);
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    const button = screen.getByRole("button", {
      name: messages.bg.ai.switchCollectionName(collectionText(collection.shortTitle, "bg")),
    });
    fireEvent.click(button);
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(click).not.toHaveBeenCalled();
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() =>
      expect(screen.queryByRole("group", { name: messages.bg.ai.switchCollection })).toBeNull(),
    );
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(click).toHaveBeenCalledTimes(1);
  });

  it("ignores global arrow navigation while the lightbox is open", async () => {
    const work = getAiWork("chefo-srednovekoven-ritsar")!;
    await renderAt(`/ai-worlds/${work.slug}`, () => <AiDetailView work={work} />);
    fireEvent.click(
      screen.getByRole("button", { name: messages.bg.common.openFullscreen(work.title) }),
    );
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    fireEvent.keyDown(document, { key: "ArrowRight" });
    expect(click).not.toHaveBeenCalled();
  });

  it("renders ticks, current position, an internal next band and the full prompt", async () => {
    const collection = getAiCollection("historical-eras-rulers")!;
    const slug = getCollectionWorkSlugs(collection)[5]!;
    const work = getAiWork(slug)!;
    await renderAt(`/ai-worlds/${slug}`, () => <AiDetailView work={work} />);
    const ticks = screen.getAllByRole("link", { name: /\d{2} от 16/ });
    expect(ticks).toHaveLength(16);
    expect(ticks.filter((tick) => tick.getAttribute("aria-current") === "page")).toHaveLength(1);
    expect(screen.getByText(new RegExp(`^${messages.bg.ai.nextWork}`))).toBeInTheDocument();
    expect(screen.getByText(work.prompt)).toBeInTheDocument();
  });

  it("labels next and previous collection crossings and wraps the full cycle", async () => {
    const historical = getAiCollection("historical-eras-rulers")!;
    const historicalSlugs = getCollectionWorkSlugs(historical);
    const { unmount } = await renderAt(`/ai-worlds/${historicalSlugs.at(-1)}`, () => (
      <AiDetailView work={getAiWork(historicalSlugs.at(-1)!)!} />
    ));
    expect(screen.getByText(new RegExp(`^${messages.bg.ai.nextCollection}`))).toBeInTheDocument();
    unmount();

    await renderAt(`/ai-worlds/${historicalSlugs[0]}`, () => (
      <AiDetailView work={getAiWork(historicalSlugs[0]!)!} />
    ));
    expect(screen.getByText(new RegExp(`^${messages.bg.ai.prevCollection}`))).toBeInTheDocument();
  });

  it("keeps the old global navigation and omits wayfinding for an unassigned slug", async () => {
    const source = getAiWork("chefo-srednovekoven-ritsar")!;
    const unknown = { ...source, slug: "unassigned-test-work" };
    await renderAt(`/ai-worlds/${unknown.slug}`, () => <AiDetailView work={unknown} />);
    expect(screen.queryByRole("button", { name: /Смени колекцията/ })).toBeNull();
    const nav = screen.getByRole("navigation", { name: messages.bg.ai.others });
    expect(within(nav).getAllByRole("link")).toHaveLength(2);
    expect(within(nav).getByText(messages.bg.ai.prev)).toBeInTheDocument();
    expect(within(nav).getByText(messages.bg.ai.next)).toBeInTheDocument();
  });
});
