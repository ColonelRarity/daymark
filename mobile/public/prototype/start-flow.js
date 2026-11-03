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
const START_MODES = {
  balanced: ["Звичайний ритм", "Без окремого режиму", "🍽"],
  fasting: ["Вікно харчування", "Пауза з таймером, наприклад 14:10 чи 16:8", "◷"],
  keto: ["Менше вуглеводів / кето", "Ідеї з нижчою оцінкою вуглеводів", "🥑"]
};
const START_PREFS = { walk: "🚶 Прогулянки", home: "🏠 Вдома", gym: "🏋 Зал", sugar: "🍓 Менше цукру" };
const START_MOVE = { walk: "Прогулянки", home: "Тренування вдома", gym: "Заняття в залі" };
const startDraft = {
  step: 0, goal: "lose", custom: "", name: "", age: "", height: "", weight: "", targetWeight: "",
  activity: "seated", sex: "", goalDate: "", waist: "", hips: "", health: "", mode: "balanced",
  prefs: ["walk"], meals: "", workouts: "", wish: "", avoid: "", workoutTime: ""
};

function startRange(value, min, max) {
  const number = Number(value);
  if (!value || !Number.isFinite(number) || number < min || number > max) return "";
  return String(number);
}

function startTitle() {
  const custom = startDraft.custom.trim();
  if (custom) return custom;
  return (START_GOALS[startDraft.goal] || START_GOALS.lose)[1];
}

function startKind() {
  if (startDraft.custom.trim()) return "custom";
  return (START_GOALS[startDraft.goal] || START_GOALS.lose)[0];
}

function readStartFields() {
  const root = $("modalBody");
  if (!root) return;
  root.querySelectorAll("[data-field]").forEach(field => { startDraft[field.dataset.field] = field.value; });
}

function startChoice(id, icon, title, line) {
  return '<button type="button" class="start-choice' + (startDraft.goal === id && !startDraft.custom.trim() ? " active" : "") + '" data-start-goal="' + id + '"><span>' + icon + '</span><div><b>' + title + '</b><small>' + line + '</small></div></button>';
}

function startStepMarks() {
  return [0, 1, 2, 3].map(index => '<i class="' + (index <= startDraft.step ? "on" : "") + '"></i>').join("");
}

