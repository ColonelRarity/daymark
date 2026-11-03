/* Packaged foods from Open Food Facts. Loaded on the first search, not with the page. */
const OFF_EMOJI = {staples:"🌾", meat:"🍗", fish:"🐟", veg:"🥦", fruit:"🍎", nuts:"🥜", dairy:"🧀", ready:"🍲", sweets:"🍰", snacks:"🍿", sauces:"🥣", drinks:"🥤", alcohol:"🍷", restaurant:"🍽", other:"🍽"};
const FOOD_NAME_EMOJI = [[/оливк|маслин|\bolive\b/i,"🫒"],[/олія|оливков|oil\b/i,"🫒"],[/ялови|стейк|свин|beef|pork/i,"🥩"],[/кур(к|я|и)|chicken|індич|turkey/i,"🍗"],[/риб|лосос|тунец|тунець|fish|salmon|tuna/i,"🐟"],[/кревет|shrimp/i,"🦐"],[/сирник|(?<![а-яіїєґ])сир(?![а-яіїєґ])|cheese|рикот|творог/i,"🧀"],[/молок|йогурт|кефір|milk|yogurt/i,"🥛"],[/хліб|bread|батон/i,"🍞"],[/яйц|egg/i,"🥚"],[/яблук|apple/i,"🍎"],[/банан|banana/i,"🍌"],[/помідор|томат|\btomato/i,"🍅"],[/огір|\bcucumber/i,"🥒"],[/овоч|салат|broccoli|капуст|моркв|перець/i,"🥦"],[/шоколад|цукер|chocolate|торт|морозив/i,"🍰"],[/кава|coffee|какао/i,"☕"],[/вода|water|сік|juice|напій/i,"🥤"],[/борщ|суп|soup/i,"🍲"],[/рис|греч|вівс|каша|борошн|хлібц/i,"🌾"]];
function foodEmoji(food) {
  const blob = (food.name || "") + " " + (food.originalName || "");
  for (const [pattern, emoji] of FOOD_NAME_EMOJI) if (pattern.test(blob)) return emoji;
  if (food.emoji && food.emoji !== "◌" && food.emoji !== "◉" && food.emoji !== "🍽") return food.emoji;
  return OFF_EMOJI[food.category] || "🍽";
}
function paintCatalogEmoji(root) {
  if (!root) return;
  root.querySelectorAll(".catalog-item").forEach(button => {
    const visual = button.querySelector(".food-visual");
    if (!visual || visual.querySelector("img")) return;
    const food = foodById(button.dataset.id);
    if (food) visual.textContent = foodEmoji(food);
  });
}
const OFF_SYN = {"бургер":"бургер","латте":"лате","кофе":"кава","шаурма":"шаурма","шаверма":"шаурма","макдональдс":"mcdonald","макдональдз":"mcdonald","суши":"суш","роллы":"рол","ролы":"рол","филадельфия":"філадельфі","филадельфии":"філадельфі","philadelphia":"філадельфі","лапша":"локшин","цезарь":"цезар","оливье":"олівє","селедка":"оселедець","овсянка":"вівся","курица":"кур","индейка":"індич","говядина":"ялович","свинина":"свин","рыба":"риб","креветка":"кревет","креветки":"кревет","сыр":"сир","сырники":"сирники","яичница":"яєчня","яйцо":"яйце","завтрак":"сніданок","жареный":"смажен","жареная":"смажен","вареный":"варен","вареная":"варен","тушеный":"тушкован","запеченный":"запечен","шампанское":"шампан","творог":"сир","пузата":"пузата","япеко":"япіко","япико":"япіко"};
const OFF_ALSO = {"піца":"pizza","пица":"pizza","pizza":"піц","бургер":"burger","burger":"бургер","суші":"sushi","суши":"sushi","sushi":"суш","борщ":"borscht","кава":"coffee","кофе":"coffee","круасан":"croissant","croissant":"круасан","рамен":"ramen","ramen":"рамен","салат":"salad","йогурт":"yogurt","yogurt":"йогурт","хліб":"bread","шоколад":"chocolat","морозиво":"ice cream","фрі":"fries","маслини":["олив","olive"],"маслины":["олив","olive"],"оливки":["olive","маслин"],"селера":"celery","редиска":"radish","редис":"radish","рукола":"rocket","кінза":"coriander","коріандр":"coriander","кріп":"dill","петрушка":"parsley","щавель":"sorrel","борошно":"flour","висівки":"bran","качка":"duck","оцет":"vinegar","дріжджі":"yeast","кориця":"cinnamon","імбир":"ginger"};

