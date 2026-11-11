/* Mark: the same diary as a manual entry, plus a reply that stays inside Daymark. */
const MARK_NAMES = { breakfast: "Сніданок", lunch: "Ланч", dinner: "Вечеря", snack: "Перекус", drink: "Напій" };

function markContext() {
  const energy = typeof dayEnergy === "function" ? dayEnergy(today()) : { target: Number(state.settings.calories) || 0, extra: 0 };
  const eaten = typeof totals === "function" ? totals(today()) : { kcal: 0 };
  const entry = log(today());
  const target = Number(energy.target) || 0;
  const left = target ? target - eaten.kcal : null;
  return {
    name: state.profile && state.profile.name || "",
    goal: typeof goal === "function" ? goal().title : "",
    kind: typeof goal === "function" ? goal().kind : "",
    target: target,
    eaten: Math.round(eaten.kcal || 0),
    left: left === null ? null : Math.round(left),
    steps: entry.steps || 0,
    workouts: (entry.workouts || []).map(item => item.name),
    checkIn: entry.checkIn || null,
    meals: (entry.meals || []).filter(item => item.source !== "demo").length
  };
}

function markTone(context) {
  return MarkParse.toneFor({
    checkIn: context.checkIn,
    over: context.left !== null && context.left < -150,
    logged: context.meals > 0 && (context.left === null || context.left >= 0)
  });
}

function markPlateGrams(food, parsed) {
  if (parsed.grams) return Math.round(parsed.grams);
  const base = Number(food && (food.serving || food.grams)) || (parsed.unit === "ml" ? 250 : 350);
  const fraction = parsed.fraction || 0.7;
  return Math.max(1, Math.round(base * fraction));
}

function markMealFromFood(food, parsed, type) {
  const grams = markPlateGrams(food, parsed);
  const factor = grams / 100;
  const numOrNull = value => value === null || value === undefined || value === "" ? null : Math.round(Number(value) * factor * 10) / 10;
  return {
    id: uid(),
    name: food.name,
    type: type,
    grams: grams,
    unit: food.unit === "ml" || parsed.unit === "ml" ? "ml" : "g",
    kcal: numOrNull(food.kcal),
    p: numOrNull(food.p),
    f: numOrNull(food.f),
    c: numOrNull(food.c),
    source: "mark",
    emoji: food.emoji || "◌",
    foodRef: typeof foodProvenance === "function" ? foodProvenance(food) : { id: String(food.id || "").slice(0, 100), originalName: food.name, quality: "mark" }
  };
}

function markSaveMeal(meal) {
  const entry = log(today());
  if (entry.meals.length >= 300) return false;
  if (entry.meals.some(item => item.name === meal.name && item.type === meal.type && item.grams === meal.grams)) return true;
  entry.meals.push(meal);
  (entry.habits = entry.habits || {}).food = true;
  entry.nutritionComplete = false;
  return persist();
}

function markStem(word) {
  const w = typeof diaryNormalize === "function" ? diaryNormalize(word) : String(word || "").toLocaleLowerCase("uk");
  if (w.length < 5) return w;
  return w.replace(/(ами|ями|ою|ею|ому|ему|ові|еві|ах|ях|ів|їв|ий|ій|им|ім|ом|ем|ам|ям)$/u, "") || w;
}

function markHay(food) {
  return typeof diaryNormalize === "function" ? diaryNormalize([food.name, food.aliases, food.originalName].filter(Boolean).join(" ")) : String(food.name || "");
}

function markHit(query, stems) {
  if (typeof diarySearch !== "function" || !query) return null;
  const list = diarySearch(query, 8).list;
  return list.find(food => {
    const name = typeof diaryNormalize === "function" ? diaryNormalize(food.name) : String(food.name || "");
    return stems.every(stem => name.includes(stem.slice(0, Math.min(4, stem.length))));
  }) || null;
}

function markMatchFoods(parsed) {
  if (typeof diarySearch !== "function") return [];
  const stems = [];
  for (const query of parsed.items) {
    for (const word of String(query).split(/\s+/)) {
      const stem = markStem(word);
      if (stem.length >= 3) stems.push(stem);
    }
  }
  const found = [];
  const seen = new Set();
  for (let index = 0; index < stems.length; index += 1) {
    const pair = stems[index + 1] ? stems[index] + " " + stems[index + 1] : "";
    const paired = pair ? markHit(pair, [stems[index], stems[index + 1]]) : null;
    const hit = paired || markHit(stems[index], [stems[index]]);
    if (paired) index += 1;
    if (!hit || seen.has(hit.id)) continue;
    seen.add(hit.id);
    found.push(hit);
  }
  return found;
}

