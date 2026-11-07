/**
 * Map zone of the Photography "Albums" section (container >= 1680px, fine pointer; loaded lazily).
 * Decorative only: everything it shows is also in the list and the preview.
 * - `src/content/album-map.generated.ts`: precomputed Web Mercator geometry (600x400 viewBox).
 * - `src/content/album-map.ts`: pin positions per album slug; `src/lib/album-map-pins.ts`: pin
 *   lookups; `src/lib/album-map.ts`: flight and route maths.
 * - `public/maps/relief-europe.webp` & `public/maps/relief-balkans.webp`: 1200x800 shaded relief.
 * - Sources & licenses:
 *   • Europe layer: Natural Earth 1:50m (world-atlas) — public domain.
 *   • Balkans layer & Black Sea lens: OpenStreetMap land polygons (@geo-maps/earth-lands-100m,
 *     @geo-maps/countries-land-100m) — ODbL (requires "© OpenStreetMap contributors" attribution).
 *   • Relief: shadedrelief.jpg from basemap-data (Tom Patterson, shadedrelief.com) — public domain,
 *     high-pass luminance filtered in Web Mercator projection (sea = white), rendered via SVG
 *     `<image>` clipped to land with `mix-blend-mode: multiply` and `opacity: 0.8`.
 */
import { useCallback, useEffect, useId, useRef } from "react";
import { albumText, type Album } from "@/content/albums";
import {
  EU_BORDERS,
  EU_BULGARIA,
  EU_LAND,
  LENS_LAND,
  LENS_VIEWBOX,
  MAP_VIEWBOX,
  REG_BORDERS,
  REG_BULGARIA,
  REG_LAND,
} from "@/content/album-map.generated";
import {
  BALKANS_LABEL_END,
  BULGARIA_LABEL,
  COAST_PIN_SLUG,
  LENS_LABEL_OFFSETS,
  MAP_PINS_BALKANS,
  MAP_PINS_EUROPE,
} from "@/content/album-map";
import { ALBUM_PLACES } from "@/content/album-places";
import { useT } from "@/i18n";
import {
  ALBUM_MAP,
  easeInOutQuad,
  flightControlPoint,
  flightDuration,
  headingDeg,
  quadPoint,
} from "@/lib/album-map";
import { flightStart, isCoastSlug, lensPoint, mapLayerOf, pinPoint } from "@/lib/album-map-pins";

const SVG_NS = "http://www.w3.org/2000/svg";

const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/** An expanding ring at a pin; under reduced motion it is removed at once. */
function spawnRing(
  host: SVGGElement | null,
  x: number,
  y: number,
  r0: number,
  r1: number,
  strokeWidth: number,
  reduced: boolean,
) {
  if (!host) return;
  const circle = document.createElementNS(SVG_NS, "circle");
  circle.setAttribute("cx", String(x));
  circle.setAttribute("cy", String(y));
  circle.setAttribute("r", String(r0));
  circle.setAttribute("class", "photography-editorial-map-ring");
  circle.setAttribute("stroke-width", String(strokeWidth));
  host.appendChild(circle);
  if (reduced) {
    window.setTimeout(() => circle.remove(), 10);
    return;
  }
  circle.style.transition = `r ${ALBUM_MAP.ringMs}ms ease-out, opacity ${ALBUM_MAP.ringMs}ms ease-out`;
  void circle.getBoundingClientRect();
  circle.setAttribute("r", String(r1));
  circle.style.opacity = "0";
  window.setTimeout(() => circle.remove(), ALBUM_MAP.ringMs + 50);
}

const pinClass = (active: boolean) =>
  active
    ? "photography-editorial-map-pin photography-editorial-map-pin--active"
    : "photography-editorial-map-pin";

const labelClass = (active: boolean) =>
  active
    ? "photography-editorial-map-label photography-editorial-map-label--active"
    : "photography-editorial-map-label";

