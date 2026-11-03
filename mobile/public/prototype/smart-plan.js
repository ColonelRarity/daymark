/* Daily guide from the person's answers. The arithmetic lives in energy-calc.js (EnergyCalc)
   and the week in plan-engine.js (PlanEngine); this file keeps the names the rest of the app
   calls — dayEnergy, computeSmartPlan, applySmartPlan, plannedWorkout — and the compatibility
   shape of state.dayPlan (version 7). Not a medical prescription. */

function planNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}

function planRound(value) {
  return Math.round(value / 10) * 10;
}

/* The saved answers (startChoices v2), with the profile numbers on top: the profile is where a
   weigh-in or a manual edit writes, so it wins over what was typed at the start. */
function planInputFromState() {
  const answers = PlanEngine.normalizeAnswers(state.startChoices || {});
  const profile = state.profile || {};
  answers.body.name = profile.name || answers.body.name;
  if (profile.age) answers.body.age = profile.age;
  if (profile.height) answers.body.height = profile.height;
  if (profile.weight) answers.body.weight = profile.weight;
  if (profile.targetWeight !== undefined && profile.targetWeight !== "") answers.goal.targetWeight = profile.targetWeight;
  if (profile.sex === "male" || profile.sex === "female") answers.body.sex = profile.sex;
  const current = typeof goal === "function" ? goal() : null;
  if (!answers.goal.deadline && current && validDate(current.end) && current.end > today()) answers.goal.deadline = current.end;
  return answers;
}

function planActivityCompat(key) {
  return { sitting: "seated", light: "walks", onfeet: "walks", physical: "active", heavy: "active" }[key] || "seated";
}

function planSessionsCompat(move) {
  if (!move || !Array.isArray(move.sessions)) return [];
  return move.sessions.map(session => ({ name: session.name, detail: session.minutes + " хв · " + session.weekdayName, days: [session.weekday], id: session.id, date: session.date, minutes: session.minutes, kind: session.kind }));
}

/* Movement for the compat plan: the active "my plan" week if there is one, otherwise a fresh
   week from the same answers, so the home screen never shows sessions nobody chose. */
function planMovement(answers, energy, override) {
  const mine = override || (state.myPlan && state.myPlan.status === "active" && state.myPlan.move);
  const move = mine || PlanEngine.buildMove(answers, energy, today());
  const kinds = move.sessions.map(s => s.kind);
  const likes = !kinds.length ? "mixed" : kinds.every(k => k === "walk") ? "walking" : kinds.every(k => k === "strength") ? "strength" : kinds.every(k => k === "cardio") ? "cardio" : "mixed";
  const places = move.sessions.map(s => s.place);
  const place = places.includes("gym") ? "gym" : places.includes("home") ? "home" : places.length ? "outdoor" : answers.move.like.includes("gym") ? "gym" : answers.move.like.includes("walk") && !answers.move.like.includes("home") ? "outdoor" : "home";
  return {
    sessions: planSessionsCompat(move),
    steps: move.steps,
    place,
    likes,
    frequency: move.sessions.length,
    sessionMinutes: answers.move.minutes,
    beginner: answers.move.gymExperience === "none" || answers.move.intensity === "easy",
    prescribed: !!move.prescribed,
    notes: move.notes || []
  };
}

function planTextFood(energy, answers) {
  if (!energy || !energy.ok) return energy && energy.status === "care"
    ? "Регулярні прийоми їжі без автоматичного дефіциту. Орієнтир калорій краще узгодити з фахівцем."
    : "Поки без персональної калорійності. Меню показує порції, а не норму.";
  const m = energy.macros;
  const perMeal = planRound(energy.target / (PlanEngine.layoutFor(answers.food).slots.length || 3));
  const head = energy.purpose === "lose" ? "У кожному прийомі білок і овочі, гарнір знайомий. Солодке можна, просто не замість обіду."
    : energy.purpose === "muscle" || energy.purpose === "gain" ? "Не пропускай білок. Якщо до вечора калорій менше за орієнтир, додай перекус."
    : "Звичні прийоми їжі навколо орієнтира. Нічого не заборонено, дивимось на день цілком.";
  return head + " Білка близько " + m.p + " г (" + m.pPerKg + " г/кг). На прийом виходить близько " + num(perMeal) + " ккал.";
}

function planTextMove(move, energy) {
  if (!move.sessions.length) return energy && energy.status === "care" ? "Тренування автоматично не призначаємо. Рух — лише той, який тобі вже дозволений." : "Окремі тренування не ставимо. Кроки можна додавати, коли зручно.";
  const names = [...new Set(move.sessions.map(s => s.name))];
  return move.sessions.length + " " + (move.sessions.length === 1 ? "заняття" : move.sessions.length < 5 ? "заняття" : "занять") + " на тиждень: " + names.slice(0, 3).join(", ") + (names.length > 3 ? " та інші" : "") + "." + (move.steps ? " Кроків на день близько " + num(move.steps) + "." : "");
}

