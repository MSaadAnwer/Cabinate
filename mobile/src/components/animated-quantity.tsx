import { useEffect, useRef, useState } from "react";
import { Animated, Easing, Text } from "react-native";
import { useFeedback } from "./feedback";
import { s } from "./ui";

/** Animate confirmed stock changes without native layout/deletion animations. */
export function AnimatedQuantity({ quantity, unit }: { quantity: number; unit: string }) {
  const { reduceMotion } = useFeedback();
  const value = useRef(new Animated.Value(quantity)).current;
  const previous = useRef({ quantity, unit });
  const [display, setDisplay] = useState(quantity);

  useEffect(() => {
    value.stopAnimation();
    const before = previous.current;
    previous.current = { quantity, unit };
    if (reduceMotion || before.unit !== unit || before.quantity === quantity) {
      value.setValue(quantity);
      setDisplay(quantity);
      return;
    }
    const precision = Math.min(6, Math.max(
      (String(before.quantity).split(".")[1] || "").length,
      (String(quantity).split(".")[1] || "").length,
    ));
    const listener = value.addListener(({ value: next }) => {
      setDisplay(Number(next.toFixed(precision)));
    });
    const animation = Animated.timing(value, {
      toValue: quantity,
      duration: 360,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start(({ finished }) => {
      if (finished) setDisplay(quantity);
    });
    return () => {
      animation.stop();
      value.removeListener(listener);
    };
  }, [quantity, unit, reduceMotion, value]);

  return <Text style={s.body} accessibilityLabel={`${quantity} ${unit}`} accessibilityLiveRegion="polite">
    {reduceMotion ? quantity : display} {unit}
  </Text>;
}
