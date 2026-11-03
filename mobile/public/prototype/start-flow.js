/* First entry: one short path — what to change → how you live and eat → how you move → my plan.
   Every answer is kept (state.startChoices, v2), a draft is saved after each step
   (daymark-start-draft-v1), and the plan on the last step is the same PlanEngine plan the
   person will live with. The old 4-level activity picker and the "wish / avoid" text fields are
   gone: everything is a named condition the planner can explain. */

const START_DRAFT_KEY = "daymark-start-draft-v1";
const START_GOALS = {
  lose: ["lose", "Схуднути й побачити зміни"],
  muscle: ["muscle", "Збудувати сильне тіло"],
  gain: ["gain", "Набрати вагу впевнено"],
  form: ["form", "Зберегти форму й ритм"],
  comfortable: ["lose", "Повернутися до комфортної ваги"],
  firstmonth: ["consistent", "Пройти перший місяць"],
  shape: ["form", "Змінити склад тіла"],
  maintain: ["form", "Закріпити результат"],
  stronger: ["muscle", "Стати сильнішою"],
  stamina: ["walking", "Стати витривалішою"],
  restart: ["homefit", "Повернутися до тренувань"],
  regularmove: ["walking", "Рухатися регулярно"],
  homebody: ["homefit", "Тренуватися вдома"],
  walking: ["walking", "Частіше гуляти"],
  foodrhythm: ["form", "Їсти регулярно"],
  evening: ["form", "Менше переїдати ввечері"],
  lesssugar: ["form", "Їсти менше солодкого"],
  water: ["form", "Пити більше води"],
  sleep: ["sleep", "Налагодити сон"],
  energy: ["energy", "Мати більше енергії"],
  consistency: ["consistent", "Не кидати почате"]
};
const START_EXTRA = [
  ["Побачити зміни", ["comfortable", "Повернутися до комфортної ваги"], ["firstmonth", "Пройти перший місяць"], ["shape", "Змінити склад тіла"], ["maintain", "Закріпити результат"]],
  ["Рух і сила", ["stronger", "Стати сильнішою"], ["stamina", "Стати витривалішою"], ["restart", "Повернутися до тренувань"], ["regularmove", "Рухатися регулярно"], ["homebody", "Тренуватися вдома"], ["walking", "Частіше гуляти"]],
  ["Харчування і самопочуття", ["foodrhythm", "Їсти регулярно"], ["evening", "Менше переїдати ввечері"], ["lesssugar", "Їсти менше солодкого"], ["water", "Пити більше води"], ["sleep", "Налагодити сон"], ["energy", "Мати більше енергії"], ["consistency", "Не кидати почате"]]
];
const START_FOOD_MODES = {
  normal: ["Звичайний ритм", "Без окремого режиму. Це спосіб їсти, не ціль.", "🍽"],
  lowcarb: ["Менше вуглеводів", "Страви з нижчою оцінкою вуглеводів. Не означає схуднення саме по собі.", "🥑"],
  window: ["Вікно харчування", "Їси в певні години, наприклад 12–20. Кількість їжі та ж.", "◷"]
};
const START_LIKES = ["poultry", "redmeat", "fish", "dairy", "egg", "legumes", "mushroom", "sweets"];
const START_EXCLUDE = ["meat", "poultry", "redmeat", "fish", "seafood", "dairy", "egg", "gluten", "nuts", "soy", "sesame", "mustard", "legumes", "mushroom", "sweets"];
const START_ALLERGENS = [["dairy", "Молоко"], ["egg", "Яйця"], ["gluten", "Глютен"], ["nuts", "Горіхи"], ["peanut", "Арахіс"], ["fish", "Риба"], ["seafood", "Морепродукти"], ["soy", "Соя"], ["sesame", "Кунжут"], ["mustard", "Гірчиця"]];
const START_TOOLS = { stove: "Плита", oven: "Духовка", microwave: "Мікрохвильовка", blender: "Блендер", none: "Нічого — лише без готування" };
const START_HEALTH = [["pregnancy", "Вагітність"], ["lactation", "Грудне вигодовування"], ["edHistory", "Історія розладу харчової поведінки"], ["medical", "Діагноз або лікувальне харчування"], ["medication", "Ліки, що впливають на вагу чи апетит"], ["injury", "Травма чи післяопераційне відновлення"]];
const START_WEEKDAYS = [[1, "Пн"], [2, "Вт"], [3, "Ср"], [4, "Чт"], [5, "Пт"], [6, "Сб"], [0, "Нд"]];
const START_LABELS = [["DAYMARK / 01", "ЩО ЗМІНИТИ"], ["DAYMARK / 02", "ЯК ЖИВУ І ЇМ"], ["DAYMARK / 03", "ЯКИЙ РУХ"], ["DAYMARK / 04", "МІЙ ПЛАН"]];

