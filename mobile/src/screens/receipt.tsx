import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Image, Keyboard, Text, View } from "react-native";
import { router } from "expo-router";
import { Button, CheckRow, ErrorText, Field, FormPage, Sheet, Touch, s } from "../components/ui";
import { useFeedback } from "../components/feedback";
import { useFormDraft } from "../components/form-draft";
import { useKitchen, type Receipt } from "../state/kitchen-store";
import { receiptApi } from "../services/api";
import { capturePhoto } from "../services/photos";
import { prepareReceiptImage } from "../services/receipt-image";
import { categories, localDate, newId } from "../utils/kitchen";
import { confirmReceiptFood, receiptConfirmation, receiptReview, receiptRowError, resumeReceiptConfirmation, toggleReceiptRow } from "../utils/receipt-review";
import type { ReceiptDraft, ReceiptReviewRow } from "../types/receipt";

type Phase = "idle" | "picking" | "reading" | "saving" | "adding";
export default function ReceiptScreen() {
  const { data, ready, commit, upsertPantryItem, reload } = useKitchen();
  const { notify } = useFeedback();
  const [receipt, setReceipt] = useState<Receipt | null>(null);
  const [remote, setRemote] = useState<ReceiptDraft | null>(null);
  const [rows, setRows] = useState<ReceiptReviewRow[]>([]);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [dirty, setDirty] = useState(false);
  const [showPhoto, setShowPhoto] = useState(false);
  const [showCapture, setShowCapture] = useState(false);
  const [showSkipped, setShowSkipped] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [replacement, setReplacement] = useState<(() => void) | null>(null);
  const replacementAction = useRef<(() => void) | null>(null);
  const operation = useRef(0);
  const request = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const working = useRef(false);
  const busy = phase !== "idle";
  const adding = phase === "adding";
  const complete = !!receipt?.imported || remote?.status === "IMPORTED";
  const pending = receipt?.pendingConfirmation || (remote ? resumeReceiptConfirmation(remote) : undefined);
  const locked = !!pending || complete;
  const count = pending?.items.length ?? rows.filter((row) => row.selected).length;
  const guard = useFormDraft(dirty, phase !== "idle" && phase !== "reading");
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; operation.current++; request.current?.abort(); };
  }, []);
  const current = (ticket: number) => mounted.current && ticket === operation.current;
  const begin = () => {
    request.current?.abort();
    request.current = new AbortController();
    setError("");
    return { ticket: ++operation.current, controller: request.current };
  };
  const persist = (value: Receipt) => commit((previous) => ({
    ...previous,
    receipts: [value, ...previous.receipts.filter((item) => item.id !== value.id)],
  }));

  const read = async (value: Receipt, ticket: number, controller: AbortController) => {
    setPhase("reading");
    try {
      await persist(value);
      if (!current(ticket) || controller.signal.aborted) return;
      const next = value.draftId
        ? await receiptApi.get(value.draftId, controller.signal)
        : await receiptApi.extract(await prepareReceiptImage(value.uri), controller.signal);
      if (!current(ticket) || controller.signal.aborted) return;
      const review = value.review || receiptReview(next);
      const saved: Receipt = {
        ...value,
        draftId: next.id,
        review,
        pendingConfirmation: next.status === "IMPORTED" ? undefined : resumeReceiptConfirmation(next) || value.pendingConfirmation,
        imported: next.status === "IMPORTED",
      };
      setRemote(next);
      setRows(review);
      setReceipt(saved);
      setDirty(false);
      await persist(saved);
      if (next.status === "IMPORTED") void reload();
    } catch (failure) {
      if (current(ticket) && !controller.signal.aborted)
        setError((failure as Error).message || "Could not read this receipt. Your photo is still here. Try again.");
    } finally {
      if (current(ticket)) { setPhase("idle"); request.current = null; }
    }
  };
  const open = (value: Receipt) => {
    const { ticket, controller } = begin();
    setReceipt(value);
    setRemote(null);
    setRows(value.review || []);
    setDirty(false);
    setShowPhoto(false);
    setShowCapture(false);
    if (value.imported && !value.draftId) { setPhase("idle"); return; }
    void read(value, ticket, controller);
  };
  const replace = (action: () => void) => {
    if (working.current || phase === "picking" || phase === "saving") return;
    if (dirty) setReplacement(() => action);
    else action();
  };
  const pick = async (library: boolean) => {
    if (!ready || working.current) return;
    const { ticket, controller } = begin();
    setPhase("picking");
    try {
      const uri = await capturePhoto(library);
      if (!current(ticket)) return;
      if (!uri) { setPhase("idle"); return; }
      const value = { id: newId(), uri, date: localDate() };
      setReceipt(value);
      setRemote(null);
      setRows([]);
      setDirty(false);
      setShowPhoto(false);
      setShowCapture(false);
      await read(value, ticket, controller);
    } catch (failure) {
      if (current(ticket)) { setError((failure as Error).message); setPhase("idle"); }
    }
  };
  const cancelReading = () => {
    operation.current++;
    request.current?.abort();
    request.current = null;
    setPhase("idle");
    setError("");
  };
  const edit = (lineId: string, change: (row: ReceiptReviewRow) => ReceiptReviewRow) => {
    if (locked || busy) return;
    setRows((previous) => previous.map((row) => row.lineId === lineId ? change(row) : row));
    setDirty(true);
    setError("");
  };
  const saveForLater = async () => {
    if (!receipt || working.current || busy) return;
    working.current = true;
    setPhase("saving");
    setError("");
    try {
      const saved = { ...receipt, review: rows };
      await persist(saved);
      if (mounted.current) { setReceipt(saved); setDirty(false); notify("Receipt saved for later"); }
    } catch { if (mounted.current) setError("Could not save your review. Your changes are still here. Try again."); }
    finally { working.current = false; if (mounted.current) setPhase("idle"); }
  };
  const confirm = async () => {
    if (!receipt?.draftId || !remote || complete || working.current || busy || !ready) return;
    let confirmation;
    try { confirmation = pending || receiptConfirmation(remote.version, rows); }
    catch (failure) { setError((failure as Error).message); return; }
    working.current = true;
    const ticket = operation.current;
    setPhase("adding");
    setError("");
    Keyboard.dismiss();
    let added = false;
    try {
      // Save the exact intent before POST. Lost responses and restarts replay it.
      const saved = { ...receipt, review: rows, pendingConfirmation: confirmation };
      await persist(saved);
      if (!current(ticket)) return;
      setReceipt(saved);
      setDirty(false);
      const result = await receiptApi.confirm(receipt.draftId, confirmation);
      if (!current(ticket)) return;
      added = true;
      if (!pending && remote.status === "READY") result.items.forEach(upsertPantryItem);
      const imported = { ...saved, imported: true, pendingConfirmation: undefined };
      setReceipt(imported);
      setRemote({ ...remote, status: "IMPORTED", importedItems: result.items, confirmedItems: confirmation.items });
      notify(`Added ${result.items.length} food ${result.items.length === 1 ? "item" : "items"} to your pantry`);
      void reload();
      await persist(imported);
    } catch (failure) {
      if (current(ticket)) setError(added
        ? "Your food was added. Could not update the saved receipt. Reopen it to refresh its status."
        : (failure as Error).message || "Could not finish adding these items. Retry the same reviewed items below.");
    } finally { working.current = false; if (current(ticket)) setPhase("idle"); }
  };
  const foodRows = rows.filter((row) => row.kind !== "NON_FOOD" || row.foodConfirmed);
  const skipped = rows.filter((row) => row.kind === "NON_FOOD" && !row.foodConfirmed);

  return (
    <FormPage footer={receipt && phase !== "reading" ? <>
      <ErrorText message={error} />
      {complete ? <Button title="View pantry" icon="check" onPress={() => guard.finish(() => router.dismissTo("/pantry/inventory"))} /> : <>
        {!!remote && <Button title={pending ? `Retry adding ${count} food ${count === 1 ? "item" : "items"}` : `Add ${count} food ${count === 1 ? "item" : "items"}`} pending={adding} disabled={busy || !ready || !count} onPress={() => void confirm()} />}
        {!pending && <Button title="Save review for later" secondary pending={phase === "saving"} disabled={busy || !ready} onPress={() => void saveForLater()} />}
      </>}
    </> : undefined}>
      {guard.guard}
      <Text style={s.title}>{complete ? "Receipt added" : "Scan your receipt"}</Text>
      {!receipt && <ErrorText message={error} />}
      {!receipt && <Text style={s.body}>Take a photo, check the food and amounts, then add what you bought.</Text>}
      {(!receipt || showCapture) && <View style={{ gap: 8 }}>
        <Button title="Take a receipt photo" icon="camera" disabled={!ready || phase === "picking" || adding} onPress={() => replace(() => void pick(false))} />
        <Button title="Choose from photos" secondary disabled={!ready || phase === "picking" || adding} onPress={() => replace(() => void pick(true))} />
      </View>}
      {receipt && <>
        <Touch style={[s.card, s.row, { padding: 12 }]} accessibilityLabel={showPhoto ? "Hide full receipt photo" : "View full receipt photo"} onPress={() => setShowPhoto(!showPhoto)}>
          <Image source={{ uri: receipt.uri }} resizeMode="contain" style={{ width: 60, height: 85, borderRadius: 8 }} />
          <View style={{ flex: 1, gap: 4 }}><Text style={s.heading}>{remote?.store || "Receipt photo"}</Text><Text style={s.muted}>{remote?.purchaseDate || receipt.date}</Text><Text style={s.muted}>{showPhoto ? "Hide photo" : "View photo"}</Text></View>
        </Touch>
        {showPhoto && <Image accessibilityLabel="Full receipt photo" source={{ uri: receipt.uri }} resizeMode="contain" style={{ width: "100%", height: 420, backgroundColor: "#EBEBDF", borderRadius: 16 }} />}
        {phase === "reading" ? <View style={{ gap: 10 }}>
          <View style={s.row}><ActivityIndicator /><Text accessibilityLiveRegion="polite" style={s.body}>Reading your receipt…</Text></View>
          <Button title="Cancel reading" secondary onPress={cancelReading} />
        </View> : <>
          {complete ? <View style={s.card}><Text accessibilityLiveRegion="polite" style={s.heading}>Food added to your pantry</Text><Text style={s.body}>This receipt has already been imported.</Text></View> : pending ? <View style={s.card}>
            <Text style={s.heading}>Finish your confirmed items</Text><Text style={s.body}>These items are saved for retry. Their names and amounts stay fixed so they are added once.</Text>
            {pending.items.map((item) => <Text key={item.lineId} style={s.body}>{item.name} · {item.quantity} {item.unit}</Text>)}
            {!remote && <Button title="Refresh receipt status" secondary disabled={busy || !ready} onPress={() => open(receipt)} />}
          </View> : remote ? <>
            <Text style={s.heading}>Review food items</Text><Text style={s.muted}>Check names and amounts. Anything uncertain stays unchecked until you review it.</Text>
            {foodRows.map((row) => <ReceiptRow key={row.lineId} row={row} disabled={busy} change={(change) => edit(row.lineId, change)} />)}
            {!foodRows.length && <Text style={s.body}>No food items were identified. Check the skipped items below.</Text>}
            {!!skipped.length && <>
              <Touch style={[s.card, { padding: 14 }]} accessibilityState={{ expanded: showSkipped }} onPress={() => setShowSkipped(!showSkipped)}><Text style={s.body}>Skipped items · {skipped.length} {showSkipped ? "−" : "+"}</Text></Touch>
              {showSkipped && skipped.map((row) => <ReceiptRow key={row.lineId} row={row} disabled={busy} change={(change) => edit(row.lineId, change)} />)}
            </>}
          </> : <Button title="Read this receipt" icon="sparkles" disabled={busy || !ready} onPress={() => open(receipt)} />}
          <Button title={showCapture ? "Keep this photo" : "Use another receipt photo"} secondary disabled={busy} onPress={() => setShowCapture(!showCapture)} />
        </>}
      </>}
      {!!data.receipts.length && <>
        <Touch style={[s.card, { padding: 14 }]} accessibilityState={{ expanded: showArchive }} onPress={() => setShowArchive(!showArchive)}><Text style={s.body}>Saved receipts · {data.receipts.length} {showArchive ? "−" : "+"}</Text></Touch>
        {showArchive && data.receipts.map((value) => <Touch key={value.id} disabled={adding || phase === "saving" || phase === "picking"} accessibilityLabel={`Open receipt from ${value.date}${value.imported ? ", already imported" : ""}`} style={[s.card, s.row, { padding: 12 }]} onPress={() => replace(() => open(value))}>
          <Image source={{ uri: value.uri }} style={{ width: 44, height: 58, borderRadius: 8 }} /><View><Text style={s.body}>{value.date}</Text><Text style={s.muted}>{value.imported ? "Added to pantry" : value.draftId ? "Review saved" : "Photo saved"}</Text></View>
        </Touch>)}
      </>}
      <Sheet visible={!!replacement} title="Leave this review?" onClose={() => setReplacement(null)} onDismiss={() => { const action = replacementAction.current; replacementAction.current = null; action?.(); }}>
        <Text style={s.body}>Save your review for later to keep these edits. The receipt photo is already saved.</Text>
        <Button title="Keep reviewing" onPress={() => setReplacement(null)} />
        <Button title="Leave without these edits" destructive onPress={() => { replacementAction.current = replacement; setReplacement(null); }} />
      </Sheet>
    </FormPage>
  );
}

