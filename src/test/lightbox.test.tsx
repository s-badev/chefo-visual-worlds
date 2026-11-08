import { useRef, useState } from "react";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { photos } from "@/content/photos";
import { Lightbox, type LightboxItem } from "@/components/site";

vi.mock("@/i18n", () => ({
  useT: () => ({
    t: {
      lightbox: {
        prev: "Previous",
        next: "Next",
        close: "Close",
        zoomIn: "Zoom image",
        zoomOut: "Fit image to screen",
        details: "Details and prompt",
      },
    },
  }),
}));

vi.mock("@/i18n/link", () => ({
  LocaleLink: ({
    to,
    slug,
    children,
    ...rest
  }: {
    to: string;
    slug?: string;
    children: React.ReactNode;
  }) => (
    <a href={slug ? to.replace("$slug", slug) : to} {...rest}>
      {children}
    </a>
  ),
}));

// jsdom has no PointerEvent: a MouseEvent with the pointer fields is enough for the viewer.
beforeAll(() => {
  if (!("PointerEvent" in window)) {
    class PointerEventShim extends MouseEvent {
      pointerId: number;
      pointerType: string;
      constructor(type: string, init: PointerEventInit = {}) {
        super(type, init);
        this.pointerId = init.pointerId ?? 1;
        this.pointerType = init.pointerType ?? "mouse";
      }
    }
    Object.defineProperty(window, "PointerEvent", { value: PointerEventShim, writable: true });
  }
});

const originalMatchMedia = window.matchMedia;
const originalRect = HTMLElement.prototype.getBoundingClientRect;
afterEach(() => {
  window.matchMedia = originalMatchMedia;
  HTMLElement.prototype.getBoundingClientRect = originalRect;
  Object.defineProperty(window, "innerWidth", { value: 1024, configurable: true, writable: true });
  document.querySelectorAll(".lb-ghost").forEach((ghost) => ghost.remove());
});