let offRows = null;
let offHay = null;
let offLoad = null;

function offFood(row) {
  const [name, brand, cat, kcal, p, f, c, code, serving, unit] = row;
  const food = {
    id: "off-" + code,
    name,
    originalName: name,
    brand: brand || "Open Food Facts",
    category: FOOD_CATEGORIES[cat] ? cat : "other",
    unit: unit === "ml" ? "ml" : "g",
    basis: 100,
    serving: serving || 100,
    kcal, p, f, c,
    quality: "label-community",
    url: "https://world.openfoodfacts.org/product/" + code,
    checked: "2026-11-01",
    localized: /[а-яіїєґ]/i.test(name),
    emoji: "",
    barcode: code,
    review: "Дані етикетки зі спільноти Open Food Facts. Звір актуальну упаковку: склад і рецептура можуть змінитися."
  };
  food.emoji = foodEmoji(food);
  return food;
}

function loadOffPack() {
  if (offRows) return Promise.resolve(offRows);
  if (!offLoad) {
    offLoad = fetch("off-pack.json")
      .then(response => {
        if (!response.ok) throw new Error("pack");
        return response.json();
      })
      .then(rows => {
        offRows = rows;
        offHay = rows.map(row => foodSearchText([row[0], row[1], row[7]].join(" ")));
        return rows;
      })
      .catch(error => {
        offLoad = null;
        throw error;
      });
  }
  return offLoad;
}

function offTermGroups() {
  return foodSearchText(catalogFilter.query).split(/[\s,]+/).filter(Boolean).map(term => {
    const mapped = OFF_SYN[term] || term;
    const group = [mapped];
    const extra = OFF_ALSO[term] || OFF_ALSO[mapped];
    const list = extra == null ? [] : (Array.isArray(extra) ? extra : [extra]);
    for (const item of list) if (!group.includes(item)) group.push(item);
    return group;
  });
}

function offQueryActive() {
  if (catalogFilter.brand !== "all" && catalogFilter.brand !== "off") return false;
  if (catalogFilter.brand === "off") return true;
  return offTermGroups().some(group => group.some(term => term.length >= 2));
}

function offCategoryOk(row) {
  const cat = catalogFilter.category;
  const foodCat = row[2];
  const unit = row[9];
  if (cat === "all") return true;
  if (cat === "mine" || cat === "restaurant") return false;
  if (cat === "drink-all") return foodCat === "drinks" || foodCat === "alcohol" || unit === "ml";
  return foodCat === cat;
}

function offMatches(index, groups) {
  if (!offCategoryOk(offRows[index])) return false;
  if (!groups.length) return catalogFilter.brand === "off";
  return groups.every(group => group.some(term => term.length < 2 || offHay[index].includes(term)));
}

function collectOff(limit) {
  const groups = offTermGroups();
  const found = [];
  for (let i = 0; i < offRows.length && found.length < limit; i++) {
    if (offMatches(i, groups)) found.push(offRows[i]);
  }
  return found;
}

