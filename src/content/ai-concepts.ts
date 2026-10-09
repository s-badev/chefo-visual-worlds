import type { Locale } from "@/i18n";

type LocalizedText = { bg: string; en: string };

export interface PlannedGalleryPreview {
  status: "planned";
  title: LocalizedText;
  /** Add a completed AiWork entry and remove this preview when both assets are ready. */
  image: string | null;
  prompt: string | null;
}

/** Planned ideas only. These are never included in the completed artwork gallery. */
export interface FutureAiConcept {
  id: string;
  title: LocalizedText;
  description: LocalizedText;
  promptTemplate?: LocalizedText;
  galleryPreview?: PlannedGalleryPreview;
}

const text = (bg: string, en: string): LocalizedText => ({ bg, en });
export const conceptText = (value: LocalizedText, locale: Locale) => value[locale];

export const futureAiConcepts: FutureAiConcept[] = [
  {
    id: "airline-pilot",
    title: text("Пилот на самолет", "Airline Pilot"),
    description: text(
      "Портрет на пилот в кабина преди полет, с внимание към светлината и детайлите на униформата.",
      "A pilot portrait in the cockpit before a flight, focused on light and uniform details.",
    ),
    promptTemplate: text(
      "Портрет на [човек] като пилот в самолетна кабина, [час от деня], естествена светлина, реалистични детайли на униформата.",
      "Portrait of [person] as an airline pilot in a cockpit, [time of day], natural light, realistic uniform details.",
    ),
  },
  {
    id: "construction-engineer",
    title: text(
      "Строителен инженер / технически ръководител",
      "Construction Engineer / Site Foreman",
    ),
    description: text(
      "Работен портрет на строителна площадка сред чертежи, материали и дневна светлина.",
      "A working portrait on a construction site among plans, materials and daylight.",
    ),
  },
  {
    id: "western-cowboy",
    title: text("Каубой от Дивия запад", "Western Cowboy"),
    description: text(
      "Кинообраз в прашен западен град с широкопола шапка и късно следобедно слънце.",
      "A cinematic figure in a dusty western town, with a wide-brimmed hat and late afternoon sun.",
    ),
    galleryPreview: {
      status: "planned",
      title: text("Чефо като каубой", "Chefo as a Cowboy"),
      image: null,
      prompt: null,
    },
  },
  {
    id: "yacht-captain",
    title: text("Капитан на яхта", "Yacht Captain"),
    description: text(
      "Морски портрет на палубата, с хоризонт и ветровито небе зад героя.",
      "A maritime portrait on deck, with the horizon and a windy sky behind the subject.",
    ),
  },
  {
    id: "archaeologist",
    title: text("Археолог", "Archaeologist"),
    description: text(
      "Сцена на терен край разкопки, с инструменти, карти и следи от миналото.",
      "A field scene by an excavation, with tools, maps and traces of the past.",
    ),
    promptTemplate: text(
      "[Човек] като археолог на [място], внимателно проучващ [предмет], естествена светлина, документално настроение.",
      "[Person] as an archaeologist at [site], carefully examining [object], natural light, documentary mood.",
    ),
  },
  {
    id: "detective",
    title: text("Детектив", "Detective"),
    description: text(
      "Ноар история в дъждовен град, изградена чрез сенки, отражения и недоизказан сюжет.",
      "A noir story in a rainy city, built through shadows, reflections and an open-ended plot.",
    ),
  },
  {
    id: "astronaut",
    title: text("Астронавт", "Astronaut"),
    description: text(
      "Портрет на астронавт край космически кораб, с акцент върху човека зад визьора.",
      "An astronaut portrait beside a spacecraft, focused on the person behind the visor.",
    ),
  },
  {
    id: "explorer",
    title: text("Пътешественик изследовател", "Explorer"),
    description: text(
      "История за откриване на непознат пейзаж с карта, път и усещане за мащаб.",
      "A story of discovering an unfamiliar landscape, with a map, a route and a sense of scale.",
    ),
  },
];

export const getPlannedGalleryConcepts = (): Array<
  FutureAiConcept & { galleryPreview: PlannedGalleryPreview }
> =>
  futureAiConcepts.filter(
    (concept): concept is FutureAiConcept & { galleryPreview: PlannedGalleryPreview } =>
      concept.galleryPreview?.status === "planned",
  );