function markSuggestions(context) {
  if (typeof RECIPES === "undefined" || typeof recipeEstimate !== "function") return [];
  const room = context.left === null ? 700 : Math.max(180, context.left);
  const list = RECIPES.filter(recipe => {
    const kcal = recipeEstimate(recipe, 1).kcal;
    return kcal >= 120 && kcal <= room + 80;
  }).slice(0, 3);
  return list.map(recipe => {
    const estimate = recipeEstimate(recipe, 1);
    return { id: recipe.id, title: recipe.title, kcal: Math.round(estimate.kcal / 10) * 10, slot: recipe.category === "dinner" ? "dinner" : recipe.category === "breakfast" ? "breakfast" : "lunch", note: context.left === null ? "ідея на один прийом" : "у межах залишку" };
  });
}

function markLocalReply(parsed, context, saved) {
  if (parsed.offTopic) return "Я про день у Daymark: їжа, рух, сон і як ти себе почуваєш. Моду, погоду й новини лишимо за дверима. Що сьогодні з тарілкою або з тренуванням?";
  const tone = markTone(context);
  const opener = tone === "support" ? "Бачу, що день важкий. Це не провал." : tone === "steady" ? "Орієнтир уже позаду. Наступний крок — спокійніший, не покарання." : tone === "praise" ? "Добре, що це вже в щоденнику." : "Почнемо з одного запису. Цього достатньо.";
  if (parsed.intent === "meditation") return opener + " Для цього стану є коротка практика в розділі «Медитації»: важкий день — «Видихнути», якщо бракує сил — «Підтримати себе».";
  if (parsed.intent === "workout") {
    const gentle = tone === "support" || (context.checkIn && context.checkIn.energy === "low");
    return opener + (gentle ? " Сьогодні краще прогулянка 15–20 хвилин, без стрибків." : " Можу відкрити тренування під твій план: сила, якщо є сили, або прогулянка, якщо день уже щільний.") + (context.steps ? " Кроків сьогодні: " + context.steps + "." : "");
  }
  if (saved.length) {
    const line = saved.map(meal => meal.name + " · " + meal.grams + (meal.unit === "ml" ? " мл" : " г") + (meal.kcal === null ? "" : " · ≈ " + Math.round(meal.kcal) + " ккал")).join("; ");
    const left = context.left === null ? "" : " Після цього запису до орієнтира лишається близько " + Math.max(0, Math.round(context.left - saved.reduce((sum, meal) => sum + (Number(meal.kcal) || 0), 0))) + " ккал.";
    return opener + " Записав у «" + (MARK_NAMES[saved[0].type] || "щоденник") + "»: " + line + "." + left;
  }
  if (parsed.intent === "advice" || parsed.intent === "log") {
    const ideas = markSuggestions(Object.assign({}, context, { left: context.left }));
    const menu = ideas.length ? " Можу запропонувати: " + ideas.map(item => item.title + " ≈ " + item.kcal + " ккал").join(", ") + "." : "";
    return opener + (parsed.items.length ? " Не знайшов точної страви в базі. Назви продукт інакше або скажи грами." : " Скажи прийом і страву, наприклад: «Вечеря, половина тарілки борщу».") + menu;
  }
  return opener + " Можу записати сніданок, ланч, вечерю чи перекус, запропонувати страву під залишок калорій або коротку практику.";
}

let markBusy = false;
let markLines = [];

function markPush(role, text) {
  markLines.push({ role: role, text: text });
  if (markLines.length > 30) markLines = markLines.slice(-30);
}

async function markModelReply(parsed, context) {
  if (location.port !== "14711") return "";
  try {
    const response = await fetch("/mark/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: parsed.text, context: context, saved: true })
    });
    const data = await response.json();
    return data && data.ok && data.reply ? String(data.reply) : "";
  } catch (error) {
    return "";
  }
}

