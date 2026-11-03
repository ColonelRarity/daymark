/* One diary. One way in.
   The diary screen shows the chosen date and all meals at once. "Додати" opens one sheet for
   that meal: the search field is focused, results appear from the first letters, a tapped
   product opens its card in the same sheet, "Додати" writes the item into the day right away,
   and the sheet returns to search for the next product. "Готово" only closes the sheet.
   Every confirmed product is already saved. */

const DIARY_MEALS = [
  ["breakfast", "Сніданок", "☀"],
  ["lunch", "Обід", "◒"],
  ["dinner", "Вечеря", "☾"],
  ["snack", "Перекус", "🍎"],
  ["drink", "Напої", "☕"]
];
const DIARY_RECENT_LIMIT = 24;

/* Ukrainian, Russian spellings, and cooking words that people actually type. Each group is
   interchangeable: any member in the query matches any member in the name. */
const DIARY_SYNONYMS = [
  ["помідор", "томат", "помидор", "помідори", "томати", "помидоры"],
  ["курка", "куряч", "курица", "куриц", "курин", "курят"],
  ["сир кисломолочний", "творог", "кисломолочний сир"],
  ["сир", "сыр"],
  ["філадельфі", "филадельфи", "philadelphia", "філа"],
  ["варен", "варён", "отварн", "відварн", "відварен", "отварен"],
  ["чипси", "чіпси", "чипсы", "chips"],
  ["смажен", "жарен", "жарк"],
  ["запечен", "запечён", "в духовці"],
  ["тушкован", "тушен", "тушён"],
  ["яйце", "яйцо", "яйця", "яйца", "яєчн", "яичн"],
  ["хліб", "хлеб", "батон"],
  ["олія", "масло рослинн", "подсолнечное масло", "олива", "растительное масло"],
  ["вершкове масло", "сливочное масло", "масло вершкове"],
  ["кава", "кофе", "coffee", "еспресо", "американо"],
  ["молоко", "молочко", "milk"],
  ["йогурт", "yogurt", "йогурт"],
  ["огірок", "огурец", "огірки", "огурцы"],
  ["картопля", "картошка", "картофель", "картопл"],
  ["гречка", "гречнев", "гречан"],
  ["вівсян", "овсян", "вівсянка", "овсянка", "геркулес"],
  ["рис", "рисов"],
  ["яловичина", "говядина", "ялович", "говяж"],
  ["свинина", "свин"],
  ["індичка", "индейка", "індич", "индюш"],
  ["риба", "рыба", "рибн", "рыбн"],
  ["лосось", "сьомга", "семга", "лосос"],
  ["креветк", "кревет"],
  ["банан", "banana"],
  ["яблуко", "яблоко", "яблук", "яблок"],
  ["цукор", "сахар"],
  ["вода", "water"],
  ["сік", "сок", "фреш"],
  ["пиво", "beer"],
  ["вино", "wine"],
  ["борщ", "борщик"],
  ["суп", "супчик", "юшка"],
  ["каша", "кашка"],
  ["салат", "салатик"],
  ["бутерброд", "сендвіч", "сэндвич", "сандвіч", "тост"],
  ["печиво", "печенье", "крекер"],
  ["шоколад", "chocolate"],
  ["морозиво", "мороженое"],
  ["сметана", "сметанка"],
  ["кефір", "кефир"],
  ["ряжанка", "ряженка"],
  ["сосиск", "сардельк"],
  ["ковбас", "колбас"],
  ["макарон", "паста", "спагеті", "спагетти", "локшин", "лапша"],
  ["пельмен", "варени"],
  ["котлет", "биточ", "тефтел"],
  ["омлет", "яєчня", "яичница"],
  ["сирник", "сырник"],
  ["млинц", "блин", "блинчик", "налисник"],
  ["печінк", "печень", "печен"]
];

function diaryNormalize(text) {
  return foodSearchText(text).replace(/ґ/g, "г").replace(/\s+/g, " ").trim();
}

/* A query term becomes a group: the term itself and its listed synonyms carry full weight,
   the looser OFF_SYN mapping (e.g. творог → сир) only helps when nothing better matches. */
function diaryTermGroup(term) {
  const groups = DIARY_SYNONYMS.filter(group => group.some(word => word === term || (term.length >= 4 && word.length >= 4 && (word.startsWith(term) || term.startsWith(word)))));
  const strong = new Set([term]);
  groups.forEach(group => group.forEach(word => strong.add(word)));
  const weak = new Set();
  if (typeof OFF_SYN !== "undefined" && OFF_SYN[term] && !strong.has(OFF_SYN[term])) weak.add(OFF_SYN[term]);
  const words = [...strong, ...weak];
  words.strong = [...strong];
  words.weak = [...weak];
  return words;
}

function diaryEditDistanceLE1(a, b) {
  if (a === b) return true;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0, j = 0, edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) { i++; j++; continue; }
    if (edits) return false;
    edits = 1;
    if (a.length > b.length) i++;
    else if (a.length < b.length) j++;
    else { i++; j++; }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

const diaryHayCache = new WeakMap();
function diaryHaystack(food) {
  let hay = diaryHayCache.get(food);
  if (!hay) { hay = diaryNormalize([food.name, food.originalName, food.brand, food.aliases].filter(Boolean).join(" ")); diaryHayCache.set(food, hay); }
  return hay;
}

function diaryMatches(food, groups, fuzzy) {
  const hay = diaryHaystack(food);
  return groups.every(group => {
    if (group.some(word => hay.includes(word))) return true;
    if (!fuzzy) return false;
    const term = group[0];
    if (term.length < 5) return false;
    return hay.split(/[\s,.()/-]+/).some(word => word.length >= 4 && diaryEditDistanceLE1(word, term));
  });
}

function diaryKind(food) {
  if (food.quality === "user") return "mine";
  if (food.recipeId || food.quality === "recipe") return "recipe";
  if (["restaurant", "restaurant-estimate"].includes(food.quality)) return "place";
  if (food.quality === "generic-estimate") return "dish";
  return "product";
}

function diaryKindLabel(food) {
  const kind = diaryKind(food);
  if (kind === "dish" && FoodSchema.prep(food) !== "dish") return "продукт"; // halva or kysil is a typical-recipe card, but not a "ready dish"
  return { mine: "мій продукт", recipe: "рецепт Daymark", place: "заклад", dish: "готова страва", product: "продукт" }[kind];
}

/* Confidence and preparation come from the shared card schema (food-schema.js). */
function diaryConfidence(food) {
  const c = FoodSchema.confidence(food);
  return [c.label, c.note, c.level];
}

function diaryPrepState(food) {
  return { raw: "у сирому вигляді", cooked: "у готовому вигляді", dry: "у сухому вигляді", dish: "готова страва" }[FoodSchema.prep(food)] || "";
}

