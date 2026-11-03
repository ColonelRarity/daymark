// Four acceptance profiles from the Stage 4 brief, run through the same planner the phone uses.
import test from "node:test";
import assert from "node:assert/strict";
import { loadPrototypePlan } from "./load-prototype-plan.mjs";

const START = "2026-11-09"; // a Monday
const env = loadPrototypePlan({ todayIso: START });
const { PlanEngine, RECIPES, RECIPE_INGREDIENTS, TRAINING_PLANS, recipeEstimate } = env;

const profiles = {
  beginner: {
    v: 2,
    goal: { id: "lose", targetWeight: 68, deadline: "" },
    body: { name: "Оля", age: 34, height: 166, weight: 76, sex: "female", dailyActivity: "sitting" },
    food: { meals: 2, mode: "normal", allergies: [], likes: [], pantry: ["oats", "egg"], buy: [], budget: "low", cookTime: 30, tools: ["stove"], exclude: { never: [], week: [], sometimes: ["sweets"] } },
    move: { wants: "light", like: ["walk"], dislike: ["gym"], gymExperience: "none", gear: [], days: 3, minutes: 30, weekdays: [], intensity: "easy", limits: [] },
    health: { private: true }
  },
  gym: {
    v: 2,
    goal: { id: "muscle" },
    body: { name: "Макс", age: 28, height: 182, weight: 78, sex: "male", dailyActivity: "light" },
    food: { meals: 4, mode: "normal", allergies: [], likes: ["poultry"], pantry: [], buy: ["chicken", "rice"], budget: "any", cookTime: 60, tools: ["stove", "oven"], exclude: { never: [], week: [], sometimes: [] } },
    move: { wants: "yes", like: ["gym", "strength"], dislike: [], gymExperience: "regular", gear: ["machine", "dumbbell"], days: 3, minutes: 60, weekdays: [1, 3, 5], intensity: "moderate", limits: [] },
    health: { private: true }
  },
  homeDumbbells: {
    v: 2,
    goal: { id: "form" },
    body: { name: "Ірина", age: 41, height: 170, weight: 64, sex: "female", dailyActivity: "onfeet" },
    food: { meals: 3, mode: "normal", allergies: [], likes: ["legumes"], pantry: ["buckwheat"], buy: [], budget: "mid", cookTime: 30, tools: ["stove"], exclude: { never: [], week: ["fish"], sometimes: [] } },
    move: { wants: "yes", like: ["home", "strength"], dislike: [], gymExperience: "some", gear: ["dumbbell"], days: 2, minutes: 30, weekdays: [], intensity: "moderate", limits: ["knees"] },
    health: { private: true }
  },
  allergic: {
    v: 2,
    goal: { id: "form" },
    body: { name: "Тарас", age: 52, height: 175, weight: 90, sex: "male", dailyActivity: "light" },
    food: { meals: 3, mode: "normal", allergies: ["dairy", "gluten", "egg"], likes: [], pantry: [], buy: [], budget: "any", cookTime: 15, tools: ["stove"], exclude: { never: ["pork"], week: [], sometimes: [] } },
    move: { wants: "yes", like: ["walk"], dislike: [], gymExperience: "none", gear: [], days: 2, minutes: 20, weekdays: [], intensity: "easy", limits: ["back"] },
    health: { private: true }
  }
};

const plain = value => JSON.parse(JSON.stringify(value));
const recipeById = id => RECIPES.find(r => r.id === id);
const planById = id => TRAINING_PLANS.find(p => p.id === id);
const hasIngredient = (recipe, ids) => recipe.ingredients.some(x => ids.includes(x.id));
const hasAllergen = (recipe, allergen) => recipe.ingredients.some(x => RECIPE_INGREDIENTS[x.id].allergens.includes(allergen));

function dayGapOk(sessions) {
  const dates = sessions.map(s => s.date).sort();
  for (let i = 1; i < dates.length; i++) {
    const a = new Date(dates[i - 1]), b = new Date(dates[i]);
    if ((b - a) / 86400000 < 1) return false;
  }
  return true;
}