async function markHandle(text) {
  const parsed = MarkParse.parseMealUtterance(text);
  const context = markContext();
  markPush("user", text);
  if (parsed.offTopic) {
    markPush("mark", markLocalReply(parsed, context, []));
    markPaint();
    return;
  }
  const saved = [];
  if (parsed.intent === "log" || parsed.type) {
    const type = parsed.type || (typeof diaryTypeForNow === "function" ? diaryTypeForNow() : "snack");
    for (const food of markMatchFoods(parsed)) {
      const meal = markMealFromFood(food, parsed, type);
      if (markSaveMeal(meal)) saved.push(meal);
    }
  }
  const fresh = markContext();
  const local = markLocalReply(parsed, fresh, saved);
  const model = parsed.offTopic ? "" : await markModelReply(parsed, fresh);
  markPush("mark", model || local);
  markPaint();
  if (saved.length) { try { render(); } catch (error) {} markPaint(); }
}

function markPaint() {
  const html = markLines.map(line => '<div class="mark-bubble ' + line.role + '">' + esc(line.text) + "</div>").join("");
  const markBox = $("markLog");
  const snapBox = $("snapLog");
  if (markBox) {
    markBox.innerHTML = html || '<div class="mark-bubble mark">Я Марк. Скажи «Вечеря, половина тарілки борщу» — запишу це в той самий щоденник, що й кнопка плюс.</div>';
    markBox.scrollTop = markBox.scrollHeight;
  }
  if (snapBox) {
    snapBox.innerHTML = html || '<div class="mark-bubble mark">Я Марк. Сфотографуй тарілку або скажи «Вечеря, половина тарілки борщу». У щоденник запишу лише після кнопки «Записати».</div>';
    snapBox.scrollTop = snapBox.scrollHeight;
  }
  const ideas = markSuggestions(markContext());
  const host = $("markIdeas");
  if (host) host.innerHTML = ideas.map(item => '<button type="button" data-action="mark-save-idea" data-id="' + item.id + '" data-slot="' + item.slot + '"><b>' + esc(item.title) + '</b><small>≈ ' + item.kcal + " ккал · " + item.note + "</small></button>").join("");
}

function markOpen() {
  const context = markContext();
  openModal("МАРК", '<div class="mark-sheet"><div class="mark-log" id="markLog"></div><div class="mark-suggestions" id="markIdeas"></div><form class="mark-compose" id="markForm"><button class="mark-mic" type="button" id="markMic" aria-label="Сказати Марку">🎤</button><input name="text" maxlength="400" placeholder="Вечеря, половина тарілки…" autocomplete="off"><button class="mark-send" type="submit" aria-label="Надіслати">↗</button></form><p class="small muted">Голос і текст пишуться в щоденник як ручний запис. У модель, якщо вона увімкнена, іде лише ця фраза і короткий підсумок дня, не весь архів. ' + (context.left === null ? "Орієнтир калорій ще не порахований." : "Зараз з’їдено " + context.eaten + " ккал, лишається " + context.left + ".") + '</p><details class="mark-key"><summary>Ключ ChatGPT для відповідей Марка</summary><p class="small muted">Ключ лишається в цьому телефоні. Без нього Марк усе одно записує їжу за базою продуктів.</p><form id="markKeyForm"><input name="key" type="password" placeholder="sk-…" autocomplete="off"><button class="btn ghost full" type="submit">Зберегти ключ на пристрої</button></form></details></div>');
  markPaint();
  $("markForm").onsubmit = event => {
    event.preventDefault();
    const text = new FormData(event.target).get("text");
    if (!text || markBusy) return;
    event.target.reset();
    markBusy = true;
    markHandle(String(text)).finally(() => { markBusy = false; });
  };
  $("markMic").onclick = markListen;
  const keyForm = $("markKeyForm");
  if (keyForm) keyForm.onsubmit = event => {
    event.preventDefault();
    const key = new FormData(event.target).get("key");
    if (location.port !== "14711") { toast("Ключ зберігається в застосунку на телефоні."); return; }
    fetch("/mark/key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ key: String(key || "") }) })
      .then(response => response.json())
      .then(data => toast(data && data.ok ? "Ключ збережено лише на цьому пристрої." : "Не вдалося зберегти ключ."))
      .catch(() => toast("Не вдалося зберегти ключ."));
  };
}

async function markHear(apply, button) {
  if (!button || markBusy) return;
  if (location.port === "14711") {
    button.classList.add("live");
    markBusy = true;
    try {
      const response = await fetch("/mark/listen", { method: "POST" });
      const data = await response.json();
      if (data && data.text) await apply(data.text);
      else toast(data && data.reason === "denied" ? "Дозволь мікрофон і розпізнавання мовлення." : "Не почув фразу. Спробуй ще раз.");
    } catch (error) {
      toast("Голос зараз недоступний.");
    } finally {
      markBusy = false;
      button.classList.remove("live");
    }
    return;
  }
  const Speech = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Speech) { toast("У цьому браузері скажи текстом. На телефоні слухає застосунок."); return; }
  const recognition = new Speech();
  recognition.lang = "uk-UA";
  recognition.onresult = event => {
    const text = event.results && event.results[0] && event.results[0][0] && event.results[0][0].transcript;
    if (text) apply(text);
  };
  try { recognition.start(); } catch (error) { toast("Голос зараз недоступний."); }
}