function diaryScore(food, query, groups) {
  const name = diaryNormalize(food.name);
  const words = name.split(/[\s,()./-]+/).filter(Boolean);
  let score = 0;
  if (name === query) score += 1000;
  else {
    // Best match per term group: exact word > name starts with it > a word starts with it > appears inside > weak synonym.
    groups.forEach((group, index) => {
      let best = 0;
      group.strong.forEach(word => {
        let value = 0;
        if (words[0] === word) value = 700;
        else if (name.startsWith(word)) value = 600;
        else if (words.includes(word)) value = 560;
        else if (words.some(part => part.startsWith(word))) value = 450;
        else if (name.includes(word)) value = 200;
        if (index === 0 && value >= 600) value += 50;
        if (word === group.strong[0] && value) value += 100; // the word the person actually typed beats its synonyms and the common-product bonus
        if (value > best) best = value;
      });
      if (!best) group.weak.forEach(word => { if (name.includes(word)) best = Math.max(best, words.some(part => part.startsWith(word)) ? 120 : 60); });
      score += best / (index + 1);
    });
  }
  const kind = diaryKind(food);
  score += { mine: 180, product: 120, dish: 80, recipe: 60, place: 20 }[kind] || 0;
  if (food.quality === "common-product") score += 40;
  if (food.quality === "label-community") score -= 30;
  if (food.localized === false || (!/[а-яіїєґ]/i.test(food.name))) score -= 60;
  score -= Math.min(60, name.length / 2);
  return score;
}

function diarySearch(query, limit) {
  const q = diaryNormalize(query);
  if (!q) return { list: [], fuzzy: false };
  const terms = q.split(" ").filter(Boolean);
  const groups = terms.map(diaryTermGroup);
  const foods = allFoods();
  let list = foods.filter(food => diaryMatches(food, groups, false));
  let fuzzy = false;
  if (list.length < 3) {
    const seen = new Set(list.map(food => food.id));
    foods.filter(food => !seen.has(food.id) && diaryMatches(food, groups, true)).forEach(food => list.push(food));
    fuzzy = list.length > 0;
  }
  const scored = list.map(food => [diaryScore(food, q, groups), food]);
  scored.sort((a, b) => b[0] - a[0]);
  return { list: scored.slice(0, limit || 40).map(pair => pair[1]), fuzzy, total: list.length };
}

/* ---------- which meal and which day ---------- */

let diary = { open: false, type: "breakfast", date: null, query: "", view: "search", food: null, item: null, offBusy: false };

function diaryTypeForNow() {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 21) return "dinner";
  return "snack";
}

function diaryItems(type, date) {
  const entry = state.logs[date || diary.date];
  return entry && Array.isArray(entry.meals) ? entry.meals.filter(meal => meal.type === type) : [];
}

function diarySum(items) {
  return items.reduce((acc, meal) => {
    if (meal.kcal === null || meal.kcal === undefined) acc.missing++;
    else acc.kcal += Number(meal.kcal) || 0;
    ["p", "f", "c"].forEach(key => { acc[key] += Number(meal[key] || 0); });
    return acc;
  }, { kcal: 0, p: 0, f: 0, c: 0, missing: 0 });
}

function diaryFmt(value, digits) {
  if (value === null || value === undefined) return "—";
  return num(value, digits || 0);
}

/* Drinks are measured in millilitres. Reference tables list them per 100 g; for water-based
   drinks the two are the same within the precision we show. */
function diaryIsLiquid(food) {
  return !!food && (food.unit === "ml" || food.category === "drinks");
}
function diaryUnit(food) {
  return diaryIsLiquid(food) ? "мл" : "г";
}

/* ---------- the diary screen ---------- */

function diaryMealSection(type, name, icon) {
  const items = diaryItems(type, selectedDate);
  const sum = diarySum(items);
  const rows = items.map(meal => '<button class="diary-row" data-action="diary-edit" data-id="' + meal.id + '" data-type="' + type + '"><span class="diary-row-visual">' + (meal.photo ? '<img src="' + meal.photo + '" alt="">' : esc(meal.emoji || "◌")) + '</span><span class="diary-row-text"><b>' + esc(meal.name) + '</b><small>' + num(meal.grams) + ' ' + (meal.unit === "ml" ? "мл" : "г") + (meal.fatAddon ? ' · + ' + num(meal.fatAddon.grams) + ' г ' + esc(FAT_ADDONS[meal.fatAddon.type] ? FAT_ADDONS[meal.fatAddon.type].short : "олії") : "") + '</small></span><span class="diary-row-kcal">' + (meal.kcal === null ? "—" : num(meal.kcal)) + '<small>ккал</small></span></button>').join("");
  const yesterday = diaryItems(type, offset(selectedDate, -1));
  const repeat = !items.length && yesterday.length ? '<button class="diary-repeat" data-action="diary-repeat" data-type="' + type + '">↺ Повторити вчорашній ' + name.toLowerCase() + ' · ' + yesterday.length + ' ' + (yesterday.length === 1 ? "продукт" : yesterday.length < 5 ? "продукти" : "продуктів") + '</button>' : "";
  return '<section class="diary-meal" data-meal="' + type + '"><div class="diary-meal-head"><span class="diary-meal-icon">' + icon + '</span><div><h3>' + name + '</h3><small>' + (items.length ? num(sum.kcal) + ' ккал · Б ' + num(sum.p) + ' · Ж ' + num(sum.f) + ' · В ' + num(sum.c) + (sum.missing ? ' · ' + sum.missing + ' без оцінки' : "") : "Ще порожньо") + '</small></div><button class="diary-add" data-action="diary-open" data-type="' + type + '" aria-label="Додати до: ' + name + '">＋</button></div>' + rows + repeat + '</section>';
}

function diaryDaySummary() {
  const sum = totals(selectedDate);
  const energy = typeof dayEnergy === "function" ? dayEnergy(selectedDate) : { target: Number(state.settings.calories) || 0, extra: 0, note: "" };
  const target = energy.target || 0;
  const left = target ? target - sum.kcal : null;
  const ratio = target ? Math.min(100, Math.round(sum.kcal / target * 100)) : 0;
  return '<section class="diary-summary"><div class="diary-summary-main"><div><span>З’їдено</span><strong>' + num(sum.kcal) + '<small> ккал</small></strong></div><div class="diary-summary-target">' + (target ? '<span>' + (left >= 0 ? "Лишається" : "Понад орієнтир") + '</span><strong>' + num(Math.abs(left)) + '<small> ккал</small></strong>' : '<span>Орієнтир</span><button data-action="plan">Порахувати ↗</button>') + '</div></div><div class="diary-bar"><i style="width:' + ratio + '%"></i></div><div class="diary-summary-foot"><span>Б ' + num(sum.p) + ' г · Ж ' + num(sum.f) + ' г · В ' + num(sum.c) + ' г</span>' + (target ? '<button data-action="plan">' + num(target) + ' ккал' + (energy.extra ? ' · +' + num(energy.extra) + ' за рух' : "") + ' ↗</button>' : "") + '</div>' + (sum.missing ? '<p class="diary-note">Без оцінки: ' + sum.missing + ' ' + (sum.missing === 1 ? "запис" : "записи") + '. Підсумок неповний.</p>' : "") + '</section>';
}

function diaryWaterPanel() {
  const entry = log(selectedDate);
  return '<section class="diary-water"><div><b>Вода</b><small>' + num(entry.water * 0.25, 2) + ' л · одна позначка 250 мл</small></div><div class="diary-water-dots">' + Array.from({ length: 8 }, (_, i) => '<button class="' + (i < entry.water ? "on" : "") + '" data-action="water-set" data-value="' + (i + 1) + '" aria-label="' + (i + 1) + ' склянок">' + icon("water") + '</button>').join("") + '</div></section>';
}

