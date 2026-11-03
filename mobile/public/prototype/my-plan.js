/* «Мій план»: the screen right after the answers and the same screen later.
   One body (myPlanBody) renders the energy guide with its assumptions, seven days of concrete
   meals, the movement week, today, and the 2–3 reasons. "Почати мій план" turns the draft into
   state.myPlan, writes the compatibility data the week studio and the training week already read,
   and never writes a diary row. Later: edit one condition → see what changes → confirm; a saved
   week is replaced only by an explicit choice; history keeps a way back. */

const MY_PLAN_EDITS = {
  weight: { label: "Вага зараз", group: "Про мене" },
  targetWeight: { label: "Бажана вага", group: "Про мене" },
  deadline: { label: "Строк", group: "Про мене" },
  dailyActivity: { label: "Буденний рух", group: "Про мене" },
  meals: { label: "Прийоми їжі", group: "Їжа" },
  mode: { label: "Режим", group: "Їжа" },
  cookTime: { label: "Час на готування", group: "Їжа" },
  budget: { label: "Бюджет", group: "Їжа" },
  exclude: { label: "Чого не пропонувати", group: "Їжа" },
  allergies: { label: "Алергії", group: "Їжа" },
  likes: { label: "Що люблю", group: "Їжа" },
  wants: { label: "Хочу тренуватися?", group: "Рух" },
  days: { label: "Днів на тиждень", group: "Рух" },
  minutes: { label: "Тривалість", group: "Рух" },
  gear: { label: "Обладнання", group: "Рух" },
  formats: { label: "Формати", group: "Рух" },
  weekdays: { label: "Зручні дні", group: "Рух" },
  intensity: { label: "Інтенсивність", group: "Рух" },
  limits: { label: "Обмеження", group: "Рух" }
};

let myPlanEdit = null; // { key, preview }

/* ---------- storage: the new top-level fields survive validateState and a backup ---------- */

const originalPlanValidation = validateState;
validateState = function (data, options) {
  const out = originalPlanValidation(data, options);
  if (data.myPlan && typeof data.myPlan === "object" && data.myPlan.version === 1) {
    try { const text = JSON.stringify(data.myPlan); if (text.length <= 400000) out.myPlan = JSON.parse(text); } catch (error) {}
  }
  if (Array.isArray(data.planHistory)) {
    try { const text = JSON.stringify(data.planHistory.slice(0, 60)); if (text.length <= 800000) out.planHistory = JSON.parse(text); } catch (error) {}
  }
  if (data.startDraft && typeof data.startDraft === "object" && data.startDraft.answers) {
    try { const text = JSON.stringify(data.startDraft); if (text.length <= 200000) out.startDraft = JSON.parse(text); } catch (error) {}
  }
  const reminder = data.settings && data.settings.weighReminder;
  out.settings.weighReminder = reminder && typeof reminder === "object"
    ? { enabled: !!reminder.enabled, everyDays: [7, 14].includes(Number(reminder.everyDays)) ? Number(reminder.everyDays) : 7, time: /^([01]\d|2[0-3]):[0-5]\d$/.test(reminder.time || "") ? reminder.time : "08:00" }
    : { enabled: false, everyDays: 7, time: "08:00" };
  return out;
};

function myPlanActive() {
  return state.myPlan && state.myPlan.version === 1 && state.myPlan.status === "active" ? state.myPlan : null;
}

function myPlanStale(plan) {
  const start = plan && plan.food && plan.food.start;
  return !validDate(start) || start > today() || diff(start, today()) >= 7;
}

function myPlanRecipe(id) { return RECIPES.find(recipe => recipe.id === id); }

/* ---------- rendering ---------- */

function myPlanMeal(meal, date, index, mode) {
  const recipe = myPlanRecipe(meal.id);
  if (!recipe) return "";
  const logged = state.logs && state.logs[date] && Array.isArray(state.logs[date].meals) && state.logs[date].meals.some(x => x.name === recipe.title);
  const actions = mode === "active"
    ? '<div class="mp-meal-actions"><button type="button" data-action="week-recipe" data-id="' + recipe.id + '" data-servings="' + meal.servings + '">Рецепт ↗</button><button type="button" data-action="week-swap" data-date="' + date + '" data-index="' + index + '">Замінити ↻</button>' + (date <= today() ? '<button type="button" data-action="week-log" data-date="' + date + '" data-id="' + recipe.id + '" data-servings="' + meal.servings + '">' + (logged ? "✓ У щоденнику" : "Внести після їжі +") + '</button>' : '') + '</div>'
    : "";
  return '<article class="mp-meal"><div class="mp-meal-head"><small>' + esc(meal.name) + ' · ' + recipe.minutes + ' хв</small><strong>' + esc(recipe.title) + '</strong><em>≈ ' + num(meal.kcal) + ' ккал · ' + num(meal.servings, 1) + ' порц. · Б ' + num(meal.p) + ' · Ж ' + num(meal.f) + ' · В ' + num(meal.c) + '</em>' + (meal.reasons && meal.reasons.length ? '<span>' + esc(meal.reasons.join(" · ")) + '</span>' : '') + '</div>' + actions + '</article>';
}

function myPlanDay(day, dayIndex, plan, mode, open) {
  const session = plan.move.sessions.find(s => s.date === day.date);
  const weekday = PlanEngine.WEEKDAY_NAMES[dt(day.date).getUTCDay()];
  const sessionLine = session ? '🏃 ' + esc(session.name) + (/\d+\s*хв/.test(session.name) ? '' : ' · ' + session.minutes + ' хв') : 'відпочинок від тренувань';
  const head = '<summary><span>' + esc(weekday) + ' · ' + fdate(day.date) + (day.date === today() ? ' · сьогодні' : '') + '</span><strong>' + (day.target ? '≈ ' + num(day.sum.kcal) + ' із ' + num(day.target) + ' ккал' : '≈ ' + num(day.sum.kcal) + ' ккал · без норми') + '</strong><em>' + sessionLine + '</em></summary>';
  const added = session && session.kcal ? Math.round(session.kcal / 10) * 10 : 0;
  return '<details class="mp-day"' + (open ? " open" : "") + '>' + head + '<div class="mp-day-body">' + day.meals.map((meal, index) => myPlanMeal(meal, day.date, index, mode)).join("") + '<p class="mp-day-sum">Разом: ' + num(day.sum.kcal) + ' ккал · Б ' + num(day.sum.p) + ' г · Ж ' + num(day.sum.f) + ' г · В ' + num(day.sum.c) + ' г' + (added ? ' · день із тренуванням, +' + num(added) + ' ккал' : '') + '</p></div></details>';
}