test("profile 1: beginner, two meals, walks only", () => {
  const plan = PlanEngine.build(profiles.beginner, { startIso: START });
  assert.equal(PlanEngine.check(plan).length, 0, PlanEngine.check(plan).join("; "));
  assert.equal(plan.energy.ok, true);
  assert.equal(plan.energy.purpose, "lose");
  assert.ok(plan.energy.target >= 1500 && plan.energy.target < plan.energy.maintenance, "deficit stays above the floor");
  assert.equal(plan.food.days.length, 7);
  for (const day of plan.food.days) {
    assert.equal(day.meals.length, 2);
    assert.deepEqual(plain(day.meals.map(m => m.slot)), ["lunch", "dinner"]);
  }
  assert.equal(plan.move.sessions.length, 3);
  assert.ok(plan.move.sessions.every(s => s.kind === "walk"), "walks only: " + plan.move.sessions.map(s => s.id).join(","));
  assert.ok(plan.move.sessions.every(s => planById(s.id).gear === "none"));
  assert.ok(plan.move.sessions.every(s => planById(s.id).place === "outdoor"), "walks stay outdoors: " + plan.move.sessions.map(s => s.id).join(","));
  assert.ok(dayGapOk(plan.move.sessions));
  assert.ok(plan.move.restDays.length >= 4);
  assert.ok(plan.reasons.length >= 2 && plan.reasons.length <= 4);
  assert.ok(plan.food.repeats <= 1, "a 2-meal week should not repeat");
});

test("profile 2: gym three days, muscle, four meals", () => {
  const plan = PlanEngine.build(profiles.gym, { startIso: START });
  assert.equal(PlanEngine.check(plan).length, 0, PlanEngine.check(plan).join("; "));
  assert.equal(plan.energy.purpose, "muscle");
  assert.ok(plan.energy.target > plan.energy.maintenance, "small surplus");
  assert.equal(plan.energy.macros.pPerKg, 1.8);
  assert.equal(plan.energy.trainingPerSession > 0, true);
  for (const day of plan.food.days) {
    assert.equal(day.meals.length, 4);
    assert.deepEqual(plain(day.meals.map(m => m.slot)), ["breakfast", "lunch", "dinner", "snack"]);
  }
  const trainingDays = plan.food.days.filter(d => d.training);
  assert.equal(trainingDays.length, 3);
  assert.ok(trainingDays.every(d => {
    const session = plan.move.sessions.find(s => s.date === d.date);
    return d.target === plan.energy.target + Math.round(session.kcal / 10) * 10;
  }), "a training day adds that session's energy, not a second copy of the weekly average");
  assert.deepEqual(plain(plan.move.sessions.map(s => s.weekday)), [1, 3, 5]);
  assert.ok(plan.move.sessions.filter(s => s.kind === "strength").length >= 2);
  assert.ok(plan.move.sessions.every(s => ["machine", "dumbbell", "none"].includes(planById(s.id).gear)));
  assert.ok(new Set(plan.move.sessions.map(s => s.id)).size === 3, "three different sessions");
  assert.ok(plan.move.sessions.every(s => s.minutes <= 60));
});

test("profile 3: home twice with dumbbells, no fish this week, knees", () => {
  const plan = PlanEngine.build(profiles.homeDumbbells, { startIso: START });
  assert.equal(PlanEngine.check(plan).length, 0, PlanEngine.check(plan).join("; "));
  const fishIds = ["salmon", "whitefish", "tuna", "shrimp"];
  for (const day of plan.food.days) for (const meal of day.meals) assert.ok(!hasIngredient(recipeById(meal.id), fishIds), "fish in " + meal.id);
  assert.equal(plan.move.sessions.length, 2);
  for (const s of plan.move.sessions) {
    const program = planById(s.id);
    assert.ok(["none", "dumbbell"].includes(program.gear), "gear " + program.gear + " in " + s.id);
    assert.notEqual(program.place, "gym");
    const text = program.items.map(i => i[0]).join(" ");
    assert.ok(!/squat|split|lunge|step|jump|run/.test(text), "knee-loading exercise in " + s.id + ": " + text);
  }
  assert.ok(dayGapOk(plan.move.sessions));
  assert.ok(plan.reasons.some(r => r.includes("цього тижня")), "explains the fish exclusion");
});

