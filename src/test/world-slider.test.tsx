import { fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { WorldSlider } from "@/components/world-slider";
import { messages } from "@/i18n/messages";

vi.mock("@/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n")>();
  return { ...actual, useT: () => ({ locale: "bg", t: messages.bg }) };
});

afterEach(() => vi.restoreAllMocks());

describe("WorldSlider", () => {
  it("renders three worlds and supports keyboard and button selection", () => {
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query.includes("prefers-reduced-motion"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );

    render(<WorldSlider />);

    const group = screen.getByRole("group", { name: "Избери свят" });
    const buttons = within(group).getAllByRole("button");
    expect(buttons).toHaveLength(3);

    const slider = screen.getByRole("slider", {
      name: "Граница между реалния и AI света",
    });
    expect(slider).toHaveAttribute("aria-valuenow", "50");
    fireEvent.keyDown(slider, { key: "ArrowRight" });
    expect(slider).toHaveAttribute("aria-valuenow", "54");

    fireEvent.click(buttons[1]!);
    expect(buttons[1]).toHaveAttribute("aria-pressed", "true");
    expect(buttons[0]).toHaveAttribute("aria-pressed", "false");
  });
});