const reduceMotion = () => {
  window.matchMedia = ((query: string) => ({
    matches: query.includes("prefers-reduced-motion"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
};

/** Gives the stage, the viewer image and thumbnails real boxes (jsdom has no layout). */
const layout = () => {
  HTMLElement.prototype.getBoundingClientRect = function (this: HTMLElement) {
    const box = (left: number, top: number, width: number, height: number) =>
      ({
        left,
        top,
        width,
        height,
        x: left,
        y: top,
        right: left + width,
        bottom: top + height,
        toJSON: () => ({}),
      }) as DOMRect;
    if (this.classList.contains("lb-stage")) return box(100, 80, 1000, 700);
    if (this.matches("[data-lightbox-image]")) {
      const w = parseFloat(this.style.width) || 0;
      const h = parseFloat(this.style.height) || 0;
      return box(100 + (1000 - w) / 2, 80 + (700 - h) / 2, w, h);
    }
    if (this.matches("[data-thumb] img, [data-thumb]")) return box(10, 20, 100, 125);
    return box(0, 0, 0, 0);
  };
};

function Viewer() {
  const [index, setIndex] = useState<number | null>(null);
  return (
    <>
      <button onClick={() => setIndex(0)}>Open viewer</button>
      <Lightbox items={photos.slice(0, 2)} index={index} onIndex={setIndex} />
    </>
  );
}

const artworkItems: LightboxItem[] = [
  {
    slug: "portrait",
    image: "/portrait.webp",
    alt: "Portrait artwork",
    title: "Portrait",
    caption: "Portrait caption",
    meta: "AI generated · Cinema",
    detail: { to: "/ai-worlds/$slug", slug: "portrait" },
    width: 800,
    height: 1200,
  },
  {
    slug: "landscape",
    image: "/landscape.webp",
    alt: "Landscape artwork",
    title: "Landscape",
    caption: "Landscape caption",
    width: 1600,
    height: 900,
  },
  {
    slug: "third",
    image: "/third.webp",
    alt: "Third artwork",
    title: "Third",
    width: 1000,
    height: 1250,
  },
];

function ArtworkViewer({
  items = artworkItems,
  withThumbs = false,
}: {
  items?: LightboxItem[];
  withThumbs?: boolean;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const grid = useRef<HTMLDivElement>(null);
  return (
    <>
      <div ref={grid}>
        {items.map((item, i) => (
          <button key={item.slug} data-thumb={i} onClick={() => setIndex(i)}>
            <img src={item.image} alt="" />
            Open {item.title}
          </button>
        ))}
      </div>
      <Lightbox
        items={items}
        index={index}
        onIndex={setIndex}
        variant="artwork"
        getThumb={
          withThumbs
            ? (i) => grid.current?.querySelector<HTMLElement>(`[data-thumb="${i}"]`)
            : undefined
        }
      />
    </>
  );
}

const counter = (dialog: HTMLElement) => dialog.querySelector(".lb-count")?.textContent;
const openArtwork = async (index = 0, withThumbs = false) => {
  render(<ArtworkViewer withThumbs={withThumbs} />);
  const trigger = screen.getByRole("button", { name: `Open ${artworkItems[index]!.title}` });
  trigger.focus();
  fireEvent.click(trigger);
  const dialog = await screen.findByRole("dialog");
  return { trigger, dialog };
};
const stageOf = (dialog: HTMLElement) =>
  dialog.querySelector<HTMLElement>("[data-lightbox-stage]")!;
const panOf = (dialog: HTMLElement) => dialog.querySelector<HTMLElement>(".lb-pan")!;

describe("Lightbox", () => {
  it("navigates by keys and swipe, closes with Escape and returns focus", async () => {
    render(<Viewer />);
    const trigger = screen.getByRole("button", { name: "Open viewer" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog");
    expect(screen.getByText("01 / 02")).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText("02 / 02")).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText("01 / 02")).toBeInTheDocument();

    // A touch swipe to the left shows the next photograph.
    const stage = stageOf(dialog);
    const touch = { pointerId: 7, pointerType: "touch" };
    fireEvent.pointerDown(stage, { ...touch, clientX: 250, clientY: 100 });
    fireEvent.pointerMove(stage, { ...touch, clientX: 180, clientY: 102 });
    fireEvent.pointerMove(stage, { ...touch, clientX: 100, clientY: 105 });
    fireEvent.pointerUp(stage, { ...touch, clientX: 100, clientY: 105 });
    expect(screen.getByText("02 / 02")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("keeps AI portrait and landscape artwork proportional and offers accessible zoom", async () => {
    layout();
    const { trigger, dialog } = await openArtwork();
    expect(dialog).toHaveAttribute("data-lightbox-variant", "artwork");

    // Portrait 800 x 1200 in a 1000 x 700 stage: fitted to 467 x 700, side card at 1024px.
    const portrait = screen.getByRole("img", { name: "Portrait artwork" });
    expect(portrait).toHaveAttribute("width", "800");
    expect(portrait).toHaveAttribute("height", "1200");
    expect(portrait.style.width).toBe("467px");
    expect(portrait.style.height).toBe("700px");
    expect(dialog).toHaveAttribute("data-layout", "side");

    const zoom = screen.getByRole("button", { name: "Zoom image" });
    fireEvent.click(zoom);
    expect(screen.getByRole("button", { name: "Fit image to screen" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(dialog).toHaveAttribute("data-zoomed");
    expect(panOf(dialog).style.transform).toContain("scale(2.400)");

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const landscape = screen.getByRole("img", { name: "Landscape artwork" });
    expect(landscape).toHaveAttribute("width", "1600");
    expect(landscape).toHaveAttribute("height", "900");
    // Landscape 1600 x 900: width bound, 1000 x 563, bottom card.
    expect(landscape.style.width).toBe("1000px");
    expect(landscape.style.height).toBe("563px");
    expect(dialog).toHaveAttribute("data-layout", "bottom");
    expect(screen.getByRole("button", { name: "Zoom image" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    expect(dialog).not.toHaveAttribute("data-zoomed");

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("labels the dialog with the title and shows the card: title, description, meta, counter", async () => {
    const { dialog } = await openArtwork();
    expect(screen.getByRole("dialog", { name: "Portrait" })).toBe(dialog);
    const card = dialog.querySelector<HTMLElement>("[data-lightbox-caption]")!;
    expect(within(card).getByRole("heading", { name: "Portrait" })).toHaveClass("lb-title");
    expect(within(card).getByText("Portrait caption")).toHaveClass("lb-desc");
    expect(within(card).getByText("AI generated · Cinema")).toHaveClass("lb-meta");
    expect(counter(dialog)).toBe("01 / 03");
    expect(card).toHaveAttribute("aria-live", "polite");
    // Close has focus first, as in the mock.
    expect(screen.getByRole("button", { name: "Close" })).toHaveFocus();
  });

  it("offers the artwork page only for items that have one", async () => {
    const { dialog } = await openArtwork();
    expect(within(dialog).getByRole("link", { name: /Details and prompt/ })).toHaveAttribute(
      "href",
      "/ai-worlds/portrait",
    );
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(within(dialog).queryByRole("link")).toBeNull();
  });

  it("stops at the ends: disabled previous / next, Home and End", async () => {
    const { dialog } = await openArtwork();
    const prev = screen.getByRole("button", { name: "Previous" });
    const next = screen.getByRole("button", { name: "Next" });
    expect(prev).toBeDisabled();
    expect(next).toBeEnabled();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(counter(dialog)).toBe("01 / 03");
    fireEvent.keyDown(window, { key: "End" });
    expect(counter(dialog)).toBe("03 / 03");
    expect(next).toBeDisabled();
    expect(prev).toBeEnabled();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(counter(dialog)).toBe("03 / 03");
    fireEvent.keyDown(window, { key: "Home" });
    expect(counter(dialog)).toBe("01 / 03");
  });

  it("Escape first resets the zoom, then closes", async () => {
    const { trigger, dialog } = await openArtwork();
    fireEvent.keyDown(window, { key: "+" });
    expect(dialog).toHaveAttribute("data-zoomed");
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.getByRole("dialog")).toBe(dialog);
    expect(dialog).not.toHaveAttribute("data-zoomed");
    expect(screen.getByRole("button", { name: "Zoom image" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("zooms with + and - by 1.4 and with the wheel; the wheel never scrolls the page", async () => {
    layout();
    const { dialog } = await openArtwork();
    const pan = panOf(dialog);
    fireEvent.keyDown(window, { key: "+" });
    expect(pan.style.transform).toContain("scale(1.400)");
    fireEvent.keyDown(window, { key: "=" });
    expect(pan.style.transform).toContain("scale(1.960)");
    fireEvent.keyDown(window, { key: "-" });
    expect(pan.style.transform).toContain("scale(1.400)");
    fireEvent.keyDown(window, { key: "-" });
    expect(dialog).not.toHaveAttribute("data-zoomed");
    const wheel = new WheelEvent("wheel", {
      deltaY: -200,
      clientX: 600,
      clientY: 430,
      cancelable: true,
    });
    act(() => {
      stageOf(dialog).dispatchEvent(wheel);
    });
    expect(wheel.defaultPrevented).toBe(true);
    expect(pan.style.transform).toContain(`scale(${Math.exp(0.44).toFixed(3)})`);
  });

  it("a double tap on the image zooms to 2.4 and back; a tap on the empty stage closes", async () => {
    layout();
    const { dialog } = await openArtwork();
    const img = screen.getByRole("img", { name: "Portrait artwork" });
    const tap = (target: HTMLElement, x = 600, y = 430) => {
      fireEvent.pointerDown(target, { pointerId: 1, pointerType: "touch", clientX: x, clientY: y });
      fireEvent.pointerUp(target, { pointerId: 1, pointerType: "touch", clientX: x, clientY: y });
    };
    tap(img);
    expect(dialog).not.toHaveAttribute("data-zoomed");
    tap(img);
    expect(dialog).toHaveAttribute("data-zoomed");
    expect(panOf(dialog).style.transform).toContain("scale(2.400)");
    tap(img);
    tap(img);
    expect(dialog).not.toHaveAttribute("data-zoomed");
    tap(stageOf(dialog), 150, 100);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
  });

  it("pans a zoomed image within bounds and a pan is never a swipe", async () => {
    layout();
    const { dialog } = await openArtwork();
    fireEvent.click(screen.getByRole("button", { name: "Zoom image" }));
    const stage = stageOf(dialog);
    const p = { pointerId: 3, pointerType: "mouse" };
    fireEvent.pointerDown(stage, { ...p, clientX: 600, clientY: 400 });
    fireEvent.pointerMove(stage, { ...p, clientX: 2600, clientY: 4400 });
    fireEvent.pointerUp(stage, { ...p, clientX: 2600, clientY: 4400 });
    // 467 x 700 at 2.4 = 1120.8 x 1680 in a 1000 x 700 stage: at most 60.4 / 490 each way.
    expect(panOf(dialog).style.transform).toBe("translate(60.4px, 490.0px) scale(2.400)");
    expect(counter(dialog)).toBe("01 / 03");
  });

  it("hides the card while zoomed (opacity 0, no pointer events)", async () => {
    const css = readFileSync(resolve(process.cwd(), "src/styles.css"), "utf8").replace(
      /\r\n/g,
      "\n",
    );
    expect(css).toMatch(
      /\.lb\[data-zoomed\] \.lb-card \{\n {2}opacity: 0;\n {2}pointer-events: none;\n\}/,
    );
    const { dialog } = await openArtwork();
    fireEvent.click(screen.getByRole("button", { name: "Zoom image" }));
    expect(dialog).toHaveAttribute("data-zoomed");
    expect(dialog.querySelector("[data-lightbox-caption]")).toBeInTheDocument();
  });

  it("uses the side card for portrait images from 900px, the bottom card on phones", async () => {
    Object.defineProperty(window, "innerWidth", { value: 390, configurable: true, writable: true });
    const { dialog } = await openArtwork();
    expect(dialog).toHaveAttribute("data-layout", "bottom");
  });

  it("keeps Tab inside the dialog and wraps", async () => {
    const { dialog } = await openArtwork(1);
    const next = screen.getByRole("button", { name: "Next" });
    const zoom = screen.getByRole("button", { name: "Zoom image" });
    // Tab order: zoom, close, previous, next (no link on this item).
    next.focus();
    fireEvent.keyDown(next, { key: "Tab" });
    expect(zoom).toHaveFocus();
    fireEvent.keyDown(zoom, { key: "Tab", shiftKey: true });
    expect(next).toHaveFocus();
    expect(dialog.contains(document.activeElement)).toBe(true);
  });

  it("flies the image out of the thumbnail when one is given", async () => {
    layout();
    const { dialog } = await openArtwork(0, true);
    const img = dialog.querySelector<HTMLElement>("[data-lightbox-image]")!;
    expect(img.style.transition).toBe("transform 420ms cubic-bezier(.22,1,.36,1)");
    expect(img.style.transformOrigin).toBe("0 0");
    expect(img.style.transform).toBe("none");
  });

  it("falls back to a fade without a thumbnail, and slides between items", async () => {
    layout();
    const { dialog } = await openArtwork(0, false);
    const img = dialog.querySelector<HTMLElement>("[data-lightbox-image]")!;
    expect(img.style.transition).toBe("none");
    expect(img.style.transform).toBe("");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(img.style.transition).toBe("opacity 260ms, transform 320ms cubic-bezier(.22,1,.36,1)");
    expect(img.style.opacity).toBe("1");
  });

  it("flies back into the current thumbnail and returns focus to it", async () => {
    layout();
    const { dialog } = await openArtwork(0, true);
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(counter(dialog)).toBe("02 / 03");
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(screen.getByRole("button", { name: "Open Landscape" })).toHaveFocus();
    const ghost = document.querySelector<HTMLElement>(".lb-ghost")!;
    expect(ghost).toHaveAttribute("aria-hidden", "true");
    expect(ghost.querySelector<HTMLElement>("[data-lightbox-image]")!.style.transition).toBe(
      "transform 240ms cubic-bezier(.4,0,1,1)",
    );
  });

  it("with reduced motion: no fly, no slide, and it closes instantly", async () => {
    reduceMotion();
    layout();
    const { trigger, dialog } = await openArtwork(0, true);
    const img = dialog.querySelector<HTMLElement>("[data-lightbox-image]")!;
    expect(img.style.transform).toBe("");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(img.style.transform).toBe("");
    expect(img.style.opacity).toBe("");
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(document.querySelector(".lb-ghost")).toBeNull();
    // Radix hands focus back on the next tick.
    await waitFor(() => expect(trigger).toHaveFocus());
  });
});
