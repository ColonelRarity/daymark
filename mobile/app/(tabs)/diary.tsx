import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { num } from "@/src/format";
import { useStore, type Meal } from "@/src/store";
import { theme } from "@/src/theme";
import { CoachTeaser, DateControl, PageTop } from "@/src/components/Shell";

const FILTERS: { id: "all" | Meal["slot"]; name: string }[] = [
  { id: "all", name: "Усе" },
  { id: "breakfast", name: "Сніданок" },
  { id: "lunch", name: "Обід" },
  { id: "dinner", name: "Вечеря" },
  { id: "snack", name: "Перекуси" },
  { id: "drink", name: "Напої" },
];

const GROUPS: { id: Meal["slot"]; name: string }[] = [
  { id: "breakfast", name: "Сніданок" },
  { id: "lunch", name: "Обід" },
  { id: "dinner", name: "Вечеря" },
  { id: "snack", name: "Перекуси" },
  { id: "drink", name: "Напої" },
];

const FOCUS: Record<string, string> = {
  balanced: "У МОЄМУ РИТМІ",
  flexible: "ГНУЧКИЙ РЕЖИМ",
  keto: "МІЙ ОРІЄНТИР ВУГЛЕВОДІВ",
  low_carb: "МІЙ ОРІЄНТИР ВУГЛЕВОДІВ",
};