function myPlanSession(session, mode) {
  const place = { home: "вдома", gym: "у залі", outdoor: "надворі" }[session.place] || "";
  return '<article class="mp-session"><div><small>' + esc(session.weekdayName) + ' · ' + fdate(session.date) + '</small><strong>' + esc(session.name) + '</strong><em>' + session.minutes + ' хв · ' + place + ' · ' + esc(PlanEngine.GEAR[session.gear] || "без інвентарю").toLowerCase() + '</em>' + (session.reasons.length ? '<span>' + esc(session.reasons.join(" · ")) + '</span>' : '') + '</div>' + (mode === "active" ? '<button type="button" data-action="training-open" data-id="' + session.id + '">Відкрити ↗</button>' : '') + '</article>';
}

function myPlanToday(plan) {
  const day = plan.food.days.find(d => d.date === today());
  const session = plan.move.sessions.find(s => s.date === today());
  if (!day && !session) return "";
  const sessionText = session ? '🏃 ' + esc(session.name) + (/\d+\s*хв/.test(session.name) ? '. ' : ' · ' + session.minutes + ' хв. ') + esc(session.stopRule || "") : 'Сьогодні без тренування — це частина плану, не пропуск.';
  return '<section class="mp-today"><span>СЬОГОДНІ</span>' + (day ? '<ul>' + day.meals.map(meal => { const recipe = myPlanRecipe(meal.id); return '<li><small>' + esc(meal.name) + '</small> ' + esc(recipe ? recipe.title : meal.id) + ' <b>≈ ' + num(meal.kcal) + '</b></li>'; }).join("") + '</ul>' : '') + '<p>' + sessionText + '</p><p class="mp-fine">Заплановане ≠ з’їдене ≠ зроблене: у щоденник потрапляє лише те, що ти внесеш сама / сам.</p></section>';
}

function myPlanShortages(plan, mode) {
  if (!plan.food.shortages.length && !plan.move.relax.length) return "";
  const food = plan.food.shortages.map(s => '<div class="mp-short"><b>' + ({ breakfast: "Сніданок", lunch: "Обід", dinner: "Вечеря", snack: "Перекус" }[s.slot] || s.slot) + ': лише ' + s.distinct + ' ' + (s.distinct === 1 ? "страва" : "страви") + ' під твої умови.</b>' + (s.options.length ? '<p>Що послабити:</p><div class="start-pills">' + s.options.slice(0, 4).map(o => '<button type="button" class="start-pill" data-myplan-relax="' + esc(o.key) + '">' + esc(o.label) + ' <i>+' + o.restores + '</i></button>').join("") + '</div>' : '<p>М’яких умов для послаблення немає — план коротший.</p>') + '</div>').join("");
  const move = plan.move.relax.length ? '<div class="mp-short"><b>Жодна програма не пройшла під обладнання й формати.</b><p>' + plan.move.relax.map(o => esc(o.label) + " (+" + o.restores + ")").join(", ") + '. Зміни одну умову нижче.</p></div>' : "";
  return '<section class="mp-block"><h3>Рецептів замало</h3><p class="mp-lead">Жорсткі умови (алергії, «ніколи», обладнання) не послаблюємо. Нижче — лише м’які.</p>' + food + move + '</section>';
}

function myPlanHero(plan, mode) {
  const name = String(plan.answers.body.name || "").trim();
  const title = typeof goal === "function" && mode === "active" ? goal().title : (typeof startTitle === "function" ? startTitle() : "Мій план");
  const dates = fdate(plan.food.start) + " — " + fdate(offset(plan.food.start, Math.max(0, (plan.food.days.length || 7) - 1)));
  return '<div class="start-hero"><span>МІЙ ПЛАН · ' + esc(title).toUpperCase() + '</span><h3>' + esc(name ? name + ", ось план, з якого можна жити." : "Ось план, з якого можна жити.") + '</h3><p>' + esc(dates) + ' · правила ' + esc(plan.rulesVersion) + ' · розрахунок ' + esc(plan.energyVersion || "—") + '. Будь-яку страву можна замінити, будь-яку умову — змінити окремо.</p></div>';
}

function myPlanShopping(plan) {
  if (typeof RECIPE_INGREDIENTS === "undefined" || !plan.food.days.length) return "";
  const items = {};
  for (const day of plan.food.days) for (const meal of day.meals) {
    const recipe = myPlanRecipe(meal.id);
    if (!recipe) continue;
    for (const part of recipe.ingredients) {
      const meta = RECIPE_INGREDIENTS[part.id] || { name: part.id, unit: "г", aisle: "Інше" };
      if (!items[part.id]) items[part.id] = { name: meta.name, unit: meta.unit || "г", aisle: meta.aisle || "Інше", qty: 0 };
      items[part.id].qty += part.qty * meal.servings;
    }
  }
  const list = Object.values(items).sort((a, b) => a.aisle < b.aisle ? -1 : a.aisle > b.aisle ? 1 : a.name < b.name ? -1 : 1);
  if (!list.length) return "";
  const rows = list.map(item => "<li><small>" + esc(item.aisle) + "</small> " + esc(item.name) + " <b>" + (typeof quantity === "function" ? quantity(item.qty) : Math.round(item.qty)) + " " + esc(item.unit) + "</b></li>").join("");
  return '<details class="mp-shop"><summary>Список покупок · ' + list.length + '</summary><ul>' + rows + '</ul><p class="mp-fine">З інгредієнтів плану. Вже з’їдене в щоденнику цей список не змінює.</p></details>';
}

