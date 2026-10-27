import { Tabs } from "expo-router";
import { View } from "react-native";

import { AppHeader, DemoBanner } from "@/src/components/Chrome";
import { BottomNav } from "@/src/components/Shell";
import { theme } from "@/src/theme";

const TABS = ["index", "journey", "photo", "recipes", "diary"] as const;

export default function TabLayout() {
  return (
    <View style={{ flex: 1, backgroundColor: theme.bg }}>
      <AppHeader />
      <DemoBanner />
      <Tabs
        screenOptions={{ headerShown: false, tabBarStyle: { display: "none" } }}
        tabBar={({ state }) => <BottomNav active={TABS[state.index]} />}>
        <Tabs.Screen name="index" />
        <Tabs.Screen name="journey" />
        <Tabs.Screen name="photo" />
        <Tabs.Screen name="recipes" />
        <Tabs.Screen name="diary" />
      </Tabs>
    </View>
  );
}
