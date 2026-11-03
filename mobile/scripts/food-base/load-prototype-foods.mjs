// Loads the prototype's food data and the diary search into a plain Node context,
// so the same ranking the phone uses can be measured from the command line.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
export const PROTOTYPE_DIR = path.resolve(here, "../../public/prototype");

function read(name) {
  return fs.readFileSync(path.join(PROTOTYPE_DIR, name), "utf8");
}

function between(source, startMarker, endMarker) {
  const start = source.indexOf(startMarker);
  const end = endMarker ? source.indexOf(endMarker, start) : source.length;
  if (start < 0 || end < 0) throw new Error("marker not found: " + startMarker + " / " + endMarker);
  return source.slice(start, end);
}

export function loadPrototypeFoods({ customFoods = [] } = {}) {
  const context = vm.createContext({ console, state: { customFoods, favorites: [], logs: {} } });
  const run = (code, name) => vm.runInContext(code, context, { filename: name });

  run(read("recipes-data.js"), "recipes-data.js");
  run(read("nutrition-data.js"), "nutrition-data.js");
  run(read("recipe-expansion.js"), "recipe-expansion.js");
  run(read("food-catalog.js"), "food-catalog.js");
  run(read("food-schema.js"), "food-schema.js");
  run(read("staple-names.js"), "staple-names.js");
  run(read("food-ua-catalog.js"), "food-ua-catalog.js");
  run(read("common-products.js"), "common-products.js");
  run(read("generic-dishes.js"), "generic-dishes.js");
  if (fs.existsSync(path.join(PROTOTYPE_DIR, "food-packages.js"))) run(read("food-packages.js"), "food-packages.js");

  // The pieces of app.js / food-tools.js / off-search.js the search needs.
  const app = read("app.js");
  run(between(app, "function recipeEstimate(", "\nfunction recipeNutrition("), "app.js:recipeEstimate");
  const tools = read("food-tools.js");
  run(between(tools, "function sourceFoods()", "\nfunction catalogMatches("), "food-tools.js:foods");
  const off = read("off-search.js");
  run(between(off, "const OFF_SYN", "\n"), "off-search.js:OFF_SYN");

  const diary = read("diary-flow.js");
  run(between(diary, "const DIARY_MEALS", "/* ---------- which meal"), "diary-flow.js:search");

  return {
    context,
    allFoods: () => run("allFoods()"),
    search: (query, limit = 10) => run("diarySearch(" + JSON.stringify(query) + ", " + limit + ")"),
    kind: food => run("diaryKind(" + JSON.stringify({ quality: food.quality, recipeId: food.recipeId }) + ")")
  };
}