let startDraft = { step: 0, answers: PlanEngine.normalizeAnswers({ v: 2, goal: { id: "lose" } }), relaxed: [], savedAt: "" };

function startDraftLoad() {
  try {
    const raw = JSON.parse(localStorage.getItem(START_DRAFT_KEY) || "null") || (typeof state === "object" && state && state.startDraft) || null;
    if (raw && typeof raw === "object" && raw.answers) {
      startDraft = { step: Math.min(3, Math.max(0, Number(raw.step) || 0)), answers: PlanEngine.normalizeAnswers(raw.answers), relaxed: Array.isArray(raw.relaxed) ? raw.relaxed : [], savedAt: raw.savedAt || "" };
      return true;
    }
  } catch (error) {}
  return false;
}

function startDraftSave() {
  startDraft.savedAt = new Date().toISOString();
  const payload = { step: startDraft.step, answers: startDraft.answers, relaxed: startDraft.relaxed, savedAt: startDraft.savedAt };
  try { localStorage.setItem(START_DRAFT_KEY, JSON.stringify(payload)); } catch (error) {}
  if (typeof state === "object" && state && state.version === 1 && !finishingSetup) {
    state.startDraft = payload;
    if (typeof persist === "function") persist();
  }
}

function startDraftClear() {
  try { localStorage.removeItem(START_DRAFT_KEY); } catch (error) {}
  if (typeof state === "object" && state) delete state.startDraft;
}

function startHasDraft() {
  try { if (localStorage.getItem(START_DRAFT_KEY)) return true; } catch (error) {}
  return !!(typeof state === "object" && state && state.startDraft && state.startDraft.answers);
}

/* ---------- small helpers ---------- */

function startGet(path) {
  return path.split(".").reduce((node, key) => node && node[key], startDraft.answers);
}

function startSet(path, value) {
  const keys = path.split(".");
  let node = startDraft.answers;
  for (const key of keys.slice(0, -1)) { if (!node[key] || typeof node[key] !== "object") node[key] = {}; node = node[key]; }
  node[keys[keys.length - 1]] = value;
}

function startRange(value, min, max) {
  const number = Number(value);
  if (value === "" || value === null || value === undefined || !Number.isFinite(number) || number < min || number > max) return "";
  return String(number);
}

function startTitle() {
  const custom = String(startDraft.answers.goal.custom || "").trim();
  if (custom) return custom;
  return (START_GOALS[startDraft.answers.goal.id] || START_GOALS.lose)[1];
}

function startKind() {
  if (String(startDraft.answers.goal.custom || "").trim()) return "custom";
  return (START_GOALS[startDraft.answers.goal.id] || START_GOALS.lose)[0];
}

function readStartFields() {
  const root = $("modalBody");
  if (!root) return;
  root.querySelectorAll("[data-field]").forEach(field => {
    const value = field.type === "checkbox" ? field.checked : field.value;
    startSet(field.dataset.field, value);
  });
}

function sPill(path, value, label, multi) {
  const current = startGet(path);
  const active = multi ? Array.isArray(current) && current.map(String).includes(String(value)) : String(current) === String(value);
  return '<button type="button" class="start-pill' + (active ? " active" : "") + '" data-start-' + (multi ? "toggle" : "set") + '="' + esc(path) + ':' + esc(String(value)) + '">' + label + '</button>';
}

function sPills(path, options, multi) {
  return '<div class="start-pills">' + options.map(([value, label]) => sPill(path, value, label, multi)).join("") + '</div>';
}

function sKicker(text, hint) {
  return '<div class="start-kicker">' + text + (hint ? '<small>' + hint + '</small>' : '') + '</div>';
}

function sField(label, path, attrs) {
  return '<label class="start-field">' + label + '<input data-field="' + esc(path) + '" ' + attrs + ' value="' + esc(startGet(path) == null ? "" : startGet(path)) + '"></label>';
}