function planTextPace(energy) {
  if (!energy || !energy.ok) return "Темп ваги застосунок не рахує.";
  const pace = energy.pace || {};
  if (energy.purpose === "lose" && energy.rateKg) return "Плановий темп близько " + num(energy.rateKg, 1) + " кг на тиждень" + (pace.estimateWeeks ? ". При такому темпі вийшло б близько " + pace.estimateWeeks + " тиж. — це не обіцянка ваги на дату" : "") + (pace.note ? " " + pace.note : "");
  if (energy.purpose === "gain" || energy.purpose === "muscle") return "Невеликий плюс до підтримання" + (energy.rateKg ? " · близько " + num(energy.rateKg, 2) + " кг на тиждень" : "") + (pace.note ? " " + pace.note : "");
  return "Вагу не женемо. Орієнтир тримає звичайний день." + (pace.note ? " " + pace.note : "");
}

/* The compat plan (state.dayPlan). `source` may be v2 answers, old v1 choices, or nothing. */
function computeSmartPlan(source, options) {
  const answers = source && source.v === 2 ? PlanEngine.normalizeAnswers(source) : source ? PlanEngine.normalizeAnswers(source) : planInputFromState();
  let energy = EnergyCalc.estimate(PlanEngine.energyInput(answers, today()));
  const adjust = answers.meta && answers.meta.adjust && Number(answers.meta.adjust.kcal);
  if (adjust) energy = EnergyCalc.withAdjustment(energy, adjust, answers.meta.adjust.reason);
  const move = planMovement(answers, energy, options && options.move);
  const layout = PlanEngine.layoutFor(answers.food);
  const care = energy.status === "care";
  const base = {
    version: 7,
    purpose: energy.purpose || "maintain",
    care,
    limits: answers.move.limits.length > 0 || answers.health.injury,
    mode: answers.food.mode,
    meals: layout.slots.length,
    sessions: move.sessions,
    steps: move.steps,
    place: move.place,
    likes: move.likes,
    frequency: move.frequency,
    sessionMinutes: move.sessionMinutes,
    beginner: move.beginner,
    activity: planActivityCompat(answers.body.dailyActivity),
    pal: energy.pal || 1.4,
    title: (state.goals && state.goals[0] && state.goals[0].title) || "",
    manual: false,
    stretched: !!(energy.pace && energy.pace.realistic === false),
    energy,
    rulesVersion: PlanEngine.RULES_VERSION,
    energyVersion: EnergyCalc.VERSION
  };
  if (!energy.ok) {
    return Object.assign(base, {
      calories: null, maintenance: null, p: null, f: null, c: null, weeklyKg: null, endDate: "",
      missing: energy.status === "missing" ? "Додай " + energy.missing.join(", ") + " — і з’явиться цифра на день." : "",
      food: planTextFood(energy, answers),
      move: planTextMove(move, energy),
      pace: planTextPace(energy),
      note: care ? "Персональної цифри немає: " + energy.careReason + ". Щоденник можна вести як є." : "Без віку, зросту, ваги й статі формула не рахує обмін. Тренування й щоденник уже працюють."
    });
  }
  return Object.assign(base, {
    calories: energy.target,
    maintenance: energy.maintenance,
    p: energy.macros.p, f: energy.macros.f, c: energy.macros.c,
    weeklyKg: energy.rateKg || null,
    endDate: energy.pace && energy.pace.deadline || "",
    missing: "",
    perMeal: planRound(energy.target / layout.slots.length),
    food: planTextFood(energy, answers),
    move: planTextMove(move, energy),
    pace: planTextPace(energy),
    note: energy.explanations.slice(0, 2).join(" ") + " Тренування додається лише в свій день: ≈ " + num(energy.trainingPerSession) + " ккал за заняття."
  });
}

