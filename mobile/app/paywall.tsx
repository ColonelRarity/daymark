import { router } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { trialLabel, useDevice, type Plan } from "@/src/device";
import { theme } from "@/src/theme";

const PLANS: { id: Plan; name: string; price: string; note: string }[] = [
  { id: "month", name: "Місяць", price: "4,99 €", note: "після 7 днів" },
  { id: "year", name: "Рік", price: "39 €", note: "вигідніше за місяць" },
];

export default function PaywallScreen() {
  const { device, startTrial } = useDevice();
  const [plan, setPlan] = useState<Plan>("year");
  const [notice, setNotice] = useState("");

  function begin() {
    startTrial(plan);
    setNotice("Сім днів відкрито на цьому пристрої. Списання підключить App Store, коли продукт буде в магазині.");
  }

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.close}><Text style={styles.closeText}>×</Text></Pressable>
      <Text style={styles.kicker}>ПІДПИСКА / 7 ДНІВ БЕЗКОШТОВНО</Text>
      <Text style={styles.title}>Весь щоденник.{"\n"}Без зайвого шуму.</Text>
      <Text style={styles.sub}>База продуктів, страви, фото на твоєму телефоні і нагадування про їжу та воду. Пробний період нічого не списує, поки покупка не підключена в App Store.</Text>
      <View style={styles.points}>
        {["Продукти і страви з калорійністю", "Фото лишається на пристрої", "Нагадування про прийоми їжі і воду", "Відновлення покупки на новому телефоні"].map((item) => (
          <Text key={item} style={styles.point}>• {item}</Text>
        ))}
      </View>
      <View style={styles.plans}>
        {PLANS.map((item) => (
          <Pressable key={item.id} onPress={() => setPlan(item.id)} style={[styles.plan, plan === item.id && styles.planOn]}>
            <Text style={styles.planName}>{item.name}</Text>
            <Text style={styles.planPrice}>{item.price}</Text>
            <Text style={styles.planNote}>{item.note}</Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.legal}>Ціна на екрані орієнтовна. В App Store її підтвердить Apple у твоїй валюті. Підписку можна скасувати в налаштуваннях Apple до кінця пробного періоду.</Text>
      <Pressable style={styles.primary} onPress={begin}><Text style={styles.primaryText}>Почати 7 днів</Text></Pressable>
      <Pressable onPress={() => setNotice("Відновлення покупки з’явиться разом із продуктом в App Store. Зараз підписка живе на цьому пристрої.")}>
        <Text style={styles.restore}>Відновити покупки</Text>
      </Pressable>
      <Text style={styles.status}>{trialLabel(device.subscription)}</Text>
      {notice ? <Text style={styles.notice}>{notice}</Text> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg },
  content: { padding: 22, paddingBottom: 48 },
  close: { alignSelf: "flex-end", width: 36, height: 36, borderRadius: 18, backgroundColor: "#E8ECE2", alignItems: "center", justifyContent: "center" },
  closeText: { fontSize: 24, color: theme.ink, marginTop: -2 },
  kicker: { color: theme.muted, fontSize: 12, fontWeight: "800", letterSpacing: 1, marginTop: 8 },
  title: { fontSize: 34, fontWeight: "800", letterSpacing: -1.2, color: theme.ink, marginTop: 10, lineHeight: 38 },
  sub: { color: theme.muted, marginTop: 12, lineHeight: 21 },
  points: { marginTop: 18, gap: 8 },
  point: { color: theme.ink, fontSize: 15, lineHeight: 21 },
  plans: { flexDirection: "row", gap: 10, marginTop: 20 },
  plan: { flex: 1, backgroundColor: theme.white, borderWidth: 1, borderColor: theme.line, borderRadius: 18, padding: 14 },
  planOn: { borderColor: theme.ink, backgroundColor: "#F3F1E9" },
  planName: { fontWeight: "800", color: theme.ink },
  planPrice: { fontSize: 26, fontWeight: "800", letterSpacing: -0.8, color: theme.ink, marginTop: 8 },
  planNote: { color: theme.muted, marginTop: 4, fontSize: 12 },
  legal: { color: theme.muted, fontSize: 12, lineHeight: 18, marginTop: 14 },
  primary: { marginTop: 16, backgroundColor: theme.blue, borderRadius: 14, minHeight: 52, alignItems: "center", justifyContent: "center" },
  primaryText: { color: "#fff", fontWeight: "800", fontSize: 16 },
  restore: { color: theme.blue, fontWeight: "800", textAlign: "center", marginTop: 14 },
  status: { textAlign: "center", color: theme.ink, fontWeight: "700", marginTop: 10 },
  notice: { color: theme.muted, textAlign: "center", marginTop: 8, lineHeight: 20 },
});
