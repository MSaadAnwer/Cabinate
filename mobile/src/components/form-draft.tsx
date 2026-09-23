import { useEffect, useRef, useState } from "react";
import { Platform, Text } from "react-native";
import {
  useNavigation,
  usePreventRemove,
  type NavigationAction,
} from "expo-router/react-navigation";
import { Button, Sheet, s } from "./ui";

export function useFormDraft(dirty: boolean, busy: boolean) {
  const navigation = useNavigation();
  const [pendingAction, setPendingAction] = useState<NavigationAction | null>(
    null,
  );
  const [leaving, setLeaving] = useState(false);
  const destination = useRef<(() => void) | null>(null);
  usePreventRemove((dirty || busy) && !leaving, ({ data }) =>
    setPendingAction(data.action),
  );
  useEffect(() => {
    if (leaving) {
      destination.current?.();
      destination.current = null;
    }
  }, [leaving]);
  useEffect(() => {
    if (Platform.OS !== "web" || (!dirty && !busy) || leaving) return;
    const prevent = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", prevent);
    return () => window.removeEventListener("beforeunload", prevent);
  }, [dirty, busy, leaving]);
  const finish = (action: () => void) => {
    destination.current = action;
    setPendingAction(null);
    setLeaving(true);
  };
  const guard = (
    <Sheet
      visible={!!pendingAction}
      title={busy ? "Saving your changes" : "Discard this draft?"}
      onClose={() => setPendingAction(null)}
    >
      <Text style={s.body}>
        {busy
          ? "Keep this screen open while your save finishes."
          : "Your changes haven’t been saved. Keep editing to finish them."}
      </Text>
      <Button title="Keep editing" onPress={() => setPendingAction(null)} />
      {!busy && (
        <Button
          title="Discard draft"
          destructive
          onPress={() => {
            const action = pendingAction;
            if (action) finish(() => navigation.dispatch(action));
          }}
        />
      )}
    </Sheet>
  );
  return { guard, finish };
}