test("profile 4: three allergens, short cooking — recipe shortage is named", () => {
  const plan = PlanEngine.build(profiles.allergic, { startIso: START });
  assert.equal(PlanEngine.check(plan).length, 0, PlanEngine.check(plan).join("; "));
  assert.equal(plan.energy.purpose, "maintain");
  for (const day of plan.food.days) for (const meal of day.meals) {
    const recipe = recipeById(meal.id);
    for (const allergen of ["dairy", "gluten", "egg"]) assert.ok(!hasAllergen(recipe, allergen), allergen + " in " + meal.id);
    assert.ok(!hasIngredient(recipe, ["pork"]), "pork in " + meal.id);
  }
  assert.deepEqual(plain(plan.food.autoRelaxed), ["breakfast"], "no dairy/gluten/egg-free breakfast exists → slot widened and said so");
  assert.ok(plan.reasons.some(r => r.includes("сніданок")), "the widening is explained");
  const probe = PlanEngine.buildFood(PlanEngine.normalizeAnswers(profiles.allergic), plan.energy, START, {});
  assert.ok(probe.days.length >= 3, "a usable plan is still produced");
  const strict = PlanEngine.relaxOptions(PlanEngine.normalizeAnswers(profiles.allergic), "breakfast", new Set());
  assert.ok(strict.some(o => o.key === "cookTime") && strict.some(o => o.key === "slot:breakfast"), "soft conditions to relax are named with counts: " + JSON.stringify(plain(strict)));
  assert.ok(plan.food.shortDays === 3 || plan.food.days.length === 7, "either a shorter plan or a full week");
  for (const s of plan.move.sessions) {
    const text = planById(s.id).items.map(i => i[0]).join(" ");
    assert.ok(!/hinge|deadlift|rdl|situp|twist|run|jump/.test(text), "back-loading exercise in " + s.id);
    assert.equal(planById(s.id).gear, "none");
  }
  const relaxed = PlanEngine.build(profiles.allergic, { startIso: START, relaxed: ["cookTime", "slot:breakfast"] });
  assert.equal(relaxed.food.days.length, 7, "relaxing the soft conditions restores the full week");
  assert.ok(relaxed.food.shortages.length <= plan.food.shortages.length);
});

test("the four profiles get different food and movement weeks", () => {
  const plans = Object.values(profiles).map(p => PlanEngine.build(p, { startIso: START }));
  const foodKeys = plans.map(p => p.food.days.map(d => d.meals.map(m => m.id).join(",")).join("|"));
  assert.equal(new Set(foodKeys).size, 4);
  const moveKeys = plans.map(p => p.move.sessions.map(s => s.id).join(","));
  assert.equal(new Set(moveKeys).size, 4);
});

test("same answers and same week start give the same plan", () => {
  const a = PlanEngine.build(profiles.gym, { startIso: START });
  const b = PlanEngine.build(JSON.parse(JSON.stringify(profiles.gym)), { startIso: START });
  assert.deepEqual(plain(a.food.days.map(d => d.meals.map(m => m.id + "x" + m.servings))), plain(b.food.days.map(d => d.meals.map(m => m.id + "x" + m.servings))));
  assert.deepEqual(plain(a.move.sessions.map(s => s.id)), plain(b.move.sessions.map(s => s.id)));
});

test("kcal and macros in the plan equal the recipe estimate for the portion", () => {
  const plan = PlanEngine.build(profiles.gym, { startIso: START });
  for (const day of plan.food.days) {
    let kcal = 0, p = 0, f = 0, c = 0;
    for (const meal of day.meals) {
      const e = recipeEstimate(recipeById(meal.id), meal.servings);
      assert.equal(meal.kcal, Math.round(e.kcal));
      assert.equal(meal.p, Math.round(e.p));
      kcal += meal.kcal; p += meal.p; f += meal.f; c += meal.c;
    }
    assert.deepEqual(plain(day.sum), { kcal, p, f, c });
    assert.ok(Math.abs(day.sum.kcal - day.target) / day.target < 0.25, "day within 25 % of target: " + day.sum.kcal + " vs " + day.target);
  }
});

