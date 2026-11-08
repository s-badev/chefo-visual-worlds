import { useId } from "react";
import { STAMP_ICONS } from "@/content/stamp-icons";

const STAMP_INKS = ["#A16A56", "#3F5A86", "#8A6A32"] as const;

export type StampShape = "round" | "rect";

export interface AlbumStampProps {
  index: number;
  title: string;
  count: number;
  total: number;
  /** The album slug: its landmark icon sits in the middle of the stamp. */
  slug?: string | undefined;
  size?: number;
  shape?: StampShape;
  /** "mini": the deck's small seal, a thick double ring around the landmark only. */
  variant?: "full" | "mini";
  ink?: string;
  className?: string;
}

/** The landmark line icon (24 x 24 artwork) placed at (x, y) and scaled, in the stamp's ink. */
function Landmark({
  slug,
  ink,
  x,
  y,
  scale,
  stroke = 1.2,
}: {
  slug: string | undefined;
  ink: string;
  x: number;
  y: number;
  scale: number;
  stroke?: number;
}) {
  const icon = slug ? STAMP_ICONS[slug] : undefined;
  if (!icon) return null;
  return (
    <g
      transform={`translate(${x} ${y}) scale(${scale})`}
      fill="none"
      stroke={ink}
      strokeWidth={stroke}
      strokeLinecap="round"
      strokeLinejoin="round"
      // Static artwork from src/content/stamp-icons.ts (no user content).
      dangerouslySetInnerHTML={{ __html: icon.join("") }}
    />
  );
}

/**
 * Decorative English-only passport stamp, as in the approved mock (stampSVG / miniStamp): round
 * stamps carry the album and its count around a landmark, rectangular ones the landmark above the
 * album name and the count. The ink cycles terracotta-brown, blue and bronze by album.
 */
export function AlbumStamp({
  index,
  title,
  count,
  slug,
  size = 52,
  shape,
  variant = "full",
  ink,
  className,
}: AlbumStampProps) {
  const rawId = useId();
  const pathId = `stamp-path-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const resolvedShape: StampShape = shape ?? (index % 2 === 1 ? "rect" : "round");
  const resolvedInk = ink ?? STAMP_INKS[Math.abs(index) % STAMP_INKS.length]!;
  const upperTitle = title.toUpperCase();

  if (variant === "mini") {
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        aria-hidden="true"
        className={className}
      >
        <circle cx="50" cy="50" r="45" fill="none" stroke={resolvedInk} strokeWidth="5" />
        <circle cx="50" cy="50" r="36" fill="none" stroke={resolvedInk} strokeWidth="2.4" />
        <Landmark slug={slug} ink={resolvedInk} x={30.8} y={30.8} scale={1.6} stroke={1.9} />
      </svg>
    );
  }

  if (resolvedShape === "rect") {
    const titleFontSize = upperTitle.length > 10 ? 9.6 : upperTitle.length > 7 ? 12.5 : 16;
    return (
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        aria-hidden="true"
        className={className}
      >
        <rect
          x="5"
          y="14"
          width="90"
          height="72"
          rx="7"
          fill="none"
          stroke={resolvedInk}
          strokeWidth="2.4"
        />
        <rect
          x="10"
          y="19"
          width="80"
          height="62"
          rx="4"
          fill="none"
          stroke={resolvedInk}
          strokeWidth="1"
        />
        <Landmark slug={slug} ink={resolvedInk} x={37.5} y={21} scale={1.05} />
        <text
          x="50"
          y="60"
          textAnchor="middle"
          letterSpacing="0.5"
          style={{
            font: `600 ${(titleFontSize * 0.8).toFixed(1)}px var(--font-serif)`,
            fill: resolvedInk,
          }}
        >
          {upperTitle}
        </text>
        <line x1="22" y1="64.5" x2="78" y2="64.5" stroke={resolvedInk} strokeWidth="0.8" />
        <text
          x="50"
          y="73"
          textAnchor="middle"
          letterSpacing="0.4"
          style={{ font: "600 6.2px var(--font-sans)", fill: resolvedInk }}
        >
          {`${count} PHOTOS`}
        </text>
      </svg>
    );
  }

  const ringText = `${upperTitle} · ${count} PHOTOS · `;
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className={className}>
      <defs>
        <path id={pathId} d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" />
      </defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke={resolvedInk} strokeWidth="2.4" />
      <circle cx="50" cy="50" r="27" fill="none" stroke={resolvedInk} strokeWidth="1.1" />
      <text letterSpacing="1" style={{ font: "600 9.2px var(--font-sans)", fill: resolvedInk }}>
        <textPath href={`#${pathId}`} xlinkHref={`#${pathId}`}>
          {ringText}
        </textPath>
      </text>
      <Landmark slug={slug} ink={resolvedInk} x={32.6} y={32.6} scale={1.45} />
    </svg>
  );
}
