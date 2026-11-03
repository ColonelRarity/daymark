/* Daily plan from the person's goal, body, and deadline.
   Mifflin–St Jeor for resting burn, then a pace that fits the date
   without going past a gentle weekly change. Not a medical prescription. */

function planWords(text) {
  return String(text || "").toLocaleLowerCase("uk").split(/[,.;/]+/).map(item => item.trim()).filter(item => item.length >= 3).slice(0, 8);
}

function planNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) return null;
  return number;
}

function planRound(value) {
  return Math.round(value / 10) * 10;
}

function planInputFromState() {
  const choices = state.startChoices || {};
  const profile = state.profile || {};
  const activity = { seated: "seated", walks: "walks", light: "walks", train2: "train", train3: "train", mixed: "walks", train5: "active", physical: "active" };
  const current = typeof goal === "function" ? goal() : { kind: "form", title: "", end: "" };
  return {
    name: profile.name || "",
    age: profile.age,
    height: profile.height,
    weight: profile.weight,
    targetWeight: profile.targetWeight,
    sex: profile.sex || choices.sex || "",
    activity: choices.activity || activity[profile.activityLevel] || "seated",
    goal: choices.goal || current.kind,
    custom: choices.custom || "",
    kind: current.kind,
    title: current.title,
    goalDate: choices.goalDate || current.end || "",
    health: choices.health || "",
    mode: choices.mode || (state.settings && state.settings.style === "keto" ? "keto" : state.settings && state.settings.fasting ? "fasting" : "balanced"),
    prefs: Array.isArray(choices.prefs) ? choices.prefs : [],
    meals: choices.meals || "",
    workouts: choices.workouts || "",
    wish: choices.wish || "",
    avoid: choices.avoid || "",
    workoutTime: choices.workoutTime || ""
  };
}

function planPurpose(source) {
  const id = source.custom && String(source.custom).trim() ? "custom" : (source.goal || source.kind || "form");
  const map = {
    lose: "lose", comfortable: "lose",
    gain: "gain",
    muscle: "muscle", stronger: "muscle",
    shape: "recomp",
    form: "maintain", maintain: "maintain", foodrhythm: "maintain", evening: "maintain", lesssugar: "maintain", water: "maintain",
    sleep: "sleep", energy: "energy",
    walking: "walk", stamina: "walk", regularmove: "walk",
    homebody: "home", restart: "home",
    firstmonth: "habit", consistency: "habit"
  };
  if (map[id]) return map[id];
  const kind = source.kind || id;
  const nutrition = (typeof GOAL_TEMPLATES !== "undefined" && GOAL_TEMPLATES[kind] && GOAL_TEMPLATES[kind].nutrition) || null;
  if (nutrition === "lose") return "lose";
  if (kind === "muscle") return "muscle";
  if (nutrition === "gain") return "gain";
  if (kind === "sleep") return "sleep";
  if (kind === "walking") return "walk";
  if (kind === "homefit") return "home";
  return "maintain";
}

