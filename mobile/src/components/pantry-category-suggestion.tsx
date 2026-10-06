import { useRef, useState } from "react";
import { Text, View } from "react-native";
import { ErrorText, IconButton, Touch, s } from "./ui";
import { useKitchen } from "../state/kitchen-store";
import { pantryApi } from "../services/api";
import type { PantryItem } from "../types/pantry";
import { suggestedPantryCategory } from "../utils/kitchen";

export function PantryCategorySuggestion({ item, disabled, onBusyChange }: {
  item: PantryItem;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
}) {
  const { data, ready, update, upsertPantryItem } = useKitchen();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  const suggested = suggestedPantryCategory(item, data.categoryCorrections);
  const signature = JSON.stringify([item.name, item.category, item.location, suggested]);
  if (!ready || !suggested || data.pantryCategoryDismissals?.[item.id] === signature) return null;
  const act = async (move: boolean) => {
    if (saving.current || disabled) return;
    saving.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      if (move) {
        const updated = await pantryApi.update(item.id, {
          version: item.version, name: item.name, quantity: item.quantity,
          unit: item.unit, category: suggested,
          location: item.location || undefined,
          expirationDate: item.expirationDate || undefined,
        });
        upsertPantryItem(updated);
      } else {
        await update(previous => ({
          ...previous,
          pantryCategoryDismissals: { ...previous.pantryCategoryDismissals, [item.id]: signature },
        }));
      }
    } catch (e) { setError((e as Error).message || "Could not save your choice. Try again."); }
    finally { saving.current = false; setBusy(false); onBusyChange(false); }
  };
  return <View style={{ gap: 4, backgroundColor: "#E6EBD9", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
    <View style={[s.row, { gap: 6 }]}>
      <Text style={[s.body, { flex: 1 }]}>Move to {suggested}?</Text>
      <Touch style={[s.chip, { paddingHorizontal: 12 }]} disabled={disabled || busy} accessibilityLabel={`Move ${item.name} to ${suggested}`} onPress={() => void act(true)}>
        <Text style={s.body}>{busy ? "Saving…" : "Yes"}</Text>
      </Touch>
      <IconButton name="close" label={`Dismiss category suggestion for ${item.name}`} disabled={disabled || busy} onPress={() => void act(false)} />
    </View>
    <ErrorText message={error} />
  </View>;
}
