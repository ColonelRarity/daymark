import { router } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { DayCell } from "@/src/components/Marks";
import { dayLabel, daySpan, monthTitle, todayISO, weekdayMon0 } from "@/src/format";
import { useStore } from "@/src/store";
import { theme } from "@/src/theme";
import { PageTop } from "@/src/components/Shell";

export default function JourneyScreen() {
  const { state, setDate, mark } = useStore();
  const today = todayISO();
  const marks = Object.keys(state.checks).length;
  const total = daySpan(state.goalStart, state.goalEnd) + 1;
  const passed = Math.max(0, Math.min(total, daySpan(state.goalStart, today) + 1));
  const rhythm = passed ? Math.round((marks / passed) * 100) : 0;
  const ahead = Math.max(0, daySpan(today, state.goalEnd));
  const months = monthList(state.goalStart, state.goalEnd);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <PageTop
        eyebrow={`МІЙ ШЛЯХ / ${state.goalTitle.toUpperCase()}`}
        title="Кожен день — позначка."
        action={<Pressable style={styles.ghost} onPress={() => router.push("/profile")}><Text style={styles.ghostText}>Усі цілі ↗</Text></Pressable>}
      />
      <View style={styles.mode}>
        <Text style={styles.modeText}>Мій календар</Text>
        <Pressable onPress={() => router.push("/coach")}><Text style={styles.modeLink}>✦ Аналіз дня й тижня ↗</Text></Pressable>
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.metricLabel}>Днів для себе</Text><Text style={styles.metricValue}>{marks}</Text><Text style={styles.metricSub}>із {total} у твоєму шляху</Text></View>
        <View style={styles.metric}><Text style={styles.metricLabel}>Мій ритм</Text><Text style={styles.metricValue}>{rhythm}<Text style={styles.percent}>%</Text></Text><Text style={styles.metricSub}>із днів, що вже минули</Text></View>
        <View style={styles.metric}><Text style={styles.metricLabel}>До своєї дати</Text><Text style={styles.metricValue}>{ahead}</Text><Text style={styles.metricSub}>днів попереду</Text></View>
      </View>
      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <View style={{ flex: 1 }}>
            <Text style={styles.panelTitle}>{state.goalTitle}</Text>
            <Text style={styles.panelDates}>{dayLabel(state.goalStart)} — {dayLabel(state.goalEnd)}</Text>
          </View>
          <Pressable style={styles.share} onPress={() => router.push("/story")}><Text style={styles.shareText}>Поділитися ↗</Text></Pressable>
        </View>
        <View style={styles.track}><View style={[styles.fill, { width: `${Math.min(100, (marks / total) * 100)}%` }]} /></View>
        <View style={styles.key}>
          <Text style={styles.keyItem}>● День для себе</Text>
          <Text style={styles.keyItem}>● Мій мінімум</Text>
          <Text style={styles.keyItem}>○ Попереду</Text>
        </View>
      </View>
      {months.map((month) => (
        <View key={month} style={styles.panel}>
          <Text style={styles.month}>{monthTitle(month).replace(/^./, (letter) => letter.toUpperCase())} р.</Text>
          <MonthGrid
            month={month}
            checks={state.checks}
            today={today}
            onPress={(iso) => {
              if (iso > today || iso < state.goalStart) return;
              setDate(iso);
              mark(state.checks[iso] ? "clear" : "full");
            }}
          />
        </View>
      ))}
    </ScrollView>
  );
}

function monthList(start: string, end: string) {
  const months: string[] = [];
  let cursor = start.slice(0, 7);
  const last = end.slice(0, 7);
  while (cursor <= last && months.length < 8) {
    months.push(cursor);
    const [year, month] = cursor.split("-").map(Number);
    const next = new Date(Date.UTC(year, month, 1));
    cursor = next.toISOString().slice(0, 7);
  }
  return months;
}

function MonthGrid({ month, checks, today, onPress }: { month: string; checks: Record<string, "full" | "minimum" | undefined>; today: string; onPress: (iso: string) => void }) {
  const [year, monthNumber] = month.split("-").map(Number);
  const count = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const first = `${month}-01`;
  const lead = weekdayMon0(first);
  const cells: Array<string | null> = Array.from({ length: lead }, () => null);
  for (let day = 1; day <= count; day += 1) cells.push(`${month}-${String(day).padStart(2, "0")}`);
  return (
    <View style={styles.grid}>
      {["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Нд"].map((name) => <Text key={name} style={styles.week}>{name}</Text>)}
      {cells.map((iso, index) => (
        <DayCell
          key={iso ?? `e-${index}`}
          iso={iso}
          mark={iso ? checks[iso] : undefined}
          selected={false}
          future={iso ? iso > today : false}
          onPress={iso ? () => onPress(iso) : undefined}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { paddingHorizontal: 18, paddingBottom: 120, gap: 12 },
  ghost: { borderWidth: 1, borderColor: theme.line, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: theme.white },
  ghostText: { fontWeight: "700", fontSize: 12, color: theme.ink },
  mode: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  modeText: { fontWeight: "800", color: theme.ink },
  modeLink: { color: theme.blue, fontWeight: "700" },
  metrics: { flexDirection: "row", gap: 8 },
  metric: { flex: 1, backgroundColor: "#EDF0E6", borderRadius: 18, padding: 12, minHeight: 110 },
  metricLabel: { color: theme.muted, fontSize: 12 },
  metricValue: { fontSize: 28, fontWeight: "800", color: theme.ink, marginTop: 8, letterSpacing: -1 },
  percent: { fontSize: 16 },
  metricSub: { color: theme.muted, fontSize: 11, marginTop: 4 },
  panel: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 22, padding: 16 },
  panelHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  panelTitle: { fontSize: 22, fontWeight: "800", color: theme.ink },
  panelDates: { color: theme.muted, marginTop: 4 },
  share: { backgroundColor: theme.blue, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  shareText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  track: { height: 5, backgroundColor: "#E9ECE2", borderRadius: 10, marginTop: 16, overflow: "hidden" },
  fill: { height: 5, backgroundColor: theme.blue },
  key: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginTop: 12 },
  keyItem: { color: theme.muted, fontSize: 12 },
  month: { fontSize: 18, fontWeight: "800", color: theme.ink, textTransform: "capitalize", marginBottom: 10 },
  grid: { flexDirection: "row", flexWrap: "wrap" },
  week: { width: "14.28%", textAlign: "center", color: theme.muted, fontSize: 11, marginBottom: 4 },
  day: { width: "13.2%", marginHorizontal: "0.54%", aspectRatio: 1, borderRadius: 10, backgroundColor: "#F3F5EF", alignItems: "center", justifyContent: "center", marginBottom: 4 },
  empty: { width: "13.2%", marginHorizontal: "0.54%", aspectRatio: 1 },
  full: { backgroundColor: theme.lime },
  minimum: { backgroundColor: "#E7EBFF" },
  future: { backgroundColor: "transparent" },
  dayText: { fontSize: 13, fontWeight: "700", color: theme.ink },
  futureText: { color: "#B1B6AB" },
  strike: { position: "absolute", width: "68%", height: 2, backgroundColor: theme.ink, transform: [{ rotate: "-28deg" }] },
  strikeMin: { backgroundColor: theme.blue },
});