function sGroupLabel(key) {
  const group = PlanEngine.GROUPS[key];
  return group ? group.label : (RECIPE_INGREDIENTS[key] ? RECIPE_INGREDIENTS[key].name : key);
}

function startStepMarks() {
  return [0, 1, 2, 3].map(index => '<i class="' + (index <= startDraft.step ? "on" : "") + '"></i>').join("");
}

/* ---------- step 0: what to change + who you are ---------- */

function startStepGoal() {
  const a = startDraft.answers;
  const goalId = a.goal.id;
  const custom = String(a.goal.custom || "").trim();
  const choice = (id, icon, title, line) => '<button type="button" class="start-choice' + (goalId === id && !custom ? " active" : "") + '" data-start-goal="' + id + '"><span>' + icon + '</span><div><b>' + title + '</b><small>' + line + '</small></div></button>';
  const groups = START_EXTRA.map(([title, ...items]) => '<section class="start-group"><h3>' + title + '</h3><div class="start-grid">' + items.map(([id, label]) => '<button type="button" class="start-option' + (goalId === id && !custom ? " active" : "") + '" data-start-goal="' + id + '">' + label + '</button>').join("") + '</div></section>').join("");
  const horizon = [[28, "4 тижні"], [56, "8 тижнів"], [84, "12 тижнів"], [182, "6 місяців"]].map(([days, label]) => '<button type="button" class="start-pill' + (a.goal.deadline === offset(today(), days) ? " active" : "") + '" data-start-horizon="' + days + '">' + label + '</button>').join("");
  const activity = Object.entries(EnergyCalc.DAILY_ACTIVITY).map(([id, item]) => [id, item.label]);
  return '<div class="start-photo"></div><h2>Якої зміни ти хочеш?</h2><p class="start-lead">Не обирай дієту. Спочатку — результат, до якого йдеш. Усе нижче можна змінити пізніше по одному пункту.</p>' + sKicker("МОЯ ЦІЛЬ")
    + choice("lose", "↗", "Схуднути й побачити зміни", "До бажаної ваги в моєму темпі")
    + choice("muscle", "🏋️", "Збудувати сильне тіло", "М’язи, сила й відновлення")
    + choice("gain", "🌿", "Набрати вагу впевнено", "Регулярність і поступовий прогрес")
    + choice("form", "🍃", "Зберегти форму й ритм", "Підтримувати свій результат")
    + '<details class="start-more"' + (START_EXTRA.some(group => group.slice(1).some(([id]) => id === goalId)) || custom ? " open" : "") + '><summary>Показати ще 17 цілей <span>⌄</span></summary><div class="start-more-body">' + groups
    + '<label class="start-field">Моя ціль своїми словами<input data-field="goal.custom" maxlength="70" placeholder="Наприклад, пробігти перші 5 км" value="' + esc(custom) + '"></label></div></details>'
    + sKicker("ПРО МЕНЕ", "цифри потрібні лише для орієнтира")
    + sField("Як до тебе звертатися?", "body.name", 'maxlength="40" placeholder="Моє ім’я"')
    + '<div class="start-two">' + sField("Вік", "body.age", 'type="number" inputmode="numeric" min="14" max="100" placeholder="років"') + sField("Зріст", "body.height", 'type="number" inputmode="decimal" min="100" max="250" placeholder="см"') + '</div>'
    + '<div class="start-two">' + sField("Вага зараз", "body.weight", 'type="number" inputmode="decimal" min="25" max="300" step="0.1" placeholder="кг"') + sField("Бажана вага", "goal.targetWeight", 'type="number" inputmode="decimal" min="25" max="300" step="0.1" placeholder="кг, якщо є"') + '</div>'
    + sKicker("СТАТЬ") + sPills("body.sex", [["female", "Жіноча"], ["male", "Чоловіча"]])
    + '<p class="start-lead">Формула обміну (Mifflin–St Jeor) має дві сталі: +5 для чоловічого тіла і −161 для жіночого, різниця ≈ 166 ккал у спокої. Тому без статі персональної цифри немає. Ще стать визначає, як Daymark до тебе звертається.</p>'
    + sKicker("БУДЕННИЙ РУХ", "без тренувань — їх порахуємо окремо") + sPills("body.dailyActivity", activity.concat([["", "Поки не знаю"]]))
    + sKicker("МІЙ СТРОК", "необов’язково; строк не прискорює план, лише перевіряє реалістичність") + '<div class="start-pills">' + horizon + '</div>'
    + sField("Або своя дата", "goal.deadline", 'type="date"')
    + '<div class="start-note">Заміри лишаються на твоєму пристрої. Їх можна змінити пізніше в «Моєму плані», не проходячи анкету знову.</div>';
}

