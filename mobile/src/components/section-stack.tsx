import { Stack, router } from "expo-router";
import { colors, IconButton } from "./ui";
import { useFeedback } from "./feedback";

export function SectionStack({
  title,
  detail,
  detailTitle,
}: {
  title: string;
  detail?: string;
  detailTitle?: string;
}) {
  const { reduceMotion } = useFeedback();
  return (
    <Stack
      screenOptions={{
        contentStyle: { backgroundColor: colors.cream },
        headerStyle: { backgroundColor: colors.cream },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        headerBackButtonDisplayMode: "minimal",
        headerTitleStyle: { fontFamily: "Georgia" },
        animation: reduceMotion ? "none" : "default",
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title,
          headerLeft: () => (
            <IconButton
              name="home"
              label="Go home"
              onPress={() => router.dismissTo("/")}
            />
          ),
          headerRight: () => (
            <IconButton
              name="calendar"
              label="Meal calendar"
              onPress={() => router.push("/calendar")}
            />
          ),
        }}
      />
      {detail && (
        <Stack.Screen name={detail} options={{ title: detailTitle }} />
      )}
    </Stack>
  );
}
