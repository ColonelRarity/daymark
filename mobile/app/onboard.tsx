import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";

import { useStore } from "@/src/store";
import { theme } from "@/src/theme";

const DIRECTIONS = [
  { id: "lose", icon: "↘", name: "Почуватися легше", line: "Хочу змінювати вагу в комфортному темпі" },
  { id: "gain", icon: "↗", name: "Набрати вагу", line: "Хочу регулярно їсти й підтримати набір ваги" },
  { id: "muscle", icon: "✳", name: "Наростити м’язи", line: "Хочу ставати сильнішим / сильнішою" },
  { id: "form", icon: "◇", name: "Підтримувати форму", line: "Хочу зберегти ритм, який мені підходить" },
  { id: "energy", icon: "☀", name: "Більше енергії", line: "Хочу мати сили на звичайне життя" },
  { id: "consistent", icon: "✓", name: "Повернути регулярність", line: "Часто починаю — хочу навчитися продовжувати" },
];

const MORE = [
  { id: "homefit", icon: "⌂", name: "Почати рухатися вдома", line: "Хочу займатися без дороги до залу" },
  { id: "walking", icon: "➜", name: "Більше ходити", line: "Хочу додати рух між роботою й справами" },
  { id: "sleep", icon: "☾", name: "Налагодити вечірній ритм", line: "Хочу виділити місце для відпочинку" },
  { id: "study", icon: "▤", name: "Закінчити курс / навчання", line: "Хочу бачити, як маленькі заняття складаються в результат" },
];

const SUPPORTS = ["Запис їжі", "Рух", "Сон", "Короткий чек-ін"];