function myPlanBody(plan, options) {
  const mode = options && options.mode || "active";
  const compat = computeSmartPlan(plan.answers, { move: plan.move });
  const todayIndex = plan.food.days.findIndex(d => d.date === today());
  const foodDays = plan.food.days.map((day, index) => myPlanDay(day, index, plan, mode, index === Math.max(0, todayIndex))).join("");
  const moveBlock = plan.move.sessions.length
    ? plan.move.sessions.map(s => myPlanSession(s, mode)).join("") + '<p class="mp-day-sum">Відпочинок: ' + plan.move.restDays.map(d => PlanEngine.WEEKDAY_NAMES[d]).join(", ") + (plan.move.steps ? ' · кроки ≈ ' + num(plan.move.steps) + ' на день, без штрафу' : '') + '</p>'
    : '<p class="mp-lead">' + esc(plan.move.notes[0] || "Тренувань у плані немає.") + (plan.move.steps ? ' Кроки ≈ ' + num(plan.move.steps) + ' на день — орієнтир, не норма.' : '') + '</p>';
  const notes = plan.move.notes.length && plan.move.sessions.length ? '<p class="mp-fine">' + esc(plan.move.notes.join(" ")) + '</p>' : "";
  const stop = plan.move.sessions.length ? '<p class="mp-fine">Правило зупинки: біль, запаморочення чи різке погіршення самопочуття — зупинись. Заміна заняття прогулянкою — не провал.</p>' : "";
  const reasons = '<section class="mp-block"><h3>Чому так</h3><ol class="mp-reasons">' + plan.reasons.map(r => '<li>' + esc(r) + '</li>').join("") + '</ol></section>';
  const health = plan.answers.health.private === false && Object.entries(plan.answers.health).some(([key, value]) => value === true && !["private", "skipped"].includes(key))
    ? '<p class="mp-fine">Враховано зі здоров’я: ' + esc(START_HEALTH.filter(([key]) => plan.answers.health[key]).map(([, label]) => label).join(", ")) + '.</p>'
    : (Object.entries(plan.answers.health).some(([key, value]) => value === true && !["private", "skipped"].includes(key)) ? '<p class="mp-fine">Відповіді про здоров’я враховано й приховано на твоє прохання.</p>' : "");
  return myPlanHero(plan, mode)
    + '<section class="mp-block"><h3>Орієнтир енергії</h3>' + smartPlanBody(compat) + health + '</section>'
    + myPlanToday(plan)
    + '<section class="mp-block"><h3>Їжа на ' + plan.food.days.length + ' ' + (plan.food.days.length === 7 ? "днів" : "дні") + '</h3><p class="mp-lead">Порції зібрано під орієнтир; день із тренуванням щільніший на одне заняття. Повторів: ' + plan.food.repeats + '.</p>' + foodDays + myPlanShopping(plan) + '</section>'
    + '<section class="mp-block"><h3>Рух на тиждень</h3>' + moveBlock + notes + stop + '</section>'
    + reasons
    + myPlanShortages(plan, mode);
}

/* ---------- compatibility: week studio and training week read the same plan ---------- */

function myPlanWriteWeek(plan) {
  if (typeof weekStudio === "undefined") return;
  const a = plan.answers;
  if (plan.food.days.length !== 7) {
    weekStudio = null;
    state.weekStudio = null;
    try { localStorage.removeItem(WEEK_STUDIO_KEY); } catch (error) {}
    return;
  }
  const avoid = [...new Set(a.food.allergies.filter(x => x !== "unsure").concat(a.food.exclude.never, a.food.exclude.week))].filter(key => typeof WEEK_AVOID !== "undefined" && WEEK_AVOID[key]);
  weekStudio = {
    version: 2,
    start: plan.food.start,
    created: today(),
    goalId: goal().id,
    purpose: plan.energy && plan.energy.purpose || "maintain",
    days: plan.food.days.map(day => ({ date: day.date, target: day.target, meals: day.meals.map(m => ({ id: m.id, servings: m.servings })) })),
    prefs: { meals: plan.food.days[0].meals.length, maxTime: a.food.cookTime || 0, likes: "mixed", pantry: a.food.pantry.slice(), avoid, individual: false, trainingPlace: plan.move.sessions[0] ? plan.move.sessions[0].place : "home", trainingLikes: typeof trainingPrefs !== "undefined" ? trainingPrefs.likes : "mixed", trainingGear: typeof trainingPrefs !== "undefined" ? trainingPrefs.gear : "none", trainingLevel: typeof trainingPrefs !== "undefined" ? trainingPrefs.level : "beginner", trainingFrequency: plan.move.sessions.length, trainingTime: a.move.minutes, medical: !plan.move.prescribed && a.move.wants !== "no" },
    target: plan.energy && plan.energy.ok ? plan.energy.target : null,
    maintenance: plan.energy && plan.energy.ok ? plan.energy.maintenance : null,
    rate: plan.energy && plan.energy.rateKg || null,
    energyNotice: "Меню зібрано «Моїм планом» з твоїх відповідей.",
    profile: Object.assign({}, state.profile),
    training: plan.move.sessions.map(s => ({ date: s.date, id: s.id })),
    source: "my-plan",
    names: plan.food.names
  };
  weekSave();
}

function myPlanWriteTraining(plan) {
  if (typeof trainingPrefs === "undefined") return;
  const count = plan.move.sessions.length;
  if (count >= 2 && count <= 5) {
    trainingPrefs.frequency = count;
    trainingPrefs.setup = true;
    try {
      localStorage.setItem(TRAINING_PREF_KEY, JSON.stringify(trainingPrefs));
      const signature = JSON.stringify(["goal", "likes", "place", "gear", "level", "time", "frequency", "limitations"].map(k => trainingPrefs[k]));
      localStorage.setItem(TRAINING_WEEK_KEY, JSON.stringify({ start: plan.food.start, signature, slots: plan.move.sessions.map(s => ({ date: s.date, id: s.id })) }));
    } catch (error) {}
  } else {
    try { localStorage.removeItem(TRAINING_WEEK_KEY); } catch (error) {}
  }
}

function myPlanSnapshot(plan) {
  return { version: plan.version, rulesVersion: plan.rulesVersion, energyVersion: plan.energyVersion, created: plan.created, startedOn: plan.startedOn, answers: plan.answers, food: plan.food, move: plan.move, reasons: plan.reasons, energy: plan.energy };
}

/* Make a built plan the active one. Diary is never touched. */
function startMyPlan(plan, options) {
  const opts = options || {};
  const previous = myPlanActive();
  if (previous && !opts.silentHistory) planHistoryAdd({ kind: "plan", title: "Тиждень від " + fdate(previous.food.start) + (opts.reason ? " · замінено: " + opts.reason : ""), snapshot: myPlanSnapshot(previous), rollback: true });
  const list = planHistoryList();
  let kept = 0;
  list.forEach(entry => { if (entry.snapshot) { kept++; if (kept > 4) delete entry.snapshot; } });
  state.myPlan = Object.assign({}, plan, { status: "active", startedOn: previous && previous.startedOn && !opts.fresh ? previous.startedOn : today(), reviews: previous && previous.reviews && !opts.fresh ? previous.reviews : {} });
  state.startChoices = Object.assign(PlanEngine.normalizeAnswers(plan.answers), { meta: Object.assign({}, state.startChoices && state.startChoices.meta || {}, plan.answers.meta || {}) });
  if (state.profile) {
    const b = plan.answers.body;
    if (b.weight) state.profile.weight = String(b.weight);
    if (b.age) state.profile.age = String(b.age);
    if (b.height) state.profile.height = String(b.height);
    state.profile.targetWeight = plan.answers.goal.targetWeight ? String(plan.answers.goal.targetWeight) : "";
    if (b.sex === "male" || b.sex === "female") state.profile.sex = b.sex;
  }
  applySmartPlan(computeSmartPlan(state.startChoices), { fresh: true, reason: opts.reason || (opts.fresh ? "перший розрахунок" : "оновлення плану") });
  myPlanWriteTraining(state.myPlan);
  myPlanWriteWeek(state.myPlan);
  if (!previous || opts.fresh) planHistoryAdd({ kind: "plan", title: "Почато план від " + fdate(plan.food.start), target: plan.energy && plan.energy.target || null });
  persist();
}

