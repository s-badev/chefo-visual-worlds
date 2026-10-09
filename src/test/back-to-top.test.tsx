import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BackToTop } from "@/components/back-to-top";

vi.mock("@/i18n", () => ({ useT: () => ({ t: { common: { backToTop: "Back to top" } } }) }));

afterEach(() => {
  Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
  vi.restoreAllMocks();
});

describe("BackToTop", () => {
  it("appears after scrolling and returns to the top", () => {
    Object.defineProperty(window, "scrollY", { configurable: true, value: 0 });
    const scrollTo = vi.spyOn(window, "scrollTo").mockImplementation(() => {});
    render(<BackToTop />);
    expect(screen.queryByRole("button", { name: "Back to top" })).not.toBeInTheDocument();

    Object.defineProperty(window, "scrollY", { configurable: true, value: 900 });
    fireEvent.scroll(window);
    fireEvent.click(screen.getByRole("button", { name: "Back to top" }));
    expect(scrollTo).toHaveBeenCalledWith({ top: 0, behavior: "smooth" });
  });
});
