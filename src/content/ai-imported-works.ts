// Phase 2 additions from the owner's prepared PNG archive.
// Runtime images use one native-size WebP derivative for both gallery and detail views;
// `sourceAsset` preserves the repository-relative path to the byte-identical PNG original.
import angryRomanEmperor from "@/assets/ai-historical-eras/angry-roman-emperor-in-senate.webp";
import celticWarlord from "@/assets/ai-historical-eras/celtic-warlord-at-fortress.webp";
import commanderAtGate from "@/assets/ai-historical-eras/commander-at-fortress-gate.webp";
import enragedVoivode from "@/assets/ai-historical-eras/enraged-voivode-with-letter.webp";
import knightInFlames from "@/assets/ai-historical-eras/knight-amid-siege-flames.webp";
import medievalBulgarianTsar from "@/assets/ai-historical-eras/medieval-bulgarian-tsar-in-throne-hall.webp";
import medievalKing from "@/assets/ai-historical-eras/medieval-king-above-misty-valley.webp";
import norwegianChieftain from "@/assets/ai-historical-eras/norwegian-chieftain-in-misty-fjord.webp";
import nubianKing from "@/assets/ai-historical-eras/nubian-king-and-returning-army.webp";
import phoenicianKing from "@/assets/ai-historical-eras/phoenician-king-above-stormy-harbor.webp";
import russianPrince from "@/assets/ai-historical-eras/russian-prince-above-winter-fortress.webp";
import samuraiInRain from "@/assets/ai-historical-eras/samurai-in-siege-rain.webp";
import spartanBattleCry from "@/assets/ai-historical-eras/spartan-battle-cry-in-fiery-pass.webp";
import thracianKing from "@/assets/ai-historical-eras/thracian-king-among-mountain-flames.webp";
import adventurerInRuins from "@/assets/ai-cinema-archetypes/adventurer-among-ancient-ruins.webp";
import captainInStorm from "@/assets/ai-cinema-archetypes/captain-against-the-storm.webp";
import escapeInRain from "@/assets/ai-cinema-archetypes/escape-in-the-rain.webp";
import finalAssault from "@/assets/ai-cinema-archetypes/final-assault-among-the-ruins.webp";
import glowingGrimoire from "@/assets/ai-cinema-archetypes/guardian-of-the-glowing-grimoire.webp";
import timePortal from "@/assets/ai-cinema-archetypes/guardian-of-the-time-portal.webp";
import nightMission from "@/assets/ai-cinema-archetypes/night-mission-over-the-city.webp";
import postapocalypticHunter from "@/assets/ai-cinema-archetypes/postapocalyptic-hunter-vs-mechs.webp";
import rainyNeonNoir from "@/assets/ai-cinema-archetypes/rainy-neon-noir.webp";
import soldierAmongColossi from "@/assets/ai-cinema-archetypes/soldier-among-colossi.webp";
import soldierByTruck from "@/assets/ai-cinema-archetypes/soldier-near-exploding-truck.webp";
import dinosaurJungle from "@/assets/ai-cinema-archetypes/survival-in-dinosaur-jungle.webp";
import edgeOfIce from "@/assets/ai-cinema-archetypes/survival-on-the-edge-of-ice.webp";
import sofiaRuins from "@/assets/ai-cinema-archetypes/survivor-among-sofia-ruins.webp";
import type { AiWork } from "./ai-works";

type ImportedRow = {
  slug: string;
  image: string;
  sourceAsset: string;
  width?: number;
  height?: number;
  tool?: AiWork["tool"];
  category: "Исторически образи" | "Кино визии";
  era?: "medieval";
  setting?: "throne-hall";
  title: [bg: string, en: string];
  description: [bg: string, en: string];
  alt: [bg: string, en: string];
  scene: string;
};

/** These are transparent reconstruction prompts; the original generation prompts were not supplied. */
const reconstructionPrompt = (scene: string) =>
  "Using the uploaded reference photograph as the identity source, create a photorealistic vertical cinematic artwork of the same person. Preserve the person's recognizable facial identity, natural facial proportions, skin tone and individual features from the reference photograph. " +
  scene +
  " Retain a believable human pose, credible hands, physically coherent clothing and detailed environmental textures. Use controlled cinematic depth, natural facial rendering and lighting that belongs to the scene. Preserve the dramatic atmosphere without plastic skin, exaggerated anatomy, visual caricature, watermarks or added text.";

