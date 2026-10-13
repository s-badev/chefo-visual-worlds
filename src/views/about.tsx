import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { PortraitSwitch } from "@/components/portrait";
import aboutAiRoyal from "@/assets/about-ai-royal-new.png";
import { Surface } from "@/components/surface";
import { cn } from "@/lib/utils";
import { getMessages, pageHead, useT, type Locale } from "@/i18n";

export const aboutHead = (locale: Locale) => {
  const m = getMessages(locale).about;
  return pageHead(locale, "/about", m.metaTitle, m.metaDesc);
};

/** Steps move from the real world toward the imagined one: cream, warm sand, cool dusk. */
const STEP_TONES = ["bg-card", "bg-tint-sand", "border-gold/40 bg-tint-dusk"];

function Pipeline() {
  const { t } = useT();
  const [open, setOpen] = useState<number | null>(0);
  return (
    <ol className="mt-6 grid gap-3 md:grid-cols-3">
      {t.about.steps.map((s, i) => {
        const isOpen = open === i;
        return (
          <li
            key={i}
            className={cn(
              "rounded-md border transition-colors duration-(--dur-base) ease-cinematic",
              STEP_TONES[i % STEP_TONES.length],
            )}
          >
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={`step-${i}`}
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-3 p-4 text-left"
            >
              <span>
                <span className="eyebrow block text-eyebrow">{t.about.step(i + 1)}</span>
                <span className="font-serif text-xl">{s.title}</span>
              </span>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 transition-transform motion-reduce:transition-none",
                  isOpen && "rotate-180",
                )}
              />
            </button>
            <p
              id={`step-${i}`}
              hidden={!isOpen}
              className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground"
            >
              {s.text}
            </p>
          </li>
        );
      })}
    </ol>
  );
}

export function AboutView() {
  const { t } = useT();
  const m = t.about;
  return (
    // Full-bleed wash: cream settles into warm sand toward the footer's horizon.
    <Surface
      tone="light"
      as="div"
      className="bg-[linear-gradient(to_bottom,var(--background)_0%,var(--background)_45%,var(--tint-sand)_100%)]"
    >
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-16 md:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] md:gap-16 md:px-8 md:py-24">
        <div className="md:sticky md:top-24 md:self-start">
          <PortraitSwitch aiImage={aboutAiRoyal} />
        </div>
        <div className="max-w-[62ch]">
          <p className="eyebrow text-eyebrow">{m.eyebrow}</p>
          <h1 className="mt-3 text-5xl md:text-6xl">{m.title}</h1>
          <blockquote className="mt-10 border-l-2 border-gold pl-5 font-serif text-3xl italic leading-snug">
            {m.quote}
          </blockquote>
          <div className="mt-10 space-y-5 text-lg leading-relaxed text-muted-foreground">
            <p>{m.p1}</p>
            <p>{m.p2}</p>
            <p>{m.p3}</p>
          </div>
          <h2 className="mt-14 text-3xl">{m.howTitle}</h2>
          <Pipeline />
        </div>
      </div>
    </Surface>
  );
}
