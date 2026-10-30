import acTechnician from "@/assets/ai-professions/chefo-ac-technician.webp";
import autoMechanic from "@/assets/ai-professions/chefo-auto-mechanic.webp";
import baker from "@/assets/ai-professions/chefo-baker.webp";
import barber from "@/assets/ai-professions/chefo-barber.webp";
import beachBartender from "@/assets/ai-professions/chefo-beach-bartender.webp";
import coffeeBreak from "@/assets/ai-professions/chefo-coffee-break.webp";
import donerChef from "@/assets/ai-professions/chefo-doner-chef.webp";
import econtCourier from "@/assets/ai-professions/chefo-econt-courier.webp";
import fisherman from "@/assets/ai-professions/chefo-fisherman.webp";
import marketVendor from "@/assets/ai-professions/chefo-market-vendor.webp";
import nightclubSecurity from "@/assets/ai-professions/chefo-nightclub-security.webp";
import rakiaDistiller from "@/assets/ai-professions/chefo-rakia-distiller.webp";
import taxiDriver from "@/assets/ai-professions/chefo-taxi-driver.webp";
import ticketInspector from "@/assets/ai-professions/chefo-ticket-inspector.webp";
import type { AiRole, AiWork } from "./ai-works";

type ProfessionRow = {
  slug: string;
  image: string;
  role?: AiRole;
  title: [bg: string, en: string];
  description: [bg: string, en: string];
  alt: [bg: string, en: string];
  scene: string;
};

/** The prompts below recreate visible scenes; the original generation prompts were not supplied. */
const portraitPrompt = (scene: string) =>
  "Using the uploaded reference photograph as the identity source, create a photorealistic vertical editorial portrait of the same person in an authentic Bulgarian everyday setting. Preserve their recognizable facial identity, natural facial proportions, skin tone and individual features from the reference photograph. " +
  scene +
  " Keep the camera framing and body posture natural to the scene, with believable lighting, photographic depth and realistic anatomy. Avoid caricature, plastic skin, distorted hands and unnecessary text overlays.";