/* ---------- step 1: how you live and eat ---------- */

function startExcludeRow(key) {
  const ex = startDraft.answers.food.exclude;
  const term = ex.never.includes(key) ? "never" : ex.week.includes(key) ? "week" : ex.sometimes.includes(key) ? "sometimes" : "";
  const button = (value, label) => '<button type="button" class="' + (term === value ? "active" : "") + '" data-start-exclude="' + key + ':' + value + '">' + label + '</button>';
  return '<div class="start-exclude' + (term ? " on" : "") + '"><span>' + esc(sGroupLabel(key)) + '</span><div>' + button("never", "ніколи") + button("week", "не цього тижня") + button("sometimes", "рідше") + '</div></div>';
}

function startStepFood() {
  const a = startDraft.answers;
  const pantryIds = typeof WEEK_PANTRY !== "undefined" ? WEEK_PANTRY : [];
  const chips = (path, ids) => '<div class="start-pills small">' + ids.map(id => sPill(path, id, esc(RECIPE_INGREDIENTS[id] ? RECIPE_INGREDIENTS[id].name : id), true)).join("") + '</div>';
  return '<div class="start-art" aria-hidden="true">🥗</div><h2>Як ти живеш і їси?</h2><p class="start-lead">Спосіб харчування — окремо від цілі. Алергії й медичні заборони — окремо від смаків: перші план відкидає, другі лише ранжує.</p>'
    + sKicker("ПРИЙОМИ ЇЖІ") + sPills("food.meals", [[2, "2 прийоми"], [3, "3 прийоми"], [4, "4 і більше"]])
    + '<label class="start-check"><input type="checkbox" data-field="food.snacks"' + (a.food.snacks ? " checked" : "") + '><span>Є перекуси між прийомами</span></label>'
    + sKicker("РЕЖИМ") + Object.entries(START_FOOD_MODES).map(([id, [title, line, icon]]) => '<button type="button" class="start-mode' + (a.food.mode === id ? " active" : "") + '" data-start-set="food.mode:' + id + '"><i>' + icon + '</i><span><b>' + title + '</b><small>' + line + '</small></span><u>✓</u></button>').join("")
    + (a.food.mode === "window" ? sField("Моє вікно, наприклад 12–20", "food.window", 'maxlength="12" placeholder="12–20"') : "")
    + sKicker("АЛЕРГІЇ", "жорстка умова: такі страви відкидаються") + sPills("food.allergies", START_ALLERGENS.concat([["unsure", "Не впевнена / не впевнений"]]), true)
    + sField("Медична заборона чи лікувальна дієта (коротко)", "food.medicalDiet", 'maxlength="80" placeholder="Наприклад, без солі за призначенням"')
    + sKicker("ЧОГО НЕ ПРОПОНУВАТИ", "обери строк: «ніколи» відкидає, «не цього тижня» теж, «рідше» лише опускає нижче")
    + '<div class="start-exclude-list">' + START_EXCLUDE.map(startExcludeRow).join("") + '</div>'
    + sKicker("ЩО ЛЮБЛЮ", "м’яка умова: піднімає вгору, нічого не забороняє") + sPills("food.likes", START_LIKES.map(key => [key, sGroupLabel(key)]), true)
    + sField("Улюблені страви своїми словами", "food.likesText", 'maxlength="100" placeholder="Наприклад, сирники, борщ, паста"')
    + '<details class="start-extra"' + (a.food.pantry.length || a.food.buy.length ? " open" : "") + '><summary>Що вже є вдома і що куплю цього тижня <span>необов’язково</span></summary><div class="start-extra-body">' + sKicker("ВЖЕ ВДОМА") + chips("food.pantry", pantryIds) + sKicker("КУПЛЮ ЦЬОГО ТИЖНЯ") + chips("food.buy", pantryIds) + '</div></details>'
    + sKicker("БЮДЖЕТ") + sPills("food.budget", [["low", "Економно"], ["mid", "Середньо"], ["any", "Не обмежую"]])
    + sKicker("ЧАС НА ГОТУВАННЯ") + sPills("food.cookTime", [[15, "до 15 хв"], [30, "до 30 хв"], [60, "до години"], [0, "неважливо"]])
    + sKicker("ЩО Є НА КУХНІ") + sPills("food.tools", Object.entries(START_TOOLS), true)
    + '<div class="start-note">Якщо для твоїх умов рецептів забракне, план скаже, яку м’яку умову послабити, або запропонує коротший тиждень. Замість вигадувати страви.</div>';
}

