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

function markMatchFoods(parsed) {
  if (typeof diarySearch !== "function") return [];
  const found = [];
  for (const query of parsed.items) {
    const hit = diarySearch(query, 1).list[0];
    if (hit) found.push(hit);
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
  const box = $("markLog");
  if (!box) return;
  box.innerHTML = markLines.map(line => '<div class="mark-bubble ' + line.role + '">' + esc(line.text) + "</div>").join("") || '<div class="mark-bubble mark">Я Марк. Скажи «Вечеря, половина тарілки борщу» — запишу це в той самий щоденник, що й кнопка плюс.</div>';
  box.scrollTop = box.scrollHeight;
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

async function markListen() {
  const button = $("markMic");
  if (!button || markBusy) return;
  if (location.port === "14711") {
    button.classList.add("live");
    markBusy = true;
    try {
      const response = await fetch("/mark/listen", { method: "POST" });
      const data = await response.json();
      if (data && data.text) await markHandle(data.text);
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
  recognition.onresult = event => { const text = event.results[0][0].transcript; if (text) markHandle(text); };
  recognition.start();
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

const markPhoto = uploadPlate;
uploadPlate = async function (event) {
  await markPhoto(event);
  if (!modalData.photo || !$("photoFeedback")) return;
  const vision = await markPlate(modalData.photo);
  if (!vision || !Array.isArray(vision.foods) || !vision.foods.length) return;
  const box = document.createElement("div");
  box.className = "mark-suggestions";
  box.innerHTML = "<p class=\"note\">Марк бачить порції відносно тарілки. Оцінка приблизна. Запис ляже в щоденник лише після кнопки.</p>" + vision.foods.map((food, index) => '<button type="button" data-mark-plate="' + index + '"><b>' + esc(food.name) + "</b><small>" + (food.fraction ? Math.round(food.fraction * 100) + "% тарілки · " : "") + (food.grams ? food.grams + " г · " : "") + "≈ " + food.kcal + " ккал</small></button>").join("");
  $("photoFeedback").appendChild(box);
  box.querySelectorAll("button").forEach(button => button.onclick = () => {
    const food = vision.foods[Number(button.dataset.markPlate)];
    const type = MarkParse.mealType(food.meal || "") || (typeof diaryTypeForNow === "function" ? diaryTypeForNow() : "dinner");
    const meal = { id: uid(), name: String(food.name || "Страва").slice(0, 140), type: type, grams: Number(food.grams) || Math.round(350 * (Number(food.fraction) || 0.7)), unit: "g", kcal: Math.round(Number(food.kcal) || 0), p: food.p == null ? null : Math.round(Number(food.p)), f: food.f == null ? null : Math.round(Number(food.f)), c: food.c == null ? null : Math.round(Number(food.c)), source: "mark", emoji: "◌" };
    if (markSaveMeal(meal)) toast("Записано як ручний прийом: " + meal.name);
  });
};