foodView = function () {
  const entry = state.logs[selectedDate];
  const empty = !entry || !entry.meals || !entry.meals.length;
  return pageTop("Щоденник", "ХАРЧУВАННЯ / " + (selectedDate === today() ? "СЬОГОДНІ" : fdate(selectedDate, true).toUpperCase()), dateControl())
    + diaryDaySummary()
    + (typeof coachTeaser === "function" ? coachTeaser() : "")
    + '<div class="diary-meals">' + DIARY_MEALS.map(([type, name, iconText]) => diaryMealSection(type, name, iconText)).join("") + '</div>'
    + (empty ? '<p class="diary-hint">Натисни ＋ біля прийому. Пошук відкриється одразу, кожен доданий продукт зберігається сам.</p>' : "")
    + diaryWaterPanel()
    + '<div class="diary-links"><button data-view="recipes">🍳 Ідеї, що приготувати ↗</button><button data-action="photo">📷 Фото тарілки ↗</button><button data-action="label">▤ За етикеткою ↗</button></div>'
    + (state.settings.fasting ? fastingCard() : "")
    + '<p class="note bottom-space">Орієнтир — не ліміт. Рух не додається до їжі автоматично; одна цифра дня вже враховує його там, де є підстава.</p>';
};

/* ---------- the meal sheet ---------- */

function diaryOpen(type, date) {
  diary = { open: true, type: DIARY_MEALS.some(([id]) => id === type) ? type : diaryTypeForNow(), date: date || selectedDate, query: "", view: "search", food: null, item: null, offBusy: false };
  modalData = { mode: "diary" };
  diaryPaint();
}

function diaryClose() {
  diary.open = false;
  $("modal").classList.remove("diary-sheet");
  if ($("modal").open) $("modal").close();
  modalData = {};
  if (currentView !== "food") navigate("food"); else render();
}

function diaryName(type) {
  return (DIARY_MEALS.find(([id]) => id === type) || DIARY_MEALS[0])[1];
}

function diaryRecent() {
  const seen = new Set();
  const out = [];
  const dates = Object.keys(state.logs).sort().reverse().slice(0, 60);
  for (const date of dates) {
    for (const meal of (state.logs[date].meals || []).slice().reverse()) {
      const key = (meal.foodRef && meal.foodRef.id) || diaryNormalize(meal.name);
      if (seen.has(key) || meal.source === "demo") continue;
      seen.add(key);
      out.push(meal);
      if (out.length >= DIARY_RECENT_LIMIT) return out;
    }
  }
  return out;
}

function diaryItemButton(meal, action) {
  return '<button class="diary-result" data-action="' + action + '" data-id="' + meal.id + '"><span class="diary-result-visual">' + esc(meal.emoji || "◌") + '</span><span class="diary-result-text"><b>' + esc(meal.name) + '</b><small>' + num(meal.grams) + ' ' + (meal.unit === "ml" ? "мл" : "г") + ' · ' + (meal.kcal === null ? "без оцінки" : num(meal.kcal) + " ккал") + '</small></span><b class="diary-result-add">＋</b></button>';
}

function diaryFoodButton(food) {
  const per = food.unit === "portion" ? "порція" : "100 " + diaryUnit(food);
  const conf = diaryConfidence(food);
  const kcal = food.kcal === null || food.kcal === undefined ? "—" : num(food.kcal);
  const kind = diaryKind(food);
  return '<button class="diary-result" data-action="diary-pick" data-id="' + food.id + '"><span class="diary-result-visual">' + esc(food.emoji || "◌") + '</span><span class="diary-result-text"><b>' + esc(food.name) + '</b><small>' + esc(diaryKindLabel(food)) + (kind !== "mine" && food.brand && food.brand !== "Звичайний продукт" && food.brand !== "Універсальний довідник страв" ? ' · ' + esc(food.brand) : "") + ' · <i class="conf-' + conf[2] + '">' + esc(conf[0]) + '</i></small></span><span class="diary-result-kcal">' + kcal + '<small>ккал / ' + per + '</small></span></button>';
}

function diaryHome() {
  const items = diaryItems(diary.type, diary.date);
  const sum = diarySum(items);
  const list = items.length
    ? '<section class="diary-sheet-items"><div class="diary-sheet-items-head"><b>У цьому прийомі · ' + items.length + '</b><span>' + num(sum.kcal) + ' ккал · Б ' + num(sum.p) + ' · Ж ' + num(sum.f) + ' · В ' + num(sum.c) + '</span></div>' + items.map(meal => '<button class="diary-row" data-action="diary-edit-sheet" data-id="' + meal.id + '"><span class="diary-row-visual">' + esc(meal.emoji || "◌") + '</span><span class="diary-row-text"><b>' + esc(meal.name) + '</b><small>' + num(meal.grams) + ' ' + (meal.unit === "ml" ? "мл" : "г") + ' · Б ' + diaryFmt(meal.p) + ' · Ж ' + diaryFmt(meal.f) + ' · В ' + diaryFmt(meal.c) + '</small></span><span class="diary-row-kcal">' + (meal.kcal === null ? "—" : num(meal.kcal)) + '<small>ккал</small></span></button>').join("") + '</section>'
    : "";
  const yesterday = diaryItems(diary.type, offset(diary.date, -1));
  const repeat = yesterday.length && !items.length ? '<button class="diary-repeat" data-action="diary-repeat" data-type="' + diary.type + '">↺ Повторити вчорашній ' + diaryName(diary.type).toLowerCase() + ' · ' + yesterday.length + ' продукт' + (yesterday.length === 1 ? "" : yesterday.length < 5 ? "и" : "ів") + '</button>' : "";
  const recent = diaryRecent();
  const favorites = state.favorites || [];
  const mine = state.customFoods || [];
  const chips = [["курка", "🍗"], ["яйце", "🥚"], ["сир", "🧀"], ["каша", "🌾"], ["овочі", "🥦"], ["хліб", "🍞"], ["кава", "☕"], ["суп", "🍲"], ["салат", "🥗"], ["фрукти", "🍎"]];
  return list + repeat
    + (diary.type === "drink" ? '<button class="diary-tool" data-action="drink-builder"><span>☕</span><b>Зібрати напій за складом</b><small>кава з молоком, чай, вино — за мл</small></button>' : "")
    + '<div class="diary-chips">' + chips.map(([q, i]) => '<button data-action="diary-query" data-value="' + q + '">' + i + ' ' + q + '</button>').join("") + '</div>'
    + (recent.length ? '<h4>Недавнє</h4>' + recent.slice(0, 12).map(meal => diaryItemButton(meal, "diary-recent")).join("") : "")
    + (favorites.length ? '<h4>Улюблене</h4>' + favorites.slice(0, 12).map(meal => diaryItemButton(meal, "diary-favorite")).join("") : "")
    + (mine.length ? '<h4>Мої продукти</h4>' + mine.slice().reverse().slice(0, 12).map(diaryFoodButton).join("") : "")
    + '<button class="diary-tool" data-action="diary-custom"><span>＋</span><b>Свій продукт</b><small>за етикеткою або меню, на 100 г чи мл</small></button>'
    + (!recent.length && !favorites.length ? '<p class="diary-note">Недавнє й улюблене з’являться після перших записів.</p>' : "");
}

