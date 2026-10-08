import { forwardRef, useCallback, useLayoutEffect, useRef } from "react";
import { Platform, TextInput, type TextInputProps } from "react-native";
import { createInputText } from "../utils/input-text";

// UIKit owns edits and selection; React receives text for validation/saving.
// Only intentional external changes (clear, suggestion, preset) write back.
export const AppTextInput = forwardRef<TextInput, TextInputProps>(
  function AppTextInput({ value, defaultValue, onChangeText, ...props }, ref) {
    const input = useRef<TextInput | null>(null);
    const initial = useRef(value ?? defaultValue ?? "");
    const tracker = useRef<ReturnType<typeof createInputText> | null>(null);
    if (!tracker.current) tracker.current = createInputText(initial.current);
    const bind = useCallback((node: TextInput | null) => {
      input.current = node;
      if (typeof ref === "function") ref(node);
      else if (ref) ref.current = node;
    }, [ref]);

    useLayoutEffect(() => {
      if (Platform.OS !== "ios" || value === undefined) return;
      const replacement = tracker.current!.receive(value);
      if (replacement !== undefined) {
        input.current?.setNativeProps({ text: replacement });
      }
    });

    return <TextInput
      {...props}
      ref={bind}
      {...(Platform.OS === "ios"
        ? { defaultValue: initial.current }
        : { value, defaultValue })}
      onChangeText={(text) => {
        if (Platform.OS === "ios" && value !== undefined) tracker.current!.type(text);
        onChangeText?.(text);
      }}
    />;
  },
);