/* ---------- the live screen ---------- */

function openMyPlan() {
  const plan = myPlanActive();
  const scroller = document.querySelector(".plan-scroll");
  const keep = scroller ? scroller.scrollTop : 0;
  let html;
  if (!plan) {
    html = '<div class="start-hero"><span>МІЙ ПЛАН</span><h3>Плану ще немає.</h3><p>Коротка анкета — і буде орієнтир енергії, сім днів страв і рух на твоєму обладнанні.</p></div>' + (state.dayPlan ? '<section class="mp-block"><h3>Орієнтир енергії</h3>' + smartPlanBody(state.dayPlan) + '</section>' : '') + '<button type="button" class="mp-wide primary" data-action="start-continue">' + (startHasDraft() ? "Продовжити анкету ↗" : "Скласти мій план ↗") + '</button>';
  } else {
    const stale = myPlanStale(plan);
    const drift = state.dayPlan && state.dayPlan.calories && plan.energy && plan.energy.ok && Math.abs(state.dayPlan.calories - plan.energy.target) >= 80;
    const banner = stale ? '<div class="mp-alert"><b>Цей тиждень завершився.</b> Новий збирається лише за твоєю згодою — поточний лишається в історії.<button type="button" data-myplan-next>Зібрати наступний тиждень ↗</button></div>'
      : drift ? '<div class="mp-alert"><b>Орієнтир тепер ' + num(state.dayPlan.calories) + ' ккал</b>, а меню зібрано під ' + num(plan.energy.target) + '. Можна лишити як є або перезібрати порції.<button type="button" data-myplan-next>Перезібрати під нову цифру ↗</button></div>' : "";
    html = banner + myPlanBody(plan, { mode: "active" }) + myPlanEditBlock(plan) + myPlanReviewBlock(plan) + myPlanWeighBlock() + myPlanHistoryBlock() + '<p class="mp-fine"><button type="button" class="text-btn" data-action="start-continue">Пройти анкету заново</button> — лише якщо змінилось багато. Одну умову краще міняти вище.</p>';
  }
  openModal("МІЙ ПЛАН", '<div class="plan-page"><div class="plan-scroll">' + html + '</div></div>');
  $("modal").classList.remove("start-flow");
  $("modal").classList.add("plan-sheet");
  const next = document.querySelector(".plan-scroll");
  if (next && keep) next.scrollTop = keep;
}

function myPlanEditBlock(plan) {
  const groups = {};
  Object.entries(MY_PLAN_EDITS).forEach(([key, item]) => { (groups[item.group] = groups[item.group] || []).push('<button type="button" class="start-pill' + (myPlanEdit && myPlanEdit.key === key ? " active" : "") + '" data-myplan-edit="' + key + '">' + item.label + '</button>'); });
  const form = myPlanEdit ? myPlanEditForm(myPlanEdit.key) : "";
  return '<section class="mp-block" id="mpEdit"><h3>Змінити одну умову</h3><p class="mp-lead">Без повторної анкети. Спочатку покажемо, що зміниться, потім спитаємо.</p>' + Object.entries(groups).map(([title, items]) => sKicker(title.toUpperCase()) + '<div class="start-pills">' + items.join("") + '</div>').join("") + form + '</section>';
}

function myPlanEditForm(key) {
  const a = startDraft.answers;
  let body = "";
  if (key === "weight") body = sField("Вага зараз, кг", "body.weight", 'type="number" inputmode="decimal" min="25" max="300" step="0.1"');
  if (key === "targetWeight") body = sField("Бажана вага, кг (порожньо — без цілі по вазі)", "goal.targetWeight", 'type="number" inputmode="decimal" min="25" max="300" step="0.1"');
  if (key === "deadline") body = sField("Дата (лише перевіряє реалістичність)", "goal.deadline", 'type="date"');
  if (key === "dailyActivity") body = sPills("body.dailyActivity", Object.entries(EnergyCalc.DAILY_ACTIVITY).map(([id, item]) => [id, item.label]));
  if (key === "meals") body = sPills("food.meals", [[2, "2 прийоми"], [3, "3 прийоми"], [4, "4 і більше"]]) + '<label class="start-check"><input type="checkbox" data-field="food.snacks"' + (a.food.snacks ? " checked" : "") + '><span>Є перекуси між прийомами</span></label>';
  if (key === "mode") body = sPills("food.mode", Object.entries(START_FOOD_MODES).map(([id, [title]]) => [id, title]));
  if (key === "cookTime") body = sPills("food.cookTime", [[15, "до 15 хв"], [30, "до 30 хв"], [60, "до години"], [0, "неважливо"]]);
  if (key === "budget") body = sPills("food.budget", [["low", "Економно"], ["mid", "Середньо"], ["any", "Не обмежую"]]);
  if (key === "exclude") body = '<div class="start-exclude-list">' + START_EXCLUDE.map(startExcludeRow).join("") + '</div>';
  if (key === "allergies") body = sPills("food.allergies", START_ALLERGENS.concat([["unsure", "Не впевнена / не впевнений"]]), true);
  if (key === "likes") body = sPills("food.likes", START_LIKES.map(k => [k, sGroupLabel(k)]), true) + sField("Улюблені страви своїми словами", "food.likesText", 'maxlength="100"');
  if (key === "wants") body = sPills("move.wants", [["yes", "Так"], ["light", "Лише легкий рух"], ["no", "Ні"]]);
  if (key === "days") body = sPills("move.days", [[1, "1"], [2, "2"], [3, "3"], [4, "4"], [5, "5"]]);
  if (key === "minutes") body = sPills("move.minutes", [[15, "15 хв"], [20, "20 хв"], [30, "30 хв"], [45, "45 хв"], [60, "60 хв"]]);
  if (key === "gear") body = sPills("move.gear", Object.entries(PlanEngine.GEAR), true);
  if (key === "formats") body = sKicker("ПОДОБАЄТЬСЯ") + sPills("move.like", Object.entries(PlanEngine.FORMATS).map(([id, item]) => [id, item.label]), true) + sKicker("НЕ ХОЧУ") + sPills("move.dislike", Object.entries(PlanEngine.FORMATS).map(([id, item]) => [id, item.label]), true);
  if (key === "weekdays") body = sPills("move.weekdays", START_WEEKDAYS, true);
  if (key === "intensity") body = sPills("move.intensity", [["easy", "М’яко"], ["moderate", "Помірно"], ["hard", "Щільно"]]);
  if (key === "limits") body = sPills("move.limits", Object.entries(PlanEngine.LIMIT_RULES).map(([id, item]) => [id, item.label]), true);
  const preview = myPlanEdit.preview ? myPlanDiff(myPlanActive(), myPlanEdit.preview) : "";
  return '<div class="mp-edit"><b>' + esc(MY_PLAN_EDITS[key].label) + '</b>' + body + '<div class="mp-edit-actions"><button type="button" class="primary" data-myplan-preview>Показати, що зміниться</button><button type="button" data-myplan-cancel>Скасувати</button></div>' + preview + '</div>';
}

