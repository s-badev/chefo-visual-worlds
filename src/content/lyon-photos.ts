import type { Photo, PhotoTheme } from "./photos";

const photo = (
  number: number, width: number, height: number,
  bgTitle: string, enTitle: string, bgAlt: string, enAlt: string,
  themes: PhotoTheme[],
): Photo => ({
  slug: `lyon-${String(number).padStart(3, "0")}`,
  image: `/photos/lyon/lyon-${String(number).padStart(3, "0")}.webp`,
  width, height, title: bgTitle, alt: bgAlt,
  location: "Лион", category: "Град", themes,
  en: { title: enTitle, alt: enAlt },
});

/** Numbering follows the verified Lyon backup, excluding the misfiled Paris image. */
export const lyonPhotos: Photo[] = [
  photo(1, 2000, 1125, "Утро край реката", "Morning by the river", "Река, каменен мост и куполна сграда в Лион", "River, stone bridge and domed building in Lyon", ["city","architecture","travel"]),
  photo(2, 2000, 1125, "Есенен площад", "Autumn square", "Есенно дърво и отражения в градски площад в Лион", "Autumn tree and reflections in a city square in Lyon", ["city","travel"]),
  photo(3, 1125, 2000, "Фонтан сред сградите", "Fountain among the buildings", "Скулптурен фонтан пред светли градски сгради", "Sculptural fountain in front of light city buildings", ["city","architecture","travel"]),
  photo(4, 2000, 1249, "Сирена на витрината", "Cheese in the shop window", "Подредени сирена зад витрината на магазин", "Cheeses arranged behind a shop window", ["city","travel"]),
  photo(5, 2000, 1125, "Колонадата", "The colonnade", "Класическа каменна колонада под облачно небе", "Classical stone colonnade beneath a cloudy sky", ["city","architecture","travel"]),
  photo(6, 1914, 2000, "Катедралата Сен Жан", "Saint-Jean Cathedral", "Фасадата с розетен прозорец на катедралата Сен Жан в Лион", "Rose-window facade of Saint-Jean Cathedral in Lyon", ["city","architecture","travel"]),
  photo(7, 2000, 1125, "Покривите на Лион", "The rooftops of Lyon", "Панорама към покривите и речните брегове на Лион", "Panorama of Lyon rooftops and riverbanks", ["city","architecture","travel"]),
  photo(8, 2000, 1125, "Градът отвисоко", "The city from above", "Широка гледка към покривите и реката в Лион", "Wide view of rooftops and river in Lyon", ["city","travel"]),
  photo(9, 2000, 1125, "Пейка с изглед", "A bench with a view", "Пейки на панорамна площадка над Лион", "Benches at a lookout above Lyon", ["city","travel"]),
  photo(10, 2000, 1125, "Панорама към реката", "Panorama toward the river", "Лион и реката, гледани от висока панорамна точка", "Lyon and its river seen from a high lookout", ["city","travel"]),
  photo(11, 2000, 1125, "Базиликата Фурвиер", "Fourvière Basilica", "Базиликата Нотр Дам дьо Фурвиер сред дървета и облаци", "Notre-Dame de Fourvière Basilica among trees and clouds", ["city","architecture","travel"]),
  photo(12, 1125, 2000, "Кулите на Фурвиер", "The towers of Fourvière", "Каменното лице и кулите на базиликата Фурвиер", "Stone facade and towers of Fourvière Basilica", ["city","architecture","travel"]),
  photo(13, 1125, 2000, "Сводове и мозайки", "Vaults and mosaics", "Декоративни сводове и мозайки във вътрешността на базилика", "Decorative vaults and mosaics inside a basilica", ["architecture","travel"]),
  photo(14, 1125, 2000, "Светлина в базиликата", "Light in the basilica", "Осветен олтар и богато украсени стени в базилика", "Illuminated altar and ornate walls inside a basilica", ["architecture","travel"]),
  photo(15, 2000, 1125, "Широкият хоризонт", "The wide horizon", "Градска панорама на Лион под облачно небе", "Lyon city panorama beneath a cloudy sky", ["city","travel"]),
  photo(16, 2000, 1125, "Кафе на улицата", "Street café", "Фасада на кафене край улица в Лион", "Café frontage along a street in Lyon", ["city","travel"]),
  photo(17, 2000, 1125, "Кметството на Лион", "Lyon City Hall", "Богато украсената фасада на кметството на Лион", "Ornate facade of Lyon City Hall", ["city","architecture","travel"]),
  photo(18, 2000, 1125, "Бронзовият фонтан", "The bronze fountain", "Бронзова скулптура на фонтан пред исторически сгради", "Bronze fountain sculpture before historic buildings", ["city","architecture","travel"]),
  photo(19, 2000, 1125, "Крайбрежната алея", "The riverside promenade", "Пешеходна алея покрай реката в Лион", "Pedestrian promenade beside the river in Lyon", ["city","nature","travel"]),
  photo(20, 1265, 2000, "Готическият вход", "The Gothic entrance", "Каменна готическа фасада с арки и издълбани детайли", "Stone Gothic facade with arches and carved details", ["city","architecture","travel"]),
  photo(21, 2000, 1125, "Кметството по здрач", "City Hall at dusk", "Осветената фасада на кметството на Лион след залез", "Illuminated facade of Lyon City Hall after sunset", ["city","architecture","travel"]),
  photo(22, 2000, 1125, "Светлини край реката", "Lights along the river", "Нощни светлини по речния бряг и куполна сграда в Лион", "Night lights along the riverbank and a domed building in Lyon", ["city","architecture","travel"]),
  photo(23, 2000, 1125, "Нощен Лион", "Lyon at night", "Осветени сгради и отражения в реката през нощта", "Illuminated buildings and reflections in the river at night", ["city","architecture","travel"]),
  photo(24, 2000, 1125, "Отражения след залез", "Reflections after sunset", "Градски светлини, отразени в реката след залез", "City lights reflected in the river after sunset", ["city","travel"]),
];
