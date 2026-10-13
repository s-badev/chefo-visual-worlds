// "Around the World" — one entry per destination, in exhibition order.
// Destination order follows the final owner-selected collection. Source metadata is
// retained internally and is not shown to visitors.
//
// A destination is a creative brief until its portrait exists. To publish one, add a
// completed AiWork in ai-works.ts with the SAME slug and set `status: "published"`
// here. The artwork stores its image and any known generation metadata.
// See docs/ai-portraits.md.
import { getAiWork, localizeAiWork, type AiWork } from "./ai-works";
import type { Locale } from "@/i18n";

type LocalizedText = { bg: string; en: string };
const text = (bg: string, en: string): LocalizedText => ({ bg, en });

export type DestinationStyle = { kind: "modern" | "historical"; period?: LocalizedText };

export interface DestinationVideo {
  /** e.g. "/videos/around-the-world/<slug>.mp4" placed in public/videos/around-the-world/ */
  src: string;
  poster?: string;
  title: LocalizedText;
}

export interface Destination {
  slug: string;
  order: number;
  /** Internal provenance only; never displayed as a visitor-facing label. */
  source: "video" | "added";
  country: LocalizedText;
  /** A city or region, only where it is specified (never guessed from the video). */
  place?: LocalizedText;
  /** Political or geographic context, e.g. Greenland within the Kingdom of Denmark. */
  context?: LocalizedText;
  title: LocalizedText;
  description: LocalizedText;
  clothing: LocalizedText;
  grooming: LocalizedText;
  inspiration: LocalizedText;
  setting: LocalizedText;
  styles: DestinationStyle[];
  /** Concept draft in English; never treated as the exact prompt for published art. */
  promptDraft: string;
  /** Planned tool; the final tool is recorded on the published AiWork. */
  tool?: AiWork["tool"];
  status: "planned" | "published";
  video?: DestinationVideo;
}

const IDENTITY =
  "Editorial portrait of me, keep my facial features from the reference photo, respectful and authentic regional details, natural light, 4:5 portrait.";