function myPlanDiff(current, next) {
  const lines = [];
  const t0 = current.energy && current.energy.target, t1 = next.energy && next.energy.target;
  if (t0 !== t1) lines.push("Орієнтир: " + (t0 ? num(t0) : "—") + " → " + (t1 ? num(t1) : "—") + " ккал.");
  else lines.push("Орієнтир не змінюється: " + (t1 ? num(t1) + " ккал" : "без цифри") + ".");
  const changedMeals = next.food.days.reduce((count, day, i) => count + day.meals.filter((m, j) => !current.food.days[i] || !current.food.days[i].meals[j] || current.food.days[i].meals[j].id !== m.id || current.food.days[i].meals[j].servings !== m.servings).length, 0);
  const totalMeals = next.food.days.reduce((count, day) => count + day.meals.length, 0);
  lines.push("Страв зміниться: " + changedMeals + " із " + totalMeals + (next.food.days.length !== current.food.days.length ? " · днів у плані: " + current.food.days.length + " → " + next.food.days.length : "") + ".");
  const s0 = current.move.sessions.map(s => s.weekdayName + ": " + s.name), s1 = next.move.sessions.map(s => s.weekdayName + ": " + s.name);
  lines.push(JSON.stringify(s0) === JSON.stringify(s1) ? "Рух лишається тим самим." : "Рух: " + (s1.length ? s1.join("; ") : "без тренувань") + ".");
  if (next.food.shortages.length) lines.push("Увага: під нові умови рецептів замало для " + next.food.shortages.map(s => s.slot).join(", ") + ".");
  return '<div class="mp-diff"><b>Що зміниться</b><ul>' + lines.map(l => '<li>' + esc(l) + '</li>').join("") + '</ul><div class="mp-edit-actions"><button type="button" class="primary" data-myplan-apply="week">Оновити план і тиждень</button><button type="button" data-myplan-apply="energy">Лише орієнтир, тиждень лишити</button></div><p class="mp-fine">Поточний тиждень піде в історію — його можна повернути.</p></div>';
}

/* ---------- weekly review: transparent rules on the person's own records ---------- */

function myPlanReview(plan) {
  if (!plan || !plan.startedOn) return null;
  const since = plan.startedOn;
  const days = diff(since, today());
  if (days < 7) return null;
  const weekIndex = Math.floor(days / 7);
  if (plan.reviews && plan.reviews[weekIndex]) return null;
  const from = offset(today(), -Math.min(14, days));
  const dates = [];
  for (let d = from; d <= today(); d = offset(d, 1)) dates.push(d);
  const withMeals = dates.filter(d => state.logs[d] && Array.isArray(state.logs[d].meals) && state.logs[d].meals.length);
  const complete = withMeals.filter(d => state.logs[d].nutritionComplete || state.logs[d].meals.length >= 3);
  const avg = complete.length ? Math.round(complete.reduce((sum, d) => sum + totals(d).kcal, 0) / complete.length) : 0;
  const target = plan.energy && plan.energy.ok ? plan.energy.target : 0;
  const planned = plan.move.sessions.filter(s => s.date <= today());
  const done = planned.filter(s => state.logs[s.date] && Array.isArray(state.logs[s.date].workouts) && state.logs[s.date].workouts.length);
  const base = { weekIndex, days: dates.length, records: withMeals.length, complete: complete.length, avg, target, planned: planned.length, done: done.length };
  if (withMeals.length < 4) return Object.assign(base, { noticed: "Записів їжі мало: " + withMeals.length + " із " + dates.length + " днів.", data: "дні з хоча б одним записом у щоденнику", action: null, text: "Відсутній запис не означає, що ти не їла / не їв. Орієнтир і меню не чіпаємо. Якщо зручно — записуй хоча б один прийом на день.", decline: "Гаразд" });
  if (planned.length >= 2 && done.length / planned.length < 0.5 && plan.answers.move.days > 1) return Object.assign(base, { noticed: "З " + planned.length + " запланованих занять у щоденнику є " + done.length + ".", data: "тренування в щоденнику у дні плану", action: "fewer-days", actionLabel: "Зменшити до " + (plan.answers.move.days - 1) + " на тиждень", text: "План має бути здійсненним, а не ідеальним. Менше занять, які відбуваються, краще за більше на папері. Повернути можна будь-коли.", decline: "Лишити як є" });
  if (target && complete.length >= 4 && avg > target + 250) return Object.assign(base, { noticed: "У дні з повними записами виходило ≈ " + num(avg) + " ккал при орієнтирі " + num(target) + ".", data: complete.length + " дн. з повним записом за " + dates.length + " дн.", action: null, text: "Після переїдання нічого не ріжемо. Варто перевірити, чи вистачає білка й чи не замалі порції вдень — часто вечір добирає за день.", decline: "Зрозуміло" });
  if (target && complete.length >= 4 && avg < target - 300) return Object.assign(base, { noticed: "У дні з повними записами виходило ≈ " + num(avg) + " ккал — помітно менше за орієнтир " + num(target) + ".", data: complete.length + " дн. з повним записом", action: null, text: "Нижче не опускаємо. Якщо відчуваєш голод чи втому, додай перекус зі списку; якщо все добре — просто перевір, чи все записано.", decline: "Зрозуміло" });
  const checks = (state.smartMeta && Array.isArray(state.smartMeta.weights) ? state.smartMeta.weights : []).slice().sort((a, b) => a.date < b.date ? -1 : 1);
  if (checks.length >= 3 && diff(checks[0].date, checks[checks.length - 1].date) >= 21 && complete.length >= 8 && target) {
    const change = checks[checks.length - 1].kg - checks[0].kg;
    const purpose = plan.energy.purpose;
    if (purpose === "lose" && change > -0.2 && target - 100 >= (plan.energy.floor || 0)) return Object.assign(base, { noticed: "За " + diff(checks[0].date, checks[checks.length - 1].date) + " днів вага не зменшилась (" + num(change, 1) + " кг) при повних записах.", data: checks.length + " зважування й " + complete.length + " повних днів", action: "adjust", kcal: -100, actionLabel: "Мінус 100 ккал до орієнтира", text: "Маленький крок, не урізання: −100 ккал, не нижче " + num(plan.energy.floor) + ". Якщо через два тижні без зміни — повернемось до розмови, а не до цифр.", decline: "Лишити орієнтир" });
    if ((purpose === "gain" || purpose === "muscle") && change < 0.2) return Object.assign(base, { noticed: "За " + diff(checks[0].date, checks[checks.length - 1].date) + " днів вага не зросла (" + num(change, 1) + " кг).", data: checks.length + " зважування й " + complete.length + " повних днів", action: "adjust", kcal: 100, actionLabel: "Плюс 100 ккал до орієнтира", text: "Невеликий плюс до орієнтира — і перевіримо через два тижні.", decline: "Лишити орієнтир" });
  }
  return Object.assign(base, { noticed: "Тиждень пройшов рівно: " + withMeals.length + " дн. із записами" + (planned.length ? ", занять " + done.length + " із " + planned.length : "") + ".", data: "щоденник і план за " + dates.length + " дн.", action: null, text: "Нічого міняти не пропонуємо. Якщо хочеш — зміни одну умову вище.", decline: "Добре" });
}

