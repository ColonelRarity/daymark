import { router } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "@/src/theme";

const CHOICES = [
  ["/photo", "За фото", "Завантажити / сценарій AI"],
  ["/search", "Пошук продукту", "Продукти, кафе й ресторани"],
  ["/label", "За етикеткою", "Грами та значення на 100 г"],
  ["/add?mode=manual", "Швидкий запис", "Назва й калорії порції"],
  ["/add?mode=oil", "Олія", "Грамовка для смаження"],
  ["/add?mode=sauce", "Соус", "Жирність і грами"],
] as const;

export default function ChooseScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.kicker}>ХАРЧУВАННЯ / МІЙ ЗАПИС</Text>
      <Text style={styles.title}>Як тобі зручніше?</Text>
      <Text style={styles.sub}>Повний вибір: від кави на ходу до зваженої порції.</Text>
      <View style={styles.grid}>
        {CHOICES.map(([href, name, sub]) => (
          <Pressable key={name} style={styles.choice} onPress={() => router.push(href)}>
            <Text style={styles.choiceName}>{name}</Text>
            <Text style={styles.choiceSub}>{sub}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable onPress={() => router.back()} style={styles.close}><Text style={styles.closeText}>Закрити</Text></Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, padding: 22 },
  kicker: { color: theme.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1.2 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -1.2, color: theme.ink, marginTop: 12 },
  sub: { color: theme.muted, fontSize: 14, marginTop: 8, marginBottom: 18 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 9 },
  choice: { width: "48%", backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 16, padding: 16, minHeight: 110 },
  choiceName: { fontWeight: "800", fontSize: 15, color: theme.ink, marginTop: 18 },
  choiceSub: { color: theme.muted, fontSize: 12, marginTop: 4 },
  close: { marginTop: 18, alignItems: "center" },
  closeText: { color: theme.blue, fontWeight: "700" },
});
