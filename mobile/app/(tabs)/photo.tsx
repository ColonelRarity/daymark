import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/src/theme";

export default function PhotoScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.kicker}>AI ФОТО / МАКЕТ СЦЕНАРІЮ</Text>
      <Text style={styles.title}>Сфоткай.{"\n"}Запам’ятай свій смак.</Text>
      <Text style={styles.sub}>Завантаж фото для запису або подивись, як виглядатиме оцінка. Розпізнавання у прототипі не підключене.</Text>
      <Pressable style={styles.zone} onPress={() => router.push("/search")}>
        <Text style={styles.zoneTitle}>Їжа, кава чи етикетка</Text>
        <Text style={styles.zoneSub}>З камери чи галереї · зберігається локально</Text>
      </Pressable>
      <Pressable style={styles.button} onPress={() => router.push("/choose")}>
        <Text style={styles.buttonText}>Як тобі зручніше? ↗</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, padding: 22 },
  kicker: { color: theme.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1.1 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -1.2, color: theme.ink, marginTop: 14, lineHeight: 36 },
  sub: { color: theme.muted, marginTop: 10, lineHeight: 20 },
  zone: { marginTop: 18, borderWidth: 1.5, borderStyle: "dashed", borderColor: "#B4BDEA", backgroundColor: "#E8EDFF", borderRadius: 19, minHeight: 180, alignItems: "center", justifyContent: "center", padding: 20 },
  zoneTitle: { fontWeight: "800", fontSize: 16, color: theme.ink },
  zoneSub: { color: theme.muted, marginTop: 6, textAlign: "center" },
  button: { marginTop: 16, backgroundColor: theme.blue, borderRadius: 12, minHeight: 46, alignItems: "center", justifyContent: "center" },
  buttonText: { color: "#fff", fontWeight: "800" },
});