function diaryResults() {
  const found = diarySearch(diary.query, 40);
  const list = found.list;
  let html = "";
  if (!list.length) {
    html = '<div class="diary-empty"><b>Нічого не знайшли для «' + esc(diary.query) + '».</b><p>Спробуй коротше слово або інше написання: «курка варена», «помідор», «сир 5%».</p><button class="btn blue full" data-action="diary-custom">＋ Створити свій продукт «' + esc(diary.query.trim().slice(0, 60)) + '»</button></div>';
    const terms = diaryNormalize(diary.query).split(" ").filter(term => term.length >= 3).sort((a, b) => b.length - a.length);
    if (terms.length > 1) {
      const partial = diarySearch(terms[0], 8);
      if (partial.list.length) html += '<h4>Схоже за словом «' + esc(terms[0]) + '»</h4>' + partial.list.map(diaryFoodButton).join("");
    }
  } else {
    html = (found.fuzzy ? '<p class="diary-note">Схоже на те, що ти шукаєш. Перевір назву.</p>' : "") + list.map(diaryFoodButton).join("") + (found.total > list.length ? '<p class="diary-note">Показано ' + list.length + ' з ' + found.total + '. Уточни запит.</p>' : "");
  }
  return html + '<div id="diaryOff"></div>';
}

function diaryPaintOff() {
  if (!diary.open || diary.view !== "search" || !diary.query.trim()) return;
  const box = $("diaryOff");
  if (!box || typeof loadOffPack !== "function") return;
  const query = diary.query;
  const previous = catalogFilter.query;
  catalogFilter.query = query;
  catalogFilter.brand = "all";
  catalogFilter.category = "all";
  if (!offRows) {
    box.innerHTML = diaryPresent('<p class="diary-note">Шукаю ще у фасованих продуктах…</p>');
    loadOffPack().then(() => { if (diary.query === query) diaryPaintOff(); }).catch(() => { if ($("diaryOff")) $("diaryOff").innerHTML = diaryPresent('<p class="diary-note">Фасовану базу зараз не відкрити. Звичайні продукти вище доступні.</p>'); });
    catalogFilter.query = previous;
    return;
  }
  const rows = collectOff(12);
  catalogFilter.query = previous;
  if (!rows.length) { box.innerHTML = ""; return; }
  box.innerHTML = diaryPresent('<h4>З упаковок · Open Food Facts</h4>' + rows.map(row => diaryFoodButton(offFood(row))).join(""));
}

function diaryPresent(html) {
  return typeof present === "function" ? present(html) : html;
}

/* product card: 100 g vs portion, g vs ml, raw vs cooked, oil already inside vs added on top */
function diaryCard() {
  const food = diary.food;
  const item = diary.item;
  const base = item ? (diary.base || diaryBaseOf(item)) : { kcal: food.kcal, p: food.p, f: food.f, c: food.c };
  const unit = item ? (item.unit === "ml" ? "мл" : "г") : (food.unit === "portion" ? "порц." : diaryUnit(food));
  const serving = item ? item.grams : (food.unit === "portion" ? 1 : (food.serving || 100));
  const name = item ? item.name : food.name;
  const conf = item ? (item.foodRef ? diaryConfidence({ quality: item.foodRef.quality }) : ["Внесено вручну", "твої цифри", "mid"]) : diaryConfidence(food);
  const prep = item ? "" : diaryPrepState(food);
  const estimate = !item && food && ["common-product", "generic-estimate"].includes(food.quality);
  const servingWord = !item && food && food.serving && food.serving !== 100 ? (food.servingLabel || diaryServingWord(food)) : "";
  const presets = food && food.unit === "portion"
    ? [[0.5, "½ порції"], [1, "1 порція"], [2, "2 порції"]]
    : [[Math.round(serving * 0.5), "½ · " + num(Math.round(serving * 0.5)) + " " + unit], [serving, (servingWord ? "1 " + servingWord : "1×") + " · " + num(serving) + " " + unit], [serving * 2, (servingWord ? "2 " + diaryServingPlural(servingWord) : "2×") + " · " + num(serving * 2) + " " + unit]];
  const fat = item && item.fatAddon;
  const digits = conf[2] === "high" ? 1 : 0;
  return '<div class="diary-card"><button class="diary-back" data-action="diary-back">← Назад до пошуку</button>'
    + '<div class="diary-card-head"><span class="diary-card-visual">' + esc((item && item.emoji) || (food && food.emoji) || "◌") + '</span><div><h3>' + esc(name) + '</h3><small>' + (item ? "запис у прийомі" : esc(diaryKindLabel(food)) + (food.brand && food.brand !== "Звичайний продукт" ? " · " + esc(food.brand) : "")) + '</small></div></div>'
    + '<div class="diary-card-tags"><span class="conf-' + conf[2] + '">' + esc(conf[0]) + '</span>' + (prep ? '<span>' + prep + '</span>' : "") + '<span>' + (unit === "мл" ? "мілілітри" : unit === "порц." ? "порції" : "грами") + '</span>' + (food && food.barcode ? '<span>штрихкод ' + esc(food.barcode) + '</span>' : "") + '</div>'
    + '<p class="diary-note">' + esc(conf[1]) + (estimate ? ". Діапазон: " + num(food.estimateLow) + "–" + num(food.estimateHigh) + " ккал на 100 " + diaryUnit(food) : "") + '.</p>'
    + '<div class="diary-amount"><label>Скільки, ' + unit + '<input id="diaryGrams" type="number" inputmode="decimal" min="0.1" max="10000" step="any" value="' + esc(String(serving)) + '"></label><div class="diary-presets">' + presets.map(([value, label]) => '<button type="button" data-action="diary-preset" data-value="' + value + '">' + label + '</button>').join("") + '</div></div>'
    + '<div class="diary-card-grid"><div><span>На 100 ' + (unit === "порц." ? "г" : unit) + (food && food.unit === "portion" ? " / порцію" : "") + '</span><b>' + diaryFmt(base.kcal) + ' ккал</b><small>Б ' + diaryFmt(base.p, digits) + ' · Ж ' + diaryFmt(base.f, digits) + ' · В ' + diaryFmt(base.c, digits) + '</small></div><div class="diary-portion"><span>Твоя порція</span><b id="diaryPortionKcal">—</b><small id="diaryPortionMacros"></small></div></div>'
    + '<details class="diary-oil" ' + (fat ? "open" : "") + '><summary>' + (fat ? "Олія або масло зверху · " + num(fat.grams) + " г" : "＋ Олія або масло зверху") + '</summary><p class="diary-note">Лише те, що не враховано в продукті. У смаженому зі словом «смажене» олія вже всередині.</p><div class="diary-oil-row"><select id="diaryFatType">' + Object.entries(FAT_ADDONS).map(([key, value]) => '<option value="' + key + '" ' + ((fat ? fat.type : "sunflower") === key ? "selected" : "") + '>' + value.name + '</option>').join("") + '</select><input id="diaryFatGrams" type="number" inputmode="decimal" min="0" max="200" step="0.5" value="' + (fat ? fat.grams : 0) + '" aria-label="Грамів олії"></label></div><div class="diary-presets small">' + [[0, "немає"], [3, "тонкий шар"], [5, "1 ч. л."], [10, "2 ч. л."], [14, "1 ст. л."]].map(([g, label]) => '<button type="button" data-action="diary-fat-preset" data-value="' + g + '">' + label + '</button>').join("") + '</div></details>'
    + (item ? '<div class="diary-card-actions"><button class="btn blue full" data-action="diary-save-item">Зберегти зміни</button><button class="text-btn full" data-action="diary-delete-item">Видалити з прийому</button></div>'
      : '<div class="diary-card-actions"><button class="btn blue full" data-action="diary-add-item">＋ Додати до: ' + diaryName(diary.type).toLowerCase() + '</button></div>')
    + (food && food.url ? '<a class="diary-source" href="' + esc(food.url) + '" target="_blank" rel="noopener">Джерело ↗</a>' : "")
    + '</div>';
}

