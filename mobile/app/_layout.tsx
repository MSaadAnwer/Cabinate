import { FeedbackProvider, useFeedback } from "../src/components/feedback";
import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { KitchenProvider, useKitchen } from "../src/state/kitchen-store";
import { colors, IconButton } from "../src/components/ui";
import { CookingTimerProvider } from "../src/state/cooking-timers";
import { TimerTray } from "../src/components/cooking-timers";
import { AuthProvider, useAuth } from "../src/state/auth";

export default function Layout() {
  return (
    <FeedbackProvider>
      <AuthProvider>
        <AccountKitchen />
      </AuthProvider>
    </FeedbackProvider>
  );
}
function AccountKitchen() {
  const { identity } = useAuth();
  return (
    <KitchenProvider key={identity.accountId} accountId={identity.accountId} development={identity.development}>
        <CookingTimerProvider>
          <Navigator />
        </CookingTimerProvider>
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
          headerTitleStyle: { fontFamily: "Georgia", fontSize: 26 },
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
            title: "",
            headerTitle: "",
            headerTitleAlign: "center",
            headerLeft: () => (
              <IconButton
                name="bell"
                size={27}
                label="Notifications"
                onPress={() => router.push("/notifications")}
              />
            ),
            headerRight: () => (
                <IconButton
                  name="calendar"
                  size={27}
                  label="Meal calendar"
                  onPress={() => router.push("/calendar")}
                />
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
          options={{ title: "Inspiration" }}
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
      <TimerTray />
    </View>
  );
}
