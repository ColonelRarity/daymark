import { router, type Href } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/src/theme";
import { useStore } from "@/src/store";

export function AppHeader() {
  return (
    <View style={styles.header}>
      <Text style={styles.brand}>
        daymark<Text style={styles.dot}>.</Text>
      </Text>
      <View style={styles.actions}>
        <Pressable accessibilityRole="button" accessibilityLabel="Помічник дня" onPress={() => router.push("/coach")} style={styles.notice}>
          <Text style={styles.noticeMark}>✦</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>1</Text>
          </View>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Мій профіль" onPress={() => router.push("/profile")} style={styles.avatar}>
          <Text style={styles.avatarText}>Я</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Усі простори" onPress={() => router.push("/spaces")} style={styles.grid}>
          <View style={styles.gridDots}>
            <View style={styles.dotSquare} />
            <View style={styles.dotSquare} />
            <View style={styles.dotSquare} />
            <View style={styles.dotSquare} />
          </View>
        </Pressable>
      </View>
    </View>
  );
}

export function DemoBanner() {
  const { state } = useStore();
  if (!state.demo) return null;
  return (
    <View style={styles.banner}>
      <Text style={styles.bannerText}>Демо · приклад твого дня.</Text>
      <Pressable accessibilityRole="button" onPress={() => router.push("/onboard")}>
        <Text style={styles.bannerLink}>Почати свою ціль ↗</Text>
      </Pressable>
    </View>
  );
}

export function BackBar({ title }: { title: string }) {
  return (
    <View style={styles.backBar}>
      <Pressable accessibilityRole="button" accessibilityLabel="Назад" onPress={() => router.back()} style={styles.backButton}>
        <Text style={styles.backChevron}>‹</Text>
      </Pressable>
      <Text style={styles.backTitle}>{title}</Text>
    </View>
  );
}

export function openPath(path: Href) {
  router.push(path);
}

const styles = StyleSheet.create({
  header: {
    height: 64,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: theme.bg,
  },
  brand: { fontSize: 27, fontWeight: "800", letterSpacing: -1.4, color: theme.ink },
  dot: { color: theme.blue },
  actions: { flexDirection: "row", alignItems: "center", gap: 9 },
  notice: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.line },
  noticeMark: { color: theme.blue, fontSize: 16, fontWeight: "700" },
  badge: { position: "absolute", top: -2, right: -2, minWidth: 16, height: 16, borderRadius: 8, backgroundColor: theme.lime, alignItems: "center", justifyContent: "center" },
  badgeText: { fontSize: 10, fontWeight: "800", color: theme.ink },
  avatar: { width: 35, height: 35, borderRadius: 18, backgroundColor: theme.lavender, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#6757B6", fontWeight: "700", fontSize: 13 },
  grid: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.line },
  gridDots: { width: 14, height: 14, flexDirection: "row", flexWrap: "wrap", gap: 2 },
  dotSquare: { width: 6, height: 6, borderRadius: 1.5, backgroundColor: theme.ink },
  banner: {
    marginHorizontal: 18,
    marginBottom: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: theme.banner,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  bannerText: { color: "#3E4E8D", fontSize: 12, fontWeight: "600", flex: 1 },
  bannerLink: { color: theme.blue, fontSize: 12, fontWeight: "700" },
  backBar: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, backgroundColor: theme.bg },
  backButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: theme.white, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: theme.line },
  backChevron: { fontSize: 28, lineHeight: 30, color: theme.ink, marginTop: -2 },
  backTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.6, color: theme.ink, flex: 1 },
});
