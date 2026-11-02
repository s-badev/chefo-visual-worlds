// Home photo cards' viewfinder: label from card data, fine-pointer only, show/hide, cleanup.
import { cleanup, render } from "@testing-library/react";
import { useRef, type ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { albumText, getPublishedAlbum } from "@/content/albums";
import {
  VIEWFINDER,
  VIEWFINDER_ACTIVE_CLASS,
  VIEWFINDER_QUERY,
  usePhotoViewfinder,
  viewfinderLabel,
} from "@/hooks/use-photo-viewfinder";
import { messages } from "@/i18n/messages";
import { HomeView } from "@/views/home";

let activeLocale: "bg" | "en" = "bg";

vi.mock("@/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n")>();
  return { ...actual, useT: () => ({ locale: activeLocale, t: messages[activeLocale] }) };
});

vi.mock("@/i18n/link", () => ({
  LocaleLink: ({
    to,
    slug,
    children,
    className,
    "data-viewfinder-label": label,
  }: {
    to: string;
    slug?: string;
    children: ReactNode;
    className?: string;
    "data-viewfinder-label"?: string;
  }) => (
    <a
      href={`${activeLocale === "en" ? "/en" : ""}${slug ? to.replace("$slug", slug) : to}`}
      className={className}
      data-viewfinder-label={label}
    >
      {children}
    </a>
  ),
}));

vi.mock("@/components/portrait", () => ({ PortraitSwitch: () => <div /> }));

/** matchMedia answering the fine-pointer and reduced-motion queries; everything else is false. */
const media = ({ fine, reduced = false }: { fine: boolean; reduced?: boolean }) =>
  vi.spyOn(window, "matchMedia").mockImplementation(
    (query: string) =>
      ({
        matches:
          query === VIEWFINDER_QUERY
            ? fine
            : query.includes("prefers-reduced-motion: reduce")
              ? reduced
              : false,
        media: query,
        addEventListener: () => {},
        removeEventListener: () => {},
      }) as unknown as MediaQueryList,
  );

function Grid() {
  const ref = useRef<HTMLDivElement>(null);
  usePhotoViewfinder(ref);
  return (
    <div ref={ref} data-testid="grid">
      <a href="#a" data-viewfinder-label="Несебър · 33 кадъра">
        <span>Несебър</span>
      </a>
      <a href="#b" data-viewfinder-label="София · 21 кадъра">
        София
      </a>
      <span data-testid="gap">gap</span>
    </div>
  );
}

const viewfinder = () => document.querySelector<HTMLElement>(".photo-viewfinder");
const move = (el: Element, x: number, y: number) =>
  el.dispatchEvent(new MouseEvent("pointermove", { bubbles: true, clientX: x, clientY: y }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  activeLocale = "bg";
});

describe("photo viewfinder label", () => {
  it.each(["bg", "en"] as const)(
    "joins the card title and the site's own photo count in %s",
    (locale) => {
      const t = messages[locale];
      expect(viewfinderLabel("Nessebar", t.photos.count(33))).toBe(
        locale === "bg" ? "Nessebar · 33 кадъра" : "Nessebar · 33 photos",
      );
      expect(viewfinderLabel("X", t.photos.count(1))).toBe(
        locale === "bg" ? "X · 1 кадър" : "X · 1 photo",
      );
    },
  );

  it.each(["bg", "en"] as const)(
    "labels every Home photo card from its album data (%s)",
    (locale) => {
      activeLocale = locale;
      media({ fine: false });
      const { container } = render(<HomeView />);
      const cards = Array.from(container.querySelectorAll<HTMLElement>("[data-viewfinder-label]"));
      expect(cards.map((c) => c.getAttribute("data-viewfinder-label"))).toEqual(
        (["nessebar", "sofia", "sunny-beach"] as const).map((slug) => {
          const album = getPublishedAlbum(slug)!;
          return viewfinderLabel(
            albumText(album.title, locale),
            messages[locale].photos.count(album.photos.length),
          );
        }),
      );
      // Only the photo cards opt in; nothing else on Home (worlds portraits, AI cards) does.
      expect(cards.every((c) => c.getAttribute("href")!.includes("/photography/albums/"))).toBe(
        true,
      );
      // Touch-like default: no viewfinder element is created.
      expect(viewfinder()).toBeNull();
    },
  );
});

