import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import recipes from "@/src/data/recipes.json";
import { useStore } from "@/src/store";
import { theme } from "@/src/theme";

const SERVINGS = [0.5, 1, 1.5, 2, 3, 4, 6, 10];

export default function RecipeScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const recipe = recipes.find((item) => item.id === id);
  const { state, toggleRecipe, addToCart, addMeal } = useStore();
  const [servings, setServings] = useState(1);
  const [openServings, setOpenServings] = useState(false);
  const [added, setAdded] = useState(false);
  if (!recipe || id === "cart") {
    return <CartScreen />;
  }
  const saved = state.savedRecipes.includes(recipe.id);
  const kcal = Math.round((recipe.kcal * servings) / 10) * 10;
  const scale = (value: number) => Math.round(value * servings);

  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <Text style={styles.kicker}>ІДЕЇ ДЛЯ ЇЖІ / {recipe.categoryLabel.toUpperCase()}</Text>
        <Pressable accessibilityLabel="Закрити" onPress={() => router.back()} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.art}>
          <Image resizeMode="cover" source={{ uri: `/art/dishes/${recipe.id}.png` }} style={styles.artImage} />
        </View>
        <Text style={styles.category}>{recipe.categoryLabel.toUpperCase()} · {recipe.minutes} ХВ ПІДГОТОВКИ ТА ПРИГОТУВАННЯ</Text>
        <Text style={styles.title}>{recipe.title}</Text>
        <View style={styles.nutrition}>
          <View>
            <Text style={styles.kcal}>≈ {kcal}</Text>
            <Text style={styles.kcalSub}>ккал · {servings} порц.</Text>
          </View>
          <Text style={styles.macros}>Б {scale(recipe.p)} г · Ж {scale(recipe.f)} г · В {scale(recipe.c)} г</Text>
        </View>
        <View style={styles.tools}>
          <View>
            <Text style={styles.label}>Порцій</Text>
            <Pressable style={styles.select} onPress={() => setOpenServings((value) => !value)}>
              <Text style={styles.selectText}>{servings}</Text>
              <Text>▾</Text>
            </Pressable>
            {openServings ? (
              <View style={styles.menu}>
                {SERVINGS.map((value) => (
                  <Pressable key={value} onPress={() => { setServings(value); setOpenServings(false); }}>
                    <Text style={styles.menuItem}>{value}</Text>
                  </Pressable>
                ))}
              </View>
            ) : null}
          </View>
          <Pressable style={styles.save} onPress={() => toggleRecipe(recipe.id)}>
            <Text style={styles.saveText}>{saved ? "♥ Збережено" : "♡ Зберегти"}</Text>
          </Pressable>
        </View>
        <View style={styles.box}>
          <Text style={styles.boxTitle}>Що потрібно</Text>
          <Text style={styles.note}>Вага до приготування. Квасоля й нут — готові, консерви — без рідини.</Text>
          {recipe.items.map((item) => (
            <View key={item.name} style={styles.ing}>
              <Text style={styles.ingName}>{item.name}</Text>
              <Text style={styles.ingQty}>{formatQty(item.qty * servings)} {item.unit}</Text>
            </View>
          ))}
        </View>
        <Text style={styles.method}>Готуємо без метушні</Text>
        {recipe.steps.map((step, index) => (
          <Text key={step} style={styles.step}>{index + 1}. {step}.</Text>
        ))}
        <Pressable
          style={styles.primary}
          onPress={() => {
            addToCart({ id: recipe.id, title: recipe.title, servings });
            setAdded(true);
          }}>
          <Text style={styles.primaryText}>{added ? "Інгредієнти додано" : "До списку покупок"}</Text>
        </Pressable>
        {added ? (
          <Pressable onPress={() => router.push("/recipe/cart")}>
            <Text style={styles.addedLink}>Відкрити список покупок ↗</Text>
          </Pressable>
        ) : null}
        <Pressable
          style={styles.secondary}
          onPress={() => {
            addMeal({
              name: recipe.title,
              grams: servings,
              kcal,
              p: scale(recipe.p),
              f: scale(recipe.f),
              c: scale(recipe.c),
              slot: recipe.category === "snack" || recipe.category === "dessert" ? "snack" : recipe.category === "breakfast" ? "breakfast" : recipe.category === "lunch" ? "lunch" : "dinner",
              emoji: "◌",
            });
            router.push("/diary");
          }}>
          <Text style={styles.secondaryText}>＋ Додати страву до щоденника</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function CartScreen() {
  const { state, removeFromCart, toggleBought } = useStore();
  const groups = new Map<string, { name: string; qty: number; unit: string }[]>();
  for (const line of state.cart) {
    const recipe = recipes.find((item) => item.id === line.id);
    if (!recipe) continue;
    for (const item of recipe.items) {
      const aisle = item.aisle || "Інше";
      const bucket = groups.get(aisle) ?? [];
      const existing = bucket.find((entry) => entry.name === item.name && entry.unit === item.unit);
      const qty = item.qty * line.servings;
      if (existing) existing.qty += qty;
      else bucket.push({ name: item.name, qty, unit: item.unit });
      groups.set(aisle, bucket);
    }
  }
  return (
    <View style={styles.screen}>
      <View style={styles.top}>
        <Text style={styles.kicker}>МІЙ СПИСОК / {state.cart.length} СТРАВ</Text>
        <Pressable onPress={() => router.back()} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
      </View>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Менше згадувати.{"\n"}Більше смакувати.</Text>
        <Text style={styles.note}>Інгредієнти об’єднані для вибраних страв. Відзначай те, що вже є або куплено.</Text>
        {state.cart.length === 0 ? <Text style={styles.empty}>Відкрий будь-яку страву й натисни «До списку покупок».</Text> : null}
        {state.cart.map((line, index) => (
          <View key={`${line.id}-${index}`} style={styles.cartLine}>
            <Text style={styles.ingName}>{line.title}</Text>
            <Text style={styles.ingQty}>{line.servings} порц.</Text>
            <Pressable onPress={() => removeFromCart(index)}><Text style={styles.remove}>×</Text></Pressable>
          </View>
        ))}
        {[...groups.entries()].map(([aisle, items]) => (
          <View key={aisle}>
            <Text style={styles.method}>{aisle}</Text>
            {items.map((item) => {
              const key = `${item.name}|${item.unit}`;
              const bought = state.bought.includes(key);
              return (
                <Pressable key={item.name} style={styles.ing} onPress={() => toggleBought(key)}>
                  <View style={[styles.check, bought && styles.checkOn]}>{bought ? <Text style={styles.checkMark}>✓</Text> : null}</View>
                  <Text style={[styles.ingName, bought && styles.struck]}>{item.name}</Text>
                  <Text style={[styles.ingQty, bought && styles.struck]}>{formatQty(item.qty)} {item.unit}</Text>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

function formatQty(value: number) {
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : String(rounded).replace(".", ",");
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  top: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 16 },
  kicker: { color: theme.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#E8ECE2", alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 24, color: theme.ink, marginTop: -2 },
  content: { padding: 18, paddingBottom: 40, gap: 8 },
  art: { width: "100%", aspectRatio: 1, borderRadius: 22, backgroundColor: "#F0E7DA", overflow: "hidden" },
  artImage: { width: "100%", height: "100%" },
  category: { color: "#91806C", fontSize: 12, fontWeight: "700", letterSpacing: 0.6, marginTop: 12 },
  title: { fontSize: 30, fontWeight: "800", letterSpacing: -1, color: theme.ink, marginTop: 6 },
  nutrition: { marginTop: 12, backgroundColor: "#E5F7BB", borderRadius: 21, padding: 18, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  kcal: { fontSize: 33, fontWeight: "800", letterSpacing: -1, color: theme.ink },
  kcalSub: { color: theme.ink, fontSize: 13 },
  macros: { color: theme.ink, fontSize: 14, textAlign: "right" },
  tools: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end", marginTop: 8 },
  label: { fontWeight: "700", color: theme.ink, marginBottom: 6 },
  select: { flexDirection: "row", alignItems: "center", gap: 16, backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10 },
  selectText: { fontWeight: "800", fontSize: 16 },
  menu: { backgroundColor: theme.white, borderRadius: 12, marginTop: 4, borderWidth: 1, borderColor: theme.line },
  menuItem: { padding: 8, fontWeight: "700" },
  save: { borderWidth: 1, borderColor: theme.line, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, backgroundColor: theme.white },
  saveText: { fontWeight: "700" },
  box: { marginTop: 12, backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 18, padding: 16 },
  boxTitle: { fontSize: 19, fontWeight: "800", color: theme.ink },
  note: { color: theme.muted, marginTop: 6, marginBottom: 8, lineHeight: 18 },
  ing: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#EEF0E8" },
  check: { width: 22, height: 22, borderRadius: 6, borderWidth: 1.5, borderColor: "#C9CFC2", alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: theme.blue, borderColor: theme.blue },
  checkMark: { color: "#fff", fontSize: 13, fontWeight: "800" },
  struck: { textDecorationLine: "line-through", color: theme.muted },
  ingName: { flex: 1, color: theme.ink, fontSize: 15 },
  ingQty: { fontWeight: "700", color: theme.ink },
  method: { fontSize: 20, fontWeight: "800", marginTop: 16, color: theme.ink },
  step: { color: theme.ink, fontSize: 15, lineHeight: 22, marginTop: 8 },
  primary: { marginTop: 16, backgroundColor: theme.blue, borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontWeight: "800" },
  secondary: { marginTop: 8, borderWidth: 1, borderColor: theme.line, borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: theme.white },
  secondaryText: { fontWeight: "800", color: theme.ink },
  addedLink: { textAlign: "center", color: theme.blue, fontWeight: "800", marginTop: 8 },
  empty: { color: theme.muted, textAlign: "center", padding: 24 },
  cartLine: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 8 },
  remove: { fontSize: 22, color: theme.muted, paddingHorizontal: 8 },
});
