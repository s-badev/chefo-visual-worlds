// Local content layer for AI creations.
// Shape mirrors a future database table `ai_works` (+ related image rows).
// Reconstruction prompts describe the visible artworks; generation originals are not verified.
import knight from "@/assets/ai-knight.png";
import knightHorse from "@/assets/ai-knight-horse.png";
import renaissance from "@/assets/ai-renaissance.png";
import future from "@/assets/ai-future.png";
import worldSaudiArabia from "@/assets/chefo-saudi-arabia.png";
import worldGreece from "@/assets/chefo-greece.png";
import worldCuba from "@/assets/chefo-cuba.png";
import worldBrazil from "@/assets/chefo-brazil.png";
import worldGreenland from "@/assets/chefo-greenland.png";
import worldRussia from "@/assets/chefo-russia.png";
import worldItaly from "@/assets/chefo-italy.png";
import worldFrance from "@/assets/chefo-france.png";
import worldIndia from "@/assets/chefo-india.png";
import worldTurkey from "@/assets/chefo-turkey.png";
import worldEgypt from "@/assets/chefo-egypt.png";
import worldDubai from "@/assets/chefo-dubai.png";
import { importedAiWorks } from "./ai-imported-works";
import { phase3Works } from "./ai-phase3-works";
import { professionWorks } from "./ai-profession-works";
import type { Locale } from "@/i18n";

export const AI_CATEGORIES = [
  "Средновековие",
  "Исторически образи",
  "Кино визии",
  "Фантастика",
  "Забавни колажи",
  "Култури по света",
  "Професии и роли",
] as const;
export const AI_TOOLS = [
  "ChatGPT Image Generation",
  "Gemini Nano Banana",
  "Grok",
  "Other",
] as const;
export const AI_ROLES = ["ruler", "explorer", "sanitation-worker"] as const;
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

type LocalizedText = { bg: string; en: string };
const text = (bg: string, en: string): LocalizedText => ({ bg, en });

export interface AiWork {
  slug: string;
  title: string;
  image: string;
  /** Repository-relative PNG original; retained for provenance and never requested by the browser. */
  sourceAsset?: string;
  /** Intrinsic pixel size of `image`, so it can be shown uncropped without layout shift. */
  width?: number;
  height?: number;
  alt: string;
  description: string;
  /** English generation prompt; reconstructed unless its provenance has been verified. */
  prompt: string;
  /** Internal provenance marker for reconstructed prompts. */
  promptKind?: "illustrative";
  tool?: (typeof AI_TOOLS)[number];
  date?: string;
  category: (typeof AI_CATEGORIES)[number];
  /** Additional facets for completed artworks only; omit values that are not supported by the work. */
  role?: AiRole;
  era?: AiEra;
  setting?: AiSetting;
  references: AiImage[]; // TODO: your real source photos
  variants: AiImage[]; // TODO: other images from the same series
  /** Visible details of a destination portrait, separate from its earlier concept brief. */
  portraitDetails?: {
    clothing: LocalizedText;
    grooming: LocalizedText;
    setting: LocalizedText;
  };
  /** English version; missing fields fall back to Bulgarian. */
  en?: { title?: string; alt?: string; description?: string };
}

const selfRef: AiImage = {
  src: renaissance, alt: "Референтен портрет (примерен)", caption: "Портрет за референция",
  en: { alt: "Reference portrait (sample)", caption: "Reference portrait" },
};

/** Published destination portraits carry their own reconstructed prompt. */
const worldPortrait = (work: Omit<AiWork, "category" | "references" | "variants">): AiWork => ({
  ...work,
  promptKind: "illustrative",
  category: "Култури по света",
  references: [],
  variants: [],
});