export default function OnboardScreen() {
  const { startOwn, setName } = useStore();
  const [step, setStep] = useState(0);
  const [kind, setKind] = useState("lose");
  const [name, setLocalName] = useState("");
  const [title, setTitle] = useState("Почуватися легше");
  const [more, setMore] = useState(false);
  const chosen = [...DIRECTIONS, ...MORE].find((item) => item.id === kind);

  function next() {
    if (step === 0) {
      setTitle(chosen?.name ?? title);
      setStep(1);
      return;
    }
    if (step === 1) {
      setStep(2);
      return;
    }
    if (name.trim()) setName(name.trim());
    startOwn(title);
    router.replace("/");
  }

  return (
    <View style={styles.backdrop}>
      <View style={styles.sheet}>
        <View style={styles.head}>
          <Text style={styles.kicker}>МІЙ СТАРТ / {step + 1} З 3</Text>
          <Pressable accessibilityLabel="Закрити" onPress={() => router.back()} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
        </View>
        <View style={styles.dots}>
          {[0, 1, 2].map((item) => <View key={item} style={[styles.dot, item <= step && styles.dotOn]} />)}
        </View>
        <ScrollView contentContainerStyle={styles.body}>
          {step === 0 ? (
            <>
              <Text style={styles.title}>У кожного —{"\n"}свій напрям.</Text>
              <Text style={styles.sub}>Яка думка найбільше схожа на твою? Потім підберемо опори під цю ціль.</Text>
              <View style={styles.grid}>
                {DIRECTIONS.map((item) => (
                  <Pressable key={item.id} onPress={() => setKind(item.id)} style={[styles.choice, kind === item.id && styles.choiceOn]}>
                    <Text style={styles.icon}>{item.icon}</Text>
                    <Text style={[styles.choiceName, kind === item.id && styles.choiceNameOn]}>{item.name}</Text>
                    <Text style={styles.choiceLine}>{item.line}</Text>
                  </Pressable>
                ))}
              </View>
              <Pressable onPress={() => setMore((value) => !value)}>
                <Text style={styles.more}>▸ Ще напрями: рух, сон, навчання, робота й моє життя</Text>
              </Pressable>
              {more ? (
                <View style={styles.grid}>
                  {MORE.map((item) => (
                    <Pressable key={item.id} onPress={() => setKind(item.id)} style={[styles.choice, kind === item.id && styles.choiceOn]}>
                      <Text style={styles.icon}>{item.icon}</Text>
                      <Text style={styles.choiceName}>{item.name}</Text>
                      <Text style={styles.choiceLine}>{item.line}</Text>
                    </Pressable>
                  ))}
                </View>
              ) : null}
              <Text style={styles.label}>Як до тебе звертатися?</Text>
              <TextInput value={name} onChangeText={setLocalName} placeholder="Твоє ім’я" placeholderTextColor="#A8A89E" style={styles.input} />
            </>
          ) : null}
          {step === 1 ? (
            <>
              <Text style={styles.title}>Твоя ціль.{"\n"}Твій горизонт.</Text>
              <Text style={styles.sub}>{chosen?.line}</Text>
              <Text style={styles.label}>Моя назва цілі</Text>
              <TextInput value={title} onChangeText={setTitle} style={styles.input} />
              <Text style={styles.label}>Мій мінімум у складний день</Text>
              <TextInput defaultValue="10 хвилин руху й один запис їжі" style={styles.input} />
            </>
          ) : null}
          {step === 2 ? (
            <>
              <Text style={styles.title}>Те, на що{"\n"}ти спиратимешся.</Text>
              <Text style={styles.sub}>Пропонуємо набір для «{chosen?.name}». Залиш свої опори, решту сміливо прибирай.</Text>
              {SUPPORTS.map((item) => (
                <Text key={item} style={styles.support}>✓  {item}</Text>
              ))}
            </>
          ) : null}
          <Pressable style={styles.next} onPress={next}>
            <Text style={styles.nextText}>{step === 2 ? "Створити мій шлях ↗" : "Далі ↗"}</Text>
          </Pressable>
          {step > 0 ? <Pressable onPress={() => setStep((value) => value - 1)}><Text style={styles.back}>Назад</Text></Pressable> : null}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "#10182B66", justifyContent: "center", padding: 16 },
  sheet: { backgroundColor: "#F7F6F2", borderRadius: 28, maxHeight: "92%", paddingBottom: 12 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 18, paddingTop: 16 },
  kicker: { color: theme.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  close: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#E8ECE2", alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 22, color: theme.ink },
  dots: { flexDirection: "row", gap: 6, paddingHorizontal: 18, marginTop: 14 },
  dot: { flex: 1, height: 4, borderRadius: 4, backgroundColor: "#DFE4D6" },
  dotOn: { backgroundColor: theme.blue },
  body: { padding: 18, paddingBottom: 24 },
  title: { fontSize: 32, fontWeight: "800", letterSpacing: -1.2, color: theme.ink, lineHeight: 36 },
  sub: { color: theme.muted, marginTop: 8, marginBottom: 8, lineHeight: 20 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginVertical: 12 },
  choice: { width: "48%", minHeight: 150, backgroundColor: "#F8F5FC", borderWidth: 1, borderColor: "#E4DFEC", borderRadius: 19, padding: 14 },
  choiceOn: { backgroundColor: "#E8E0FA", borderColor: "#B89FDF" },
  icon: { fontSize: 26, color: "#A18AB5" },
  choiceName: { marginTop: 10, fontWeight: "800", color: "#82718F", fontSize: 14 },
  choiceNameOn: { color: "#8664AD" },
  choiceLine: { marginTop: 6, color: "#A798B0", fontSize: 12, lineHeight: 16 },
  more: { color: "#8D7AA8", fontWeight: "700", marginBottom: 8 },
  label: { marginTop: 12, fontWeight: "700", color: theme.ink },
  input: { marginTop: 6, backgroundColor: theme.white, borderWidth: 1, borderColor: "#D9DFD0", borderRadius: 12, paddingHorizontal: 12, paddingVertical: 12, fontSize: 16, color: theme.ink },
  support: { paddingVertical: 10, fontSize: 16, color: theme.ink },
  next: { marginTop: 18, backgroundColor: theme.blue, borderRadius: 12, minHeight: 48, alignItems: "center", justifyContent: "center" },
  nextText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  back: { textAlign: "center", marginTop: 12, color: theme.ink, fontWeight: "700" },
});
