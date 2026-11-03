/* Ukrainian names for reference foods that were only stored in English. Values stay the Ciqual or label figures already in the catalog. */
const STAPLE_NAMES = {
  "ciq-13184": ["Оливки", "маслини оливки olives olive"],
  "ciq-13033": ["Оливки зелені в розсолі", "маслини зелені оливки зелені olive green"],
  "ciq-13032": ["Маслини чорні в розсолі", "оливки чорні маслини чорні olive black"],
  "ciq-13186": ["Маслини чорні", "оливки чорні маслини olive black"],
  "ciq-13147": ["Оливки зелені фаршировані", "маслини фаршировані stuffed olives"],
  "ciq-13131": ["Маслини чорні в олії", "оливки чорні greek olives"],
  "ciq-11074": ["Імбир свіжий", "імбир ginger"],
  "ciq-11006": ["Імбир мелений", "імбир ginger powder"],
  "ciq-20023": ["Селера стебло, сира", "селера сельдерей celery"],
  "ciq-20045": ["Редиска, сира", "редис редиска radish"],
  "ciq-20217": ["Рукола, сира", "рукола руккола rocket arugula"],
  "ciq-11093": ["Кріп свіжий", "кріп укроп dill"],
  "ciq-11014": ["Петрушка свіжа", "петрушка parsley"],
  "ciq-11094": ["Кінза свіжа", "кінза кинза коріандр coriander cilantro"],
  "ciq-20111": ["Щавель, сирий", "щавель sorrel"],
  "ciq-11000": ["Часник, сирий", "часник чеснок garlic"],
  "ciq-20039": ["Цибуля-порей, сира", "порей leek"],
  "ciq-20053": ["Баклажан, сирий", "баклажан баклажаны eggplant aubergine"],
  "ciq-20166": ["Гарбуз, сирий", "гарбуз тыква pumpkin"],
  "ciq-9436": ["Борошно пшеничне", "борошно мука flour"],
  "ciq-9621": ["Висівки пшеничні", "висівки bran"],
  "ciq-11018": ["Оцет", "оцет уксус vinegar"],
  "ciq-11091": ["Оцет бальзамічний", "оцет бальзамічний balsamic"],
  "ciq-11010": ["Дріжджі свіжі", "дріжджі дрожжи yeast"],
  "ciq-11045": ["Дріжджі сухі", "дріжджі дрожжи yeast"],
  "ciq-11025": ["Кориця мелена", "кориця корица cinnamon"],
  "ciq-36201": ["Качка, м'ясо сире", "качка утка duck"],
  "ciq-36202": ["Качка, запечена", "качка утка duck"]
};

for (const food of FOOD_CATALOG) {
  const patch = STAPLE_NAMES[food.id];
  if (!patch) continue;
  food.originalName = food.originalName || food.name;
  food.name = patch[0];
  food.aliases = patch[1];
  food.localized = true;
}

const STAPLE_LABELS = [
  {id:"staple-ricotta", name:"Рикота", originalName:"Ricotta", aliases:"рикота ricotta", category:"dairy", brand:"Сільпо", emoji:"🧀", kcal:133, p:7, f:10, c:3.7, code:"4823096440040"},
  {id:"staple-quinoa", name:"Кіноа, суха", originalName:"Quinoa White", aliases:"кіноа киноа quinoa", category:"staples", brand:"Жменька", emoji:"🌾", kcal:373, p:16.5, f:5.9, c:64.8, code:"4820152182098"},
  {id:"staple-bulgur", name:"Булгур, сухий", originalName:"Булгур", aliases:"булгур bulgur", category:"staples", brand:"Булгур", emoji:"🌾", kcal:331, p:13, f:1.5, c:68, code:"4820191590557"},
  {id:"staple-bay", name:"Лавровий лист, сухий", originalName:"Лавровый лист", aliases:"лавров лавровий лавровый bay", category:"other", brand:"Красная цена", emoji:"🌿", kcal:406, p:8, f:8, c:75, code:"4607018298519", serving:2}
];

const stapleKnown = new Set(FOOD_CATALOG.map(food => (food.name || "").toLocaleLowerCase("uk")));
for (const item of STAPLE_LABELS) {
  if ([...stapleKnown].some(name => name.includes(item.name.toLocaleLowerCase("uk").slice(0, 5)))) continue;
  FOOD_CATALOG.push({
    id: item.id,
    name: item.name,
    originalName: item.originalName,
    aliases: item.aliases,
    category: item.category,
    brand: item.brand,
    unit: "g",
    basis: 100,
    serving: item.serving || 100,
    kcal: item.kcal,
    p: item.p,
    f: item.f,
    c: item.c,
    quality: "label-community",
    url: "https://world.openfoodfacts.org/product/" + item.code,
    checked: "2026-11-01",
    emoji: item.emoji,
    localized: true,
    barcode: item.code,
    review: "Дані етикетки зі спільноти Open Food Facts. Звір актуальну упаковку."
  });
}
