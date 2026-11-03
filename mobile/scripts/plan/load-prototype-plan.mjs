// Loads the prototype's recipes, training library, EnergyCalc and PlanEngine into a plain Node
// context, so the same planner the phone runs can be tested from the command line.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const PROTOTYPE_DIR = path.resolve(here, "../../public/prototype");

function read(name) { return fs.readFileSync(path.join(PROTOTYPE_DIR, name), "utf8"); }

function between(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = endMarker ? source.indexOf(endMarker, start) : source.length;
  if (start < 0 || end < 0) throw new Error("marker not found: " + startMarker + " / " + endMarker);
  return source.slice(start, end);
}

export function loadPrototypePlan({ todayIso } = {}) {
  const context = vm.createContext({ console, state: { customFoods: [], favorites: [], logs: {} }, localStorage: { getItem: () => null, setItem() {}, removeItem() {} } });
  const run = (code, name) => vm.runInContext(code, context, { filename: name });

  run(read("recipes-data.js"), "recipes-data.js");
  run(read("nutrition-data.js"), "nutrition-data.js");
  run(read("recipe-expansion.js"), "recipe-expansion.js");

  const app = read("app.js");
  let dates = between(app, "const today=", "\nconst fdate=");
  if (todayIso) dates = dates.replace(/^const today=.*$/m, "const today=()=>" + JSON.stringify(todayIso) + ";");
  run(dates, "app.js:dates");
  run(between(app, "function recipeEstimate(", "\nfunction recipeNutrition("), "app.js:recipeEstimate");

  run(between(read("training-studio.js"), "const TRAINING_EXERCISES", "\nlet trainingFilter"), "training-studio.js:data");
  run("function trainingPlan(id){return TRAINING_PLANS.find(p=>p.id===id);}", "trainingPlan");
  run(between(read("training-flow.js"), "Object.assign(TRAINING_EXERCISES", "\nconst TRAINING_DRAFT_KEY"), "training-flow.js:data");
  run(between(read("training-evolution.js"), "Object.assign(TRAINING_EXERCISES", "\nconst TRAINING_INTENTS"), "training-evolution.js:data");
  run(between(read("training-expansion.js"), "TRAINING_PLANS.push(", "\nconst originalExpanded"), "training-expansion.js:data");

  run(read("energy-calc.js"), "energy-calc.js");
  run(read("plan-engine.js"), "plan-engine.js");

  return {
    context,
    PlanEngine: run("PlanEngine"),
    EnergyCalc: run("EnergyCalc"),
    RECIPES: run("RECIPES"),
    RECIPE_INGREDIENTS: run("RECIPE_INGREDIENTS"),
    TRAINING_PLANS: run("TRAINING_PLANS"),
    TRAINING_EXERCISES: run("TRAINING_EXERCISES"),
    recipeEstimate: run("recipeEstimate")
  };
}
