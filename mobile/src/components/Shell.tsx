import { router, type Href } from "expo-router";
import { type ReactNode } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { AppHeader, DemoBanner } from "@/src/components/Chrome";
import { Glyph } from "@/src/components/Marks";
import { shortDay, shiftISO, todayISO } from "@/src/format";
import { useStore } from "@/src/store";
import { theme } from "@/src/theme";

const HREFS = {
  index: "/",
  journey: "/journey",
  photo: "/photo",
  recipes: "/recipes",
  diary: "/diary",
} as const;

export function BottomNav({ active }: { active?: keyof typeof HREFS }) {
  const items = [
    ["index", "Сьогодні", "today"],
    ["journey", "Мій шлях", "journey"],
    ["photo", "Сфоткай", "camera"],
    ["recipes", "Ідеї їжі", "recipes"],
    ["diary", "Щоденник", "food"],
  ] as const;

  return (
    <View style={styles.bar}>
      {items.map(([id, label, icon]) => {
        const on = active === id;
        if (id === "photo") {
          return (
            <Pressable key={id} accessibilityRole="button" accessibilityLabel="Сфоткай" onPress={() => router.push(HREFS.photo)} style={styles.cameraWrap}>
              <View style={styles.camera}>
                <Glyph name="camera" size={26} color="#FFFFFF" />
              </View>
              <Text style={styles.cameraLabel}>{label}</Text>
            </Pressable>
          );
        }
        return (
          <Pressable key={id} accessibilityRole="button" onPress={() => router.push(HREFS[id] as Href)} style={[styles.item, on && styles.itemOn]}>
            <Glyph name={icon} size={23} color={on ? theme.blue : "#8B9087"} />
            <Text style={[styles.label, on && styles.labelOn]}>{label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function SpaceScreen({ children, active }: { children: ReactNode; active?: keyof typeof HREFS }) {
  return (
    <View style={styles.frame}>
      <AppHeader />
      <DemoBanner />
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {children}
      </ScrollView>
      <BottomNav active={active} />
    </View>
  );
}

export function PageTop({ eyebrow, title, action }: { eyebrow: string; title: string; action?: ReactNode }) {
  return (
    <View style={styles.pageTop}>
      <View style={{ flex: 1 }}>
        <Text style={styles.eyebrow}><Text style={styles.dot}>● </Text>{eyebrow}</Text>
        <Text style={styles.h1}>{title}</Text>
      </View>
      {action}
    </View>
  );
}

export function DateControl() {
  const { state, setDate } = useStore();
  const today = todayISO();
  return (
    <View style={styles.date}>
      <Pressable accessibilityLabel="Попередній день" onPress={() => setDate(shiftISO(state.selectedDate, -1))}>
        <Text style={styles.chevron}>‹</Text>
      </Pressable>
      <Text style={styles.dateText}>{shortDay(state.selectedDate)}</Text>
      <Pressable accessibilityLabel="Наступний день" disabled={state.selectedDate >= today} onPress={() => setDate(shiftISO(state.selectedDate, 1))}>
        <Text style={[styles.chevron, state.selectedDate >= today && { opacity: 0.35 }]}>›</Text>
      </Pressable>
    </View>
  );
}

export function CoachTeaser() {
  return (
    <Pressable style={styles.coach} onPress={() => router.push("/coach")}>
      <View style={styles.orb}><Text style={styles.orbMark}>✦</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={styles.coachSmall}>ПОМІЧНИК ДНЯ · АВТООНОВЛЕННЯ</Text>
        <Text style={styles.coachStrong}>Помічник підлаштовується під тебе</Text>
        <Text style={styles.coachEm}>Сон, харчування, рух і твій прогрес</Text>
      </View>
      <Text style={styles.arrow}>↗</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  frame: { flex: 1, backgroundColor: theme.bg },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 18, paddingBottom: 88 },
  bar: { height: 82, borderTopWidth: 1, borderTopColor: "#E9ECDF", backgroundColor: "#FFFFFFF2", flexDirection: "row", alignItems: "flex-end", justifyContent: "space-around", paddingBottom: 8, paddingHorizontal: 8 },
  item: { width: 66, minHeight: 56, alignItems: "center", justifyContent: "center", gap: 5, borderRadius: 17, paddingVertical: 8 },
  itemOn: { backgroundColor: "#EEEDFF" },
  cameraWrap: { width: 72, alignItems: "center", marginTop: -25, backgroundColor: "transparent" },
  camera: { width: 62, height: 56, borderRadius: 20, backgroundColor: theme.blue, alignItems: "center", justifyContent: "center", transform: [{ rotate: "-5deg" }], borderWidth: 5, borderColor: theme.bg },
  cameraLabel: { marginTop: 4, fontSize: 10, fontWeight: "700", color: theme.blue },
  label: { fontSize: 10, fontWeight: "700", color: "#8B9087", lineHeight: 13 },
  labelOn: { color: theme.blue },
  pageTop: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between", gap: 10, marginBottom: 16 },
  eyebrow: { color: theme.muted, fontSize: 12, fontWeight: "700", letterSpacing: 1.1 },
  dot: { color: theme.blue },
  h1: { color: theme.ink, fontSize: 28, lineHeight: 32, fontWeight: "800", letterSpacing: -1.1, marginTop: 6 },
  date: { flexDirection: "row", alignItems: "center", backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 6 },
  chevron: { fontSize: 20, color: theme.ink, paddingHorizontal: 4 },
  dateText: { fontSize: 12, fontWeight: "700", color: theme.ink },
  coach: { flexDirection: "row", alignItems: "center", gap: 12, padding: 15, marginBottom: 16, borderWidth: 1, borderColor: "#DDD2F2", backgroundColor: "#F1EAFF", borderRadius: 23 },
  orb: { width: 43, height: 48, borderRadius: 15, backgroundColor: "#7854BB", alignItems: "center", justifyContent: "center", transform: [{ rotate: "-7deg" }] },
  orbMark: { color: "#E4FF9B", fontSize: 26 },
  coachSmall: { color: "#6D51B3", fontSize: 11, fontWeight: "700", letterSpacing: 0.4 },
  coachStrong: { color: theme.ink, fontSize: 16, fontWeight: "800", marginTop: 3 },
  coachEm: { color: "#746779", fontSize: 13, fontStyle: "italic", marginTop: 2 },
  arrow: { fontSize: 18, color: theme.ink },
});