export const aiWorks: AiWork[] = [
  {
    slug: "chefo-srednovekoven-ritsar",
    title: "Крал на лъва",
    image: knight,
    width: 1159,
    height: 1358,
    alt: "AI портрет на брадат мъж като средновековен владетел с корона и броня в тронна зала",
    description:
      "След коронацията кралят остава сам пред решение, което може да запази мира или да поведе кралството към война.",
    prompt:
      "Using the uploaded reference photograph as the identity source, create a cinematic, painterly vertical portrait of the same person as a medieval ruler seated on a carved throne in a shadowy stone hall. Preserve the person's recognizable facial identity, natural facial proportions, skin tone and individual features from the reference photograph. Place an ornate gold crown on their head and dress them in engraved steel armour with a deep blue cloak edged in gold. Keep their direct, composed expression and upright seated posture prominent from about the waist up. Candles glow in the dark hall behind them, picking out metalwork and heavy fabric with dramatic chiaroscuro. Use a restrained navy, bronze and gold palette, credible hands and historical textures; avoid fantasy caricature, distorted anatomy and added text.",
    promptKind: "illustrative",
    tool: "ChatGPT Image Generation",
    date: "2026-09-12",
    category: "Средновековие",
    role: "ruler",
    era: "medieval",
    setting: "throne-hall",
    references: [selfRef],
    variants: [
      {
        src: knightHorse,
        alt: "Рицар на кон на бойно поле при изгрев",
        caption: "На зазоряване",
        en: { alt: "A knight on horseback on a battlefield at sunrise", caption: "At dawn" },
      },
      {
        src: knight,
        alt: "Портрет в тронна зала",
        caption: "Тронната зала",
        en: { alt: "Portrait in a throne hall", caption: "The throne hall" },
      },
    ],
    en: {
      title: "The Lion King",
      alt: "AI portrait of a bearded man as a medieval ruler with a crown and armour in a throne hall",
      description:
        "After the coronation, the king faces a decision that could preserve the peace or lead the realm into war.",
    },
  },
  {
    slug: "renesansov-portret",
    title: "Италиански ренесансов благородник",
    image: renaissance,
    width: 1122,
    height: 1402,
    alt: "Портрет в стил Ренесанс на брадат мъж в кадифена дреха на тъмен фон",
    description:
      "В тишината на двореца италиански благородник обмисля съюз, който може да защити дома му или да го въвлече в чужда война.",
    prompt:
      "Using the uploaded reference photograph as the identity source, create a vertical Renaissance-style oil portrait of the same person against a dark, warm painterly backdrop. Preserve the person's recognizable facial identity, natural facial proportions, skin tone and individual features from the reference photograph. Dress them in a richly textured dark velvet or brocade doublet with a pale ruffled collar. Frame the head and upper torso in a composed three-quarter pose, with a calm, direct expression and natural hand placement if a hand is visible. Soft directional window light from the left should model the face and bring out the woven fabric and subtle brushwork. Use muted umber, charcoal and cream tones, the depth of an old-master painting and believable anatomy without caricature or text.",
    promptKind: "illustrative",
    tool: "ChatGPT Image Generation",
    date: "2026-09-03",
    category: "Исторически образи",
    era: "renaissance",
    setting: "portrait-backdrop",
    references: [selfRef],
    variants: [
      {
        src: renaissance,
        alt: "Ренесансов портрет",
        caption: "Финална версия",
        en: { alt: "Renaissance portrait", caption: "Final version" },
      },
    ],
    en: {
      title: "Italian Renaissance Nobleman",
      alt: "Renaissance-style portrait of a bearded man in a velvet garment on a dark background",
      description:
        "In the silence of the palace, an Italian nobleman weighs an alliance that could protect his house or draw it into another family's war.",
    },
  },
  {
    slug: "chefo-v-badeshteto",
    title: "Червената планета",
    image: future,
    width: 1122,
    height: 1402,
    alt: "Кино кадър на мъж в износен скафандър в пустиня на чужда планета с гигантска планета в небето",
    description:
      "След аварийно кацане самотният изследовател открива, че Червената планета не е безлюдна и че обратният път вече е затворен.",
    prompt:
      "Using the uploaded reference photograph as the identity source, create a cinematic vertical film still of the same person as a space explorer in a rocky alien desert at dusk. Preserve the person's recognizable facial identity, natural facial proportions, skin tone and individual features from the reference photograph. Dress them in a worn white and rust-coloured spacesuit with practical seams, scuffs and survival gear; keep the helmet off so their face is clearly visible. Frame them from the upper body to roughly the waist, facing the camera against a sweeping barren landscape. A huge planet dominates the amber sky behind them while dark blue shadows fall across the terrain. Use restrained science-fiction production design, atmospheric depth, film grain and plausible suit details; avoid plastic skin, distorted hands and text overlays.",
    promptKind: "illustrative",
    tool: "Grok",
    date: "2026-10-01",
    category: "Кино визии",
    role: "explorer",
    setting: "alien-desert",
    references: [selfRef],
    variants: [
      {
        src: future,
        alt: "Космическият изследовател",
        caption: "Основен кадър",
        en: { alt: "The space explorer", caption: "Main image" },
      },
    ],
    en: {
      title: "The Red Planet",
      alt: "Film still of a man in a worn spacesuit in an alien desert with a giant planet in the sky",
      description:
        "After an emergency landing, a lone explorer discovers that the Red Planet is not deserted and that the way home has closed.",
    },
  },
  worldPortrait({
    slug: "chefo-v-sauditska-arabiya", title: "Под слънцето на Арабия",
    image: worldSaudiArabia, width: 1122, height: 1402,
    prompt: "Using the uploaded reference photograph as the identity source, create a photorealistic vertical editorial portrait of the same person seated at an outdoor cafe table on a warm Saudi Arabian city street. Preserve the person's recognizable facial identity, natural facial proportions, skin tone and individual features from the reference photograph. Dress them in a crisp white thobe and a red-and-white checked headscarf secured with a black agal. They hold a small white coffee cup, with dates resting on the table. Frame them from about the waist up, looking calmly toward the camera. Place palms, sandy-toned buildings and a modern tower softly behind them in clear golden daylight. Render fabric folds, hands and tableware naturally, with a warm restrained palette, believable depth of field and no caricature or text overlays.",
    alt: "AI портрет на Чефо в бяла роба и червено-бяла кърпа за глава в градска сцена с палми",
    description: "В Рияд първо те канят да останеш, после питат накъде си тръгнал. С отговора никой не бърза.",
    en: {
      title: "Under the Arabian Sun",
      alt: "AI portrait of Chefo in a white robe and red-and-white headscarf in a city scene with palms",
      description: "In Riyadh, they invite you to stay before asking where you are headed. Nobody is in a hurry for the answer.",
    },
    portraitDetails: {
      clothing: text(
        "Бяла роба и червено-бяла карирана кърпа за глава с черен агал.",
        "A white robe and a red-and-white checked headscarf with a black agal.",
      ),
      grooming: text("Къса коса и поддържана брада.", "Short hair and a neat beard."),
      setting: text(
        "Глинени крепостни стени, палми и високи кули на заден план.",
        "Mud-brick fortress walls, palms and tall towers in the background.",
      ),
    },
  }),
  worldPortrait({
    slug: "chefo-v-gartsiya", title: "Гръцки следобед",
    image: worldGreece, width: 1122, height: 1402,
    prompt: "Using the uploaded reference photograph as the identity source, create a natural, photorealistic vertical travel portrait of the same person seated at a blue outdoor cafe table in Athens. Preserve the person's recognizable facial identity, natural facial proportions, skin tone and individual features from the reference photograph. Dress them in an open-collar pale blue linen shirt and light trousers. Show one hand resting near their face, with iced coffee, a glass of water and a small plate on the table. In the sunlit background, include a lively street cafe, flowers, a Greek flag and the Acropolis on its hill. Use a relaxed waist-up composition, crisp Mediterranean daylight, natural shadows and authentic photographic texture; avoid artificial faces, distorted hands and added lettering.",
    alt: "AI портрет на Чефо със светлосиня риза на маса пред гръцко знаме и антични сгради",
    description: "Атина има търпение за хора, които не гонят следващата забележителност. Целият следобед е за маса на каменната улица.",
    en: {
      title: "A Greek Afternoon",
      alt: "AI portrait of Chefo in a light blue shirt at a table before a Greek flag and ancient buildings",
      description: "Athens has time for people who are not chasing the next landmark. The afternoon goes to one table on a stone street.",
    },
    portraitDetails: {
      clothing: text(
        "Светлосиня ленена риза и бял панталон.",
        "A light blue linen shirt and white trousers.",
      ),
      grooming: text("Къса коса и поддържана брада.", "Short hair and a neat beard."),
      setting: text(
        "Варосани сгради със сини детайли и каменна улица.",
        "Whitewashed buildings with blue details and a stone street.",
      ),
    },
  }),
  worldPortrait({
    slug: "chefo-v-kuba", title: "Улиците на Куба",
    image: worldCuba, width: 1024, height: 1536,
    prompt: "Using the uploaded reference photograph as the identity source, create a photorealistic vertical street portrait of the same person standing on a colourful Cuban city street. Preserve the person's recognizable facial identity, natural facial proportions, skin tone and individual features from the reference photograph. They wear a textured white short-sleeved open-collar shirt, with their torso visible, arms relaxed and a composed direct gaze. Position a vintage blue car on the street beside them, warm painted colonial facades and a palm behind them, and a domed building farther down the road. Use bright but soft tropical daylight, realistic urban depth, vivid yet credible colours and a waist-up to mid-thigh camera distance. Keep the portrait grounded and documentary in feel; avoid caricature, malformed hands and text overlays.",
    alt: "AI портрет на Чефо с бяла риза пред цветни фасади и ретро автомобил",
    description: "В Хавана плановете се променят още на първия ъгъл. Сред цветните фасади точно така се опознава градът.",
    en: {
      title: "Streets of Cuba",
      alt: "AI portrait of Chefo in a white shirt before colourful façades and a vintage car",
      description: "In Havana, plans change at the first corner. Among colourful façades, that is how to get to know the city.",
    },
    portraitDetails: {
      clothing: text(
        "Бяла риза тип гуаябера и златна верижка.",
        "A white guayabera-style shirt and a gold chain.",
      ),
      grooming: text("Къса къдрава коса и къса брада.", "Short curly hair and a short beard."),
      setting: text(
        "Цветни фасади, балкони и ретро автомобили.",
        "Colourful façades, balconies and vintage cars.",
      ),
    },
  }),
  worldPortrait({
    slug: "chefo-v-braziliya", title: "Бразилски ритъм",
    image: worldBrazil, width: 1024, height: 1536,
    prompt: "Using the uploaded reference photograph as the identity source, create a realistic vertical editorial travel portrait of the same person seated beside a lively Brazilian beach. Preserve the person's recognizable facial identity, natural facial proportions, skin tone and individual features from the reference photograph. They wear an open, colourful short-sleeved tropical floral shirt and a thin dark cord necklace. Give them a relaxed expression. Frame the upper body while allowing the palm-lined shore, people near the water and distant rocky mountains to remain visible behind them. Use a bright blue sky, warm coastal sunlight, natural fabric detail and a candid vacation atmosphere without over-saturating the scene. Keep human anatomy and hands plausible, with photographic depth of field and no unnecessary text.",
    alt: "AI портрет на Чефо с цветна флорална риза на плаж с палми",
    description: "Рио започва деня така, сякаш вече празнува нещо. Между палмите на плажа поводът изобщо не е важен.",
    en: {
      title: "Brazilian Rhythm",
      alt: "AI portrait of Chefo in a colourful floral shirt on a palm-lined beach",
      description: "Rio begins the day as though it is already celebrating something. On a beach lined with palms, the reason hardly matters.",
    },
    portraitDetails: {
      clothing: text("Риза с ярки флорални мотиви.", "A shirt with bright floral motifs."),
      grooming: text("Коса, сресана назад, и къса брада.", "Hair swept back and a short beard."),
      setting: text("Пясъчен плаж, море и палми.", "A sandy beach, sea and palm trees."),
    },
  }),
  worldPortrait({
    slug: "chefo-v-grenlandiya", title: "Тишината на Гренландия",
    image: worldGreenland, width: 1122, height: 1402,
    prompt: "Using the uploaded reference photograph as the identity source, create a photorealistic vertical winter travel portrait of the same person standing in a snowy Greenland village. Preserve the person's recognizable facial identity, natural facial proportions, skin tone and individual features from the reference photograph. Dress them in a black knit beanie, dark heavy parka with fur-trimmed hood, scarf and gloves; they hold a small metal mug at chest level. Frame them from the waist up, facing the camera, with colourful houses on snow-covered slopes, icy water and a rocky mountain in the distance. Let the cold overcast daylight, pale blue snow and muted clothing create a quiet atmosphere. Preserve realistic proportions, visible breath-free natural skin, crisp clothing texture and believable hands; avoid caricature or lettering.",
    alt: "AI портрет на Чефо с тъмна зимна парка сред ледени блокове",
    description: "Тук тишината трае малко по-дълго, отколкото очакваш. Странното е, че след нея разговорите звучат по-ясно.",
    en: {
      title: "The Quiet of Greenland",
      alt: "AI portrait of Chefo in a dark winter parka among ice formations",
      description: "Here, the silence lasts a little longer than you expect. Oddly, conversations sound clearer afterward.",
    },
    portraitDetails: {
      clothing: text(
        "Тъмна парка с качулка, ръкавици и зимни ботуши.",
        "A dark hooded parka, gloves and winter boots.",
      ),
      grooming: text("Къса коса и къса брада.", "Short hair and a short beard."),
      setting: text(
        "Сняг и големи светлосини ледени блокове.",
        "Snow and large pale blue ice formations.",
      ),
    },
  }),
  worldPortrait({
    slug: "chefo-v-rusiya", title: "Руска зима",
    image: worldRussia, width: 1024, height: 1536,
    prompt: "Using the uploaded reference photograph as the identity source, create a photorealistic vertical winter portrait of the same person on a snowy Russian city street. Preserve the person's recognizable facial identity, natural facial proportions, skin tone and individual features from the reference photograph. They wear a dark fur ushanka, a thick grey knitted scarf and a dark winter coat, facing the camera in a chest-up composition. Snowflakes fall in front of softly focused colourful onion domes and a tall historic tower; keep the street architecture legible without making it dominate the subject. Use cold diffuse daylight, a muted blue-grey palette and believable snow on fabric. Maintain accurate facial anatomy, natural hand and garment details, and documentary photographic realism with no added text.",
    alt: "AI портрет на Чефо с тъмно палто и кожена шапка на заснежена улица",
    description: "Москва изглежда строга, докато не останеш достатъчно дълго, за да я чуеш. Тогава започва да разказва.",
    en: {
      title: "Russian Winter",
      alt: "AI portrait of Chefo in a dark coat and fur hat on a snowy street",
      description: "Moscow seems stern until you stay long enough to listen. Then it begins to tell its stories.",
    },
    portraitDetails: {
      clothing: text(
        "Дълго тъмно палто, шал и кожена шапка.",
        "A long dark coat, scarf and fur hat.",
      ),
      grooming: text("Къса коса и поддържана брада.", "Short hair and a neat beard."),
      setting: text(
        "Заснежена улица и куполни сгради на заден план.",
        "A snowy street and domed buildings in the background.",
      ),
    },
  }),
  worldPortrait({
    slug: "chefo-v-italiya", title: "Италианска елегантност",
    image: worldItaly, width: 1024, height: 1536,
    prompt: "Using the uploaded reference photograph as the identity source, create a photorealistic vertical editorial portrait of the same person seated at an outdoor cafe in Rome. Preserve the person's recognizable facial identity, natural facial proportions, skin tone and individual features from the reference photograph. Dress them in a dark navy blazer over an open white shirt with a light beige scarf draped around their neck. Show a relaxed seated posture at a small cafe table, with the Colosseum clearly recognizable but softly set back across the sunlit street. Frame them from roughly the waist up, allowing the table and ancient stone architecture to share the composition. Use warm late-afternoon light, natural shadows and restrained earth tones; avoid stiff posing, distorted hands and lettering.",
    alt: "AI портрет на Чефо с тъмно сако и светъл шал на улица пред античен амфитеатър",
    description: "Рим не бърза да впечатлява никого. Затова и един обикновен следобед край амфитеатъра остава толкова дълго в паметта.",
    en: {
      title: "Italian Elegance",
      alt: "AI portrait of Chefo in a dark jacket and light scarf on a street before an ancient amphitheatre",
      description:
        "Rome is in no hurry to impress anyone. That is why an ordinary afternoon by the amphitheatre stays in the memory.",
    },
    portraitDetails: {
      clothing: text(
        "Тъмно сако, бяла риза, светъл шал и бежов панталон.",
        "A dark jacket, white shirt, light scarf and beige trousers.",
      ),
      grooming: text("Къса коса и лека брада.", "Short hair and light stubble."),
      setting: text(
        "Каменна улица, кафе и античен амфитеатър на заден план.",
        "A stone street, café and ancient amphitheatre in the background.",
      ),
    },
  }),
  worldPortrait({
    slug: "chefo-vav-frantsiya", title: "Френски стил",
    image: worldFrance, width: 1122, height: 1402,
    prompt: "Using the uploaded reference photograph as the identity source, create a photorealistic vertical travel portrait of the same person seated at a Parisian outdoor cafe at golden hour. Preserve the person's recognizable facial identity, natural facial proportions, skin tone and individual features from the reference photograph. They wear a dark overcoat and a soft grey scarf, raising a small espresso cup near their face; a croissant rests on a plate on the table. Include the Eiffel Tower in the softly focused background beyond the cafe terrace and city street. Frame them chest-up with a relaxed seated posture, warm sunset light across the face and a subtle cinematic depth of field. Keep fabric, hands and table details believable, avoiding exaggerated features, distorted anatomy or artificial lettering.",
    alt: "AI портрет на Чефо с тъмно палто и сив шал на улица край кафе",
    description: "Париж няма нужда от още една снимка за доказателство. Първо нека следобедът край масите на кафето свърши, а споменът ще дойде после.",
    en: {
      title: "French Style",
      alt: "AI portrait of Chefo in a dark coat and grey scarf on a street beside a café",
      description: "Paris does not need another photograph as proof. Let the afternoon at the café tables end first; the memory can come later.",
    },
    portraitDetails: {
      clothing: text(
        "Тъмно палто, тъмен пуловер и сив шал.",
        "A dark coat, dark sweater and grey scarf.",
      ),
      grooming: text("Къса коса и лека брада.", "Short hair and light stubble."),
      setting: text(
        "Павирана улица, фасади и маси на кафе.",
        "A cobbled street, façades and café tables.",
      ),
    },
  }),
  worldPortrait({
    slug: "chefo-v-indiya", title: "Цветовете на пазара",
    image: worldIndia, width: 1122, height: 1402,
    prompt: "Using the uploaded reference photograph as the identity source, create a natural photorealistic vertical portrait of the same person seated at an Indian tea stall along a lively market lane. Preserve the person's recognizable facial identity, natural facial proportions, skin tone and individual features from the reference photograph. They wear a light beige kurta-style shirt and a pale scarf across one shoulder, holding a small glass of chai near the table. Give them a thoughtful expression. Show warm hanging lanterns, market activity and arched buildings with distant minaret-like forms in the background. Compose a chest-up to waist-up portrait with warm golden afternoon light, textured fabrics, believable hands and an authentic street atmosphere. Do not add animals, ceremonial clothing, caricature or text overlays.",
    alt: "AI портрет на Чефо със светъл шал и чаша чай на оживена пазарна улица",
    description: "На този пазар разговорът започва преди пазарлъка. Една минута между сергиите се превръща в цял следобед, заради хората, не заради стоката.",
    en: {
      title: "Colours of the Market",
      alt: "AI portrait of Chefo with a light scarf and a glass of tea on a busy market street",
      description: "At this market, conversation begins before bargaining does. A minute between the stalls becomes a whole afternoon, because of the people rather than the goods.",
    },
    portraitDetails: {
      clothing: text(
        "Светла курта, свободен панталон и шал през рамото.",
        "A light kurta, loose trousers and a shoulder scarf.",
      ),
      grooming: text("Къса коса и поддържана брада.", "Short hair and a neat beard."),
      setting: text(
        "Пазарна улица с фенери, подправки и платове, минаре и купол на заден план.",
        "A market street with lanterns, spices and textiles, and a minaret and dome in the background.",
      ),
    },
  }),
  worldPortrait({
    slug: "chefo-v-turtsiya",
    title: "Вечер край Босфора",
    image: worldTurkey,
    width: 1024,
    height: 1536,
    tool: "ChatGPT Image Generation",
    date: "2026-10-12",
    prompt:
      "Using the uploaded reference photograph as the identity source, create a photorealistic vertical evening portrait of the same person seated by the Bosphorus in Istanbul. Preserve the person's recognizable facial identity, natural facial proportions, skin tone and individual features from the reference photograph. Dress them in a dark coat and patterned scarf; they hold a small tulip-shaped glass of Turkish tea near their chest while looking calmly toward the camera. Show water, a passing ferry and the silhouettes of domed mosques and minarets across the shore, softly lit at dusk. Use a chest-up composition with warm bokeh lights against the blue evening sky, realistic hands and glass reflections, and an understated cinematic atmosphere without caricature or lettering.",
    alt: "AI портрет на мъж с тъмно палто и чаша турски чай вечер край Босфора в Истанбул, с джамии на заден план",
    description:
      "В Истанбул двата бряга никога не спорят кой е по-важен. Вечерта край водата не изисква да избереш страна.",
    en: {
      title: "Evening on the Bosphorus",
      alt: "AI portrait of a man in a dark coat with a glass of Turkish tea on an evening by the Bosphorus in Istanbul, with mosques in the background",
      description:
        "In Istanbul, the two shores never argue over which matters more. An evening by the water does not ask you to choose a side.",
    },
    portraitDetails: {
      clothing: text(
        "Тъмно палто, шарен шал, тъмен пуловер и бяла риза.",
        "A dark coat, patterned scarf, dark sweater and white shirt.",
      ),
      grooming: text("Къса коса и лека брада.", "Short hair and light stubble."),
      setting: text(
        "Тераса край водата с фенери, ферибот и джамия с минарета на заден план.",
        "A waterside terrace with lanterns, a ferry and a mosque with minarets in the background.",
      ),
    },
  }),
  worldPortrait({
    slug: "chefo-v-egipet", title: "Египетски хоризонти",
    image: worldEgypt, width: 1122, height: 1402,
    prompt: "Using the uploaded reference photograph as the identity source, create a photorealistic vertical travel portrait of the same person standing at a busy Egyptian street-side cafe or vendor stall near the pyramids. Preserve the person's recognizable facial identity, natural facial proportions, skin tone and individual features from the reference photograph. Dress them in an open-collar white linen shirt with sunglasses hanging from its placket, and show them holding a clear glass of red drink. Frame them from the waist up, with market stalls, passing cars and the pyramids visible behind them through warm dusty daylight. Keep the modern street setting credible and the light slightly hazy, with realistic glass, fabric and hand details. Avoid invented robes, head wraps, camels, caricature or text overlays.",
    alt: "AI портрет на Чефо с бяла риза и чаша напитка на улица пред пирамидите",
    description: "Кайро не дели деня на минало и настояще. Пирамидите на хоризонта и студената напитка в ръката са част от един и същи следобед.",
    en: {
      title: "Egyptian Horizons",
      alt: "AI portrait of Chefo in a white shirt holding a drink on a street before the pyramids",
      description: "Cairo does not divide the day into past and present. The pyramids on the horizon and the cold drink in hand belong to the same afternoon.",
    },
    portraitDetails: {
      clothing: text(
        "Бяла ленена риза със закачени слънчеви очила.",
        "A white linen shirt with sunglasses hooked on it.",
      ),
      grooming: text("Къса коса и поддържана брада.", "Short hair and a neat beard."),
      setting: text(
        "Улица със сергия за сокове, таксита и пирамиди на заден план.",
        "A street with a juice stall, taxis and pyramids in the background.",
      ),
    },
  }),
  worldPortrait({
    slug: "chefo-v-dubai", title: "Съвременен Дубай",
    image: worldDubai, width: 1122, height: 1402,
    prompt: "Using the uploaded reference photograph as the identity source, create a photorealistic vertical editorial travel portrait of the same person seated beside Dubai's waterfront in bright hazy daylight. Preserve the person's recognizable facial identity, natural facial proportions, skin tone and individual features from the reference photograph. Dress them in a clean white kandura and white head covering secured with a black agal; they hold a small white coffee cup. Compose a calm waist-up portrait with water, boats, palm trees and the contemporary Dubai skyline, including the Burj Khalifa, behind them. Balance the white clothing against the blue water and pale city buildings, with natural fabric folds, believable hand anatomy and subtle photographic depth. Avoid a suit, stylized fantasy effects and unnecessary text overlays.",
    alt: "AI портрет на Чефо в бяла роба и покривало за глава край водата с високи сгради",
    description: "Дубай обича да говори за утре. Край водата, със силуета на небостъргачите зад гърба, най-големият лукс е днешният ден.",
    en: {
      title: "Modern Dubai",
      alt: "AI portrait of Chefo in a white robe and head covering by the water with tall buildings",
      description: "Dubai loves to talk about tomorrow. By the water, with the skyline behind you, the greatest luxury is today.",
    },
    portraitDetails: {
      clothing: text(
        "Бяла кандура и бяла гутра с черен агал.",
        "A white kandura and a white ghutra with a black agal.",
      ),
      grooming: text("Къса коса и поддържана брада.", "Short hair and a neat beard."),
      setting: text(
        "Крайбрежие с дървени лодки, вятърни кули и небостъргачи на заден план.",
        "A waterfront with wooden boats, wind towers and skyscrapers in the background.",
      ),
    },
  }),
  ...importedAiWorks,
  ...professionWorks,
  ...phase3Works,
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
  "sanitation-worker": { bg: "Служител по чистотата", en: "Sanitation Worker" },
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
  "Култури по света": "World cultures",
  "Професии и роли": "Professions & Roles",
  Средновековие: "Medieval",
  "Исторически образи": "Historical portraits",
  "Кино визии": "Cinematic visions",
  Фантастика: "Fantasy",
  "Забавни колажи": "Playful collages",
};

export const aiCategoryLabel = (c: string, locale: Locale) =>
  locale === "en" ? (CATEGORY_EN[c] ?? c) : c;

/** Display label for a tool id (data ids stay unchanged). */
export const toolLabel = (t: string, locale: Locale = "bg") =>
  t === "Other" ? (locale === "en" ? "Other tool" : "Друг инструмент") : t;

const localizeImage = (img: AiImage, locale: Locale): AiImage =>
  locale === "en" ? { ...img, alt: img.en?.alt ?? img.alt, caption: img.en?.caption ?? img.caption } : img;

/** Work with text in the requested language. English prompts are kept unchanged. */
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
