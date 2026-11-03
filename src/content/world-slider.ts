import type { Locale } from "@/i18n";

type LocalizedText = Record<Locale, string>;

export type WorldSlide = {
  id: string;
  slug: string;
  name: LocalizedText;
  real: { image: string; alt: LocalizedText };
  ai: { image: string; alt: LocalizedText };
  focus: readonly [desktop: string, mobile: string];
  tagL: LocalizedText;
  tagR: LocalizedText;
  cap: LocalizedText;
};

export const WORLD_SLIDES: readonly WorldSlide[] = [
  {
    id: "sofia",
    slug: "sofia",
    name: { bg: "София", en: "Sofia" },
    real: {
      image: "/worlds/sofia-real.webp",
      alt: {
        bg: "Реален свят: площад Ларго в София при залез, със сградите около него",
        en: "Real world: Largo Square in Sofia at sunset, with the buildings around it",
      },
    },
    ai: {
      image: "/worlds/sofia-ai.webp",
      alt: {
        bg: "AI свят: София 2200, същите сгради на Ларго, нова настилка, летящи коли, роботи и дрехи на бъдещето",
        en: "AI world: Sofia in 2200, the same Largo buildings, new paving, flying cars, robots and clothes of the future",
      },
    },
    focus: ["50% 50%", "20% 50%"],
    tagL: { bg: "София", en: "Sofia" },
    tagR: { bg: "2200", en: "2200" },
    cap: {
      bg: "Същото място, същото лице. Отляво е истинската снимка от Ларго, отдясно е AI визия за София през 2200: същите каменни сгради, нова настилка, роботи и летящи коли.",
      en: "Same place, same face. On the left is the real photo from Largo; on the right is an AI vision of Sofia in 2200: the same stone buildings, new paving, robots and flying cars.",
    },
  },
  {
    id: "istanbul",
    slug: "istanbul",
    name: { bg: "Истанбул", en: "Istanbul" },
    real: {
      image: "/worlds/istanbul-real.webp",
      alt: { bg: "Реален свят: Ортакьой, Истанбул", en: "Real world: Ortaköy, Istanbul" },
    },
    ai: {
      image: "/worlds/istanbul-ai.webp",
      alt: {
        bg: "AI свят: Константинопол около 1450 г., византийски благородник, каменна църква, градски стени, Света София и кораби",
        en: "AI world: Constantinople around 1450, a Byzantine nobleman, a stone church, city walls, Hagia Sophia and ships",
      },
    },
    focus: ["50% 50%", "58% 50%"],
    tagL: { bg: "Истанбул", en: "Istanbul" },
    tagR: { bg: "Константинопол 1450", en: "Constantinople 1450" },
    cap: {
      bg: "Същото място, същото лице. Отляво е Босфорът днес, отдясно е AI реконструкция на Константинопол около 1450 г.: византийска църква, градските стени, Света София и кораби от епохата.",
      en: "Same place, same face. On the left is the Bosphorus today; on the right is an AI reconstruction of Constantinople around 1450: a Byzantine church, the city walls, Hagia Sophia and ships of the era.",
    },
  },
  {
    id: "paris",
    slug: "paris",
    name: { bg: "Париж", en: "Paris" },
    real: {
      image: "/worlds/paris-real.webp",
      alt: {
        bg: "Реален свят: Париж, Айфеловата кула от Трокадеро на залез",
        en: "Real world: Paris, the Eiffel Tower seen from Trocadéro at sunset",
      },
    },
    ai: {
      image: "/worlds/paris-ai.webp",
      alt: {
        bg: "AI свят: Париж 1900, жълта Айфелова кула, Световно изложение и дрехи от епохата",
        en: "AI world: Paris in 1900, a yellow Eiffel Tower, the World's Fair and period clothes",
      },
    },
    focus: ["50% 50%", "14% 50%"],
    tagL: { bg: "Париж", en: "Paris" },
    tagR: { bg: "1900", en: "1900" },
    cap: {
      bg: "Същото място, същото лице. Отляво е Париж днес, отдясно е AI реконструкция на Париж от времето на Световното изложение през 1900 г.",
      en: "Same place, same face. On the left is Paris today; on the right is an AI reconstruction of Paris at the time of the 1900 World's Fair.",
    },
  },
] as const;

export const localizeWorldSlide = (world: WorldSlide, locale: Locale) => ({
  ...world,
  name: world.name[locale],
  real: { image: world.real.image, alt: world.real.alt[locale] },
  ai: { image: world.ai.image, alt: world.ai.alt[locale] },
  tagL: world.tagL[locale],
  tagR: world.tagR[locale],
  cap: world.cap[locale],
});