function ReceiptRow({ row, disabled, change }: { row: ReceiptReviewRow; disabled: boolean; change: (change: (row: ReceiptReviewRow) => ReceiptReviewRow) => void }) {
  const [details, setDetails] = useState(false);
  const invalid = row.selected ? receiptRowError(row) : "";
  return <View style={[s.card, { padding: 14, gap: 8 }]}>
    <CheckRow checked={row.selected} title={row.name || row.sourceText} detail={row.sourceText !== row.name ? row.sourceText : undefined} disabled={disabled || !row.foodConfirmed} onPress={() => change(toggleReceiptRow)} />
    {!row.foodConfirmed ? <>
      <Text style={s.muted}>{row.kind === "NON_FOOD" ? "Skipped as a non-food item." : "Check whether this is food before adding it."}</Text>
      <Button title="This is food" secondary disabled={disabled} onPress={() => change(confirmReceiptFood)} />
    </> : <>
      <View style={s.row}>
        <View style={{ flex: 1 }}><Field label="Quantity" value={row.quantity} placeholder="Enter amount" keyboardType="decimal-pad" editable={!disabled} onChangeText={(quantity) => change((value) => ({ ...value, quantity }))} /></View>
        <View style={{ flex: 1 }}><Field label="Unit" value={row.unit} placeholder="pcs, g, ml" maxLength={30} editable={!disabled} onChangeText={(unit) => change((value) => ({ ...value, unit }))} /></View>
      </View>
      {!row.quantity && <Text style={s.muted}>The amount could not be read. Enter what you bought.</Text>}
      <ErrorText message={invalid} />
      <Touch disabled={disabled} accessibilityState={{ expanded: details }} onPress={() => setDetails(!details)}><Text style={s.muted}>{details ? "Hide details" : "Edit name & storage"}</Text></Touch>
      {details && <>
        <Field label="Food name" value={row.name} maxLength={120} editable={!disabled} onChangeText={(name) => change((value) => ({ ...value, name }))} />
        <Text style={s.muted}>For packages, keep the package count or enter the total contents and change the unit.</Text>
        <Text style={s.body}>Category</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{categories.map((category) => <Touch key={category} style={s.chip} disabled={disabled} accessibilityState={{ selected: row.category === category }} onPress={() => change((value) => ({ ...value, category }))}><Text style={s.muted}>{category}</Text></Touch>)}</View>
        <Text style={s.body}>Storage</Text><View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>{["CABINET", "FRIDGE", "FREEZER", "COUNTER"].map((location) => <Touch key={location} style={s.chip} disabled={disabled} accessibilityState={{ selected: row.location === location }} onPress={() => change((value) => ({ ...value, location }))}><Text style={s.muted}>{location.toLowerCase()}</Text></Touch>)}</View>
      </>}
    </>}
  </View>;
}
