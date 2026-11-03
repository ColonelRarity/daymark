import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SpaceScreen } from "@/src/components/Shell";
import { num } from "@/src/format";
import { useStore } from "@/src/store";
import { theme } from "@/src/theme";

export default function WeekScreen() {
  const { state } = useStore();
  return (
    <SpaceScreen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>DAYMARK / МІЙ ТИЖДЕНЬ</Text>
        <Text style={styles.title}>Їжа й рух.{"\n"}В одному плані.</Text>
        <Text style={styles.copy}>
          Скажи, що любиш їсти, що готова купити і коли тобі зручно рухатися. Ми зберемо сім днів — ти можеш змінити будь-який із них.
        </Text>
        <View style={styles.countRow}>
          <Text style={styles.count}>07</Text>
          <Text style={styles.countLabel}>днів, які можна{"\n"}підлаштувати</Text>
        </View>
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelKicker}>НАЛАШТУВАННЯ ПЛАНУ</Text>
        <Text style={styles.panelTitle}>Розкажи, що тобі підходить</Text>
        <Text style={styles.step}>01 / МІЙ КОНТЕКСТ</Text>
        <Text style={styles.lead}>Спершу — про тебе.</Text>
        <Text style={styles.note}>Вага й орієнтир калорій допоможуть зібрати меню. Без них план теж можна скласти — без персональної цифри.</Text>
        <View style={styles.fact}><Text style={styles.factLabel}>Ціль</Text><Text style={styles.factValue}>{state.goalTitle}</Text></View>
        <View style={styles.fact}><Text style={styles.factLabel}>Орієнтир</Text><Text style={styles.factValue}>{state.calories ? `${num(state.calories)} ккал` : "Ще не задано"}</Text></View>
        <View style={styles.fact}><Text style={styles.factLabel}>Кроки</Text><Text style={styles.factValue}>{state.stepsTarget ? num(state.stepsTarget) : "Свій темп"}</Text></View>
        <Pressable style={styles.button} onPress={() => router.push("/profile")}>
          <Text style={styles.buttonText}>Уточнити мій контекст ↗</Text>
        </Pressable>
      </View>
    </SpaceScreen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: "#242840", borderRadius: 26, padding: 22, marginBottom: 14 },
  kicker: { color: "#D9FA77", fontSize: 11, fontWeight: "800", letterSpacing: 1 },
  title: { color: "#fff", fontSize: 34, lineHeight: 38, fontWeight: "800", letterSpacing: -1.2, marginTop: 12 },
  copy: { color: "#D5D8E8", fontSize: 15, lineHeight: 22, marginTop: 12 },
  countRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 18 },
  count: { color: "#D9FA77", fontSize: 48, fontWeight: "800", letterSpacing: -2 },
  countLabel: { color: "#fff", fontSize: 15, fontWeight: "700" },
  panel: { backgroundColor: theme.white, borderRadius: 24, padding: 18 },
  panelKicker: { color: "#6A62C8", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  panelTitle: { fontSize: 24, fontWeight: "800", color: theme.ink, marginTop: 6, letterSpacing: -0.5 },
  step: { color: "#6A62C8", fontSize: 12, fontWeight: "800", letterSpacing: 0.6, marginTop: 18 },
  lead: { fontSize: 22, fontWeight: "800", color: theme.ink, marginTop: 4 },
  note: { color: theme.muted, fontSize: 14, lineHeight: 20, marginTop: 8 },
  fact: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#EEF0E6" },
  factLabel: { color: theme.muted, fontSize: 14 },
  factValue: { color: theme.ink, fontWeight: "800", fontSize: 14 },
  button: { marginTop: 16, backgroundColor: "#5348F2", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#fff", fontWeight: "800" },
});