function markListen() {
  return markHear(markHandle, $("markMic"));
}

async function markPlate(uri) {
  if (location.port !== "14711") return null;
  try {
    const response = await fetch("/mark/plate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image: uri }) });
    const data = await response.json();
    return data && data.ok ? data : null;
  } catch (error) {
    return null;
  }
}

const markHome = homeApp;
homeApp = function () {
  return markHome().replace('<div class="home-quick-heading">', '<button class="mark-card" data-action="mark"><span class="mark-face">M</span><span><b>Марк</b><small>Скажи вечерю, сніданок або як ти себе почуваєш</small></span></button><div class="home-quick-heading">');
};

actions.mark = markOpen;
actions["mark-save-idea"] = button => {
  if (typeof commitPlannedMeal === "function") commitPlannedMeal(today(), button.dataset.id, 1, button.dataset.slot || "dinner");
  markOpen();
};

let snapDraft = [];
let snapToken = 0;

function snapPortionText(meal) {
  if (meal.fraction === 1) return "повна тарілка";
  if (meal.fraction === 0.5) return "половина тарілки";
  if (meal.fraction === 0.33) return "третина тарілки";
  if (meal.fraction === 0.25) return "чверть тарілки";
  if (meal.fraction) return Math.round(meal.fraction * 100) + "% тарілки";
  return "";
}

function snapApplyPortion(meal, parsed) {
  const next = Object.assign({}, meal);
  if (parsed.type) next.type = parsed.type;
  if (parsed.unit === "ml") next.unit = "ml";
  let grams = meal.grams;
  if (parsed.grams) grams = Math.round(parsed.grams);
  else if (parsed.fraction) grams = Math.round(350 * parsed.fraction);
  if (parsed.fraction) next.fraction = parsed.fraction;
  if (!parsed.grams && !parsed.fraction) return next;
  const ratio = meal.grams ? grams / meal.grams : 1;
  const rescale = value => value == null || value === "" ? null : Math.round(Number(value) * ratio * 10) / 10;
  next.grams = Math.max(1, grams);
  next.kcal = rescale(meal.kcal);
  next.p = rescale(meal.p);
  next.f = rescale(meal.f);
  next.c = rescale(meal.c);
  return next;
}

function snapFromFood(food, parsed, type) {
  const meal = markMealFromFood(food, parsed, type);
  meal.source = "photo";
  meal.fraction = parsed.fraction;
  meal.per100 = { kcal: food.kcal, p: food.p, f: food.f, c: food.c };
  return meal;
}

function snapFromVision(food) {
  const type = MarkParse.mealType(food.meal || "") || (typeof diaryTypeForNow === "function" ? diaryTypeForNow() : "snack");
  const fraction = Number(food.fraction) || null;
  const grams = Number(food.grams) || Math.round(350 * (fraction || 0.7));
  const numberOrNull = value => value == null || value === "" ? null : Number(value);
  return {
    id: uid(),
    name: String(food.name || "Страва").slice(0, 140),
    type: type,
    grams: Math.max(1, Math.round(grams)),
    unit: "g",
    kcal: numberOrNull(food.kcal),
    p: numberOrNull(food.p),
    f: numberOrNull(food.f),
    c: numberOrNull(food.c),
    source: "photo",
    emoji: "◌",
    fraction: fraction
  };
}

function snapPaintDraft() {
  const host = $("snapDraft");
  if (!host) return;
  if (!snapDraft.length) { host.innerHTML = ""; return; }
  host.innerHTML = snapDraft.map((meal, index) => {
    const portion = snapPortionText(meal);
    const types = Object.entries(MARK_NAMES).map(([type, name]) => '<button type="button" data-action="snap-type" data-index="' + index + '" data-type="' + type + '"' + (meal.type === type ? ' class="on"' : "") + ">" + name + "</button>").join("");
    const kcal = meal.kcal == null ? "калорії ще не оцінені" : "≈ " + Math.round(meal.kcal) + " ккал";
    const saved = meal.saved ? '<p class="note">У щоденнику.</p>' : '<button class="btn blue full" type="button" data-action="snap-save" data-index="' + index + '">Записати в щоденник</button>';
    return '<article class="snap-card"><b>' + esc(meal.name) + '</b><p>' + kcal + " · " + meal.grams + (meal.unit === "ml" ? " мл" : " г") + (portion ? " · " + portion : "") + '</p><div class="snap-types">' + types + "</div>" + saved + "</article>";
  }).join("");
}

function snapPieceGrams(food) {
  const name = typeof diaryNormalize === "function" ? diaryNormalize(food.name) : String(food.name || "");
  if (/хліб|батон|булоч|лаваш/.test(name)) return 40;
  if (/шинк|ковбас|сир|бекон|масло/.test(name)) return 25;
  if (/помідор|огір|салат|овоч|зелен|перець/.test(name)) return 40;
  if (/соус|майонез|сметан/.test(name)) return 15;
  const serving = Number(food.serving) || 80;
  return Math.max(15, Math.min(serving, 80));
}

function snapSum(foods, key, gramsOf) {
  if (foods.some(food => food[key] === null || food[key] === undefined || food[key] === "")) return null;
  return foods.reduce((sum, food) => sum + Number(food[key]) * gramsOf(food) / 100, 0);
}

function snapFromHits(hits, parsed, type) {
  const norm = food => typeof diaryNormalize === "function" ? diaryNormalize(food.name) : String(food.name || "");
  const dish = hits.find(food => /бутерброд|сендвіч|сандвіч/.test(norm(food)));
  const parts = hits.filter(food => food !== dish);
  const used = parts.length >= 2 ? parts : hits;
  const bits = used.slice(0, 4).map(food => food.name);
  const saidSandwich = /бутерброд|сендвіч|сандвіч/.test((parsed.items || []).join(" "));
  const name = ((dish || saidSandwich) && used.length >= 2 ? "Бутерброд: " : "") + bits.join(", ");
  const gramsOf = food => snapPieceGrams(food);
  let grams = used.reduce((sum, food) => sum + gramsOf(food), 0);
  let kcal = snapSum(used, "kcal", gramsOf);
  let p = snapSum(used, "p", gramsOf);
  let f = snapSum(used, "f", gramsOf);
  let c = snapSum(used, "c", gramsOf);
  const scale = parsed.grams ? parsed.grams / grams : parsed.fraction || 1;
  grams *= scale;
  if (kcal !== null) kcal *= scale;
  if (p !== null) p *= scale;
  if (f !== null) f *= scale;
  if (c !== null) c *= scale;
  const round1 = value => value === null ? null : Math.round(value * 10) / 10;
  return {
    id: uid(),
    name: name.slice(0, 140),
    type: type,
    grams: Math.max(1, Math.round(grams)),
    unit: "g",
    kcal: kcal === null ? null : Math.round(kcal),
    p: round1(p),
    f: round1(f),
    c: round1(c),
    source: "photo",
    emoji: "◌",
    fraction: parsed.fraction || null
  };
}

function snapOpen() {
  modalData = { mode: "photo", photo: null };
  openModal("МАРК / СФОНТАЙ", '<div class="snap-sheet"><h2 class="modal-title">Марк порахує</h2><p class="modal-sub">Фото, голос або текст. У щоденник запис лягає лише після підтвердження.</p><label class="photo-zone" id="snapZone">' + (typeof icon === "function" ? icon("camera") : "") + '<strong>Їжа, кава чи етикетка</strong><small>Камера або галерея · фото лишається на телефоні</small><input id="plateFile" type="file" accept="image/*" hidden></label><div id="photoFeedback"></div><div id="snapDraft"></div><div class="mark-log" id="snapLog"></div><form class="mark-compose" id="snapForm"><button class="mark-mic" type="button" id="snapMic" aria-label="Сказати Марку">🎤</button><input name="text" maxlength="400" placeholder="Вечеря, половина тарілки, без сметани" autocomplete="off"><button class="mark-send" type="submit" aria-label="Надіслати">↗</button></form><p class="small muted">Голос і текст уточнюють оцінку. Калорії приблизні, це не зважування.</p></div>');
  snapPaintDraft();
  markPaint();
  $("plateFile").onchange = snapTake;
  $("snapForm").onsubmit = event => {
    event.preventDefault();
    const text = new FormData(event.target).get("text");
    if (!text || markBusy) return;
    event.target.reset();
    snapHandle(String(text));
  };
  $("snapMic").onclick = () => markHear(snapHandle, $("snapMic"));
}

async function snapRead(file) {
  if (!file.type.startsWith("image/") || file.size > 25 * 1024 * 1024) { toast("Обери фото до 25 МБ"); return ""; }
  modalData.uploadBusy = true;
  try {
    const source = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const image = await new Promise((resolve, reject) => {
      const picture = new Image();
      picture.onload = () => resolve(picture);
      picture.onerror = reject;
      picture.src = source;
    });
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 720 / Math.max(image.width, image.height));
    canvas.width = Math.max(1, Math.round(image.width * scale));
    canvas.height = Math.max(1, Math.round(image.height * scale));
    canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.72);
  } catch (error) {
    toast("Не вдалося прочитати фото.");
    return "";
  } finally {
    modalData.uploadBusy = false;
  }
}