function planMovement(source, purpose, care, limits) {
  const prefs = Array.isArray(source.prefs) ? source.prefs : [];
  const gym = prefs.includes("gym");
  const home = prefs.includes("home") || purpose === "home";
  const walk = prefs.includes("walk") || purpose === "walk" || (!gym && !home);
  const place = gym ? "gym" : home ? "home" : "outdoor";
  const cap = { "Без тренувань": 0, "1–2 рази": 2, "3–4 рази": 4, "5+ разів": 5 };
  const maxSessions = Object.prototype.hasOwnProperty.call(cap, source.workouts) ? cap[source.workouts] : null;
  const easy = limits || source.health === "beginner";
  let sessions = [];
  if (care || maxSessions === 0 && purpose !== "lose" && purpose !== "walk") {
    sessions = [];
  } else if (limits) {
    sessions = [{ name: "Коротка прогулянка", detail: "15–20 хв · 3 рази на тиждень", days: [2, 4, 6] }];
  } else if (purpose === "muscle" || purpose === "gain") {
    sessions = [{ name: gym ? "Силове в залі" : "Силове вдома", detail: (easy ? "25" : gym ? "45" : "30") + " хв · " + (easy ? "2" : "3") + " рази", days: easy ? [1, 4] : [1, 3, 5] }];
    if (walk && maxSessions !== 2) sessions.push({ name: "Легка прогулянка", detail: "20 хв · у дні без силового", days: [2, 4, 6] });
  } else if (purpose === "sleep") {
    sessions = [{ name: "Спокійна прогулянка", detail: "15 хв · не пізно ввечері", days: [1, 3, 5] }];
  } else if (purpose === "walk") {
    sessions = [{ name: "Прогулянка", detail: (easy ? "25" : "35") + " хв · 5 разів", days: [1, 2, 3, 4, 5] }];
  } else if (purpose === "energy") {
    sessions = [{ name: "Ранкова прогулянка", detail: "20 хв · 4 рази", days: [1, 2, 4, 5] }, { name: home || !gym ? "Коротке силове" : "Силове", detail: "20 хв · 2 рази", days: [3, 6] }];
  } else {
    const strength = { name: gym ? "Силове в залі" : "Силове вдома", detail: (easy ? "20" : "30") + " хв · " + (easy ? "2" : "3") + " рази", days: [1, 3, 5] };
    const stroll = { name: "Прогулянка", detail: (easy ? "20" : "35") + " хв · 4 рази", days: [1, 2, 4, 6] };
    if (maxSessions === 0) sessions = [stroll];
    else if (gym && !walk) sessions = [strength];
    else if (purpose === "lose") sessions = walk && !gym ? [stroll, strength] : [strength, stroll];
    else sessions = [strength, stroll];
  }
  if (maxSessions !== null && maxSessions > 0) {
    let budget = maxSessions;
    const fitted = [];
    for (const item of sessions) {
      if (budget <= 0) break;
      const days = item.days.slice(0, budget);
      budget -= days.length;
      const times = days.length === 1 ? "1 раз" : days.length < 5 ? days.length + " рази" : days.length + " разів";
      fitted.push(Object.assign({}, item, { days, detail: item.detail.replace(/\d+\s*раз(?:и|ів)?/, times) }));
    }
    sessions = fitted;
  }
  const steps = care ? null : purpose === "walk" ? 10000 : purpose === "sleep" || limits ? 6000 : purpose === "muscle" || purpose === "gain" ? 7000 : source.activity === "active" ? 10000 : source.activity === "walks" ? 9000 : 8000;
  const likes = purpose === "walk" || purpose === "sleep" ? "walking" : purpose === "muscle" || purpose === "gain" ? "strength" : "mixed";
  const counted = sessions.reduce((sum, item) => sum + item.days.length, 0);
  const frequency = maxSessions ? Math.max(2, Math.min(5, counted || 2)) : Math.max(2, Math.min(5, counted > 4 ? 4 : 3));
  return { sessions, steps, place, likes, frequency, sessionMinutes: easy ? 20 : 30, beginner: !!easy };
}