export default function DiaryScreen() {
  const { day, setWater, removeMeal, state } = useStore();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]["id"]>("all");
  const meals = day.meals.filter((meal) => filter === "all" || meal.slot === filter);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <PageTop eyebrow={`ХАРЧУВАННЯ / ${FOCUS[state.diet] ?? "У МОЄМУ РИТМІ"}`} title="Їжа. Без зайвого шуму." action={<DateControl />} />
      <CoachTeaser />
      <View style={styles.fast}>
        <Pressable style={styles.fastFood} onPress={() => router.push("/search")}><Text style={styles.fastFoodText}>🍔 Їжа й заклади</Text></Pressable>
        <Pressable style={styles.fastDrink} onPress={() => router.push("/search?category=drinks")}><Text style={styles.fastDrinkText}>☕ Мій напій</Text></Pressable>
      </View>
      <Pressable style={styles.recipeLink} onPress={() => router.push("/recipes")}>
        <Text style={styles.recipeMark}>✳ Не знаєш, що поїсти?</Text>
        <Text style={styles.recipeTitle}>100 ідей під твій настрій ↗</Text>
      </Pressable>
      <View style={styles.tools}>
        <Pressable style={styles.toolFeatured} onPress={() => router.push("/photo")}>
          <Text style={styles.toolFeaturedTitle}>Фото тарілки</Text>
          <Text style={styles.toolFeaturedSub}>Сценарій AI-оцінки ↗</Text>
        </Pressable>
        <Pressable style={styles.tool} onPress={() => router.push("/search")}>
          <Text style={styles.toolTitle}>Знайти продукт</Text>
          <Text style={styles.toolSub}>Продукти й заклади ↗</Text>
        </Pressable>
        <Pressable style={styles.tool} onPress={() => router.push("/label")}>
          <Text style={styles.toolTitle}>За етикеткою</Text>
          <Text style={styles.toolSub}>Грами та склад ↗</Text>
        </Pressable>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.pills}>
        {FILTERS.map((item) => (
          <Pressable key={item.id} onPress={() => setFilter(item.id)} style={[styles.pill, filter === item.id && styles.pillOn]}>
            <Text style={[styles.pillText, filter === item.id && styles.pillTextOn]}>{item.name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      {GROUPS.map((group) => {
        const rows = meals.filter((meal) => meal.slot === group.id);
        if (!rows.length) return null;
        const kcal = rows.reduce((sum, meal) => sum + (meal.kcal ?? 0), 0);
        return (
          <View key={group.id} style={styles.section}>
            <View style={styles.sectionHead}>
              <Text style={styles.sectionTitle}>{group.name}</Text>
              <Text style={styles.sectionKcal}>{num(kcal)} ккал</Text>
            </View>
            {rows.map((meal) => (
              <Pressable key={meal.id} style={styles.food} onPress={() => removeMeal(meal.id)}>
                <View style={styles.visual}><Text style={styles.emoji}>{meal.emoji}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.foodName}>{meal.name}</Text>
                  <Text style={styles.foodMeta}>{num(meal.grams)} {meal.unit === "ml" ? "мл" : "г"} · {meal.id.startsWith("demo") ? "демо-запис" : "мій запис"}</Text>
                </View>
                <Text style={styles.foodKcal}>{meal.kcal == null ? "—" : num(meal.kcal)}</Text>
              </Pressable>
            ))}
          </View>
        );
      })}
      <Pressable style={styles.add} onPress={() => router.push("/choose")}>
        <Text style={styles.addText}>＋ Ще їжа або напій</Text>
      </Pressable>
      <View style={styles.panel}>
        <View style={styles.sectionHead}>
          <Text style={styles.panelTitle}>Моя вода</Text>
          <Text style={styles.sectionKcal}>{num(day.water * 0.25, 2)} л</Text>
        </View>
        <View style={styles.glasses}>
          {Array.from({ length: 8 }, (_, index) => {
            const on = index < day.water;
            return (
              <Pressable key={index} accessibilityLabel={`Позначити ${index + 1} склянок води`} onPress={() => setWater(index + 1 === day.water ? 0 : index + 1)} style={[styles.glass, on && styles.glassOn]}>
                <Text style={{ color: on ? theme.blue : "#B2B9AA" }}>💧</Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.note}>Одна позначка — 250 мл. Це щоденник, а не призначена норма.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 18, paddingBottom: 120 },
  fast: { flexDirection: "row", gap: 8, marginBottom: 12 },
  fastFood: { flex: 1, backgroundColor: "#EEE7FB", borderRadius: 15, minHeight: 48, justifyContent: "center", paddingHorizontal: 10 },
  fastFoodText: { color: "#73578C", fontWeight: "700", fontSize: 13 },
  fastDrink: { flex: 1, backgroundColor: "#EAF3D8", borderRadius: 15, minHeight: 48, justifyContent: "center", paddingHorizontal: 10 },
  fastDrinkText: { color: "#6D804D", fontWeight: "700", fontSize: 13 },
  recipeLink: { backgroundColor: "#FFE4D0", borderRadius: 16, padding: 17, marginBottom: 14 },
  recipeMark: { color: "#7A402A", fontSize: 14 },
  recipeTitle: { color: "#7A402A", fontWeight: "700", fontSize: 15, marginTop: 4 },
  tools: { flexDirection: "row", gap: 8, marginBottom: 16 },
  toolFeatured: { flex: 1, backgroundColor: theme.blue, borderRadius: 16, minHeight: 108, padding: 12, justifyContent: "flex-end" },
  toolFeaturedTitle: { color: "#fff", fontWeight: "800", fontSize: 14 },
  toolFeaturedSub: { color: "#E4E0FF", fontSize: 12, marginTop: 4 },
  tool: { flex: 1, backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 16, minHeight: 108, padding: 12, justifyContent: "flex-end" },
  toolTitle: { fontWeight: "800", color: theme.ink, fontSize: 14 },
  toolSub: { color: theme.muted, fontSize: 12, marginTop: 4 },
  pills: { gap: 7, marginBottom: 16 },
  pill: { backgroundColor: "#E9ECE3", borderRadius: 30, paddingHorizontal: 13, paddingVertical: 8 },
  pillOn: { backgroundColor: theme.ink },
  pillText: { fontWeight: "700", color: theme.ink, fontSize: 13 },
  pillTextOn: { color: "#fff" },
  section: { marginBottom: 16 },
  sectionHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: theme.ink },
  sectionKcal: { color: theme.muted, fontSize: 13 },
  food: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 15, padding: 12, flexDirection: "row", alignItems: "center", gap: 12, marginTop: 8 },
  visual: { width: 51, height: 51, borderRadius: 13, backgroundColor: "#FFF0DF", alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 24 },
  foodName: { fontWeight: "700", color: theme.ink, fontSize: 15 },
  foodMeta: { color: theme.muted, fontSize: 12, marginTop: 3 },
  foodKcal: { fontWeight: "800", fontSize: 16, color: theme.ink },
  add: { backgroundColor: theme.blue, borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center", marginTop: 4 },
  addText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  panel: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 25, padding: 18, marginTop: 16 },
  panelTitle: { fontSize: 20, fontWeight: "800", color: theme.ink },
  glasses: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  glass: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#F1F4EC", alignItems: "center", justifyContent: "center" },
  glassOn: { backgroundColor: "#DBE5FF" },
  note: { color: theme.muted, fontSize: 13, marginTop: 12, lineHeight: 18 },
});