async function snapFromImage(uri) {
  const vision = await markPlate(uri);
  if (vision && Array.isArray(vision.foods) && vision.foods.length) return { meals: vision.foods.slice(0, 4).map(snapFromVision), via: "Марк подивився на тарілку. Оцінка приблизна." };
  if (typeof recognizePlate !== "function") return { meals: [], via: "" };
  try {
    const guesses = await recognizePlate(uri);
    const top = guesses[0];
    if (!top) return { meals: [], via: "" };
    const parsed = MarkParse.parseMealUtterance(top.query);
    parsed.items = parsed.items.length ? parsed.items : [top.query];
    const type = parsed.type || (typeof diaryTypeForNow === "function" ? diaryTypeForNow() : "snack");
    const foods = markMatchFoods(parsed);
    const meals = foods.length ? foods.map(food => snapFromFood(food, parsed, type)) : [{ id: uid(), name: top.query, type: type, grams: 180, unit: "g", kcal: null, p: null, f: null, c: null, source: "photo", emoji: "◌", fraction: null }];
    return { meals: meals, via: "На фото схоже на «" + top.query + "». Калорії з бази, порцію можна уточнити голосом." };
  } catch (error) {
    return { meals: [], via: "" };
  }
}

async function snapTake(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;
  const uri = await snapRead(file);
  if (!uri || !$("photoFeedback")) return;
  modalData.photo = uri;
  const zone = $("snapZone");
  if (zone) zone.hidden = true;
  const token = ++snapToken;
  $("photoFeedback").innerHTML = '<img class="upload-preview" src="' + uri + '" alt="Твоє фото тарілки"><p class="note">Марк дивиться на тарілку…</p>';
  const result = await snapFromImage(uri);
  if (token !== snapToken || !$("photoFeedback")) return;
  if (result.meals.length) {
    const chosen = snapDraft.find(meal => !meal.saved);
    snapDraft = result.meals.map(meal => chosen ? Object.assign(meal, { type: chosen.type }) : meal);
  }
  const note = result.meals.length ? result.via : "Не бачу страву на фото. Скажи, що це: «Вечеря, борщ, половина тарілки».";
  $("photoFeedback").innerHTML = '<img class="upload-preview" src="' + uri + '" alt="Твоє фото тарілки"><p class="note">' + esc(note) + "</p>";
  markPush("mark", note);
  snapPaintDraft();
  markPaint();
}

