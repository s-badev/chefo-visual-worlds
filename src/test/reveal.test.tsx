import { Suspense, act, lazy } from "react";
import { hydrateRoot } from "react-dom/client";
import { renderToString } from "react-dom/server";
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { reveal } from "@/hooks/use-reveal";

const observed = new Set<Element>();

class FakeObserver {
  observe(el: Element) {
    observed.add(el);
  }
  unobserve(el: Element) {
    observed.delete(el);
  }
  disconnect() {}
}

function Item() {
  return (
    <div data-testid="item" {...reveal(1)}>
      Below the fold
    </div>
  );
}

const reducedMotion = (matches: boolean) =>
  vi
    .spyOn(window, "matchMedia")
    .mockImplementation((query: string) => ({ matches, media: query }) as MediaQueryList);

beforeEach(() => {
  observed.clear();
  vi.stubGlobal("IntersectionObserver", FakeObserver);
  vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => setTimeout(() => cb(0), 0));
  vi.stubGlobal("cancelAnimationFrame", (id: number) => clearTimeout(id));
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockReturnValue({ top: 5000 } as DOMRect);
  reducedMotion(false);
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const nextFrame = () => act(() => new Promise((resolve) => setTimeout(resolve, 5)));

describe("scroll reveal", () => {
  it("leaves server markup alone until React hydrates a lazily loaded route", async () => {
    const container = document.createElement("main");
    container.innerHTML = renderToString(
      <Suspense fallback={null}>
        <Item />
      </Suspense>,
    );
    document.body.appendChild(container);
    const errors = vi.spyOn(console, "error").mockImplementation(() => {});

    let load!: (module: { default: typeof Item }) => void;
    const LazyItem = lazy(
      () => new Promise<{ default: typeof Item }>((resolve) => (load = resolve)),
    );
    await act(async () => {
      hydrateRoot(
        container,
        <Suspense fallback={null}>
          <LazyItem />
        </Suspense>,
      );
    });
    await nextFrame();
    const item = container.querySelector<HTMLElement>("[data-testid=item]")!;
    expect(item.dataset["reveal"]).toBe("");

    await act(async () => load({ default: Item }));
    await nextFrame();
    expect(item.dataset["reveal"]).toBe("pending");
    expect(observed.has(item)).toBe(true);
    expect(errors.mock.calls.flat().join(" ")).not.toMatch(/hydrat/i);
    container.remove();
  });

  it("never leaves content hidden after unmounting", async () => {
    const { getByTestId, unmount } = render(<Item />);
    const item = getByTestId("item");
    await nextFrame();
    expect(item.dataset["reveal"]).toBe("pending");
    unmount();
    expect(item.dataset["reveal"]).toBe("");
    expect(observed.has(item)).toBe(false);
  });

  it("keeps content visible for reduced-motion visitors", async () => {
    reducedMotion(true);
    const { getByTestId } = render(<Item />);
    await nextFrame();
    expect(getByTestId("item").dataset["reveal"]).toBe("");
    expect(observed.size).toBe(0);
  });
});
