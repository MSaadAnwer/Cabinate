import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  AccessibilityInfo,
  Alert,
  Animated,
  KeyboardAvoidingView,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type ScrollViewProps,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Icon, TomatoMark, type IconName } from "./art";

export const colors = {
  cream: "#F8F5EA",
  ink: "#324A3D",
  muted: "#7E8575",
  line: "#E1E2D4",
  green: "#657C50",
  white: "#FFFEF7",
  red: "#AD5543",
};
export const s = StyleSheet.create({
  title: {
    fontFamily: "Georgia",
    fontSize: 34,
    color: colors.ink,
    letterSpacing: -1,
    lineHeight: 41,
  },
  heading: { fontFamily: "Georgia", fontSize: 23, color: colors.ink },
  body: { fontSize: 15, lineHeight: 23, color: colors.ink },
  muted: { fontSize: 13, lineHeight: 20, color: colors.muted },
  eyebrow: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 2.3,
    color: colors.green,
    textTransform: "uppercase",
  },
  card: {
    padding: 20,
    gap: 9,
    backgroundColor: colors.white,
    borderRadius: 22,
    borderCurve: "continuous",
    borderWidth: 1,
    borderColor: colors.line,
  },
  row: { flexDirection: "row", alignItems: "center", gap: 12 },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.white,
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 16,
  },
  chip: {
    paddingHorizontal: 15,
    paddingVertical: 11,
    minHeight: 44,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: colors.line,
  },
});
export function Page({
  children,
  bottom = 100,
  ...props
}: ScrollViewProps & { children: ReactNode; bottom?: number }) {
  const insets = useSafeAreaInsets();
  return (
    <ScrollView
      keyboardShouldPersistTaps="handled"
      contentInsetAdjustmentBehavior="automatic"
      {...props}
      contentContainerStyle={{
        padding: 24,
        paddingBottom: bottom + insets.bottom,
        gap: 20,
        flexGrow: 1,
      }}
    >
      {children}
    </ScrollView>
  );
}
export function FormPage({ children }: { children: ReactNode }) {
  return (
    <KeyboardAvoidingView
      behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
      style={{ flex: 1 }}
      keyboardVerticalOffset={95}
    >
      <Page>{children}</Page>
    </KeyboardAvoidingView>
  );
}
export function Button({
  title,
  onPress,
  secondary,
  disabled,
  icon,
}: {
  title: string;
  onPress: () => void;
  secondary?: boolean;
  disabled?: boolean;
  icon?: IconName;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 52,
        padding: 14,
        borderRadius: 16,
        backgroundColor: secondary ? "#E9ECDC" : colors.ink,
        opacity: disabled ? 0.45 : pressed ? 0.72 : 1,
        flexDirection: "row",
        gap: 10,
        justifyContent: "center",
        alignItems: "center",
      })}
    >
      {icon && (
        <Icon name={icon} color={secondary ? colors.ink : colors.cream} />
      )}
      <Text
        style={{
          fontSize: 15,
          fontWeight: "600",
          color: secondary ? colors.ink : colors.cream,
          flexShrink: 1,
          textAlign: "center",
        }}
      >
        {title}
      </Text>
    </Pressable>
  );
}
export function IconButton({
  name,
  label,
  onPress,
}: {
  name: IconName;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 44,
        height: 44,
        flexShrink: 0,
        justifyContent: "center",
        alignItems: "center",
        opacity: pressed ? 0.5 : 1,
      })}
    >
      <Icon name={name} />
    </Pressable>
  );
}
export function Field({ label, ...props }: TextInputProps & { label: string }) {
  return (
    <View style={{ gap: 7 }}>
      <Text style={{ ...s.muted, color: colors.ink, fontWeight: "600" }}>
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor="#929889"
        {...props}
        style={[
          s.input,
          props.multiline && { minHeight: 120, textAlignVertical: "top" },
          props.style,
        ]}
      />
    </View>
  );
}
export function Empty({ title, text }: { title: string; text: string }) {
  return (
    <View style={{ paddingVertical: 36, alignItems: "center", gap: 14 }}>
      <TomatoMark size={45} />
      <Text style={s.heading}>{title}</Text>
      <Text style={[s.muted, { textAlign: "center", maxWidth: 270 }]}>
        {text}
      </Text>
    </View>
  );
}
export function CheckRow({
  checked,
  title,
  detail,
  onPress,
}: {
  checked: boolean;
  title: string;
  detail?: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={title}
      onPress={onPress}
      style={[
        s.row,
        {
          paddingVertical: 14,
          borderBottomWidth: 1,
          borderBottomColor: colors.line,
        },
      ]}
    >
      <View
        style={{
          width: 26,
          height: 26,
          flexShrink: 0,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: colors.green,
          backgroundColor: checked ? colors.green : "transparent",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {checked && <Icon name="check" size={18} color={colors.cream} />}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            s.body,
            checked && {
              textDecorationLine: "line-through",
              color: colors.muted,
            },
          ]}
        >
          {title}
        </Text>
        {detail && <Text style={s.muted}>{detail}</Text>}
      </View>
    </Pressable>
  );
}
export function ErrorText({ message }: { message: string }) {
  return message ? (
    <Text
      accessibilityRole="alert"
      selectable
      style={[s.body, { color: colors.red }]}
    >
      {message}
    </Text>
  ) : null;
}
export function reportError(error: unknown) {
  Alert.alert(
    "Could not save",
    (error as Error).message || "Please try again.",
  );
}
export function FloatingAdd({
  actions,
}: {
  actions: { title: string; icon: IconName; onPress: () => void }[];
}) {
  const [open, setOpen] = useState(false);
  const [visible, setVisible] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const reduce = useRef(false);
  const inset = useSafeAreaInsets();
  useEffect(() => {
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      reduce.current = value;
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      (value) => {
        reduce.current = value;
      },
    );
    return () => subscription.remove();
  }, []);
  const toggle = (next: boolean) => {
    setOpen(next);
    if (next) setVisible(true);
    Animated.timing(progress, {
      toValue: next ? 1 : 0,
      duration: reduce.current ? 0 : 220,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished && !next) setVisible(false);
    });
  };
  return (
    <View
      pointerEvents="box-none"
      style={{
        position: "absolute",
        bottom: 76 + inset.bottom,
        left: 24,
        right: 24,
        alignItems: "flex-start",
        gap: 12,
      }}
    >
      {visible && (
        <Animated.View
          pointerEvents={open ? "auto" : "none"}
          style={{
            gap: 10,
            maxWidth: "100%",
            opacity: progress,
            transform: [
              {
                translateY: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: [18, 0],
                }),
              },
            ],
          }}
        >
          {actions.map((action) => (
            <Pressable
              key={action.title}
              accessibilityRole="button"
              accessibilityLabel={action.title}
              onPress={() => {
                toggle(false);
                action.onPress();
              }}
              style={[
                s.row,
                {
                  backgroundColor: colors.white,
                  borderRadius: 30,
                  paddingRight: 18,
                  boxShadow: "0 3px 16px #324A3D16",
                },
              ]}
            >
              <View
                style={{
                  width: 48,
                  height: 48,
                  flexShrink: 0,
                  borderRadius: 24,
                  backgroundColor: "#E9ECDC",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Icon name={action.icon} />
              </View>
              <Text style={[s.body, { flexShrink: 1, paddingVertical: 8 }]}>
                {action.title}
              </Text>
            </Pressable>
          ))}
        </Animated.View>
      )}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={open ? "Close add menu" : "Open add menu"}
        accessibilityState={{ expanded: open }}
        onPress={() => toggle(!open)}
        style={{
          width: 58,
          height: 58,
          borderRadius: 29,
          backgroundColor: colors.ink,
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 4px 12px #324A3D22",
        }}
      >
        <Animated.View
          style={{
            transform: [
              {
                rotate: progress.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0deg", "45deg"],
                }),
              },
            ],
          }}
        >
          <Icon name="plus" color={colors.cream} size={28} />
        </Animated.View>
      </Pressable>
    </View>
  );
}
const destinations = [
  { path: "/lists", title: "List", icon: "list" },
  { path: "/pantry", title: "Pantry", icon: "pantry" },
  { path: "/cookbook", title: "Cookbook", icon: "book" },
  { path: "/account", title: "Account", icon: "account" },
] as const;
export function BottomNav({ active }: { active: string }) {
  const inset = useSafeAreaInsets();
  return (
    <View
      style={{
        flexDirection: "row",
        paddingHorizontal: 12,
        paddingTop: 10,
        paddingBottom: Math.max(inset.bottom, 12),
        borderTopWidth: 1,
        borderTopColor: colors.line,
        backgroundColor: colors.cream,
      }}
    >
      {destinations.map((item) => (
        <Pressable
          key={item.path}
          accessibilityRole="tab"
          accessibilityState={{ selected: active === item.title }}
          onPress={() => {
            if (active !== item.title) router.replace(item.path);
          }}
          style={{
            flex: 1,
            alignItems: "center",
            minHeight: 46,
            gap: 4,
            opacity: active === item.title ? 1 : 0.55,
          }}
        >
          <Icon name={item.icon} />
          <Text
            style={{
              fontSize: 11,
              color: colors.ink,
              fontWeight: active === item.title ? "700" : "400",
            }}
          >
            {item.title}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}
