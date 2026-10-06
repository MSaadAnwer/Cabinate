import { Tabs, router } from "expo-router";
import { NativeTabs } from "expo-router/unstable-native-tabs";
import { DynamicColorIOS, Platform, View } from "react-native";
import { Icon, type IconName } from "../../src/components/art";
import { colors, IconButton } from "../../src/components/ui";

const sections: { name: string; title: string; icon: IconName }[] = [
  { name: "lists", title: "List", icon: "list" },
  { name: "pantry", title: "Pantry", icon: "pantry" },
  { name: "cookbook", title: "Cookbook", icon: "book" },
  { name: "account", title: "Account", icon: "account" },
];

export const unstable_settings = { initialRouteName: "lists" };

export default function TabLayout() {
  if (Platform.OS === "ios") {
    const tint = DynamicColorIOS({ light: colors.ink, dark: colors.white });
    return (
      <NativeTabs tintColor={tint} labelStyle={{ fontSize: 11, color: tint }} minimizeBehavior="never">
        <NativeTabs.Trigger name="lists" accessibilityLabel="List">
          <NativeTabs.Trigger.Label>List</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf="checklist" />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="pantry" accessibilityLabel="Pantry">
          <NativeTabs.Trigger.Label>Pantry</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "cabinet", selected: "cabinet.fill" }} />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="cookbook" accessibilityLabel="Cookbook">
          <NativeTabs.Trigger.Label>Cookbook</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "book", selected: "book.fill" }} />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="account" accessibilityLabel="Account">
          <NativeTabs.Trigger.Label>Account</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: "person.crop.circle", selected: "person.crop.circle.fill" }} />
        </NativeTabs.Trigger>
      </NativeTabs>
    );
  }
  return (
    <Tabs
      initialRouteName="lists"
      backBehavior="history"
      screenOptions={{
        headerShown: false,
        animation: "none",
        headerStyle: { backgroundColor: colors.cream },
        headerTintColor: colors.ink,
        headerShadowVisible: false,
        headerTitleStyle: { fontFamily: "Georgia", fontSize: 26 },
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
        sceneStyle: { backgroundColor: colors.cream },
        tabBarStyle: {
          backgroundColor: colors.cream,
          borderTopColor: colors.line,
          borderTopWidth: 1,
        },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontSize: 11 },
        tabBarHideOnKeyboard: true,
        lazy: true,
      }}
    >
      {sections.map((section) => (
        <Tabs.Screen
          key={section.name}
          name={section.name}
          options={{
            title: section.title,
            tabBarIcon: ({ focused }) => (
              <View
                style={{
                  width: 36,
                  height: 30,
                  borderRadius: 15,
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: focused ? "#E6EBD9" : "transparent",
                }}
              >
                <Icon
                  name={section.icon}
                  size={22}
                  color={focused ? colors.ink : colors.muted}
                />
              </View>
            ),
            tabBarAccessibilityLabel: section.title,
          }}
        />
      ))}
    </Tabs>
  );
}
