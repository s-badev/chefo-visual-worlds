// Albums map + mobile route bar: pure geometry/timing, pin coverage and the desktop hover contract.
import { readFileSync } from "node:fs";
import path from "node:path";
import { act, fireEvent, render, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PhotographyEditorial } from "@/components/photography-editorial";
import {
  COAST_PIN_SLUG,
  FLIGHT_ENTRY,
  MAP_PINS_BALKANS,
  MAP_PINS_EUROPE,
} from "@/content/album-map";
import { getAlbums, getPublishedAlbums } from "@/content/albums";
import { messages } from "@/i18n/messages";
import {
  ALBUM_MAP,
  flightControlPoint,
  flightDuration,
  routeArcPoint,
  routeDotX,
  routeFlightDuration,
} from "@/lib/album-map";
import {
  flightStart,
  isCoastSlug,
  lensPoint,
  mapLayerOf,
  pinPoint,
  pinSlugOf,
} from "@/lib/album-map-pins";
import { ALBUM_PREVIEW } from "@/lib/album-preview";

vi.mock("@/i18n", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/i18n")>();
  return { ...actual, useT: () => ({ locale: "bg", t: messages.bg }) };
});
vi.mock("@/i18n/link", () => ({
  LocaleLink: ({
    slug,
    children,
    className,
    "aria-current": current,
    "aria-label": label,
  }: {
    slug?: string;
    children: ReactNode;
    className?: string;
    "aria-current"?: "true";
    "aria-label"?: string;
  }) => (
    <a
      href={`/photography/albums/${slug}`}
      className={className}
      aria-current={current}
      aria-label={label}
    >
      {children}
    </a>
  ),
}));

const css = readFileSync(path.resolve(__dirname, "../styles.css"), "utf8").replace(/\s+/g, " ");

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("album map data", () => {
  it("gives every published album a pin on its layer, and coast albums a lens pin", () => {
    const published = getPublishedAlbums();
    expect(published.length).toBeGreaterThan(0);
    for (const album of published) {
      const layer = mapLayerOf(album.slug);
      expect(MAP_PINS_EUROPE[album.slug], album.slug).toBeDefined();
      expect(pinPoint(layer, album.slug), album.slug).not.toBeNull();
      if (layer === "balkans") expect(MAP_PINS_BALKANS[album.slug], album.slug).toBeDefined();
      if (isCoastSlug(album.slug)) expect(lensPoint(album.slug), album.slug).not.toBeNull();
    }
  });

  it("chooses the layer per album and shares one coast pin on the big layers", () => {
    expect(["tunisia", "paris", "lyon", "bodrum"].map(mapLayerOf)).toEqual([
      "europe",
      "europe",
      "europe",
      "europe",
    ]);
    expect(["sofia", "plovdiv", "rila", "istanbul", "edirne"].map(mapLayerOf)).toEqual([
      "balkans",
      "balkans",
      "balkans",
      "balkans",
      "balkans",
    ]);
    const coast = ["sunny-beach", "sveti-vlas", "nessebar", "burgas"];
    for (const slug of coast) {
      expect(mapLayerOf(slug)).toBe("balkans");
      expect(pinSlugOf(slug)).toBe(COAST_PIN_SLUG);
      expect(pinPoint("balkans", slug)).toEqual(MAP_PINS_BALKANS[COAST_PIN_SLUG]);
      expect(pinPoint("europe", slug)).toEqual(MAP_PINS_EUROPE[COAST_PIN_SLUG]);
      expect(lensPoint(slug)).toEqual(MAP_PINS_BALKANS[slug]);
    }
    expect(lensPoint("sofia")).toBeNull();
    expect(pinPoint("balkans", "paris")).toBeNull();
  });

  it("starts a flight at the previous album on the target layer, else at the layer edge", () => {
    expect(flightStart(null, "paris")).toEqual(FLIGHT_ENTRY.europe);
    expect(flightStart("sofia", "paris")).toEqual(MAP_PINS_EUROPE["sofia"]);
    expect(flightStart("paris", "sofia")).toEqual(FLIGHT_ENTRY.balkans);
    expect(flightStart("nessebar", "plovdiv")).toEqual(MAP_PINS_BALKANS[COAST_PIN_SLUG]);
  });
});

describe("album map flight", () => {
  it("lasts clamp(700 + 3d, 900, 1800) ms", () => {
    expect(flightDuration(0)).toBe(900);
    expect(flightDuration(100)).toBe(1000);
    expect(flightDuration(300)).toBe(1600);
    expect(flightDuration(1000)).toBe(1800);
  });

  it("lifts the control point min(90, d * .35) + 10 above the midpoint", () => {
    expect(flightControlPoint([0, 100], [100, 100])).toEqual([50, 100 - 35 - 10]);
    expect(flightControlPoint([0, 300], [400, 300])).toEqual([200, 300 - 90 - 10]);
  });
});

