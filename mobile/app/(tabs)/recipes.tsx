import { router } from "expo-router";
import { useMemo, useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { Glyph } from "@/src/components/Marks";
import recipes from "@/src/data/recipes.json";
import { useStore } from "@/src/store";
import { theme } from "@/src/theme";

const TABS = [
  ["all", "Усі ідеї"],
  ["breakfast", "Сніданки"],
  ["lunch", "Обіди"],
  ["dinner", "Вечері"],
  ["snack", "Перекуси"],
  ["dessert", "Десерти"],
  ["saved", "♡ Збережені"],
] as const;

const CHIPS = [
  ["all", "Усі підбірки"],
  ["quick", "До 15 хв"],
  ["protein", "Більше білка"],
  ["home", "Домашня класика"],
] as const;

type Recipe = (typeof recipes)[number];

function blocked(recipe: Recipe, word: string) {
  const names = recipe.items.map((item) => item.name.toLowerCase()).join(" ");
  if (word === "fish") return /лосос|риб|туне|тунц|кревет/.test(names);
  if (word === "dairy") return /сир|молок|йогурт|вершк|кефір|сметан/.test(names);
  if (word === "egg") return names.includes("яйц");
  if (word === "nuts") return /горіх|арахіс|мигдал|фундук/.test(names);
  return false;
}

export default function RecipesScreen() {
  const { state, toggleRecipe } = useStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<(typeof TABS)[number][0]>("all");
  const [chip, setChip] = useState<(typeof CHIPS)[number][0]>("all");
  const [openFilters, setOpenFilters] = useState(false);
  const [maxTime, setMaxTime] = useState(0);
  const [exclude, setExclude] = useState<string[]>([]);

  const list = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return recipes.filter((recipe) => {
      if (category === "saved" && !state.savedRecipes.includes(recipe.id)) return false;
      if (category !== "all" && category !== "saved" && recipe.category !== category) return false;
      if (chip === "quick" && recipe.minutes > 15) return false;
      if (chip === "protein" && recipe.p < 25) return false;
      if (chip === "home" && (recipe.category === "dessert" || recipe.category === "snack")) return false;
      if (maxTime && recipe.minutes > maxTime) return false;
      if (exclude.some((word) => blocked(recipe, word))) return false;
      if (!needle) return true;
      const hay = `${recipe.title} ${recipe.items.map((item) => item.name).join(" ")}`.toLowerCase();
      return hay.includes(needle);
    });
  }, [category, chip, exclude, maxTime, query, state.savedRecipes]);

  function surprise() {
    const pick = list[Math.floor(Math.random() * list.length)] ?? recipes[0];
    router.push(`/recipe/${pick.id}`);
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={styles.kicker}><Text style={styles.dot}>● </Text>100 ІДЕЙ / ВИБИРАЙ ПІД СЕБЕ</Text>
      <Text style={styles.pageTitle}>Що приготуємо сьогодні?</Text>
      <Pressable style={styles.shop} onPress={() => router.push("/recipe/cart")}>
        <Glyph name="basket" size={18} color={theme.ink} />
        <Text style={styles.shopText}>Мої покупки</Text>
        <Text style={styles.shopCount}>{state.cart.length}</Text>
      </Pressable>

      <View style={styles.hero}>
        <Text style={styles.heroCap}>ЗВИЧАЙНІ ПРОДУКТИ. НОВІ ПОЄДНАННЯ.</Text>
        <Text style={styles.heroTitle}>Ідеї закінчились?{"\n"}<Text style={styles.em}>Страви — ні.</Text></Text>
        <Text style={styles.heroText}>Не хочеш рибу? Обери м’ясо. Немає часу? Знайди щось за 10 хвилин. Або довір вибір нам.</Text>
        <Pressable style={styles.white} onPress={surprise}>
          <Text style={styles.whiteText}>✳ Обрати за мене</Text>
        </Pressable>
        <View style={styles.plate}>
          <Image resizeMode="cover" source={{ uri: "/art/dishes/breakfast-1.png" }} style={styles.plateImage} />
        </View>
        <View style={styles.numberWrap}>
          <Text style={styles.number}>100</Text>
          <Text style={styles.numberSub}>варіантів для{"\n"}твого ритму</Text>
        </View>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabs}>
        {TABS.map(([id, name]) => (
          <Pressable key={id} onPress={() => setCategory(id)} style={[styles.tab, category === id && styles.tabOn]}>
            <Text style={[styles.tabText, category === id && styles.tabTextOn]}>{name}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <Pressable style={styles.filters} onPress={() => setOpenFilters((value) => !value)}>
        <Text style={styles.filtersTitle}>⚙ Підібрати під себе</Text>
        <Text style={styles.filtersHint}>Продукти · час · побажання</Text>
      </Pressable>
      {openFilters ? (
        <View style={styles.filterBox}>
          <Text style={styles.filterHead}>Твоя страва.{"\n"}Твої побажання.</Text>
          <Text style={styles.filterLabel}>Скільки є часу?</Text>
          <View style={styles.pills}>
            {[[0, "Будь-який час"], [10, "До 10 хвилин"], [20, "До 20 хвилин"], [30, "До 30 хвилин"]].map(([value, label]) => (
              <Pressable key={String(value)} onPress={() => setMaxTime(Number(value))} style={[styles.mini, maxTime === value && styles.miniOn]}>
                <Text style={[styles.miniText, maxTime === value && styles.miniTextOn]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.filterLabel}>Сьогодні без…</Text>
          {[["fish", "Риби"], ["dairy", "Молочних продуктів"], ["egg", "Яєць"], ["nuts", "Горіхів і арахісу"]].map(([id, label]) => {
            const on = exclude.includes(id);
            return (
              <Pressable key={id} onPress={() => setExclude((current) => on ? current.filter((item) => item !== id) : [...current, id])} style={styles.check}>
                <View style={[styles.box, on && styles.boxOn]}>{on ? <Text style={styles.tick}>✓</Text> : null}</View>
                <Text style={styles.checkText}>{label}</Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      <View style={styles.search}>
        <Glyph name="search" size={18} color="#858D7D" />
        <TextInput value={query} onChangeText={setQuery} placeholder="Назва або продукти: сир, лаваш, курка…" placeholderTextColor={theme.muted} style={styles.searchInput} />
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
        {CHIPS.map(([id, name]) => (
          <Pressable key={id} onPress={() => setChip(id)} style={[styles.chip, chip === id && styles.chipOn]}>
            <Text style={[styles.chipText, chip === id && styles.chipTextOn]}>{id === "quick" ? "⚡ " : ""}{name}</Text>
          </Pressable>
        ))}
      </ScrollView>
      <View style={styles.resultsHead}>
        <Text style={styles.count}>Знайдено ідей: {list.length}</Text>
        <Pressable onPress={surprise}><Text style={styles.surprise}>Обрати за мене ✳</Text></Pressable>
      </View>

      <View style={styles.grid}>
        {list.map((recipe) => {
          const saved = state.savedRecipes.includes(recipe.id);
          return (
            <View key={recipe.id} style={styles.card}>
              <Pressable onPress={() => router.push(`/recipe/${recipe.id}`)}>
                <Image resizeMode="cover" source={{ uri: `/art/dishes/${recipe.id}.png` }} style={styles.art} />
                <View style={styles.cardBody}>
                  <Text style={styles.cardCat}>{recipe.categoryLabel.toUpperCase()}</Text>
                  <Text style={styles.cardTitle}>{recipe.title}</Text>
                  <Text style={styles.kcal}>≈ {Math.round(recipe.kcal / 10) * 10}<Text style={styles.kcalUnit}> ккал / порція</Text></Text>
                  <Text style={styles.meta}>◷ {recipe.minutes} хв   {recipe.items.length} інгредієнтів</Text>
                </View>
              </Pressable>
              <Pressable style={[styles.heart, saved && styles.heartOn]} onPress={() => toggleRecipe(recipe.id)}>
                <Text style={styles.heartMark}>{saved ? "♥" : "♡"}</Text>
              </Pressable>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 18, paddingBottom: 120 },
  kicker: { color: theme.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  dot: { color: theme.blue },
  pageTitle: { fontSize: 33, fontWeight: "800", letterSpacing: -1.4, color: theme.ink, marginTop: 8, marginBottom: 12, lineHeight: 36 },
  shop: { alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16 },
  shopText: { fontWeight: "800", color: theme.ink, fontSize: 15 },
  shopCount: { backgroundColor: theme.blue, color: "#fff", overflow: "hidden", borderRadius: 8, minWidth: 24, textAlign: "center", fontWeight: "800", paddingHorizontal: 6, paddingVertical: 2 },
  hero: { backgroundColor: "#112A26", borderRadius: 29, minHeight: 430, padding: 26, overflow: "hidden" },
  heroCap: { color: "#CFE2D6", fontSize: 11, fontWeight: "700", letterSpacing: 0.8 },
  heroTitle: { color: "#FFF9EE", fontSize: 40, fontWeight: "800", letterSpacing: -1.6, marginTop: 16, lineHeight: 42, maxWidth: 280 },
  em: { color: theme.lime, fontStyle: "italic", fontWeight: "500" },
  heroText: { color: "#C3D8CA", marginTop: 12, maxWidth: 250, lineHeight: 20, fontSize: 14 },
  white: { alignSelf: "flex-start", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 16, zIndex: 3 },
  whiteText: { fontWeight: "800", color: theme.ink, fontSize: 14 },
  plate: { position: "absolute", width: 230, height: 230, borderRadius: 115, right: -50, bottom: -65, borderWidth: 7, borderColor: "#FFFFFF22", overflow: "hidden", transform: [{ rotate: "9deg" }] },
  plateImage: { width: "100%", height: "100%" },
  numberWrap: { position: "absolute", right: 18, bottom: 58, transform: [{ rotate: "7deg" }], zIndex: 3 },
  number: { color: theme.lime, fontSize: 57, fontWeight: "800", letterSpacing: -3, textShadowColor: "#12342C", textShadowRadius: 8 },
  numberSub: { color: theme.lime, fontSize: 12, fontWeight: "500", lineHeight: 15, marginTop: -4 },
  tabs: { gap: 8, paddingVertical: 18 },
  tab: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 30, paddingHorizontal: 16, paddingVertical: 10 },
  tabOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  tabText: { fontWeight: "700", color: theme.ink, fontSize: 14 },
  tabTextOn: { color: "#fff" },
  filters: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 14, paddingHorizontal: 15, paddingVertical: 17, flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10 },
  filtersTitle: { fontWeight: "800", color: theme.ink, fontSize: 15 },
  filtersHint: { color: theme.muted, fontSize: 12, flexShrink: 1, textAlign: "right" },
  filterBox: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 18, padding: 16, marginTop: 8 },
  filterHead: { fontSize: 20, fontWeight: "800", color: theme.ink, marginBottom: 8 },
  filterLabel: { marginTop: 10, fontWeight: "800", color: theme.ink },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  mini: { backgroundColor: "#E9ECE3", borderRadius: 20, paddingHorizontal: 10, paddingVertical: 8 },
  miniOn: { backgroundColor: theme.ink },
  miniText: { fontWeight: "700", color: theme.ink, fontSize: 12 },
  miniTextOn: { color: "#fff" },
  check: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 8 },
  box: { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, borderColor: "#C9CFC2", alignItems: "center", justifyContent: "center" },
  boxOn: { backgroundColor: theme.blue, borderColor: theme.blue },
  tick: { color: "#fff", fontSize: 12, fontWeight: "800" },
  checkText: { color: theme.ink, fontSize: 15 },
  search: { marginTop: 14, backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 15, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  searchInput: { flex: 1, paddingVertical: 14, fontSize: 16, color: theme.ink },
  chips: { gap: 8, paddingVertical: 12 },
  chip: { backgroundColor: "#E9ECE3", borderRadius: 30, paddingHorizontal: 12, paddingVertical: 9 },
  chipOn: { backgroundColor: theme.blue },
  chipText: { fontWeight: "700", color: theme.ink, fontSize: 13 },
  chipTextOn: { color: "#fff" },
  resultsHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  count: { color: theme.muted, fontSize: 13 },
  surprise: { color: theme.blue, fontWeight: "800", fontSize: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 12 },
  card: { width: "48.5%", backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 18, overflow: "hidden" },
  art: { width: "100%", height: 168, backgroundColor: "#F0E7DA" },
  heart: { position: "absolute", top: 10, right: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: "#FFFFFFF0", alignItems: "center", justifyContent: "center" },
  heartOn: { backgroundColor: theme.lime },
  heartMark: { fontSize: 20, color: "#293D2E" },
  cardBody: { padding: 12 },
  cardCat: { color: "#91806C", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  cardTitle: { fontWeight: "800", color: theme.ink, fontSize: 17, lineHeight: 21, marginTop: 6, minHeight: 44 },
  kcal: { color: "#6552BB", fontWeight: "800", fontSize: 22, marginTop: 8 },
  kcalUnit: { fontSize: 12, fontWeight: "600" },
  meta: { color: theme.muted, marginTop: 6, fontSize: 12 },
});