/* ---------- step 2: movement + health ---------- */

function startStepMove() {
  const a = startDraft.answers;
  const wants = a.move.wants;
  const formats = Object.entries(PlanEngine.FORMATS).map(([id, item]) => [id, item.label]);
  const limits = Object.entries(PlanEngine.LIMIT_RULES).map(([id, item]) => [id, item.label]);
  const moveBody = wants === "no" ? '<p class="start-lead">Добре. У плані тренувань не буде — лише кроки без норми. Повернути рух можна будь-коли в «Моєму плані».</p>' :
    sKicker("ЩО ПОДОБАЄТЬСЯ") + sPills("move.like", formats, true)
    + sKicker("ЧОГО НЕ ХОЧУ") + sPills("move.dislike", formats, true)
    + sKicker("ДОСВІД У ЗАЛІ") + sPills("move.gymExperience", [["none", "Не було"], ["some", "Трохи"], ["regular", "Регулярно"]])
    + sKicker("ЩО Є З ОБЛАДНАННЯ", "програми лише на тому, що є") + sPills("move.gear", Object.entries(PlanEngine.GEAR), true)
    + sKicker("ДНІВ НА ТИЖДЕНЬ") + sPills("move.days", [[1, "1"], [2, "2"], [3, "3"], [4, "4"], [5, "5"]])
    + sKicker("ТРИВАЛІСТЬ") + sPills("move.minutes", [[15, "15 хв"], [20, "20 хв"], [30, "30 хв"], [45, "45 хв"], [60, "60 хв"]])
    + sKicker("ЗРУЧНІ ДНІ", "необов’язково; інакше розкладемо з відпочинком між") + sPills("move.weekdays", START_WEEKDAYS, true)
    + sKicker("ІНТЕНСИВНІСТЬ") + sPills("move.intensity", [["easy", "М’яко"], ["moderate", "Помірно"], ["hard", "Щільно"]])
    + sKicker("ОБМЕЖЕННЯ Й ТРАВМИ", "вправи на ці зони план відкидає") + sPills("move.limits", limits, true)
    + sField("Інше, що треба врахувати", "move.limitsText", 'maxlength="100" placeholder="Коротко, своїми словами"');
  const health = '<details class="start-extra start-health"' + (a.health.skipped || START_HEALTH.some(([key]) => a.health[key]) ? " open" : "") + '><summary>Здоров’я <span>мінімум питань, приватно</span></summary><div class="start-extra-body"><p class="start-lead">Відміть лише те, що є. Вагітність, грудне вигодовування і досвід розладу харчової поведінки — без персональної цифри калорій. Діагноз, ліки і травма — без автоматичного дефіциту і без призначених тренувань. Рух у цих випадках лише той, який уже дозволив лікар.</p>'
    + '<div class="start-pills">' + START_HEALTH.map(([key, label]) => '<button type="button" class="start-pill' + (a.health[key] ? " active" : "") + '" data-start-health="' + key + '">' + label + '</button>').join("") + '</div>'
    + '<label class="start-check"><input type="checkbox" data-field="health.private"' + (a.health.private !== false ? " checked" : "") + '><span>Приватно: не показувати ці відповіді на головній і в описах плану</span></label>'
    + '<label class="start-check"><input type="checkbox" data-field="health.skipped"' + (a.health.skipped ? " checked" : "") + '><span>Пропустити ці питання</span></label>'
    + '<p class="start-lead">Відповіді лишаються на пристрої. Це не діагностика і не медичне призначення.</p></div></details>';
  const told = a.body.sex === "male" ? "вказав" : "вказала";
  return '<div class="start-art" aria-hidden="true">🚶</div><h2>Який рух тобі підходить?</h2><p class="start-lead">Буденний рух ти вже ' + told + '. Тут — тренування: вони додаються в свій день, а не розмазуються по тижню.</p>'
    + sKicker("ХОЧУ ТРЕНУВАТИСЯ?") + sPills("move.wants", [["yes", "Так"], ["light", "Лише легкий рух"], ["no", "Ні"]])
    + moveBody + health;
}