function myPlanReviewBlock(plan) {
  const review = myPlanReview(plan);
  if (!review) return "";
  return '<section class="mp-block mp-review"><h3>Тижневий погляд</h3><p><b>Що помітили:</b> ' + esc(review.noticed) + '</p><p><b>На яких даних:</b> ' + esc(review.data) + '.</p><p>' + esc(review.text) + '</p><div class="mp-edit-actions">' + (review.action ? '<button type="button" class="primary" data-myplan-review="apply">' + esc(review.actionLabel) + '</button>' : '') + '<button type="button" data-myplan-review="decline">' + esc(review.decline) + '</button></div><p class="mp-fine">Правило просте й записане в історію разом із рішенням. Зміни лише за згодою; відкат — в історії.</p></section>';
}

function myPlanReviewDecide(decision) {
  const plan = myPlanActive();
  const review = plan && myPlanReview(plan);
  if (!review) return;
  plan.reviews = plan.reviews || {};
  plan.reviews[review.weekIndex] = { decision, action: review.action || null, date: today() };
  if (decision === "apply" && review.action === "fewer-days") {
    const answers = PlanEngine.normalizeAnswers(state.startChoices);
    answers.move.days = Math.max(1, answers.move.days - 1);
    const next = PlanEngine.build(answers, { startIso: plan.food.start, relaxed: plan.food.relaxed });
    next.food = plan.food; // food week stays; only movement changes
    startMyPlan(next, { reason: "тижневий погляд: менше занять" });
    planHistoryAdd({ kind: "review", title: "Тижневий погляд: занять " + answers.move.days, rollback: true, snapshot: myPlanSnapshot(plan) });
  } else if (decision === "apply" && review.action === "adjust") {
    state.startChoices.meta = state.startChoices.meta || {};
    const before = state.startChoices.meta.adjust && Number(state.startChoices.meta.adjust.kcal) || 0;
    state.startChoices.meta.adjust = { kcal: before + review.kcal, reason: "тижневий погляд", date: today() };
    applySmartPlan(computeSmartPlan(state.startChoices), { fresh: false, reason: "тижневий погляд " + (review.kcal > 0 ? "+" : "") + review.kcal });
    planHistoryAdd({ kind: "review", title: "Тижневий погляд: " + (review.kcal > 0 ? "+" : "") + review.kcal + " ккал", rollbackAdjust: before, rollback: true });
  } else planHistoryAdd({ kind: "review", title: "Тижневий погляд: без змін (" + review.noticed.slice(0, 60) + ")" });
  persist();
  openMyPlan();
  try { render(); } catch (error) {}
  toast(decision === "apply" ? "Застосовано. Повернути можна в історії." : "Лишаємо як є.");
}

/* ---------- weigh-in reminder (opt-in) and history ---------- */

function myPlanWeighBlock() {
  const reminder = weighReminder();
  return '<section class="mp-block"><h3>Вага</h3><p class="mp-lead">' + esc(weighStatusLine()) + '</p><button type="button" class="mp-wide" data-action="weigh-in">Зважитись зараз ↗</button>' + sKicker("НАГАДУВАННЯ", "за бажанням") + '<div class="start-pills"><button type="button" class="start-pill' + (!reminder.enabled ? " active" : "") + '" data-myplan-remind="off">Вимкнено</button><button type="button" class="start-pill' + (reminder.enabled && reminder.everyDays === 7 ? " active" : "") + '" data-myplan-remind="7">Раз на 7 днів</button><button type="button" class="start-pill' + (reminder.enabled && reminder.everyDays === 14 ? " active" : "") + '" data-myplan-remind="14">Раз на 14 днів</button></div>' + (reminder.enabled ? '<label class="start-field">Час нагадування<input type="time" id="mpRemindTime" value="' + esc(reminder.time) + '"></label>' : '') + '<p class="mp-fine">Фото прогресу — сценарій на потім, не вимірювання. Вага — одна ранкова цифра, без оцінок.</p></section>';
}

function myPlanHistoryBlock() {
  const list = planHistoryList().slice(0, 8);
  if (!list.length) return "";
  return '<section class="mp-block"><h3>Історія</h3>' + list.map(entry => '<div class="mp-history"><div><small>' + fdate(entry.date, true) + '</small><b>' + esc(entry.title) + '</b>' + (entry.reason ? '<em>' + esc(entry.reason) + '</em>' : '') + '</div>' + (entry.rollback && (entry.snapshot || entry.rollbackAdjust !== undefined) ? '<button type="button" data-myplan-rollback="' + esc(entry.id) + '">Повернути</button>' : '') + '</div>').join("") + '</section>';
}

function myPlanRollback(id) {
  const entry = planHistoryList().find(item => item.id === id);
  if (!entry) return;
  if (entry.snapshot) {
    const restored = Object.assign({ version: 1, status: "active" }, entry.snapshot);
    startMyPlan(restored, { reason: "повернення з історії" });
    toast("Повернуто тиждень від " + fdate(restored.food.start) + ".");
  } else if (entry.rollbackAdjust !== undefined) {
    state.startChoices.meta = state.startChoices.meta || {};
    if (entry.rollbackAdjust) state.startChoices.meta.adjust = { kcal: entry.rollbackAdjust, reason: "повернення", date: today() }; else delete state.startChoices.meta.adjust;
    applySmartPlan(computeSmartPlan(state.startChoices), { fresh: false, reason: "повернення з історії" });
    toast("Орієнтир повернуто.");
  }
  entry.rollback = false;
  persist();
  openMyPlan();
  try { render(); } catch (error) {}
}

/* ---------- swaps that respect the plan's hard conditions ---------- */

