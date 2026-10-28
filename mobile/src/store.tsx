import { createContext, useContext, useMemo, useState, type ReactNode } from "react";

import { addMonthsISO, shiftISO, todayISO } from "@/src/format";
import type { ReferenceItem } from "@/src/nutrition/reference";
import { lineFromReference } from "@/src/nutrition/calc";

export type Meal = {
  id: string;
  name: string;
  grams: number;
  unit?: "g" | "ml";
  kcal: number | null;
  p: number | null;
  f: number | null;
  c: number | null;
  slot: "breakfast" | "lunch" | "dinner" | "snack" | "drink";
  emoji: string;
  photoId?: string;
};

export type CustomFood = {
  id: string;
  name: string;
  brand: string;
  unit: "g" | "ml";
  serving: number;
  kcal: number;
  p: number | null;
  f: number | null;
  c: number | null;
};

export type Mark = "full" | "minimum";

export type CartLine = { id: string; title: string; servings: number };

export type Workout = {
  id: string;
  name: string;
  minutes: number;
  kcal: number | null;
};

type DayLog = {
  meals: Meal[];
  steps: number;
  bed: string;
  wake: string;
  workouts: Workout[];
  water: number;
  moveDone: boolean;
  sleepDone: boolean;
};

type State = {
  demo: boolean;
  name: string;
  calories: number | null;
  diet: string;
  weight: number | null;
  goalTitle: string;
  goalStart: string;
  goalEnd: string;
  stepsTarget: number;
  savedRecipes: string[];
  cart: CartLine[];
  bought: string[];
  customFoods: CustomFood[];
  selectedDate: string;
  checks: Record<string, Mark>;
  days: Record<string, DayLog>;
};

type StoreValue = {
  state: State;
  day: DayLog;
  totals: { kcal: number; p: number; f: number; c: number; missing: boolean };
  setDate: (iso: string) => void;
  mark: (mode: Mark | "clear") => void;
  addMeal: (meal: Omit<Meal, "id">) => void;
  addCustomFood: (food: CustomFood) => void;
  addReference: (item: ReferenceItem, grams: number) => void;
  removeMeal: (id: string) => void;
  setCalories: (value: number | null) => void;
  setDiet: (diet: string) => void;
  setName: (name: string) => void;
  setSteps: (steps: number) => void;
  setSleep: (bed: string, wake: string) => void;
  setWeight: (weight: number | null) => void;
  setStepsTarget: (steps: number) => void;
  addWorkout: (workout: Omit<Workout, "id">) => void;
  removeWorkout: (id: string) => void;
  setWater: (count: number) => void;
  toggleHabit: (habit: "moveDone" | "sleepDone") => void;
  toggleRecipe: (id: string) => void;
  addToCart: (line: CartLine) => void;
  removeFromCart: (index: number) => void;
  toggleBought: (key: string) => void;
  startOwn: (title?: string) => void;
};

const StoreContext = createContext<StoreValue | null>(null);

const CUSTOM_FOODS_KEY = "daymark-custom-foods";

function loadCustomFoods(): CustomFood[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(CUSTOM_FOODS_KEY) || "[]") as CustomFood[];
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === "string" && typeof item.name === "string" && typeof item.kcal === "number").slice(0, 500);
  } catch {
    return [];
  }
}

