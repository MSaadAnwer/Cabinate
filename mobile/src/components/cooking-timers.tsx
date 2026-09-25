import { ScrollView, Text, View } from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useCookingTimers } from "../state/cooking-timers";
import { countdown, remainingSeconds, stepDurations } from "../utils/durations";
import { Button, ErrorText, IconButton, Touch, colors, s } from "./ui";

export function StepTimers({
  recipeId,
  recipeTitle,
  stepIndex,
  step,
}: {
  recipeId: string;
  recipeTitle: string;
  stepIndex: number;
  step: string;
}) {
  const { timers, start, stop, busy, ready, now } = useCookingTimers();
  const durations = stepDurations(step);
  if (!durations.length) return null;
  return (
    <View style={{ gap: 8, paddingBottom: 16 }}>
      {durations.map((duration, durationIndex) => {
        const timer = timers.find(
          (value) =>
            value.recipeId === recipeId &&
            value.stepIndex === stepIndex &&
            value.durationIndex === durationIndex,
        );
        const remaining = timer ? remainingSeconds(timer.endsAt, now) : 0;
        return (
          <View key={durationIndex} style={{ gap: 6 }}>
            {timer && (
              <Text
                style={s.body}
                accessibilityLiveRegion={remaining ? "none" : "polite"}
              >
                {remaining
                  ? `Time remaining: ${countdown(remaining)}`
                  : "Timer finished"}
              </Text>
            )}
            {timer && !timer.notificationId && remaining > 0 && (
              <Text style={s.muted}>Keep the app open for the alert.</Text>
            )}
            <Button
              secondary
              disabled={busy || !ready}
              title={
                timer
                  ? remaining
                    ? "Cancel timer"
                    : "Dismiss timer"
                  : `Start timer · ${duration.label}`
              }
              onPress={() => {
                void (timer
                  ? stop(timer)
                  : start({
                      recipeId,
                      recipeTitle,
                      stepIndex,
                      durationIndex,
                      seconds: duration.seconds,
                    }));
              }}
            />
          </View>
        );
      })}
    </View>
  );
}

export function TimerTray() {
  const { timers, now, busy, stop, error } = useCookingTimers();
  const insets = useSafeAreaInsets();
  if (!timers.length && !error) return null;
  return (
    <View
      style={{
        backgroundColor: colors.cream,
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: Math.max(insets.bottom, 8),
        borderTopWidth: 1,
        borderTopColor: colors.selected,
      }}
    >
      <ErrorText message={error} />
      <ScrollView style={{ maxHeight: 150 }} contentContainerStyle={{ gap: 8 }}>
        {timers.map((timer) => {
          const remaining = remainingSeconds(timer.endsAt, now);
          return (
            <View key={timer.id} style={s.row}>
              <Touch
                style={{ flex: 1, paddingVertical: 6 }}
                onPress={() =>
                  router.push({
                    pathname: "/cookbook/recipe",
                    params: { id: timer.recipeId, tab: "steps" },
                  })
                }
              >
                <Text style={s.body}>
                  {remaining ? countdown(remaining) : "Timer finished"} · Step{" "}
                  {timer.stepIndex + 1}
                </Text>
                <Text style={s.muted} numberOfLines={1}>
                  {timer.recipeTitle}
                </Text>
                {!timer.notificationId && remaining > 0 && (
                  <Text style={s.muted}>Keep app open for alert</Text>
                )}
              </Touch>
              <IconButton
                name="close"
                label={`${remaining ? "Cancel" : "Dismiss"} timer for ${timer.recipeTitle}, step ${timer.stepIndex + 1}`}
                disabled={busy}
                onPress={() => {
                  void stop(timer);
                }}
              />
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}
