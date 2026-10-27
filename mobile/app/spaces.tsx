import { router, type Href } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { num, sleepHours } from "@/src/format";
import { useStore } from "@/src/store";
import { theme } from "@/src/theme";

export default function SpacesScreen() {
  const { state, day, totals } = useStore();
  const sleep = sleepHours(day.bed, day.wake);
  const cards: { href: Href; bg: string; color: string; kicker: string; title: string; value: string; sub: string }[] = [
    { href: "/profile", bg: "#E4F2C9", color: "#536436", kicker: "ПРОСТІР / МОЇ ОПОРИ", title: "Мої опори.", value: "Мій\nнабір", sub: "Маленькі дії під мою ціль." },
    { href: "/recipes", bg: "#FFE1CF", color: "#171A1C", kicker: "ПРОСТІР / ІДЕЇ ЇЖІ", title: "Ідеї їжі.", value: "100\nідей", sub: "Що приготувати сьогодні?" },
    { href: "/", bg: "#4E48F7", color: "#FFFFFF", kicker: "ПРОСТІР / МІЙ ДЕНЬ", title: "Мій день.", value: state.goalTitle, sub: "Позначка за позначкою." },
    { href: "/diary", bg: "#FFC6AD", color: "#171A1C", kicker: "ПРОСТІР / ЇЖА", title: "Їжа.", value: `${num(totals.kcal)}\nккал`, sub: "Внесено у щоденник." },
    { href: "/move", bg: "#D9FF65", color: "#171A1C", kicker: "ПРОСТІР / РУХ", title: "Рух.", value: num(day.steps), sub: "Кроків у своєму темпі." },
    { href: "/sleep", bg: "#171A3B", color: "#DEDAFF", kicker: "ПРОСТІР / СОН", title: "Сон.", value: sleep ? `${num(sleep, 1)} г` : "☾", sub: "Час на відновлення." },
  ];

  return (
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <View style={styles.head}>
          <Text style={styles.kicker}>МОЇ ПРОСТОРИ / ГОРТАЙ</Text>
          <Pressable accessibilityLabel="Закрити" onPress={() => router.back()} style={styles.close}>
            <Text style={styles.closeMark}>×</Text>
          </Pressable>
        </View>
        <ScrollView contentContainerStyle={styles.body} showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>Один ти.{"\n"}Різні сторони життя.</Text>
          <Text style={styles.sub}>Гортай картки, як екрани застосунків. Обери простір, у який хочеш перейти.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} decelerationRate="fast" snapToInterval={236} contentContainerStyle={styles.row}>
            {cards.map((card) => (
              <Pressable key={card.kicker} style={[styles.card, { backgroundColor: card.bg }]} onPress={() => router.replace(card.href)}>
                <Text style={[styles.cardKicker, { color: card.color }]}>{card.kicker}</Text>
                <Text style={[styles.cardTitle, { color: card.color }]}>{card.title}</Text>
                <Text style={[styles.cardValue, { color: card.color }]}>{card.value}</Text>
                <Text style={[styles.cardSub, { color: card.color }]}>{card.sub}</Text>
                <Text style={[styles.open, { color: card.color }]}>Відкрити простір ↗</Text>
              </Pressable>
            ))}
          </ScrollView>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#10182B88", justifyContent: "center", padding: 14 },
  sheet: { backgroundColor: "#F6F5F1", borderRadius: 28, maxHeight: "94%", paddingBottom: 18 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 18 },
  kicker: { color: "#B7A9C8", fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#E7E4DC", alignItems: "center", justifyContent: "center" },
  closeMark: { fontSize: 22, color: theme.ink, marginTop: -2 },
  body: { paddingBottom: 12 },
  title: { fontSize: 34, fontWeight: "800", letterSpacing: -1.3, color: theme.ink, lineHeight: 38, paddingHorizontal: 20, marginTop: 12 },
  sub: { color: theme.muted, fontSize: 15, lineHeight: 21, paddingHorizontal: 20, marginTop: 10, marginBottom: 16 },
  row: { paddingHorizontal: 20, gap: 12, paddingBottom: 8 },
  card: { width: 224, height: 330, borderRadius: 24, padding: 20, justifyContent: "space-between" },
  cardKicker: { fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  cardTitle: { fontSize: 34, fontWeight: "800", letterSpacing: -1.2, lineHeight: 36 },
  cardValue: { fontSize: 48, fontWeight: "800", letterSpacing: -1.6, lineHeight: 50 },
  cardSub: { fontSize: 14, opacity: 0.8, marginTop: 8 },
  open: { fontSize: 14, fontWeight: "700", marginTop: 16 },
});