/* The guide card: number, delta, macros, and why. Used on the plan screen and the start flow. */
function smartPlanBody(plan) {
  const energy = plan.energy || null;
  const delta = plan.maintenance && plan.calories ? plan.maintenance - plan.calories : 0;
  const deltaLine = plan.calories && plan.maintenance
    ? '<p class="plan-delta">' + (delta > 0 ? "Підтримання ≈ " + num(plan.maintenance) + " · мінус " + num(delta) + " ккал" : delta < 0 ? "Підтримання ≈ " + num(plan.maintenance) + " · плюс " + num(-delta) + " ккал" : "Це підтримання, без зміни калорій") + (plan.manual ? " · цифру задано вручну" : "") + "</p>"
    : "";
  const confidence = energy && energy.confidence ? { high: "впевненість висока", mid: "впевненість середня", low: "впевненість низька" }[energy.confidence] : "";
  const number = plan.calories
    ? '<div class="plan-kcal"><small>ОРІЄНТИР НА ДЕНЬ' + (confidence ? ' · ' + confidence.toUpperCase() : '') + '</small><strong>' + num(plan.calories) + '</strong><span>ккал' + (energy && energy.range ? ' · коридор ' + num(energy.range.low) + '–' + num(energy.range.high) : '') + '</span></div>' + deltaLine + '<div class="plan-macros"><b><i>Б</i>' + num(plan.p) + ' г</b><b><i>Ж</i>' + num(plan.f) + ' г</b><b><i>В</i>' + num(plan.c) + ' г</b></div>'
    : '<div class="plan-kcal quiet"><small>ОРІЄНТИР НА ДЕНЬ</small><strong>—</strong><span>' + esc(plan.missing || (energy && energy.careReason ? "Без автоматичної цифри: " + energy.careReason : "Без автоматичної цифри")) + '</span></div>';
  const rows = [["🥗", "Їжа", plan.food], ["🏃", "Рух", plan.move], ["📅", "Темп", plan.pace]].map(([icon, title, text]) => '<div class="start-row"><em>' + icon + '</em><div><b>' + title + '</b><p>' + esc(text) + '</p></div></div>').join("");
  const formula = energy && energy.ok
    ? '<details class="plan-why"><summary>Звідки цифра? ↗</summary><p>Обмін у спокої за Mifflin–St Jeor (' + (energy.sex === "male" ? "чоловіча формула, +5" : "жіноча формула, −161") + '): ' + num(energy.resting) + ' ккал. Буденний рух ×' + String(energy.pal).replace(".", ",") + ' → підтримання ' + num(energy.maintenance) + '. ' + (energy.delta ? (energy.delta < 0 ? 'Мінус ' : 'Плюс ') + num(Math.abs(energy.delta)) + ' на ' + (energy.purpose === "lose" ? 'зниження' : 'набір') + '. ' : '') + (energy.floored ? 'Нижче ' + num(energy.floor) + ' не опускаємо. ' : '') + 'Б = ' + energy.macros.pPerKg + ' г/кг, Ж = ' + energy.macros.fPerKg + ' г/кг, В — решта. Це приклад розподілу, не припис.</p>' + (energy.assumptions.length ? '<p><b>Припущення:</b> ' + esc(energy.assumptions.join(" ")) + '</p>' : '') + (energy.warnings.length ? '<p><b>Увага:</b> ' + esc(energy.warnings.join(" ")) + '</p>' : '') + '<p>Версія правил: ' + esc(EnergyCalc.VERSION) + '. Перед релізом формули й коефіцієнти перевіряє дієтолог.</p></details>'
    : "";
  return number + rows + formula + '<p class="start-note">' + esc(plan.note) + '</p>';
}

/* Training preferences for the library and the training week, from the answers. */
function applyTrainingPrefs(plan, answers) {
  if (typeof trainingPrefs === "undefined" || typeof TRAINING_PREF_KEY === "undefined") return;
  const a = answers || planInputFromState();
  const goals = { lose: "lose", gain: "strength", muscle: "muscle", recomp: "muscle", maintain: "maintain" };
  trainingPrefs.goal = goals[plan.purpose] || "maintain";
  trainingPrefs.place = plan.place === "gym" ? "gym" : plan.place === "outdoor" ? "outdoor" : "home";
  trainingPrefs.gear = a.move.gear.includes("machine") && trainingPrefs.place === "gym" ? "machine" : a.move.gear.includes("dumbbell") ? "dumbbell" : a.move.gear.includes("band") ? "band" : "none";
  if (trainingPrefs.place === "outdoor") trainingPrefs.gear = "none";
  trainingPrefs.level = plan.beginner ? "beginner" : "regular";
  trainingPrefs.frequency = [2, 3, 4, 5].includes(plan.frequency) ? plan.frequency : plan.frequency > 5 ? 5 : 2;
  trainingPrefs.time = [15, 20, 30, 45, 60].includes(plan.sessionMinutes) ? plan.sessionMinutes : 30;
  trainingPrefs.likes = ["mixed", "walking", "strength", "cardio"].includes(plan.likes) ? plan.likes : "mixed";
  trainingPrefs.limitations = plan.care || !plan.sessions.length ? "medical" : plan.limits ? "unsure" : "none";
  trainingPrefs.setup = true;
  try { localStorage.setItem(TRAINING_PREF_KEY, JSON.stringify(trainingPrefs)); } catch (error) {}
}

function planHistoryList() {
  if (!Array.isArray(state.planHistory)) state.planHistory = [];
  return state.planHistory;
}

function planHistoryAdd(entry) {
  const list = planHistoryList();
  list.unshift(Object.assign({ id: uid(), date: today() }, entry));
  if (list.length > 60) list.length = 60;
}