function computeSmartPlan(source) {
  const src = source || planInputFromState();
  let purpose = planPurpose(src);
  const care = src.health === "pregnancy" || src.health === "medical";
  const limits = src.health === "limits";
  const age = planNumber(src.age, 18, 80);
  const height = planNumber(src.height, 130, 220);
  const weight = planNumber(src.weight, 35, 250);
  const targetWeight = planNumber(src.targetWeight, 35, 250);
  const sex = src.sex === "male" || src.sex === "female" ? src.sex : "";
  const pal = { seated: 1.2, walks: 1.375, train: 1.55, active: 1.725 }[src.activity] || 1.3;
  let move = planMovement(src, purpose, care, limits);
  const meals = planNumber(src.meals, 2, 5);
  const wishWords = planWords(src.wish);
  const avoidWords = planWords(src.avoid);
  const lessSugar = (src.prefs || []).includes("sugar") || src.goal === "lesssugar" || purpose === "lose";
  const mode = care ? "balanced" : (src.mode || "balanced");
  const base = {
    purpose, care, limits, mode, meals: meals || 3, wishWords, avoidWords, lessSugar,
    sessions: move.sessions, steps: move.steps, place: move.place, likes: move.likes,
    frequency: move.frequency, sessionMinutes: move.sessionMinutes, beginner: move.beginner,
    activity: src.activity || "seated", title: src.title || "", manual: false, stretched: false
  };
  if (care) {
    return Object.assign(base, {
      calories: null, maintenance: null, p: null, f: null, c: null, weeklyKg: null, endDate: "",
      missing: "",
      food: "Регулярні прийоми їжі без автоматичного дефіциту чи кето. Орієнтир калорій краще узгодити з фахівцем.",
      move: "Тренування автоматично не призначаємо. Рух — лише той, який тобі вже дозволений.",
      pace: "Строк цілі лишається твоїм. Темп ваги застосунок не рахує.",
      note: "Вагітність, годування або лікувальне харчування: цифру на день не ставимо. Щоденник можна вести як є."
    });
  }
  if (!age || !height || !weight) {
    return Object.assign(base, {
      calories: null, maintenance: null, p: null, f: null, c: null, weeklyKg: null, endDate: "",
      missing: "Додай вік, зріст і вагу — і з’явиться цифра на день.",
      food: "Поки без персональної калорійності. Ідеї страв уже підлаштовані під ціль.",
      move: move.sessions.length ? move.sessions.map(item => item.name + " · " + item.detail).join(". ") + "." : "Рух у зручному темпі, без обов’язкової норми.",
      pace: "Строк можна задати, коли з’являться вага й дата.",
      note: "Без віку, зросту й ваги формула не рахує обмін. Тренування й щоденник уже працюють."
    });
  }
  if (sex !== "male" && sex !== "female") {
    return Object.assign(base, {
      calories: null, maintenance: null, p: null, f: null, c: null, weeklyKg: null, endDate: "",
      missing: "Обери стать. Від неї залежить формула і те, як Daymark до тебе звертається.",
      food: "Ідеї страв уже під ціль. Цифру на день поставимо після формули.",
      move: move.sessions.length ? move.sessions.map(item => item.name + " · " + item.detail).join(". ") + "." : "Рух у зручному темпі.",
      pace: "Строк можна лишити. Темп ваги порахуємо разом із формулою.",
      note: "Жіноча і чоловіча формули різняться приблизно на 160 ккал обміну в спокої. Середину більше не підставляємо."
    });
  }
  const bmr = sexValue => 10 * weight + 6.25 * height - 5 * age + (sexValue === "male" ? 5 : -161);
  const resting = bmr(sex);
  const maintenance = resting * pal;
  const bmi = weight / (height / 100) ** 2;
  let noteBits = [];
  const gap = targetWeight ? targetWeight - weight : 0;
  if (gap <= -1 && purpose !== "sleep" && bmi >= 18.5) purpose = "lose";
  if (gap >= 1 && purpose !== "lose" && purpose !== "sleep") purpose = "gain";
  if (purpose === "lose" && bmi < 18.5) {
    purpose = "maintain";
    noteBits.push("Для цієї ваги й зросту зниження калорій не пропонуємо. Орієнтир — підтримання.");
  }
  if (purpose === "lose" && targetWeight && gap >= -0.4) {
    purpose = "maintain";
    noteBits.push("Бажана вага не нижча за поточну, тож тримаємо підтримання.");
  }
  if ((purpose === "gain" || purpose === "muscle") && gap <= 0.4 && targetWeight && gap < 0) purpose = "recomp";
  if (purpose !== base.purpose) {
    move = planMovement(src, purpose, care, limits);
    base.purpose = purpose;
    base.sessions = move.sessions;
    base.steps = move.steps;
    base.place = move.place;
    base.likes = move.likes;
    base.frequency = move.frequency;
    base.sessionMinutes = move.sessionMinutes;
    base.beginner = move.beginner;
  }
  const todayIso = today();
  const requested = validDate(src.goalDate) && src.goalDate > todayIso && diff(todayIso, src.goalDate) <= 730 ? src.goalDate : "";
  let weekly = 0;
  let endDate = requested;
  let stretched = false;
  const maxLose = Math.min(1, Math.max(0.4, Math.round(weight * 0.01 * 10) / 10));
  const maxGain = purpose === "muscle" ? 0.25 : 0.3;
  if (purpose === "lose" && gap < -0.4) {
    const absGap = -gap;
    if (requested) {
      const asked = absGap / (diff(todayIso, requested) / 7);
      if (asked > maxLose) {
        weekly = maxLose;
        endDate = offset(todayIso, Math.min(730, Math.ceil(absGap / weekly * 7)));
        stretched = true;
      } else weekly = asked;
    } else {
      weekly = Math.min(maxLose, 0.5);
      endDate = offset(todayIso, Math.min(730, Math.max(28, Math.ceil(absGap / weekly * 7))));
    }
  } else if (purpose === "lose") {
    weekly = Math.min(maxLose, 0.5);
    if (!endDate) endDate = offset(todayIso, 84);
    noteBits.push("Бажану вагу не вказано, тож темп близько 0,5 кг на тиждень.");
  } else if ((purpose === "gain" || purpose === "muscle") && gap > 0.4) {
    const asked = requested ? gap / (diff(todayIso, requested) / 7) : 0.25;
    weekly = Math.min(maxGain, Math.max(0.1, asked));
    if (requested && asked > maxGain) {
      endDate = offset(todayIso, Math.min(730, Math.ceil(gap / weekly * 7)));
      stretched = true;
    } else if (!requested) endDate = offset(todayIso, Math.min(730, Math.ceil(gap / weekly * 7)));
  } else if (purpose === "muscle" || purpose === "gain") weekly = purpose === "muscle" ? 0.15 : 0.25;
  let delta = 0;
  if (purpose === "lose") delta = -(weekly * 7700) / 7;
  else if (purpose === "gain" || purpose === "muscle") delta = (weekly * 7700) / 7;
  else if (purpose === "recomp") delta = gap < -0.4 ? -Math.min(250, maintenance * 0.08) : 120;
  const floor = sex === "male" ? 1700 : sex === "female" ? 1500 : 1600;
  let calories = maintenance + delta;
  if (calories < floor && purpose === "lose") {
    const allowed = maintenance - floor;
    if (allowed > 80 && gap < -0.4) {
      weekly = (allowed * 7) / 7700;
      const absGap = -gap;
      endDate = offset(todayIso, Math.min(730, Math.ceil(absGap / Math.max(weekly, 0.1) * 7)));
      stretched = true;
    }
    calories = Math.max(calories, floor);
  }
  calories = planRound(Math.max(floor, Math.min(4500, calories)));
  if (calories <= floor + 10 && purpose === "lose") noteBits.push("Нижче " + num(floor) + " ккал план не опускаємо.");
  const proteinPerKg = purpose === "muscle" ? 1.8 : purpose === "lose" || purpose === "recomp" ? 1.6 : purpose === "gain" ? 1.6 : 1.4;
  let protein = Math.round(weight * proteinPerKg);
  let fat = Math.round(weight * (mode === "keto" ? 1.1 : 0.9));
  let carbs = mode === "keto" ? 40 : Math.round((calories - protein * 4 - fat * 9) / 4);
  if (mode !== "keto" && carbs < 80) {
    fat = Math.max(Math.round(weight * 0.7), fat - 8);
    carbs = Math.round((calories - protein * 4 - fat * 9) / 4);
  }
  if (carbs < 0) carbs = 0;
  const food = mode === "keto"
    ? "Вуглеводи близько 40 г. Основа — білок, овочі й жир. Хліб, каші та солодке рідше."
    : purpose === "lose"
      ? "У кожному прийомі білок і овочі, гарнір знайомий. Солодке можна, просто не замість обіду. Білка близько " + protein + " г."
      : purpose === "muscle" || purpose === "gain"
        ? "Не пропускай білок: близько " + protein + " г. Якщо до вечора калорій менше за орієнтир, додай перекус."
        : purpose === "sleep"
          ? "Вечеря спокійна і не впритул до сну. Калорії — на підтримання, без урізання."
          : "Звичні прийоми їжі навколо орієнтира. Нічого не заборонено, дивимось на день цілком.";
  const sugar = lessSugar ? " Солодкі ідеї опускаємо нижче в списку." : "";
  const perMeal = meals ? " На прийом виходить близько " + num(planRound(calories / (meals || 3))) + " ккал." : "";
  const pace = purpose === "lose" && weekly
    ? "Близько " + num(weekly, 1) + " кг на тиждень" + (endDate ? " · до " + fdate(endDate, true) : "") + (stretched ? ". Запрошений строк був би надто швидким, тож дату розраховано за спокійним темпом." : ".")
    : purpose === "gain" || purpose === "muscle"
      ? "Невеликий плюс до підтримання" + (endDate ? " · до " + fdate(endDate, true) : "") + (stretched ? ". Темп набору обмежено, щоб не квапити вагу." : ".")
      : "Вагу не женемо. Орієнтир тримає звичайний день" + (endDate ? " до " + fdate(endDate, true) : "") + ".";
  const moveLine = move.sessions.length
    ? move.sessions.map(item => item.name + " · " + item.detail).join(". ") + (src.workoutTime ? ". Зручний час: " + src.workoutTime + "." : ".")
    : "Окремі тренування не ставимо. Кроки можна додавати, коли зручно.";
  noteBits.push("Цифра виходить із різниці ваги і дати. Звичайний день уже включає обрану активність.");
  noteBits.push("Сьогодні на головній цифра може зрости: від тренування в щоденнику, від кроків понад план або від активних ккал годинника. Менше руху порцію не зменшує.");
  return Object.assign(base, {
    version: 7,
    purpose, calories, maintenance: planRound(maintenance), p: protein, f: fat, c: carbs,
    weeklyKg: weekly ? Math.round(weekly * 10) / 10 : null, endDate: endDate || "", stretched,
    missing: "", perMeal: planRound(calories / (meals || 3)), food: food + sugar + perMeal, move: moveLine + (move.steps ? " Кроків на день близько " + num(move.steps) + "." : ""),
    pace, note: noteBits.join(" ")
  });
}

