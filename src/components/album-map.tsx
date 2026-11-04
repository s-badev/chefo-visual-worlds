/**
 * Map assets and licenses for the Photography "Albums" section:
 * - `src/content/album-map.generated.ts`: precomputed Web Mercator geometry (600x400 viewBox).
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
  PLACE_POINTS,
  REG_BORDERS,
  REG_BULGARIA,
  REG_LAND,
} from "@/content/album-map.generated";
import { ALBUM_PLACES } from "@/content/album-places";
import { useT } from "@/i18n";

const SVG_NS = "http://www.w3.org/2000/svg";

const LENS_OFFSETS: Record<string, readonly [number, number, "start" | "end"]> = {
  "sunny-beach": [-1.4, -1.6, "end"],
  "sveti-vlas": [1.4, -1.4, "start"],
  nessebar: [1.6, 1.8, "start"],
  burgas: [1.6, 1.2, "start"],
};

const mapLayerOf = (slug: string): "europe" | "balkans" =>
  ALBUM_PLACES[slug]?.layer === "europe" ? "europe" : "balkans";

const isCoastSlug = (slug: string): boolean => Boolean(ALBUM_PLACES[slug]?.coast);

const pointInLayer = (layer: "europe" | "balkans", slug: string): [number, number] | null => {
  const targetSlug = isCoastSlug(slug) ? "sunny-beach" : slug;
  const place = ALBUM_PLACES[targetSlug];
  const coords = PLACE_POINTS[targetSlug];
  if (!place || !coords) return null;
  if (layer === "balkans" && place.layer === "europe") return null;
  return layer === "europe" ? coords.eu : coords.reg;
};

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
  circle.style.transition = "r 0.9s ease-out, opacity 0.9s ease-out";
  void circle.getBoundingClientRect();
  circle.setAttribute("r", String(r1));
  circle.style.opacity = "0";
  window.setTimeout(() => circle.remove(), 950);
}

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
    leadSvg.setAttribute("viewBox", `0 0 ${Math.round(zRect.width)} ${Math.round(zRect.height)}`);
    leadPath.setAttribute(
      "d",
      `M${x1.toFixed(1)} ${y1.toFixed(1)} C${x1.toFixed(1)} ${(y1 + 40).toFixed(1)} ${x2.toFixed(1)} ${(y2 - 40).toFixed(1)} ${x2.toFixed(1)} ${y2.toFixed(1)}`,
    );
  }, [activeLayer]);

  useEffect(() => {
    layoutLead();
    const onResize = () => layoutLead();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [layoutLead]);

  useEffect(() => {
    const prevSlug = prevSlugRef.current;
    prevSlugRef.current = activeSlug;
    const layer = mapLayerOf(activeSlug);
    const coast = isCoastSlug(activeSlug);
    const p1 = pointInLayer(layer, activeSlug);
    if (!p1) return;

    const p0 =
      (prevSlug ? pointInLayer(layer, prevSlug) : null) ??
      (layer === "balkans" ? ([-30, 60] as [number, number]) : ([640, 200] as [number, number]));

    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    const plane = planeRef.current;
    const puffs = puffsRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timers: number[] = [];

    const land = () => {
      if (plane) plane.style.display = "none";
      spawnRing(
        layer === "europe" ? euRingsRef.current : regRingsRef.current,
        p1[0],
        p1[1],
        5,
        26,
        1.6,
        reduced,
      );
      const coastPt = PLACE_POINTS[activeSlug]?.reg;
      if (coast && coastPt) {
        const id = window.setTimeout(() => {
          spawnRing(lensRingsRef.current, coastPt[0], coastPt[1], 0.8, 4.5, 0.3, reduced);
        }, 250);
        timers.push(id);
      }
    };

    const dx = p1[0] - p0[0];
    const dy = p1[1] - p0[1];
    const dist = Math.hypot(dx, dy);

    if (reduced || !prevSlug || dist < 1) {
      land();
      return () => {
        for (const id of timers) window.clearTimeout(id);
      };
    }

    const mx = (p0[0] + p1[0]) / 2;
    const my = (p0[1] + p1[1]) / 2 - Math.min(90, dist * 0.35) - 10;
    const dur = Math.max(900, Math.min(1800, 700 + dist * 3));
    const t0 = performance.now();
    let lastPuff: [number, number] | null = null;

    if (plane) plane.style.display = "";

    const bezier = (e: number): [number, number] => {
      const u = 1 - e;
      return [
        u * u * p0[0] + 2 * u * e * mx + e * e * p1[0],
        u * u * p0[1] + 2 * u * e * my + e * e * p1[1],
      ];
    };

    const frame = (now: number) => {
      const tNorm = Math.min(1, (now - t0) / dur);
      const e = tNorm < 0.5 ? 2 * tNorm * tNorm : 1 - Math.pow(-2 * tNorm + 2, 2) / 2;
      const a = bezier(e);
      const b = bezier(Math.min(1, e + 0.01));
      const angle = (Math.atan2(b[1] - a[1], b[0] - a[0]) * 180) / Math.PI;
      plane?.setAttribute("transform", `translate(${a[0]},${a[1]}) rotate(${angle})`);

      if (puffs && (!lastPuff || Math.hypot(a[0] - lastPuff[0], a[1] - lastPuff[1]) > 9)) {
        lastPuff = a;
        const puff = document.createElementNS(SVG_NS, "circle");
        puff.setAttribute("cx", String(a[0]));
        puff.setAttribute("cy", String(a[1]));
        puff.setAttribute("r", "2.3");
        puff.setAttribute("fill", "#B8935A");
        puff.style.transition = "opacity 1.6s ease-out";
        puffs.appendChild(puff);
        void puff.getBoundingClientRect();
        puff.style.opacity = "0";
        const id = window.setTimeout(() => puff.remove(), 1650);
        timers.push(id);
      }

      if (tNorm < 1) {
        rafRef.current = window.requestAnimationFrame(frame);
      } else {
        rafRef.current = null;
        land();
      }
    };

    rafRef.current = window.requestAnimationFrame(frame);

    return () => {
      if (rafRef.current !== null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      for (const id of timers) window.clearTimeout(id);
    };
  }, [activeSlug]);

  const sunnyBeachPts = PLACE_POINTS["sunny-beach"]!;

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
                const pts = PLACE_POINTS[album.slug];
                if (!place || !pts || place.coast) return null;
                const isActive = album.slug === activeSlug;
                const title = albumText(album.title, locale);
                return (
                  <g key={album.slug}>
                    <circle
                      cx={pts.eu[0]}
                      cy={pts.eu[1]}
                      r={5}
                      data-pin-slug={album.slug}
                      className={
                        isActive
                          ? "photography-editorial-map-pin photography-editorial-map-pin--active"
                          : "photography-editorial-map-pin"
                      }
                    />
                    {place.layer === "europe" && (
                      <text
                        x={pts.eu[0] + 10}
                        y={pts.eu[1] + 17 * 0.35}
                        fontSize={17}
                        textAnchor="start"
                        className={
                          isActive
                            ? "photography-editorial-map-label photography-editorial-map-label--active"
                            : "photography-editorial-map-label"
                        }
                      >
                        {title}
                      </text>
                    )}
                  </g>
                );
              })}
              <circle
                ref={euCoastPinRef}
                cx={sunnyBeachPts.eu[0]}
                cy={sunnyBeachPts.eu[1]}
                r={5}
                data-pin-slug="coast"
                className={
                  activeIsCoast
                    ? "photography-editorial-map-pin photography-editorial-map-pin--active"
                    : "photography-editorial-map-pin"
                }
              />
              <text
                x={388}
                y={196}
                fontSize={17}
                textAnchor="end"
                className={
                  !activeIsCoast && activeLayer === "balkans"
                    ? "photography-editorial-map-label photography-editorial-map-label--active"
                    : "photography-editorial-map-label"
                }
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
                const pts = PLACE_POINTS[album.slug];
                if (!place || !pts || place.layer !== "balkans" || place.coast) return null;
                const isActive = album.slug === activeSlug;
                const isEnd = album.slug === "istanbul";
                const title = albumText(album.title, locale);
                return (
                  <g key={album.slug}>
                    <circle
                      cx={pts.reg[0]}
                      cy={pts.reg[1]}
                      r={6}
                      data-pin-slug={album.slug}
                      className={
                        isActive
                          ? "photography-editorial-map-pin photography-editorial-map-pin--active"
                          : "photography-editorial-map-pin"
                      }
                    />
                    <text
                      x={pts.reg[0] + (isEnd ? -12 : 12)}
                      y={pts.reg[1] + 19 * 0.35}
                      fontSize={19}
                      textAnchor={isEnd ? "end" : "start"}
                      className={
                        isActive
                          ? "photography-editorial-map-label photography-editorial-map-label--active"
                          : "photography-editorial-map-label"
                      }
                    >
                      {title}
                    </text>
                  </g>
                );
              })}
              <circle
                ref={regCoastPinRef}
                cx={sunnyBeachPts.reg[0]}
                cy={sunnyBeachPts.reg[1]}
                r={6}
                data-pin-slug="coast"
                className={
                  activeIsCoast
                    ? "photography-editorial-map-pin photography-editorial-map-pin--active"
                    : "photography-editorial-map-pin"
                }
              />
              <text
                x={sunnyBeachPts.reg[0] + 12}
                y={sunnyBeachPts.reg[1] + 19 * 0.35}
                fontSize={19}
                textAnchor="start"
                className={
                  activeIsCoast
                    ? "photography-editorial-map-label photography-editorial-map-label--active"
                    : "photography-editorial-map-label"
                }
              >
                {t.photos.blackSeaLabel}
              </text>
            </g>
          </g>

          <g ref={puffsRef} className="photography-editorial-map-puffs" />
          <g ref={planeRef} className="photography-editorial-map-plane" style={{ display: "none" }}>
            <path
              d="M15 0L-10 -8.5L-4 0L-10 8.5Z"
              fill="#16213A"
              stroke="#C9A46B"
              strokeWidth="1.6"
              strokeLinejoin="round"
            />
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
                const place = ALBUM_PLACES[album.slug];
                const pts = PLACE_POINTS[album.slug];
                const off = LENS_OFFSETS[album.slug];
                if (!place?.coast || !pts || !off) return null;
                const isActive = album.slug === activeSlug;
                const title = albumText(album.title, locale);
                return (
                  <g key={album.slug}>
                    <circle
                      cx={pts.reg[0]}
                      cy={pts.reg[1]}
                      r={0.75}
                      data-pin-slug={album.slug}
                      className={
                        isActive
                          ? "photography-editorial-map-pin photography-editorial-map-pin--active"
                          : "photography-editorial-map-pin"
                      }
                    />
                    <text
                      x={pts.reg[0] + off[0]}
                      y={pts.reg[1] + off[1] + 0.6}
                      fontSize={1.9}
                      textAnchor={off[2]}
                      style={{ strokeWidth: "0.55px" }}
                      className={
                        isActive
                          ? "photography-editorial-map-label photography-editorial-map-label--active"
                          : "photography-editorial-map-label"
                      }
                    >
                      {title}
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
        <path ref={leadPathRef} d="" style={{ opacity: activeIsCoast ? 0.85 : 0.45 }} />
      </svg>
    </div>
  );
}

export default AlbumMap;
