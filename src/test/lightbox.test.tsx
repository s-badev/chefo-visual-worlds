import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { photos } from "@/content/photos";
import { Lightbox } from "@/components/site";

vi.mock("@/i18n", () => ({
  useT: () => ({
    t: {
      lightbox: {
        prev: "Previous",
        next: "Next",
        close: "Close",
        zoomIn: "Zoom image",
        zoomOut: "Fit image to screen",
      },
    },
  }),
}));

function Viewer() {
  const [index, setIndex] = useState<number | null>(null);
  return (
    <>
      <button onClick={() => setIndex(0)}>Open viewer</button>
      <Lightbox items={photos.slice(0, 2)} index={index} onIndex={setIndex} />
    </>
  );
}

const artworkItems = [
  {
    slug: "portrait",
    image: "/portrait.webp",
    alt: "Portrait artwork",
    title: "Portrait",
    caption: "Portrait caption",
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
];

function ArtworkViewer() {
  const [index, setIndex] = useState<number | null>(null);
  return (
    <>
      <button onClick={() => setIndex(0)}>Open artwork</button>
      <Lightbox items={artworkItems} index={index} onIndex={setIndex} variant="artwork" />
    </>
  );
}

describe("Lightbox", () => {
  it("navigates by keys and touch, closes with Escape and returns focus", async () => {
    render(<Viewer />);
    const trigger = screen.getByRole("button", { name: "Open viewer" });
    trigger.focus();
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog");
    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();

    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(screen.getByText(/2 \/ 2/)).toBeInTheDocument();
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(screen.getByText(/1 \/ 2/)).toBeInTheDocument();

    fireEvent.touchStart(dialog, {
      touches: [{ clientX: 250, clientY: 100 }],
      changedTouches: [{ clientX: 250, clientY: 100 }],
    });
    fireEvent.touchEnd(dialog, {
      touches: [{ clientX: 100, clientY: 105 }],
      changedTouches: [{ clientX: 100, clientY: 105 }],
    });
    expect(screen.getByText(/2 \/ 2/)).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });

  it("keeps AI portrait and landscape artwork proportional and offers accessible zoom", async () => {
    render(<ArtworkViewer />);
    const trigger = screen.getByRole("button", { name: "Open artwork" });
    trigger.focus();
    fireEvent.click(trigger);

    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveAttribute("data-lightbox-variant", "artwork");

    const portrait = screen.getByRole("img", { name: "Portrait artwork" });
    expect(portrait).toHaveAttribute("width", "800");
    expect(portrait).toHaveAttribute("height", "1200");
    expect(portrait).toHaveClass("h-auto", "w-auto", "max-h-full", "max-w-full", "object-contain");
    expect(dialog.querySelector("[data-lightbox-caption]")).toHaveClass("md:absolute");

    const zoom = screen.getByRole("button", { name: "Zoom image" });
    fireEvent.click(zoom);
    expect(screen.getByRole("button", { name: "Fit image to screen" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(portrait).toHaveClass("max-h-none", "max-w-none", "cursor-zoom-out");
    expect(dialog.querySelector("[data-lightbox-stage]")).toHaveClass(
      "h-max",
      "min-h-full",
      "w-max",
      "min-w-full",
    );

    fireEvent.click(screen.getByRole("button", { name: "Next" }));
    const landscape = screen.getByRole("img", { name: "Landscape artwork" });
    expect(landscape).toHaveAttribute("width", "1600");
    expect(landscape).toHaveAttribute("height", "900");
    expect(landscape).toHaveClass("h-auto", "w-auto", "max-h-full", "max-w-full");
    expect(dialog.querySelector("[data-lightbox-caption]")).not.toHaveClass("md:absolute");
    expect(screen.getByRole("button", { name: "Zoom image" })).toHaveAttribute(
      "aria-pressed",
      "false",
    );

    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(trigger).toHaveFocus();
  });
});