async function snapHandle(text) {
  const parsed = MarkParse.parseMealUtterance(text);
  const context = markContext();
  markPush("user", text);
  if (parsed.offTopic) {
    markPush("mark", markLocalReply(parsed, context, []));
    markPaint();
    return;
  }
  if (parsed.intent === "meditation" || parsed.intent === "workout" || parsed.intent === "advice" || parsed.intent === "emotion") {
    const local = markLocalReply(parsed, context, []);
    const model = await markModelReply(parsed, context);
    markPush("mark", model || local);
    markPaint();
    return;
  }
  const type = parsed.type || (snapDraft[0] && snapDraft[0].type) || (typeof diaryTypeForNow === "function" ? diaryTypeForNow() : "snack");
  if (parsed.items.length) {
    const foods = markMatchFoods(parsed);
    if (foods.length >= 2) snapDraft = snapDraft.filter(meal => meal.saved).concat([snapFromHits(foods, parsed, type)]);
    else if (foods.length === 1) snapDraft = snapDraft.filter(meal => meal.saved).concat([snapFromFood(foods[0], parsed, type)]);
    else if (snapDraft.some(meal => !meal.saved)) snapDraft = snapDraft.map(meal => meal.saved ? meal : snapApplyPortion(Object.assign({}, meal, { type: type }), parsed));
    else {
      const short = parsed.items.filter(item => item.length <= 40).slice(0, 3).join(", ");
      if (short) snapDraft = snapDraft.filter(meal => meal.saved).concat([{ id: uid(), name: short.slice(0, 80), type: type, grams: parsed.grams || Math.round(350 * (parsed.fraction || 0.7)), unit: parsed.unit || "g", kcal: null, p: null, f: null, c: null, source: "photo", emoji: "◌", fraction: parsed.fraction }]);
    }
  } else if (snapDraft.some(meal => !meal.saved) && (parsed.type || parsed.grams || parsed.fraction)) {
    snapDraft = snapDraft.map(meal => meal.saved ? meal : snapApplyPortion(meal, parsed));
  }
  const pending = snapDraft.filter(meal => !meal.saved);
  const line = pending.map(meal => meal.name + (meal.kcal == null ? "" : " ≈ " + Math.round(meal.kcal) + " ккал")).join(", ");
  const reply = pending.length ? "Бачу " + line + ". У щоденник це ляже після кнопки «Записати»." : "Скажи страву і прийом, наприклад «Вечеря, половина тарілки борщу», або сфотографуй тарілку.";
  markPush("mark", reply);
  snapPaintDraft();
  markPaint();
}

