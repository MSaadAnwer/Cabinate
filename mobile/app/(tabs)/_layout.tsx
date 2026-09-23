import { Tabs, router } from "expo-router";
import { View } from "react-native";
import { Icon, type IconName } from "../../src/components/art";
import { colors, IconButton } from "../../src/components/ui";

const sections: { name: string; title: string; icon: IconName }[] = [
  { name: "lists", title: "List", icon: "list" },
  { name: "pantry", title: "Pantry", icon: "pantry" },
  { name: "cookbook", title: "Cookbook", icon: "book" },
  { name: "account", title: "Account", icon: "account" },
];

export default function TabLayout() {
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
        headerTitleStyle: { fontFamily: "Georgia" },
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