const rows: ProfessionRow[] = [
  {
    slug: "chefo-barber",
    image: barber,
    title: ["Кварталният барбер", "The Neighborhood Barber"],
    description: [
      "Прическата е поводът да влезеш. Някои се връщат, защото той помни какво са му разказали миналия път.",
      "A haircut gets you through the door. Some come back because he remembers what they told him last time.",
    ],
    alt: [
      "Барбер с машинка за подстригване до клиент в квартална бръснарница",
      "Barber holding clippers beside a customer in a neighborhood barbershop",
    ],
    scene:
      "The person is working as a barber in a warm neighborhood barbershop, wearing a white rolled-sleeve shirt and black leather apron. Hold professional clippers and a comb beside a seated male client whose head is visible in the foreground. Show mirrors, grooming products and a second chair behind them. Frame the person from the waist up, looking confident but natural, with soft amber interior lights and credible tool and hand details.",
  },
  {
    slug: "chefo-beach-bartender",
    image: beachBartender,
    title: ["Барман на морето", "Seaside Bartender"],
    description: [
      "Оранжевият коктейл е готов малко преди залеза. Историите, заради които хората остават, идват по-късно.",
      "The orange cocktail is ready just before sunset. The stories that keep people here arrive a little later.",
    ],
    alt: [
      "Барман подава оранжев коктейл в бар край морето по залез",
      "Bartender offering an orange cocktail at a seaside bar at sunset",
    ],
    scene:
      "The person stands at an open seaside bar in a white open-neck shirt and dark apron, holding a vivid orange cocktail in one hand and a metal shaker in the other. Frame their upper body with the drinks clearly visible. Show palms, beach seating, sea and sunset beyond the bar. Use warm late-day light on their face, natural reflections on the glass and a relaxed summer atmosphere.",
  },
  {
    slug: "chefo-ticket-inspector",
    image: ticketInspector,
    title: ["Билетен инспектор", "Ticket Inspector"],
    description: [
      "По тази линия всеки бърза за някъде. На билета се побира само малка част от пътуването.",
      "Everyone on this route is heading somewhere. Only a small part of the journey fits on a ticket.",
    ],
    alt: [
      "Билетен инспектор проверява билет в автобус или трамвай",
      "Ticket inspector checking a ticket inside a bus or tram",
    ],
    scene:
      "The person is a ticket inspector standing inside a city bus or tram in a dark uniform with a lanyard. Show a ticket in one hand and a handheld validator in the other, at chest height, with passengers and the vehicle interior behind them. Frame the portrait from the waist up at eye level. Use ordinary daylight through the windows, realistic transit details and a professional, attentive expression.",
  },
  {
    slug: "chefo-taxi-driver",
    image: taxiDriver,
    title: ["Таксиджия от Люлин", "Taxi Driver from Lyulin"],
    description: [
      "Познатите адреси са лесната част. Трудното е да усети кога пътникът иска разговор и кога предпочита тишина.",
      "Knowing the addresses is the easy part. The harder skill is sensing when a passenger wants to talk and when they need quiet.",
    ],
    alt: [
      "Таксиметров шофьор до жълто такси на градска улица",
      "Taxi driver beside a yellow taxi on a city street",
    ],
    scene:
      "The person is a taxi driver in a dark zip-up jacket, leaning casually against a yellow taxi and holding a small paper coffee cup. Place apartment blocks, parked cars and autumn trees along the residential city street behind them. Frame them from the waist up with the taxi clearly identifiable. Use soft daytime light, honest street photography texture and a relaxed, observant expression.",
  },
  {
    slug: "chefo-econt-courier",
    image: econtCourier,
    title: ["Куриер на Еконт", "Econt Courier"],
    description: [
      "В маршрута на куриера това е още една спирка. Зад вратата някой може да чака този кашон цяла седмица.",
      "On the courier's route, this is just one more stop. Behind the door, someone may have waited all week for this box.",
    ],
    alt: [
      "Куриер на Еконт държи кашон до служебен бус",
      "Econt courier holding a parcel beside a delivery van",
    ],
    scene:
      "The person is an Econt courier in a dark branded delivery uniform and cap, carrying a large cardboard parcel in both arms beside a delivery van. Set the scene on a residential street lined with apartment blocks and autumn trees. Frame them from about mid-thigh up so the box and van remain legible. Use natural daylight, realistic cardboard and fabric textures and a candid working-day posture; any branding should be subtle and plausible.",
  },
  {
    slug: "chefo-rakia-distiller",
    image: rakiaDistiller,
    title: ["Майстор на ракия", "Traditional Rakia Distiller"],
    description: [
      "Рецептата се предава без записки. Всяка есен той променя по нещо и после нарича резултата традиция.",
      "The recipe is passed on without notes. Every autumn he changes one small thing, then calls the result tradition.",
    ],
    alt: [
      "Мъж с чаша до меден казан за ракия и касетки с плодове",
      "Man holding a glass beside a copper rakia still and crates of fruit",
    ],
    scene:
      "The person tends a traditional copper rakia still in an autumn courtyard, wearing a flat cap, plaid shirt and dark vest. They hold a small clear tasting glass near their chest while copper pipes, a glowing fire and crates of fruit occupy the middle ground. Frame them from the waist up, with warm firelight mixed with cool outdoor daylight. Keep the craft equipment, hands and glass physically believable and the mood grounded and documentary.",
  },
  {
    slug: "chefo-ac-technician",
    image: acTechnician,
    title: ["Майстор на климатици", "Air Conditioning Technician"],
    description: [
      "Градът си спомня за него, когато жегата стане нетърпима. Пристига с винтоверт и с повече търпение от всички останали.",
      "The city remembers him when the heat becomes unbearable. The technician arrives with a cordless drill and more patience than anyone else.",
    ],
    alt: [
      "Техник с винтоверт работи до външно тяло на климатик",
      "Technician with a power drill working beside an outdoor air conditioning unit",
    ],
    scene:
      "The person is an air-conditioning technician outside an apartment building, in a dark work shirt and cap with a tool harness. Wearing work gloves, they hold a cordless power drill beside a wall-mounted outdoor air-conditioning unit. Include the building facade and a few autumn trees behind them. Frame their torso and equipment together from the waist up in natural daylight, with realistic metal, tools, cables and workwear textures.",
  },
  {
    slug: "chefo-doner-chef",
    image: donerChef,
    title: ["Дюнер майстор", "Doner Chef"],
    description: [
      "„Както обикновено“ идва преди клиентът да е направил поръчката. В този квартал това е вид доверие.",
      "“The usual” comes before the customer has ordered. In this neighbourhood, that is a kind of trust.",
    ],
    alt: [
      "Дюнер майстор подава готов дюнер пред въртящ се грил",
      "Doner chef offering a freshly made wrap beside a vertical grill",
    ],
    scene:
      "The person is a doner chef behind the counter of a small evening takeaway, wearing a dark shirt and apron and presenting a fresh wrapped doner toward the camera. Place a vertical meat spit and colourful ingredient trays just behind them, with wet street reflections and city lights visible outside. Use a waist-up perspective and warm food-counter lighting balanced against the cool evening street. Keep hands, wrap and grill credible and appetizing.",
  },
  {
    slug: "chefo-nightclub-security",
    image: nightclubSecurity,
    title: ["Нощен охранител", "Nightclub Security Guard"],
    description: [
      "Най-добрата му смяна е тази, в която нищо не се случва. Затова никога не спира да наблюдава.",
      "His best shift is one where nothing happens. That is why he never stops watching.",
    ],
    alt: [
      "Охранител с радиостанция пред нощен клуб",
      "Security guard with a radio outside a nightclub",
    ],
    scene:
      "The person is a nightclub security guard standing at the entrance in a black security shirt with a shoulder radio. Show purple and red neon, a doorway, a few distant pedestrians and damp pavement on the night street. Frame the portrait from the upper thighs up, facing the camera with a steady, watchful expression and relaxed hands. Use realistic low-light photography with controlled highlights and legible clothing details, avoiding aggressive caricature.",
  },
  {
    slug: "chefo-fisherman",
    image: fisherman,
    title: ["Рибар на пристанището", "Harbor Fisherman"],
    description: [
      "Морето не обещава улов. Рибарят пак е на кея, защото някои сутрини си струват и без гаранция.",
      "The sea never promises a catch. The fisherman is on the pier anyway, because some mornings are worth it without a guarantee.",
    ],
    alt: [
      "Рибар държи риба на пристанище с лодки зад него",
      "Fisherman holding a fish at a harbor with boats behind him",
    ],
    scene:
      "The person is a fisherman at a working harbour, wearing a dark knit cap and weathered layers while holding a freshly caught fish toward the camera. Place crates of fish and moored small boats behind them, with water and overcast morning light. Frame them from the waist up so their face, gloved or weathered hands and the catch remain clear. Use honest coastal textures, natural colour and believable anatomy rather than a staged fantasy scene.",
  },
  {
    slug: "chefo-market-vendor",
    image: marketVendor,
    title: ["Продавач на пазара", "Market Vendor"],
    description: [
      "Продавачът отдалеч познава кой избира внимателно и кой идва само да поговори. И за двамата има време.",
      "From a distance, the vendor can tell who chooses with care and who came just to talk. Both get his time.",
    ],
    alt: [
      "Продавач държи ябълка пред сергия с плодове и зеленчуци",
      "Market vendor holding an apple behind a fruit and vegetable stall",
    ],
    scene:
      "The person is a neighbourhood market vendor behind a produce stall, wearing a dark knit cap, checked shirt and work apron, holding a red apple near chest level. Fill the foreground with orderly bins of colourful fruit and vegetables; show a few hand-written market price signs softly in the background without requiring readable lettering. Frame them from the waist up under diffuse outdoor daylight, with a welcoming expression and realistic hands and produce textures.",
  },
  {
    slug: "chefo-auto-mechanic",
    image: autoMechanic,
    title: ["Квартален автомонтьор", "Neighborhood Auto Mechanic"],
    description: [
      "Колата пристига с шум, който собственикът не може да опише. Майсторът го чува веднъж и вече знае откъде да започне.",
      "The car arrives with a noise its owner cannot describe. One listen, and the mechanic knows where to begin.",
    ],
    alt: [
      "Автомонтьор с гаечен ключ до отворен двигател в сервиз",
      "Auto mechanic holding a wrench beside an open engine in a garage",
    ],
    scene:
      "The person is an auto mechanic in dark oil-marked work clothes, holding a wrench beside the open hood and visible engine of a car in a neighbourhood repair garage. Show tools, workshop equipment and a glimpse of the street beyond the garage door. Frame them from the waist up with the engine sharing the foreground. Use warm practical workshop light and credible metal, grease and fabric textures while keeping their expression calm and focused.",
  },
  {
    slug: "chefo-coffee-break",
    image: coffeeBreak,
    role: "sanitation-worker",
    title: ["Боклукджия на сутрешна смяна", "Sanitation Worker on an Early Shift"],
    description: [
      "Градът още спи, когато смяната започва. Тази работа остава незабелязана точно когато е свършена добре.",
      "The city is still asleep when the shift begins. This is work that goes unnoticed precisely when it is done well.",
    ],
    alt: [
      "Работник в светлоотразителна жилетка държи кафе до служебен автомобил",
      "Worker in a reflective vest holding coffee beside a work vehicle",
    ],
    scene:
      "The person is a sanitation worker on an early morning shift, wearing a dark knit beanie, dark blue work uniform, high-visibility orange vest and work gloves. They hold a small paper coffee cup beside a clearly recognizable garbage truck on a quiet residential street with apartment buildings. Frame them from the waist up with the truck visible behind their shoulder. Use cool dawn daylight, natural skin and fabric texture and a short, matter-of-fact break atmosphere; make the sanitation role unmistakable.",
  },
  {
    slug: "chefo-baker",
    image: baker,
    title: ["Сутрин в пекарната", "Morning at the Bakery"],
    description: [
      "Първите хора влизат, преди денят да е започнал истински. Най-хубавата част в пекарната обаче започва още преди изгрев.",
      "The first customers arrive before the day has properly begun. The best part of the bakery's day starts well before sunrise.",
    ],
    alt: [
      "Пекар подава парче баница над витрина с печива",
      "Baker offering a piece of banitsa over a display of baked goods",
    ],
    scene:
      "The person is a baker in a white shirt and flour-dusted apron, offering a triangular slice of freshly baked banitsa toward the camera over a pastry display. Show golden trays of baked goods, a warm neighbourhood bakery interior and softly focused customers behind them. Frame them from the waist up, with their face, hands and pastry clearly visible. Use warm practical morning light, realistic flaky pastry and flour texture and a welcoming but natural expression.",
  },
];

export const professionWorks: AiWork[] = rows.map((row) => ({
  slug: row.slug,
  image: row.image,
  width: 1122,
  height: 1402,
  title: row.title[0],
  ...(row.role ? { role: row.role } : {}),
  alt: row.alt[0],
  description: row.description[0],
  prompt: portraitPrompt(row.scene),
  promptKind: "illustrative",
  category: "Професии и роли",
  references: [],
  variants: [],
  en: { title: row.title[1], alt: row.alt[1], description: row.description[1] },
}));
