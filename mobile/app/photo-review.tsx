import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useDevice } from "@/src/device";
import { searchCatalog } from "@/src/nutrition/catalog";
import { recognizeDish, type DishGuess } from "@/src/nutrition/recognize";
import { scalePer100 } from "@/src/nutrition/calc";
import { useStore, type Meal } from "@/src/store";
import { theme } from "@/src/theme";

const SLOTS: { id: Meal["slot"]; name: string }[] = [
  { id: "breakfast", name: "Сніданок" },
  { id: "lunch", name: "Обід" },
  { id: "dinner", name: "Вечеря" },
  { id: "snack", name: "Перекус" },
];

export default function PhotoReviewScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { photo } = useDevice();
  const { state, addMeal } = useStore();
  const shot = id ? photo(id) : undefined;
  const [query, setQuery] = useState("");
  const [grams, setGrams] = useState("150");
  const [slot, setSlot] = useState<Meal["slot"]>("lunch");
  const [picked, setPicked] = useState<string | null>(null);
  const [guesses, setGuesses] = useState<DishGuess[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const results = useMemo(() => (query.trim() ? searchCatalog(state.customFoods, query, "all").slice(0, 12) : []), [query, state.customFoods]);
  const dish = results.find((item) => item.id === picked) ?? null;

  useEffect(() => {
    if (!shot?.uri) return;
    let cancelled = false;
    setStatus("Дивлюсь фото на цьому пристрої…");
    recognizeDish(shot.uri).then((found) => {
      if (cancelled) return;
      setGuesses(found);
      setStatus(found.length ? `Схоже на «${found[0].query}». Перевір перед записом.` : "Не впізнав страву. Знайди її в базі.");
      if (found[0]) setQuery(found[0].query);
    }).catch((caught) => {
      if (!cancelled) setStatus(caught instanceof Error ? caught.message : "Не вдалося подивитись фото тут.");
    });
    return () => {
      cancelled = true;
    };
  }, [shot?.uri]);

  function save() {
    if (!dish) {
      setError("Обери страву з бази.");
      return;
    }
    const amount = Number(grams.replace(",", "."));
    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Вкажи грами.");
      return;
    }
    const perPortion = dish.unit === "portion";
    addMeal({
      name: dish.name,
      grams: amount,
      unit: dish.unit === "ml" ? "ml" : "g",
      kcal: perPortion ? dish.kcal : scalePer100(dish.kcal, amount),
      p: perPortion ? dish.p : scalePer100(dish.p, amount),
      f: perPortion ? dish.f : scalePer100(dish.f, amount),
      c: perPortion ? dish.c : scalePer100(dish.c, amount),
      slot,
      emoji: dish.emoji,
      photoId: shot?.id,
    });
    router.replace("/diary");
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Pressable onPress={() => router.back()} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
      <Text style={styles.kicker}>ФОТО / ПІДТВЕРДЖЕННЯ</Text>
      <Text style={styles.title}>Що на фото?</Text>
      <Text style={styles.sub}>Знімок нікуди не відправляється. Модель дивиться його на цьому пристрої і пропонує страву з бази.</Text>
      {status ? <Text style={styles.status}>{status}</Text> : null}
      {guesses.length ? (
        <View style={styles.pills}>
          {guesses.map((guess) => (
            <Pressable key={guess.query} onPress={() => { setQuery(guess.query); setPicked(null); }} style={styles.pill}>
              <Text style={styles.pillText}>{guess.query}</Text>
            </Pressable>
          ))}
        </View>
      ) : null}
      {shot ? <Image source={{ uri: shot.uri }} style={styles.image} /> : <Text style={styles.sub}>Фото не знайдено на цьому пристрої.</Text>}
      <TextInput value={query} onChangeText={setQuery} placeholder="Борщ, курка запечена, цезар…" placeholderTextColor={theme.muted} style={styles.input} />
      {results.map((item) => (
        <Pressable key={item.id} onPress={() => setPicked(item.id)} style={[styles.row, picked === item.id && styles.rowOn]}>
          <Text style={styles.rowName}>{item.name}</Text>
          <Text style={styles.rowMeta}>{item.cuisine || item.brand}</Text>
        </Pressable>
      ))}
      <View style={styles.pills}>
        {SLOTS.map((item) => (
          <Pressable key={item.id} onPress={() => setSlot(item.id)} style={[styles.pill, slot === item.id && styles.pillOn]}>
            <Text style={[styles.pillText, slot === item.id && styles.pillTextOn]}>{item.name}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.grams}>
        <TextInput value={grams} onChangeText={setGrams} keyboardType="decimal-pad" style={styles.gramInput} />
        <Text style={styles.unit}>г</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.primary} onPress={save}><Text style={styles.primaryText}>Додати в щоденник</Text></Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 22, paddingBottom: 48 },
  close: { alignSelf: "flex-end", width: 36, height: 36, borderRadius: 18, backgroundColor: "#E8ECE2", alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 24, color: theme.ink, marginTop: -2 },
  kicker: { color: theme.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1, marginTop: 8 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -1.2, color: theme.ink, marginTop: 8 },
  sub: { color: theme.muted, marginTop: 8, lineHeight: 20 },
  status: { color: theme.ink, fontWeight: "700", marginTop: 10 },
  image: { width: "100%", aspectRatio: 1, borderRadius: 20, marginTop: 14, backgroundColor: "#F0E7DA" },
  input: { marginTop: 14, backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, fontSize: 16, color: theme.ink },
  row: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: theme.line },
  rowOn: { backgroundColor: "#F3F1E9" },
  rowName: { fontWeight: "800", color: theme.ink },
  rowMeta: { color: theme.muted, fontSize: 12, marginTop: 2 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  pill: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8 },
  pillOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  pillText: { fontWeight: "700", color: theme.ink },
  pillTextOn: { color: "#fff" },
  grams: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 14 },
  gramInput: { width: 110, backgroundColor: theme.white, borderRadius: 14, borderWidth: 1, borderColor: theme.line, paddingHorizontal: 14, paddingVertical: 12, fontSize: 22, fontWeight: "800", color: theme.ink },
  unit: { fontWeight: "800", color: theme.ink, fontSize: 18 },
  error: { color: "#9B2C2C", fontWeight: "700", marginTop: 10 },
  primary: { marginTop: 16, backgroundColor: theme.blue, borderRadius: 14, minHeight: 52, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontWeight: "800" },
});