function diaryServingWord(food) {
  const name = diaryNormalize(food.name);
  if (/^яйце|^яйця/.test(name)) return "шт";
  if (/^(банан|яблуко|груша|апельсин|мандарин|ківі|персик|слива|хурма|авокадо|огірок|помідор|картопля|морква|цибуля|перець)/.test(name) && !/сік|пюре|сушен/.test(name)) return "шт";
  if (/^(кава|еспресо|американо|капучино|лате|чай|какао)/.test(name)) return "чашка";
  return "";
}

/* "2 скибки", "2 чашки": the form after 2–4 for the serving words the cards use. */
function diaryServingPlural(word) {
  const fixed = { "шт": "шт", "столова ложка": "столові ложки", "чайна ложка": "чайні ложки", "шматочок": "шматочки", "огірок": "огірки", "скуп": "скупи", "шот": "шоти", "бублик": "бублики", "пряник": "пряники", "сирок": "сирки", "чебурек": "чебуреки", "дерун": "деруни", "млинець": "млинці" };
  if (fixed[word]) return fixed[word];
  if (/ка$/.test(word)) return word.replace(/ка$/, "ки");
  if (/ця$/.test(word)) return word.replace(/ця$/, "ці");
  if (/ія$/.test(word)) return word.replace(/ія$/, "ії");
  if (/а$/.test(word)) return word.replace(/а$/, "и");
  return word;
}

function diaryBaseOf(item) {
  const grams = Number(item.grams) || 0;
  const src = item.baseNutrition || item;
  const factor = grams > 0 ? 100 / grams : 0;
  const per = key => src[key] === null || src[key] === undefined ? null : Math.round(src[key] * factor * 100) / 100;
  return { kcal: per("kcal"), p: per("p"), f: per("f"), c: per("c") };
}

function diaryPortion() {
  const grams = Number(($("diaryGrams") || {}).value) || 0;
  const food = diary.food;
  const item = diary.item;
  const base = item ? (diary.base || diaryBaseOf(item)) : { kcal: food.kcal, p: food.p, f: food.f, c: food.c };
  const factor = food && food.unit === "portion" && !item ? grams : grams / 100;
  const fatType = ($("diaryFatType") || {}).value || "sunflower";
  const fatGrams = Number(($("diaryFatGrams") || {}).value) || 0;
  const fat = FAT_ADDONS[fatType] || FAT_ADDONS.sunflower;
  const result = {};
  ["kcal", "p", "f", "c"].forEach(key => { result[key] = base[key] === null || base[key] === undefined ? null : round(base[key] * factor); });
  const addon = fatGrams > 0 ? { type: fatType, method: "added", grams: round(fatGrams), kcal: round(fat.kcal * fatGrams / 100), f: round(fat.f * fatGrams / 100) } : null;
  if (addon) {
    if (result.kcal !== null) result.kcal = round(result.kcal + addon.kcal);
    if (result.f !== null) result.f = round(result.f + addon.f);
  }
  return { grams, base: Object.fromEntries(["kcal", "p", "f", "c"].map(key => [key, base[key] === null || base[key] === undefined ? null : round(base[key] * factor)])), result, addon };
}

function diaryPaintPortion() {
  const out = $("diaryPortionKcal");
  if (!out) return;
  const portion = diaryPortion();
  const food = diary.food;
  const estimate = food && ["common-product", "generic-estimate"].includes(food.quality) && !diary.item;
  if (estimate && portion.grams > 0) {
    const low = food.estimateLow * portion.grams / 100 + (portion.addon ? portion.addon.kcal : 0);
    const high = food.estimateHigh * portion.grams / 100 + (portion.addon ? portion.addon.kcal : 0);
    out.textContent = diaryPresent(num(low) + "–" + num(high) + " ккал");
  } else out.textContent = diaryPresent(portion.result.kcal === null ? "без оцінки" : num(portion.result.kcal) + " ккал");
  $("diaryPortionMacros").textContent = diaryPresent("Б " + diaryFmt(portion.result.p) + " · Ж " + diaryFmt(portion.result.f) + " · В " + diaryFmt(portion.result.c) + (portion.addon ? " · олія " + num(portion.addon.grams) + " г" : ""));
}

function diaryPaint() {
  if (!diary.open) return;
  const head = '<div class="diary-sheet-head"><div><span class="tiny-cap">' + esc(fdate(diary.date, true)) + '</span><div class="diary-type-row">' + DIARY_MEALS.map(([type, name]) => '<button class="' + (diary.type === type ? "on" : "") + '" data-action="diary-type" data-type="' + type + '">' + name + '</button>').join("") + '</div></div><button class="diary-done" data-action="diary-done">Готово</button></div>';
  const search = '<label class="diary-search"><span aria-hidden="true">' + icon("search") + '</span><input id="diarySearch" type="search" autocomplete="off" autocorrect="off" spellcheck="false" enterkeyhint="search" placeholder="Продукт, страва або напій…" aria-label="Пошук продукту" value="' + esc(diary.query) + '">' + (diary.query ? '<button type="button" data-action="diary-clear" aria-label="Очистити">×</button>' : "") + '</label>';
  const body = diary.view === "card" ? diaryCard() : diary.view === "custom" ? diaryCustomForm() : (diary.query.trim() ? diaryResults() : diaryHome());
  const html = '<div class="diary-sheet-shell">' + head + (diary.view === "card" || diary.view === "custom" ? "" : search) + '<div class="diary-sheet-body" id="diaryBody">' + body + '</div></div>';
  openModal("ЩОДЕННИК / " + diaryName(diary.type).toUpperCase(), html);
  $("modal").classList.add("diary-sheet");
  const input = $("diarySearch");
  if (input) {
    input.oninput = () => {
      diary.query = input.value;
      const bodyBox = $("diaryBody");
      if (bodyBox) bodyBox.innerHTML = diaryPresent(diary.query.trim() ? diaryResults() : diaryHome());
      diaryPaintOff();
      diaryPaintClear(input);
    };
    input.onkeydown = event => { if (event.key === "Enter") { event.preventDefault(); const first = document.querySelector('#diaryBody [data-action="diary-pick"]'); if (first) first.click(); } };
    if (diary.view === "search") setTimeout(() => { try { input.focus({ preventScroll: true }); } catch (error) { input.focus(); } }, 30);
    diaryPaintOff();
  }
  if (diary.view === "card") {
    const grams = $("diaryGrams");
    const paint = () => diaryPaintPortion();
    ["diaryGrams", "diaryFatGrams", "diaryFatType"].forEach(id => { const el = $(id); if (el) { el.oninput = paint; el.onchange = paint; } });
    paint();
    setTimeout(() => { if (grams) { grams.focus(); grams.select(); } }, 30);
  }
  if (diary.view === "custom") setTimeout(() => { const first = document.querySelector("#diaryCustom input[name=name]"); if (first) first.focus(); }, 30);
}