export const destinations: Destination[] = [
  {
    slug: "chefo-v-sauditska-arabiya",
    order: 1,
    source: "added",
    country: text("Саудитска Арабия", "Saudi Arabia"),
    title: text("Под слънцето на Арабия", "Under the Arabian Sun"),
    description: text(
      "Бяла роба, палми и пясъчни дюни в топлата светлина на пустинята.",
      "A white robe, palms and sand dunes in warm desert light.",
    ),
    clothing: text("Бяла роба и светло покривало за глава с черен агал.", "A white robe and light head covering with a black agal."),
    grooming: text("Къса коса и поддържана брада.", "Short hair and a neat beard."),
    inspiration: text("Пустинен пейзаж и палми.", "A desert landscape and palm trees."),
    setting: text("Пясъчни дюни и палми в мека вечерна светлина.", "Sand dunes and palms in soft evening light."),
    styles: [{ kind: "modern" }],
    promptDraft: `${IDENTITY} Saudi Arabian desert scene with a white thobe, light head covering and black agal, palms, sand dunes and warm evening light. This is a concept, not the original generation prompt.`,
    status: "published",
  },
  {
    slug: "chefo-v-gartsiya",
    order: 2,
    source: "video",
    country: text("Гърция", "Greece"),
    title: text("Гръцки следобед", "A Greek Afternoon"),
    description: text(
      "Варосани стени, дорийски колони и синевата на Егейско море.",
      "Whitewashed walls, Doric columns and the blue of the Aegean.",
    ),
    clothing: text(
      "Модерно: ленена риза и панталон в бяло и пясъчно. Исторически: хитон и химатион от класическа Атина.",
      "Modern: a linen shirt and trousers in white and sand. Historical: a chiton and himation of Classical Athens.",
    ),
    grooming: text(
      "В историческия вариант — по-дълга къдрава коса и плътна брада.",
      "In the historical variant, longer curly hair and a full beard.",
    ),
    inspiration: text(
      "Класическата античност и светлината на Цикладите.",
      "Classical antiquity and the light of the Cyclades.",
    ),
    setting: text(
      "Варосани къщи със сини врати, дорийски колони и Егейско море.",
      "Whitewashed houses with blue doors, Doric columns and the Aegean Sea.",
    ),
    styles: [
      { kind: "modern" },
      { kind: "historical", period: text("V век пр. Хр.", "5th century BC") },
    ],
    promptDraft: `${IDENTITY} Greece. Historical variant: chiton and himation of Classical Athens (5th century BC), Doric columns in marble light. Modern variant: white and sand linen among whitewashed Cycladic houses with blue doors above the Aegean.`,
    status: "published",
  },
  {
    slug: "chefo-v-kuba",
    order: 3,
    source: "video",
    country: text("Куба", "Cuba"),
    title: text("Улиците на Куба", "Streets of Cuba"),
    description: text(
      "Пастелни фасади, класически автомобили и морски бриз по крайбрежната алея.",
      "Pastel façades, classic cars and a sea breeze along the promenade.",
    ),
    clothing: text(
      "Бяла гуаябера, ленен панталон и сламена шапка.",
      "A white guayabera, linen trousers and a straw hat.",
    ),
    grooming: text("Оформени мустаци и коса назад.", "A groomed moustache and hair swept back."),
    inspiration: text(
      "Хавана от 50-те, музиката сон и класическите автомобили.",
      "1950s Havana, son music and classic cars.",
    ),
    setting: text(
      "Колониални аркади, пастелни фасади и крайбрежната алея Малекон.",
      "Colonial arcades, pastel façades and the Malecón seawall.",
    ),
    styles: [{ kind: "modern" }, { kind: "historical", period: text("1950-те", "1950s") }],
    promptDraft: `${IDENTITY} Cuba. White guayabera, linen trousers and straw hat; colonial arcades and pastel façades of Old Havana, a 1950s classic car, the Malecón at golden hour.`,
    status: "published",
  },
  {
    slug: "chefo-v-braziliya",
    order: 4,
    source: "video",
    country: text("Бразилия", "Brazil"),
    title: text("Бразилски ритъм", "Brazilian Rhythm"),
    description: text(
      "Вълнообразен паваж, планини над залива и ритъмът на босанова.",
      "Wave-patterned pavements, mountains above the bay and the rhythm of bossa nova.",
    ),
    clothing: text(
      "Модерно: ленена риза с навити ръкави. Исторически: светъл костюм от епохата на босанова.",
      "Modern: a linen shirt with rolled sleeves. Historical: a light suit from the bossa nova era.",
    ),
    grooming: text("Къса коса и лека брада.", "Short hair and light stubble."),
    inspiration: text(
      "Босанова, крайбрежните квартали и модернистичната архитектура.",
      "Bossa nova, the seaside neighbourhoods and modernist architecture.",
    ),
    setting: text(
      "Вълнообразна мозайка от португалски паваж и планини над залива.",
      "A wave mosaic of Portuguese pavement and mountains above the bay.",
    ),
    styles: [
      { kind: "modern" },
      { kind: "historical", period: text("края на 1950-те", "late 1950s") },
    ],
    promptDraft: `${IDENTITY} Brazil. Historical variant: light late-1950s suit of the bossa nova era on a wave-patterned Portuguese mosaic promenade, mountains above the bay. Modern variant: linen shirt with rolled sleeves.`,
    status: "published",
  },
  {
    slug: "chefo-v-grenlandiya",
    order: 5,
    source: "video",
    country: text("Гренландия", "Greenland"),
    context: text(
      "Автономна територия в рамките на Кралство Дания",
      "Autonomous territory within the Kingdom of Denmark",
    ),
    title: text("Тишината на Гренландия", "The Quiet of Greenland"),
    description: text(
      "Айсберги, цветни дървени къщи и тишината на Арктика.",
      "Icebergs, colourful wooden houses and the silence of the Arctic.",
    ),
    // Traditional Kalaallit dress belongs to its community; the portrait uses modern gear.
    clothing: text(
      "Модерно експедиционно облекло: пухено яке, вълнена шапка и ръкавици.",
      "Modern expedition clothing: a down parka, wool hat and gloves.",
    ),
    grooming: text("Брада, леко покрита със скреж.", "A beard lightly touched with frost."),
    inspiration: text(
      "Арктическите експедиции и съвременният живот в крайбрежните селища.",
      "Arctic expeditions and contemporary life in the coastal settlements.",
    ),
    setting: text(
      "Айсберги в ледников фиорд, цветни дървени къщи и ниско полярно слънце.",
      "Icebergs in a glacial fjord, colourful wooden houses and a low polar sun.",
    ),
    styles: [{ kind: "modern" }],
    promptDraft: `${IDENTITY} Greenland. Modern expedition clothing: down parka, wool hat, frost in the beard; icebergs in a glacial fjord, colourful wooden houses, low polar sun.`,
    status: "published",
  },
  {
    slug: "chefo-v-rusiya",
    order: 6,
    source: "video",
    country: text("Русия", "Russia"),
    title: text("Руска зима", "Russian Winter"),
    description: text(
      "Зимна светлина, заснежени кейове и класически фасади.",
      "Winter light, snow-covered embankments and classical façades.",
    ),
    clothing: text(
      "Модерно: вълнено палто и плетен шал. Исторически: двуредно палто с яка от астраган и кожена шапка от началото на XX век.",
      "Modern: a wool coat and knitted scarf. Historical: an early 20th-century double-breasted coat with an astrakhan collar and fur hat.",
    ),
    grooming: text("Плътна, но поддържана брада.", "A full but well-kept beard."),
    inspiration: text(
      "Зимите на Санкт Петербург и класическата архитектура по Нева.",
      "Winters in St Petersburg and the classical architecture along the Neva.",
    ),
    setting: text(
      "Заснежени кейове, класически фасади и мостове над замръзнала река.",
      "Snowy embankments, classical façades and bridges over a frozen river.",
    ),
    styles: [
      { kind: "modern" },
      { kind: "historical", period: text("началото на XX век", "early 20th century") },
    ],
    promptDraft: `${IDENTITY} Russia. Historical variant: early 20th-century double-breasted coat with astrakhan collar and fur hat, snowy Neva embankment and classical façades. Modern variant: wool coat and knitted scarf in soft winter light.`,
    status: "published",
  },
  {
    slug: "chefo-v-italiya",
    order: 7,
    source: "video",
    country: text("Италия", "Italy"),
    title: text("Италианска елегантност", "Italian Elegance"),
    description: text(
      "Лимонови дървета, тераси над морето и маниерът на италианското кино.",
      "Lemon trees, terraces above the sea and the poise of Italian cinema.",
    ),
    clothing: text(
      "Исторически: ленен костюм в цвят пясък и слънчеви очила от 60-те. Модерно: бяла ленена риза.",
      "Historical: a sand-coloured linen suit and 1960s sunglasses. Modern: a white linen shirt.",
    ),
    grooming: text(
      "Коса назад с лек блясък и гладко оформена брада.",
      "Hair slicked back with a soft shine and a neatly shaped beard.",
    ),
    inspiration: text(
      "Италианското кино от 50-те и 60-те и крайбрежните градчета.",
      "Italian cinema of the 1950s and 60s and the coastal towns.",
    ),
    setting: text(
      "Тераси над морето, лимонови дървета и Веспа на калдъръмена уличка.",
      "Terraces above the sea, lemon trees and a Vespa in a cobbled lane.",
    ),
    styles: [{ kind: "modern" }, { kind: "historical", period: text("1960-те", "1960s") }],
    promptDraft: `${IDENTITY} Italy. Historical variant: 1960s sand-coloured linen suit and sunglasses, coastal terrace with lemon trees above the sea, a Vespa in a cobbled lane. Modern variant: white linen shirt in late golden light.`,
    status: "published",
  },
  {
    slug: "chefo-vav-frantsiya",
    order: 8,
    source: "video",
    country: text("Франция", "France"),
    title: text("Френски стил", "French Style"),
    description: text(
      "Каменни булеварди, цинкови покриви и тераса на кафене.",
      "Stone boulevards, zinc rooftops and a café terrace.",
    ),
    clothing: text(
      "Модерно: тъмносин тренчкот и пуловер. Исторически: тройка, бомбе и джобен часовник от епохата Бел епок.",
      "Modern: a navy trench coat and sweater. Historical: a three-piece suit, bowler hat and pocket watch of the Belle Époque.",
    ),
    grooming: text(
      "Оформени мустаци и брада, коса с път.",
      "A groomed moustache and beard, side-parted hair.",
    ),
    inspiration: text(
      "Парижките кафенета, булевардите на Осман и импресионистите.",
      "Parisian cafés, Haussmann's boulevards and the Impressionists.",
    ),
    setting: text(
      "Каменни фасади с ковани балкони, цинкови покриви и мокър паваж след дъжд.",
      "Stone façades with wrought-iron balconies, zinc rooftops and wet cobbles after rain.",
    ),
    styles: [{ kind: "modern" }, { kind: "historical", period: text("около 1900", "around 1900") }],
    promptDraft: `${IDENTITY} France. Historical variant: Belle Époque three-piece suit, bowler hat and pocket watch around 1900, Haussmann façades with wrought-iron balconies. Modern variant: navy trench coat at a café terrace, wet cobbles after rain.`,
    status: "published",
  },
  {
    slug: "chefo-v-indiya",
    order: 9,
    source: "video",
    country: text("Индия", "India"),
    title: text("Цветовете на Индия", "Colors of India"),
    description: text(
      "Пясъчникови дворци, балкони джарокха и цветът на пазарите за текстил.",
      "Sandstone palaces, jharokha balconies and the colour of the textile markets.",
    ),
    clothing: text(
      "Модерно: ленена курта. Исторически: закопчано сако бандхгала (джодпурски костюм) от началото на XX век, по избор със сафа, вързана по раджастански маниер.",
      "Modern: a linen kurta. Historical: an early 20th-century bandhgala (Jodhpuri suit), optionally with a safa tied in the Rajasthani manner.",
    ),
    grooming: text("Подстригана брада и коса назад.", "A trimmed beard and hair swept back."),
    inspiration: text(
      "Княжеските дворци на Раджастан и занаятите на блоковия печат.",
      "The princely palaces of Rajasthan and the craft of block printing.",
    ),
    setting: text(
      "Хавели от пясъчник с резбовани балкони джарокха и сини фасади.",
      "Sandstone havelis with carved jharokha balconies and blue façades.",
    ),
    styles: [
      { kind: "modern" },
      { kind: "historical", period: text("началото на XX век", "early 20th century") },
    ],
    promptDraft: `${IDENTITY} India. Historical variant: early 20th-century bandhgala Jodhpuri suit, optional Rajasthani safa, sandstone haveli with carved jharokha balconies. Modern variant: linen kurta among block-printed textiles.`,
    status: "published",
  },
  {
    slug: "chefo-v-turtsiya",
    order: 10,
    source: "video",
    country: text("Турция", "Turkey"),
    title: text("Между традиция и съвременност", "Between Tradition and Modernity"),
    description: text(
      "Фериботи, чай в лалевидни чаши и сини изникски плочки.",
      "Ferries, tea in tulip glasses and blue İznik tiles.",
    ),
    clothing: text(
      "Модерно: тъмно вълнено палто и шал. Исторически: стамбулина (сюртук) и фес от епохата на Танзимата.",
      "Modern: a dark wool coat and scarf. Historical: a stambouline frock coat and fez from the Tanzimat era.",
    ),
    grooming: text("Оформени мустаци и къса брада.", "A groomed moustache and short beard."),
    inspiration: text(
      "Късната Османска епоха, кафенетата и животът край Босфора.",
      "The late Ottoman era, coffee houses and life along the Bosphorus.",
    ),
    setting: text(
      "Изникски плочки, дървени крайбрежни къщи (ялъ) и купол на джамия в далечината.",
      "İznik tiles, wooden waterside houses (yalı) and a mosque dome in the distance.",
    ),
    styles: [{ kind: "modern" }, { kind: "historical", period: text("1870–1900", "1870–1900") }],
    promptDraft: `${IDENTITY} Turkey. Historical variant: stambouline frock coat and fez of the Tanzimat era (1870–1900), İznik tiles, wooden yalı houses on the Bosphorus. Modern variant: dark wool coat and scarf on a Bosphorus ferry deck, tea in a tulip glass.`,
    status: "published",
  },
  {
    slug: "chefo-v-egipet",
    order: 11,
    source: "video",
    country: text("Египет", "Egypt"),
    title: text("Египетски хоризонти", "Egyptian Horizons"),
    description: text(
      "Нилът, резбованото дърво на старите квартали и светлината на късния следобед.",
      "The Nile, the carved wood of the old quarters and late-afternoon light.",
    ),
    clothing: text(
      "Модерно: ленена риза и светъл панталон. Исторически: галабия и тарбуш, характерни за градски Египет през 20-те години на XX век.",
      "Modern: a linen shirt and light trousers. Historical: a galabiya and tarboosh, typical of urban Egypt in the 1920s.",
    ),
    grooming: text("Къса брада и коса с път встрани.", "A short beard and side-parted hair."),
    inspiration: text(
      "Ислямски Кайро, старите пазари и плаването с фелука по Нил.",
      "Islamic Cairo, the old markets and felucca sailing on the Nile.",
    ),
    setting: text(
      "Резбовани дървени машрабии, каменни арки и платна на фелуки при залез.",
      "Carved wooden mashrabiya screens, stone arches and felucca sails at sunset.",
    ),
    styles: [{ kind: "modern" }, { kind: "historical", period: text("1920-те", "1920s") }],
    promptDraft: `${IDENTITY} Egypt. Historical variant: galabiya and tarboosh as worn in 1920s urban Egypt, carved mashrabiya screens and stone arches of Islamic Cairo. Modern variant: linen shirt, felucca sails on the Nile at sunset.`,
    status: "published",
  },
  {
    slug: "chefo-v-dubai",
    order: 12,
    source: "video",
    country: text("ОАЕ", "UAE"),
    place: text("Дубай", "Dubai"),
    title: text("Съвременен Дубай", "Modern Dubai"),
    description: text(
      "Между вятърните кули на стария Дубай и стъклото на новия град.",
      "Between the wind towers of old Dubai and the glass of the new city.",
    ),
    clothing: text(
      "Модерно: светъл ленен костюм без вратовръзка. Исторически: бяла кандура с гутра и агал, както в квартал Ал Фахиди преди петролната епоха.",
      "Modern: a light linen suit with an open collar. Historical: a white kandura with ghutra and agal, as worn in the Al Fahidi quarter before the oil era.",
    ),
    grooming: text(
      "Късо подстригана коса и поддържана брада.",
      "Short hair and a well-kept beard.",
    ),
    inspiration: text(
      "Търговията по залива Дубай Крийк, лодките абра и наследството на гмуркането за перли.",
      "Trade along Dubai Creek, the abra boats and the pearl-diving heritage.",
    ),
    setting: text(
      "Вятърни кули (барджил) и стени от коралов камък; в модерния вариант — заливът в синия час със силуета на града.",
      "Wind towers (barjeel) and coral-stone walls; in the modern variant, the Creek at blue hour with the skyline.",
    ),
    styles: [
      { kind: "modern" },
      { kind: "historical", period: text("началото на XX век", "early 20th century") },
    ],
    promptDraft: `${IDENTITY} Dubai. Historical variant: white kandura with ghutra and agal in the early 20th-century Al Fahidi quarter, coral-stone walls, barjeel wind towers, abra boats on Dubai Creek. Modern variant: light linen suit by the Creek at blue hour, skyline behind.`,
    status: "published",
  },
];

export const destinationText = (value: LocalizedText, locale: Locale) => value[locale];

export const getDestinations = () => destinations.slice().sort((a, b) => a.order - b.order);

export const getDestination = (slug: string) => destinations.find((d) => d.slug === slug);

/** The finished portrait of a published destination (same slug), localized. */
export const getDestinationWork = (destination: Destination, locale: Locale) => {
  if (destination.status !== "published") return undefined;
  const work = getAiWork(destination.slug);
  return work ? localizeAiWork(work, locale) : undefined;
};

/** Slugs of finished destination portraits, in destination order. */
export const getPublishedDestinationSlugs = () =>
  getDestinations()
    .filter((d) => d.status === "published" && getAiWork(d.slug))
    .map((d) => d.slug);

export const getAdjacentDestinations = (destination: Destination) => {
  const ordered = getDestinations();
  const i = ordered.findIndex((d) => d.slug === destination.slug);
  return {
    prev: ordered[(i - 1 + ordered.length) % ordered.length]!,
    next: ordered[(i + 1) % ordered.length]!,
  };
};