function smartPlanBody(plan) {
  const delta = plan.maintenance && plan.calories ? plan.maintenance - plan.calories : 0;
  const deltaLine = plan.calories && plan.maintenance
    ? '<p class="plan-delta">' + (delta > 0 ? "Підтримання ≈ " + num(plan.maintenance) + " · мінус " + num(delta) + " ккал" : delta < 0 ? "Підтримання ≈ " + num(plan.maintenance) + " · плюс " + num(-delta) + " ккал" : "Це підтримання, без зміни калорій") + "</p>"
    : "";
  const number = plan.calories
    ? '<div class="plan-kcal"><small>ОРІЄНТИР НА ДЕНЬ</small><strong>' + num(plan.calories) + '</strong><span>ккал</span></div>' + deltaLine + '<div class="plan-macros"><b><i>Б</i>' + num(plan.p) + ' г</b><b><i>Ж</i>' + num(plan.f) + ' г</b><b><i>В</i>' + num(plan.c) + ' г</b></div>'
    : '<div class="plan-kcal quiet"><small>ОРІЄНТИР НА ДЕНЬ</small><strong>—</strong><span>' + esc(plan.missing || "Без автоматичної цифри") + '</span></div>';
  const rows = [["🥗", "Їжа", plan.food], ["🏃", "Рух", plan.move], ["📅", "Строк", plan.pace]].map(([icon, title, text]) => '<div class="start-row"><em>' + icon + '</em><div><b>' + title + '</b><p>' + esc(text) + '</p></div></div>').join("");
  return number + rows + '<p class="start-note">' + esc(plan.note) + '</p>';
}

