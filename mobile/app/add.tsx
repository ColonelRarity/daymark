import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BackBar } from "@/src/components/Chrome";
import foods from "@/src/data/foods.json";
import { num } from "@/src/format";
import { scalePer100 } from "@/src/nutrition/calc";
import { COOKING_FATS, SAUCES } from "@/src/nutrition/reference";
import { useStore, type Meal } from "@/src/store";
import { theme } from "@/src/theme";

const SLOTS: { id: Meal["slot"]; name: string }[] = [
  { id: "breakfast", name: "Сніданок" },
  { id: "lunch", name: "Обід" },
  { id: "dinner", name: "Вечеря" },
  { id: "snack", name: "Перекус" },
  { id: "drink", name: "Напій" },
];

export default function AddScreen() {
  const { mode, id } = useLocalSearchParams<{ mode?: string; id?: string }>();
  const { state, addMeal, addReference } = useStore();
  const listed = foods.find((item) => item.id === id);
  const own = state.customFoods.find((item) => item.id === id);
  const food = listed ?? (own ? { ...own, category: own.unit === "ml" ? "drinks" : "other", brand: own.brand } : undefined);
  const manual = mode === "manual";
  const items = mode === "sauce" ? SAUCES : COOKING_FATS;
  const [itemId, setItemId] = useState(items[0]?.id ?? "");
  const [grams, setGrams] = useState(food ? String(food.serving || 100) : mode === "sauce" ? "20" : "10");
  const [manualName, setManualName] = useState("");
  const [manualKcal, setManualKcal] = useState("");
  const [slot, setSlot] = useState<Meal["slot"]>(food?.category === "drinks" || food?.category === "alcohol" ? "drink" : "snack");
  const [error, setError] = useState("");
  const selected = items.find((item) => item.id === itemId) ?? items[0];
  const amount = Number(grams.replace(",", "."));
  const preview = food
    ? scalePer100(food.kcal, Number.isFinite(amount) ? amount : 0)
    : selected
      ? scalePer100(selected.kcal, Number.isFinite(amount) ? amount : 0)
      : null;

  function save() {
    try {
      if (manual) {
        const kcal = Number(manualKcal.replace(",", "."));
        if (!manualName.trim() || !Number.isFinite(kcal)) throw new Error("Вкажи назву і калорії");
        addMeal({ name: manualName.trim(), grams: Number.isFinite(amount) && amount > 0 ? amount : 1, kcal, p: null, f: null, c: null, slot, emoji: "◌" });
      } else if (food) {
        if (!Number.isFinite(amount) || amount <= 0) throw new Error("Вкажи кількість");
        const unit = ("unit" in food && food.unit === "ml") || food.category === "drinks" || food.category === "alcohol" ? "ml" : "g";
        addMeal({
          name: food.name,
          grams: amount,
          unit,
          kcal: scalePer100(food.kcal, amount),
          p: scalePer100(food.p, amount),
          f: scalePer100(food.f, amount),
          c: scalePer100(food.c, amount),
          slot,
          emoji: food.category === "restaurant" ? "🍔" : unit === "ml" ? "🥤" : "◌",
        });
      } else if (selected) {
        addReference(selected, amount);
      }
      router.back();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Не вдалося додати");
    }
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <BackBar title={manual ? "Швидкий запис" : food ? food.name : mode === "sauce" ? "Соус" : "Олія"} />
      {manual ? (
        <>
          <TextInput value={manualName} onChangeText={setManualName} placeholder="Назва" placeholderTextColor={theme.muted} style={styles.wide} />
          <TextInput value={manualKcal} onChangeText={setManualKcal} placeholder="ккал порції" placeholderTextColor={theme.muted} keyboardType="decimal-pad" style={styles.wide} />
        </>
      ) : !food ? (
        <View style={styles.pills}>
          {items.map((item) => (
            <Pressable key={item.id} onPress={() => setItemId(item.id)} style={[styles.pill, item.id === selected?.id && styles.pillOn]}>
              <Text style={[styles.pillText, item.id === selected?.id && styles.pillTextOn]}>{item.name}</Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <Text style={styles.meta}>{food.brand}</Text>
      )}
      <View style={styles.pills}>
        {SLOTS.map((item) => (
          <Pressable key={item.id} onPress={() => setSlot(item.id)} style={[styles.pill, slot === item.id && styles.pillOn]}>
            <Text style={[styles.pillText, slot === item.id && styles.pillTextOn]}>{item.name}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.row}>
        <TextInput value={grams} onChangeText={setGrams} keyboardType="decimal-pad" style={styles.input} accessibilityLabel="Кількість" />
        <Text style={styles.unit}>{food && (("unit" in food && food.unit === "ml") || food.category === "drinks" || food.category === "alcohol") ? "мл" : "г"}</Text>
      </View>
      <Text style={styles.preview}>{preview == null ? "—" : `${num(preview, 1)} ккал`}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.button} onPress={save}>
        <Text style={styles.buttonText}>Додати</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 16, gap: 14, paddingBottom: 40 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  pill: { backgroundColor: theme.white, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: theme.line },
  pillOn: { backgroundColor: theme.blue, borderColor: theme.blue },
  pillText: { color: theme.ink, fontWeight: "700" },
  pillTextOn: { color: theme.white },
  meta: { color: theme.muted },
  wide: { backgroundColor: theme.white, borderRadius: 14, borderWidth: 1, borderColor: theme.line, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: theme.ink },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  input: { width: 110, backgroundColor: theme.white, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 22, fontWeight: "800", color: theme.ink },
  unit: { fontSize: 18, fontWeight: "700", color: theme.ink },
  preview: { fontSize: 36, fontWeight: "800", color: theme.ink },
  error: { color: "#9B2C2C", fontWeight: "700" },
  button: { backgroundColor: theme.blue, borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: theme.white, fontWeight: "800", fontSize: 16 },
});
