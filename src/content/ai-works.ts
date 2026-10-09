// Local content layer for AI creations.
// Shape mirrors a future database table `ai_works` (+ related image rows).
// TODO: replace sample images and prompts with your real artwork and exact prompts.
import knight from "@/assets/ai-knight.png";
import knightHorse from "@/assets/ai-knight-horse.png";
import seaKing from "@/assets/ai-sea-king.png";
import renaissance from "@/assets/ai-renaissance.png";
import future from "@/assets/ai-future.png";
import summer from "@/assets/ai-summer.png";
import nesebarCoast from "@/assets/photo-nesebar-coast.jpg";
import sunnySunset from "@/assets/photo-sunny-sunset.jpg";
import type { Locale } from "@/i18n";

export const AI_CATEGORIES = [
  "Средновековие",
  "Исторически образи",
  "Кино визии",
  "Фантастика",
  "Забавни колажи",
] as const;
export const AI_TOOLS = ["ChatGPT Image Generation", "Grok", "Other"] as const;
export const AI_ROLES = ["ruler", "explorer"] as const;
export const AI_ERAS = ["medieval", "renaissance", "1960s"] as const;
export const AI_SETTINGS = [
  "throne-hall",
  "underwater-kingdom",
  "portrait-backdrop",
  "alien-desert",
  "black-sea-beach",
] as const;
export type AiRole = (typeof AI_ROLES)[number];
export type AiEra = (typeof AI_ERAS)[number];
export type AiSetting = (typeof AI_SETTINGS)[number];

export interface AiImage {
  src: string;
  alt: string;
  caption?: string | undefined;
  en?: { alt?: string; caption?: string };
}

export interface AiWork {
  slug: string;
  title: string;
  image: string;
  alt: string;
  description: string;
  /** Original generation prompt — never translated. */
  prompt: string;
  tool: (typeof AI_TOOLS)[number];
  date: string;
  category: (typeof AI_CATEGORIES)[number];
  /** Additional facets for completed artworks only; omit values that are not supported by the work. */
  role?: AiRole;
  era?: AiEra;
  setting?: AiSetting;
  references: AiImage[]; // TODO: your real source photos
  variants: AiImage[]; // TODO: other images from the same series
  /** English version; missing fields fall back to Bulgarian. */
  en?: { title?: string; alt?: string; description?: string };
}

const selfRef: AiImage = {
  src: renaissance, alt: "Референтен портрет (примерен)", caption: "Портрет за референция",
  en: { alt: "Reference portrait (sample)", caption: "Reference portrait" },
};