/* ---------- step 3: the plan ---------- */

function startPlan() {
  return PlanEngine.build(startDraft.answers, { startIso: today(), relaxed: startDraft.relaxed });
}

function startStepPlan() {
  const plan = startPlan();
  startDraft.preview = plan;
  return typeof myPlanBody === "function" ? myPlanBody(plan, { mode: "start" }) : smartPlanBody(computeSmartPlan(startDraft.answers));
}

function paintStart() {
  const step = startDraft.step;
  const next = ["Далі: як живу і їм ↗", "Далі: який рух ↗", "Показати мій план ↗", "Почати мій план ↗"][step];
  const body = [startStepGoal, startStepFood, startStepMove, startStepPlan][step]();
  const later = step > 0 && step < 3 ? '<button type="button" class="start-later" data-start-later>Продовжити пізніше — відповіді збережено</button>' : "";
  const html = '<div class="start-shell"><div class="start-scroll"><div class="start-step"><span>' + START_LABELS[step][0] + '</span><span>' + START_LABELS[step][1] + '</span></div><div class="start-track">' + startStepMarks() + '</div>' + body + '</div><div class="start-foot">' + (step ? '<button type="button" class="start-back" data-start-back>← Назад</button>' : '') + later + '<button type="button" data-start-next class="' + (step === 3 ? "lime" : "") + '">' + next + '</button></div></div>';
  openModal("МІЙ СТАРТ / " + (step + 1) + " / 4", html);
  $("modal").classList.add("start-flow");
  $("modal").classList.remove("plan-sheet");
  const scroller = document.querySelector(".start-scroll");
  if (scroller) scroller.scrollTop = 0;
}

function openStartFlow() {
  state.needsSetup = true;
  if (!startDraftLoad()) {
    const existing = state.startChoices && state.startChoices.v === 2 ? state.startChoices : null;
    startDraft = { step: 0, answers: PlanEngine.normalizeAnswers(existing || { v: 2, goal: { id: "lose" } }), relaxed: [], savedAt: "" };
    if (!existing && state.profile) {
      startDraft.answers.body.name = state.profile.name || "";
      startDraft.answers.body.sex = state.profile.sex || "";
      ["age", "height", "weight"].forEach(key => { if (state.profile[key]) startDraft.answers.body[key] = state.profile[key]; });
    }
  }
  paintStart();
}

function startLater() {
  readStartFields();
  startDraftSave();
  finishingSetup = true;
  state.needsSetup = false;
  $("modal").classList.remove("start-flow");
  closeUnlocked();
  finishingSetup = false;
  persist();
  try { render(); } catch (error) {}
  toast("Відповіді збережено. Продовжити можна з головної.");
}