function saveCustomFoods(foods: CustomFood[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(CUSTOM_FOODS_KEY, JSON.stringify(foods));
}

function emptyDay(): DayLog {
  return { meals: [], steps: 0, bed: "", wake: "", workouts: [], water: 0, moveDone: false, sleepDone: false };
}

function makeDemo(): State {
  const today = todayISO();
  const start = shiftISO(today, -18);
  const checks: Record<string, Mark> = {};
  for (let i = 0; i < 18; i += 1) {
    if ([3, 8, 14].includes(i)) continue;
    checks[shiftISO(start, i)] = i === 11 ? "minimum" : "full";
  }
  const days: Record<string, DayLog> = {};
  for (let i = 6; i >= 0; i -= 1) {
    const iso = shiftISO(today, -i);
    days[iso] = {
      meals: [],
      steps: i === 0 ? 6410 : 4200 + (6 - i) * 540,
      bed: "23:30",
      wake: ["07:15", "07:00", "06:45", "07:30", "07:10", "07:20", "07:15"][i],
      workouts: [],
      water: i === 0 ? 4 : 6,
      moveDone: i % 3 !== 0,
      sleepDone: true,
    };
  }
  days[today].meals = [
    { id: "demo-breakfast", name: "Вівсянка, банан, йогурт", grams: 320, kcal: 385, p: 15, f: 10, c: 59, slot: "breakfast", emoji: "🥣" },
    { id: "demo-lunch", name: "Боул із куркою та рисом", grams: 380, kcal: 520, p: 39, f: 18, c: 50, slot: "lunch", emoji: "🥗" },
    { id: "demo-drink", name: "Капучино з молоком", grams: 200, kcal: 94, p: 5.4, f: 4.5, c: 8.5, slot: "drink", emoji: "☕" },
  ];
  return {
    demo: true,
    name: "Алекс",
    calories: 2100,
    diet: "balanced",
    weight: null,
    goalTitle: "Сильніша версія себе",
    goalStart: start,
    goalEnd: addMonthsISO(start, 4),
    stepsTarget: 8000,
    savedRecipes: [],
    cart: [],
    bought: [],
    customFoods: loadCustomFoods(),
    selectedDate: today,
    checks,
    days,
  };
}

function sum(meals: Meal[]) {
  return meals.reduce(
    (total, meal) => {
      if (meal.kcal == null || meal.p == null || meal.f == null || meal.c == null) total.missing = true;
      total.kcal += meal.kcal ?? 0;
      total.p += meal.p ?? 0;
      total.f += meal.f ?? 0;
      total.c += meal.c ?? 0;
      return total;
    },
    { kcal: 0, p: 0, f: 0, c: 0, missing: false },
  );
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>(makeDemo);

  const value = useMemo<StoreValue>(() => {
    const day = state.days[state.selectedDate] ?? emptyDay();
    return {
      state,
      day,
      totals: sum(day.meals),
      setDate: (iso) => setState((current) => ({ ...current, selectedDate: iso })),
      mark: (mode) =>
        setState((current) => {
          const checks = { ...current.checks };
          if (mode === "clear") delete checks[current.selectedDate];
          else checks[current.selectedDate] = mode;
          return { ...current, checks };
        }),
      addMeal: (meal) =>
        setState((current) => {
          const existing = current.days[current.selectedDate] ?? emptyDay();
          return {
            ...current,
            days: {
              ...current.days,
              [current.selectedDate]: {
                ...existing,
                meals: [{ ...meal, id: `${Date.now()}` }, ...existing.meals],
              },
            },
          };
        }),
      addCustomFood: (food) =>
        setState((current) => {
          const customFoods = [food, ...current.customFoods.filter((item) => item.id !== food.id)].slice(0, 500);
          saveCustomFoods(customFoods);
          return { ...current, customFoods };
        }),
      addReference: (item, grams) => {
        const line = lineFromReference(item, grams);
        setState((current) => {
          const existing = current.days[current.selectedDate] ?? emptyDay();
          const meal: Meal = {
            id: line.id,
            name: item.name,
            grams,
            kcal: line.kcal,
            p: line.protein,
            f: line.fat,
            c: line.carb,
            slot: "snack",
            emoji: item.kind === "fat" ? "🫒" : "🥄",
          };
          return {
            ...current,
            days: {
              ...current.days,
              [current.selectedDate]: { ...existing, meals: [meal, ...existing.meals] },
            },
          };
        });
      },
      removeMeal: (id) =>
        setState((current) => {
          const existing = current.days[current.selectedDate] ?? emptyDay();
          return {
            ...current,
            days: {
              ...current.days,
              [current.selectedDate]: { ...existing, meals: existing.meals.filter((meal) => meal.id !== id) },
            },
          };
        }),
      setCalories: (calories) => setState((current) => ({ ...current, calories })),
      setDiet: (diet) => setState((current) => ({ ...current, diet })),
      setName: (name) => setState((current) => ({ ...current, name })),
      setWeight: (weight) => setState((current) => ({ ...current, weight })),
      setStepsTarget: (stepsTarget) => setState((current) => ({ ...current, stepsTarget })),
      removeWorkout: (id) =>
        setState((current) => {
          const existing = current.days[current.selectedDate] ?? emptyDay();
          return {
            ...current,
            days: { ...current.days, [current.selectedDate]: { ...existing, workouts: existing.workouts.filter((item) => item.id !== id) } },
          };
        }),
      setWater: (count) =>
        setState((current) => {
          const existing = current.days[current.selectedDate] ?? emptyDay();
          return { ...current, days: { ...current.days, [current.selectedDate]: { ...existing, water: count } } };
        }),
      toggleRecipe: (id) =>
        setState((current) => ({
          ...current,
          savedRecipes: current.savedRecipes.includes(id)
            ? current.savedRecipes.filter((item) => item !== id)
            : [...current.savedRecipes, id],
        })),
      addToCart: (line) =>
        setState((current) => ({
          ...current,
          cart: current.cart.some((item) => item.id === line.id && item.servings === line.servings)
            ? current.cart
            : [...current.cart, line],
        })),
      removeFromCart: (index) =>
        setState((current) => ({ ...current, cart: current.cart.filter((_, item) => item !== index) })),
      toggleBought: (key) =>
        setState((current) => ({
          ...current,
          bought: current.bought.includes(key) ? current.bought.filter((item) => item !== key) : [...current.bought, key],
        })),
      toggleHabit: (habit) =>
        setState((current) => {
          const existing = current.days[current.selectedDate] ?? emptyDay();
          return { ...current, days: { ...current.days, [current.selectedDate]: { ...existing, [habit]: !existing[habit] } } };
        }),
      addWorkout: (workout) =>
        setState((current) => {
          const existing = current.days[current.selectedDate] ?? emptyDay();
          return {
            ...current,
            days: {
              ...current.days,
              [current.selectedDate]: {
                ...existing,
                workouts: [{ ...workout, id: `${Date.now()}` }, ...existing.workouts],
              },
            },
          };
        }),
      setSteps: (steps) =>
        setState((current) => {
          const existing = current.days[current.selectedDate] ?? emptyDay();
          return { ...current, days: { ...current.days, [current.selectedDate]: { ...existing, steps } } };
        }),
      setSleep: (bed, wake) =>
        setState((current) => {
          const existing = current.days[current.selectedDate] ?? emptyDay();
          return { ...current, days: { ...current.days, [current.selectedDate]: { ...existing, bed, wake } } };
        }),
      startOwn: (title) =>
        setState((current) => ({
          demo: false,
          name: current.name,
          calories: current.calories,
          diet: current.diet,
          weight: current.weight,
          goalTitle: title?.trim() || "Моя ціль",
          goalStart: todayISO(),
          goalEnd: addMonthsISO(todayISO(), 4),
          stepsTarget: current.stepsTarget,
          savedRecipes: current.savedRecipes,
          cart: current.cart,
          bought: current.bought,
          customFoods: current.customFoods,
          selectedDate: todayISO(),
          checks: {},
          days: {},
        })),
    };
  }, [state]);

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const value = useContext(StoreContext);
  if (!value) throw new Error("Store missing");
  return value;
}
