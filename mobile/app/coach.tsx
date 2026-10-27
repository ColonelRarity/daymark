import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { DateControl, PageTop, SpaceScreen } from "@/src/components/Shell";
import { hoursText, num, shiftISO, sleepHours } from "@/src/format";
import { useStore } from "@/src/store";
import { theme } from "@/src/theme";

export default function CoachScreen() {
  const { day, totals, state } = useStore();
  const [period, setPeriod] = useState<"day" | "week">("day");
  const week = Array.from({ length: 7 }, (_, index) => state.days[shiftISO(state.selectedDate, index - 6)]).filter(Boolean);
  const weekKcal = week.reduce((sum, item) => sum + item.meals.reduce((mealSum, meal) => mealSum + (meal.kcal ?? 0), 0), 0);
  const sleep = sleepHours(day.bed, day.wake);

  return (
    <SpaceScreen>
      <PageTop eyebrow="СОН + ЇЖА + РУХ" title="Помічник твого ритму." action={<DateControl />} />
      <View style={styles.toolbar}>
        <View style={styles.segment}>
          <Pressable onPress={() => setPeriod("day")} style={[styles.seg, period === "day" && styles.segOn]}><Text style={[styles.segText, period === "day" && styles.segTextOn]}>День</Text></Pressable>
          <Pressable onPress={() => setPeriod("week")} style={[styles.seg, period === "week" && styles.segOn]}><Text style={[styles.segText, period === "week" && styles.segTextOn]}>7 днів</Text></Pressable>
        </View>
      </View>
      <View style={styles.intro}>
        <Text style={styles.introMark}>✦</Text>
        <View style={{ flex: 1 }}>
          <Text style={styles.introTitle}>Твої дані → зрозумілий наступний крок</Text>
          <Text style={styles.introText}>Автоаналіз за прозорими правилами. Живий AI-чат ще не підключено. Підказки оновлюються після внесення записів.</Text>
        </View>
      </View>
      {period === "day" ? (
        <View style={styles.card}>
          <Text style={styles.symbol}>✦</Text>
          <Text style={styles.cardTitle}>Помічник підлаштовується під тебе</Text>
          <Text style={styles.line}>{num(totals.kcal)} ккал внесено</Text>
          <Text style={styles.line}>{num(day.steps)} кроків</Text>
          <Text style={styles.line}>{sleep ? hoursText(sleep) : "Сон ще не внесено"}</Text>
          <Text style={styles.line}>{state.goalTitle}</Text>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>7 днів</Text>
          <Text style={styles.line}>{num(weekKcal)} ккал за тиждень</Text>
          <Text style={styles.line}>{week.length} днів із записами руху або сну</Text>
        </View>
      )}
    </SpaceScreen>
  );
}

const styles = StyleSheet.create({
  toolbar: { flexDirection: "row", marginBottom: 14 },
  segment: { flexDirection: "row", backgroundColor: theme.white, borderRadius: 12, borderWidth: 1, borderColor: theme.line, padding: 3 },
  seg: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  segOn: { backgroundColor: theme.ink },
  segText: { fontWeight: "700", color: theme.ink },
  segTextOn: { color: "#fff" },
  intro: { flexDirection: "row", gap: 12, backgroundColor: "#F4F1FF", borderRadius: 20, padding: 16, marginBottom: 12 },
  introMark: { color: theme.blue, fontSize: 22 },
  introTitle: { fontWeight: "800", color: "#6D537F" },
  introText: { color: "#81708E", marginTop: 6, lineHeight: 18 },
  card: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 22, padding: 18, gap: 6 },
  symbol: { color: theme.blue, fontSize: 20 },
  cardTitle: { fontSize: 22, fontWeight: "800", color: theme.ink },
  line: { fontSize: 16, color: theme.ink },
});
