import { router, useLocalSearchParams } from "expo-router";
import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { BackBar } from "@/src/components/Chrome";
import { CATALOG_FILTERS, RECIPE_COUNT, SOURCE_COUNT, catalogAmount, catalogNote, searchCatalog, type CatalogItem } from "@/src/nutrition/catalog";
import { useStore } from "@/src/store";
import { theme } from "@/src/theme";

const PAGE = 30;

export default function SearchScreen() {
  const { category: initial } = useLocalSearchParams<{ category?: string }>();
  const { state } = useStore();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState(initial === "drinks" ? "drink-all" : "all");
  const [page, setPage] = useState(PAGE);
  const results = useMemo(() => searchCatalog(state.customFoods, query, category), [state.customFoods, query, category]);
  const visible = results.slice(0, page);

  function pick(item: CatalogItem) {
    if (item.kind === "recipe") router.push(`/recipe/${item.id}`);
    else router.push(`/add?id=${item.id}`);
  }

  return (
    <View style={styles.screen}>
      <BackBar title="Мій щоденник" />
      <FlatList
        data={visible}
        keyExtractor={(item) => item.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View>
            <Text style={styles.kicker}>МІЙ ЩОДЕННИК / {SOURCE_COUNT.toLocaleString("uk-UA")} ПОЗИЦІЙ</Text>
            <Text style={styles.title}>Усе, що є{"\n"}у твоєму житті.</Text>
            <Text style={styles.sub}>{SOURCE_COUNT.toLocaleString("uk-UA")} позицій: продукти зі способом приготування, звичні страви і {RECIPE_COUNT} ідей. Калорійність на 100 г. Обери порцію в грамах.</Text>
            <Pressable style={styles.own} onPress={() => router.push("/product")}>
              <Text style={styles.ownText}>＋ Свій продукт</Text>
            </Pressable>
            <TextInput
              value={query}
              onChangeText={(value) => { setQuery(value); setPage(PAGE); }}
              placeholder="Шаурма, суші, піца, сир, McDonald’s…"
              placeholderTextColor={theme.muted}
              style={styles.input}
              autoFocus
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
              {CATALOG_FILTERS.map(([id, name]) => (
                <Pressable key={id} onPress={() => { setCategory(id); setPage(PAGE); }} style={[styles.chip, category === id && styles.chipOn]}>
                  <Text style={[styles.chipText, category === id && styles.chipTextOn]}>{name}</Text>
                </Pressable>
              ))}
            </ScrollView>
            <Text style={styles.count}>Знайдено: {results.length} · показано {visible.length}</Text>
          </View>
        }
        ListEmptyComponent={<Text style={styles.empty}>Такої позиції поки немає.{"\n"}Можна внести свій продукт.</Text>}
        ListFooterComponent={results.length > visible.length ? (
          <Pressable style={styles.more} onPress={() => setPage((value) => value + PAGE)}>
            <Text style={styles.moreText}>Показати ще {PAGE}</Text>
          </Pressable>
        ) : undefined}
        renderItem={({ item }) => (
          <Pressable style={styles.row} onPress={() => pick(item)}>
            <View style={styles.mark}><Text style={styles.emoji}>{item.emoji}</Text></View>
            <View style={styles.copy}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.meta}>{catalogNote(item)}</Text>
              <Text style={styles.kcal}>{catalogAmount(item)}</Text>
            </View>
            <Text style={styles.plus}>＋</Text>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  list: { paddingHorizontal: 18, paddingBottom: 40 },
  kicker: { color: theme.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -1.2, color: theme.ink, marginTop: 8, lineHeight: 36 },
  sub: { color: theme.muted, marginTop: 8, lineHeight: 20 },
  own: { alignSelf: "flex-start", marginTop: 14, backgroundColor: "#EAF3D8", borderRadius: 15, paddingHorizontal: 14, paddingVertical: 13 },
  ownText: { color: "#4E6840", fontWeight: "800" },
  input: { marginTop: 14, backgroundColor: theme.white, borderRadius: 15, borderWidth: 1, borderColor: theme.line, paddingHorizontal: 14, paddingVertical: 14, fontSize: 16, color: theme.ink },
  filters: { gap: 8, paddingVertical: 12 },
  chip: { backgroundColor: "#E9ECE3", borderRadius: 30, paddingHorizontal: 12, paddingVertical: 9 },
  chipOn: { backgroundColor: theme.ink },
  chipText: { fontWeight: "700", color: theme.ink, fontSize: 13 },
  chipTextOn: { color: "#fff" },
  count: { color: theme.muted, fontSize: 13, marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", gap: 11, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#EEEEE5" },
  mark: { width: 42, height: 42, borderRadius: 13, backgroundColor: "#F3F1E9", alignItems: "center", justifyContent: "center" },
  emoji: { fontSize: 20 },
  copy: { flex: 1 },
  name: { fontWeight: "800", color: theme.ink, fontSize: 15 },
  meta: { color: theme.muted, fontSize: 12, marginTop: 2 },
  kcal: { color: theme.ink, fontSize: 12, marginTop: 2 },
  plus: { fontSize: 22, fontWeight: "700", color: theme.blue },
  empty: { color: theme.muted, textAlign: "center", padding: 24, lineHeight: 22 },
  more: { marginTop: 12, borderWidth: 1, borderColor: theme.line, borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center", backgroundColor: theme.white },
  moreText: { fontWeight: "800", color: theme.ink },
});
