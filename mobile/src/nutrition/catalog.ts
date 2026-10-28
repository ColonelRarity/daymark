import foods from "@/src/data/foods.json";
import recipes from "@/src/data/recipes.json";
import type { CustomFood } from "@/src/store";

export const FOOD_CATEGORIES: [string, string][] = [
  ["staples", "Крупи, хліб і бобові"],
  ["meat", "М’ясо та яйця"],
  ["fish", "Риба й морепродукти"],
  ["veg", "Овочі"],
  ["fruit", "Фрукти й ягоди"],
  ["nuts", "Горіхи й насіння"],
  ["dairy", "Молочне та сир"],
  ["ready", "Готові страви й фастфуд"],
  ["sweets", "Десерти й солодощі"],
  ["snacks", "Снеки"],
  ["sauces", "Соуси й додатки"],
  ["drinks", "Напої"],
  ["alcohol", "Алкогольні напої"],
  ["other", "Інші продукти"],
];

export const CATALOG_FILTERS: [string, string][] = [
  ["all", "Уся база"],
  ["mine", "Мої продукти"],
  ["dishes", "Страви"],
  ["restaurant", "Заклади України"],
  ["drink-all", "Усі напої"],
  ...FOOD_CATEGORIES,
];

export type CatalogItem = {
  id: string;
  name: string;
  brand: string;
  category: string;
  kcal: number | null;
  p: number | null;
  f: number | null;
  c: number | null;
  serving: number;
  unit: "g" | "ml" | "portion";
  kind: "reference" | "restaurant" | "user" | "recipe";
  cuisine: string;
  emoji: string;
  hay: string;
};

const EMOJI: Record<string, string> = {
  restaurant: "🍔",
  drinks: "🥤",
  alcohol: "🍷",
  meat: "🥩",
  fish: "🐟",
  dairy: "🥛",
  veg: "🥦",
  fruit: "🍎",
  sweets: "🍪",
  staples: "🍞",
  ready: "🍲",
  sauces: "🥄",
  nuts: "🥜",
  snacks: "🥨",
};

const SYNONYMS: Record<string, string> = {
  бургер: "бургер",
  латте: "лате",
  кофе: "кава",
  шаурма: "шаурма",
  макдональдс: "mcdonald",
  макдональдз: "mcdonald",
  суши: "суш",
  овсянка: "вівся",
  курица: "кур",
  творог: "сир",
};

function text(value: string) {
  return value.toLocaleLowerCase("uk").replace(/[’ʼ']/g, "").replace(/ё/g, "е");
}

function emojiFor(category: string) {
  return EMOJI[category] ?? "◌";
}

const baseCatalog: CatalogItem[] = foods.map((food) => ({
  id: food.id,
  name: food.name,
  brand: food.brand,
  category: food.category,
  kcal: food.kcal,
  p: food.p,
  f: food.f,
  c: food.c,
  serving: food.serving || 100,
  unit: food.category === "drinks" || food.category === "alcohol" ? "ml" : "g",
  kind: food.category === "restaurant" ? "restaurant" : "reference",
  cuisine: food.cuisine,
  emoji: emojiFor(food.category),
  hay: text(`${food.name} ${food.aliases} ${food.cuisine} ${food.brand}`),
}));

const recipeCatalog: CatalogItem[] = recipes.map((recipe) => ({
  id: recipe.id,
  name: recipe.title,
  brand: "DAYMARK · приклад складу",
  category: "ready",
  kcal: recipe.kcal,
  p: recipe.p,
  f: recipe.f,
  c: recipe.c,
  serving: 1,
  unit: "portion",
  kind: "recipe",
  cuisine: recipeCuisine(recipe.title),
  emoji: "🍽",
  hay: text(`${recipe.title} ${recipe.categoryLabel} ${recipeCuisine(recipe.title)}`),
}));

export const SOURCE_COUNT = foods.length;
export const RECIPE_COUNT = recipes.length;

export function catalogItems(custom: CustomFood[]): CatalogItem[] {
  const mine: CatalogItem[] = custom.map((food) => ({
    id: food.id,
    name: food.name,
    brand: food.brand || "Мій продукт",
    category: food.unit === "ml" ? "drinks" : "other",
    kcal: food.kcal,
    p: food.p,
    f: food.f,
    c: food.c,
    serving: food.serving,
    unit: food.unit,
    kind: "user",
    cuisine: "",
    emoji: food.unit === "ml" ? "🥤" : "◌",
    hay: text(`${food.name} ${food.brand}`),
  }));
  return [...mine, ...baseCatalog, ...recipeCatalog];
}

export function searchCatalog(custom: CustomFood[], query: string, category: string) {
  const terms = text(query).split(/[\s,]+/).filter(Boolean).map((term) => SYNONYMS[term] || term);
  return catalogItems(custom).filter((item) => {
    if (category === "mine" && item.kind !== "user") return false;
    if (category === "dishes" && item.kind !== "recipe" && item.category !== "ready") return false;
    if (category === "drink-all" && item.category !== "drinks" && item.category !== "alcohol" && item.unit !== "ml") return false;
    if (!["all", "mine", "dishes", "drink-all"].includes(category) && item.category !== category) return false;
    return terms.every((term) => item.hay.includes(term));
  }).sort((a, b) => {
    const rank = (item: CatalogItem) => {
      const name = text(item.name);
      const leads = terms.some((term) => name.startsWith(term)) ? 0 : 1;
      return leads * 2 + (item.kind === "restaurant" ? 1 : 0);
    };
    return rank(a) - rank(b);
  });
}

export function recipeCuisine(title: string) {
  const name = title.toLowerCase();
  if (/щі|кулеб|пельмен/.test(name)) return "середньоєвропейська кухня";
  if (/борщ|вареник|голуб|сирник|дерун|котлет|млинц|пампуш|крученик|юшк|капусняк|бануш|запікан/.test(name)) return "українська кухня";
  return "";
}

export function catalogNote(item: CatalogItem) {
  if (item.kind === "user") return "мій продукт";
  if (item.kind === "restaurant") return `${item.brand} · дані закладу`;
  if (item.cuisine) return item.cuisine;
  if (item.kind === "recipe") return "приклад складу страви";
  return "середній склад продукту";
}

export function catalogAmount(item: CatalogItem) {
  if (item.unit === "portion") return `${Math.round(item.kcal ?? 0)} ккал / порція`;
  const unit = item.unit === "ml" ? "мл" : "г";
  const kcal = item.kcal == null ? "—" : String(Math.round(item.kcal));
  const portion = item.kind === "restaurant" ? ` · порція ${Math.round(item.serving)} ${unit}` : "";
  return `${kcal} ккал / 100 ${unit}${portion}`;
}