function applySmartPlan(plan, options) {
  if (!plan) return;
  const before = state.dayPlan && state.dayPlan.calories || null;
  state.dayPlan = plan;
  if (plan.calories) {
    state.settings.calories = plan.calories;
    state.settings.macros = { p: plan.p, f: plan.f, c: plan.c };
  } else if (plan.care) state.settings.calories = null;
  if (plan.steps) state.settings.steps = plan.steps;
  if (plan.care) {
    state.settings.style = "balanced";
    state.settings.fasting = false;
  }
  if (plan.calories !== before && (before || plan.calories)) planHistoryAdd({ kind: "energy", title: plan.calories ? "Орієнтир " + num(plan.calories) + " ккал" : "Без автоматичної цифри", from: before, to: plan.calories, maintenance: plan.maintenance, reason: options && options.reason || (options && options.fresh ? "перший розрахунок" : "перерахунок") });
  if (!options || options.fresh || typeof trainingPrefs === "undefined" || !trainingPrefs.setup) applyTrainingPrefs(plan);
}

function planSessionToday(plan, iso) {
  if (!plan || !plan.sessions || !plan.sessions.length) return "";
  const day = dt(iso).getUTCDay();
  const match = plan.sessions.find(item => item.days && item.days.includes(day)) || plan.sessions[0];
  const rest = String(match.detail || "").replace(/^\d+\s*хв\s*·\s*/, "");
  return /\d+\s*хв/.test(match.name) ? match.name + (rest ? " · " + rest : "") : match.name + " · " + match.detail;
}

function metFromWorkout(workout) {
  const name = String((workout && workout.name) || "").toLocaleLowerCase("uk");
  if (/біг|run|інтервал|hiit|скакал/.test(name)) return 8;
  if (/вел|cycle|плав|swim/.test(name)) return 7;
  if (/силов|гантел|штанг|strength|присід|жим|зал/.test(name)) return 5;
  if (/йог|розтяж|пілатес|yoga/.test(name)) return 3;
  if (/прогул|ходьб|walk/.test(name)) return 3.5;
  if (/танц|dance/.test(name)) return 5;
  if (workout && workout.programId) return 5.5;
  return 4.5;
}

function workoutBurn(workout, weight) {
  if (!workout || !weight) return 0;
  const logged = Number(workout.activeKcal);
  if (Number.isFinite(logged) && logged > 0) return logged;
  const minutes = Number(workout.minutes) || 0;
  const met = Number(workout.met) || metFromWorkout(workout);
  if (minutes < 8 || !met) return 0;
  return (met - 1) * 3.5 * weight / 200 * minutes;
}

function movementFoodShare(activity) {
  return {
    share: { seated: 0.7, walks: 0.5, train: 0.35, active: 0.25 }[activity] || 0.45,
    cap: { seated: 400, walks: 320, train: 220, active: 160 }[activity] || 280
  };
}

function foodExtraFromBurn(burned, activity) {
  if (burned < 40) return 0;
  const band = movementFoodShare(activity);
  return Math.min(band.cap, planRound(burned * band.share));
}

function todayMoveAdjust(iso) {
  const day = iso || (typeof selectedDate !== "undefined" ? selectedDate : today());
  const plan = state.dayPlan;
  const base = Number(plan && plan.calories) || Number(state.settings && state.settings.calories) || 0;
  const empty = { extra: 0, note: "", confidence: "plan" };
  if (!plan || !base || plan.care || !day) return empty;
  const entry = state.logs && state.logs[day] || { workouts: [], steps: 0 };
  const weight = planNumber(state.profile && state.profile.weight, 35, 250);
  const totals = typeof movementTotals === "function" ? movementTotals(day) : null;
  const pal = Number(plan.pal) || { seated: 1.2, walks: 1.375, train: 1.55, active: 1.725 }[plan.activity] || 1.3;
  if (totals && totals.hasDayWatch && Number.isFinite(Number(totals.activeKcal)) && plan.maintenance) {
    const assumed = (plan.maintenance / pal) * (pal - 1.2);
    const above = Number(totals.activeKcal) - assumed;
    if (above < 80) return { extra: 0, note: "Годинник уже вписаний у звичайний день", confidence: "watch" };
    return { extra: Math.min(450, planRound(above * 0.65)), note: "Активні ккал з годинника вищі за звичайний день", confidence: "watch" };
  }
  const workouts = entry.workouts || [];
  const burned = weight ? workouts.reduce((sum, workout) => sum + workoutBurn(workout, weight), 0) : 0;
  if (burned >= 40) {
    const kinds = workouts.length === 1 ? workouts[0].name : workouts.length + " активності";
    return { extra: foodExtraFromBurn(burned, plan.activity), note: "За тренуванням у щоденнику (" + kinds + "). Оцінка за типом і часом, не вимір годинника", confidence: "workout" };
  }
  const phone = state.smartMeta && state.smartMeta.phone && state.smartMeta.phone.date === day ? state.smartMeta.phone.steps : 0;
  const walked = Math.max(Number(entry.steps) || 0, day === today() ? Number(phone) || 0 : 0);
  const extraSteps = walked - (plan.steps || 8000);
  if (extraSteps < 2500) return empty;
  return { extra: Math.min(120, planRound(extraSteps * 0.03)), note: "Кроків більше, ніж у плані. Додаємо обережно — це не годинник", confidence: "steps" };
}

