import { FeedbackProvider, useFeedback } from "../src/components/feedback";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { KitchenProvider, useKitchen } from "../src/state/kitchen-store";
import { colors, IconButton } from "../src/components/ui";
import { TomatoMark } from "../src/components/art";

export default function Layout() {
  return (
    <KitchenProvider>
      <FeedbackProvider>
        <Navigator />
      </FeedbackProvider>
    </KitchenProvider>
  );
}
function Navigator() {
  const { storageError } = useKitchen();
  const { reduceMotion } = useFeedback();
  return (
    <View style={{ flex: 1 }}>
      <StatusBar style="dark" />
      {!!storageError && (
        <Text
          accessibilityRole="alert"
          selectable
          style={{ padding: 20, backgroundColor: "#F2DAD0", color: colors.red }}
        >
          {storageError}
        </Text>
      )}
      <Stack
        screenOptions={{
          animation: reduceMotion ? "none" : "default",
          contentStyle: { backgroundColor: colors.cream },
          headerStyle: { backgroundColor: colors.cream },
          headerTintColor: colors.ink,
          headerShadowVisible: false,
          headerBackButtonDisplayMode: "minimal",
          headerTitleStyle: { fontFamily: "Georgia" },
          headerRight: () => (
            <IconButton
              name="home"
              label="Go home"
              onPress={() => router.dismissTo("/")}
            />
          ),
        }}
      >
        <Stack.Screen
          name="index"
          options={{
            title: "Cabinate",
            headerTitle: () => (
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 7 }}
              >
                <TomatoMark size={27} />
                <Text
                  style={{
                    fontFamily: "Georgia",
                    fontSize: 23,
                    color: colors.ink,
                  }}
                >
                  cabinate
                </Text>
              </View>
            ),
            headerTitleAlign: "left",
            headerRight: () => (
              <View style={{ flexDirection: "row", gap: 5 }}>
                <IconButton
                  name="bell"
                  label="Notifications"
                  onPress={() => router.push("/notifications")}
                />
                <IconButton
                  name="calendar"
                  label="Meal calendar"
                  onPress={() => router.push("/calendar")}
                />
              </View>
            ),
          }}
        />
        <Stack.Screen
          name="(tabs)"
          options={{ title: "Kitchen", headerShown: false, animation: "none" }}
        />
        <Stack.Screen name="inventory" options={{ headerShown: false }} />
        <Stack.Screen name="recalls" options={{ title: "Recalls" }} />
        <Stack.Screen name="list-detail" options={{ headerShown: false }} />
        <Stack.Screen name="recipe-detail" options={{ headerShown: false }} />
        <Stack.Screen name="calendar" options={{ title: "Kitchen calendar" }} />
        <Stack.Screen
          name="notifications"
          options={{ title: "Notifications" }}
        />
        <Stack.Screen
          name="inspiration"
          options={{ title: "Dinner inspiration" }}
        />
        <Stack.Screen name="captures" options={{ title: "Capture inbox" }} />
        {[
          "add-pantry",
          "new-list",
          "add-recipe",
          "capture-link",
          "receipt",
          "import-list",
        ].map((name) => (
          <Stack.Screen
            key={name}
            name={name}
            options={{
              presentation: "modal",
              headerBackVisible: false,
              title: (
                {
                  "add-pantry": "Add an item",
                  "new-list": "New list",
                  "add-recipe": "Save a recipe",
                  "capture-link": "Save a link",
                  receipt: "Receipt photo",
                  "import-list": "From your cookbook",
                } as Record<string, string>
              )[name],
              headerRight: () => (
                <IconButton
                  name="close"
                  label="Close form"
                  onPress={() =>
                    router.canGoBack() ? router.back() : router.replace("/")
                  }
                />
              ),
            }}
          />
        ))}
      </Stack>
    </View>
  );
}
