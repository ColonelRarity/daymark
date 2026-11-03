/* EnergyCalc — the one place where Daymark turns a person's answers into an energy guide.

   Pure functions, no DOM, no state. The same file runs on the phone and in Node tests
   (mobile/scripts/energy/energy-calc.test.mjs).

   SPECIFICATION (version below; change the version when a rule changes)
   Source      Mifflin MD, St Jeor ST, Hill LA, Scott BJ, Daugherty SA, Koh YO. "A new predictive
               equation for resting energy expenditure in healthy individuals." Am J Clin Nutr 1990;51:241–247.
               The formula is public knowledge; this is our own implementation, not copied code.
   Applies to  adults 18–80 years, weight 35–250 kg, height 130–220 cm, BMI 16–45. Outside: no number or low confidence.
   Resting     women: 10·kg + 6.25·cm − 5·years − 161; men: … + 5. We need a female/male coefficient;
               without it there is no personal number (no hidden average).
   Daily       resting × daily-activity factor. The factor covers ONLY everyday movement (sitting, walking,
               standing work). Training is never inside the factor: it is added per session on the day it
               happens (planned, logged, or from a watch — whichever is known best, never twice).
   Pace        lose: planning rate ≤ min(1 % of weight, 1 kg)/week, default 0.5; gain: ≤ 0.3; muscle: ≈ 0.15.
               The daily difference uses ≈ 7 700 kcal per kg as a PLANNING assumption to size the difference.
               It is not a forecast and the result never promises a weight on a date.
   Deadline    only checked for realism against the pace cap. A short deadline never lowers the number.
   Floors      1 500 kcal (female) / 1 700 (male). Cap 4 500. Energy is rounded to 10, macros to 1 g.
   Macros      after energy. Protein g/kg by purpose and real training; fat ≥ 20 % of energy, ≈ 0.9 g/kg;
               carbs are the remainder and never negative. Checked against AMDR (P 10–35 %, F 20–35 %, C 45–65 %).
               Low-carb and eating-window are modes separate from the weight purpose, with their own limits.
   Conflicts   care flags > missing inputs > manual number > computed. Floor > rate. Rate cap > deadline.
               Target weight direction > goal label (a "lose" goal with a higher target weight becomes gain).
   Output      target, range, resting, maintenance, per-session training kcal, macros (g and shares),
               assumptions, explanations, warnings, confidence (high / mid / low), status.
   Not         a measured norm, a diagnosis or a prescription. A dietitian/physician review is required before release. */