function paintStart() {
  const step = startDraft.step;
  const labels = [["DAYMARK / 01", "ТВОЯ МЕТА"], ["DAYMARK / 02", "МІЙ СТАРТ"], ["DAYMARK / 03", "МІЙ РИТМ"], ["DAYMARK / 04", "МІЙ ПЛАН"]];
  const next = ["Далі: про мене ↗", "Далі: мій ритм ↗", "Отримати мій план ↗", "Почати з цим планом ↗"][step];
  let body = "";
  if (step === 0) {
    const groups = START_EXTRA.map(([title, ...items]) => '<section class="start-group"><h3>' + title + '</h3><div class="start-grid">' + items.map(([id, label]) => '<button type="button" class="start-option' + (startDraft.goal === id && !startDraft.custom.trim() ? " active" : "") + '" data-start-goal="' + id + '">' + label + '</button>').join("") + '</div></section>').join("");
    body = '<div class="start-photo"></div><h2>Якої зміни ти хочеш?</h2><p class="start-lead">Не обирай дієту. Спочатку — результат, до якого йдеш.</p><div class="start-kicker">МОЯ ЦІЛЬ</div>'
      + startChoice("lose", "↗", "Схуднути й побачити зміни", "До бажаної ваги в моєму темпі")
      + startChoice("muscle", "🏋️", "Збудувати сильне тіло", "М’язи, сила й відновлення")
      + startChoice("gain", "🌿", "Набрати вагу впевнено", "Регулярність і поступовий прогрес")
      + startChoice("form", "🍃", "Зберегти форму й ритм", "Підтримувати свій результат")
      + '<details class="start-more"' + (START_EXTRA.some(group => group.slice(1).some(([id]) => id === startDraft.goal)) || startDraft.custom.trim() ? " open" : "") + '><summary>Показати ще 17 цілей <span>⌄</span></summary><div class="start-more-body">' + groups
      + '<label class="start-field">Моя ціль своїми словами<input data-field="custom" maxlength="70" placeholder="Наприклад, пробігти перші 5 км" value="' + esc(startDraft.custom) + '"></label></div></details>';
  }
  if (step === 1) {
    const activity = value => '<option value="' + value + '"' + (startDraft.activity === value ? " selected" : "") + '>';
    const extraOpen = startDraft.waist || startDraft.hips || startDraft.health;
    body = '<div class="start-art" aria-hidden="true">📏</div><h2>План починається з тебе.</h2><p class="start-lead">Цифри потрібні лише для орієнтира. Пропусти те, чим не хочеш ділитися.</p>'
      + '<label class="start-field">Як до тебе звертатися?<input data-field="name" maxlength="40" placeholder="Моє ім’я" value="' + esc(startDraft.name) + '"></label>'
      + '<div class="start-two"><label class="start-field">Вік<input data-field="age" type="number" inputmode="numeric" min="14" max="100" placeholder="років" value="' + esc(startDraft.age) + '"></label><label class="start-field">Зріст<input data-field="height" type="number" inputmode="decimal" min="100" max="250" placeholder="см" value="' + esc(startDraft.height) + '"></label></div>'
      + '<div class="start-two"><label class="start-field">Вага зараз<input data-field="weight" type="number" inputmode="decimal" min="25" max="300" step="0.1" placeholder="кг" value="' + esc(startDraft.weight) + '"></label><label class="start-field">Бажана вага<input data-field="targetWeight" type="number" inputmode="decimal" min="25" max="300" step="0.1" placeholder="кг" value="' + esc(startDraft.targetWeight) + '"></label></div>'
      + '<label class="start-field">Моя звичайна активність<select data-field="activity">' + activity("seated") + 'Переважно сиджу</option>' + activity("walks") + 'Часто гуляю</option>' + activity("train") + 'Тренуюся 2–3 рази</option>' + activity("active") + 'Дуже рухливі дні</option></select></label>'
      + '<div class="start-kicker">СТАТЬ</div><div class="start-pills"><button type="button" class="start-pill' + (startDraft.sex === "female" ? " active" : "") + '" data-start-sex="female">Жіноча</button><button type="button" class="start-pill' + (startDraft.sex === "male" ? " active" : "") + '" data-start-sex="male">Чоловіча</button></div><p class="start-lead">Потрібна для формули і для того, як Daymark до тебе звертається. Без статі план не рахуємо.</p>'
      + '<div class="start-kicker">МІЙ СТРОК</div><div class="start-pills">' + [[28, "4 тижні"], [56, "8 тижнів"], [84, "12 тижнів"], [182, "6 місяців"]].map(([days, label]) => '<button type="button" class="start-pill' + (startDraft.goalDate === offset(today(), days) ? " active" : "") + '" data-start-horizon="' + days + '">' + label + '</button>').join("") + '</div><label class="start-field">Або своя дата<input data-field="goalDate" type="date" value="' + esc(startDraft.goalDate) + '"></label>'
      + '<details class="start-extra"' + (extraOpen ? " open" : "") + '><summary>Ще про мене <span>необов’язково</span></summary><div class="start-extra-body"><div class="start-two"><label class="start-field">Талія зараз<input data-field="waist" type="number" inputmode="decimal" min="30" max="250" placeholder="см" value="' + esc(startDraft.waist) + '"></label><label class="start-field">Стегна зараз<input data-field="hips" type="number" inputmode="decimal" min="30" max="300" placeholder="см" value="' + esc(startDraft.hips) + '"></label></div><label class="start-field">Що важливо врахувати?<select data-field="health"><option value="">Не обирати</option>' + [["beginner", "Починаю з нуля"], ["limits", "Маю обмеження для навантажень"], ["pregnancy", "Вагітність або грудне вигодовування"], ["medical", "Є діагноз чи лікувальне харчування"]].map(([id, label]) => '<option value="' + id + '"' + (startDraft.health === id ? " selected" : "") + '>' + label + '</option>').join("") + '</select></label><p>Якщо є медичні обмеження, застосунок не призначає автоматично дефіцит чи тренування.</p></div></details>'
      + '<div class="start-note">Заміри лишаються на твоєму пристрої. Можеш змінити їх пізніше в профілі.</div>';
  }
  if (step === 2) {
    const extraOpen = startDraft.meals || startDraft.workouts || startDraft.wish || startDraft.avoid || startDraft.workoutTime;
    body = '<div class="start-art" aria-hidden="true">🥗</div><h2>Як буде зручно тобі?</h2><p class="start-lead">Спосіб харчування — окремо від цілі. Будь-який вибір можна змінити.</p><div class="start-kicker">ХАРЧУВАННЯ</div>'
      + Object.entries(START_MODES).map(([id, [title, line, icon]]) => '<button type="button" class="start-mode' + (startDraft.mode === id ? " active" : "") + '" data-start-mode="' + id + '"><i>' + icon + '</i><span><b>' + title + '</b><small>' + line + '</small></span><u>✓</u></button>').join("")
      + '<div class="start-kicker">ЩО ХОЧУ ДОДАТИ?</div><div class="start-pills">' + Object.entries(START_PREFS).map(([id, label]) => '<button type="button" class="start-pill' + (startDraft.prefs.includes(id) ? " active" : "") + '" data-start-pref="' + id + '">' + label + '</button>').join("") + '</div>'
      + '<details class="start-extra"' + (extraOpen ? " open" : "") + '><summary>Налаштувати мій тиждень <span>необов’язково</span></summary><div class="start-extra-body"><div class="start-two"><label class="start-field">Прийомів їжі на день<select data-field="meals"><option value="">Як зручно</option>' + ["2", "3", "4", "5"].map(value => '<option' + (startDraft.meals === value ? " selected" : "") + '>' + value + '</option>').join("") + '</select></label><label class="start-field">Рух на тиждень<select data-field="workouts"><option value="">Поки не знаю</option>' + ["Без тренувань", "1–2 рази", "3–4 рази", "5+ разів"].map(value => '<option' + (startDraft.workouts === value ? " selected" : "") + '>' + value + '</option>').join("") + '</select></label></div><label class="start-field">Що хочу бачити в меню?<input data-field="wish" maxlength="100" placeholder="Наприклад, курка, паста, супи" value="' + esc(startDraft.wish) + '"></label><label class="start-field">Чого не пропонувати?<input data-field="avoid" maxlength="100" placeholder="Наприклад, риба або молочне" value="' + esc(startDraft.avoid) + '"></label><label class="start-field">Зручний час для тренувань<select data-field="workoutTime"><option value="">Неважливо</option>' + ["Ранок", "День", "Вечір"].map(value => '<option' + (startDraft.workoutTime === value ? " selected" : "") + '>' + value + '</option>').join("") + '</select></label></div></details>'
      + '<div class="start-note">Медичні обмеження, вагітність, діабет або історія РХП? Суворі режими й навантаження не призначаємо автоматично.</div>';
  }
  if (step === 3) {
    const name = startDraft.name.trim();
    const chips = [startTitle(), START_MODES[startDraft.mode][0]];
    if (startDraft.weight && startDraft.targetWeight) chips.push(startDraft.weight + " → " + startDraft.targetWeight + " кг");
    const activityNames = { seated: "Переважно сиджу", walks: "Часто гуляю", train: "Тренуюся 2–3 рази", active: "Дуже рухливі дні" };
    if (activityNames[startDraft.activity]) chips.push(activityNames[startDraft.activity]);
    if (startDraft.meals) chips.push(startDraft.meals + " прийоми їжі");
    if (startDraft.workouts) chips.push("Рух: " + startDraft.workouts);
    if (startDraft.wish.trim()) chips.push("У меню: " + startDraft.wish.trim());
    if (startDraft.avoid.trim()) chips.push("Без: " + startDraft.avoid.trim());
    if (startDraft.health) chips.push("Є важлива умова для плану");
    const plan = typeof computeSmartPlan === "function" ? computeSmartPlan(Object.assign({}, startDraft, { kind: startKind(), title: startTitle() })) : null;
    body = '<div class="start-hero"><span>ТВІЙ ПЛАН · ПІД ЦЮ ЦІЛЬ</span><h3>' + esc(startTitle()) + '</h3><p>' + esc(name ? name + ", ось старт, з якого можна жити. Цифри можна змінити." : "Ось старт, з якого можна жити. Цифри можна змінити.") + '</p><div class="start-meter"><i></i><i></i><i></i><i></i><i></i><i></i><i></i></div></div>'
      + (plan && typeof smartPlanBody === "function" ? smartPlanBody(plan) : "")
      + '<section><h3 style="font-size:13px;margin:16px 0 8px">Що ми врахували</h3><div class="start-chips">' + chips.map(label => '<span>' + esc(label) + '</span>').join("") + '</div></section>';
  }
  const html = '<div class="start-shell"><div class="start-scroll"><div class="start-step"><span>' + labels[step][0] + '</span><span>' + labels[step][1] + '</span></div><div class="start-track">' + startStepMarks() + '</div>' + body + '</div><div class="start-foot">' + (step ? '<button type="button" class="start-back" data-start-back>← Назад</button>' : '') + '<button type="button" data-start-next class="' + (step === 3 ? "lime" : "") + '">' + next + '</button></div></div>';
  openModal("МІЙ СТАРТ / " + (step + 1) + " / 4", html);
  $("modal").classList.add("start-flow");
}