describe("photo viewfinder behaviour", () => {
  it("adds no element and no listeners without a fine, hovering pointer", () => {
    media({ fine: false });
    const gridAdd = vi.spyOn(HTMLDivElement.prototype, "addEventListener");
    const winAdd = vi.spyOn(window, "addEventListener");
    render(<Grid />);
    expect(viewfinder()).toBeNull();
    const own = gridAdd.mock.contexts.filter(
      (el) => (el as HTMLElement).dataset?.["testid"] === "grid",
    );
    expect(own).toHaveLength(0);
    expect(winAdd.mock.calls.filter(([type]) => type === "scroll" || type === "blur")).toHaveLength(
      0,
    );
  });

  it("follows the pointer centred, labels the card, hides the cursor there, and leaves cleanly", () => {
    media({ fine: true });
    const { getByTestId, getByText } = render(<Grid />);
    const vf = viewfinder()!;
    expect(vf).not.toBeNull();
    expect(vf.getAttribute("aria-hidden")).toBe("true");
    expect(vf.style.pointerEvents).toBe("none");
    expect(vf.style.position).toBe("fixed");
    expect(vf.style.opacity).toBe("0");
    expect(vf.style.transition).toBe(`opacity ${VIEWFINDER.fadeMs}ms ease`);
    // The dark halo sits on the four brackets and the dot only, never on the label.
    const parts = Array.from(vf.children) as HTMLElement[];
    expect(parts).toHaveLength(6);
    parts.slice(0, 5).forEach((p) => expect(p.style.filter).toBe(VIEWFINDER.halo));
    expect(parts[5]!.style.filter).toBe("");

    const [a, b] = Array.from(getByTestId("grid").querySelectorAll("a"));
    move(getByText("Несебър"), 200, 150);
    const half = VIEWFINDER.frame / 2;
    expect(vf.style.transform).toBe(`translate3d(${200 - half}px, ${150 - half}px, 0)`);
    expect(vf.style.opacity).toBe("1");
    expect(vf.textContent).toBe("Несебър · 33 кадъра");
    expect(a).toHaveClass(VIEWFINDER_ACTIVE_CLASS);

    // Between cards the label follows; the cursor class moves with it.
    move(b!, 400, 160);
    expect(vf.textContent).toBe("София · 21 кадъра");
    expect(a).not.toHaveClass(VIEWFINDER_ACTIVE_CLASS);
    expect(b).toHaveClass(VIEWFINDER_ACTIVE_CLASS);

    // Over the gap (inside the grid, not a card) it fades out.
    move(getByTestId("gap"), 10, 10);
    expect(vf.style.opacity).toBe("0");
    expect(b).not.toHaveClass(VIEWFINDER_ACTIVE_CLASS);

    move(a!, 50, 50);
    getByTestId("grid").dispatchEvent(new MouseEvent("pointerleave"));
    expect(vf.style.opacity).toBe("0");
    expect(a).not.toHaveClass(VIEWFINDER_ACTIVE_CLASS);

    move(a!, 50, 50);
    window.dispatchEvent(new Event("blur"));
    expect(vf.style.opacity).toBe("0");
  });

  it("ignores touch pointers and keyboard focus", () => {
    media({ fine: true });
    const { getByTestId } = render(<Grid />);
    const a = getByTestId("grid").querySelector("a")!;
    const touch = new MouseEvent("pointermove", { bubbles: true, clientX: 5, clientY: 5 });
    Object.defineProperty(touch, "pointerType", { value: "touch" });
    a.dispatchEvent(touch);
    a.focus();
    a.dispatchEvent(new FocusEvent("focusin", { bubbles: true }));
    expect(viewfinder()!.style.opacity).toBe("0");
    expect(a).not.toHaveClass(VIEWFINDER_ACTIVE_CLASS);
  });

  it("removes the element, the cursor class and its listeners on unmount", () => {
    media({ fine: true });
    const winRemove = vi.spyOn(window, "removeEventListener");
    const { getByTestId, unmount } = render(<Grid />);
    const a = getByTestId("grid").querySelector("a")!;
    move(a, 20, 20);
    expect(a).toHaveClass(VIEWFINDER_ACTIVE_CLASS);
    unmount();
    expect(viewfinder()).toBeNull();
    expect(a).not.toHaveClass(VIEWFINDER_ACTIVE_CLASS);
    expect(winRemove.mock.calls.map(([type]) => type)).toEqual(
      expect.arrayContaining(["scroll", "blur"]),
    );
  });

  it("fades without a transition under reduced motion (the follow is instant either way)", () => {
    media({ fine: true, reduced: true });
    const { getByTestId } = render(<Grid />);
    const vf = viewfinder()!;
    expect(vf.style.transition).toBe("none");
    move(getByTestId("grid").querySelector("a")!, 90, 90);
    expect(vf.style.opacity).toBe("1");
    expect(vf.style.transform).toBe(
      `translate3d(${90 - VIEWFINDER.frame / 2}px, ${90 - VIEWFINDER.frame / 2}px, 0)`,
    );
  });

  it("keeps the tuning in one place with the approved sizes", () => {
    expect(VIEWFINDER).toMatchObject({
      frame: 78,
      corner: 16,
      stroke: 1.5,
      dot: 4,
      gold: "#C9A46B",
      labelGap: 10,
      labelFont: 10.5,
      labelWeight: 600,
      labelTracking: "0.16em",
      fadeMs: 200,
    });
    expect(VIEWFINDER.zIndex).toBeLessThan(40);
    expect(VIEWFINDER.halo).toBe(
      "drop-shadow(0 0 1px rgba(12, 23, 41, 0.9)) drop-shadow(0 0 2px rgba(12, 23, 41, 0.55))",
    );
  });
});