function diaryPaintClear(input) {
  const label = input.closest(".diary-search");
  if (!label) return;
  let clear = label.querySelector("[data-action=diary-clear]");
  if (input.value && !clear) {
    clear = document.createElement("button");
    clear.type = "button";
    clear.dataset.action = "diary-clear";
    clear.setAttribute("aria-label", "Очистити");
    clear.textContent = "×";
    label.appendChild(clear);
  } else if (!input.value && clear) clear.remove();
}

/* custom product, created from the search that found nothing */
function diaryCustomForm() {
  const guess = diary.query.trim().slice(0, 140);
  return '<div class="diary-card"><button class="diary-back" data-action="diary-back">← Назад до пошуку</button><h3>Свій продукт</h3><p class="diary-note">Цифри з етикетки або меню, на 100 г чи 100 мл. Невідоме лиши порожнім — ми не підставимо нуль.</p><form id="diaryCustom"><label class="form-label">Назва<input name="name" maxlength="140" required value="' + esc(guess) + '" placeholder="Продукт, страва або напій"></label><label class="form-label">Бренд або заклад<input name="brand" maxlength="80" placeholder="Необов’язково"></label><div class="form-pair"><label class="form-label">Одиниця<select name="unit"><option value="g">грами</option><option value="ml">мілілітри</option></select></label><label class="form-label">Звична порція<input name="serving" type="number" inputmode="decimal" min="0.1" max="10000" step="any" value="100" required></label></div><div class="form-pair"><label class="form-label">Ккал на 100<input name="kcal" type="number" inputmode="decimal" min="0" max="10000" step="any" required placeholder="з етикетки"></label><label class="form-label">Білки, г<input name="p" type="number" inputmode="decimal" min="0" max="100" step="any" placeholder="—"></label></div><div class="form-pair"><label class="form-label">Жири, г<input name="f" type="number" inputmode="decimal" min="0" max="100" step="any" placeholder="—"></label><label class="form-label">Вуглеводи, г<input name="c" type="number" inputmode="decimal" min="0" max="100" step="any" placeholder="—"></label></div><button class="btn blue full" type="submit">Зберегти і вказати порцію</button></form></div>';
}

function diarySaveCustom(form) {
  const v = Object.fromEntries(new FormData(form).entries());
  const name = String(v.name || "").trim();
  const kcal = Number(v.kcal);
  const serving = Number(v.serving);
  if (!name || !Number.isFinite(kcal) || kcal < 0 || kcal > 10000 || !Number.isFinite(serving) || serving <= 0) { toast("Перевір назву, калорії та порцію."); return; }
  state.customFoods = state.customFoods || [];
  if (state.customFoods.length >= 500) { toast("У власній базі вже 500 продуктів"); return; }
  const maybe = key => v[key] === "" || v[key] === undefined ? null : Number(v[key]);
  const food = FoodSchema.normalize({ id: "own-" + uid(), name, originalName: name, brand: String(v.brand || "").trim() || "Мій продукт", category: v.unit === "ml" ? "drinks" : "other", unit: v.unit === "ml" ? "ml" : "g", basis: 100, serving, kcal, p: maybe("p"), f: maybe("f"), c: maybe("c"), quality: "user", status: "checked", url: "", checked: today(), localized: true, emoji: v.unit === "ml" ? "🥤" : "◌" });
  const check = FoodSchema.validate(food);
  if (!check.ok) {
    const reason = check.errors.some(e => e.startsWith("kcal")) ? "Калорій на 100 г не буває більше за 900." : check.errors.includes("macros>100g") ? "Білки, жири й вуглеводи разом не можуть перевищувати 100 г." : "Перевір цифри: білки, жири й вуглеводи — від 0 до 100 г на 100 г.";
    toast(reason);
    return;
  }
  state.customFoods.push(food);
  persist();
  diary.food = food;
  diary.item = null;
  diary.view = "card";
  diaryPaint();
  toast(check.warnings.some(w => w.startsWith("atwater")) ? "Збережено. Ккал не сходяться з БЖВ — звір етикетку." : "Продукт у твоїй базі. Вкажи порцію.");
}

/* ---------- writing into the day ---------- */

function diaryMealFromFood(food, portion) {
  const meal = {
    id: uid(),
    name: food.name,
    type: diary.type,
    grams: portion.grams,
    unit: diaryIsLiquid(food) ? "ml" : "g",
    kcal: portion.result.kcal, p: portion.result.p, f: portion.result.f, c: portion.result.c,
    source: ["restaurant", "restaurant-estimate"].includes(food.quality) ? "restaurant" : food.quality === "user" ? "user-food" : food.quality === "label-community" ? "label" : "reference",
    emoji: food.emoji || "◌",
    foodRef: foodProvenance(food)
  };
  if (food.unit === "portion") { meal.unit = "g"; meal.foodRef.unit = "g"; }
  if (portion.addon) { meal.baseNutrition = portion.base; meal.fatAddon = portion.addon; }
  return meal;
}

function diaryCommit(meal) {
  const entry = log(diary.date);
  if (entry.meals.length >= 300) { toast("У цьому дні вже 300 записів"); return false; }
  entry.meals.push(meal);
  (entry.habits = entry.habits || {}).food = true;
  entry.nutritionComplete = false;
  const ok = persist();
  if (ok && window.DaymarkStore && window.DaymarkStore.available) window.DaymarkStore.flush();
  return ok;
}

function diaryAddItem() {
  if (!diary.food) return;
  const portion = diaryPortion();
  if (!(portion.grams > 0)) { toast("Вкажи кількість."); return; }
  const meal = diaryMealFromFood(diary.food, portion);
  if (!diaryCommit(meal)) return;
  diary.query = "";
  diary.food = null;
  diary.view = "search";
  diaryPaint();
  toast("✓ " + meal.name + " · " + num(meal.grams) + " " + (meal.unit === "ml" ? "мл" : "г") + " у прийомі «" + diaryName(diary.type) + "»");
}

function diaryRepeatYesterday(type) {
  const date = diary.open ? diary.date : selectedDate;
  const from = diaryItems(type, offset(date, -1));
  if (!from.length) return;
  const entry = log(date);
  if (entry.meals.length + from.length > 300) { toast("У цьому дні вже забагато записів"); return; }
  from.forEach(meal => { const copy = structuredClone(meal); copy.id = uid(); delete copy.photo; copy.type = type; entry.meals.push(copy); });
  (entry.habits = entry.habits || {}).food = true;
  entry.nutritionComplete = false;
  persist();
  toast("↺ Вчорашній " + diaryName(type).toLowerCase() + " повторено · " + from.length + " продукт" + (from.length === 1 ? "" : from.length < 5 ? "и" : "ів"));
  if (diary.open) diaryPaint(); else render();
}

function diaryEditOpen(id, date) {
  const entry = state.logs[date || diary.date || selectedDate];
  const item = entry && entry.meals.find(meal => meal.id === id);
  if (!item) return;
  if (!diary.open) diaryOpen(item.type, date || selectedDate);
  diary.item = item;
  diary.base = diaryBaseOf(item);
  diary.food = null;
  diary.view = "card";
  diaryPaint();
}

