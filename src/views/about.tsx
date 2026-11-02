import { PortraitSwitch } from "@/components/portrait";
import aboutAiRoyal from "@/assets/about-ai-royal-new.webp";
import { Surface } from "@/components/surface";
import { getMessages, pageHead, useT, type Locale } from "@/i18n";

export const aboutHead = (locale: Locale) => {
  const m = getMessages(locale).about;
  return pageHead(locale, "/about", m.metaTitle, m.metaDesc);
};

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
          <PortraitSwitch aiImage={aboutAiRoyal} frame="matted" />
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
        </div>
      </div>
    </Surface>
  );
}