test("editing one condition changes only what it must", () => {
  const base = PlanEngine.build(profiles.homeDumbbells, { startIso: START });
  const edited = JSON.parse(JSON.stringify(profiles.homeDumbbells));
  edited.move.days = 3;
  const plan = PlanEngine.build(edited, { startIso: START });
  assert.equal(plan.move.sessions.length, 3);
  assert.equal(plan.energy.trainingWeekly > base.energy.trainingWeekly, true);
  assert.equal(plan.energy.target, base.energy.target, "daily guide does not double-count training");
});

test("illness, medication and injury: no deficit and no prescribed training", () => {
  for (const health of [{ medical: true }, { medication: true }, { injury: true }]) {
    const answers = JSON.parse(JSON.stringify(profiles.gym));
    answers.health = Object.assign({ private: true }, health);
    answers.goal = { id: "lose", targetWeight: 72 };
    const plan = PlanEngine.build(answers, { startIso: START });
    assert.equal(PlanEngine.check(plan).length, 0, PlanEngine.check(plan).join("; "));
    assert.equal(plan.energy.purpose, "maintain");
    assert.equal(plan.energy.delta, 0);
    assert.equal(plan.move.prescribed, false);
    assert.equal(plan.move.sessions.length, 0);
    assert.ok(plan.move.notes[0].includes("не призначаємо"));
  }
});

test("care flags: no number, no prescribed training", () => {
  const care = JSON.parse(JSON.stringify(profiles.beginner));
  care.health.pregnancy = true;
  const plan = PlanEngine.build(care, { startIso: START });
  assert.equal(plan.energy.status, "care");
  assert.equal(plan.energy.target, null);
  assert.equal(plan.move.prescribed, false);
  assert.equal(plan.move.sessions.length, 0);
  assert.equal(plan.food.days.length, 7, "meals still shown as portions");
  assert.ok(plan.food.days.every(d => d.target === null));
});

test("no training wanted: zero sessions and no training energy", () => {
  const none = JSON.parse(JSON.stringify(profiles.beginner));
  none.move.wants = "no";
  const plan = PlanEngine.build(none, { startIso: START });
  assert.equal(plan.move.sessions.length, 0);
  assert.equal(plan.energy.trainingWeekly, 0);
  assert.ok(plan.food.days.every(d => d.training === false));
});

test("a loved dish may return once, and not fill the week", () => {
  const answers = JSON.parse(JSON.stringify(profiles.beginner));
  answers.food.likesText = "Окрошка";
  answers.food.meals = 3;
  const plan = PlanEngine.build(answers, { startIso: START });
  const counts = {};
  for (const day of plan.food.days) for (const meal of day.meals) counts[meal.id] = (counts[meal.id] || 0) + 1;
  const loved = Object.entries(counts).filter(([id]) => /окрош/i.test(recipeById(id).title));
  assert.ok(loved.some(([, n]) => n >= 2), "loved dish should be allowed back: " + loved.map(([id, n]) => recipeById(id).title + "×" + n).join(", "));
  assert.ok(Object.values(counts).every(n => n <= 2));
});

test("old v1 start choices are understood", () => {
  const v1 = { goal: "lose", sex: "female", activity: "walks", meals: 3, mode: "balanced", prefs: ["walk"], workouts: "1–2 рази", health: "none" };
  const answers = PlanEngine.normalizeAnswers(v1);
  assert.equal(answers.v, 2);
  assert.equal(answers.goal.id, "lose");
  assert.equal(answers.body.dailyActivity, "light");
  assert.equal(answers.move.days, 2);
  assert.deepEqual(plain(answers.move.like), ["walk"]);
});
