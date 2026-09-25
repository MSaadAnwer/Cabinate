import { Platform } from "react-native";
import type { CookingTimer } from "../utils/local-data";

const channelId = "cooking-timers";
const notifications = () => import("expo-notifications");

export async function configureTimerNotifications() {
  if (Platform.OS === "web") return;
  const api = await notifications();
  api.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
  if (Platform.OS === "android")
    await api.setNotificationChannelAsync(channelId, {
      name: "Cooking timers",
      importance: api.AndroidImportance.HIGH,
      sound: "default",
    });
}

export async function requestTimerAlerts(): Promise<boolean> {
  if (Platform.OS === "web") return false;
  await configureTimerNotifications();
  const api = await notifications();
  let permission = await api.getPermissionsAsync();
  if (!permission.granted && permission.canAskAgain)
    permission = await api.requestPermissionsAsync();
  return (
    permission.granted ||
    permission.ios?.status === api.IosAuthorizationStatus.PROVISIONAL
  );
}

export async function scheduleTimerAlert(timer: CookingTimer): Promise<string> {
  const api = await notifications();
  return api.scheduleNotificationAsync({
    identifier: timer.id,
    content: {
      title: "Timer finished",
      body: `${timer.recipeTitle} · Step ${timer.stepIndex + 1}`,
      sound: "default",
      data: { recipeId: timer.recipeId },
    },
    trigger: {
      type: api.SchedulableTriggerInputTypes.DATE,
      date: new Date(Math.max(timer.endsAt, Date.now() + 1000)),
      channelId,
    },
  });
}

export async function cancelTimerAlert(timer: CookingTimer) {
  if (!timer.notificationId || Platform.OS === "web") return;
  const api = await notifications();
  await api.cancelScheduledNotificationAsync(timer.notificationId);
  await api.dismissNotificationAsync(timer.notificationId);
}
