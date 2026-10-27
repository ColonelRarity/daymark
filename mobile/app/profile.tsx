import { router } from "expo-router";
import { useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";

import { SpaceScreen, PageTop } from "@/src/components/Shell";
import { DIETS } from "@/src/nutrition/calc";
import { useStore } from "@/src/store";
import { theme } from "@/src/theme";

const FOCUS = [
  { id: "balanced", name: "Звичайний щоденник" },
  { id: "flexible", name: "Гнучкий режим" },
  { id: "keto", name: "Акцент на вуглеводах / кето" },
  ...DIETS.filter((diet) => !["deficit", "keto"].includes(diet.id) || diet.id === "deficit").map((diet) => ({ id: diet.id, name: diet.name })),
];

export default function ProfileScreen() {
  const { state, setName, setCalories, setDiet, setStepsTarget, setWeight } = useStore();
  const [name, setLocalName] = useState(state.name);
  const [calories, setLocalCalories] = useState(state.calories == null ? "" : String(state.calories));
  const [steps, setSteps] = useState(String(state.stepsTarget || ""));
  const [weight, setLocalWeight] = useState(state.weight == null ? "" : String(state.weight));

  return (
    <SpaceScreen>
      <PageTop
        eyebrow="МІЙ ПРОСТІР / НАЛАШТУВАННЯ"
        title="Тут усе по-твоєму."
        action={<Pressable style={styles.blueSmall} onPress={() => router.push("/onboard")}><Text style={styles.blueSmallText}>{state.demo ? "Почати свою ціль" : "＋ Нова ціль"}</Text></Pressable>}
      />
      <Pressable style={styles.context}><Text style={styles.contextMark}>≈</Text><View style={{ flex: 1 }}><Text style={styles.contextTitle}>Мій план калорій і БЖВ</Text><Text style={styles.contextSub}>Розрахувати за параметрами й активністю</Text></View><Text>↗</Text></Pressable>
      <Pressable style={styles.context}><Text style={styles.contextMark}>✦</Text><View style={{ flex: 1 }}><Text style={styles.contextTitle}>Мій контекст і помічник</Text><Text style={styles.contextSub}>Активність, параметри, БЖВ і підказки</Text></View><Text>↗</Text></Pressable>
      <View style={styles.panel}>
        <View style={styles.head}><Text style={styles.panelTitle}>Мій профіль</Text><View style={styles.avatar}><Text style={styles.avatarText}>{name.slice(0, 1).toUpperCase()}</Text></View></View>
        <Text style={styles.label}>Як до тебе звертатися?</Text>
        <TextInput value={name} onChangeText={setLocalName} style={styles.input} />
        <View style={styles.pair}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Мій орієнтир, ккал</Text>
            <TextInput value={calories} onChangeText={setLocalCalories} keyboardType="number-pad" placeholder="Необов’язково" placeholderTextColor={theme.muted} style={styles.input} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Орієнтир кроків</Text>
            <TextInput value={steps} onChangeText={setSteps} keyboardType="number-pad" placeholder="Необов’язково" placeholderTextColor={theme.muted} style={styles.input} />
          </View>
        </View>
        <Text style={styles.label}>Вага, кг</Text>
        <TextInput value={weight} onChangeText={setLocalWeight} keyboardType="decimal-pad" placeholder="Необов’язково" placeholderTextColor={theme.muted} style={styles.input} />
        <Text style={styles.label}>Фокус харчування</Text>
        <View style={styles.pills}>
          {FOCUS.map((item) => (
            <Pressable key={item.id} onPress={() => setDiet(item.id)} style={[styles.pill, state.diet === item.id && styles.pillOn]}>
              <Text style={[styles.pillText, state.diet === item.id && styles.pillTextOn]}>{item.name}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={styles.help}>Змінює фокус інтерфейсу. Не призначає раціон.</Text>
        <Pressable
          style={styles.save}
          onPress={() => {
            setName(name);
            setCalories(calories.trim() ? Number(calories) : null);
            setStepsTarget(Number(steps) || 0);
            setWeight(weight.trim() ? Number(weight.replace(",", ".")) : null);
          }}>
          <Text style={styles.saveText}>Зберегти налаштування</Text>
        </Pressable>
      </View>
    </SpaceScreen>
  );
}

const styles = StyleSheet.create({
  blueSmall: { backgroundColor: theme.blue, borderRadius: 9, paddingHorizontal: 10, paddingVertical: 8 },
  blueSmallText: { color: "#fff", fontWeight: "700", fontSize: 12 },
  context: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 16, padding: 14, marginBottom: 10 },
  contextMark: { fontSize: 20, color: theme.blue },
  contextTitle: { fontWeight: "800", color: theme.ink },
  contextSub: { color: theme.muted, fontSize: 12, marginTop: 2 },
  panel: { backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 22, padding: 18, marginTop: 6 },
  head: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  panelTitle: { fontSize: 22, fontWeight: "800", color: theme.ink },
  avatar: { width: 36, height: 36, borderRadius: 18, backgroundColor: "#D9D5FB", alignItems: "center", justifyContent: "center" },
  avatarText: { fontWeight: "800", color: theme.ink },
  label: { marginTop: 14, fontWeight: "700", color: theme.ink, fontSize: 13 },
  input: { marginTop: 6, backgroundColor: theme.bg, borderWidth: 1, borderColor: "#D9DFD0", borderRadius: 11, paddingHorizontal: 12, paddingVertical: 12, color: theme.ink, fontSize: 15 },
  pair: { flexDirection: "row", gap: 10 },
  pills: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  pill: { borderWidth: 1, borderColor: theme.line, borderRadius: 16, paddingHorizontal: 10, paddingVertical: 8, backgroundColor: theme.bg },
  pillOn: { borderColor: theme.blue, backgroundColor: "#E9EDFF" },
  pillText: { fontWeight: "700", color: theme.ink, fontSize: 12 },
  pillTextOn: { color: theme.blue },
  help: { color: theme.muted, fontSize: 12, marginTop: 8 },
  save: { backgroundColor: theme.blue, borderRadius: 12, minHeight: 46, alignItems: "center", justifyContent: "center", marginTop: 16 },
  saveText: { color: "#fff", fontWeight: "800" },
});
