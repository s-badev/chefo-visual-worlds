import type { Photo, PhotoCategory, PhotoTheme } from "./photos";

/** Real, visually reviewed photographs. Numbered filenames follow each source archive manifest. */
const albums = {
  bodrum: {
    location: ["Бодрум", "Bodrum"],
    sizes:
      "2000x1126 2000x1126 2000x1126 2000x1126 2000x1126 1126x2000 1126x2000 2000x1126 2000x1126 2000x1126 2000x1126 2000x1126 2000x1126 2000x1126 2000x1126",
    rows: [
      "Извит пясъчен бряг|Curving sandy shore|sea travel",
      "Златна светлина над залива|Golden light over the bay|sea sunsets",
      "Син здрач над морето|Blue dusk over the sea|sea sunsets",
      "Заливът откъм водата|The bay from the water|sea travel",
      "Палми край плажа|Palms along the beach|sea nature",
      "Мачти в здрача|Masts at dusk|sea sunsets",
      "Маса до вечерното море|Table beside the evening sea|sea sunsets",
      "Самотна лодка в залива|A lone boat in the bay|sea travel",
      "Бели къщи по склона|White houses on the hillside|city sea",
      "Лодки в широкия залив|Boats across the wide bay|sea travel",
      "Покриви над синята вода|Rooftops above blue water|city sea",
      "Марина под хълмовете|Marina beneath the hills|sea travel",
      "Лодки край брега|Boats along the shore|sea travel",
      "Бяла яхта в далечината|White yacht in the distance|sea travel",
      "Осветени палми вечер|Illuminated palms at night|nature travel",
    ],
  },
  plovdiv: {
    location: ["Пловдив", "Plovdiv"],
    sizes: "2000x1125 2000x1125 1125x2000 2000x1125 1125x2000",
    rows: [
      "Градски хоризонт под облаците|City skyline beneath the clouds|city travel",
      "Градът и хълмът|The city and the hill|city nature",
      "Седнала фигура в града|Seated figure in the city|city travel",
      "Каменни стъпала и руини|Stone steps and ruins|architecture travel",
      "Червена фасада и табела|Red facade and hanging sign|architecture city",
    ],
  },
  rila: {
    location: ["Рила", "Rila"],
    sizes:
      "1125x2000 2000x1125 1125x2000 1125x2000 1125x2000 1125x2000 2000x1125 2000x1125 1125x2000 1125x2000 2000x1500 1500x2000 1500x2000 2000x1500 1126x2000 1126x2000 1126x2000 2000x1126 2000x1126 1126x2000",
    rows: [
      "Облаци над планинско селище|Clouds above a mountain town|nature travel",
      "Долина под облачно небе|Valley beneath a cloudy sky|nature",
      "Къщи и облачни върхове|Houses and clouded peaks|nature travel",
      "Път през планинското селище|Road through the mountain town|nature travel",
      "Улица към зелените склонове|Street toward green slopes|nature travel",
      "Планината в края на улицата|Mountains at the end of the street|nature travel",
      "Слънце над долината|Sunlight over the valley|nature",
      "Топла светлина в долината|Warm light in the valley|nature",
      "Облаци над покривите|Clouds above the rooftops|nature travel",
      "Път и планински склонове|Road and mountain slopes|nature travel",
      "Покриви сред зелени хълмове|Rooftops among green hills|nature travel",
      "Път към високите върхове|Road toward the high peaks|nature travel",
      "Улица между къщите|Street between the houses|city travel",
      "Открито поле в долината|Open field in the valley|nature",
      "Снежни върхове над селището|Snowy peaks above the town|nature travel",
      "Зимна улица и планина|Winter street and mountains|nature travel",
      "Къщи под снежните върхове|Houses beneath snowy peaks|nature travel",
      "Снежна планина и долина|Snowy mountain and valley|nature",
      "Широк изглед към снежните върхове|Wide view of the snowy peaks|nature",
      "Зимен път към планината|Winter road toward the mountains|nature travel",
    ],
  },
  sofia: {
    location: ["София", "Sofia"],
    sizes: "2000x1125 1125x2000 2000x1125 1125x2000 1125x2000",
    rows: [
      "Осветена фасада вечер|Illuminated facade at night|architecture city",
      "Фонтан пред осветена сграда|Fountain before an illuminated building|architecture city",
      "Градски площад през нощта|City square at night|city travel",
      "Каменни основи под вечерните светлини|Stone foundations beneath evening lights|architecture city",
      "Сини светлини по стъклени фасади|Blue lights on glass facades|architecture city",
    ],
  },
  "sunny-beach": {
    location: ["Слънчев бряг", "Sunny Beach"],
    sizes:
      "2000x1125 2000x1125 2000x1125 2000x1125 2000x1125 2000x1251 2000x1125 2000x1125 1126x2000 2000x1126 2000x1126 2000x1126 1126x2000 1157x2000 1126x2000 2000x1126 1126x2000 2000x1126 2000x1126 1126x2000 2000x1126 1126x2000 2000x1126 2000x1126 1126x2000 2000x1126",
    rows: [
      "Чадъри край морето|Umbrellas by the sea|sea travel",
      "Вълни във вечерната светлина|Waves in the evening light|sea sunsets",
      "Синьо море до хоризонта|Blue sea to the horizon|sea nature",
      "Пясъчен бряг под облаците|Sandy shore beneath clouds|sea nature",
      "Палми до плажа|Palms beside the beach|sea nature",
      "Плаж, пълен с чадъри|Beach filled with umbrellas|sea travel",
      "Поглед над оживения плаж|View over a busy beach|sea travel",
      "Редове чадъри по пясъка|Rows of umbrellas on the sand|sea travel",
      "Виенско колело под облаците|Ferris wheel beneath clouds|travel city",
      "Широк плаж отвъд дюните|Wide beach beyond the dunes|sea nature",
      "Заливът от високо|The bay from above|sea travel",
      "Дълъг бряг и прибой|Long shore and surf|sea nature",
      "Пясък и морска шир|Sand and open sea|sea nature",
      "Растения по пясъчните дюни|Plants across sandy dunes|nature sea",
      "Вълни по пясъка|Ripples in the sand|nature sea",
      "Стол с изглед към морето|Chair overlooking the sea|sea travel",
      "Две напитки край морето|Two drinks beside the sea|sea travel",
      "Синя вода и буйове|Blue water and buoys|sea",
      "Хора сред вълните|People among the waves|sea travel",
      "Плитка прозрачна вода|Clear shallow water|sea nature",
      "Спокоен бряг привечер|Quiet shore toward evening|sea sunsets",
      "Вечерен залив и сгради|Evening bay and buildings|sea sunsets",
      "Пътека между палмите|Path between palms|nature travel",
      "Тъмни облаци над плажа|Dark clouds over the beach|sea nature",
      "Шезлонги върху пясъка|Sun loungers on the sand|sea travel",
      "Синьо море край скалите|Blue sea beside the rocks|sea nature",
    ],
  },
  "sveti-vlas": {
    location: ["Свети Влас", "Sveti Vlas"],
    sizes: "2000x1125 1125x2000 1125x2000 1125x2000 2000x1125 2000x1125 2000x1125 2000x1125",
    rows: [
      "Залез над спокойната вода|Sunset over calm water|sea sunsets",
      "Мачти и палми в пристанището|Masts and palms at the harbour|sea travel",
      "Кораб с високи мачти|Boat with tall masts|sea travel",
      "Лодки в синия час|Boats at blue hour|sea sunsets",
      "Вечерни отражения в марината|Evening reflections in the marina|sea sunsets",
      "Осветени лодки в пристанището|Illuminated boats in the harbour|sea travel",
      "Яхти във вечерната светлина|Yachts in the evening light|sea sunsets",
      "Бяла яхта край брега|White yacht by the shore|sea travel",
    ],
  },
  tunisia: {
    location: ["Тунис", "Tunisia"],
    sizes:
      "1126x2000 1126x2000 2000x1126 2000x1126 1126x2000 2000x1126 2000x1126 1126x2000 1126x2000 1126x2000 2000x1126 1126x2000 1126x2000 1126x2000 1551x2000 2000x1126 2000x1126 2000x1126 1126x2000 2000x1126 1147x2000 1126x2000",
    rows: [
      "Осветен басейн в синия час|Illuminated pool at blue hour|travel",
      "Палми под нощното небе|Palms beneath the night sky|nature travel",
      "Тюркоазено море край брега|Turquoise sea by the shore|sea nature",
      "Нощни светлини край басейна|Night lights beside the pool|travel",
      "Плитко тюркоазено море|Shallow turquoise sea|sea nature",
      "Вълна на пясъчния бряг|Wave on the sandy shore|sea nature",
      "Плаж с чадъри|Beach with sun umbrellas|sea travel",
      "Чадър над пясъка|Sun umbrella above the sand|sea travel",
      "Розово небе над басейна|Pink sky above the pool|sunsets travel",
      "Автомобили върху пясъчната равнина|Vehicles on a sandy plain|travel",
      "Път през пясъчната равнина|Route across a sandy plain|travel nature",
      "Колони край водата|Columns by the water|architecture travel",
      "Ниско слънце над равнината|Low sun over the plain|sunsets nature",
      "Палми и камили в далечината|Palms and camels in the distance|nature travel",
      "Камили върху пясъка|Camels on the sand|nature travel",
      "Пътека по сухия склон|Path across a dry hillside|nature travel",
      "Светли сгради до хоризонта|Light-coloured buildings to the horizon|city travel",
      "Каменен амфитеатър от високо|Stone amphitheatre from above|architecture travel",
      "Каменни арки и стени|Stone arches and walls|architecture travel",
      "Прозрачно море край брега|Clear sea beside the shore|sea nature",
      "Миди по пясъка|Seashells on the sand|sea nature",
      "Птица край басейна|Bird beside a pool|nature travel",
    ],
  },
} as const;