function snapCommit(index) {
  const draft = snapDraft[index];
  if (!draft || draft.saved) return;
  const meal = {
    id: draft.id,
    name: draft.name,
    type: draft.type,
    grams: draft.grams,
    unit: draft.unit === "ml" ? "ml" : "g",
    kcal: draft.kcal == null ? null : Math.round(Number(draft.kcal)),
    p: draft.p == null ? null : Math.round(Number(draft.p)),
    f: draft.f == null ? null : Math.round(Number(draft.f)),
    c: draft.c == null ? null : Math.round(Number(draft.c)),
    source: "photo",
    emoji: draft.emoji || "◌"
  };
  if (modalData.photo && !snapDraft.some(item => item.saved)) meal.photo = modalData.photo;
  if (!markSaveMeal(meal)) { toast("Не вдалося записати."); return; }
  draft.saved = true;
  toast("Записано в «" + (MARK_NAMES[meal.type] || "щоденник") + "»: " + meal.name + (meal.kcal == null ? "" : " · ≈ " + meal.kcal + " ккал"));
  try { render(); } catch (error) {}
  snapPaintDraft();
  markPaint();
}

actions["snap-save"] = button => snapCommit(Number(button.dataset.index));
actions["snap-type"] = button => {
  const meal = snapDraft[Number(button.dataset.index)];
  if (!meal || meal.saved || !MARK_NAMES[button.dataset.type]) return;
  meal.type = button.dataset.type;
  snapPaintDraft();
};
actions.photo = snapOpen;

const snapFoodView = foodView;
foodView = function () {
  return snapFoodView().replace("Сценарій AI-оцінки ↗", "Голос, текст і калорії Марка ↗");
};
