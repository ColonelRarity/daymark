import type { ReferenceItem } from "./reference";

export type MacroKey = "kcal" | "protein" | "fat" | "carb";

export type Macros = Record<MacroKey, number | null>;

export type DiaryLine = Macros & {
  id: string;
  name: string;
  grams: number;
  kind: ReferenceItem["kind"];
  sourceName: string;
};

export type DietId =
  | "deficit"
  | "maintenance"
  | "surplus"
  | "keto"
  | "low_carb"
  | "carnivore"
  | "lactose_free"
  | "gluten_free"
  | "vegetarian"
  | "vegan"
  | "pescatarian";

export type FoodFit = "fits" | "avoid" | "unknown";

export type DietDefinition = {
  id: DietId;
  name: string;
  summary: string;
  carbCap: number | null;
};

export const DIETS: DietDefinition[] = [
  {
    id: "deficit",
    name: "Дефіцит",
    summary: "Енергія за день нижча за твій орієнтир. Орієнтир задаєш ти, додаток його не вигадує.",
    carbCap: null,
  },
  {
    id: "maintenance",
    name: "Підтримання",
    summary: "Енергія за день тримається біля твого орієнтира, з вікном 100 ккал.",
    carbCap: null,
  },
  {
    id: "surplus",
    name: "Профіцит",
    summary: "Енергія за день вища за твій орієнтир.",
    carbCap: null,
  },
  {
    id: "keto",
    name: "Кето",
    summary: "Стартова межа вуглеводів — 50 г на день. Це поширена рамка, не призначення.",
    carbCap: 50,
  },
  {
    id: "low_carb",
    name: "Низьковуглеводна",
    summary: "Стартова межа вуглеводів — 100 г на день. Межу можна змінити.",
    carbCap: 100,
  },
  {
    id: "carnivore",
    name: "Карнівор",
    summary: "М’ясо і риба проходять. Овочі, фрукти, крупи, солодке і горіхи — ні. Соуси й готові страви лишаються невідомими, поки немає складу.",
    carbCap: null,
  },
  {
    id: "lactose_free",
    name: "Безлактозна",
    summary: "Без позначки на етикетці додаток не називає продукт безлактозним. Молочна категорія потребує перевірки складу.",
    carbCap: null,
  },
  {
    id: "gluten_free",
    name: "Безглютенова",
    summary: "Без позначки на етикетці додаток не називає продукт безглютеновим.",
    carbCap: null,
  },
  {
    id: "vegetarian",
    name: "Вегетаріанська",
    summary: "М’ясо і риба не проходять. Готові страви без складу лишаються невідомими.",
    carbCap: null,
  },
  {
    id: "vegan",
    name: "Веганська",
    summary: "М’ясо, риба і молочне не проходять. Готові страви без складу лишаються невідомими.",
    carbCap: null,
  },
  {
    id: "pescatarian",
    name: "Пескетаріанська",
    summary: "Риба проходить, м’ясо — ні. Готові страви без складу лишаються невідомими.",
    carbCap: null,
  },
];

export const DIETS_BY_ID = Object.fromEntries(DIETS.map((diet) => [diet.id, diet])) as Record<
  DietId,
  DietDefinition
>;

const MAX_GRAMS = 2000;

export function scalePer100(value: number | null, grams: number): number | null {
  if (value == null) return null;
  return Math.round((value * grams) / 10) / 10;
}

export function lineFromReference(item: ReferenceItem, grams: number): DiaryLine {
  if (!Number.isFinite(grams) || grams <= 0 || grams > MAX_GRAMS) {
    throw new Error("Вкажи вагу від 0,1 до 2000 г.");
  }
  return {
    id: `${item.id}:${grams}:${Date.now()}`,
    name: item.name,
    grams,
    kind: item.kind,
    sourceName: item.sourceName,
    kcal: scalePer100(item.kcal, grams),
    protein: scalePer100(item.protein, grams),
    fat: scalePer100(item.fat, grams),
    carb: scalePer100(item.carb, grams),
  };
}

export function sumMacros(lines: Macros[]): Macros {
  const empty: Macros = { kcal: 0, protein: 0, fat: 0, carb: 0 };
  return (Object.keys(empty) as MacroKey[]).reduce<Macros>((total, key) => {
    let sum = 0;
    for (const line of lines) {
      const value = line[key];
      if (value == null) {
        total[key] = null;
        return total;
      }
      sum += value;
    }
    total[key] = Math.round(sum * 10) / 10;
    return total;
  }, empty);
}

export function foodFit(dietId: DietId, category: string): FoodFit {
  switch (dietId) {
    case "carnivore":
      if (category === "meat" || category === "fish") return "fits";
      if (["veg", "fruit", "staples", "sweets", "nuts", "drinks", "alcohol"].includes(category)) {
        return "avoid";
      }
      return "unknown";
    case "vegetarian":
      if (category === "meat" || category === "fish") return "avoid";
      if (["veg", "fruit", "staples", "nuts", "dairy"].includes(category)) return "fits";
      return "unknown";
    case "vegan":
      if (["meat", "fish", "dairy"].includes(category)) return "avoid";
      if (["veg", "fruit", "staples", "nuts"].includes(category)) return "fits";
      return "unknown";
    case "pescatarian":
      if (category === "meat") return "avoid";
      if (category === "fish" || category === "veg" || category === "fruit" || category === "dairy") return "fits";
      return "unknown";
    case "lactose_free":
    case "gluten_free":
      return "unknown";
    default:
      return "unknown";
  }
}

export type EnergyVerdict = "under" | "near" | "over" | "unknown";

export function energyVerdict(
  dietId: DietId,
  kcal: number | null,
  targetKcal: number | null,
): EnergyVerdict {
  if (kcal == null || targetKcal == null || targetKcal <= 0) return "unknown";
  if (dietId === "deficit") return kcal < targetKcal ? "under" : "over";
  if (dietId === "surplus") return kcal > targetKcal ? "over" : "under";
  if (dietId === "maintenance") {
    if (Math.abs(kcal - targetKcal) <= 100) return "near";
    return kcal > targetKcal ? "over" : "under";
  }
  return "unknown";
}

export function carbVerdict(
  diet: DietDefinition,
  carbCap: number | null,
  carbs: number | null,
): "within" | "over" | "unknown" {
  const cap = carbCap ?? diet.carbCap;
  if (cap == null) return "unknown";
  if (carbs == null) return "unknown";
  return carbs <= cap ? "within" : "over";
}

export function formatMacro(value: number | null, unit: string): string {
  if (value == null) return "невідомо";
  const rounded = Number.isInteger(value) ? String(value) : value.toFixed(1).replace(".", ",");
  return `${rounded} ${unit}`;
}