function offButton(row) {
  const food = offFood(row);
  const amount = num(food.kcal, 1) + " ккал / 100 " + (food.unit === "ml" ? "мл" : "г");
  return '<button class="catalog-item" data-action="pick-food" data-id="' + food.id + '"><span class="food-visual">' + food.emoji + '</span><span><strong>' + esc(food.name) + '</strong><small>' + esc(food.brand) + ' · ' + qualityLabel(food) + '</small><em>' + amount + '</em></span><b>＋</b></button>';
}

function paintOffSection() {
  const box = $("searchResults");
  if (!box || !offQueryActive()) return;
  let section = $("offResults");
  if (!section) {
    section = document.createElement("div");
    section.id = "offResults";
  }
  box.appendChild(section);
  if (!offRows) {
    section.innerHTML = '<p class="filter-note" id="offWait">Шукаю у фасованих продуктах…</p>';
    const query = catalogFilter.query;
    const brand = catalogFilter.brand;
    const category = catalogFilter.category;
    loadOffPack().then(() => {
      if (catalogFilter.query === query && catalogFilter.brand === brand && catalogFilter.category === category) paintOffSection();
    }).catch(() => {
      const wait = $("offWait");
      if (wait) wait.textContent = "Фасовану базу зараз не вдалося відкрити. Звичайні продукти й страви нижче лишаються доступними.";
    });
    return;
  }
  if (!catalogFilter.offPage) catalogFilter.offPage = 8;
  const shown = collectOff(catalogFilter.offPage + 1);
  const more = shown.length > catalogFilter.offPage;
  const visible = more ? shown.slice(0, catalogFilter.offPage) : shown;
  const countNote = $("catalogCount");
  if (countNote && visible.length) {
    const current = countNote.textContent || "";
    if (!current.includes("фасован")) countNote.textContent = current + " · фасовані з етикеток: " + (more ? catalogFilter.offPage + "+" : String(visible.length));
  }
  section.innerHTML = visible.length
    ? '<p class="filter-note">Далі в цьому ж списку — продукти з упаковок. Цифри з етикетки, тож звір свою пачку.</p>' + visible.map(offButton).join("") + (more ? '<button class="btn ghost full" data-action="off-more">Ще продукти з упаковок ↓</button>' : "")
    : (catalogFilter.brand === "off" ? '<div class="empty">У фасованій базі немає такого збігу.</div>' : "");
}

const baseCatalogueSearch = catalogueSearch;
catalogueSearch = function (q = "") {
  baseCatalogueSearch(q);
  catalogFilter.offPage = 8;
  const extra = typeof OFF_PACK_COUNT === "number" ? OFF_PACK_COUNT : 0;
  const baseCount = sourceFoods().length + commonFoods().length + genericFoods().length;
  if (extra && $("modalEyebrow")) $("modalEyebrow").textContent = "ЇЖА / " + num(baseCount + extra) + " ВАРІАНТІВ";
  const brand = $("catalogBrand");
  const option = brand && [...brand.options].find(item => item.value === "off");
  if (option) option.textContent = "З упаковки";
  const cover = document.querySelector("#modalBody .catalog-coverage");
  if (cover && extra && !cover.dataset.off) {
    cover.dataset.off = "1";
    cover.insertAdjacentHTML("beforeend", " Плюс " + num(extra) + " фасованих продуктів Open Food Facts: шукай назву, бренд або штрихкод.");
  }
  paintOffSection();
};

const baseRenderCatalogResults = renderCatalogResults;
renderCatalogResults = function (q) {
  const previous = $("offResults");
  if (previous) previous.remove();
  baseRenderCatalogResults(q);
  paintOffSection();
  paintCatalogEmoji($("searchResults"));
};

const baseFoodById = foodById;
foodById = function (id) {
  const found = baseFoodById(id);
  if (found || !offRows || !String(id).startsWith("off-")) return found;
  const code = String(id).slice(4);
  const row = offRows.find(item => item[7] === code);
  return row ? offFood(row) : found;
};

actions["off-more"] = function () {
  catalogFilter.offPage = (catalogFilter.offPage || 8) + 20;
  paintOffSection();
};
