import { useId } from "react";
import { useT } from "@/i18n";

const STAMP_INKS = ["#A16A56", "#3F5A86", "#8A6A32"] as const;

export type StampShape = "round" | "rect";

export interface AlbumStampProps {
  index: number;
  title: string;
  count: number;
  total: number;
  size?: number;
  shape?: StampShape;
  ink?: string;
  className?: string;
}

const pad2 = (n: number) => String(n).padStart(2, "0");

/** Decorative passport stamp SVG ported from the approved album reference mockup. */
export function AlbumStamp({
  index,
  title,
  count,
  total,
  size = 52,
  shape,
  ink,
  className,
}: AlbumStampProps) {
  const { t } = useT();
  const rawId = useId();
  const pathId = `stamp-path-${rawId.replace(/[^a-zA-Z0-9_-]/g, "")}`;

  const resolvedShape: StampShape = shape ?? (index % 2 === 1 ? "rect" : "round");
  const resolvedInk = ink ?? STAMP_INKS[Math.abs(index) % STAMP_INKS.length]!;
  const numberLabel = pad2(index + 1);
  const upperTitle = title.toUpperCase();
  const upperFrames = t.photos.framesUpper.toUpperCase();

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
          y="20"
          width="90"
          height="60"
          rx="7"
          fill="none"
          stroke={resolvedInk}
          strokeWidth="2.4"
        />
        <rect
          x="10"
          y="25"
          width="80"
          height="50"
          rx="4"
          fill="none"
          stroke={resolvedInk}
          strokeWidth="1"
        />
        <text
          x="50"
          y="47"
          textAnchor="middle"
          letterSpacing="0.6"
          style={{
            font: `600 ${titleFontSize}px var(--font-serif)`,
            fill: resolvedInk,
          }}
        >
          {upperTitle}
        </text>
        <line x1="20" y1="53" x2="80" y2="53" stroke={resolvedInk} strokeWidth="0.8" />
        <text
          x="50"
          y="64"
          textAnchor="middle"
          letterSpacing="0.6"
          style={{
            font: "600 6.4px var(--font-sans)",
            fill: resolvedInk,
          }}
        >
          {`${count} ${upperFrames} · № ${numberLabel} / ${total}`}
        </text>
      </svg>
    );
  }

  const ringText = `${upperTitle} · ${count} ${upperFrames} · `;

  return (
    <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden="true" className={className}>
      <defs>
        <path id={pathId} d="M50 50 m-36 0 a36 36 0 1 1 72 0 a36 36 0 1 1 -72 0" />
      </defs>
      <circle cx="50" cy="50" r="46" fill="none" stroke={resolvedInk} strokeWidth="2.4" />
      <circle cx="50" cy="50" r="27" fill="none" stroke={resolvedInk} strokeWidth="1.1" />
      <text
        letterSpacing="1"
        style={{
          font: "600 9.2px var(--font-sans)",
          fill: resolvedInk,
        }}
      >
        <textPath href={`#${pathId}`} xlinkHref={`#${pathId}`}>
          {ringText}
        </textPath>
      </text>
      <text
        x="50"
        y="55"
        textAnchor="middle"
        style={{
          font: "600 20px var(--font-serif)",
          fill: resolvedInk,
        }}
      >
        {numberLabel}
      </text>
      <text
        x="50"
        y="67"
        textAnchor="middle"
        style={{
          font: "600 7.5px var(--font-sans)",
          fill: resolvedInk,
        }}
      >
        {`/ ${total}`}
      </text>
    </svg>
  );
}
