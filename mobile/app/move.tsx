import { useMemo, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { SpaceScreen, DateControl, PageTop } from "@/src/components/Shell";
import activities from "@/src/data/activities.json";
import { num, shiftISO, shortDay, weekdayShort } from "@/src/format";
import { useStore } from "@/src/store";
import { theme } from "@/src/theme";

export default function MoveScreen() {
  const { day, state, setSteps, addWorkout, removeWorkout, toggleHabit } = useStore();
  const [stepsText, setStepsText] = useState("");
  const [minutes, setMinutes] = useState("30");
  const [query, setQuery] = useState("");
  const [openSteps, setOpenSteps] = useState(false);
  const [openList, setOpenList] = useState(false);
  const minutesTotal = day.workouts.reduce((sum, item) => sum + item.minutes, 0);
  const list = useMemo(() => activities.filter((item) => item.name.toLowerCase().includes(query.trim().toLowerCase())).slice(0, 12), [query]);
  const week = Array.from({ length: 7 }, (_, index) => shiftISO(state.selectedDate, index - 6));

  return (
    <SpaceScreen>
      <PageTop eyebrow={`ПРОСТІР РУХУ / ${shortDay(state.selectedDate).toUpperCase()}`} title="Рух у твоєму темпі." action={<DateControl />} />
      <View style={styles.hero}>
        <Text style={styles.heroKicker}>МОЇ КРОКИ СЬОГОДНІ</Text>
        <Text style={styles.heroValue}>{num(day.steps)}</Text>
        <Text style={styles.heroSub}>{state.stepsTarget ? `Мій орієнтир — ${num(state.stepsTarget)}` : "Власний темп без обов’язкової норми"}</Text>
        <Text style={styles.arrow}>↗</Text>
        <Pressable style={styles.heroButton} onPress={() => setOpenSteps((value) => !value)}>
          <Text style={styles.heroButtonText}>＋ Внести кроки</Text>
        </Pressable>
        {openSteps ? (
          <View style={styles.inline}>
            <TextInput value={stepsText} onChangeText={setStepsText} keyboardType="number-pad" placeholder={String(day.steps)} placeholderTextColor="#5C6B3A" style={styles.inlineInput} />
            <Pressable onPress={() => { setSteps(Number(stepsText) || 0); setOpenSteps(false); }}><Text style={styles.inlineSave}>Зберегти</Text></Pressable>
          </View>
        ) : null}
      </View>
      <View style={styles.panel}>
        <View style={styles.panelHead}><Text style={styles.panelTitle}>Мій рух за тиждень</Text><Text style={styles.chip}>кроки</Text></View>
        <View style={styles.history}>
          {week.map((iso) => {
            const steps = state.days[iso]?.steps ?? 0;
            return (
              <View key={iso} style={styles.barWrap}>
                <Text style={styles.barValue}>{steps ? num(steps) : "—"}</Text>
                <View style={[styles.bar, { height: Math.max(4, Math.min(105, (steps / 10000) * 105)) }]} />
                <Text style={styles.barLabel}>{weekdayShort(iso)}</Text>
              </View>
            );
          })}
        </View>
      </View>
      <View style={styles.metrics}>
        <View style={styles.metric}><Text style={styles.metricLabel}>Тренувань</Text><Text style={styles.metricValue}>{day.workouts.length}</Text><Text style={styles.metricSub}>за обраний день</Text></View>
        <View style={styles.metric}><Text style={styles.metricLabel}>Час у русі</Text><Text style={styles.metricValue}>{minutesTotal}</Text><Text style={styles.metricSub}>хвилин внесено</Text></View>
        <View style={styles.metric}><Text style={styles.metricLabel}>Мої пристрої</Text><Text style={styles.metricValue}>⌚</Text><Text style={styles.metricSub}>Apple Health / Health Connect ↗</Text></View>
      </View>
      <View style={styles.panel}>
        <View style={styles.panelHead}>
          <Text style={styles.panelTitle}>Мої активності</Text>
          <Pressable onPress={() => setOpenList((value) => !value)}><Text style={styles.link}>＋ Додати</Text></Pressable>
        </View>
        {openList ? (
          <View style={{ gap: 8, marginBottom: 8 }}>
            <TextInput value={minutes} onChangeText={setMinutes} keyboardType="number-pad" style={styles.field} />
            <TextInput value={query} onChangeText={setQuery} placeholder="Прогулянка, зал, танці" placeholderTextColor={theme.muted} style={styles.field} />
            {list.map((activity) => (
              <Pressable key={activity.id} onPress={() => {
                const duration = Number(minutes) || 0;
                if (!duration) return;
                const kcal = state.weight ? Math.round((activity.met * 3.5 * state.weight * duration) / 200) : null;
                addWorkout({ name: activity.name, minutes: duration, kcal });
                setOpenList(false);
              }}>
                <Text style={styles.activity}>{activity.name}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        {day.workouts.length === 0 ? <Text style={styles.empty}>Прогулянка, зал, танці або домашній рух.{"\n"}Додай свою активність.</Text> : day.workouts.map((workout) => (
          <View key={workout.id} style={styles.timeline}>
            <View style={styles.timeIcon}><Text>↗</Text></View>
            <View style={{ flex: 1 }}><Text style={styles.timeName}>{workout.name}</Text><Text style={styles.timeMeta}>Внесено вручну</Text></View>
            <Pressable onPress={() => removeWorkout(workout.id)}><Text style={styles.timeMeta}>{workout.minutes} хв ×</Text></Pressable>
          </View>
        ))}
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Не лише тренування.</Text>
        <Text style={styles.sub}>Відзначай будь-який рух, який обираєш для себе.</Text>
        <Pressable style={styles.habit} onPress={() => toggleHabit("moveDone")}>
          <View style={[styles.check, day.moveDone && styles.checkOn]}><Text style={styles.checkMark}>{day.moveDone ? "✓" : ""}</Text></View>
          <View><Text style={styles.habitTitle}>Сьогодні був мій рух</Text><Text style={styles.timeMeta}>Прогулянка теж рахується</Text></View>
        </Pressable>
      </View>
    </SpaceScreen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: theme.lime, borderRadius: 25, padding: 26, minHeight: 250, overflow: "hidden", marginBottom: 14 },
  heroKicker: { color: theme.ink, fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  heroValue: { fontSize: 64, fontWeight: "800", letterSpacing: -3, color: theme.ink, marginTop: 12 },
  heroSub: { color: theme.ink, marginTop: 4 },
  arrow: { position: "absolute", right: 18, top: 36, fontSize: 120, opacity: 0.25, color: theme.ink },
  heroButton: { alignSelf: "flex-start", backgroundColor: theme.ink, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, marginTop: 18 },
  heroButtonText: { color: "#fff", fontWeight: "700" },
  inline: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 12 },
  inlineInput: { backgroundColor: "#FFFFFFAA", borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, minWidth: 100, fontWeight: "800", color: theme.ink },
  inlineSave: { fontWeight: "800", color: theme.ink },
  panel: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 22, padding: 18, marginBottom: 12 },
  panelHead: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
  panelTitle: { fontSize: 20, fontWeight: "800", color: theme.ink },
  chip: { borderWidth: 1, borderColor: theme.line, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, color: theme.ink, overflow: "hidden" },
  history: { flexDirection: "row", alignItems: "flex-end", height: 150, gap: 6 },
  barWrap: { flex: 1, alignItems: "center", justifyContent: "flex-end", height: 150 },
  bar: { width: "70%", backgroundColor: theme.lime, borderRadius: 8, marginVertical: 6 },
  barValue: { fontSize: 10, fontWeight: "700", color: theme.ink },
  barLabel: { fontSize: 11, color: theme.muted },
  metrics: { flexDirection: "row", gap: 8, marginBottom: 12 },
  metric: { flex: 1, backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 18, padding: 12 },
  metricLabel: { color: theme.muted, fontSize: 12 },
  metricValue: { fontSize: 26, fontWeight: "800", color: theme.ink, marginVertical: 6 },
  metricSub: { color: theme.muted, fontSize: 12 },
  link: { color: theme.blue, fontWeight: "700" },
  field: { backgroundColor: theme.bg, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, color: theme.ink },
  activity: { paddingVertical: 8, color: theme.ink, fontWeight: "700" },
  empty: { color: theme.muted, textAlign: "center", padding: 16, lineHeight: 20 },
  timeline: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 10, borderTopWidth: 1, borderTopColor: theme.line },
  timeIcon: { width: 32, height: 32, borderRadius: 10, backgroundColor: theme.lime, alignItems: "center", justifyContent: "center" },
  timeName: { fontWeight: "700", color: theme.ink },
  timeMeta: { color: theme.muted, fontSize: 12 },
  sub: { color: theme.muted, marginTop: 6, marginBottom: 8 },
  habit: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 8 },
  check: { width: 23, height: 23, borderRadius: 7, borderWidth: 1, borderColor: "#D9DDD1", alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  checkMark: { color: theme.lime, fontSize: 14 },
  habitTitle: { fontWeight: "700", color: theme.ink },
});