function myPlanSwap(date, index) {
  const plan = myPlanActive();
  const day = plan && plan.food.days.find(d => d.date === date);
  if (!day || !day.meals[index]) return false;
  const used = new Set(plan.food.days.flatMap(d => d.meals.map(m => m.id)));
  const slot = plan.food.layout[index];
  const target = (day.target || 1800) * PlanEngine.LAYOUT[plan.food.layoutKey].fractions[index];
  const pick = PlanEngine.pickMeal(slot, target, plan.answers, plan.energy, used, String(Date.now()), new Set(plan.food.relaxed), index).pick;
  if (!pick) { toast("Під твої умови інших страв для цього прийому немає. Послаб одну м’яку умову."); return true; }
  day.meals[index] = { slot, name: day.meals[index].name, id: pick.id, servings: pick.servings, kcal: pick.kcal, p: pick.p, f: pick.f, c: pick.c, reasons: pick.reasons.slice(0, 3) };
  day.sum = day.meals.reduce((acc, m) => ({ kcal: acc.kcal + m.kcal, p: acc.p + m.p, f: acc.f + m.f, c: acc.c + m.c }), { kcal: 0, p: 0, f: 0, c: 0 });
  myPlanWriteWeek(plan);
  persist();
  if ($("modal").classList.contains("plan-sheet")) openMyPlan();
  try { render(); } catch (error) {}
  toast("Страву замінено. Список покупок оновиться.");
  return true;
}

if (typeof weekCandidate === "function") {
  const weekCandidateBeforePlan = weekCandidate;
  weekCandidate = function (recipe, prefs, slot) {
    if (!weekCandidateBeforePlan(recipe, prefs, slot)) return false;
    const plan = myPlanActive();
    if (!plan || !weekStudio || weekStudio.source !== "my-plan") return true;
    const reject = PlanEngine.foodReject(recipe, plan.answers, slot, new Set(plan.food.relaxed));
    return !reject || !reject.hard;
  };
}
if (typeof weekMealCard === "function") {
  const weekMealCardBeforePlan = weekMealCard;
  weekMealCard = function (meal, date, index) {
    const html = weekMealCardBeforePlan(meal, date, index);
    if (!weekStudio || weekStudio.source !== "my-plan" || !Array.isArray(weekStudio.names)) return html;
    return html.replace(/<small>[^<·]+ · /, '<small>' + esc(weekStudio.names[index] || "") + ' · ');
  };
}
if (actions["week-swap"]) {
  const weekSwapBeforePlan = actions["week-swap"];
  actions["week-swap"] = button => { if (weekStudio && weekStudio.source === "my-plan" && myPlanSwap(button.dataset.date, Number(button.dataset.index))) return; weekSwapBeforePlan(button); };
}
actions["start-continue"] = () => { $("modal").classList.remove("plan-sheet"); openStartFlow(); };
actions["my-plan"] = openMyPlan;

/* ---------- home: continue the questionnaire, and today's plan ---------- */

const homeBeforeMyPlan = homeApp;
homeApp = function () {
  const html = homeBeforeMyPlan();
  if (state.demo) return html;
  const plan = myPlanActive();
  if (!plan && startHasDraft() && !(state.startChoices && state.startChoices.meta && state.startChoices.meta.completed)) {
    const card = '<section class="mp-home"><span>АНКЕТА НЕ ЗАВЕРШЕНА</span><b>Відповіді збережено — план чекає.</b><button type="button" data-action="start-continue">Продовжити ↗</button></section>';
    const at = html.indexOf('<section class="day-plan-card">');
    return at >= 0 ? html.slice(0, at) + card + html.slice(at) : card + html;
  }
  if (!plan || myPlanStale(plan)) return html;
  const day = plan.food.days.find(d => d.date === selectedDate);
  const session = plan.move.sessions.find(s => s.date === selectedDate);
  if (!day && !session) return html;
  const card = '<section class="mp-home"><span>' + (selectedDate === today() ? "СЬОГОДНІ В ПЛАНІ" : "У ПЛАНІ НА " + fdate(selectedDate).toUpperCase()) + '</span>' + (day ? '<ul>' + day.meals.map(meal => { const recipe = myPlanRecipe(meal.id); return '<li>' + esc(meal.name) + ': ' + esc(recipe ? recipe.title : meal.id) + ' <i>≈ ' + num(meal.kcal) + '</i></li>'; }).join("") + '</ul>' : '') + '<b>' + (session ? '🏃 ' + esc(session.name) + ' · ' + session.minutes + ' хв' : 'Без тренування — день відпочинку') + '</b><button type="button" data-action="my-plan">Мій план ↗</button></section>';
  const at = html.indexOf('<section class="day-plan-card">');
  if (at < 0) return card + html;
  const close = html.indexOf("</section>", at);
  return html.slice(0, close + 10) + card + html.slice(close + 10);
};

/* ---------- events on the plan sheet ---------- */

document.addEventListener("click", event => {
  if (!$("modal").classList.contains("plan-sheet")) return;
  const edit = event.target.closest("[data-myplan-edit]");
  const preview = event.target.closest("[data-myplan-preview]");
  const cancel = event.target.closest("[data-myplan-cancel]");
  const apply = event.target.closest("[data-myplan-apply]");
  const next = event.target.closest("[data-myplan-next]");
  const relax = event.target.closest("[data-myplan-relax]");
  const review = event.target.closest("[data-myplan-review]");
  const remind = event.target.closest("[data-myplan-remind]");
  const rollback = event.target.closest("[data-myplan-rollback]");
  const plan = myPlanActive();
  if (plan && myPlanEdit && startHandleControl(event.target)) { myPlanEdit.preview = null; openMyPlan(); return; }
  if (edit) {
    startDraft = { step: 0, answers: PlanEngine.normalizeAnswers(state.startChoices), relaxed: plan ? plan.food.relaxed.slice() : [], savedAt: "" };
    myPlanEdit = { key: edit.dataset.myplanEdit, preview: null };
    openMyPlan();
    const block = document.getElementById("mpEdit");
    if (block) block.scrollIntoView({ block: "start", behavior: "smooth" });
    return;
  }
  if (cancel) { myPlanEdit = null; openMyPlan(); return; }
  if (preview && plan && myPlanEdit) {
    readStartFields();
    if (typeof startValidate === "function") { const step = startDraft.step; startDraft.step = 0; const ok = startValidate(); startDraft.step = step; if (!ok) return; }
    myPlanEdit.preview = PlanEngine.build(startDraft.answers, { startIso: plan.food.start, relaxed: startDraft.relaxed });
    openMyPlan();
    const block = document.querySelector(".mp-diff");
    if (block) block.scrollIntoView({ block: "center", behavior: "smooth" });
    return;
  }
  if (apply && plan && myPlanEdit && myPlanEdit.preview) {
    const label = MY_PLAN_EDITS[myPlanEdit.key].label.toLowerCase();
    const nextPlan = myPlanEdit.preview;
    if (apply.dataset.myplanApply === "energy") { nextPlan.food = plan.food; nextPlan.move = plan.move; }
    startMyPlan(nextPlan, { reason: "змінено: " + label });
    myPlanEdit = null;
    openMyPlan();
    try { render(); } catch (error) {}
    toast(apply.dataset.myplanApply === "energy" ? "Орієнтир оновлено, тиждень лишився." : "План оновлено. Попередній тиждень — в історії.");
    return;
  }
  if (next && plan) {
    const answers = PlanEngine.normalizeAnswers(state.startChoices);
    const fresh = PlanEngine.build(answers, { startIso: today(), relaxed: plan.food.relaxed });
    startMyPlan(fresh, { reason: myPlanStale(plan) ? "новий тиждень" : "нова цифра орієнтира" });
    openMyPlan();
    try { render(); } catch (error) {}
    toast("Новий тиждень зібрано. Попередній — в історії.");
    return;
  }
  if (relax && plan) {
    const key = relax.dataset.myplanRelax;
    const relaxed = plan.food.relaxed.includes(key) ? plan.food.relaxed : plan.food.relaxed.concat(key);
    const rebuilt = PlanEngine.build(plan.answers, { startIso: plan.food.start, relaxed });
    rebuilt.move = plan.move;
    startMyPlan(rebuilt, { reason: "послаблено: " + PlanEngine.relaxLabel(key) });
    openMyPlan();
    try { render(); } catch (error) {}
    toast("Умову послаблено. Меню зібрано заново.");
    return;
  }
  if (review) { myPlanReviewDecide(review.dataset.myplanReview); return; }
  if (remind) {
    const value = remind.dataset.myplanRemind;
    const current = weighReminder();
    state.settings.weighReminder = value === "off" ? { enabled: false, everyDays: current.everyDays, time: current.time } : { enabled: true, everyDays: Number(value), time: current.time };
    persist();
    openMyPlan();
    try { render(); } catch (error) {}
    return;
  }
  if (rollback) { myPlanRollback(rollback.dataset.myplanRollback); }
});

