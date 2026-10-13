import { useState } from "react";
import { siteConfig } from "@/content/site-config";
import { cn } from "@/lib/utils";
import { useT } from "@/i18n";

type Mode = "real" | "ai";

/** Portrait with explicit "Реален кадър" / "AI версия" toggle. Generated images are always labelled as AI. */
export function PortraitSwitch({ compact, className, aiImage }: { compact?: boolean; className?: string; aiImage?: string }) {
  const { real, ai: configuredAi } = siteConfig.portrait;
  const ai = aiImage ?? configuredAi;
  const modes = (ai ? ["real", "ai"] : ["real"]) as Mode[];
  const [mode, setMode] = useState<Mode>(!real && ai ? "ai" : "real");
  const src = mode === "real" ? real : ai;
  const { t } = useT();

  return (
    <div className={className}>
      <div className={cn("relative overflow-hidden rounded-md bg-muted", compact ? "aspect-square" : "aspect-[4/5]")}>
        {src ? (
          <img
            src={src}
            alt={mode === "ai" ? t.portrait.aiAlt : t.portrait.realAlt}
            className={cn(
              "h-full w-full",
              (mode === "real" && !compact) || (mode === "ai" && aiImage) ? "object-contain" : "object-cover",
              mode === "ai" && aiImage && (compact ? "translate-y-[11.5%] scale-[1.28]" : "translate-y-[8.7%] scale-[1.22]"),
            )}
          />
        ) : (
          <div className="grid h-full place-items-center border-2 border-dashed border-border p-6 text-center text-sm text-muted-foreground">
            {t.portrait.placeholder}
          </div>
        )}
        {mode === "ai" && src && <span className="eyebrow absolute left-3 top-3 rounded-sm bg-navy/80 px-2 py-1 text-gold">{t.common.aiBadge}</span>}
      </div>
      {modes.length > 1 && (
        <div role="group" aria-label={t.portrait.group} className="mt-3 inline-flex rounded-sm border p-1">
          {modes.map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={cn("rounded-sm px-3 py-1.5 text-xs font-semibold transition-colors", mode === m ? "bg-primary text-primary-foreground" : "hover:text-terracotta")}
            >
              {m === "real" ? t.portrait.real : t.portrait.ai}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