function finishStart() {
  readStartFields();
  const a = startDraft.answers;
  const kind = startKind();
  const template = GOAL_TEMPLATES[kind] || GOAL_TEMPLATES.form;
  const start = today();
  let end = months(start, a.goal.id === "firstmonth" ? 1 : 3);
  if (validDate(a.goal.deadline) && a.goal.deadline >= start && diff(start, a.goal.deadline) <= 730) end = a.goal.deadline;
  const habits = (template.habits || []).filter(id => HABITS[id]);
  const trainingDays = a.move.wants === "no" ? [] : (startDraft.preview && startDraft.preview.move.sessions.map(s => s.weekday)) || [1, 3, 5];
  const goal = {
    id: uid(),
    title: startTitle().slice(0, 90),
    kind: GOAL_KINDS[kind] ? kind : "custom",
    start,
    end,
    minimum: template.minimum,
    habits: habits.length ? habits : ["food"],
    checks: {},
    supportRules: Object.fromEntries((habits.length ? habits : ["food"]).map(id => [id, {
      target: SUPPORT_DEFINITIONS[id].target,
      days: id === "strength" ? (trainingDays.length ? trainingDays : [1, 3, 5]) : [0, 1, 2, 3, 4, 5, 6],
      label: SUPPORT_DEFINITIONS[id].name,
      automatic: !!SUPPORT_DEFINITIONS[id].auto
    }]))
  };
  finishingSetup = true;
  /* A repeated start changes the goal and the plan. It never drops what the person already logged. */
  const previous = state && !state.demo ? state : null;
  const keepGoals = previous && Array.isArray(previous.goals) ? previous.goals.filter(item => item && item.id !== "setup" && item.id !== goal.id) : [];
  const carried = previous ? {
    logs: previous.logs && typeof previous.logs === "object" ? previous.logs : {},
    favorites: Array.isArray(previous.favorites) ? previous.favorites : [],
    customFoods: Array.isArray(previous.customFoods) ? previous.customFoods : [],
    recipeExtras: previous.recipeExtras,
    smartMeta: previous.smartMeta && typeof previous.smartMeta === "object" ? { weights: Array.isArray(previous.smartMeta.weights) ? previous.smartMeta.weights : [] } : undefined,
    planHistory: Array.isArray(previous.planHistory) ? previous.planHistory : [],
    myPlan: previous.myPlan,
    weighReminder: previous.settings && previous.settings.weighReminder
  } : { logs: {}, favorites: [], customFoods: [], planHistory: [] };
  const weekdaysMinutes = a.move.wants === "no" ? 0 : a.move.days * a.move.minutes;
  state = {
    version: 1,
    demo: false,
    needsSetup: false,
    profile: {
      name: String(a.body.name || "").trim().slice(0, 40),
      age: startRange(a.body.age, 14, 100),
      height: startRange(a.body.height, 100, 250),
      weight: startRange(a.body.weight, 25, 300),
      targetWeight: startRange(a.goal.targetWeight, 25, 300),
      sex: a.body.sex === "female" || a.body.sex === "male" ? a.body.sex : "",
      activityLevel: { sitting: "seated", light: "walks", onfeet: "walks", physical: "physical", heavy: "physical" }[a.body.dailyActivity] || "unknown"
    },
    settings: {
      calories: null,
      steps: 8000,
      sleep: 8,
      style: a.food.mode === "lowcarb" ? "keto" : "balanced",
      fasting: a.food.mode === "window",
      motion: true,
      weeklyMinutes: weekdaysMinutes || null,
      weighReminder: carried.weighReminder || { enabled: false, everyDays: 7, time: "08:00" }
    },
    goals: [goal].concat(keepGoals).slice(0, 30),
    active: goal.id,
    logs: carried.logs,
    favorites: carried.favorites,
    fastingStart: null,
    customFoods: carried.customFoods,
    startChoices: Object.assign(PlanEngine.normalizeAnswers(a), { meta: { completed: new Date().toISOString(), rulesVersion: PlanEngine.RULES_VERSION, energyVersion: EnergyCalc.VERSION } }),
    planHistory: carried.planHistory
  };
  if (carried.recipeExtras) state.recipeExtras = carried.recipeExtras;
  if (carried.smartMeta) state.smartMeta = carried.smartMeta;
  selectedDate = start;
  monthView = start.slice(0, 7);
  const plan = startDraft.preview && startDraft.preview.created === start ? startDraft.preview : startPlan();
  if (carried.myPlan && carried.myPlan.version === 1) state.myPlan = carried.myPlan;
  if (typeof startMyPlan === "function") startMyPlan(plan, { fresh: true, reason: "новий старт" });
  else applySmartPlan(computeSmartPlan(state.startChoices), { fresh: true });
  startDraftClear();
  persist();
  $("modal").classList.remove("start-flow");
  closeUnlocked();
  try { render(); } catch (error) {}
  finishingSetup = false;
  toast(state.settings.calories ? "План збережено: близько " + num(state.settings.calories) + " ккал на день і тиждень страв." : "План збережено. Меню показує порції без норми.");
}

function startValidate() {
  const a = startDraft.answers;
  if (startDraft.step === 0 && a.body.sex !== "female" && a.body.sex !== "male") {
    toast("Обери жіночу або чоловічу стать, щоб іти далі.");
    return false;
  }
  if (startDraft.step === 0 && validDate(a.goal.deadline) && a.goal.deadline <= today()) {
    toast("Дата цілі має бути попереду.");
    return false;
  }
  if (startDraft.step === 0) {
    a.body.age = startRange(a.body.age, 14, 100);
    a.body.height = startRange(a.body.height, 100, 250);
    a.body.weight = startRange(a.body.weight, 25, 300);
    a.goal.targetWeight = startRange(a.goal.targetWeight, 25, 300);
  }
  return true;
}

/* One control handler for the questionnaire and for single-condition edits on the plan screen.
   Returns true when the click changed startDraft.answers. */