function savedTrainingOn(iso) {
  try {
    const saved = JSON.parse(localStorage.getItem("daymark-training-week-v1") || "null");
    if (!saved || !Array.isArray(saved.slots) || !validDate(saved.start)) return { known: false };
    if (saved.start > iso || diff(saved.start, iso) >= 7) return { known: false };
    const slot = saved.slots.find(item => item.date === iso);
    if (!slot || typeof trainingPlan !== "function") return { known: true, workout: null };
    const session = trainingPlan(slot.id);
    if (!session) return { known: true, workout: null };
    return { known: true, workout: { name: session.name, minutes: Number(session.minutes) || 30, programId: session.id } };
  } catch (error) {
    return { known: false };
  }
}

function myPlanWorkoutOn(iso) {
  const mine = state.myPlan;
  if (!mine || mine.status !== "active" || !mine.move || !Array.isArray(mine.move.sessions)) return { known: false };
  const start = mine.food && mine.food.start || mine.created;
  if (!validDate(start) || start > iso || diff(start, iso) >= 7) return { known: false };
  const session = mine.move.sessions.find(item => item.date === iso);
  if (!session) return { known: true, workout: null };
  return { known: true, workout: { name: session.name, minutes: Number(session.minutes) || 30, programId: session.id, kind: session.kind } };
}

function plannedWorkout(iso) {
  const mine = myPlanWorkoutOn(iso);
  if (mine.known) return mine.workout;
  const saved = savedTrainingOn(iso);
  if (saved.known) return saved.workout;
  const plan = state.dayPlan;
  if (!plan || !plan.sessions || !plan.sessions.length) return null;
  const weekday = dt(iso).getUTCDay();
  const matches = plan.sessions.filter(item => item.days && item.days.includes(weekday));
  if (!matches.length) return null;
  const weight = planNumber(state.profile && state.profile.weight, 35, 250) || 70;
  return matches.map(item => {
    const minutes = Number((String(item.detail || "").match(/(\d+)\s*хв/) || [])[1]) || 30;
    return { name: item.name, minutes, programId: null };
  }).sort((a, b) => workoutBurn(b, weight) - workoutBurn(a, weight))[0];
}

function plannedFoodExtra(iso) {
  const plan = state.dayPlan;
  const session = plannedWorkout(iso);
  const empty = { extra: 0, note: "", confidence: "plan" };
  if (!plan || plan.care || !session) return empty;
  if (typeof trainingPrefs !== "undefined" && trainingPrefs.limitations === "medical") return empty;
  const weight = planNumber(state.profile && state.profile.weight, 35, 250);
  const perSession = plan.energy && plan.energy.ok && session.kind ? EnergyCalc.sessionKcal(weight || 70, session.minutes, session.kind) : 0;
  const extra = perSession ? planRound(perSession) : foodExtraFromBurn(workoutBurn(session, weight), plan.activity);
  if (!extra) return empty;
  return { extra, note: "На цей день у плані є тренування (" + session.name + "). Їжа вже враховує його", confidence: "planned" };
}

function dayEnergy(iso) {
  const day = iso || (typeof selectedDate !== "undefined" ? selectedDate : today());
  const plan = state.dayPlan;
  const base = Number(plan && plan.calories) || Number(state.settings && state.settings.calories) || 0;
  const meals = plan && plan.meals || 3;
  const actual = todayMoveAdjust(day);
  let extra = actual.extra || 0;
  let note = actual.note || "";
  let confidence = actual.confidence || "plan";
  if (confidence !== "watch" && confidence !== "workout") {
    const planned = plannedFoodExtra(day);
    if (planned.extra > extra) {
      extra = planned.extra;
      note = planned.note;
      confidence = planned.confidence;
    }
  }
  const target = base ? base + extra : 0;
  return { base, extra, target, perMeal: target ? planRound(target / meals) : 0, meals, note, confidence, maintenance: plan && plan.maintenance || null };
}

function dayCalorieTarget(iso) {
  return dayEnergy(iso).target;
}

function weightChecks() {
  state.smartMeta = state.smartMeta || {};
  if (!Array.isArray(state.smartMeta.weights)) state.smartMeta.weights = [];
  return state.smartMeta.weights;
}