export type BatchAlbumSlug = keyof typeof albums;
export const batchAlbumSlugs = Object.keys(albums) as BatchAlbumSlug[];

const categoryFor = (themes: PhotoTheme[]): PhotoCategory => {
  if (themes[0] === "sea") return "Море";
  if (themes[0] === "sunsets") return "Залези";
  if (themes[0] === "city" || themes[0] === "architecture") return "Град";
  return "Пътувания";
};

export const batchPhotos: Photo[] = batchAlbumSlugs.flatMap((album) => {
  const source = albums[album];
  const sizes = source.sizes.split(" ");
  if (sizes.length !== source.rows.length)
    throw new Error(`Photo metadata length mismatch: ${album}`);
  return source.rows.map((row, index) => {
    const [bg, en, tags] = row.split("|");
    const size = sizes[index];
    if (!bg || !en || !tags || !size)
      throw new Error(`Incomplete photo metadata: ${album}-${index + 1}`);
    const [width = 0, height = 0] = size.split("x").map(Number);
    if (!width || !height) throw new Error(`Invalid photo dimensions: ${album}-${index + 1}`);
    const themes = tags.split(" ") as PhotoTheme[];
    const slug = `${album}-${String(index + 1).padStart(3, "0")}`;
    return {
      slug,
      image: `/photos/${album}/${slug}.webp`,
      width,
      height,
      title: bg,
      alt: `${bg}, ${source.location[0]}`,
      location: source.location[0],
      category: categoryFor(themes),
      themes,
      en: { title: en, alt: `${en}, ${source.location[1]}` },
    };
  });
});
