import { Touch as Pressable } from "../components/feedback";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { FarmArt, TomatoMark } from "../components/art";
import { KitchenNavigationArt } from "../components/kitchen-navigation-art";
import { useContentLayout } from "../components/content-layout";
import { Page, s } from "../components/ui";

const links = [
  { label: "Lists", path: "/lists", object: "notepad" },
  { label: "Pantry", path: "/pantry", object: "jar" },
  { label: "Cookbook", path: "/cookbook", object: "board" },
  { label: "Account", path: "/account", object: "pot" },
] as const;

export default function HomeScreen() {
  const { singleColumn } = useContentLayout();
  return (
    <View style={{ flex: 1 }}>
      <FarmArt />
      <Page bottom={22} contentContainerStyle={{ alignItems: "center", gap: 16, paddingTop: 48 }}>
        <View style={{ minHeight: 130, justifyContent: "center", alignItems: "center", gap: 10 }}>
          <TomatoMark size={40} />
          <Text style={[s.title, { fontSize: 40, lineHeight: 47, textAlign: "center" }]}>Cabinate</Text>
        </View>
        <View style={{ width: "100%", maxWidth: 480, flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: 14 }}>
          {links.map(link => (
            <Pressable
              key={link.label}
              accessibilityRole="button"
              accessibilityLabel={`Open ${link.label}`}
              onPress={() => router.push(link.path)}
              style={{ width: singleColumn ? "100%" : "48%", minHeight: 152, paddingVertical: 8, alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 18 }}
            >
              <View accessible={false} accessibilityElementsHidden importantForAccessibility="no-hide-descendants" style={{ width: "100%", alignItems: "center" }}>
                <KitchenNavigationArt object={link.object} />
              </View>
              <Text style={[s.heading, { fontSize: 21, textAlign: "center" }]}>{link.label}</Text>
            </Pressable>
          ))}
        </View>
      </Page>
    </View>
  );
}
