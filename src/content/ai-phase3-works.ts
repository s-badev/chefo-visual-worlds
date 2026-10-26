// Phase 3 additions from the owner's seven prepared PNG artworks.
// Runtime delivery uses native-size WebP derivatives; sourceAsset keeps the
// byte-identical PNG original for provenance.
import beachCornVendor from "@/assets/ai-professions/chefo-beach-corn-vendor.webp";
import painterAtWork from "@/assets/ai-professions/chefo-painter-at-work.webp";
import eyeOfTheStorm from "@/assets/ai-cinema-archetypes/eye-of-the-storm.webp";
import coastalAdventure from "@/assets/chefo-coastal-adventure.webp";
import rainyNewYork from "@/assets/chefo-rainy-new-york.webp";
import riceTerracesMorning from "@/assets/chefo-rice-terraces-morning.webp";
import sydneyHarbourSunset from "@/assets/chefo-sydney-harbour-sunset.webp";
import type { AiWork } from "./ai-works";

type LocalizedText = { bg: string; en: string };
const text = (bg: string, en: string): LocalizedText => ({ bg, en });

type Phase3Row = {
  slug: string;
  image: string;
  sourceAsset: string;
  category: AiWork["category"];
  title: [bg: string, en: string];
  description: [bg: string, en: string];
  alt: [bg: string, en: string];
  scene: string;
  portraitDetails?: AiWork["portraitDetails"];
};

/** The original prompts were not supplied; these prompts transparently reconstruct the visible scenes. */
const reconstructionPrompt = (scene: string) =>
  "Using the uploaded reference photograph as the identity source, create a photorealistic vertical editorial artwork of the same person. Preserve the person's recognizable facial identity, natural facial proportions, skin tone and individual features from the reference photograph. " +
  scene +
  " Keep the pose, hands, clothing and environment physically coherent, with natural facial rendering and detailed photographic textures. Avoid caricature, plastic skin, distorted anatomy, watermarks and added text.";

