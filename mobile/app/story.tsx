import { StyleSheet, Text, View } from "react-native";

import { BackBar } from "@/src/components/Chrome";
import { useStore } from "@/src/store";
import { theme } from "@/src/theme";

export default function StoryScreen() {
  const { state } = useStore();
  const marks = Object.keys(state.checks).length;
  return (
    <View style={styles.screen}>
      <BackBar title="Моя перемога" />
      <View style={styles.card}>
        <Text style={styles.brand}>daymark.</Text>
        <Text style={styles.number}>{marks}</Text>
        <Text style={styles.caption}>{state.goalTitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.bg, padding: 16 },
  card: { marginTop: 12, backgroundColor: theme.blue, borderRadius: 28, minHeight: 420, padding: 28, justifyContent: "space-between" },
  brand: { color: theme.white, fontSize: 22, fontWeight: "800" },
  number: { color: theme.lime, fontSize: 120, fontWeight: "800", letterSpacing: -6 },
  caption: { color: theme.white, fontSize: 28, fontWeight: "800" },
});