function rememberStartingWeight() {
  const kg = planNumber(state.profile && state.profile.weight, 35, 250);
  if (!kg || weightChecks().length) return;
  const start = state.goals && state.goals[0] && state.goals[0].start;
  weightChecks().push({ date: validDate(start) ? start : today(), kg, kind: "start" });
}

function latestWeightCheck() {
  return weightChecks().filter(item => item.kind === "check").slice().sort((a, b) => a.date < b.date ? 1 : -1)[0] || null;
}

function weighReminder() {
  const saved = state.settings && state.settings.weighReminder;
  return saved && typeof saved === "object" ? { enabled: !!saved.enabled, everyDays: [7, 14].includes(Number(saved.everyDays)) ? Number(saved.everyDays) : 7, time: /^([01]\d|2[0-3]):[0-5]\d$/.test(saved.time || "") ? saved.time : "08:00" } : { enabled: false, everyDays: 7, time: "08:00" };
}

function weighInDue() {
  if (!state || state.demo || !state.profile) return false;
  if (!weighReminder().enabled) return false;
  if (state.dayPlan && state.dayPlan.care) return false;
  if (!planNumber(state.profile.weight, 35, 250)) return false;
  rememberStartingWeight();
  const last = latestWeightCheck();
  const since = last ? last.date : ((state.goals && state.goals[0] && state.goals[0].start) || today());
  return diff(since, today()) >= weighReminder().everyDays;
}

function weighStatusLine() {
  const last = latestWeightCheck();
  const reminder = weighReminder();
  if (!last) return reminder.enabled ? "Раз на " + reminder.everyDays + " дн. Daymark нагадає зважитись. Нова вага оновлює той самий орієнтир." : "Нагадування про вагу вимкнене. Зважитись можна будь-коли — орієнтир оновиться від нової цифри.";
  const left = reminder.everyDays - diff(last.date, today());
  return "Останнє зважування " + fdate(last.date, true) + " · " + num(last.kg, 1) + " кг. " + (left > 0 ? "Наступне через " + left + " дн." : "Можна зважитись знову.");
}

function openWeighIn() {
  const current = state.profile && state.profile.weight || "";
  openModal("МІЙ ПРОГРЕС / ВАГА", '<h2 class="modal-title">Одна цифра<br>на цей тиждень.</h2><p class="modal-sub">Краще зранку, в схожих умовах. Від неї оновиться план, а меню й ідеї їжі візьмуть ту саму цифру.</p><form id="weighForm"><label class="form-label">Вага, кг<input name="weight" type="number" inputmode="decimal" min="35" max="250" step="0.1" value="' + esc(current) + '" required></label><button class="btn blue full" type="submit">Зберегти вагу</button></form>');
}

function saveWeighIn(kg) {
  const previous = planNumber(state.profile && state.profile.weight, 35, 250);
  const before = Number(state.settings && state.settings.calories) || 0;
  weightChecks().push({ date: today(), kg, kind: "check" });
  state.profile.weight = String(kg);
  state.startChoices = PlanEngine.normalizeAnswers(state.startChoices || {});
  state.startChoices.body.weight = String(kg);
  const bits = ["Вага " + num(kg, 1) + " кг записана."];
  if (previous) {
    const delta = Math.round((kg - previous) * 10) / 10;
    bits.push(delta === 0 ? "З минулого разу без зміни." : "З минулого разу " + (delta > 0 ? "+" : "") + num(delta, 1) + " кг.");
  }
  const target = planNumber(state.profile.targetWeight, 35, 250);
  if (target) bits.push("До бажаної ваги " + num(Math.abs(target - kg), 1) + " кг.");
  if (state.dayPlan && !state.dayPlan.manual && !state.dayPlan.care && (state.profile.sex === "male" || state.profile.sex === "female")) {
    applySmartPlan(computeSmartPlan(planInputFromState()), { fresh: false, reason: "нова вага " + num(kg, 1) + " кг" });
    const next = Number(state.settings.calories) || 0;
    bits.push(next && next !== before ? "Орієнтир тепер " + num(next) + " ккал." : "Денна цифра лишається " + num(next || before) + " ккал.");
  }
  persist();
  closeModal();
  render();
  toast(bits.join(" "));
}

function adoptCalorieBase(value) {
  const manual = planNumber(value, 1000, 5000);
  const plan = state.dayPlan || { version: 7 };
  if (!manual) {
    state.settings.calories = null;
    state.dayPlan = plan;
    return;
  }
  const scale = plan.calories ? manual / plan.calories : 1;
  plan.calories = planRound(manual);
  if (plan.p) {
    plan.p = Math.round(plan.p * scale);
    plan.f = Math.round(plan.f * scale);
    plan.c = Math.round(plan.c * scale);
    state.settings.macros = { p: plan.p, f: plan.f, c: plan.c };
  }
  plan.manual = true;
  plan.version = 7;
  plan.note = "Цю цифру ти задав сам. Решта плану лишилась під ціль.";
  state.dayPlan = plan;
  state.settings.calories = plan.calories;
}