function diarySaveItem() {
  const item = diary.item;
  if (!item) return;
  const portion = diaryPortion();
  if (!(portion.grams > 0)) { toast("Вкажи кількість."); return; }
  item.grams = portion.grams;
  ["kcal", "p", "f", "c"].forEach(key => { item[key] = portion.result[key]; });
  delete item.baseNutrition;
  delete item.fatAddon;
  if (portion.addon) { item.baseNutrition = portion.base; item.fatAddon = portion.addon; }
  persist();
  diary.item = null;
  diary.view = "search";
  diaryPaint();
  toast("Запис оновлено");
}

function diaryDeleteItem() {
  const item = diary.item;
  if (!item) return;
  if (!confirm("Видалити «" + item.name + "» з прийому?")) return;
  const entry = log(diary.date);
  entry.meals = entry.meals.filter(meal => meal.id !== item.id);
  persist();
  diary.item = null;
  diary.view = "search";
  diaryPaint();
  toast("Видалено");
}

/* ---------- wiring ---------- */

Object.assign(actions, {
  "diary-open": b => diaryOpen(b.dataset.type, selectedDate),
  "diary-done": diaryClose,
  "diary-type": b => { diary.type = b.dataset.type; diary.view = diary.view === "card" && diary.item ? "search" : diary.view; diary.item = null; diaryPaint(); },
  "diary-query": b => { diary.query = b.dataset.value; diary.view = "search"; diaryPaint(); },
  "diary-clear": () => { diary.query = ""; diary.view = "search"; diaryPaint(); },
  "diary-pick": b => { const food = foodById(b.dataset.id); if (!food) return; if (food.recipeId && typeof recipeModal === "function") { recipeModal(food.recipeId); return; } diary.food = food; diary.item = null; diary.view = "card"; diaryPaint(); },
  "diary-back": () => { diary.view = "search"; diary.food = null; diary.item = null; diaryPaint(); },
  "diary-preset": b => { const input = $("diaryGrams"); if (input) { input.value = b.dataset.value; diaryPaintPortion(); } },
  "diary-fat-preset": b => { const input = $("diaryFatGrams"); if (input) { input.value = b.dataset.value; diaryPaintPortion(); } },
  "diary-add-item": diaryAddItem,
  "diary-save-item": diarySaveItem,
  "diary-delete-item": diaryDeleteItem,
  "diary-custom": () => { diary.view = "custom"; diaryPaint(); },
  "diary-repeat": b => diaryRepeatYesterday(b.dataset.type),
  "diary-edit": b => diaryEditOpen(b.dataset.id, selectedDate),
  "diary-edit-sheet": b => diaryEditOpen(b.dataset.id, diary.date),
  "diary-recent": b => { const meal = diaryRecent().find(item => item.id === b.dataset.id); if (meal) diaryReuse(meal); },
  "diary-favorite": b => { const meal = (state.favorites || []).find(item => item.id === b.dataset.id); if (meal) diaryReuse(meal); }
});

function diaryReuse(meal) {
  const copy = structuredClone(meal);
  delete copy.photo;
  copy.id = uid();
  copy.type = diary.type;
  if (!diaryCommit(copy)) return;
  diary.query = "";
  diary.view = "search";
  diaryPaint();
  toast("✓ " + copy.name + " · " + num(copy.grams) + " " + (copy.unit === "ml" ? "мл" : "г") + " у прийомі «" + diaryName(diary.type) + "»");
}

/* The old entry points lead to the same sheet. No default "snack" anywhere. */
actions["food-add"] = () => diaryOpen(diaryTypeForNow(), selectedDate);
actions["search"] = () => diaryOpen(diaryTypeForNow(), selectedDate);
actions["edit-meal"] = b => diaryEditOpen(b.dataset.id, selectedDate);
actions["pick-food"] = b => { if (!diary.open) diaryOpen(diaryTypeForNow(), selectedDate); const food = foodById(b.dataset.id); if (!food) return; diary.food = food; diary.item = null; diary.view = "card"; diaryPaint(); };

const diaryBeforeMealModal = mealModal;
mealModal = function (mode, product, existing) {
  const isNew = !existing || !log(selectedDate).meals.some(meal => meal.id === existing.id);
  const wanted = isNew ? (diary.pendingType || ((!product || product.unit !== "ml") && (!existing || existing.unit !== "ml") ? diaryTypeForNow() : null)) : null;
  if (wanted && existing) existing.type = wanted;
  diaryBeforeMealModal(mode, product, existing);
  if (wanted && $("mealForm") && $("mealForm").elements.type) {
    $("mealForm").elements.type.value = wanted;
    if (modalData && modalData.meal) modalData.meal.type = wanted;
  }
};

/* The drink builder opens from inside the sheet; what it saves lands in the same meal. */
const diaryBeforeDrinkBuilder = actions["drink-builder"];
actions["drink-builder"] = b => {
  if (diary.open) { diary.pendingType = diary.type; diary.open = false; $("modal").classList.remove("diary-sheet"); }
  diaryBeforeDrinkBuilder(b);
};

document.addEventListener("submit", event => {
  if (!event.target || event.target.id !== "diaryCustom") return;
  event.preventDefault();
  if (!event.target.reportValidity()) return;
  diarySaveCustom(event.target);
});


/* The × button, Escape and a swipe all mean the same as "Готово": everything is already saved. */
const diaryBeforeCloseModal = closeModal;
closeModal = function () {
  if (diary.open) { diaryClose(); return; }
  diaryBeforeCloseModal();
};
$("closeModal").onclick = () => closeModal();
$("modal").addEventListener("cancel", event => { if (diary.open) { event.preventDefault(); diaryClose(); } });
$("modal").addEventListener("close", () => {
  diary.pendingType = null;
  if (!diary.open) return;
  diary.open = false;
  $("modal").classList.remove("diary-sheet");
  modalData = {};
  if (currentView === "food") render();
});