export function AlbumMap({ activeSlug, albums }: { activeSlug: string; albums: readonly Album[] }) {
  const { t, locale } = useT();
  const rawId = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const euLandId = `map-eup-${rawId}`;
  const regLandId = `map-regp-${rawId}`;
  const euClipId = `map-ce-${rawId}`;
  const regClipId = `map-cr-${rawId}`;

  const zoneRef = useRef<HTMLDivElement | null>(null);
  const lensRef = useRef<HTMLDivElement | null>(null);
  const euCoastPinRef = useRef<SVGCircleElement | null>(null);
  const regCoastPinRef = useRef<SVGCircleElement | null>(null);
  const euRingsRef = useRef<SVGGElement | null>(null);
  const regRingsRef = useRef<SVGGElement | null>(null);
  const lensRingsRef = useRef<SVGGElement | null>(null);
  const puffsRef = useRef<SVGGElement | null>(null);
  const planeRef = useRef<SVGGElement | null>(null);
  const leadSvgRef = useRef<SVGSVGElement | null>(null);
  const leadPathRef = useRef<SVGPathElement | null>(null);
  const prevSlugRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  const activeLayer = mapLayerOf(activeSlug);
  const activeIsCoast = isCoastSlug(activeSlug);

  // Dashed lead line from the shared coast pin on the active layer to the top of the lens.
  const layoutLead = useCallback(() => {
    const zone = zoneRef.current;
    const lens = lensRef.current;
    const leadSvg = leadSvgRef.current;
    const leadPath = leadPathRef.current;
    const pin = activeLayer === "europe" ? euCoastPinRef.current : regCoastPinRef.current;
    if (!zone || !lens || !leadSvg || !leadPath || !pin) return;
    const zRect = zone.getBoundingClientRect();
    if (zRect.width <= 0 || zRect.height <= 0) return;
    const pinRect = pin.getBoundingClientRect();
    const lensRect = lens.getBoundingClientRect();
    const x1 = pinRect.left + pinRect.width / 2 - zRect.left;
    const y1 = pinRect.top + pinRect.height / 2 - zRect.top;
    const x2 = lensRect.left + lensRect.width / 2 - zRect.left;
    const y2 = lensRect.top - zRect.top;
    const f = (n: number) => n.toFixed(1);
    leadSvg.setAttribute("viewBox", `0 0 ${Math.round(zRect.width)} ${Math.round(zRect.height)}`);
    leadPath.setAttribute(
      "d",
      `M${f(x1)} ${f(y1)} C${f(x1)} ${f(y1 + 40)} ${f(x2)} ${f(y2 - 40)} ${f(x2)} ${f(y2)}`,
    );
  }, [activeLayer]);

  // Recompute on layer change, on any resize of the zone and once the web fonts have loaded.
  useEffect(() => {
    layoutLead();
    let alive = true;
    const zone = zoneRef.current;
    const observer =
      typeof ResizeObserver === "undefined" ? null : new ResizeObserver(() => layoutLead());
    if (zone && observer) observer.observe(zone);
    const onResize = () => layoutLead();
    window.addEventListener("resize", onResize);
    void document.fonts?.ready.then(() => {
      if (alive) layoutLead();
    });
    return () => {
      alive = false;
      observer?.disconnect();
      window.removeEventListener("resize", onResize);
    };
  }, [layoutLead]);

  // Selection: fly the plane from the previous album (none on the first selection), then a ring.
  useEffect(() => {
    const prevSlug = prevSlugRef.current;
    prevSlugRef.current = activeSlug;
    const layer = mapLayerOf(activeSlug);
    const p1 = pinPoint(layer, activeSlug);
    if (!p1) return;
    const p0 = flightStart(prevSlug, activeSlug);

    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const plane = planeRef.current;
    const puffs = puffsRef.current;
    const reduced = prefersReducedMotion();
    let lensTimer: number | null = null;

    const land = () => {
      if (plane) plane.style.display = "none";
      const host = layer === "europe" ? euRingsRef.current : regRingsRef.current;
      spawnRing(host, p1[0], p1[1], 5, 26, 1.6, reduced);
      const q = lensPoint(activeSlug);
      if (q) {
        lensTimer = window.setTimeout(() => {
          spawnRing(lensRingsRef.current, q[0], q[1], 0.8, 4.5, 0.3, reduced);
        }, ALBUM_MAP.lensRingDelayMs);
      }
    };

    const dist = Math.hypot(p1[0] - p0[0], p1[1] - p0[1]);
    const stop = () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (lensTimer !== null) window.clearTimeout(lensTimer);
    };

    if (reduced || !prevSlug || dist < 1) {
      land();
      return stop;
    }

    const c = flightControlPoint(p0, p1);
    const dur = flightDuration(dist);
    const t0 = performance.now();
    let lastPuff: readonly [number, number] | null = null;
    if (plane) plane.style.display = "";

    const frame = (now: number) => {
      const tNorm = Math.min(1, (now - t0) / dur);
      const e = easeInOutQuad(tNorm);
      const a = quadPoint(p0, c, p1, e);
      const b = quadPoint(p0, c, p1, Math.min(1, e + 0.01));
      plane?.setAttribute("transform", `translate(${a[0]},${a[1]}) rotate(${headingDeg(a, b)})`);

      if (
        puffs &&
        (!lastPuff || Math.hypot(a[0] - lastPuff[0], a[1] - lastPuff[1]) > ALBUM_MAP.puffStep)
      ) {
        lastPuff = a;
        const puff = document.createElementNS(SVG_NS, "circle");
        puff.setAttribute("cx", String(a[0]));
        puff.setAttribute("cy", String(a[1]));
        puff.setAttribute("r", "2.3");
        puff.setAttribute("class", "photography-editorial-map-puff");
        puff.style.transition = `opacity ${ALBUM_MAP.puffMs}ms ease-out`;
        puffs.appendChild(puff);
        void puff.getBoundingClientRect();
        puff.style.opacity = "0";
        window.setTimeout(() => puff.remove(), ALBUM_MAP.puffMs + 50);
      }

      if (tNorm < 1) {
        rafRef.current = window.requestAnimationFrame(frame);
      } else {
        rafRef.current = null;
        land();
      }
    };

    rafRef.current = window.requestAnimationFrame(frame);
    return stop;
  }, [activeSlug]);

  const euCoast = MAP_PINS_EUROPE[COAST_PIN_SLUG]!;
  const regCoast = MAP_PINS_BALKANS[COAST_PIN_SLUG]!;

  return (
    <div
      ref={zoneRef}
      className="photography-editorial-map"
      aria-hidden="true"
      inert
      data-layer={activeLayer}
      data-coast={activeIsCoast ? "true" : undefined}
    >
      <div className="photography-editorial-zone-title">
        <span>{t.photos.mapWhere}</span>
        <span className="photography-editorial-map-region">
          {activeLayer === "europe" ? t.photos.regionEurope : t.photos.regionBalkans}
        </span>
      </div>
      <div className="photography-editorial-map-card">
        <svg
          viewBox={`0 0 ${MAP_VIEWBOX.width} ${MAP_VIEWBOX.height}`}
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <clipPath id={euClipId}>
              <use href={`#${euLandId}`} />
            </clipPath>
            <clipPath id={regClipId}>
              <use href={`#${regLandId}`} />
            </clipPath>
          </defs>

          <g
            className="photography-editorial-map-layer"
            data-map-layer="europe"
            style={{ opacity: activeLayer === "europe" ? 1 : 0 }}
          >
            <path id={euLandId} className="photography-editorial-map-land" d={EU_LAND} />
            <path
              className="photography-editorial-map-bg"
              d={EU_BULGARIA}
              clipPath={`url(#${euClipId})`}
            />
            <image
              className="photography-editorial-map-relief"
              href="/maps/relief-europe.webp"
              x="0"
              y="0"
              width="600"
              height="400"
              preserveAspectRatio="none"
              clipPath={`url(#${euClipId})`}
            />
            <path className="photography-editorial-map-borders" d={EU_BORDERS} />
            <g ref={euRingsRef} className="photography-editorial-map-rings" />
            <g className="photography-editorial-map-pins">
              {albums.map((album) => {
                const place = ALBUM_PLACES[album.slug];
                const pt = MAP_PINS_EUROPE[album.slug];
                if (!place || !pt || place.coast) return null;
                const isActive = album.slug === activeSlug;
                return (
                  <g key={album.slug}>
                    <circle
                      cx={pt[0]}
                      cy={pt[1]}
                      r={5}
                      data-pin-slug={album.slug}
                      className={pinClass(isActive)}
                    />
                    {place.layer === "europe" && (
                      <text
                        x={pt[0] + 10}
                        y={pt[1] + 17 * 0.35}
                        fontSize={17}
                        textAnchor="start"
                        className={labelClass(isActive)}
                      >
                        {albumText(album.title, locale)}
                      </text>
                    )}
                  </g>
                );
              })}
              <circle
                ref={euCoastPinRef}
                cx={euCoast[0]}
                cy={euCoast[1]}
                r={5}
                data-pin-slug="coast"
                className={pinClass(activeIsCoast)}
              />
              <text
                x={BULGARIA_LABEL[0]}
                y={BULGARIA_LABEL[1]}
                fontSize={17}
                textAnchor="end"
                className={labelClass(!activeIsCoast && activeLayer === "balkans")}
              >
                {t.photos.countryBulgaria}
              </text>
            </g>
          </g>

          <g
            className="photography-editorial-map-layer"
            data-map-layer="balkans"
            style={{ opacity: activeLayer === "balkans" ? 1 : 0 }}
          >
            <path id={regLandId} className="photography-editorial-map-land" d={REG_LAND} />
            <path
              className="photography-editorial-map-bg"
              d={REG_BULGARIA}
              clipPath={`url(#${regClipId})`}
            />
            <image
              className="photography-editorial-map-relief"
              href="/maps/relief-balkans.webp"
              x="0"
              y="0"
              width="600"
              height="400"
              preserveAspectRatio="none"
              clipPath={`url(#${regClipId})`}
            />
            <path className="photography-editorial-map-borders" d={REG_BORDERS} />
            <g ref={regRingsRef} className="photography-editorial-map-rings" />
            <g className="photography-editorial-map-pins">
              {albums.map((album) => {
                const place = ALBUM_PLACES[album.slug];
                const pt = MAP_PINS_BALKANS[album.slug];
                if (!place || !pt || place.layer !== "balkans" || place.coast) return null;
                const isActive = album.slug === activeSlug;
                const isEnd = BALKANS_LABEL_END.has(album.slug);
                return (
                  <g key={album.slug}>
                    <circle
                      cx={pt[0]}
                      cy={pt[1]}
                      r={6}
                      data-pin-slug={album.slug}
                      className={pinClass(isActive)}
                    />
                    <text
                      x={pt[0] + (isEnd ? -12 : 12)}
                      y={pt[1] + 19 * 0.35}
                      fontSize={19}
                      textAnchor={isEnd ? "end" : "start"}
                      className={labelClass(isActive)}
                    >
                      {albumText(album.title, locale)}
                    </text>
                  </g>
                );
              })}
              <circle
                ref={regCoastPinRef}
                cx={regCoast[0]}
                cy={regCoast[1]}
                r={6}
                data-pin-slug="coast"
                className={pinClass(activeIsCoast)}
              />
              <text
                x={regCoast[0] + 12}
                y={regCoast[1] + 19 * 0.35}
                fontSize={19}
                textAnchor="start"
                className={labelClass(activeIsCoast)}
              >
                {t.photos.blackSeaLabel}
              </text>
            </g>
          </g>

          <g ref={puffsRef} className="photography-editorial-map-puffs" />
          <g ref={planeRef} className="photography-editorial-map-plane" style={{ display: "none" }}>
            <path d="M15 0L-10 -8.5L-4 0L-10 8.5Z" strokeWidth="1.6" strokeLinejoin="round" />
          </g>
        </svg>
      </div>

      <div className="photography-editorial-map-lens-wrap">
        <div
          ref={lensRef}
          className={
            activeIsCoast
              ? "photography-editorial-map-lens photography-editorial-map-lens--hot"
              : "photography-editorial-map-lens"
          }
          data-hot={activeIsCoast ? "true" : undefined}
        >
          <svg viewBox={LENS_VIEWBOX}>
            <path
              className="photography-editorial-map-land photography-editorial-map-lens-land"
              d={LENS_LAND}
            />
            <g ref={lensRingsRef} className="photography-editorial-map-lens-rings" />
            <g className="photography-editorial-map-lens-pins">
              {albums.map((album) => {
                const pt = lensPoint(album.slug);
                const off = LENS_LABEL_OFFSETS[album.slug];
                if (!pt || !off) return null;
                const isActive = album.slug === activeSlug;
                return (
                  <g key={album.slug}>
                    <circle
                      cx={pt[0]}
                      cy={pt[1]}
                      r={0.75}
                      data-pin-slug={album.slug}
                      className={pinClass(isActive)}
                    />
                    <text
                      x={pt[0] + off[0]}
                      y={pt[1] + off[1] + 0.6}
                      fontSize={1.9}
                      textAnchor={off[2]}
                      style={{ strokeWidth: "0.55px" }}
                      className={labelClass(isActive)}
                    >
                      {albumText(album.title, locale)}
                    </text>
                  </g>
                );
              })}
            </g>
          </svg>
        </div>
        <div className="photography-editorial-map-lens-caption">{t.photos.blackSeaZoom}</div>
      </div>

      <div className="photography-editorial-map-attr">{t.photos.mapCredits}</div>

      <svg ref={leadSvgRef} className="photography-editorial-map-lead">
        <path ref={leadPathRef} d="" />
      </svg>
    </div>
  );
}

export default AlbumMap;
