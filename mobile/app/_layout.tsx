import { Stack, router } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { Text, View } from "react-native";
import { KitchenProvider, useKitchen } from "../src/state/kitchen-store";
import { colors, IconButton } from "../src/components/ui";
import { TomatoMark } from "../src/components/art";

export default function Layout() {
  return (
    <KitchenProvider>
      <Navigator />
    </KitchenProvider>
  );
}
function Navigator() {
  const { storageError } = useKitchen();
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
        {["pantry", "lists", "cookbook", "account"].map((name) => (
          <Stack.Screen
            key={name}
            name={name}
            options={{
              // Primary sections are peers, not successive pages in a flow.
              animation: "none",
              gestureEnabled: false,
              title:
                name === "lists"
                  ? "List"
                  : name[0].toUpperCase() + name.slice(1),
              headerLeft: () => (
                <IconButton
                  name="back"
                  label="Back to home"
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
        ))}
        <Stack.Screen name="inventory" options={{ title: "Pantry items" }} />
        <Stack.Screen name="list-detail" options={{ title: "Grocery list" }} />
        <Stack.Screen name="recipe-detail" options={{ title: "Recipe" }} />
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
                  onPress={() => router.back()}
                />
              ),
            }}
          />
        ))}
      </Stack>
    </View>
  );
}
