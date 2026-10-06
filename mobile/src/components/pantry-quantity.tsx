import { useEffect, useRef, useState } from "react";
import { Text, View } from "react-native";
import { Button, ErrorText, Touch, s } from "./ui";
import { useKitchen } from "../state/kitchen-store";
import { pantryApi } from "../services/api";
import type { PantryItem } from "../types/pantry";
import { adjustUsage, remainingStock, restockedQuantity, stockQuantity, usageStep } from "../utils/pantry-quantity";

export function PantryQuantity({ item, mode, onModeChange, onBusyChange }: {
  item: PantryItem;
  mode: "use" | "add" | null;
  onModeChange: (mode: "use" | "add" | null) => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const open = mode !== null;
  const adding = mode === "add";
  const [amount, setAmount] = useState("1");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const saving = useRef(false);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  const { upsertPantryItem, deletePantryItem } = useKitchen();
  // Older entries saved as dozens can also be consumed one piece at a time.
  const stock = ["dozen", "dozens", "dz"].includes(item.unit.trim().toLowerCase())
    ? stockQuantity(item.quantity, item.unit)
    : { quantity: item.quantity, unit: item.unit };
  useEffect(() => {
    setAmount(String(adding ? 1 : Math.min(1, stock.quantity)));
    setError("");
  }, [mode, item.id]);
  const used = Number(amount);
  const step = usageStep(stock.unit, adding ? Infinity : stock.quantity);
  let remaining: number | undefined;
  try { remaining = adding ? restockedQuantity(stock.quantity, used) : remainingStock(stock.quantity, used); } catch {}
  const valid = remaining !== undefined;
  const save = async () => {
    if (saving.current || !valid) return;
    saving.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    try {
      if (remaining === 0) {
        // Avoid a native layout deletion animation while this card's controls
        // are also animating/unmounting after the request completes.
        await deletePantryItem(item.id, item.version);
      } else {
        const updated = await pantryApi.update(item.id, {
          version: item.version, name: item.name, quantity: remaining!, unit: stock.unit,
          category: item.category || undefined, location: item.location || undefined,
          expirationDate: item.expirationDate || undefined,
        });
        upsertPantryItem(updated);
      }
      if (mounted.current) {
        onModeChange(null);
        setAmount(String(Math.min(1, remaining || stock.quantity)));
      }
    } catch (e) { if (mounted.current) setError((e as Error).message); }
    finally { saving.current = false; onBusyChange(false); if (mounted.current) setBusy(false); }
  };
  if (!open) return null;
  return <View style={{ gap: 10 }}>
    <Touch style={s.chip} disabled={busy} accessibilityLabel="Cancel adjustment" onPress={() => { onModeChange(null); setError(""); }}>
      <Text style={s.body}>Cancel adjustment</Text>
    </Touch>
    {open && <>
      <Text style={s.body}>Amount {adding ? "to add" : "used"} ({stock.unit})</Text>
      <View style={[s.row, { justifyContent: "center" }]}>
        <Touch style={[s.chip, { minWidth: 52, alignItems: "center" }]} accessibilityLabel={`Decrease amount ${adding ? "to add" : "used"} by ${step} ${stock.unit}`} disabled={busy || used <= step} onPress={() => setAmount(String(adjustUsage(used, -1, step, adding ? Infinity : stock.quantity)))}><Text style={[s.heading, { fontSize: 24 }]}>−</Text></Touch>
        <Text accessibilityLiveRegion="polite" style={[s.heading, { minWidth: 72, textAlign: "center" }]}>{amount}</Text>
        <Touch style={[s.chip, { minWidth: 52, alignItems: "center" }]} accessibilityLabel={`Increase amount ${adding ? "to add" : "used"} by ${step} ${stock.unit}`} disabled={busy || (!adding && used >= stock.quantity)} onPress={() => setAmount(String(adjustUsage(used, 1, step, adding ? Infinity : stock.quantity)))}><Text style={[s.heading, { fontSize: 24 }]}>+</Text></Touch>
      </View>
      {!adding && <Touch style={[s.chip, { alignSelf: "flex-start" }]} disabled={busy} onPress={() => setAmount(String(stock.quantity))}><Text style={s.body}>Used all</Text></Touch>}
      <Text style={s.muted}>{!valid ? "Choose a valid positive amount." : remaining === 0 ? "This removes the item and its expiration reminder." : adding ? `${stock.quantity} + ${used} = ${remaining} ${stock.unit}` : `${remaining} ${stock.unit} will remain.`}</Text>
      <ErrorText message={error} />
      <Button title="Confirm" disabled={!valid} pending={busy} onPress={() => void save()} />
    </>}
  </View>;
}