const rows: Phase3Row[] = [
  {
    slug: "chefo-beach-corn-vendor",
    image: beachCornVendor,
    sourceAsset: "src/assets/ai-professions/chefo-beach-corn-vendor.png",
    category: "Професии и роли",
    title: ["Майсторът на царевицата", "The Corn Vendor"],
    description: [
      "По крайбрежната алея ароматът на топла царевица събира летовниците край малкия щанд. За този продавач лятото е сезон на работа, срещи и весели истории.",
      "Along the seaside promenade, the aroma of warm corn draws holidaymakers to the small stand. For this vendor, summer is a season of work, encounters and cheerful stories.",
    ],
    alt: [
      "Продавач подправя топла варена царевица на щанд край морето",
      "Vendor seasoning hot boiled corn at a seaside stand",
    ],
    scene:
      "Show the person as a seaside corn vendor in a cap, white T-shirt and dark apron, holding a steaming corn cob with tongs while seasoning it over a large metal pot. Place a lively beach, sea and a clearly handmade corn-stand sign behind the waist-up figure in warm summer light.",
  },
  {
    slug: "chefo-painter-at-work",
    image: painterAtWork,
    sourceAsset: "src/assets/ai-professions/chefo-painter-at-work.png",
    category: "Професии и роли",
    title: ["Бояджия с характер", "The Painter's Touch"],
    description: [
      "Един обикновен ремонт се превръща в цветно приключение. Майсторът запазва доброто си настроение дори когато боята решава да тръгне в неочаквана посока.",
      "An ordinary renovation turns into a colourful adventure. The painter keeps his good humour even when the paint decides to travel in an unexpected direction.",
    ],
    alt: [
      "Бояджия с изцапано работно облекло държи валяк с капеща бяла боя",
      "Painter in paint-splattered workwear holding a roller dripping with white paint",
    ],
    scene:
      "Show the person as an interior painter in white paint-splattered overalls, holding a long roller above one shoulder as white paint drips from it and into their open hand. Set the waist-up portrait inside a bright apartment under renovation with covered furniture, an open paint bucket and a ladder.",
  },
  {
    slug: "chefo-rainy-new-york",
    image: rainyNewYork,
    sourceAsset: "src/assets/chefo-rainy-new-york.png",
    category: "Култури по света",
    title: ["Ню Йорк след дъжда", "New York After the Rain"],
    description: [
      "След дъжда Ню Йорк забавя крачка, поне за един квартал. Тъкмо тогава разбираш, че градът има и други истории освен бързането.",
      "After the rain, New York slows down for a block or two. That’s when you notice the city has stories beyond the rush.",
    ],
    alt: [
      "Мъж с тъмно палто и чаша кафе на дъждовна улица в Ню Йорк",
      "Man in a dark coat holding coffee on a rainy New York street",
    ],
    scene:
      "Place the person on a rain-soaked New York avenue in a dark wool coat and scarf, holding a takeaway coffee. Frame them from the waist up with yellow taxis, umbrellas, wet crosswalk reflections and the Empire State Building visible through soft rain behind them.",
    portraitDetails: {
      clothing: text("Тъмно вълнено палто и шал.", "A dark wool coat and scarf."),
      grooming: text("Къса коса и поддържана брада.", "Short hair and a neat beard."),
      setting: text(
        "Мокър нюйоркски булевард с таксита, чадъри и градски отражения.",
        "A rain-soaked New York avenue with taxis, umbrellas and city reflections.",
      ),
    },
  },
  {
    slug: "chefo-sydney-harbour-sunset",
    image: sydneyHarbourSunset,
    sourceAsset: "src/assets/chefo-sydney-harbour-sunset.png",
    category: "Култури по света",
    title: ["Залез над Сидни", "Sydney at Sunset"],
    description: [
      "В Сидни вечерта идва без особена церемония. Оказва се, че някои гледки са по-хубави, когато не се опитваш да ги запомниш.",
      "In Sydney, evening arrives without much ceremony. Some views are better when you stop trying so hard to remember them.",
    ],
    alt: [
      "Мъж със светлосиня ленена риза край пристанището на Сидни по залез",
      "Man in a light blue linen shirt by Sydney Harbour at sunset",
    ],
    scene:
      "Seat the person beside Sydney Harbour at sunset in a light blue linen shirt and sunglasses. Compose a relaxed waist-up portrait with the Opera House, Harbour Bridge, ferries and warm reflections across the water clearly visible behind them.",
    portraitDetails: {
      clothing: text(
        "Светлосиня ленена риза и слънчеви очила.",
        "A light blue linen shirt and sunglasses.",
      ),
      grooming: text("Къса коса и поддържана брада.", "Short hair and a neat beard."),
      setting: text(
        "Пристанището на Сидни с Операта и Харбър Бридж в златната светлина на залеза.",
        "Sydney Harbour with the Opera House and Harbour Bridge in golden sunset light.",
      ),
    },
  },
  {
    slug: "chefo-coastal-adventure",
    image: coastalAdventure,
    sourceAsset: "src/assets/chefo-coastal-adventure.png",
    category: "Култури по света",
    title: ["Последните лъчи", "The Last Light"],
    description: [
      "Тръгваш да продължиш пътя, но оставаш още минута. Понякога най-доброто решение за днес е да оставиш следващото за утре.",
      "You mean to keep going, then stay another minute. Sometimes the best decision today is to leave the next one for tomorrow.",
    ],
    alt: [
      "Пътешественик с раница на скалист тропически бряг по залез",
      "Traveller with a backpack on a rocky tropical coast at sunset",
    ],
    scene:
      "Place the person as a traveller on an unspecified rocky tropical coast at sunset, wearing a floral linen shirt and backpack. Frame the seated figure against palms, dark volcanic rocks, breaking waves, distant mountains and a dramatic orange sky, without naming a precise destination.",
    portraitDetails: {
      clothing: text(
        "Ленена риза с тропически мотиви и раница.",
        "A linen shirt with tropical motifs and a backpack.",
      ),
      grooming: text("Къса коса и естествена брада.", "Short hair and a natural beard."),
      setting: text(
        "Неуточнен скалист тропически бряг с палми, вълни и планини по залез.",
        "An unspecified rocky tropical coast with palms, waves and mountains at sunset.",
      ),
    },
  },
  {
    slug: "chefo-rice-terraces-morning",
    image: riceTerracesMorning,
    sourceAsset: "src/assets/chefo-rice-terraces-morning.png",
    category: "Култури по света",
    title: ["Утро сред оризовите тераси", "Morning Among the Rice Terraces"],
    description: [
      "Първата ти мисъл не е накъде да тръгнеш. Някои утрини те учат да останеш, преди да продължиш.",
      "Your first thought isn’t where to go next. Some mornings teach you to stay before you set off.",
    ],
    alt: [
      "Мъж с чаша кафе пред зелени оризови тераси и тропически планини",
      "Man holding coffee before green rice terraces and tropical mountains",
    ],
    scene:
      "Seat the person with a ceramic coffee cup on a shaded terrace overlooking lush rice fields in soft morning light. Dress them in pale linen and show tropical palms, carved stone details and misty mountains, while leaving the exact country unspecified.",
    portraitDetails: {
      clothing: text("Светла ленена риза и панталон.", "A pale linen shirt and trousers."),
      grooming: text("Къса коса и поддържана брада.", "Short hair and a neat beard."),
      setting: text(
        "Зелени оризови тераси, тропически палми и планини в мека утринна светлина.",
        "Green rice terraces, tropical palms and mountains in soft morning light.",
      ),
    },
  },
  {
    slug: "eye-of-the-storm",
    image: eyeOfTheStorm,
    sourceAsset: "src/assets/ai-cinema-archetypes/eye-of-the-storm.png",
    category: "Кино визии",
    title: ["В окото на бурята", "Eye of the Storm"],
    description: [
      "Откъснат от останалите, един боец се изправя срещу хаоса на разрушенията. Следващият му ход може да реши дали ще намери път към спасението.",
      "Separated from the others, a fighter faces the chaos of destruction. His next move may decide whether he finds a path to safety.",
    ],
    alt: [
      "Ранен боец се държи за превозно средство пред разрушително торнадо",
      "Injured fighter holding onto a vehicle as a destructive tornado approaches",
    ],
    scene:
      "Show the person as a battered survivor clinging to the side of a moving off-road vehicle while a violent tornado tears through a rural settlement behind them. Use a close dynamic composition with mud, flying debris, damaged barns and urgent storm light, keeping the face clearly visible.",
  },
];

export const phase3Works: AiWork[] = rows.map((row) => ({
  slug: row.slug,
  image: row.image,
  sourceAsset: row.sourceAsset,
  width: 1122,
  height: 1402,
  title: row.title[0],
  alt: row.alt[0],
  description: row.description[0],
  prompt: reconstructionPrompt(row.scene),
  promptKind: "illustrative",
  category: row.category,
  references: [],
  variants: [],
  ...(row.portraitDetails ? { portraitDetails: row.portraitDetails } : {}),
  en: {
    title: row.title[1],
    alt: row.alt[1],
    description: row.description[1],
  },
}));

export const PHASE3_PROFESSION_SLUGS = phase3Works
  .filter((work) => work.category === "Професии и роли")
  .map((work) => work.slug);

export const PHASE3_WORLD_SLUGS = phase3Works
  .filter((work) => work.category === "Култури по света")
  .map((work) => work.slug);

export const PHASE3_CINEMA_SLUGS = phase3Works
  .filter((work) => work.category === "Кино визии")
  .map((work) => work.slug);