function startHandleControl(target) {
  const goalButton = target.closest("[data-start-goal]");
  const setButton = target.closest("[data-start-set]");
  const toggleButton = target.closest("[data-start-toggle]");
  const excludeButton = target.closest("[data-start-exclude]");
  const healthButton = target.closest("[data-start-health]");
  const horizon = target.closest("[data-start-horizon]");
  if (!goalButton && !setButton && !toggleButton && !excludeButton && !healthButton && !horizon) return false;
  readStartFields();
  if (goalButton) { startSet("goal.id", goalButton.dataset.startGoal); startSet("goal.custom", ""); return true; }
  if (setButton) {
    const [path, value] = setButton.dataset.startSet.split(":");
    const numeric = ["food.meals", "food.cookTime", "move.days", "move.minutes"].includes(path);
    startSet(path, numeric ? Number(value) : value);
    return true;
  }
  if (toggleButton) {
    const [path, raw] = toggleButton.dataset.startToggle.split(":");
    const value = path === "move.weekdays" ? Number(raw) : raw;
    const list = Array.isArray(startGet(path)) ? startGet(path).slice() : [];
    const has = list.map(String).includes(String(value));
    startSet(path, has ? list.filter(item => String(item) !== String(value)) : list.concat(value));
    if (path === "move.like" && !has) startSet("move.dislike", (startGet("move.dislike") || []).filter(item => item !== value));
    if (path === "move.dislike" && !has) startSet("move.like", (startGet("move.like") || []).filter(item => item !== value));
    if ((path === "move.gear" || path === "food.tools") && !has) startSet(path, value === "none" ? ["none"] : startGet(path).filter(item => item !== "none"));
    return true;
  }
  if (excludeButton) {
    const [key, term] = excludeButton.dataset.startExclude.split(":");
    const ex = startDraft.answers.food.exclude;
    const current = ex.never.includes(key) ? "never" : ex.week.includes(key) ? "week" : ex.sometimes.includes(key) ? "sometimes" : "";
    ["never", "week", "sometimes"].forEach(name => { ex[name] = ex[name].filter(item => item !== key); });
    if (current !== term) ex[term].push(key);
    return true;
  }
  if (healthButton) { const key = healthButton.dataset.startHealth; startSet("health." + key, !startGet("health." + key)); startSet("health.skipped", false); return true; }
  if (horizon) { startSet("goal.deadline", offset(today(), Number(horizon.dataset.startHorizon))); return true; }
  return false;
}

document.addEventListener("click", event => {
  if (!$("modal").classList.contains("start-flow")) return;
  const next = event.target.closest("[data-start-next]");
  const back = event.target.closest("[data-start-back]");
  const later = event.target.closest("[data-start-later]");
  const relax = event.target.closest("[data-myplan-relax]");
  const keep = document.querySelector(".start-scroll") ? document.querySelector(".start-scroll").scrollTop : 0;
  if (startHandleControl(event.target)) {
    paintStart();
    const scroller = document.querySelector(".start-scroll");
    if (scroller) scroller.scrollTop = keep;
    startDraftSave();
    return;
  }
  if (!next && !back && !later && !relax) return;
  readStartFields();
  if (relax) {
    const key = relax.dataset.myplanRelax;
    if (!startDraft.relaxed.includes(key)) startDraft.relaxed.push(key);
    paintStart();
    startDraftSave();
    toast("Умову послаблено. План зібрано заново.");
    return;
  }
  if (later) { startLater(); return; }
  if (back) { startDraft.step = Math.max(0, startDraft.step - 1); paintStart(); startDraftSave(); return; }
  if (next) {
    if (!startValidate()) return;
    if (startDraft.step < 3) {
      startDraft.step += 1;
      paintStart();
      startDraftSave();
    } else finishStart();
  }
});

document.addEventListener("input", event => {
  const field = event.target && event.target.dataset && event.target.dataset.field;
  if (!field || !$("modal").classList.contains("start-flow")) return;
  readStartFields();
  if (field === "goal.custom") $("modalBody").querySelectorAll("[data-start-goal]").forEach(button => button.classList.remove("active"));
  clearTimeout(startDraft.timer);
  startDraft.timer = setTimeout(startDraftSave, 400);
});

const namedHome = homeApp;
homeApp = function () {
  const html = namedHome();
  if (state.profile && !String(state.profile.name || "").trim()) return html.replace("Привіт, .", "Привіт.");
  return html;
};