const EnergyCalc = (() => {
  const VERSION = "energy-1.0";
  const KCAL_PER_KG = 7700;           // planning assumption, see spec
  const FLOOR = { female: 1500, male: 1700 };
  const CAP = 4500;
  const LIMITS = { age: [18, 80], weight: [35, 250], height: [130, 220] };

  /* Everyday movement without training. Labels are what the person reads in the questionnaire. */
  const DAILY_ACTIVITY = {
    sitting: { pal: 1.25, label: "Переважно сиджу", includes: "робота за столом, дорога транспортом, мало ходьби" },
    light: { pal: 1.4, label: "Сиджу, але щодня ходжу", includes: "прогулянки, сходи, хатні справи, 5–8 тис. кроків" },
    onfeet: { pal: 1.55, label: "Багато на ногах", includes: "робота стоячи або в русі, 8–12 тис. кроків" },
    physical: { pal: 1.7, label: "Фізична робота", includes: "переносиш, працюєш руками більшу частину дня" },
    heavy: { pal: 1.9, label: "Дуже важка фізична праця", includes: "будівництво, сільське господарство, спорт як робота" }
  };

  /* Net MET for a training session; (MET − 1) removes the resting part already in the daily number. */
  const TRAINING_MET = { strength: 5, cardio: 7, walk: 3.5, mixed: 5, mobility: 2.5, none: 0 };

  const PURPOSES = ["lose", "maintain", "gain", "muscle", "recomp"];
  const EATING_MODES = ["normal", "lowcarb", "window"];

  const num = (value, [min, max]) => {
    const n = Number(value);
    return Number.isFinite(n) && n >= min && n <= max ? n : null;
  };
  const round10 = value => Math.round(value / 10) * 10;
  const round1 = value => Math.round(value * 10) / 10;

  function sessionKcal(weightKg, minutes, kind) {
    const met = TRAINING_MET[kind] || 0;
    if (!weightKg || !minutes || !met) return 0;
    return Math.round((met - 1) * 3.5 * weightKg / 200 * minutes);
  }

  /* Macro split for a known energy. Returns grams, shares and notes; never negative carbs. */
  function macros(energy, weightKg, purpose, training, eatingMode, flags) {
    const notes = [];
    const strengthDays = training && ["strength", "mixed"].includes(training.kind) ? Number(training.sessionsPerWeek) || 0 : 0;
    let pPerKg;
    if (purpose === "muscle") pPerKg = strengthDays >= 2 ? 1.8 : 1.4;
    else if (purpose === "lose" || purpose === "recomp") pPerKg = 1.6;
    else if (purpose === "gain") pPerKg = 1.6;
    else pPerKg = strengthDays >= 2 ? 1.4 : 1.2;
    if (purpose === "muscle" && strengthDays < 2) notes.push("Білок 1,4 г/кг, не «спортивні» 1,8: силових тренувань у тижні менше двох. Зросте разом із ними.");
    let protein = Math.round(weightKg * pPerKg);
    const proteinCap = Math.floor(energy * 0.35 / 4);
    if (protein > proteinCap) { protein = proteinCap; notes.push("Білок обмежено 35 % енергії (верхня межа AMDR)."); }
    const fatPerKg = eatingMode === "lowcarb" ? 1.2 : 0.9;
    let fat = Math.round(weightKg * fatPerKg);
    const fatMin = Math.ceil(energy * 0.2 / 9);
    if (fat < fatMin) fat = fatMin;
    let carbs = Math.round((energy - protein * 4 - fat * 9) / 4);
    if (eatingMode === "lowcarb") {
      const carbCap = 100;
      if (carbs > carbCap) {
        carbs = carbCap;
        fat = Math.round((energy - protein * 4 - carbs * 4) / 9);
        notes.push("Режим «менше вуглеводів»: близько 100 г на день, решта енергії — з жирів. Це вибір режиму, не умова схуднення; при діабеті, вагітності чи ліках — лише з лікарем.");
      }
    } else if (carbs < 100) {
      fat = Math.max(fatMin, Math.round(weightKg * 0.7));
      carbs = Math.round((energy - protein * 4 - fat * 9) / 4);
      if (carbs < 100) notes.push("Вуглеводів менше 100 г через малу енергію. Віддай перевагу крупам, овочам і фруктам, щоб не втратити клітковину.");
    }
    if (carbs < 0) { carbs = 0; notes.push("Енергії замало для цього білка й жиру — вуглеводи вийшли в нуль. Орієнтир ненадійний."); }
    const kcalSum = protein * 4 + fat * 9 + carbs * 4;
    const shares = { p: protein * 4 / energy, f: fat * 9 / energy, c: carbs * 4 / energy };
    const amdr = {
      p: shares.p >= 0.1 && shares.p <= 0.35,
      f: shares.f >= 0.2 && shares.f <= 0.35,
      c: shares.c >= 0.45 && shares.c <= 0.65
    };
    if (!amdr.f && shares.f > 0.35 && eatingMode !== "lowcarb") notes.push("Жирів понад 35 % енергії — більше, ніж звичайний діапазон.");
    if (!amdr.c && eatingMode !== "lowcarb") notes.push("Вуглеводи поза звичайним діапазоном 45–65 % енергії: " + Math.round(shares.c * 100) + " %. Це наслідок білка й жиру, не помилка.");
    if (flags && (flags.medical || flags.medication)) notes.push("При діагнозі чи ліках склад раціону веде лікар або дієтолог; тут лише приклад.");
    return { p: protein, f: fat, c: carbs, pPerKg: round1(protein / weightKg), fPerKg: round1(fat / weightKg), shares, amdr, kcalSum, notes };
  }

  /* The main entry. See file header for the contract. */
  function estimate(input) {
    const src = input || {};
    const todayIso = src.todayIso || new Date().toISOString().slice(0, 10);
    const flags = Object.assign({ pregnancy: false, lactation: false, edHistory: false, medical: false, medication: false }, src.flags || {});
    const assumptions = [];
    const explanations = [];
    const warnings = [];
    const base = { version: VERSION, todayIso, flags, assumptions, explanations, warnings, purposeAsked: src.purpose || "maintain" };

    const age = num(src.age, [10, 120]);
    const height = num(src.heightCm, [100, 250]);
    const weight = num(src.weightKg, [20, 400]);
    const sex = src.sex === "female" || src.sex === "male" ? src.sex : null;
    const targetWeight = num(src.targetWeightKg, [20, 400]);
    const eatingMode = EATING_MODES.includes(src.eatingMode) ? src.eatingMode : "normal";
    const training = Object.assign({ sessionsPerWeek: 0, minutesPerSession: 0, kind: "none" }, src.training || {});

    /* 1. Care flags win over everything: no personal number, no deficit, no prescribed training. */
    const minor = age !== null && age < 18;
    if (flags.pregnancy || flags.lactation || flags.edHistory || minor) {
      const why = flags.pregnancy ? "вагітність" : flags.lactation ? "грудне вигодовування" : flags.edHistory ? "досвід розладу харчової поведінки" : "вік до 18 років";
      explanations.push("Через " + why + " Daymark не ставить персональну цифру калорій і не рахує дефіцит. Орієнтир дає лікар або дієтолог; щоденник і спокійний рух працюють як є.");
      return Object.assign(base, { ok: false, status: "care", careReason: why, confidence: "low", purpose: "maintain", target: null, range: null, resting: null, maintenance: null, macros: null, missing: [] });
    }

    /* 2. Missing inputs: name them, no hidden average. */
    const missing = [];
    if (sex === null) missing.push("sex");
    if (age === null) missing.push("age");
    if (height === null) missing.push("height");
    if (weight === null) missing.push("weight");
    if (missing.length) {
      const names = { sex: "стать для формули", age: "вік", height: "зріст", weight: "вагу" };
      explanations.push("Щоб порахувати обмін у спокої, потрібно " + missing.map(key => names[key]).join(", ") + ". Без цього персональної цифри немає — середнє не підставляємо.");
      return Object.assign(base, { ok: false, status: "missing", missing, confidence: "low", purpose: base.purposeAsked, target: null, range: null, resting: null, maintenance: null, macros: null });
    }

    /* 3. Ranges the formula was built for. */
    let confidence = "high";
    if (age > LIMITS.age[1] || weight < LIMITS.weight[0] || weight > LIMITS.weight[1] || height < LIMITS.height[0] || height > LIMITS.height[1]) {
      confidence = "low";
      warnings.push("Вік, вага або зріст поза діапазоном, для якого перевірена формула (18–80 років, 35–250 кг, 130–220 см). Цифра дуже приблизна.");
    }
    const bmi = weight / Math.pow(height / 100, 2);
    if (bmi < 16 || bmi > 45) { confidence = "low"; warnings.push("Індекс маси тіла " + round1(bmi) + " поза діапазоном 16–45: формула тут ненадійна, потрібен фахівець."); }
    else if (bmi < 18.5 || bmi > 35) { if (confidence === "high") confidence = "mid"; }
    if (age > 65 && confidence === "high") confidence = "mid";

    /* 4. Purpose: target weight direction beats the goal label; low BMI never gets a deficit. */
    let purpose = PURPOSES.includes(src.purpose) ? src.purpose : "maintain";
    const gap = targetWeight !== null ? round1(targetWeight - weight) : null;
    if (gap !== null && gap <= -1 && purpose !== "lose" && purpose !== "recomp") { purpose = "lose"; explanations.push("Бажана вага нижча за поточну, тож орієнтир розраховано на зниження."); }
    if (gap !== null && gap >= 1 && (purpose === "lose" || purpose === "maintain")) { purpose = "gain"; explanations.push("Бажана вага вища за поточну, тож орієнтир розраховано на набір."); }
    if (purpose === "lose" && gap !== null && gap > -0.5) { purpose = "maintain"; explanations.push("Бажана вага не нижча за поточну — тримаємо підтримання."); }
    if (purpose === "lose" && bmi < 18.5) { purpose = "maintain"; explanations.push("Для цієї ваги й зросту зниження не пропонуємо (ІМТ нижче 18,5). Орієнтир — підтримання."); }
    if (flags.medical || flags.medication) {
      confidence = "low";
      if (purpose !== "maintain") {
        purpose = "maintain";
        explanations.push("Є діагноз або ліки: дефіцит чи профіцит автоматично не ставимо, цифра — підтримання для орієнтиру. Темп зміни ваги узгодь із лікарем.");
      } else explanations.push("Є діагноз або ліки: цифра — лише орієнтир підтримання; склад раціону узгодь із лікарем.");
    }

    /* 5. Resting and daily. */
    const resting = 10 * weight + 6.25 * height - 5 * age + (sex === "male" ? 5 : -161);
    const activityKey = DAILY_ACTIVITY[src.dailyActivity] ? src.dailyActivity : null;
    if (!activityKey) { if (confidence === "high") confidence = "mid"; assumptions.push("Буденний рух не вказано — взято «сиджу, але щодня ходжу» (×1,4)."); }
    const activity = DAILY_ACTIVITY[activityKey || "light"];
    const maintenance = resting * activity.pal;
    assumptions.push("Обмін у спокої за Mifflin–St Jeor (" + (sex === "female" ? "жіночий" : "чоловічий") + " коефіцієнт): ≈ " + round10(resting) + " ккал.");
    assumptions.push("Буденний рух «" + activity.label + "» ×" + activity.pal + " (" + activity.includes + "). Тренування сюди не входять.");

    /* 6. Training is a per-session addition on its day, never a second time inside the factor. */
    const perSession = sessionKcal(weight, Number(training.minutesPerSession) || 0, training.kind);
    const weeklyTraining = perSession * (Number(training.sessionsPerWeek) || 0);
    if (perSession) explanations.push("Кожне заняття (" + training.minutesPerSession + " хв) додає до дня ≈ " + round10(perSession) + " ккал — лише в той день, коли воно є в плані або в щоденнику. Якщо годинник дав свою цифру, рахуємо її, а не оцінку.");

    /* 7. Pace. */
    const maxLose = Math.min(1, Math.max(0.3, round1(weight * 0.01)));
    const maxGain = purpose === "muscle" ? 0.25 : 0.3;
    let rate = 0; // kg per week, planning only
    let delta = 0;
    const pace = { askedRateKg: null, maxRateKg: null, realistic: true, estimateWeeks: null, deadline: null, note: "" };
    const deadline = typeof src.deadline === "string" && /^\d{4}-\d{2}-\d{2}$/.test(src.deadline) && src.deadline > todayIso ? src.deadline : null;
    const weeksTo = deadline ? Math.max(1, Math.round((Date.parse(deadline) - Date.parse(todayIso)) / 86400000) / 7) : null;
    if (purpose === "lose") {
      rate = Math.min(maxLose, 0.5);
      pace.maxRateKg = maxLose;
      if (gap !== null && gap < 0 && weeksTo) {
        pace.askedRateKg = round1(-gap / weeksTo);
        pace.deadline = deadline;
        if (pace.askedRateKg > maxLose) {
          pace.realistic = false;
          pace.note = "До " + deadline + " треба було б " + pace.askedRateKg + " кг на тиждень — швидше за безпечний темп " + maxLose + ". Калорії під дату не ріжемо; реалістичніше — змінити строк або ціль.";
        } else if (pace.askedRateKg > rate) rate = pace.askedRateKg;
      }
      if (gap !== null && gap < 0) pace.estimateWeeks = Math.ceil(-gap / rate);
      delta = -(rate * KCAL_PER_KG) / 7;
    } else if (purpose === "gain" || purpose === "muscle") {
      rate = purpose === "muscle" ? 0.15 : 0.25;
      pace.maxRateKg = maxGain;
      if (gap !== null && gap > 0 && weeksTo) {
        pace.askedRateKg = round1(gap / weeksTo);
        pace.deadline = deadline;
        if (pace.askedRateKg > maxGain) { pace.realistic = false; pace.note = "До " + deadline + " вийшло б " + pace.askedRateKg + " кг на тиждень — швидше за розумний набір " + maxGain + ". Темп лишаємо спокійним."; }
        else if (pace.askedRateKg > rate) rate = pace.askedRateKg;
      }
      if (gap !== null && gap > 0) pace.estimateWeeks = Math.ceil(gap / rate);
      delta = (rate * KCAL_PER_KG) / 7;
    } else if (purpose === "recomp") {
      delta = 0;
      explanations.push("Зміна складу тіла: енергія на підтримання, білок вищий, сила з тренувань. Вага на терезах може не рухатись — це нормально.");
    }
    if (rate) assumptions.push("Темп ≈ " + rate + " кг на тиждень як планове припущення (≈ 7 700 ккал на кг). Реальна динаміка завжди відрізняється, тому прогноз ваги на дату не даємо.");

    /* 8. Target with floor and cap. */
    const floor = FLOOR[sex];
    let target = maintenance + delta;
    let floored = false;
    if (target < floor) {
      if (purpose === "lose") {
        const allowed = Math.max(0, maintenance - floor);
        rate = round1(allowed * 7 / KCAL_PER_KG);
        if (gap !== null && gap < 0 && rate > 0) pace.estimateWeeks = Math.ceil(-gap / rate);
        floored = true;
        explanations.push("Нижче " + floor + " ккал план не опускаємо, тому темп повільніший: ≈ " + rate + " кг на тиждень.");
      }
      target = floor;
    }
    if (target > CAP) { target = CAP; warnings.push("Цифру обмежено " + CAP + " ккал."); }
    target = round10(target);
    const range = { low: round10(target * 0.95), high: round10(target * 1.05) };

    /* 9. Macros after energy. */
    const macro = macros(target, weight, purpose, training, eatingMode, flags);
    if (eatingMode === "lowcarb") { if (confidence === "high") confidence = "mid"; }
    if (eatingMode === "window") explanations.push("Вікно харчування змінює лише час прийомів, не енергію. Якщо є діабет, ліки чи вагітність — спершу лікар.");
    if (macro.notes.length) macro.notes.forEach(note => explanations.push(note));

    explanations.unshift("Орієнтир — не виміряна норма: ±5 % уже всередині. За 2–3 тижні записів і зважувань план можна поправити за реальною динамікою.");

    return Object.assign(base, {
      ok: true,
      status: "ready",
      confidence,
      purpose,
      sex, age, weightKg: weight, heightCm: height, bmi: round1(bmi), targetWeightKg: targetWeight, gapKg: gap,
      dailyActivity: activityKey || "light",
      resting: round10(resting),
      pal: activity.pal,
      maintenance: round10(maintenance),
      trainingPerSession: round10(perSession),
      trainingWeekly: round10(weeklyTraining),
      trainingKind: training.kind,
      trainingSessions: Number(training.sessionsPerWeek) || 0,
      averageWithTraining: round10(maintenance + delta + weeklyTraining / 7),
      delta: round10(delta),
      target,
      range,
      floor,
      floored,
      rateKg: rate ? round1(rate) : 0,
      pace,
      eatingMode,
      macros: macro,
      missing: []
    });
  }

  /* A manual number from the person keeps the same macro rules, so the plan stays whole. */
  function withManualTarget(result, manualKcal) {
    const manual = num(manualKcal, [1000, 5000]);
    if (!result || !result.ok || manual === null) return result;
    const target = round10(manual);
    const macro = macros(target, result.weightKg, result.purpose, null, result.eatingMode, result.flags);
    return Object.assign({}, result, {
      status: "manual", target, range: { low: round10(target * 0.95), high: round10(target * 1.05) },
      delta: round10(target - result.maintenance), macros: macro,
      explanations: ["Цю цифру ти задав(-ла) сам(-а). Решта плану рахується від неї."].concat(result.explanations.slice(1))
    });
  }

  /* A small, explained shift the person agreed to (weekly review). Never below the floor,
     never more than ±200 in one step, status stays "ready" so the UI keeps the formula view. */
  function withAdjustment(result, deltaKcal, reason) {
    const delta = Math.max(-200, Math.min(200, Math.round(Number(deltaKcal) || 0)));
    if (!result || !result.ok || !delta) return result;
    const target = Math.max(result.floor || 0, round10(result.target + delta));
    if (target === result.target) return result;
    const macro = macros(target, result.weightKg, result.purpose, result.trainingSessions ? { sessionsPerWeek: result.trainingSessions, kind: result.trainingKind || "mixed" } : null, result.eatingMode, result.flags);
    return Object.assign({}, result, {
      target, adjusted: delta, range: { low: round10(target * 0.95), high: round10(target * 1.05) },
      delta: round10(target - result.maintenance), macros: macro,
      explanations: [(delta < 0 ? "Мінус " : "Плюс ") + Math.abs(delta) + " ккал за твоєю згодою" + (reason ? " (" + reason + ")" : "") + ". Можна повернути в історії."].concat(result.explanations)
    });
  }

  /* Invariants anyone can run on a result (tests do). */
  function check(result) {
    const problems = [];
    if (!result) return ["no result"];
    if (result.ok) {
      if (!(result.target > 0)) problems.push("E must be > 0");
      if (result.macros.p < 0 || result.macros.f < 0 || result.macros.c < 0) problems.push("macros must be ≥ 0");
      const sum = result.macros.p * 4 + result.macros.f * 9 + result.macros.c * 4;
      if (Math.abs(sum - result.target) > Math.max(40, result.target * 0.03)) problems.push("4P+9F+4C (" + sum + ") too far from E (" + result.target + ")");
      if (result.target < result.floor && result.status !== "manual") problems.push("below floor");
      if (result.range.low > result.target || result.range.high < result.target) problems.push("range must contain target");
      if (result.purpose === "lose" && result.delta > 0) problems.push("lose with positive delta");
      if ((result.purpose === "gain" || result.purpose === "muscle") && result.delta < 0) problems.push("gain with negative delta");
    } else {
      if (result.target !== null) problems.push("no-number states must not carry a target");
    }
    return problems;
  }

  return { VERSION, DAILY_ACTIVITY, TRAINING_MET, PURPOSES, EATING_MODES, FLOOR, CAP, KCAL_PER_KG, estimate, withManualTarget, withAdjustment, sessionKcal, macros, check };
})();

if (typeof module !== "undefined" && module.exports) module.exports = { EnergyCalc };