export const aiWorks: AiWork[] = [
  {
    slug: "chefo-srednovekoven-ritsar",
    title: "Чефо като средновековен рицар",
    image: knight,
    alt: "AI портрет на брадат мъж като средновековен владетел с корона и броня в тронна зала",
    description: "Владетел на свещи и стомана — портрет от измислена хроника.",
    prompt:
      "Cinematic painterly portrait of me as a medieval Bulgarian king, wearing engraved steel armor and a deep navy velvet cloak embroidered with golden lions, simple gold crown, sitting on a throne in a candlelit stone hall, dramatic chiaroscuro lighting, muted navy and gold palette, 4:5 portrait, keep my facial features from the reference photo.",
    tool: "ChatGPT Image Generation",
    date: "2025-09-12",
    category: "Средновековие",
    role: "ruler",
    era: "medieval",
    setting: "throne-hall",
    references: [selfRef],
    variants: [
      { src: knightHorse, alt: "Рицар на кон на бойно поле при изгрев", caption: "На зазоряване", en: { alt: "A knight on horseback on a battlefield at sunrise", caption: "At dawn" } },
      { src: knight, alt: "Портрет в тронна зала", caption: "Тронната зала", en: { alt: "Portrait in a throne hall", caption: "The throne hall" } },
    ],
    en: {
      title: "Chefo as a medieval knight",
      alt: "AI portrait of a bearded man as a medieval ruler with a crown and armour in a throne hall",
      description: "A ruler of candles and steel — a portrait from an imagined chronicle.",
    },
  },
  {
    slug: "vladetel-na-morskoto-kralstvo",
    title: "Владетел на морското кралство",
    image: seaKing,
    alt: "AI портрет на мъж с корона от корали и перли и златен тризъбец под водата",
    description: "Корона от корали, тризъбец и тишината на дълбокото.",
    prompt:
      "Me as the ruler of an underwater sea kingdom, crown of white coral and pearls, golden trident, navy velvet robe, schools of fish in the background, deep teal and gold palette, cinematic lighting, painterly realism, 4:5 portrait.",
    tool: "Grok",
    date: "2025-08-20",
    category: "Фантастика",
    role: "ruler",
    setting: "underwater-kingdom",
    references: [selfRef, { src: nesebarCoast, alt: "Морето край Несебър", caption: "Вдъхновение: морето", en: { alt: "The sea near Nesebar", caption: "Inspiration: the sea" } }],
    variants: [{ src: seaKing, alt: "Морският владетел", caption: "Основен кадър", en: { alt: "The sea ruler", caption: "Main image" } }],
    en: {
      title: "Ruler of the sea kingdom",
      alt: "AI portrait of a man with a crown of coral and pearls and a golden trident underwater",
      description: "A crown of coral, a trident and the silence of the deep.",
    },
  },
  {
    slug: "renesansov-portret",
    title: "Ренесансов портрет",
    image: renaissance,
    alt: "Портрет в стил Ренесанс на брадат мъж в кадифена дреха на тъмен фон",
    description: "Кадифе, светлина от прозорец и търпението на маслената живопис.",
    prompt:
      "Renaissance oil painting portrait of me in a dark velvet doublet with a white ruffled collar, dark background, soft window light from the left, Titian style brushwork, museum quality, 4:5.",
    tool: "ChatGPT Image Generation",
    date: "2025-06-03",
    category: "Исторически образи",
    era: "renaissance",
    setting: "portrait-backdrop",
    references: [selfRef],
    variants: [{ src: renaissance, alt: "Ренесансов портрет", caption: "Финална версия", en: { alt: "Renaissance portrait", caption: "Final version" } }],
    en: {
      title: "Renaissance portrait",
      alt: "Renaissance-style portrait of a bearded man in a velvet garment on a dark background",
      description: "Velvet, window light and the patience of oil painting.",
    },
  },
  {
    slug: "chefo-v-badeshteto",
    title: "Чефо в бъдещето",
    image: future,
    alt: "Кино кадър на мъж в износен скафандър в пустиня на чужда планета с гигантска планета в небето",
    description: "Космически изследовател под небе, което не е нашето.",
    prompt:
      "Cinematic film still of me as a space explorer in a worn white and rust spacesuit, standing in an alien desert at dusk, a giant ringed planet filling the sky, muted navy and amber color grade, anamorphic lens, 35mm film grain.",
    tool: "Grok",
    date: "2025-10-01",
    category: "Кино визии",
    role: "explorer",
    setting: "alien-desert",
    references: [selfRef],
    variants: [{ src: future, alt: "Космическият изследовател", caption: "Основен кадър", en: { alt: "The space explorer", caption: "Main image" } }],
    en: {
      title: "Chefo in the future",
      alt: "Film still of a man in a worn spacesuit in an alien desert with a giant planet in the sky",
      description: "A space explorer under a sky that isn't ours.",
    },
  },
  {
    slug: "lyato-na-moreto-ai-kolazh",
    title: "Лято на морето — AI колаж",
    image: summer,
    alt: "Винтидж летен колаж с мъж в раирано облекло на плажа, марки и изрезки",
    description: "Ретро картичка от Черноморието, сглобена от хартия и спомени.",
    prompt:
      "Playful vintage summer collage of me on a Black Sea beach in a retro 1960s striped shirt and shorts, torn paper cutouts, old postage stamps, seagull, beach umbrellas, warm cream and terracotta tones, scrapbook texture.",
    tool: "Other",
    date: "2025-07-15",
    category: "Забавни колажи",
    era: "1960s",
    setting: "black-sea-beach",
    references: [selfRef, { src: sunnySunset, alt: "Плажът на Слънчев бряг", caption: "Снимка от плажа", en: { alt: "The beach at Sunny Beach", caption: "Photo from the beach" } }],
    variants: [{ src: summer, alt: "Летен колаж", caption: "Основен колаж", en: { alt: "Summer collage", caption: "Main collage" } }],
    en: {
      title: "Summer by the sea — AI collage",
      alt: "Vintage summer collage with a man in striped clothes on the beach, stamps and cut-outs",
      description: "A retro postcard from the Black Sea coast, pieced together from paper and memories.",
    },
  },
];