function recipePortionFit(recipe, mealTarget) {
  if (typeof recipeEstimate !== "function") return null;
  const energy = dayEnergy(typeof selectedDate !== "undefined" ? selectedDate : today());
  const meal = Number(mealTarget) || energy.perMeal || 550;
  let best = null;
  [1, 1.5, 2].forEach(servings => {
    const estimate = recipeEstimate(recipe, servings);
    const gap = Math.abs(estimate.kcal - meal);
    if (!best || gap < best.gap) best = { servings, estimate, gap, meal };
  });
  return best;
}

function recipeGoalScore(recipe, mealTarget) {
  const plan = state.dayPlan;
  const fit = recipePortionFit(recipe, mealTarget);
  if (!plan || !fit) return 0;
  const estimate = fit.estimate;
  const meal = fit.meal;
  let score = -Math.abs(estimate.kcal - meal) / 30;
  if (plan.purpose === "lose" || plan.purpose === "muscle" || plan.purpose === "recomp") score += estimate.p * 0.8 - estimate.kcal / 120;
  if (plan.purpose === "gain") score += Math.min(estimate.kcal, meal + 120) / 80;
  if (plan.mode === "lowcarb" || plan.mode === "keto") score += estimate.c < 30 ? 30 : -estimate.c / 4;
  if (plan.purpose === "lose" && recipe.category === "dessert") score -= 60;
  const answers = state.startChoices && state.startChoices.v === 2 ? state.startChoices : null;
  if (answers) {
    const slot = { breakfast: "breakfast", soup: "lunch", lunch: "lunch", salad: "lunch", dinner: "dinner", snack: "snack", dessert: "snack", drink: "snack" }[recipe.category] || "lunch";
    const reject = PlanEngine.foodReject(recipe, answers, slot, new Set(["slot:" + slot]));
    if (reject && reject.hard) score -= 500;
    else if (reject) score -= 90;
  }
  return score;
}

function openSmartPlan() {
  if (typeof openMyPlan === "function") return openMyPlan();
  openModal("МІЙ ПЛАН", smartPlanBody(state.dayPlan || computeSmartPlan(planInputFromState())));
}

function restoreSmartExtras() {
  if (!state || state.demo) return;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw || typeof raw !== "object") return;
    if (raw.startChoices && typeof raw.startChoices === "object") state.startChoices = raw.startChoices;
    if (raw.smartMeta && typeof raw.smartMeta === "object") state.smartMeta = raw.smartMeta;
    if (raw.dayPlan && typeof raw.dayPlan === "object" && (raw.dayPlan.calories || raw.dayPlan.care || raw.dayPlan.missing)) state.dayPlan = raw.dayPlan;
    if (raw.myPlan && typeof raw.myPlan === "object" && raw.myPlan.version === 1) state.myPlan = raw.myPlan;
    if (Array.isArray(raw.planHistory)) state.planHistory = raw.planHistory.slice(0, 60);
    if (raw.settings && raw.settings.weighReminder && typeof raw.settings.weighReminder === "object") state.settings.weighReminder = raw.settings.weighReminder;
  } catch (error) {}
  if (state.startChoices && state.startChoices.v !== 2) state.startChoices = PlanEngine.normalizeAnswers(state.startChoices);
  const stale = !state.dayPlan || ((state.dayPlan.version !== 7 || !state.dayPlan.energyVersion) && !state.dayPlan.manual);
  if (stale && state.profile && state.profile.weight) {
    applySmartPlan(computeSmartPlan(planInputFromState()), { fresh: false });
    persist();
  }
}

function rememberPhoneSteps(steps) {
  const day = today();
  state.smartMeta = state.smartMeta || {};
  state.smartMeta.phone = { date: day, steps: steps };
  if (state.smartMeta.manual && state.smartMeta.manual[day]) return;
  const entry = log(day);
  if (entry.steps === steps) return;
  entry.steps = steps;
  persist();
  if (typeof render === "function" && ["today", "move", "food"].includes(currentView)) render();
}

function pullPhoneSteps() {
  if (location.port !== "14711") return;
  fetch("/health/steps", { cache: "no-store" }).then(response => response.json()).then(data => {
    if (data && data.ok && Number.isFinite(Number(data.steps))) rememberPhoneSteps(Number(data.steps));
  }).catch(() => {});
}

try { restoreSmartExtras(); } catch (error) {}

const matchedBeforePlan = matchedRecipes;
matchedRecipes = function () {
  const list = matchedBeforePlan();
  if (!state.dayPlan) return list;
  return list.slice().sort((a, b) => recipeGoalScore(b) - recipeGoalScore(a));
};

