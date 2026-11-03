import { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { SpaceScreen } from "@/src/components/Shell";
import { theme } from "@/src/theme";

const SESSIONS = [
  {
    id: "morning",
    title: "Налаштуватися на день",
    text: "Я починаю цей день у своєму темпі. Мені не треба встигати все. Достатньо одного спокійного кроку, і я вже в русі.",
  },
  {
    id: "heavy",
    title: "Видихнути після важкого",
    text: "Цей день був щільним, і це нормально. Я видихаю зайве. Те, що вже зроблено, лишається зі мною. Решта може зачекати.",
  },
  {
    id: "hard",
    title: "Підтримати себе у складний період",
    text: "Мені можна йти повільніше. Менший крок сьогодні не стирає шлях. Я лишаюся на своєму боці.",
  },
] as const;

export default function WellbeingScreen() {
  const [open, setOpen] = useState<string>(SESSIONS[0].id);
  return (
    <SpaceScreen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>DAYMARK · МЕДИТАЦІЇ ТА АФІРМАЦІЇ</Text>
        <Text style={styles.title}>Заспокоїтись.{"\n"}Налаштуватись на день.</Text>
        <Text style={styles.copy}>Тексти сеансів, щоб видихнути і повернути собі опору. Читай повільно і повторюй рядки, які відгукуються.</Text>
      </View>
      {SESSIONS.map((session) => {
        const on = open === session.id;
        return (
          <Pressable key={session.id} style={styles.card} onPress={() => setOpen(session.id)}>
            <Text style={styles.cardKicker}>СЛУХАЙ · ПОВТОРЮЙ</Text>
            <Text style={styles.cardTitle}>{session.title}</Text>
            {on ? <Text style={styles.cardText}>{session.text}</Text> : null}
          </Pressable>
        );
      })}
    </SpaceScreen>
  );
}

const styles = StyleSheet.create({
  hero: { borderRadius: 24, padding: 22, marginBottom: 14, backgroundColor: "#D9D0FF" },
  kicker: { color: "#5C4E92", fontSize: 11, fontWeight: "800", letterSpacing: 0.6 },
  title: { color: "#2C2740", fontSize: 32, lineHeight: 36, fontWeight: "800", letterSpacing: -1, marginTop: 10 },
  copy: { color: "#4C4560", fontSize: 15, lineHeight: 22, marginTop: 12 },
  card: { backgroundColor: theme.white, borderRadius: 20, padding: 16, marginBottom: 10 },
  cardKicker: { color: "#8B75E8", fontSize: 11, fontWeight: "800", letterSpacing: 0.7 },
  cardTitle: { color: theme.ink, fontSize: 18, fontWeight: "800", marginTop: 6 },
  cardText: { color: "#4C4560", fontSize: 15, lineHeight: 22, marginTop: 8 },
});
