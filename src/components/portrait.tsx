import { useState, type CSSProperties } from "react";
import { siteConfig } from "@/content/site-config";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";
import {
  IRIS,
  irisClip,
  irisOriginX,
  pressIris,
  type PortraitMode as Mode,
} from "@/lib/portrait-iris";

/** Portrait with explicit "Реален кадър" / "AI версия" toggle. Generated images are always labelled as AI. */
export function PortraitSwitch({
  compact,
  className,
  aiImage,
  frame,
}: {
  compact?: boolean;
  className?: string;
  aiImage?: string;
  frame?: "matted";
}) {
  const { real, ai: configuredAi } = siteConfig.portrait;
  const ai = aiImage ?? configuredAi;
  const modes = (ai ? ["real", "ai"] : ["real"]) as Mode[];
  const [mode, setMode] = useState<Mode>(!real && ai ? "ai" : "real");
  const [originX, setOriginX] = useState(50);
  const [ring, setRing] = useState<number | null>(null);
  const { t } = useT();

  // Each portrait keeps the crop it had as the only image: compact frames cover-fit (the AI source
  // has the least headroom, so it is anchored to the top); the matted frame shows the whole photo.
  const realClass = cn("h-full w-full", compact ? "object-cover object-center" : "object-contain");
  const aiClass = cn(
    "h-full w-full",
    compact ? "object-cover object-top" : aiImage ? "object-contain" : "object-cover",
    !compact && aiImage && "translate-y-[8.7%] scale-[1.22]",
  );
  const frameStyle = {
    "--iris-x": `${originX}%`,
    "--iris-y": IRIS.originY,
    "--iris-ms": `${IRIS.durationMs}ms`,
    "--iris-ease": IRIS.ease,
    "--iris-ring-to": IRIS.ringTo,
    "--iris-ring-opacity": IRIS.ringOpacity,
  } as CSSProperties;

  const press = (pressed: Mode, button: HTMLElement) => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const next = pressIris(mode, pressed, ring, reduced);
    if (!next) return;
    const frameEl = button
      .closest("[data-portrait-switch]")
      ?.querySelector<HTMLElement>("[data-portrait-frame]");
    const layer = frameEl?.querySelector<HTMLElement>(".portrait-iris");
    if (frameEl && layer) {
      const x = irisOriginX(button.getBoundingClientRect(), frameEl.getBoundingClientRect());
      // Move the origin first, with no transition: once a change has finished the layer is fully
      // closed or fully open, so the jump is invisible. Then only the radius animates, from under
      // the pressed button (a press mid-change simply reverses from where the circle is).
      layer.style.transition = "none";
      frameEl.style.setProperty("--iris-x", `${x}%`);
      void getComputedStyle(layer).clipPath;
      layer.style.transition = "";
      setOriginX(x);
    }
    setMode(next.mode);
    setRing(next.ring);
  };

  return (
    <div className={className} data-portrait-switch="">
      <div
        data-portrait-frame=""
        style={frameStyle}
        className={cn(
          "relative overflow-hidden rounded-md bg-muted",
          compact ? "aspect-(--about-portrait-ratio)" : "aspect-[4/5]",
          frame === "matted" && "photo-frame-print photo-frame-print--portrait",
        )}
      >
        {real ? (
          <img
            src={real}
            alt={t.portrait.realAlt}
            aria-hidden={mode === "ai" && ai ? true : undefined}
            className={realClass}
          />
        ) : (
          !ai && (
            <div className="grid h-full place-items-center border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {t.portrait.placeholder}
            </div>
          )
        )}
        {ai && (
          // Over the real portrait, opened and closed by the iris; closed (hidden) without JS.
          <div
            className="portrait-iris"
            aria-hidden={mode === "ai" ? undefined : true}
            style={{ clipPath: irisClip(mode === "ai") }}
          >
            <img src={ai} alt={t.portrait.aiAlt} className={aiClass} />
            <span className="eyebrow absolute left-3 top-3 rounded-sm bg-navy/80 px-2 py-1 text-gold">
              {t.common.aiBadge}
            </span>
          </div>
        )}
        {ring !== null && (
          <span
            key={ring}
            aria-hidden="true"
            className="portrait-iris-ring"
            onAnimationEnd={() => setRing((current) => (current === ring ? null : current))}
          />
        )}
      </div>
      {modes.length > 1 && (
        <div
          role="group"
          aria-label={t.portrait.group}
          className="portrait-toggle mt-3 inline-flex rounded-sm border p-1"
        >
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={(e) => press(m, e.currentTarget)}
              className={cn(
                "interaction-control interaction-text-button min-h-11 rounded-sm border border-transparent py-1.5 text-xs font-semibold",
                mode === m ? "border-primary bg-primary text-primary-foreground" : "",
              )}
            >
              {m === "real" ? t.portrait.real : t.portrait.ai}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
