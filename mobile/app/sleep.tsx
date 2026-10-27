import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { CoachTeaser, DateControl, PageTop, SpaceScreen } from "@/src/components/Shell";
import { hoursText, shiftISO, sleepHours, weekdayShort } from "@/src/format";
import { useStore } from "@/src/store";
import { theme } from "@/src/theme";

export default function SleepScreen() {
  const { day, state, setSleep, toggleHabit } = useStore();
  const [editing, setEditing] = useState(false);
  const [bed, setBed] = useState(day.bed || "23:30");
  const [wake, setWake] = useState(day.wake || "07:15");
  const hours = sleepHours(day.bed, day.wake);
  const week = Array.from({ length: 7 }, (_, index) => shiftISO(state.selectedDate, index - 6));

  return (
    <SpaceScreen>
      <PageTop eyebrow="ПРОСТІР СНУ" title="Відновлення — теж рух." action={<DateControl />} />
      <CoachTeaser />
      <View style={styles.hero}>
        <Text style={styles.kicker}>МІЙ СОН ЦІЄЇ НОЧІ</Text>
        <Text style={styles.value}>{hours ? hoursText(hours) : "Свій ритм."}</Text>
        <Text style={styles.sub}>{day.bed && day.wake ? `${day.bed} → ${day.wake} · внесено вручну` : "Додай час сну, щоб побачити свій ритм"}</Text>
        <Text style={styles.moon}>☾</Text>
        <Pressable style={styles.white} onPress={() => setEditing((value) => !value)}>
          <Text style={styles.whiteText}>{day.bed ? "Редагувати сон" : "＋ Додати сон"}</Text>
        </Pressable>
        {editing ? (
          <View style={styles.edit}>
            <TextInput value={bed} onChangeText={setBed} style={styles.input} />
            <TextInput value={wake} onChangeText={setWake} style={styles.input} />
            <Pressable onPress={() => { setSleep(bed, wake); setEditing(false); }}><Text style={styles.save}>Зберегти</Text></Pressable>
          </View>
        ) : null}
      </View>
      <View style={styles.panel}>
        <View style={styles.head}><Text style={styles.panelTitle}>Останні 7 ночей</Text><Text style={styles.chip}>години</Text></View>
        <View style={styles.history}>
          {week.map((iso) => {
            const log = state.days[iso];
            const value = log ? sleepHours(log.bed, log.wake) : 0;
            return (
              <View key={iso} style={styles.barWrap}>
                <Text style={styles.barValue}>{value ? value.toFixed(1).replace(".", ",") : "—"}</Text>
                <View style={[styles.bar, { height: Math.max(4, Math.min(105, (value / 10) * 105)) }]} />
                <Text style={styles.barLabel}>{weekdayShort(iso)}</Text>
              </View>
            );
          })}
        </View>
        <Text style={styles.note}>Показуємо тільки внесені записи. Порожній день — це відсутність даних.</Text>
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Мій вечірній простір</Text>
        <Pressable style={styles.habit} onPress={() => toggleHabit("sleepDone")}>
          <View style={[styles.check, day.sleepDone && styles.checkOn]}><Text style={{ color: theme.lime }}>{day.sleepDone ? "✓" : ""}</Text></View>
          <View style={{ flex: 1 }}>
            <Text style={styles.habitTitle}>Подбав / подбала про свій сон</Text>
            <Text style={styles.note}>Так, як це було можливо сьогодні</Text>
          </View>
        </Pressable>
        <View style={styles.insight}>
          <Text style={styles.insightTitle}>Не лише встигати.{"\n"}Ще й відновлюватися.</Text>
          <Text style={styles.insightText}>Сон має власний колір, історію й простір. Його не потрібно «заробляти» продуктивним днем.</Text>
        </View>
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Мій вечірній ритм</Text>
        <Text style={styles.note}>Окремий календар для вечора. Позначки не обнуляються.</Text>
      </View>
    </SpaceScreen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: "#171A3B", borderRadius: 25, padding: 26, minHeight: 270, overflow: "hidden", marginBottom: 14 },
  kicker: { color: "#AFAEDB", fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  value: { color: "#F5F2FF", fontSize: 42, fontWeight: "800", letterSpacing: -1.5, marginTop: 16, maxWidth: "80%" },
  sub: { color: "#AAAAD0", marginTop: 8, maxWidth: "75%" },
  moon: { position: "absolute", right: 16, top: 20, fontSize: 110, color: "#D9D5FB", transform: [{ rotate: "-15deg" }] },
  white: { alignSelf: "flex-start", backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, marginTop: 18 },
  whiteText: { fontWeight: "800", color: theme.ink },
  edit: { flexDirection: "row", gap: 8, alignItems: "center", marginTop: 12 },
  input: { backgroundColor: "#FFFFFF22", color: "#fff", borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, minWidth: 80, fontWeight: "700" },
  save: { color: "#fff", fontWeight: "800" },
  panel: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 22, padding: 18, marginBottom: 12 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  panelTitle: { fontSize: 20, fontWeight: "800", color: theme.ink },
  chip: { borderWidth: 1, borderColor: theme.line, borderRadius: 20, paddingHorizontal: 8, paddingVertical: 4, overflow: "hidden" },
  history: { flexDirection: "row", alignItems: "flex-end", height: 150 },
  barWrap: { flex: 1, alignItems: "center", justifyContent: "flex-end", height: 150 },
  bar: { width: "68%", backgroundColor: "#D9D5FB", borderTopLeftRadius: 8, borderTopRightRadius: 8, marginVertical: 6 },
  barValue: { fontSize: 10, fontWeight: "700" },
  barLabel: { fontSize: 11, color: theme.muted },
  note: { color: theme.muted, marginTop: 8, lineHeight: 18 },
  habit: { flexDirection: "row", gap: 12, alignItems: "center", marginTop: 12 },
  check: { width: 23, height: 23, borderRadius: 7, borderWidth: 1, borderColor: "#D9DDD1", alignItems: "center", justifyContent: "center" },
  checkOn: { backgroundColor: theme.ink, borderColor: theme.ink },
  habitTitle: { fontWeight: "700", color: theme.ink },
  insight: { backgroundColor: "#D9D5FB", borderRadius: 20, padding: 18, marginTop: 16 },
  insightTitle: { fontSize: 22, fontWeight: "800", color: theme.ink },
  insightText: { marginTop: 8, color: theme.ink, lineHeight: 20 },
});