function applyTrainingPrefs(plan) {
  if (typeof trainingPrefs === "undefined" || typeof TRAINING_PREF_KEY === "undefined") return;
  const goals = { lose: "lose", gain: "strength", muscle: "muscle", recomp: "muscle", walk: "cardio", home: "start", sleep: "form", energy: "cardio", habit: "start", maintain: "maintain" };
  trainingPrefs.goal = goals[plan.purpose] || "maintain";
  trainingPrefs.place = plan.place === "gym" ? "gym" : plan.place === "outdoor" ? "outdoor" : "home";
  trainingPrefs.gear = trainingPrefs.place === "gym" ? "machine" : "none";
  trainingPrefs.level = plan.beginner ? "beginner" : "regular";
  trainingPrefs.frequency = [2, 3, 4, 5].includes(plan.frequency) ? plan.frequency : 3;
  trainingPrefs.time = [15, 20, 30, 45, 60].includes(plan.sessionMinutes) ? plan.sessionMinutes : 30;
  trainingPrefs.likes = ["mixed", "walking", "strength", "cardio"].includes(plan.likes) ? plan.likes : "mixed";
  trainingPrefs.limitations = plan.care || plan.limits ? "medical" : "none";
  trainingPrefs.setup = true;
  try { localStorage.setItem(TRAINING_PREF_KEY, JSON.stringify(trainingPrefs)); } catch (error) {}
}