function openStartFlow() {
  state.needsSetup = true;
  paintStart();
}

function finishStart() {
  readStartFields();
  const kind = startKind();
  const template = GOAL_TEMPLATES[kind] || GOAL_TEMPLATES.form;
  const start = today();
  let end = months(start, startDraft.goal === "firstmonth" ? 1 : 3);
  if (validDate(startDraft.goalDate) && startDraft.goalDate >= start && diff(start, startDraft.goalDate) <= 730) end = startDraft.goalDate;
  const habits = (template.habits || []).filter(id => HABITS[id]);
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
      days: id === "strength" ? [1, 3, 5] : [0, 1, 2, 3, 4, 5, 6],
      label: SUPPORT_DEFINITIONS[id].name,
      automatic: !!SUPPORT_DEFINITIONS[id].auto
    }]))
  };
  const minutes = { "Без тренувань": 0, "1–2 рази": 90, "3–4 рази": 180, "5+ разів": 250 };
  const activity = { seated: "seated", walks: "walks", train: "train3", active: "physical" };
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
    weekStudio: previous.weekStudio
  } : { logs: {}, favorites: [], customFoods: [] };
  state = {
    version: 1,
    demo: false,
    needsSetup: false,
    profile: {
      name: startDraft.name.trim().slice(0, 40),
      age: startRange(startDraft.age, 14, 100),
      height: startRange(startDraft.height, 100, 250),
      weight: startRange(startDraft.weight, 25, 300),
      targetWeight: startRange(startDraft.targetWeight, 25, 300),
      sex: startDraft.sex === "female" || startDraft.sex === "male" ? startDraft.sex : "",
      activityLevel: activity[startDraft.activity] || "unknown"
    },
    settings: {
      calories: null,
      steps: 8000,
      sleep: 8,
      style: startDraft.mode === "keto" ? "keto" : "balanced",
      fasting: startDraft.mode === "fasting",
      motion: true,
      weeklyMinutes: Object.prototype.hasOwnProperty.call(minutes, startDraft.workouts) ? minutes[startDraft.workouts] : null
    },
    goals: [goal].concat(keepGoals).slice(0, 30),
    active: goal.id,
    logs: carried.logs,
    favorites: carried.favorites,
    fastingStart: null,
    customFoods: carried.customFoods,
    startChoices: {
      goal: startDraft.goal,
      custom: startDraft.custom.trim(),
      mode: startDraft.mode,
      prefs: [...startDraft.prefs],
      meals: startDraft.meals,
      workouts: startDraft.workouts,
      wish: startDraft.wish.trim(),
      avoid: startDraft.avoid.trim(),
      workoutTime: startDraft.workoutTime,
      waist: startRange(startDraft.waist, 30, 250),
      hips: startRange(startDraft.hips, 30, 300),
      health: startDraft.health,
      sex: startDraft.sex === "female" || startDraft.sex === "male" ? startDraft.sex : "",
      goalDate: validDate(startDraft.goalDate) ? startDraft.goalDate : ""
    }
  };
  if (carried.recipeExtras) state.recipeExtras = carried.recipeExtras;
  if (carried.smartMeta) state.smartMeta = carried.smartMeta;
  if (carried.weekStudio) state.weekStudio = carried.weekStudio;
  selectedDate = start;
  monthView = start.slice(0, 7);
  if (typeof computeSmartPlan === "function" && typeof applySmartPlan === "function") {
    applySmartPlan(computeSmartPlan(Object.assign({}, startDraft, { kind: kind, title: goal.title })), { fresh: true });
  }
  persist();
  $("modal").classList.remove("start-flow");
  closeUnlocked();
  try { render(); } catch (error) {}
  finishingSetup = false;
  toast(state.settings.calories ? "План збережено: близько " + num(state.settings.calories) + " ккал на день." : "План збережено. День поки порожній.");
}