export const getAiWork = (slug: string) => aiWorks.find((w) => w.slug === slug);

export interface AiFilters {
  category?: string | undefined;
  role?: string | undefined;
  era?: string | undefined;
  setting?: string | undefined;
  tool?: string | undefined;
}

export const filterAiWorks = (items: AiWork[], filters: AiFilters) =>
  items.filter(
    (work) =>
      (!filters.category || work.category === filters.category) &&
      (!filters.role || work.role === filters.role) &&
      (!filters.era || work.era === filters.era) &&
      (!filters.setting || work.setting === filters.setting) &&
      (!filters.tool || work.tool === filters.tool),
  );

/** Filter options are drawn exclusively from completed portfolio works. */
export const getAiFilterOptions = () => ({
  categories: AI_CATEGORIES.filter((value) => aiWorks.some((work) => work.category === value)),
  roles: AI_ROLES.filter((value) => aiWorks.some((work) => work.role === value)),
  eras: AI_ERAS.filter((value) => aiWorks.some((work) => work.era === value)),
  settings: AI_SETTINGS.filter((value) => aiWorks.some((work) => work.setting === value)),
  tools: AI_TOOLS.filter((value) => aiWorks.some((work) => work.tool === value)),
});

const ROLE_LABELS: Record<AiRole, { bg: string; en: string }> = {
  ruler: { bg: "Владетел", en: "Ruler" },
  explorer: { bg: "Изследовател", en: "Explorer" },
};
const ERA_LABELS: Record<AiEra, { bg: string; en: string }> = {
  medieval: { bg: "Средновековие", en: "Medieval" },
  renaissance: { bg: "Ренесанс", en: "Renaissance" },
  "1960s": { bg: "60-те години", en: "1960s" },
};
const SETTING_LABELS: Record<AiSetting, { bg: string; en: string }> = {
  "throne-hall": { bg: "Тронна зала", en: "Throne hall" },
  "underwater-kingdom": { bg: "Подводно кралство", en: "Underwater kingdom" },
  "portrait-backdrop": { bg: "Портретен фон", en: "Portrait backdrop" },
  "alien-desert": { bg: "Извънземна пустиня", en: "Alien desert" },
  "black-sea-beach": { bg: "Черноморски плаж", en: "Black Sea beach" },
};
export const aiRoleLabel = (value: AiRole, locale: Locale) => ROLE_LABELS[value][locale];
export const aiEraLabel = (value: AiEra, locale: Locale) => ERA_LABELS[value][locale];
export const aiSettingLabel = (value: AiSetting, locale: Locale) => SETTING_LABELS[value][locale];

const CATEGORY_EN: Record<string, string> = {
  Средновековие: "Medieval",
  "Исторически образи": "Historical portraits",
  "Кино визии": "Cinematic visions",
  Фантастика: "Fantasy",
  "Забавни колажи": "Playful collages",
};

export const aiCategoryLabel = (c: string, locale: Locale) => (locale === "en" ? CATEGORY_EN[c] ?? c : c);

/** Display label for a tool id (data ids stay unchanged). */
export const toolLabel = (t: string, locale: Locale = "bg") =>
  t === "Other" ? (locale === "en" ? "Other tool" : "Друг инструмент") : t;

const localizeImage = (img: AiImage, locale: Locale): AiImage =>
  locale === "en" ? { ...img, alt: img.en?.alt ?? img.alt, caption: img.en?.caption ?? img.caption } : img;

/** Work with text in the requested language. The prompt is always the original. */
export const localizeAiWork = (w: AiWork, locale: Locale): AiWork => {
  if (locale === "bg") return w;
  const e = w.en ?? {};
  return {
    ...w,
    title: e.title ?? w.title, alt: e.alt ?? w.alt, description: e.description ?? w.description,
    references: w.references.map((r) => localizeImage(r, locale)),
    variants: w.variants.map((v) => localizeImage(v, locale)),
  };
};
