import { useState } from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { photos } from "@/content/photos";
import { Lightbox } from "@/components/site";

vi.mock("@/i18n", () => ({
  useT: () => ({ t: { lightbox: { prev: "Previous", next: "Next", close: "Close" } } }),
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
});