describe("mobile route bar", () => {
  it("places 13 dots from x 14 to x 344 and arcs the plane over the baseline", () => {
    const xs = getAlbums().map((_, k, all) => routeDotX(k, all.length));
    expect(xs).toHaveLength(13);
    expect(xs[0]).toBe(14);
    expect(xs[12]).toBeCloseTo(344, 6);
    expect(xs[1]! - xs[0]!).toBeCloseTo(330 / 12, 6);
    expect(routeArcPoint(14, 344, 0)).toEqual([14, ALBUM_MAP.routeY]);
    expect(routeArcPoint(14, 344, 0.5)[1]).toBeCloseTo(ALBUM_MAP.routeY - ALBUM_MAP.routeLift, 6);
  });

  it("flies for clamp(800 + 5|dx|, 1100, 2000) ms", () => {
    expect(routeFlightDuration(10)).toBe(1100);
    expect(routeFlightDuration(-150)).toBe(1550);
    expect(routeFlightDuration(330)).toBe(2000);
  });
});

describe("albums section thresholds", () => {
  it("keeps the CSS container queries in step with ALBUM_MAP", () => {
    expect(ALBUM_MAP).toMatchObject({
      mapMinWidth: 1680,
      passportMinWidth: 1500,
      mobileMaxWidth: 767,
    });
    expect(css).toContain(
      "@container albums-section (min-width: 1680px) { .photography-editorial-map { display: flex; } }",
    );
    expect(css).toContain("@container albums-section (min-width: 1500px) {");
    expect(css).toContain(
      "@container albums-section (max-width: 1499px) { .photography-editorial-list-head { display: flex; } }",
    );
    expect(css).toContain(
      "@container albums-section (min-width: 1500px) and (max-width: 1679px) { .photography-editorial-passport { width: calc((100cqw - 1000px) / 2 - 80px); }",
    );
    expect(css).toContain("@container albums-section (max-width: 767px) {");
    expect(css).toContain(
      ".photography-editorial-map-lead path { fill: none; stroke: #8a6a32; stroke-width: 1; stroke-dasharray: 3 4; opacity: 0.7; }",
    );
  });
});

describe("desktop hover on the albums list", () => {
  const desktop = () =>
    vi.spyOn(window, "matchMedia").mockImplementation(
      (query: string) =>
        ({
          matches: query === ALBUM_PREVIEW.query || query.includes("pointer: fine"),
          media: query,
          addEventListener: () => {},
          removeEventListener: () => {},
        }) as unknown as MediaQueryList,
    );

  it("shows the hovered album at once and stamps the passport only the first time", () => {
    desktop();
    vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(1440);
    const { container } = render(<PhotographyEditorial onAllPhotos={() => {}} />);
    const list = container.querySelector<HTMLElement>(".photography-editorial-destination-list")!;
    const row = (name: string) => within(list).getByText(name).closest("li")!;
    const badge = () => container.querySelector(".photography-editorial-preview-badge");
    const count = () =>
      container.querySelector(".photography-editorial-passport-count")!.textContent;
    const stamps = () => container.querySelectorAll(".photography-editorial-passport-stamp");

    expect(count()).toBe("0 / 13");
    // Rows keep a real link with "<name>, <count>" as its accessible name.
    expect(row("Париж").querySelector("a")).toHaveAttribute("aria-label", "Париж, 57 кадъра");
    fireEvent.mouseEnter(row("Париж"));
    expect(badge()).toHaveTextContent("№ 09 / 13 · ПАРИЖ");
    expect(container.querySelector(".photography-editorial-preview-open")).toHaveAttribute(
      "href",
      "/photography/albums/paris",
    );
    expect(count()).toBe("1 / 13");
    expect(stamps()).toHaveLength(1);

    fireEvent.mouseEnter(row("Лион"));
    fireEvent.mouseEnter(row("Париж"));
    expect(count()).toBe("2 / 13");
    expect(stamps()).toHaveLength(2);
    expect(
      container.querySelector('[data-album-slug="paris"].photography-editorial-passport-stamp'),
    ).not.toBeNull();
  });

  it("selects for the map only after a 350 ms dwell, and pointer leave cancels it", () => {
    desktop();
    vi.spyOn(Element.prototype, "clientWidth", "get").mockReturnValue(1440);
    vi.useFakeTimers();
    const { container } = render(<PhotographyEditorial onAllPhotos={() => {}} />);
    const list = container.querySelector<HTMLElement>(".photography-editorial-destination-list")!;
    const paris = within(list).getByText("Париж").closest("li")!;
    // No map below 1680px: nothing of it is rendered.
    expect(container.querySelector(".photography-editorial-map")).toBeNull();
    fireEvent.mouseEnter(paris);
    fireEvent.mouseLeave(paris);
    act(() => {
      vi.advanceTimersByTime(ALBUM_MAP.dwellMs + 50);
    });
    expect(container.querySelector(".photography-editorial-map")).toBeNull();
  });
});
