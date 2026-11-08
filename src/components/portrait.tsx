import { useState, type CSSProperties } from "react";
import { siteConfig } from "@/content/site-config";
import { useT } from "@/i18n";
import {
  IRIS,
  irisClip,
  irisOriginX,
  pressIris,
  type PortraitMode as Mode,
} from "@/lib/portrait-iris";

/**
 * The author's portrait with the "Реален кадър" / "AI версия" switch, as in the approved mock
 * (.pf / .ps): a 4:5 paper-matted frame with the real photograph and, over it, the AI version,
 * which a circle opens from under the pressed button while a thin gold ring expands from the
 * same point. Nothing is written on the photograph itself: the pressed segment is the only
 * indication (aria-pressed for screen readers).
 */
export function PortraitSwitch({ className, aiImage }: { className?: string; aiImage?: string }) {
  const { real, ai: configuredAi } = siteConfig.portrait;
  const ai = aiImage ?? configuredAi;
  const modes = (ai ? ["real", "ai"] : ["real"]) as Mode[];
  const [mode, setMode] = useState<Mode>(!real && ai ? "ai" : "real");
  const [originX, setOriginX] = useState<number>(IRIS.originX);
  const [ring, setRing] = useState<number | null>(null);
  const { t } = useT();

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
      <div data-portrait-frame="" style={frameStyle} className="portrait-frame">
        {real ? (
          <img
            src={real}
            alt={t.portrait.realAlt}
            aria-hidden={mode === "ai" && ai ? true : undefined}
            className="portrait-img"
          />
        ) : (
          !ai && <div className="portrait-placeholder">{t.portrait.placeholder}</div>
        )}
        {ai && (
          // Over the real portrait, opened and closed by the circle; closed (hidden) without JS.
          <div
            className="portrait-iris"
            aria-hidden={mode === "ai" ? undefined : true}
            style={{ clipPath: irisClip(mode === "ai") }}
          >
            <img src={ai} alt={t.portrait.aiAlt} className="portrait-img" />
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
        <div role="group" aria-label={t.portrait.group} className="portrait-toggle">
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={(e) => press(m, e.currentTarget)}
              className="portrait-toggle-button"
            >
              {m === "real" ? t.portrait.real : t.portrait.ai}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