document.addEventListener("change", event => {
  if (event.target && event.target.id === "mpRemindTime") {
    const current = weighReminder();
    if (/^([01]\d|2[0-3]):[0-5]\d$/.test(event.target.value)) { state.settings.weighReminder = Object.assign(current, { time: event.target.value }); persist(); }
  }
});

$("modal").addEventListener("close", () => { myPlanEdit = null; });

/* The recipe browser reads the plan. It does not ask meal count, exclusions, pantry, time or budget again. */
const matchedFromPlan = typeof matchedRecipes === "function" ? matchedRecipes : null;
if (matchedFromPlan) matchedRecipes = function () {
  const list = matchedFromPlan();
  if (!state.startChoices || typeof PlanEngine === "undefined") return list;
  const answers = PlanEngine.normalizeAnswers(state.startChoices);
  const relaxed = new Set(state.myPlan && state.myPlan.food ? state.myPlan.food.relaxed : []);
  return list.filter(recipe => !PlanEngine.foodReject(recipe, answers, null, relaxed));
};
let menuSeededFromPlan = false;
function seedMenuFromPlan() {
  if (menuSeededFromPlan || !state.startChoices || !state.startChoices.food || typeof recipeFilter === "undefined") return;
  const food = state.startChoices.food;
  menuSeededFromPlan = true;
  if (food.cookTime) recipeFilter.maxTime = Number(food.cookTime) || 0;
  if (food.budget === "low") recipeFilter.collection = "budget";
  if (Array.isArray(food.pantry) && food.pantry.length && typeof RECIPE_INGREDIENTS !== "undefined") recipeFilter.pantry = food.pantry.filter(id => RECIPE_INGREDIENTS[id]);
  const avoid = [];
  const bags = food.exclude || {};
  for (const key of ["never", "week"]) for (const id of bags[key] || []) if (["fish", "dairy", "egg", "nuts"].includes(id) && !avoid.includes(id)) avoid.push(id);
  if (avoid.length) recipeFilter.exclude = avoid;
}
const recipesFromPlan = typeof recipesView === "function" ? recipesView : null;
if (recipesFromPlan) recipesView = function () { seedMenuFromPlan(); const html = recipesFromPlan(); return html.replace("Продукти · час · побажання", "Уже з твого плану"); };

/* ---------- English layer for the new screens ---------- */

if (typeof UI_PHRASES !== "undefined") UI_PHRASES.push(
  ["Почати мій план ↗", "Start my plan ↗"], ["Показати мій план ↗", "Show my plan ↗"], ["Далі: як живу і їм ↗", "Next: how I live and eat ↗"], ["Далі: який рух ↗", "Next: how I move ↗"],
  ["Якої зміни ти хочеш?", "What do you want to change?"], ["Як ти живеш і їси?", "How do you live and eat?"], ["Який рух тобі підходить?", "What movement suits you?"],
  ["ОРІЄНТИР НА ДЕНЬ", "DAILY GUIDE"], ["Орієнтир енергії", "Energy guide"], ["Чому так", "Why this"], ["Рух на тиждень", "Movement this week"], ["Змінити одну умову", "Change one condition"],
  ["Показати, що зміниться", "Show what changes"], ["Оновити план і тиждень", "Update plan and week"], ["Лише орієнтир, тиждень лишити", "Guide only, keep the week"], ["Скасувати", "Cancel"],
  ["Тижневий погляд", "Weekly look"], ["Що помітили:", "What we noticed:"], ["На яких даних:", "Based on:"], ["Історія", "History"], ["Повернути", "Restore"], ["Рецептів замало", "Not enough recipes"],
  ["Замінити ↻", "Swap ↻"], ["Рецепт ↗", "Recipe ↗"], ["Внести після їжі +", "Log after eating +"], ["✓ У щоденнику", "✓ In the diary"], ["відпочинок від тренувань", "rest from training"],
  ["СЬОГОДНІ В ПЛАНІ", "TODAY IN THE PLAN"], ["СЬОГОДНІ", "TODAY"], ["Мій план ↗", "My plan ↗"], ["Зважитись зараз ↗", "Weigh in now ↗"], ["Вимкнено", "Off"], ["Раз на 7 днів", "Every 7 days"], ["Раз на 14 днів", "Every 14 days"],
  ["Продовжити пізніше — відповіді збережено", "Continue later — answers are saved"], ["Продовжити ↗", "Continue ↗"], ["Пройти анкету заново", "Redo the questionnaire"], ["Звідки цифра? ↗", "Where does the number come from? ↗"],
  ["впевненість висока", "high confidence"], ["впевненість середня", "medium confidence"], ["впевненість низька", "low confidence"], ["Жіноча", "Female"], ["Чоловіча", "Male"], ["← Назад", "← Back"]
);
