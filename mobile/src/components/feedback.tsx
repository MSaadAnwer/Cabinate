import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type Ref,
} from "react";
import {
  AccessibilityInfo,
  Animated,
  LayoutAnimation,
  Platform,
  Pressable,
  Text,
  View,
  type PressableProps,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { colors, motion } from "./tokens";

type Feedback = { reduceMotion: boolean; notify: (message: string) => void };
const FeedbackContext = createContext<Feedback>({
  reduceMotion: true,
  notify: () => {},
});

export function selectionFeedback() {
  if (Platform.OS !== "web") void Haptics.selectionAsync().catch(() => {});
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  // Start conservatively until the system accessibility preference is known.
  const [reduceMotion, setReduceMotion] = useState(true);
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const insets = useSafeAreaInsets();
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then((value) => {
      if (active) setReduceMotion(value);
    });
    const subscription = AccessibilityInfo.addEventListener(
      "reduceMotionChanged",
      setReduceMotion,
    );
    return () => {
      active = false;
      subscription.remove();
      clearTimeout(timer.current);
    };
  }, []);
  const notify = useCallback((text: string) => {
    clearTimeout(timer.current);
    setMessage(text);
    AccessibilityInfo.announceForAccessibility(text);
    if (Platform.OS !== "web")
      void Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
    timer.current = setTimeout(() => setMessage(""), 3500);
  }, []);
  return (
    <FeedbackContext value={{ reduceMotion, notify }}>
      {children}
      {!!message && (
        <View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: 24,
            right: 24,
            bottom: insets.bottom + 72,
            alignItems: "center",
          }}
        >
          <Text
            accessibilityLiveRegion="polite"
            style={{
              color: colors.white,
              backgroundColor: colors.ink,
              padding: 14,
              borderRadius: 16,
              fontSize: 15,
            }}
          >
            {message}
          </Text>
        </View>
      )}
    </FeedbackContext>
  );
}

export const useFeedback = () => use(FeedbackContext);

export function useRemovalMotion() {
  const { reduceMotion } = useFeedback();
  return () => {
    if (reduceMotion) return;
    LayoutAnimation.configureNext({
      duration: motion.collapse,
      update: { type: "easeInEaseOut" },
      delete: { type: "easeInEaseOut", property: "opacity" },
    });
  };
}
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** One interruptible press treatment for cards, chips, buttons and icon targets. */
export function Touch({
  style,
  onPressIn,
  onPressOut,
  disabled,
  children,
  ref,
  ...props
}: PressableProps & { ref?: Ref<View> }) {
  const { reduceMotion } = useFeedback();
  const [pressed, setPressed] = useState(false);
  const scale = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    scale.stopAnimation();
    if (reduceMotion || disabled) {
      scale.setValue(1);
      return;
    }
    const animation = pressed
      ? Animated.timing(scale, {
          toValue: motion.scale,
          duration: motion.press,
          useNativeDriver: Platform.OS !== "web",
        })
      : Animated.spring(scale, {
          toValue: 1,
          speed: 28,
          bounciness: 0,
          useNativeDriver: Platform.OS !== "web",
        });
    animation.start();
    return () => animation.stop();
  }, [pressed, reduceMotion, disabled, scale]);
  return (
    <AnimatedPressable
      {...props}
      ref={ref}
      disabled={disabled}
      accessibilityRole={props.accessibilityRole || "button"}
      accessibilityState={{ ...props.accessibilityState, disabled: !!disabled }}
      aria-checked={props.accessibilityState?.checked}
      aria-selected={props.accessibilityState?.selected}
      aria-expanded={props.accessibilityState?.expanded}
      aria-busy={props.accessibilityState?.busy}
      aria-disabled={!!disabled}
      onPressIn={(event) => {
        setPressed(true);
        onPressIn?.(event);
      }}
      onPressOut={(event) => {
        setPressed(false);
        onPressOut?.(event);
      }}
      style={[
        typeof style === "function" ? style({ pressed }) : style,
        {
          opacity: disabled ? 0.45 : pressed ? 0.78 : 1,
          transform: [{ scale }],
        },
      ]}
    >
      {typeof children === "function" ? children({ pressed }) : children}
    </AnimatedPressable>
  );
}
