import { Touch as Pressable } from "../components/feedback";
import { Text, View } from "react-native";
import { router } from "expo-router";
import { FarmArt, Icon, TomatoMark, TomatoSegments } from "../components/art";
import { Page, s } from "../components/ui";

export default function HomeScreen() {
  const links = [
    { label: "List", path: "/lists", left: "4%", width: "18%", top: "25%" },
    { label: "Pantry", path: "/pantry", left: "23%", width: "25%", top: "25%" },
    {
      label: "Cookbook",
      path: "/cookbook",
      left: "49%",
      width: "29%",
      top: "25%",
    },
    {
      label: "Account",
      path: "/account",
      left: "79%",
      width: "18%",
      top: "25%",
    },
  ] as const;
  return (
    <View style={{ flex: 1 }}>
      <FarmArt />
      <Page bottom={22}>
        <View
          style={{
            flex: 1,
            minHeight: 240,
            justifyContent: "center",
            alignItems: "center",
            paddingBottom: 20,
            gap: 18,
          }}
        >
          <TomatoMark size={46} />
          <Text
            style={[
              s.title,
              { fontSize: 43, lineHeight: 49, textAlign: "center" },
            ]}
          >
            Cabinate
          </Text>
        </View>
        <View style={{ gap: 14, alignItems: "center", paddingBottom: 6 }}>
          <View
            style={{ width: "100%", maxWidth: 450, aspectRatio: 354 / 222 }}
          >
            <TomatoSegments />
            {links.map((link) => (
              <Pressable
                key={link.label}
                accessibilityRole="button"
                accessibilityLabel={`Open ${link.label}`}
                onPress={() => router.push(link.path)}
                style={({ pressed }) => ({
                  position: "absolute",
                  left: link.left,
                  width: link.width,
                  top: link.top,
                  bottom: "14%",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 10,
                  opacity: pressed ? 0.5 : 1,
                })}
              >
                <View
                  style={{
                    width: 28,
                    height: 28,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Icon
                    name={
                      link.label === "Cookbook"
                        ? "book"
                        : link.label === "Account"
                          ? "account"
                          : link.label === "Pantry"
                            ? "pantry"
                            : "list"
                    }
                    size={
                      link.label === "Pantry" || link.label === "Cookbook"
                        ? 28
                        : 21
                    }
                  />
                </View>
                <Text
                  style={{
                    color: "#324A3D",
                    fontSize:
                      link.label === "Pantry" || link.label === "Cookbook"
                        ? 16
                        : 12,
                    fontWeight: "600",
                    lineHeight: 22,
                    textAlign: "center",
                  }}
                >
                  {link.label}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </Page>
    </View>
  );
}
