import { Platform } from "react-native";

import type { ReminderTimes } from "@/src/device";

export const REMINDERS: { id: keyof ReminderTimes; title: string; body: string }[] = [
  { id: "breakfast", title: "Сніданок", body: "Сніданок уже в щоденнику?" },
  { id: "water", title: "Вода", body: "Випив воду?" },
  { id: "lunch", title: "Обід", body: "Обід уже записаний?" },
  { id: "snack", title: "Перекус", body: "Не забув відмітити перекус?" },
  { id: "waterLate", title: "Вода", body: "Випив воду?" },
  { id: "dinner", title: "Вечеря", body: "Вечеря вже в щоденнику?" },
];

export async function applyReminders(on: boolean, times: ReminderTimes) {
  if (Platform.OS === "web") {
    if (!on) return;
    if (typeof Notification === "undefined") throw new Error("Цей браузер не показує сповіщення.");
    const permission = await Notification.requestPermission();
    if (permission !== "granted") throw new Error("Дозвіл на сповіщення вимкнений.");
    return;
  }
  const Notifications = await import("expo-notifications");
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });
  const current = await Notifications.getPermissionsAsync();
  const permission = current.granted ? current : await Notifications.requestPermissionsAsync();
  if (!permission.granted) throw new Error("Дозвіл на сповіщення вимкнений.");
  await Notifications.cancelAllScheduledNotificationsAsync();
  if (!on) return;
  for (const item of REMINDERS) {
    const [hour, minute] = times[item.id].split(":").map(Number);
    await Notifications.scheduleNotificationAsync({
      content: { title: item.title, body: item.body },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DAILY, hour, minute },
    });
  }
}
