/* PlanEngine — turns the questionnaire answers and the energy guide into a seven-day plan that can
   explain itself. Hard conditions reject, soft conditions rank. Same answers + same week start →
   same plan (seeded), so a restart shows what the person already saw.

   Runs on the phone and in Node (mobile/scripts/plan/plan-engine.test.mjs). Needs RECIPES,
   RECIPE_INGREDIENTS, recipeEstimate, TRAINING_PLANS, TRAINING_EXERCISES, EnergyCalc and offset().

   Rules version: bump RULES_VERSION when a hard or soft rule changes, so a saved plan can say
   which rules built it. */

const PlanEngine = (() => {
  const RULES_VERSION = "plan-1.0";

  /* Meal layouts: slot order and share of the day's energy. */
  const LAYOUT = {
    2: { slots: ["lunch", "dinner"], fractions: [0.5, 0.5], names: ["Перший прийом", "Другий прийом"] },
    3: { slots: ["breakfast", "lunch", "dinner"], fractions: [0.29, 0.36, 0.35], names: ["Сніданок", "Обід", "Вечеря"] },
    4: { slots: ["breakfast", "lunch", "dinner", "snack"], fractions: [0.25, 0.32, 0.31, 0.12], names: ["Сніданок", "Обід", "Вечеря", "Перекус"] },
    5: { slots: ["breakfast", "snack", "lunch", "snack", "dinner"], fractions: [0.22, 0.1, 0.3, 0.1, 0.28], names: ["Сніданок", "Перекус", "Обід", "Ще перекус", "Вечеря"] },
    "2s": { slots: ["lunch", "snack", "dinner"], fractions: [0.42, 0.14, 0.44], names: ["Перший прийом", "Перекус", "Другий прийом"] }
  };
  /* Which layout the answers ask for: meals 2/3/4 plus an optional snack. */
  function layoutKey(food) {
    const meals = [2, 3, 4, 5].includes(Number(food.meals)) ? Number(food.meals) : 3;
    if (meals === 2 && food.snacks) return "2s";
    return Math.min(5, meals + (food.snacks && meals < 5 ? 1 : 0));
  }
  function layoutFor(food) { return LAYOUT[layoutKey(food)] || LAYOUT[3]; }
  const SLOT_CATEGORIES = { breakfast: ["breakfast"], lunch: ["lunch", "soup", "salad"], dinner: ["dinner", "lunch", "salad"], snack: ["snack", "dessert", "drink"] };
  const SLOT_WIDE = { breakfast: ["breakfast", "snack", "salad", "lunch"], lunch: ["lunch", "soup", "salad", "dinner"], dinner: ["dinner", "lunch", "salad", "soup"], snack: ["snack", "dessert", "drink", "breakfast"] };

  /* Groups a person can exclude by one word. Ingredient ids come from RECIPE_INGREDIENTS. */
  const GROUPS = {
    meat: { label: "М’ясо й птиця", ids: ["chicken", "turkey", "beef", "pork", "mince"] },
    poultry: { label: "Курка та індичка", ids: ["chicken", "turkey", "mince"] },
    redmeat: { label: "Яловичина й свинина", ids: ["beef", "pork"] },
    fish: { label: "Риба й морепродукти", ids: ["salmon", "whitefish", "tuna", "shrimp"] },
    dairy: { label: "Молочне", allergen: "dairy", ids: ["curd", "yogurt", "milk", "cheese", "softcheese", "sourcream", "feta", "mozzarella", "kefir"] },
    egg: { label: "Яйця", allergen: "egg", ids: ["egg"] },
    gluten: { label: "Пшениця / глютен", allergen: "gluten" },
    nuts: { label: "Горіхи й арахіс", allergen: "nuts", ids: ["peanut", "nuts"] },
    soy: { label: "Соя", allergen: "soy" },
    sesame: { label: "Кунжут", allergen: "sesame" },
    seafood: { label: "Морепродукти", allergen: "seafood" },
    mustard: { label: "Гірчиця", allergen: "mustard" },
    legumes: { label: "Бобові", ids: ["beans", "chickpeas", "lentils", "hummus"] },
    mushroom: { label: "Гриби", ids: ["mushroom"] },
    sweets: { label: "Десерти й солодке", categories: ["dessert"] }
  };
  const ALLERGENS = ["dairy", "egg", "gluten", "nuts", "peanut", "fish", "seafood", "soy", "sesame", "mustard"];

  /* Formats the person can like or dislike, and the program fields they map to. */
  const FORMATS = {
    walk: { label: "Прогулянки", place: "outdoor", goal: ["cardio", "start"] },
    home: { label: "Вправи вдома", place: "home" },
    gym: { label: "Зал", place: "gym" },
    strength: { label: "Силові", goal: ["strength", "muscle"] },
    cardio: { label: "Кардіо: біг, велосипед, доріжка", goal: ["cardio"] },
    mobility: { label: "Розтяжка, йога, м’який рух", ids: ["reset", "home-gentle-15", "home-recovery", "home-quiet"] }
  };
  const GEAR = { none: "Без інвентарю", band: "Стрічка / резинка", dumbbell: "Гантелі", machine: "Тренажери в залі" };

  /* Exercises to avoid with a named limitation. Pattern on exercise id or name. */
  const LIMIT_RULES = {
    knees: { label: "Коліна", avoid: /squat|split|step|lunge|reverse|jump|run|legpress|hamcurl|goblet|wallsit|skater/i, note: "без глибоких присідань, випадів і стрибків" },
    back: { label: "Поперек", avoid: /hinge|deadlift|rdl|goodmorning|superman|situp|twist|rowbent|run|jump/i, note: "без нахилів із вагою і скручувань" },
    shoulders: { label: "Плечі", avoid: /press|push|pullapart|lat|chest|dip|plank|handstand|burpee|rowband/i, note: "без жимів над головою і віджимань" },
    heart: { label: "Серце / тиск", avoid: /run|interval|hiit|sprint|jump|burpee|treadmill|bike|row(?!band)|stairs/i, note: "без інтервалів і підвищеної інтенсивності; темп — розмовний" }
  };

  const INTENSITY_MINUTES = { easy: 0.8, moderate: 1, hard: 1.1 };
  const WEEKDAY_SPREAD = { 1: [3], 2: [1, 4], 3: [1, 3, 5], 4: [1, 2, 4, 5], 5: [1, 2, 3, 5, 6] };
  const WEEKDAY_NAMES = ["неділя", "понеділок", "вівторок", "середа", "четвер", "п’ятниця", "субота"];

  const hasArray = value => Array.isArray(value) ? value : [];
  const ingredientMeta = id => (typeof RECIPE_INGREDIENTS !== "undefined" && RECIPE_INGREDIENTS[id]) || { name: id, allergens: [] };

  /* Deterministic small hash for seeding. */
  function seedFrom(text) {
    let hash = 2166136261;
    for (let i = 0; i < text.length; i++) { hash ^= text.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return hash >>> 0;
  }
  function noise(seed, salt) { return ((seedFrom(seed + ":" + salt) % 1000) / 1000); }

  /* Normalise answers into the shape the engine reads. Old startChoices (v1) are mapped too. */
  function normalizeAnswers(raw) {
    const a = raw && typeof raw === "object" ? raw : {};
    if (a.v === 2) {
      const food = a.food || {};
      const move = a.move || {};
      const health = a.health || {};
      const goal = a.goal || {};
      const body = a.body || {};
      return {
        v: 2,
        goal: { id: goal.id || "form", custom: goal.custom || "", targetWeight: goal.targetWeight || "", deadline: goal.deadline || "" },
        body: { name: body.name || "", age: body.age || "", height: body.height || "", weight: body.weight || "", sex: body.sex || "", dailyActivity: body.dailyActivity || "" },
        food: {
          meals: [2, 3, 4, 5].includes(Number(food.meals)) ? Number(food.meals) : 3,
          snacks: !!food.snacks,
          mode: ["normal", "lowcarb", "window"].includes(food.mode) ? food.mode : "normal",
          window: food.window || "",
          allergies: hasArray(food.allergies),
          medicalDiet: food.medicalDiet || "",
          likes: hasArray(food.likes),
          likesText: food.likesText || "",
          pantry: hasArray(food.pantry),
          buy: hasArray(food.buy),
          budget: ["low", "mid", "any"].includes(food.budget) ? food.budget : "any",
          cookTime: [15, 30, 60].includes(Number(food.cookTime)) ? Number(food.cookTime) : 0,
          tools: hasArray(food.tools),
          exclude: { never: hasArray(food.exclude && food.exclude.never), week: hasArray(food.exclude && food.exclude.week), sometimes: hasArray(food.exclude && food.exclude.sometimes) }
        },
        move: {
          wants: ["yes", "light", "no"].includes(move.wants) ? move.wants : "yes",
          like: hasArray(move.like),
          dislike: hasArray(move.dislike),
          gymExperience: ["none", "some", "regular"].includes(move.gymExperience) ? move.gymExperience : "none",
          gear: hasArray(move.gear),
          days: [0, 1, 2, 3, 4, 5].includes(Number(move.days)) ? Number(move.days) : 2,
          minutes: [15, 20, 30, 45, 60].includes(Number(move.minutes)) ? Number(move.minutes) : 30,
          weekdays: hasArray(move.weekdays).map(Number).filter(d => d >= 0 && d <= 6),
          intensity: ["easy", "moderate", "hard"].includes(move.intensity) ? move.intensity : "moderate",
          limits: hasArray(move.limits),
          limitsText: move.limitsText || ""
        },
        health: { pregnancy: !!health.pregnancy, lactation: !!health.lactation, edHistory: !!health.edHistory, medical: !!health.medical, medication: !!health.medication, injury: !!health.injury, private: health.private !== false, skipped: !!health.skipped },
        meta: a.meta && typeof a.meta === "object" ? JSON.parse(JSON.stringify(a.meta)) : {}
      };
    }
    /* v1 start choices from the previous flow */
    const prefs = hasArray(a.prefs);
    const workouts = { "Без тренувань": 0, "1–2 рази": 2, "3–4 рази": 3, "5+ разів": 5 }[a.workouts];
    return normalizeAnswers({
      v: 2,
      goal: { id: a.goal || "form", custom: a.custom || "", targetWeight: a.targetWeight || "", deadline: a.goalDate || "" },
      body: { sex: a.sex || "", dailyActivity: { seated: "sitting", walks: "light", train: "light", active: "onfeet" }[a.activity] || "" },
      food: { meals: Number(a.meals) || 3, mode: a.mode === "keto" ? "lowcarb" : a.mode === "fasting" ? "window" : "normal", likesText: a.wish || "", exclude: { never: [], week: [], sometimes: [] } },
      move: { wants: workouts === 0 ? "no" : "yes", like: prefs.filter(id => ["walk", "home", "gym"].includes(id)), gear: prefs.includes("gym") ? ["machine"] : [], days: workouts === undefined ? 2 : workouts },
      health: { pregnancy: a.health === "pregnancy", medical: a.health === "medical", injury: a.health === "limits" }
    });
  }

  /* Map goal id to the energy purpose. */
  function purposeOf(answers) {
    const id = answers.goal.custom ? "custom" : answers.goal.id;
    const map = { lose: "lose", comfortable: "lose", gain: "gain", muscle: "muscle", stronger: "muscle", shape: "recomp", form: "maintain", maintain: "maintain", wellbeing: "maintain" };
    return map[id] || "maintain";
  }

  /* Energy input from answers — one place, so the questionnaire and the plan screen agree. */
  function energyInput(answers, todayIso) {
    const move = answers.move;
    const kind = move.wants === "no" || !move.days ? "none" : move.like.includes("strength") || move.like.includes("gym") || (move.gear.includes("dumbbell") || move.gear.includes("machine")) ? (move.like.includes("cardio") || move.like.includes("walk") ? "mixed" : "strength") : move.like.includes("walk") && !move.like.includes("home") ? "walk" : move.like.includes("cardio") ? "cardio" : "mixed";
    return {
      age: answers.body.age, heightCm: answers.body.height, weightKg: answers.body.weight, sex: answers.body.sex,
      dailyActivity: answers.body.dailyActivity,
      training: { sessionsPerWeek: move.wants === "no" ? 0 : move.days, minutesPerSession: move.minutes, kind },
      purpose: purposeOf(answers),
      targetWeightKg: answers.goal.targetWeight || null,
      deadline: answers.goal.deadline || null,
      eatingMode: answers.food.mode,
      flags: { pregnancy: answers.health.pregnancy, lactation: answers.health.lactation, edHistory: answers.health.edHistory, medical: answers.health.medical || answers.health.injury, medication: answers.health.medication },
      todayIso
    };
  }

  /* ---------- food: hard filters ---------- */

  function groupIds(key) { return GROUPS[key] ? GROUPS[key].ids || [] : [key]; }
  function groupAllergen(key) { return GROUPS[key] ? GROUPS[key].allergen || null : null; }
  function groupCategories(key) { return GROUPS[key] ? GROUPS[key].categories || [] : []; }

  function recipeHits(recipe, keys) {
    const ids = recipe.ingredients.map(x => x.id);
    for (const key of keys) {
      if (groupIds(key).some(id => ids.includes(id))) return key;
      const allergen = groupAllergen(key);
      if (allergen && recipe.ingredients.some(x => ingredientMeta(x.id).allergens.includes(allergen) || (allergen === "nuts" && x.id === "peanut"))) return key;
      if (groupCategories(key).includes(recipe.category)) return key;
    }
    return null;
  }

  function recipeAllergen(recipe, allergies) {
    for (const x of recipe.ingredients) {
      const meta = ingredientMeta(x.id);
      for (const allergen of meta.allergens) if (allergies.includes(allergen)) return allergen;
      if (allergies.includes("nuts") && x.id === "peanut") return "nuts";
      if (allergies.includes("peanut") && x.id === "peanut") return "peanut";
    }
    return null;
  }

  function recipeNeedsStove(recipe) { return !recipe.noCook; }

  /* Returns null when the recipe passes, otherwise {hard:true|false, key, why}. Soft fails are relaxable. */
  function foodReject(recipe, answers, slot, relaxed) {
    const food = answers.food;
    const allergen = recipeAllergen(recipe, food.allergies);
    if (allergen) return { hard: true, key: "allergy:" + allergen, why: "алерген" };
    const never = recipeHits(recipe, food.exclude.never);
    if (never) return { hard: true, key: "never:" + never, why: "виключено назавжди" };
    const week = recipeHits(recipe, food.exclude.week);
    if (week && !relaxed.has("week:" + week)) return { hard: false, key: "week:" + week, why: "не цього тижня" };
    if (food.cookTime && recipe.minutes > food.cookTime && !relaxed.has("cookTime")) return { hard: false, key: "cookTime", why: "довше за " + food.cookTime + " хв" };
    if (food.tools.length && food.tools.every(tool => tool === "none") && recipeNeedsStove(recipe) && !relaxed.has("tools")) return { hard: false, key: "tools", why: "потрібна плита" };
    if (slot) {
      const categories = relaxed.has("slot:" + slot) ? SLOT_WIDE[slot] : SLOT_CATEGORIES[slot];
      if (categories && !categories.includes(recipe.category)) return { hard: true, key: "slot", why: "не для цього прийому" };
    }
    return null;
  }

  /* ---------- food: soft ranking ---------- */

  function likesMatch(recipe, answers) {
    const ids = recipe.ingredients.map(x => x.id);
    let hits = 0;
    for (const like of answers.food.likes) { if (groupIds(like).some(id => ids.includes(id)) || groupCategories(like).includes(recipe.category)) hits++; }
    const text = (answers.food.likesText || "").toLocaleLowerCase("uk").split(/[,;]+/).map(s => s.trim()).filter(s => s.length >= 3);
    const title = (recipe.title + " " + recipe.ingredients.map(x => ingredientMeta(x.id).name).join(" ")).toLocaleLowerCase("uk");
    for (const word of text) if (title.includes(word.slice(0, Math.max(4, word.length - 2)))) hits++;
    return hits;
  }

  function foodScore(recipe, servings, slotTarget, answers, energy, used, seed, slot) {
    const estimate = recipeEstimate(recipe, servings);
    const food = answers.food;
    const purpose = energy && energy.purpose || "maintain";
    let score = 0;
    const reasons = [];
    score -= Math.abs(estimate.kcal - slotTarget) / 12;
    if (Math.abs(estimate.kcal - slotTarget) <= slotTarget * 0.15) reasons.push("вписується у прийом");
    if (purpose === "lose" || purpose === "muscle" || purpose === "recomp") { score += Math.min(35, estimate.p) * (purpose === "lose" ? 1 : 0.7); if (estimate.p >= 20) reasons.push("достатньо білка"); }
    if (purpose === "gain") score += Math.min(estimate.kcal, slotTarget + 120) / 80;
    if (food.mode === "lowcarb") score += estimate.c < 30 ? 25 : -estimate.c / 4;
    if ((purpose === "lose" || food.mode === "lowcarb") && recipe.category === "dessert") score -= 60;
    const likes = likesMatch(recipe, answers);
    if (likes) { score += 30 * Math.min(likes, 2); reasons.push("є те, що ти любиш"); }
    const pantry = recipe.ingredients.filter(x => food.pantry.includes(x.id)).length;
    if (pantry) { score += pantry * 10; if (pantry >= 2) reasons.push("продукти вже вдома"); }
    const buy = recipe.ingredients.filter(x => food.buy.includes(x.id)).length;
    if (buy) { score += buy * 8; reasons.push("зі списку покупок цього тижня"); }
    const sometimes = recipeHits(recipe, food.exclude.sometimes);
    if (sometimes) { score -= 45; reasons.push("рідше, як ти " + (answers.body.sex === "male" ? "просив" : "просила")); }
    if (food.budget === "low") { if (recipe.budget) { score += 12; } else score -= 25; }
    if (food.cookTime && recipe.minutes <= food.cookTime) reasons.push("за " + recipe.minutes + " хв");
    const times = used instanceof Map ? (used.get(recipe.id) || 0) : (used.has(recipe.id) ? 1 : 0);
    if (times) score -= likes >= 1 ? (times === 1 ? 18 : 240) : 280; // a loved dish may return once; a third plate waits
    score -= noise(seed, recipe.id + slot) * 8;
    return { score, reasons, estimate };
  }

  function pickMeal(slot, slotTarget, answers, energy, used, seed, relaxed, dayIndex) {
    const candidates = [];
    const rejected = {};
    for (const recipe of RECIPES) {
      const reject = foodReject(recipe, answers, slot, relaxed);
      if (reject) { if (!reject.hard) rejected[reject.key] = (rejected[reject.key] || 0) + 1; continue; }
      for (const servings of [1, 1.5, 2]) {
        const scored = foodScore(recipe, servings, slotTarget, answers, energy, used, seed + dayIndex, slot);
        candidates.push({ id: recipe.id, servings, kcal: Math.round(scored.estimate.kcal), p: Math.round(scored.estimate.p), f: Math.round(scored.estimate.f), c: Math.round(scored.estimate.c), score: scored.score, reasons: scored.reasons });
      }
    }
    candidates.sort((a, b) => b.score - a.score);
    const distinct = new Set(candidates.map(c => c.id)).size;
    return { pick: candidates[0] || null, distinct, rejected };
  }

  /* What soft condition would give the most back for a slot. */
  function relaxOptions(answers, slot, relaxed) {
    const rejected = {};
    let passing = 0;
    for (const recipe of RECIPES) {
      const reject = foodReject(recipe, answers, slot, relaxed);
      if (!reject) passing++;
      else if (!reject.hard) rejected[reject.key] = (rejected[reject.key] || 0) + 1;
    }
    const options = Object.entries(rejected).map(([key, count]) => ({ key, restores: count, label: relaxLabel(key) }));
    const wideCount = RECIPES.filter(r => { const reject = foodReject(r, answers, slot, new Set([...relaxed, "slot:" + slot])); return !reject; }).length - passing;
    if (wideCount > 0 && !relaxed.has("slot:" + slot)) options.push({ key: "slot:" + slot, restores: wideCount, label: "дозволити на цей прийом страви з інших категорій" });
    return options.sort((a, b) => b.restores - a.restores);
  }

  function relaxLabel(key) {
    if (key === "cookTime") return "дозволити довші рецепти";
    if (key === "tools") return "дозволити страви з плитою";
    if (key.startsWith("week:")) { const group = key.slice(5); return "повернути цього тижня: " + (GROUPS[group] ? GROUPS[group].label.toLowerCase() : ingredientMeta(group).name.toLowerCase()); }
    if (key.startsWith("slot:")) return "дозволити на цей прийом страви з інших категорій";
    return key;
  }

  /* Build the food week. */
  function buildFood(answers, energy, startIso, options) {
    const opts = options || {};
    const relaxed = new Set(hasArray(opts.relaxed));
    const layout = layoutFor(answers.food);
    const dayTarget = energy && energy.ok ? energy.target : null;
    const seedBase = String(seedFrom(JSON.stringify([answers.food, answers.goal, startIso, RULES_VERSION])));
    const used = new Map();
    const shortages = [];
    const days = [];
    let totalDays = 7;
    /* First pass: do all slots have at least 3 distinct candidates? If not, name what to relax.
       A slot with nothing at all gets its categories widened automatically (that is the engine's
       own convention, not the person's condition) and the plan says so; a slot with 1–2 dishes
       gives a three-day plan plus the list of soft conditions that would restore the week. */
    const autoRelaxed = [];
    for (const slot of [...new Set(layout.slots)]) {
      const slotTarget = (dayTarget || 1800) * layout.fractions[layout.slots.indexOf(slot)];
      let probe = pickMeal(slot, slotTarget, answers, energy, new Set(), seedBase, relaxed, 0);
      const options = relaxOptions(answers, slot, relaxed);
      if (probe.distinct === 0 && !relaxed.has("slot:" + slot)) {
        relaxed.add("slot:" + slot);
        autoRelaxed.push(slot);
        probe = pickMeal(slot, slotTarget, answers, energy, new Set(), seedBase, relaxed, 0);
      }
      if (probe.distinct < 3) shortages.push({ slot, distinct: probe.distinct, options: options.filter(o => !relaxed.has(o.key)) });
    }
    if (shortages.some(s => s.distinct === 0)) totalDays = 0;
    else if (shortages.length) totalDays = 3;
    const perDay = opts.trainingKcal || {};
    for (let i = 0; i < totalDays; i++) {
      const date = offset(startIso, i);
      const trainingToday = opts.trainingDates ? opts.trainingDates.includes(date) : false;
      const added = trainingToday ? (perDay[date] || 0) : 0;
      const target = dayTarget ? dayTarget + added : null;
      const meals = [];
      layout.slots.forEach((slot, j) => {
        const slotTarget = (target || 1800) * layout.fractions[j];
        const { pick } = pickMeal(slot, slotTarget, answers, energy, used, seedBase, relaxed, i * 7 + j);
        if (!pick) return;
        used.set(pick.id, (used.get(pick.id) || 0) + 1);
        meals.push({ slot, name: layout.names[j], id: pick.id, servings: pick.servings, kcal: pick.kcal, p: pick.p, f: pick.f, c: pick.c, reasons: pick.reasons.slice(0, 3) });
      });
      const sum = meals.reduce((acc, m) => ({ kcal: acc.kcal + m.kcal, p: acc.p + m.p, f: acc.f + m.f, c: acc.c + m.c }), { kcal: 0, p: 0, f: 0, c: 0 });
      days.push({ date, target, training: trainingToday, meals, sum });
    }
    return { start: startIso, meals: layout.slots.length, layoutKey: layoutKey(answers.food), layout: layout.slots, names: layout.names, days, shortDays: totalDays < 7 ? totalDays : 0, shortages, relaxed: [...relaxed], autoRelaxed, repeats: countRepeats(days) };
  }

  function countRepeats(days) {
    const seen = {};
    let repeats = 0;
    for (const day of days) for (const meal of day.meals) { if (seen[meal.id]) repeats++; seen[meal.id] = true; }
    return repeats;
  }

  /* ---------- movement ---------- */

  function programKind(program) {
    if (program.goal === "cardio") { const ids = program.items.map(i => i[0]).join(" "); return (program.place === "outdoor" || program.place === "home") && !/run|cycle|bike|jump|hiit|interval|tread/i.test(ids) && /walk|sidewalk/.test(ids) ? "walk" : "cardio"; }
    if (program.goal === "start" || program.id === "reset") return "gentle";
    return "strength";
  }

  function programExerciseText(program) {
    return program.items.map(item => item[0] + " " + ((typeof TRAINING_EXERCISES !== "undefined" && TRAINING_EXERCISES[item[0]] && TRAINING_EXERCISES[item[0]].name) || "")).join(" | ");
  }

  function moveReject(program, answers) {
    const move = answers.move;
    const gear = move.gear.length ? move.gear : ["none"];
    if (program.gear !== "none" && !gear.includes(program.gear)) return { key: "gear", why: "немає: " + (GEAR[program.gear] || program.gear) };
    if (program.place === "gym" && !gear.includes("machine") && !move.like.includes("gym")) return { key: "place", why: "зал не обрано" };
    if (program.place === "gym" && move.dislike.includes("gym")) return { key: "place", why: "зал не подобається" };
    if (program.place === "home" && move.dislike.includes("home")) return { key: "place", why: "вдома не хочеться" };
    if (program.place === "outdoor" && move.dislike.includes("walk") && move.dislike.includes("cardio")) return { key: "place", why: "вулиця не подобається" };
    const kind = programKind(program);
    if (kind === "strength" && move.dislike.includes("strength")) return { key: "format", why: "силові не подобаються" };
    if (kind === "cardio" && move.dislike.includes("cardio")) return { key: "format", why: "кардіо не подобається" };
    if (kind === "walk" && move.dislike.includes("walk")) return { key: "format", why: "прогулянки не подобаються" };
    const text = programExerciseText(program);
    for (const limit of move.limits) { const rule = LIMIT_RULES[limit]; if (rule && rule.avoid.test(text)) return { key: "limit:" + limit, why: rule.label.toLowerCase() + ": " + rule.note }; }
    if (answers.health.medical || answers.health.injury || move.intensity === "easy") { if (program.goal === "muscle" && program.minutes > 40) return { key: "intensity", why: "занадто щільно для початку" }; }
    return null;
  }

  function moveScore(program, answers, wanted, seed, used) {
    const move = answers.move;
    const chose = answers.body.sex === "male" ? "обрав" : "обрала";
    const wanted_ = answers.body.sex === "male" ? "хотів" : "хотіла";
    let score = 0;
    const reasons = [];
    const kind = programKind(program);
    if (wanted === kind || (wanted === "strength" && kind === "gentle" && move.gymExperience === "none")) { score += 30; }
    else if (wanted === "cardio" && kind === "walk") score += 22;
    else if (wanted === "walk" && kind === "cardio") score += 10;
    else score -= 25;
    const minutesCap = Math.round(move.minutes * (INTENSITY_MINUTES[move.intensity] || 1));
    if (program.minutes <= minutesCap) { score += 10; reasons.push("вкладається у " + move.minutes + " хв"); }
    else score -= Math.min(30, (program.minutes - minutesCap) / 2);
    if (program.level === "beginner" && (move.gymExperience === "none" || move.intensity === "easy")) { score += 8; reasons.push("підходить для початку"); }
    if (program.level === "all" && move.gymExperience === "regular") score += 6;
    if (program.level === "beginner" && move.gymExperience === "regular" && move.intensity !== "easy") score -= 6;
    if (program.gear !== "none") { reasons.push("з тим, що в тебе є: " + GEAR[program.gear].toLowerCase()); score += 4; }
    if (program.place === "gym" && move.like.includes("gym")) { score += 6; reasons.push("ти " + chose + " зал"); }
    if (program.place === "home" && move.like.includes("home")) { score += 6; reasons.push("вдома, як ти " + wanted_); }
    if (kind === "walk" && move.like.includes("walk")) { score += 6; reasons.push("прогулянки — твій формат"); }
    if (kind === "walk" && program.place !== "outdoor" && !move.like.includes("home") && !move.like.includes("cardio")) score -= 80; // a walks-only week stays outdoors; a shorter walk beats a home routine
    score -= Math.abs(program.minutes - move.minutes) / 4;
    if (move.like.includes("mobility") && FORMATS.mobility.ids.includes(program.id)) score += 8;
    if (used.has(program.id)) score -= 40;
    score -= noise(seed, program.id) * 4;
    return { score, reasons };
  }

  function buildMove(answers, energy, startIso) {
    const move = answers.move;
    const health = answers.health;
    // Illness, medication and injury get the same caution as pregnancy: no prescribed sessions.
    const care = health.pregnancy || health.lactation || health.edHistory || health.medical || health.medication || health.injury || (energy && energy.status === "care");
    const seed = String(seedFrom(JSON.stringify([answers.move, startIso, RULES_VERSION])));
    const notes = [];
    const startWeekday = dt(startIso).getUTCDay();
    const result = { sessions: [], restDays: [], steps: null, notes, days: 0, minutes: move.minutes, prescribed: false, relax: [] };
    if (move.wants === "no" || move.days === 0) {
      notes.push("Тренувань у плані немає — ти так обрала. Кроки й прогулянки можна додавати, коли зручно.");
      result.steps = answers.body.dailyActivity === "sitting" ? 6000 : 8000;
      return result;
    }
    if (care) {
      const why = health.pregnancy ? "вагітність" : health.lactation ? "грудне вигодовування" : health.edHistory ? "досвід розладу харчової поведінки" : health.medical ? "діагноз" : health.medication ? "ліки" : health.injury ? "травму" : "стан здоров’я";
      notes.push("Через " + why + " тренування не призначаємо. Спокійні прогулянки в комфортному темпі — лише якщо це вже дозволив лікар.");
      result.steps = 6000;
      return result;
    }
    const count = Math.min(5, move.days);
    const weekdays = move.weekdays.length >= count ? move.weekdays.slice(0, count).sort((a, b) => a - b) : WEEKDAY_SPREAD[count];
    const likesStrength = move.like.includes("strength") || move.like.includes("gym") || move.gear.includes("dumbbell") || move.gear.includes("machine") || purposeOf(answers) === "muscle";
    const likesCardio = move.like.includes("cardio");
    const likesWalk = move.like.includes("walk") || (!likesStrength && !likesCardio && (move.wants === "light" || move.like.includes("mobility")));
    const onlyWalk = (move.like.length === 1 && move.like[0] === "walk") || (move.wants === "light" && !likesStrength);
    const pattern = [];
    for (let i = 0; i < count; i++) {
      if (onlyWalk) pattern.push("walk");
      else if (likesStrength && !likesCardio && !likesWalk) pattern.push("strength");
      else if (likesStrength) pattern.push(i % 3 === 2 ? (likesWalk && !likesCardio ? "walk" : "cardio") : "strength");
      else if (likesCardio) pattern.push(likesWalk && i % 2 === 1 ? "walk" : "cardio");
      else pattern.push(i % 2 === 0 ? "strength" : "walk");
    }
    /* Two strength days in a row only when the person asked for five or set fixed adjacent weekdays. */
    const used = new Set();
    const eligible = TRAINING_PLANS.filter(program => !moveReject(program, answers));
    if (!eligible.length) {
      notes.push("З цими обмеженнями й обладнанням жодна програма не підійшла. Послаб одну умову — або почнемо з прогулянок.");
      result.relax = relaxMoveOptions(answers);
      return result;
    }
    weekdays.forEach((weekday, i) => {
      const wanted = pattern[i];
      const scored = eligible.map(program => Object.assign({ program }, moveScore(program, answers, wanted, seed, used))).sort((a, b) => b.score - a.score);
      const chosen = scored[0];
      used.add(chosen.program.id);
      const daysAhead = (weekday - startWeekday + 7) % 7;
      const date = offset(startIso, daysAhead);
      const kind = programKind(chosen.program);
      const kcal = typeof EnergyCalc !== "undefined" ? EnergyCalc.sessionKcal(Number(answers.body.weight) || 0, chosen.program.minutes, kind) : 0;
      result.sessions.push({ date, weekday, weekdayName: WEEKDAY_NAMES[weekday], id: chosen.program.id, name: chosen.program.name, minutes: chosen.program.minutes, kind, place: chosen.program.place, gear: chosen.program.gear, kcal, reasons: chosen.reasons.slice(0, 3), stopRule: "Біль, запаморочення чи різке погіршення самопочуття — зупинись. Це не «подолати себе»." });
    });
    result.sessions.sort((a, b) => a.date < b.date ? -1 : 1);
    result.restDays = [0, 1, 2, 3, 4, 5, 6].filter(d => !weekdays.includes(d));
    result.days = count;
    result.prescribed = true;
    result.steps = purposeOf(answers) === "lose" ? 8000 : answers.body.dailyActivity === "sitting" ? 7000 : 8000;
    const limitNotes = move.limits.map(key => LIMIT_RULES[key]).filter(Boolean).map(rule => rule.label + " — " + rule.note);
    if (limitNotes.length) notes.push("Враховано: " + limitNotes.join("; ") + ".");
    if (health.medical || health.medication || health.injury) notes.push("Є діагноз, ліки чи травма: навантаження м’яке й за згодою лікаря. Будь-яке заняття можна замінити прогулянкою.");
    return result;
  }

  function relaxMoveOptions(answers) {
    const options = [];
    const counts = {};
    for (const program of TRAINING_PLANS) { const reject = moveReject(program, answers); if (reject) counts[reject.key] = (counts[reject.key] || 0) + 1; }
    for (const [key, restores] of Object.entries(counts)) options.push({ key, restores, label: key === "gear" ? "дозволити програми з іншим інвентарем" : key === "place" ? "дозволити інше місце" : key === "format" ? "дозволити інший формат" : key.startsWith("limit:") ? "обмеження лишаються — це не послаблюємо" : "м’якші програми" });
    return options.filter(option => !option.key.startsWith("limit:")).sort((a, b) => b.restores - a.restores);
  }

  /* ---------- reasons in plain words ---------- */

  function reasons(answers, energy, food, move) {
    const out = [];
    const she = answers.body.sex !== "male";
    const chose = she ? "обрала" : "обрав";
    const layoutWords = { 2: "два прийоми", 3: "три прийоми", 4: "чотири прийоми", 5: "п’ять прийомів" };
    const layout = layoutFor(answers.food);
    const mealsWord = layout.slots.length === 3 && food.layoutKey === "2s" ? "два прийоми з перекусом" : layoutWords[layout.slots.length];
    if (move.prescribed && move.sessions.length) {
      const kinds = [...new Set(move.sessions.map(s => s.kind))];
      const where = [...new Set(move.sessions.map(s => s.place))].map(p => ({ home: "вдома", gym: "в залі", outdoor: "надворі" }[p])).join(" і ");
      const gear = [...new Set(move.sessions.map(s => s.gear).filter(g => g !== "none"))].map(g => GEAR[g].toLowerCase());
      out.push("Ти " + chose + " " + move.days + " " + (move.days === 1 ? "заняття" : move.days < 5 ? "заняття" : "занять") + " по " + answers.move.minutes + " хв " + where + (gear.length ? " з тим, що є: " + gear.join(", ") : " без інвентарю") + " — тому " + (kinds.length === 1 ? ({ strength: "усі заняття силові", walk: "усі заняття — прогулянки", cardio: "усі заняття — кардіо", gentle: "усі заняття м’які" }[kinds[0]]) : "силові чергуються з легшими днями") + ", і між ними є відпочинок.");
    } else if (answers.move.wants === "no") out.push("Тренувань ти не хочеш — у плані їх немає, лише кроки без норми.");
    const weekGroups = answers.food.exclude.week.map(key => GROUPS[key] ? GROUPS[key].label.toLowerCase() : ingredientMeta(key).name.toLowerCase());
    if (weekGroups.length) out.push(weekGroups.join(", ") + " цього тижня не хочеш — у меню " + (weekGroups.length === 1 ? "цього" : "їх") + " немає; наступного тижня спитаємо знову.");
    const allergies = answers.food.allergies.filter(a => a !== "unsure");
    if (allergies.length) out.push("Алергія: " + allergies.map(a => (GROUPS[a] ? GROUPS[a].label : a).toLowerCase()).join(", ") + " — такі страви відкинуті до ранжування, не просто опущені нижче.");
    if (answers.food.allergies.includes("unsure")) out.push("Про алергени відомо не все — жодну страву не називаємо безпечною; дивись склад.");
    if (energy && energy.ok) out.push(mealsWord + " їжі на ≈ " + energy.target + " ккал: " + food.names.map((n, i) => n.toLowerCase() + " ≈ " + Math.round(energy.target * layout.fractions[i])).join(", ") + ".");
    else if (energy && energy.status === "care") out.push("Персональної цифри немає (" + energy.careReason + "): меню зібране на спокійні ≈ 1 800 ккал як приклад порцій, не як норма.");
    else out.push("Без віку, зросту, ваги й статі цифри немає: меню показує порції, а не норму.");
    const slotNames = { breakfast: "сніданок", lunch: "обід", dinner: "вечерю", snack: "перекус" };
    if (food.autoRelaxed && food.autoRelaxed.length) out.push("На " + food.autoRelaxed.map(s => slotNames[s]).join(" і ") + " з цими умовами в базі немає жодної звичної страви — поставили страви з інших категорій і кажемо про це прямо.");
    if (food.shortDays) out.push("Для цих умов у базі мало рецептів — план на " + food.shortDays + " дні. Нижче — що можна послабити.");
    return out.slice(0, 5);
  }

  /* ---------- the whole plan ---------- */

  function build(rawAnswers, options) {
    const opts = options || {};
    const answers = normalizeAnswers(rawAnswers);
    const startIso = opts.startIso || today();
    let energy = typeof EnergyCalc !== "undefined" ? EnergyCalc.estimate(energyInput(answers, startIso)) : null;
    const adjust = answers.meta && answers.meta.adjust && Number(answers.meta.adjust.kcal);
    if (energy && adjust) energy = EnergyCalc.withAdjustment(energy, adjust, answers.meta.adjust.reason);
    const move = buildMove(answers, energy, startIso);
    const trainingKcal = {};
    for (const session of move.sessions) trainingKcal[session.date] = Math.round((session.kcal || 0) / 10) * 10;
    const food = buildFood(answers, energy, startIso, { relaxed: opts.relaxed, trainingDates: move.sessions.map(s => s.date), trainingKcal });
    return {
      version: 1,
      rulesVersion: RULES_VERSION,
      energyVersion: energy ? energy.version : null,
      created: startIso,
      status: "draft",
      answers,
      energy,
      food,
      move,
      reasons: reasons(answers, energy, food, move)
    };
  }

  /* Checks a plan against the promises the UI makes. Used by tests and before saving. */
  function check(plan) {
    const problems = [];
    const a = plan.answers;
    for (const day of plan.food.days) {
      for (const meal of day.meals) {
        const recipe = RECIPES.find(r => r.id === meal.id);
        if (!recipe) { problems.push("unknown recipe " + meal.id); continue; }
        if (recipeAllergen(recipe, a.food.allergies)) problems.push("allergen in " + meal.id);
        if (recipeHits(recipe, a.food.exclude.never)) problems.push("never-excluded in " + meal.id);
        if (recipeHits(recipe, a.food.exclude.week) && !plan.food.relaxed.some(key => key.startsWith("week:"))) problems.push("week-excluded in " + meal.id);
        const estimate = recipeEstimate(recipe, meal.servings);
        if (Math.abs(Math.round(estimate.kcal) - meal.kcal) > 1) problems.push("kcal mismatch " + meal.id);
      }
      const sum = day.meals.reduce((s, m) => s + m.kcal, 0);
      if (Math.abs(sum - day.sum.kcal) > 1) problems.push("day sum mismatch " + day.date);
    }
    const gear = a.move.gear.length ? a.move.gear : ["none"];
    for (const session of plan.move.sessions) {
      const program = TRAINING_PLANS.find(p => p.id === session.id);
      if (!program) { problems.push("unknown program " + session.id); continue; }
      if (program.gear !== "none" && !gear.includes(program.gear)) problems.push("gear not available for " + session.id);
      if (program.place === "gym" && !gear.includes("machine") && !a.move.like.includes("gym")) problems.push("gym without gym for " + session.id);
    }
    const dates = plan.move.sessions.map(s => s.date);
    if (new Set(dates).size !== dates.length) problems.push("two sessions on one day");
    if (plan.move.sessions.length && plan.move.restDays.length === 0 && plan.move.sessions.length < 7) problems.push("no rest days listed");
    return problems;
  }

  return { RULES_VERSION, LAYOUT, layoutKey, layoutFor, pickMeal, GROUPS, ALLERGENS, FORMATS, GEAR, LIMIT_RULES, WEEKDAY_NAMES, normalizeAnswers, purposeOf, energyInput, build, buildFood, buildMove, relaxOptions, relaxLabel, foodReject, moveReject, check, seedFrom };
})();

if (typeof module !== "undefined" && module.exports) module.exports = { PlanEngine };