const historicalRows: ImportedRow[] = [
  {
    slug: "angry-roman-emperor-in-senate",
    image: angryRomanEmperor,
    sourceAsset: "src/assets/ai-historical-eras/angry-roman-emperor-in-senate.png",
    category: "Исторически образи",
    title: ["Римски император", "Roman Emperor"],
    description: [
      "Пред неспокойния сенат римският император трябва да наложи волята си, преди разколът в залата да се превърне в открит бунт.",
      "Before a restless senate, the Roman emperor must assert his will before division in the chamber turns into open revolt.",
    ],
    alt: [
      "Римски император с лавров венец и позлатена броня протяга ръка в сенатска зала",
      "Roman emperor wearing a laurel wreath and gilded armour extending his hand inside the senate",
    ],
    scene:
      "Place them as an angry Roman emperor in an ornate bronze cuirass, deep purple cloak and gold laurel wreath, extending one hand toward senators in a monumental marble chamber. Keep statues, columns and imperial standards visible behind the waist-up figure in warm daylight, with controlled authority and mounting political tension.",
  },
  {
    slug: "celtic-warlord-at-fortress",
    image: celticWarlord,
    sourceAsset: "src/assets/ai-historical-eras/celtic-warlord-at-fortress.png",
    category: "Исторически образи",
    title: ["Келтски военачалник", "Celtic Warlord"],
    description: [
      "От дървените укрепления келтският военачалник събира разпръснатите кланове за битка, която ще реши кой владее планинския проход.",
      "From the timber fortifications, the Celtic warlord rallies the scattered clans for a battle that will decide who controls the mountain pass.",
    ],
    alt: [
      "Келтски военачалник с щит и кожена наметка пред армия и дървена крепост",
      "Celtic warlord with a shield and fur cloak before an army and timber fortress",
    ],
    scene:
      "Portray them as a Celtic warlord in layered leather, chain mail and a heavy fur-trimmed cloak, raising an arm beside a painted round shield. Behind the dynamic waist-up figure, show gathered warriors, timber palisades, banners and a misty mountain valley under cool early light.",
  },
  {
    slug: "commander-at-fortress-gate",
    image: commanderAtGate,
    sourceAsset: "src/assets/ai-historical-eras/commander-at-fortress-gate.png",
    category: "Исторически образи",
    era: "medieval",
    title: ["Римски пълководец", "Roman Commander"],
    description: [
      "Пред крепостната порта римският пълководец дава последни заповеди, докато легионът очаква знак да поеме към несигурна битка.",
      "At the fortress gate, the Roman commander gives his final orders as the legion awaits the signal to march into an uncertain battle.",
    ],
    alt: [
      "Командир в броня и червена наметка сочи пред крепостна порта и строена войска",
      "Armoured commander in a red cloak pointing before a fortress gate and assembled troops",
    ],
    scene:
      "Cast them as a medieval field commander in articulated armour and a weathered red cloak, pointing decisively beyond a massive open fortress gate. Frame the figure from the waist up with ranks of soldiers, stone towers and campaign banners extending into a bright but unsettled morning sky.",
  },
  {
    slug: "norwegian-chieftain-in-misty-fjord",
    image: norwegianChieftain,
    sourceAsset: "src/assets/ai-historical-eras/norwegian-chieftain-in-misty-fjord.png",
    category: "Исторически образи",
    title: ["Норвежки вожд", "Norwegian Chieftain"],
    description: [
      "Корабите се завръщат в мъгливия фиорд, а норвежкият вожд трябва да избере дали да търси мир или да подготви нов поход.",
      "The ships return to the misty fjord, and the Norwegian chieftain must choose whether to seek peace or prepare another expedition.",
    ],
    alt: [
      "Норвежки вожд с тежка кожена наметка пред заснежен фиорд и кораби",
      "Norwegian chieftain in a heavy fur cloak before a snowy fjord and ships",
    ],
    scene:
      "Show them as a Norwegian chieftain wearing layered wool, leather and a broad dark fur mantle fastened with a metal brooch. Place the composed chest-up figure beside torchlit carved timber, with a snowy fjord, steep mountains and longships receding into blue-grey mist.",
  },
  {
    slug: "nubian-king-and-returning-army",
    image: nubianKing,
    sourceAsset: "src/assets/ai-historical-eras/nubian-king-and-returning-army.png",
    tool: "Gemini Nano Banana",
    category: "Исторически образи",
    title: ["Нубийски цар", "Nubian King"],
    description: [
      "След победоносен поход нубийският цар посреща войската си, но завръщането ѝ носи вест за нова заплаха отвъд границите.",
      "After a victorious campaign, the Nubian king welcomes his army home, but its return brings news of a new threat beyond the frontier.",
    ],
    alt: [
      "Нубийски цар с церемониална корона пред армия, крепост и пирамиди",
      "Nubian king in a ceremonial crown before an army, fortress and pyramids",
    ],
    scene:
      "Present them as a Nubian king in a tall gold-and-black ceremonial crown, finely patterned white robes and protective gold ornaments. Frame the regal figure from the waist up while soldiers return through a sandstone city, with banners, dust and distant pyramids illuminated by warm late-afternoon sun.",
  },
  {
    slug: "enraged-voivode-with-letter",
    image: enragedVoivode,
    sourceAsset: "src/assets/ai-historical-eras/enraged-voivode-with-letter.png",
    category: "Исторически образи",
    era: "medieval",
    title: ["Български войвода", "Bulgarian Voivode"],
    description: [
      "Тревожно писмо достига крепостта и българският войвода трябва да избере между последна отбрана и опасен път към спасението.",
      "An alarming letter reaches the fortress, and the Bulgarian voivode must choose between a final defense and a dangerous road to safety.",
    ],
    alt: [
      "Разгневен войвода в кожена наметка държи писмо пред горяща крепост",
      "Enraged voivode in a fur cloak holding a letter before a burning fortress",
    ],
    scene:
      "Depict them as an enraged medieval voivode in dark lamellar armour and a thick fur mantle, gripping a creased letter in one hand. Place the intense waist-up portrait on a stone battlement with watchtowers, smoke, torches and distant mountain slopes under a cold storm-lit sky.",
  },
  {
    slug: "knight-amid-siege-flames",
    image: knightInFlames,
    sourceAsset: "src/assets/ai-historical-eras/knight-amid-siege-flames.png",
    category: "Исторически образи",
    era: "medieval",
    title: ["Рицарят на последната стена", "Knight of the Last Wall"],
    description: [
      "Когато обсадата пробива външната стена, изтощеният рицар остава на последната отбранителна линия между пламъците и хората зад крепостта.",
      "When the siege breaches the outer wall, the exhausted knight remains at the final line of defense between the flames and the people inside.",
    ],
    alt: [
      "Рицар с меч и очукана броня пред рушаща се горяща крепостна стена",
      "Knight with a sword and battered armour before a collapsing, burning fortress wall",
    ],
    scene:
      "Place them as a battle-worn knight in scratched dark plate and chain armour, bracing a sword while shattered masonry flies from a burning fortress wall. Use a close, urgent three-quarter composition with smoke, sparks, arrows and defending soldiers behind the figure, keeping the face clear within the chaos.",
  },
  {
    slug: "russian-prince-above-winter-fortress",
    image: russianPrince,
    sourceAsset: "src/assets/ai-historical-eras/russian-prince-above-winter-fortress.png",
    category: "Исторически образи",
    title: ["Руски княз", "Russian Prince"],
    description: [
      "Над заснежената крепост руският княз наблюдава събраната войска и претегля цената на похода, който предстои да започне.",
      "Above the snowbound fortress, the Russian prince surveys the assembled army and weighs the cost of the campaign about to begin.",
    ],
    alt: [
      "Руски княз с кожена наметка над заснежена крепост и войска",
      "Russian prince in a fur cloak above a snow-covered fortress and army",
    ],
    scene:
      "Portray them as a Russian prince in ornate red garments, chain mail and a sweeping dark fur cloak, standing above a winter stronghold. Show snowy towers, rooftops and ordered troops across the valley behind the waist-up figure, using pale cold daylight and restrained red and iron accents.",
  },
  {
    slug: "samurai-in-siege-rain",
    image: samuraiInRain,
    sourceAsset: "src/assets/ai-historical-eras/samurai-in-siege-rain.png",
    category: "Исторически образи",
    title: ["Самурай на последна стража", "Samurai on the Last Watch"],
    description: [
      "Под проливния дъжд самураят остава пред горящата крепост, за да спечели време за онези, които още могат да се измъкнат.",
      "Under driving rain, the samurai remains before the burning stronghold to buy time for those who can still escape.",
    ],
    alt: [
      "Самурай с мокра броня и меч пред горяща японска крепост под силен дъжд",
      "Samurai in rain-soaked armour with a sword before a burning Japanese fortress",
    ],
    scene:
      "Render them as a rain-soaked samurai in layered black and deep red armour, holding a katana low across the foreground. Use a close over-the-shoulder battle portrait with wet hair, water on lacquered plates and a Japanese fortress burning behind soldiers in a dense night downpour.",
  },
  {
    slug: "spartan-battle-cry-in-fiery-pass",
    image: spartanBattleCry,
    sourceAsset: "src/assets/ai-historical-eras/spartan-battle-cry-in-fiery-pass.png",
    category: "Исторически образи",
    title: ["Спартански воин", "Spartan Warrior"],
    description: [
      "В тесния проход спартанският воин повежда бойния вик, докато редицата зад него се готви да удържи многократно по-силен противник.",
      "In the narrow pass, the Spartan warrior leads the battle cry as the ranks behind him prepare to hold against a far stronger enemy.",
    ],
    alt: [
      "Спартански воин с бронзова броня и щит в огнен планински проход",
      "Spartan warrior in bronze armour with a shield inside a fiery mountain pass",
    ],
    scene:
      "Cast them as a Spartan warrior in weathered bronze armour, crimson cloak and crested helmet, shouting while reaching forward beside a round shield. Fill the rocky pass behind the chest-up figure with spears, warriors, smoke and scattered fire under harsh battle light.",
  },
  {
    slug: "medieval-bulgarian-tsar-in-throne-hall",
    image: medievalBulgarianTsar,
    sourceAsset: "src/assets/ai-historical-eras/medieval-bulgarian-tsar-in-throne-hall.png",
    category: "Исторически образи",
    era: "medieval",
    setting: "throne-hall",
    title: ["Средновековен български цар", "Medieval Bulgarian Tsar"],
    description: [
      "В тронната зала българският цар приема короната и отговорността да запази единството на държавата пред надвисваща заплаха.",
      "In the throne hall, the Bulgarian tsar accepts the crown and the responsibility of preserving the realm's unity in the face of a gathering threat.",
    ],
    alt: [
      "Средновековен български цар с корона и червена мантия в тронна зала",
      "Medieval Bulgarian tsar wearing a crown and red mantle inside a throne hall",
    ],
    scene:
      "Present them as a medieval Bulgarian tsar seated upright on a carved throne, wearing a jeweled crown, red velvet mantle and richly embroidered gold regalia. Frame the figure from the waist up in a vaulted stone hall with heraldic banners, guards and warm torchlight, creating formal authority without naming a specific historical ruler.",
  },
  {
    slug: "medieval-king-above-misty-valley",
    image: medievalKing,
    sourceAsset: "src/assets/ai-historical-eras/medieval-king-above-misty-valley.png",
    category: "Исторически образи",
    era: "medieval",
    title: ["Владетелят на планинската крепост", "Ruler of the Mountain Fortress"],
    description: [
      "От високите стени владетелят оглежда долината и разбира, че приближаващата войска ще изпита не само крепостта, а и верността на хората му.",
      "From the high walls, the ruler surveys the valley and realizes the approaching army will test not only the fortress but his people's loyalty.",
    ],
    alt: [
      "Средновековен крал с меч и кожена наметка над мъглива планинска долина",
      "Medieval king with a sword and fur cloak above a misty mountain valley",
    ],
    scene:
      "Show them as a medieval king in chain mail, patterned dark clothing and a heavy black fur mantle, standing on a stone height with a sword at the hip. Open the background to a misty green valley, mountain walls and a distant army, under broken cool daylight and a brooding sky.",
  },
  {
    slug: "thracian-king-among-mountain-flames",
    image: thracianKing,
    sourceAsset: "src/assets/ai-historical-eras/thracian-king-among-mountain-flames.png",
    category: "Исторически образи",
    title: ["Тракийски владетел", "Thracian Ruler"],
    description: [
      "Сред огньовете в планината тракийският владетел събира воините си, решен да защити прохода преди настъпващата армия да достигне долината.",
      "Among fires in the mountains, the Thracian ruler gathers his warriors, determined to hold the pass before the advancing army reaches the valley.",
    ],
    alt: [
      "Тракийски цар в богато украсена бронзова броня сред планински огньове и войска",
      "Thracian king in richly decorated bronze armour among mountain fires and an army",
    ],
    scene:
      "Portray them as a Thracian king in richly embossed bronze armour, dark red cloak and a restrained gold circlet, standing beside a carved stone monument. Behind the waist-up figure, show rocky mountains, scattered fires, banners and ranks of warriors beneath dramatic clouded light.",
  },
  {
    slug: "phoenician-king-above-stormy-harbor",
    image: phoenicianKing,
    sourceAsset: "src/assets/ai-historical-eras/phoenician-king-above-stormy-harbor.png",
    category: "Исторически образи",
    title: ["Финикийски владетел", "Phoenician Ruler"],
    description: [
      "Над бурното пристанище финикийският владетел следи завръщащите се кораби, защото товарът им може да спаси града или да разпали война.",
      "Above the stormbound harbor, the Phoenician ruler watches the returning ships, knowing their cargo could save the city or ignite a war.",
    ],
    alt: [
      "Финикийски цар с пурпурна мантия над бурно древно пристанище с кораби",
      "Phoenician king in a purple mantle above a stormy ancient harbor with ships",
    ],
    scene:
      "Depict them as a Phoenician king in engraved gold armour, deep purple mantle and a narrow ceremonial circlet, standing at a carved stone parapet. Spread an ancient harbor below with merchant ships, towers, rough waves and torchlight while dark storm clouds break around a narrow band of sunset.",
  },
];