const recipesBeforePlan = recipesView;
recipesView = function () {
  const html = recipesBeforePlan();
  const plan = state.dayPlan;
  if (!plan) return html;
  const energy = dayEnergy(typeof selectedDate !== "undefined" ? selectedDate : today());
  const banner = '<section class="plan-food-banner"><span>ПІД ТВІЙ ДЕНЬ</span><b>' + esc(energy.target ? "Сьогодні " + num(energy.target) + " ккал · близько " + num(energy.perMeal) + " на прийом" : "Ідеї без жорсткої цифри") + '</b><p>' + esc(energy.extra ? energy.note : plan.food) + '</p></section>';
  return html.replace('<div class="recipe-categories"', banner + '<div class="recipe-categories"');
};

const homeBeforePlan = homeApp;
homeApp = function () {
  const html = homeBeforePlan();
  const plan = state.dayPlan;
  if (!plan) return html;
  const energy = dayEnergy(selectedDate);
  const session = planSessionToday(plan, selectedDate);
  const detail = energy.extra ? energy.note + " · план " + num(energy.base) + " + " + num(energy.extra) : (session || plan.move);
  const card = '<section class="day-plan-card"><span>ЇЖА ЦЬОГО ДНЯ</span><div><b>' + (energy.target ? num(energy.target) + " ккал" : "Без автоцифри") + '</b><small>' + esc(detail) + '</small></div><button data-action="plan">Мій план ↗</button></section>' + (weighInDue() ? '<section class="weigh-card"><span>РАЗ НА ТИЖДЕНЬ</span><strong>Час зважитись</strong><p>Одна ранкова цифра. План, меню й ідеї їжі оновляться від неї.</p><button type="button" data-action="weigh-in">Внести вагу</button></section>' : '');
  const at = html.indexOf("energy-card-v2");
  const close = at >= 0 ? html.indexOf("</section>", at) : -1;
  const withCard = close >= 0 ? html.slice(0, close + 10) + card + html.slice(close + 10) : card + html;
  return withCard.replace(/\d+ смачних ідей/, plan.purpose === "lose" ? "Тарілки під ціль" : plan.purpose === "muscle" || plan.purpose === "gain" ? "Більше білка" : "Під твій ритм");
};

const sportBeforePlan = sportHomeCard;
sportHomeCard = function () {
  const html = sportBeforePlan();
  const session = state.dayPlan && planSessionToday(state.dayPlan, selectedDate);
  if (!session) return html;
  if (html.indexOf("Побажання, тренування й інтерактивний плеєр") >= 0) return html.replace("Побажання, тренування й інтерактивний плеєр", session);
  if (html.indexOf("Тренування, дім чи прогулянка") >= 0) return html.replace("Тренування, дім чи прогулянка", session);
  return html;
};

const foodBeforePlan = foodView;
foodView = function () {
  const html = foodBeforePlan();
  if (!state.dayPlan) return html;
  const energy = dayEnergy(selectedDate);
  return html.replace(/\d+ ідей під твій настрій/, energy.target ? "Ідеї під " + num(energy.target) + " ккал" : "Ідеї під твою ціль");
}

const recipeCardBeforeEnergy = typeof recipeCard === "function" ? recipeCard : null;
if (recipeCardBeforeEnergy) recipeCard = function (recipe) {
  const html = recipeCardBeforeEnergy(recipe);
  const fit = recipePortionFit(recipe);
  if (!fit || !fit.meal) return html;
  const word = fit.gap / fit.meal <= 0.18 ? "під твій прийом" : fit.estimate.kcal < fit.meal ? "легше за прийом" : "щільніше за прийом";
  const shown = num(Math.round(fit.estimate.kcal / 10) * 10);
  return html.replace(/≈\s*[\d\s\u00a0\u202f]+/, "≈ " + shown).replace("ккал / порція", "ккал · " + num(fit.servings, 1) + " порц. · " + word);
};

actions["weigh-in"] = openWeighIn;
document.addEventListener("submit", event => {
  if (!event.target || event.target.id !== "weighForm") return;
  event.preventDefault();
  const kg = planNumber(new FormData(event.target).get("weight"), 35, 250);
  if (!kg) {
    toast("Вкажи вагу від 35 до 250 кг.");
    return;
  }
  saveWeighIn(kg);
});;

document.addEventListener("submit", event => {
  if (!event.target || event.target.id !== "stepsForm") return;
  state.smartMeta = state.smartMeta || {};
  state.smartMeta.manual = state.smartMeta.manual || {};
  state.smartMeta.manual[selectedDate] = true;
}, true);

$("modal").addEventListener("close", () => $("modal").classList.remove("plan-sheet"));

pullPhoneSteps();
setInterval(pullPhoneSteps, 45000);