document.addEventListener("click", event => {
  if (!$("modal").classList.contains("start-flow")) return;
  const goal = event.target.closest("[data-start-goal]");
  const mode = event.target.closest("[data-start-mode]");
  const pref = event.target.closest("[data-start-pref]");
  const sex = event.target.closest("[data-start-sex]");
  const horizon = event.target.closest("[data-start-horizon]");
  const next = event.target.closest("[data-start-next]");
  const back = event.target.closest("[data-start-back]");
  if (!goal && !mode && !pref && !sex && !horizon && !next && !back) return;
  readStartFields();
  if (goal) {
    startDraft.goal = goal.dataset.startGoal;
    startDraft.custom = "";
    paintStart();
  }
  if (mode) {
    startDraft.mode = mode.dataset.startMode;
    paintStart();
  }
  if (pref) {
    const id = pref.dataset.startPref;
    startDraft.prefs = startDraft.prefs.includes(id) ? startDraft.prefs.filter(item => item !== id) : startDraft.prefs.concat(id);
    paintStart();
  }
  if (sex) {
    startDraft.sex = sex.dataset.startSex;
    paintStart();
  }
  if (horizon) {
    startDraft.goalDate = offset(today(), Number(horizon.dataset.startHorizon));
    paintStart();
  }
  if (back) {
    startDraft.step = Math.max(0, startDraft.step - 1);
    paintStart();
  }
  if (next) {
    if (startDraft.step === 1 && startDraft.sex !== "female" && startDraft.sex !== "male") {
      toast("Обери жіночу або чоловічу стать, щоб іти далі.");
      return;
    }
    if (startDraft.step < 3) {
      startDraft.step += 1;
      paintStart();
    } else finishStart();
  }
});

document.addEventListener("input", event => {
  const field = event.target && event.target.dataset && event.target.dataset.field;
  if (!field) return;
  readStartFields();
  if (field === "custom") {
    $("modalBody").querySelectorAll("[data-start-goal]").forEach(button => button.classList.remove("active"));
  }
});

const namedHome = homeApp;
homeApp = function () {
  const html = namedHome();
  if (state.profile && !String(state.profile.name || "").trim()) return html.replace("Привіт, .", "Привіт.");
  return html;
};