const cinemaRows: ImportedRow[] = [
  {
    slug: "escape-in-the-rain",
    image: escapeInRain,
    sourceAsset: "src/assets/ai-cinema-archetypes/escape-in-the-rain.png",
    category: "Кино визии",
    title: ["Последният изход", "The Last Way Out"],
    description: [
      "Ранен и обграден, беглецът има само няколко минути да премине през блокирания град, преди последният изход да бъде затворен.",
      "Wounded and surrounded, the fugitive has only minutes to cross the sealed city before the last way out is closed.",
    ],
    alt: [
      "Ранен мъж бяга по мокра градска улица под силен дъжд и прожектори",
      "Injured man escaping along a wet city street under heavy rain and searchlights",
    ],
    scene:
      "Stage a tense escape in a rain-lashed city alley, with the person crouched in soaked dark clothing, one arm driving them forward and small cuts and dirt visible from the chase. Use wet pavement, police lights, a sweeping overhead searchlight and shadowy figures in the distance, framed as an urgent low-angle action still.",
  },
  {
    slug: "soldier-among-colossi",
    image: soldierAmongColossi,
    sourceAsset: "src/assets/ai-cinema-archetypes/soldier-among-colossi.png",
    category: "Кино визии",
    title: ["Под сянката на колосите", "In the Shadow of Giants"],
    description: [
      "Когато бойните колоси преминават през разрушения град, един войник отказва да отстъпи и се изправя срещу сила, създадена да го обезличи.",
      "As war colossi cross the ruined city, one soldier refuses to retreat and confronts a force built to erase everything human.",
    ],
    alt: [
      "Войник с футуристична броня и оръжие пред гигантски бойни машини",
      "Soldier in futuristic armour carrying a weapon before gigantic war machines",
    ],
    scene:
      "Place them as a hardened future soldier in damaged tactical armour, gripping a heavy rifle while turning toward a threat beyond the frame. Behind the chest-up figure, immense multi-legged war machines stride through a ruined industrial landscape filled with fire, smoke and falling debris under pale daylight.",
  },
  {
    slug: "rainy-neon-noir",
    image: rainyNeonNoir,
    sourceAsset: "src/assets/ai-cinema-archetypes/rainy-neon-noir.png",
    tool: "Gemini Nano Banana",
    category: "Кино визии",
    title: ["Последният свидетел", "The Last Witness"],
    description: [
      "В град, който никога не заспива, един беглец пресича неоновата нощ, преследван от хора, които познават всяка негова следваща стъпка.",
      "In a city that never sleeps, a fugitive crosses the neon night, pursued by people who seem to know his every next move.",
    ],
    alt: [
      "Мъж с черно палто в дъждовна неонова улица с отдалечаващ се силует",
      "Man in a black coat on a rainy neon street with a receding silhouette",
    ],
    scene:
      "Create a restrained neo-noir close portrait in a rain-soaked night street, with the person turning over the raised collar of a black coat. Let red signs, blue city lights and car reflections dissolve across wet pavement, while a solitary silhouette walks away through steam in the central background.",
  },
  {
    slug: "captain-against-the-storm",
    image: captainInStorm,
    sourceAsset: "src/assets/ai-cinema-archetypes/captain-against-the-storm.png",
    tool: "Gemini Nano Banana",
    category: "Кино визии",
    title: ["Капитанът срещу бурята", "Captain Against the Storm"],
    description: [
      "Когато бурята разкъсва платната, капитанът остава на руля и повежда кораба през вълните към единствения възможен изход.",
      "When the storm tears through the sails, the captain stays at the wheel and drives the ship toward its only possible escape.",
    ],
    alt: [
      "Капитан стиска корабния рул по време на силна морска буря с мълнии",
      "Captain gripping a ship's wheel during a violent sea storm with lightning",
    ],
    scene:
      "Cast them as the captain of a battered sailing ship, wearing a black weathered coat and gripping a wooden wheel with both hands. Tilt the deck through a violent night storm of breaking waves, torn rigging, driving rain and lightning, using a close dynamic angle that keeps the captain's determination readable.",
  },
  {
    slug: "night-mission-over-the-city",
    image: nightMission,
    sourceAsset: "src/assets/ai-cinema-archetypes/night-mission-over-the-city.png",
    width: 1122,
    height: 1402,
    category: "Кино визии",
    title: ["Последният покрив", "The Last Rooftop"],
    description: [
      "Над нощния град оперативен агент достига последния покрив, докато хеликоптерът стеснява светлия кръг около единствения му път за бягство.",
      "Above the sleeping city, an operative reaches the last rooftop as a helicopter narrows its searchlight around his only escape route.",
    ],
    alt: [
      "Оперативен агент на ръба на висок покрив през нощта с хеликоптер над града",
      "Operative on the edge of a high rooftop at night with a helicopter above the city",
    ],
    scene:
      "Stage a vertical rooftop action sequence at night, with the person in dark tactical clothing hauling themselves over a wet stone ledge while holding a compact radio. Show the city far below, a helicopter banking overhead and its white searchlight cutting through rain and smoke toward the roof.",
  },
  {
    slug: "survival-in-dinosaur-jungle",
    image: dinosaurJungle,
    sourceAsset: "src/assets/ai-cinema-archetypes/survival-in-dinosaur-jungle.png",
    width: 941,
    height: 1672,
    category: "Кино визии",
    title: ["Територия на хищника", "Predator Territory"],
    description: [
      "Останал без връзка с екипа си, изследователят навлиза в територията на хищник, който превръща всяко движение в борба за оцеляване.",
      "Cut off from his team, an explorer enters a predator's territory, where every movement becomes a struggle to survive.",
    ],
    alt: [
      "Оцелял пълзи в джунгла пред нападащ динозавър и разрушена ограда",
      "Survivor crawling through a jungle before an attacking dinosaur and broken fence",
    ],
    scene:
      "Create a survival thriller inside a dense tropical compound, with the person crawling through mud and wet foliage in torn expedition clothing and a field harness. Behind the low foreground figure, a roaring predatory dinosaur breaks through damaged metal gates while mist, sunlight and warning lights cut across the jungle.",
  },
  {
    slug: "survival-on-the-edge-of-ice",
    image: edgeOfIce,
    sourceAsset: "src/assets/ai-cinema-archetypes/survival-on-the-edge-of-ice.png",
    category: "Кино визии",
    title: ["Леденият предел", "The Frozen Edge"],
    description: [
      "Изтощен и сам, оцелелият се вкопчва в разцепения лед, докато бурята заличава последните следи от пътя към спасението.",
      "Exhausted and alone, the survivor clings to fractured ice as the storm erases the last traces of a path to safety.",
    ],
    alt: [
      "Изтощен мъж се изкачва по разцепен лед сред снежна буря и далечни останки",
      "Exhausted man climbing fractured ice amid a snowstorm and distant wreckage",
    ],
    scene:
      "Place the person at the edge of a fractured ice shelf, hauling themselves forward through freezing spray in soaked dark survival gear. Use a close low perspective, snow crusted across clothing and skin, with a whiteout storm, broken ice and distant burning wreckage barely visible behind them.",
  },
  {
    slug: "survivor-among-sofia-ruins",
    image: sofiaRuins,
    sourceAsset: "src/assets/ai-cinema-archetypes/survivor-among-sofia-ruins.png",
    category: "Кино визии",
    title: ["Оцелял сред руините на София", "Survivor Among the Ruins of Sofia"],
    description: [
      "Самотен оцелял прекосява опустяла София сред разрушени сгради, изоставени автомобили и следите от един рухнал свят.",
      "A lone survivor crosses a deserted Sofia, surrounded by ruined buildings, abandoned vehicles, and the remains of a fallen world.",
    ],
    alt: [
      "Оцелял с раница сред разрушени сгради и изоставени автомобили в опустяла София",
      "Backpacked survivor among ruined buildings and abandoned vehicles in a deserted Sofia",
    ],
    scene:
      "Portray the person as a solitary survivor in layered weathered clothing and a practical backpack, standing among rubble in a devastated Sofia square. Keep damaged civic architecture in the background beneath smoky amber clouds, without presenting the fictional scene as a real event.",
  },
  {
    slug: "guardian-of-the-time-portal",
    image: timePortal,
    sourceAsset: "src/assets/ai-cinema-archetypes/guardian-of-the-time-portal.png",
    category: "Кино визии",
    title: ["Картографът на времето", "The Cartographer of Time"],
    description: [
      "Механичният компас отваря разлом над града, а неговият пазител трябва да избере коя версия на миналото заслужава да оцелее.",
      "A mechanical compass opens a fracture above the city, and its keeper must decide which version of the past deserves to survive.",
    ],
    alt: [
      "Пазител с механичен компас пред светлинен времеви портал в градска улица",
      "Guardian holding a mechanical compass before a luminous time portal on a city street",
    ],
    scene:
      "Present the person as a time-portal guardian in a dark leather field coat, holding an intricate brass chronometer while looking toward an opening in the air. Blend historic domes and stone facades with distant future towers, using circular blue-gold energy trails, wet pavement and grounded evening light.",
  },
  {
    slug: "guardian-of-the-glowing-grimoire",
    image: glowingGrimoire,
    sourceAsset: "src/assets/ai-cinema-archetypes/guardian-of-the-glowing-grimoire.png",
    width: 941,
    height: 1672,
    category: "Кино визии",
    title: ["Книгата на забравените имена", "The Book of Forgotten Names"],
    description: [
      "В забранената библиотека древна книга произнася забравени имена, а нейният пазител разбира, че следващото е неговото.",
      "In the forbidden library, an ancient book speaks forgotten names, and its guardian realizes that his will be next.",
    ],
    alt: [
      "Пазител държи сияеща древна книга в тъмна библиотека със свещи",
      "Guardian holding a glowing ancient book inside a dark candlelit library",
    ],
    scene:
      "Cast the person as the guardian of an ancient grimoire, wearing a dark embroidered robe and holding an open leather-bound book at chest level. Fill a vaulted library with shelves, brass instruments and candles while warm golden symbols and dust-like light rise naturally from the pages onto the face and hands.",
  },
  {
    slug: "soldier-near-exploding-truck",
    image: soldierByTruck,
    sourceAsset: "src/assets/ai-cinema-archetypes/soldier-near-exploding-truck.png",
    width: 941,
    height: 1672,
    category: "Кино визии",
    title: ["Секунди до взрива", "Seconds Before the Blast"],
    description: [
      "Взривът прекъсва отстъплението, а войникът разполага само със секунди да достигне прикритие и да предупреди останалите за следващата атака.",
      "The explosion cuts off the retreat, leaving the soldier only seconds to reach cover and warn the others about the next attack.",
    ],
    alt: [
      "Войник в очукана екипировка пред експлодиращ камион и разрушени сгради",
      "Soldier in battered equipment before an exploding truck and ruined buildings",
    ],
    scene:
      "Frame a close battlefield portrait of the person in worn modern combat gear, crouched behind rubble and turning sharply toward danger outside the frame. A military truck erupts in flame and debris behind them between damaged stone buildings, with smoke and sparks creating urgency without obscuring the face.",
  },
  {
    slug: "final-assault-among-the-ruins",
    image: finalAssault,
    sourceAsset: "src/assets/ai-cinema-archetypes/final-assault-among-the-ruins.png",
    width: 1122,
    height: 1402,
    category: "Кино визии",
    title: ["Последният щурм", "The Final Assault"],
    description: [
      "Последната група навлиза в коридора от руини, знаейки че зад падащите стени ги очаква битката, от която няма връщане.",
      "The final squad enters a corridor of ruins, knowing that beyond the falling walls waits a battle from which there is no return.",
    ],
    alt: [
      "Въоръжен войник напредва сред градски руини и експлозии",
      "Armed soldier advancing through urban ruins and explosions",
    ],
    scene:
      "Create a tall, compressed action composition of the person advancing with a rifle through a shattered urban corridor in dark tactical clothing. Let collapsing walls, a nearby explosion, flying debris and smoke close around the figure while a narrow path and determined movement keep the scene readable.",
  },
  {
    slug: "postapocalyptic-hunter-vs-mechs",
    image: postapocalypticHunter,
    sourceAsset: "src/assets/ai-cinema-archetypes/postapocalyptic-hunter-vs-mechs.png",
    category: "Кино визии",
    title: ["Ловец срещу машините", "Hunter vs. the Machines"],
    description: [
      "Сред горящите руини ловец се изправя срещу гигантски бойни машини, чиито червени светлини прорязват дима.",
      "Amid burning ruins, a hunter faces towering war machines, their red lights cutting through the smoke.",
    ],
    alt: [
      "Постапокалиптичен ловец с оръжие пред горящи руини и бойни мехове",
      "Postapocalyptic hunter carrying a weapon before burning ruins and battle mechs",
    ],
    scene:
      "Portray the person as a postapocalyptic hunter in layered black armour and a loaded field pack, holding a rugged rifle across the foreground. Behind the waist-up figure, small hostile mechs move through a ruined industrial street filled with burning wreckage, ash, embers and heavy smoke.",
  },
  {
    slug: "adventurer-among-ancient-ruins",
    image: adventurerInRuins,
    sourceAsset: "src/assets/ai-cinema-archetypes/adventurer-among-ancient-ruins.png",
    category: "Кино визии",
    title: ["Храмът без име", "The Nameless Temple"],
    description: [
      "Сред погълнатите от джунглата руини приключенецът открива вход към храм без име — и следа, която някой е искал да остане скрита.",
      "Among ruins swallowed by the jungle, an adventurer finds the entrance to a nameless temple—and a clue someone wanted to remain hidden.",
    ],
    alt: [
      "Приключенец с раница и кожена риза сред обрасли древни каменни руини",
      "Adventurer with a backpack and leather shirt among overgrown ancient stone ruins",
    ],
    scene:
      "Stage an archaeological adventure in a humid jungle, with the person seated against a carved stone block in a worn tan field shirt, leather forearm guard and backpack harness. Surround the figure with vines, moss, broken arches and a distant temple, using shafts of warm sunlight and a watchful pause between discoveries.",
  },
];

const toWork = (row: ImportedRow): AiWork => ({
  slug: row.slug,
  image: row.image,
  sourceAsset: row.sourceAsset,
  width: row.width ?? 1122,
  height: row.height ?? 1402,
  title: row.title[0],
  alt: row.alt[0],
  description: row.description[0],
  prompt: reconstructionPrompt(row.scene),
  promptKind: "illustrative",
  ...(row.tool ? { tool: row.tool } : {}),
  category: row.category,
  ...(row.era ? { era: row.era } : {}),
  ...(row.setting ? { setting: row.setting } : {}),
  references: [],
  variants: [],
  en: {
    title: row.title[1],
    alt: row.alt[1],
    description: row.description[1],
  },
});

export const importedHistoricalWorks = historicalRows.map(toWork);
export const importedCinemaWorks = cinemaRows.map(toWork);
export const importedAiWorks = [...importedHistoricalWorks, ...importedCinemaWorks];

export const IMPORTED_HISTORICAL_SLUGS = importedHistoricalWorks.map((work) => work.slug);
export const IMPORTED_CINEMA_SLUGS = importedCinemaWorks.map((work) => work.slug);