function applySmartPlan(plan, options) {
  if (!plan) return;
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
  const current = state.goals && state.goals[0];
  if (current && plan.stretched && validDate(plan.endDate) && plan.endDate >= current.start && diff(current.start, plan.endDate) <= 730) current.end = plan.endDate;
  if (!options || options.fresh || typeof trainingPrefs === "undefined" || !trainingPrefs.setup) applyTrainingPrefs(plan);
}

function planSessionToday(plan, iso) {
  if (!plan || !plan.sessions || !plan.sessions.length) return "";
  const day = dt(iso).getUTCDay();
  const match = plan.sessions.find(item => item.days && item.days.includes(day)) || plan.sessions[0];
  return match.name + " · " + match.detail;
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
  const pal = { seated: 1.2, walks: 1.375, train: 1.55, active: 1.725 }[plan.activity] || 1.3;
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

function plannedWorkout(iso) {
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
  const extra = foodExtraFromBurn(workoutBurn(session, weight), plan.activity);
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

function weighInDue() {
  if (!state || state.demo || !state.profile) return false;
  if (state.dayPlan && state.dayPlan.care) return false;
  if (!planNumber(state.profile.weight, 35, 250)) return false;
  rememberStartingWeight();
  const last = latestWeightCheck();
  const since = last ? last.date : ((state.goals && state.goals[0] && state.goals[0].start) || today());
  return diff(since, today()) >= 7;
}

function weighStatusLine() {
  const last = latestWeightCheck();
  if (!last) return "Раз на тиждень Daymark просить зважитись. Нова вага оновлює той самий план, меню й ідеї їжі.";
  const left = 7 - diff(last.date, today());
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
  state.startChoices = state.startChoices || {};
  state.startChoices.weight = String(kg);
  const bits = ["Вага " + num(kg, 1) + " кг записана."];
  if (previous) {
    const delta = Math.round((kg - previous) * 10) / 10;
    bits.push(delta === 0 ? "З минулого разу без зміни." : "З минулого разу " + (delta > 0 ? "+" : "") + num(delta, 1) + " кг.");
  }
  const target = planNumber(state.profile.targetWeight, 35, 250);
  if (target) bits.push("До бажаної ваги " + num(Math.abs(target - kg), 1) + " кг.");
  if (state.dayPlan && !state.dayPlan.manual && !state.dayPlan.care && (state.profile.sex === "male" || state.profile.sex === "female")) {
    applySmartPlan(computeSmartPlan(planInputFromState()), { fresh: false });
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
  if (plan.mode === "keto") score += estimate.c < 30 ? 30 : -estimate.c / 4;
  if (plan.lessSugar && recipe.category === "dessert") score -= 70;
  if (plan.purpose === "lose" && recipe.category === "dessert") score -= 20;
  const title = recipe.title.toLocaleLowerCase("uk");
  (plan.avoidWords || []).forEach(word => { if (title.includes(word)) score -= 120; });
  (plan.wishWords || []).forEach(word => { if (title.includes(word)) score += 40; });
  return score;
}

function openSmartPlan() {
  const plan = state.dayPlan || computeSmartPlan(planInputFromState());
  const profile = state.profile || {};
  const goalDate = (state.startChoices && state.startChoices.goalDate) || (state.goals && state.goals[0] && state.goals[0].end) || "";
  const html = '<div class="plan-page"><div class="plan-scroll"><div class="start-hero"><span>МІЙ ПЛАН · ПІД ЦІЛЬ</span><h3>' + esc((state.goals && state.goals[0] && state.goals[0].title) || "Мій ритм") + '</h3><p>Калорії виходять із ваги, яку хочеш змінити, і з дати. Можна поправити цифри внизу.</p></div>'
    + smartPlanBody(plan)
    + '<p class="start-note">' + esc(weighStatusLine()) + '</p><button type="button" class="text-btn" data-action="weigh-in">Зважитись</button>'
    + '<form id="planTune" class="plan-tune"><div class="start-kicker">УТОЧНИТИ</div><div class="start-pills"><button type="button" class="start-pill' + (profile.sex === "female" ? " active" : "") + '" data-plan-sex="female">Жіноча формула</button><button type="button" class="start-pill' + (profile.sex === "male" ? " active" : "") + '" data-plan-sex="male">Чоловіча формула</button></div>'
    + '<div class="start-two"><label class="start-field">Вік<input name="age" type="number" inputmode="numeric" min="18" max="80" value="' + esc(profile.age || "") + '"></label><label class="start-field">Зріст<input name="height" type="number" inputmode="decimal" min="130" max="220" value="' + esc(profile.height || "") + '"></label></div>'
    + '<div class="start-two"><label class="start-field">Вага<input name="weight" type="number" inputmode="decimal" min="35" max="250" step="0.1" value="' + esc(profile.weight || "") + '"></label><label class="start-field">Бажана<input name="targetWeight" type="number" inputmode="decimal" min="35" max="250" step="0.1" value="' + esc(profile.targetWeight || "") + '"></label></div>'
    + '<label class="start-field">Дата цілі<span class="plan-date-clip"><input name="goalDate" type="date" value="' + esc(goalDate) + '"></span></label>'
    + '<label class="start-field">Своя цифра, ккал<input name="calories" type="number" inputmode="numeric" min="1000" max="5000" placeholder="Лише якщо не хочеш розрахунок" value=""></label></form></div>'
    + '<div class="plan-dock"><button type="button" data-plan-recalc>Перерахувати мій план</button></div></div>';
  openModal("МІЙ ПЛАН", html);
  $("modal").classList.remove("start-flow");
  $("modal").classList.add("plan-sheet");
}

function savePlanTune(form) {
  try {
    const data = Object.fromEntries(new FormData(form).entries());
    state.startChoices = state.startChoices || {};
    state.profile = state.profile || {};
    if (state.profile.sex !== "male" && state.profile.sex !== "female") {
      toast("Спочатку обери жіночу або чоловічу формулу.");
      return;
    }
    ["age", "height", "weight"].forEach(key => {
      if (data[key]) state.profile[key] = String(data[key]).trim();
    });
    if (data.targetWeight !== undefined) state.profile.targetWeight = String(data.targetWeight || "").trim();
    if (data.goalDate && !validDate(data.goalDate)) {
      toast("Дата не прочиталась. Обери її ще раз.");
      return;
    }
    if (validDate(data.goalDate) && data.goalDate <= today()) {
      toast("Дата цілі має бути попереду.");
      return;
    }
    if (validDate(data.goalDate)) {
      state.startChoices.goalDate = data.goalDate;
      const current = state.goals && state.goals[0];
      if (current && data.goalDate >= current.start && diff(current.start, data.goalDate) <= 730) current.end = data.goalDate;
    }
    const manual = planNumber(data.calories, 1000, 5000);
    const plan = computeSmartPlan(planInputFromState());
    if (manual) {
      const scale = plan.calories ? manual / plan.calories : 1;
      plan.calories = planRound(manual);
      if (plan.p) {
        plan.p = Math.round(plan.p * scale);
        plan.f = Math.round(plan.f * scale);
        plan.c = Math.round(plan.c * scale);
      }
      plan.manual = true;
      plan.version = 7;
      plan.note = "Цю цифру ти задав сам. Решта плану лишилась під ціль.";
    }
    applySmartPlan(plan, { fresh: false });
    persist();
    openSmartPlan();
    try { render(); } catch (error) {}
    const scroller = document.querySelector(".plan-scroll");
    if (scroller) scroller.scrollTop = 0;
    toast(plan.calories ? "Орієнтир оновлено: " + num(plan.calories) + " ккал." : "Без віку, зросту й ваги цифру не рахуємо.");
  } catch (error) {
    toast("Не вдалося перерахувати. Перевір цифри.");
  }
}

function restoreSmartExtras() {
  if (!state || state.demo) return;
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "null");
    if (!raw || typeof raw !== "object") return;
    if (raw.startChoices && typeof raw.startChoices === "object") state.startChoices = raw.startChoices;
    if (raw.smartMeta && typeof raw.smartMeta === "object") state.smartMeta = raw.smartMeta;
    if (raw.dayPlan && typeof raw.dayPlan === "object" && (raw.dayPlan.calories || raw.dayPlan.care || raw.dayPlan.missing)) state.dayPlan = raw.dayPlan;
  } catch (error) {}
  const stale = !state.dayPlan || (state.dayPlan.version !== 7 && !state.dayPlan.manual);
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

document.addEventListener("click", event => {
  if (!$("modal").classList.contains("plan-sheet")) return;
  const sex = event.target.closest("[data-plan-sex]");
  if (sex) {
    state.profile.sex = sex.dataset.planSex;
    state.startChoices = state.startChoices || {};
    state.startChoices.sex = state.profile.sex;
    $("modal").querySelectorAll("[data-plan-sex]").forEach(button => button.classList.toggle("active", button === sex));
    return;
  }
  const recalc = event.target.closest("[data-plan-recalc]");
  if (!recalc) return;
  event.preventDefault();
  const form = document.getElementById("planTune");
  if (form) savePlanTune(form);
});

document.addEventListener("submit", event => {
  if (!event.target || event.target.id !== "stepsForm") return;
  state.smartMeta = state.smartMeta || {};
  state.smartMeta.manual = state.smartMeta.manual || {};
  state.smartMeta.manual[selectedDate] = true;
}, true);

$("modal").addEventListener("close", () => $("modal").classList.remove("plan-sheet"));

pullPhoneSteps();
setInterval(pullPhoneSteps, 45000);