/* English for the diary strings (the phrase table lives in locale.js). */
if (typeof UI_PHRASES !== "undefined" && Array.isArray(UI_PHRASES)) UI_PHRASES.push(
  ["ХАРЧУВАННЯ / СЬОГОДНІ", "FOOD / TODAY"], ["ХАРЧУВАННЯ /", "FOOD /"], ["ЩОДЕННИК /", "DIARY /"],
  ["СНІДАНОК", "BREAKFAST"], ["ОБІД", "LUNCH"], ["ВЕЧЕРЯ", "DINNER"], ["ПЕРЕКУС", "SNACK"], ["НАПОЇ", "DRINKS"],
  ["Сніданок", "Breakfast"], ["Обід", "Lunch"], ["Вечеря", "Dinner"], ["Перекус", "Snack"], ["Напої", "Drinks"],
  ["З’їдено", "Eaten"], ["Лишається", "Left"], ["Понад орієнтир", "Over the guide"], ["Орієнтир", "Guide"], ["Порахувати ↗", "Work it out ↗"],
  ["за рух", "for movement"], ["Без оцінки:", "No estimate:"], ["Підсумок неповний.", "The total is incomplete."],
  ["Ще порожньо", "Nothing yet"], ["без оцінки", "no estimate"], ["ккал", "kcal"],
  ["Повторити вчорашній сніданок", "Repeat yesterday's breakfast"], ["Повторити вчорашній обід", "Repeat yesterday's lunch"], ["Повторити вчорашній вечеря", "Repeat yesterday's dinner"], ["Повторити вчорашній перекус", "Repeat yesterday's snack"], ["Повторити вчорашній напої", "Repeat yesterday's drinks"],
  ["Вчорашній", "Yesterday's"], ["повторено", "repeated"], ["продуктів", "items"], ["продукти", "items"], ["продукт", "item"],
  ["Натисни ＋ біля прийому. Пошук відкриється одразу, кожен доданий продукт зберігається сам.", "Tap ＋ next to a meal. Search opens right away and every added item saves itself."],
  ["одна позначка 250 мл", "one mark is 250 ml"], ["Вода", "Water"], ["склянок", "glasses"],
  ["Ідеї, що приготувати ↗", "Ideas to cook ↗"], ["Фото тарілки ↗", "Photo of the plate ↗"], ["За етикеткою ↗", "From a label ↗"],
  ["Орієнтир — не ліміт. Рух не додається до їжі автоматично; одна цифра дня вже враховує його там, де є підстава.", "The guide is not a limit. Movement is not added to food automatically; the single daily number already accounts for it where there is reason to."],
  ["Готово", "Done"], ["Продукт, страва або напій…", "Food, dish or drink…"], ["Пошук продукту", "Food search"], ["Очистити", "Clear"],
  ["У цьому прийомі ·", "In this meal ·"], ["Зібрати напій за складом", "Build a drink from its parts"], ["кава з молоком, чай, вино — за мл", "coffee with milk, tea, wine — by ml"],
  ["Недавнє", "Recent"], ["Улюблене", "Favourites"], ["Мої продукти", "My foods"], ["Свій продукт", "Own food"], ["за етикеткою або меню, на 100 г чи мл", "from a label or menu, per 100 g or ml"],
  ["Недавнє й улюблене з’являться після перших записів.", "Recent and favourites appear after the first entries."],
  ["Нічого не знайшли для", "Nothing found for"], ["Спробуй коротше слово або інше написання: «курка варена», «помідор», «сир 5%».", "Try a shorter word or another spelling: “boiled chicken”, “tomato”, “cheese 5%”."],
  ["Створити свій продукт", "Create own food"], ["Схоже за словом", "Similar by the word"], ["Схоже на те, що ти шукаєш. Перевір назву.", "Looks like what you are after. Check the name."],
  ["Показано", "Showing"], ["Уточни запит.", "Narrow the query."], ["З упаковок · Open Food Facts", "From packages · Open Food Facts"],
  ["Шукаю ще у фасованих продуктах…", "Also looking in packaged foods…"], ["Фасовану базу зараз не відкрити. Звичайні продукти вище доступні.", "The packaged database is not available right now. Common foods above still are."],
  ["Назад до пошуку", "Back to search"], ["запис у прийомі", "entry in this meal"], ["мій продукт", "my food"], ["рецепт Daymark", "Daymark recipe"], ["заклад", "venue"], ["готова страва", "ready dish"],
  ["Мій продукт", "My food"], ["твої цифри", "your numbers"], ["Середнє для продукту", "Average for this food"], ["±10 %, спосіб приготування важливий", "±10 %, cooking method matters"],
  ["Типова рецептура", "Typical recipe"], ["діапазон, не дані кухні", "a range, not the kitchen's data"], ["Дані закладу", "Venue data"], ["офіційне меню", "official menu"],
  ["Вага закладу · оцінка ккал", "Venue weight · kcal estimate"], ["груба оцінка", "rough estimate"], ["Етикетка · Open Food Facts", "Label · Open Food Facts"], ["внесено спільнотою, звір пачку", "community entry, check the pack"],
  ["Рецепт Daymark", "Daymark recipe"], ["сума інгредієнтів", "sum of ingredients"], ["Довідник Ciqual 2025", "Ciqual 2025 reference"], ["Довідник USDA", "USDA reference"], ["Довідкова таблиця", "Reference table"], ["середнє довідкове", "reference average"], ["Внесено вручну", "Entered by hand"],
  ["у сирому вигляді", "raw"], ["у готовому вигляді", "cooked"], ["у сухому вигляді", "dry"], ["мілілітри", "millilitres"], ["грами", "grams"], ["порції", "portions"], ["штрихкод", "barcode"], ["Діапазон:", "Range:"], ["на 100 г", "per 100 g"], ["на 100 мл", "per 100 ml"],
  ["Скільки, мл", "How much, ml"], ["Скільки, г", "How much, g"], ["Скільки, порц.", "How many portions"], ["½ порції", "½ portion"], ["1 порція", "1 portion"], ["2 порції", "2 portions"],
  ["На 100 г", "Per 100 g"], ["На 100 мл", "Per 100 ml"], ["Твоя порція", "Your portion"], ["олія", "oil"],
  ["Олія або масло зверху", "Oil or butter on top"], ["Лише те, що не враховано в продукті. У смаженому зі словом «смажене» олія вже всередині.", "Only what the food does not already include. Anything named “fried” already has the oil inside."],
  ["Грамів олії", "Grams of oil"], ["немає", "none"], ["тонкий шар", "thin layer"], ["1 ч. л.", "1 tsp"], ["2 ч. л.", "2 tsp"], ["1 ст. л.", "1 tbsp"],
  ["Зберегти зміни", "Save changes"], ["Видалити з прийому", "Remove from meal"], ["Додати до: сніданок", "Add to breakfast"], ["Додати до: обід", "Add to lunch"], ["Додати до: вечеря", "Add to dinner"], ["Додати до: перекус", "Add to snack"], ["Додати до: напої", "Add to drinks"],
  ["Джерело ↗", "Source ↗"], ["Цифри з етикетки або меню, на 100 г чи 100 мл. Невідоме лиши порожнім — ми не підставимо нуль.", "Numbers from a label or menu, per 100 g or 100 ml. Leave unknowns empty — we will not put a zero in."],
  ["Назва", "Name"], ["Бренд або заклад", "Brand or venue"], ["Необов’язково", "Optional"], ["Одиниця", "Unit"], ["Звична порція", "Usual portion"], ["Ккал на 100", "Kcal per 100"], ["Білки, г", "Protein, g"], ["Жири, г", "Fat, g"], ["Вуглеводи, г", "Carbs, g"], ["з етикетки", "from the label"],
  ["Зберегти і вказати порцію", "Save and set the portion"], ["Перевір назву, калорії та порцію.", "Check the name, calories and portion."], ["У власній базі вже 500 продуктів", "Your own database already has 500 foods"], ["Продукт у твоїй базі. Вкажи порцію.", "The food is in your database. Set the portion."],
  ["Вкажи кількість.", "Enter the amount."], ["у прийомі", "in"], ["Запис оновлено", "Entry updated"], ["Видалено", "Removed"], ["У цьому дні вже 300 записів", "This day already has 300 entries"], ["У цьому дні вже забагато записів", "This day already has too many entries"],
  ["чашка", "cup"], ["скибка", "slice"], ["шт", "pcs"]
);

/* The keyboard must not hide the list: size the sheet to the visible viewport. */
(function watchViewport() {
  const vv = window.visualViewport;
  if (!vv) return;
  const apply = () => {
    document.documentElement.style.setProperty("--vvh", Math.round(vv.height) + "px");
    document.documentElement.style.setProperty("--vvt", Math.round(vv.offsetTop) + "px");
  };
  vv.addEventListener("resize", apply);
  vv.addEventListener("scroll", apply);
  apply();
})();
