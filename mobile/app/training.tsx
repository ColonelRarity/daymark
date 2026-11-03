import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { Dumbbell } from "@/src/components/Marks";
import { SpaceScreen, DateControl } from "@/src/components/Shell";
import { num, shortDay } from "@/src/format";
import { useStore } from "@/src/store";
import { theme } from "@/src/theme";

export default function TrainingScreen() {
  const { state, day } = useStore();
  const minutes = day.workouts.reduce((sum, item) => sum + item.minutes, 0);
  return (
    <SpaceScreen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>DAYMARK TRAINING / ТВІЙ РУХ</Text>
        <Text style={styles.title}>Тренування{"\n"}під твою ціль.</Text>
        <Text style={styles.copy}>Вдома, у залі чи надворі. Обери рух і запиши його у свій день.</Text>
        <View style={styles.tile}><Dumbbell size={40} color="#5C6B32" /></View>
      </View>
      <View style={styles.panel}>
        <View style={styles.head}>
          <Text style={styles.panelKicker}>ТВІЙ РУХ / {shortDay(state.selectedDate).toUpperCase()}</Text>
          <DateControl />
        </View>
        <Text style={styles.lead}>Почнемо з тебе.</Text>
        <Text style={styles.note}>Сьогодні в щоденнику {num(day.steps)} кроків{minutes ? ` і ${minutes} хв руху` : ""}.</Text>
        <Pressable style={styles.button} onPress={() => router.push("/move")}>
          <Text style={styles.buttonText}>Налаштувати мій рух ↗</Text>
        </Pressable>
      </View>
    </SpaceScreen>
  );
}

const styles = StyleSheet.create({
  hero: { backgroundColor: "#242840", borderRadius: 26, padding: 22, marginBottom: 14, overflow: "hidden" },
  kicker: { color: "#D9FA77", fontSize: 11, fontWeight: "800", letterSpacing: 0.8 },
  title: { color: "#fff", fontSize: 34, lineHeight: 38, fontWeight: "800", letterSpacing: -1.2, marginTop: 12 },
  copy: { color: "#D5D8E8", fontSize: 15, lineHeight: 22, marginTop: 12, maxWidth: 260 },
  tile: { position: "absolute", right: 16, top: 18, width: 72, height: 72, borderRadius: 20, backgroundColor: "#D9FA77", alignItems: "center", justifyContent: "center" },
  panel: { backgroundColor: theme.white, borderRadius: 24, padding: 18 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 8 },
  panelKicker: { color: "#6A62C8", fontSize: 11, fontWeight: "800", letterSpacing: 0.6, flex: 1 },
  lead: { fontSize: 26, fontWeight: "800", color: theme.ink, marginTop: 14, letterSpacing: -0.6 },
  note: { color: theme.muted, fontSize: 15, lineHeight: 22, marginTop: 8 },
  button: { marginTop: 16, backgroundColor: "#D9FA77", borderRadius: 14, paddingVertical: 14, alignItems: "center" },
  buttonText: { color: "#243018", fontWeight: "800" },
});
