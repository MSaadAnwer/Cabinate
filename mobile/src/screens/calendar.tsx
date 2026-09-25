import {
  Touch as Pressable,
  useFeedback,
  useRemovalMotion,
} from "../components/feedback";
import { useFormDraft } from "../components/form-draft";
import { useContentLayout } from "../components/content-layout";
import { useRef, useState } from "react";
import { Image, Text, View } from "react-native";
import {
  Button,
  ErrorText,
  DataNotice,
  Field,
  FormPage,
  IconButton,
  Sheet,
  focusControl,
  s,
} from "../components/ui";
import { useKitchen, type PhotoEntry } from "../state/kitchen-store";
import { capturePhoto } from "../services/photos";
import { expiryLabel, localDate, newId } from "../utils/kitchen";

export default function CalendarScreen() {
  const { gutter, fontScale } = useContentLayout();
  const {
    pantry,
    data,
    update,
    deleteMealPhoto,
    ready,
    pantryState: { loaded, loading, error: apiError },
    reload,
  } = useKitchen();
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selected, setSelected] = useState(localDate()),
    [caption, setCaption] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const today = localDate();
  const [pendingPhoto, setPendingPhoto] = useState<PhotoEntry | null>(null);
  const [confirmPhoto, setConfirmPhoto] = useState<PhotoEntry | null>(null);
  const [removeError, setRemoveError] = useState("");
  const [removing, setRemoving] = useState(false);
  const dayHeading = useRef<View>(null);
  const saving = useRef(false);
  const { notify } = useFeedback();
  const prepareRemoval = useRemovalMotion();
  const draft = useFormDraft(!!caption || !!pendingPhoto, busy);
  const count = new Date(
    month.getFullYear(),
    month.getMonth() + 1,
    0,
  ).getDate();
  const cells = Array.from({ length: month.getDay() + count }, (_, index) =>
    index < month.getDay()
      ? null
      : localDate(
          new Date(
            month.getFullYear(),
            month.getMonth(),
            index - month.getDay() + 1,
          ),
        ),
  );
  const savedMeals = data.meals.filter((meal) => meal.id !== pendingPhoto?.id);
  const photos = savedMeals.filter((meal) => meal.date === selected),
    expiring = pantry.filter((item) => item.expirationDate === selected);
  const persistPhoto = async (photo: PhotoEntry) => {
    await update((previous) => ({
      ...previous,
      // Reuse the draft ID if a retry follows a failed write.
      meals: [...previous.meals.filter((meal) => meal.id !== photo.id), photo],
    }));
    setPendingPhoto(null);
    setCaption("");
    notify("Meal photo saved");
  };
  const retry = async () => {
    if (saving.current || !ready || !pendingPhoto) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await persistPhoto({
        ...pendingPhoto,
        caption: caption.trim() || "Meal photo",
      });
    } catch {
      setError(
        "Could not save this photo. Your photo and note are still here. Try again.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const pick = async (library: boolean) => {
    if (saving.current || !ready || pendingPhoto) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      const uri = await capturePhoto(library);
      if (uri) {
        const photo = {
          id: newId(),
          uri,
          date: selected,
          caption: caption.trim() || "Meal photo",
        };
        setPendingPhoto(photo);
        await persistPhoto(photo);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const changeMonth = (amount: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + amount, 1);
    setMonth(next);
    setSelected(localDate(next));
  };
  const removePhoto = async () => {
    if (saving.current || !ready || !confirmPhoto) return;
    saving.current = true;
    setBusy(true);
    setRemoving(true);
    setRemoveError("");
    try {
      await deleteMealPhoto(confirmPhoto.id, prepareRemoval);
      setConfirmPhoto(null);
      notify("Meal photo removed");
    } catch {
      setRemoveError(
        "Could not remove this photo. It is still in your calendar. Try again.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
      setRemoving(false);
    }
  };
  return (
    <FormPage>
      {draft.guard}
      <Sheet
        visible={!!confirmPhoto}
        title="Remove meal photo?"
        dismissDisabled={removing}
        onClose={() => setConfirmPhoto(null)}
        onDismiss={() => focusControl(dayHeading.current)}
      >
        <Text style={s.body}>
          Remove “{confirmPhoto?.caption}” from your calendar?
        </Text>
        <ErrorText message={removeError} />
        <Button
          title="Keep photo"
          secondary
          disabled={removing}
          onPress={() => setConfirmPhoto(null)}
        />
        <Button
          title="Remove photo"
          destructive
          pending={removing}
          disabled={!ready}
          onPress={() => void removePhoto()}
        />
      </Sheet>
      <Text style={s.title}>Calendar</Text>
      <View style={s.row}>
        <IconButton
          name="back"
          label="Previous month"
          disabled={busy || !!pendingPhoto}
          onPress={() => changeMonth(-1)}
        />
        <Text
          style={[s.heading, { flex: 1, textAlign: "center", fontSize: 22 }]}
        >
          {month.toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          })}
        </Text>
        <IconButton
          name="chevron"
          label="Next month"
          disabled={busy || !!pendingPhoto}
          onPress={() => changeMonth(1)}
        />
      </View>
      <View style={{ flexDirection: "row", marginHorizontal: 6 - gutter }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <Text
            key={index}
            style={[s.muted, { width: "14.2857%", textAlign: "center" }]}
          >
            {day}
          </Text>
        ))}
      </View>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          rowGap: 8,
          marginHorizontal: 6 - gutter,
        }}
      >
        {cells.map((date, index) => {
          const photo = date && savedMeals.find((meal) => meal.date === date);
          const expiration =
            date && pantry.some((item) => item.expirationDate === date);
          return date ? (
            <Pressable
              key={date}
              disabled={busy || !!pendingPhoto}
              accessibilityRole="button"
              accessibilityState={{ selected: selected === date }}
              accessibilityLabel={`${date}${photo ? ", meal photo" : ""}${expiration ? ", food expiration" : ""}`}
              onPress={() => setSelected(date)}
              style={{
                width: "14.2857%",
                height: Math.max(52, 32 * fontScale + 16),
                padding: 2,
              }}
            >
              <View
                style={{
                  flex: 1,
                  backgroundColor: selected === date ? "#DFE6D0" : "#EEEDE2",
                  borderRadius: 13,
                  borderWidth: selected === date ? 2 : 0,
                  borderColor: "#6B8058",
                  overflow: "hidden",
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                {photo && (
                  <Image
                    source={{ uri: photo.uri }}
                    style={{
                      position: "absolute",
                      width: "100%",
                      height: "100%",
                    }}
                  />
                )}
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={{
                    color: photo ? "#FFFFFF" : "#324A3D",
                    fontSize: 14,
                    fontWeight: date === today ? "800" : "500",
                    backgroundColor: photo ? "#00000066" : "transparent",
                    paddingHorizontal: 3,
                    borderRadius: 4,
                  }}
                >
                  {Number(date.slice(-2))}
                </Text>
                {expiration && (
                  <View
                    style={{
                      position: "absolute",
                      bottom: 4,
                      width: 5,
                      height: 5,
                      borderRadius: 3,
                      backgroundColor: "#C57D62",
                    }}
                  />
                )}
              </View>
            </Pressable>
          ) : (
            <View key={index} style={{ width: "14.2857%" }} />
          );
        })}
      </View>
      <Text style={s.muted}>
        Photos are your meals · terracotta dots are expirations
      </Text>
      <View style={{ height: 1, backgroundColor: "#E1E2D4" }} />
      <View
        ref={dayHeading}
        tabIndex={-1}
        accessible
        accessibilityRole="header"
      >
        <Text style={s.heading}>
          {new Date(`${selected}T12:00:00`).toLocaleDateString(undefined, {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </Text>
      </View>
      {expiring.map((item) => (
        <View style={s.card} key={item.id}>
          <Text style={s.body}>
            {item.name} · {item.quantity} {item.unit}
          </Text>
          <Text style={[s.muted, { color: "#AD5543" }]}>
            {expiryLabel(item.expirationDate)}
          </Text>
        </View>
      ))}
      <DataNotice
        loading={loading}
        loaded={loaded}
        error={apiError}
        onRetry={() => void reload()}
      />
      {!expiring.length && loaded && (
        <Text style={s.muted}>
          No pantry expirations recorded for this day.
        </Text>
      )}
      {photos.map((photo) => (
        <View key={photo.id} style={{ gap: 9 }}>
          <Image
            accessibilityLabel={photo.caption}
            source={{ uri: photo.uri }}
            style={{ width: "100%", aspectRatio: 1, borderRadius: 22 }}
          />
          <Text style={s.body}>{photo.caption}</Text>
          <Pressable
            accessibilityLabel={`Remove meal photo: ${photo.caption}`}
            disabled={busy || !ready}
            onPress={() => {
              setRemoveError("");
              setConfirmPhoto(photo);
            }}
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={[s.body, { color: "#A04736" }]}>Remove photo</Text>
          </Pressable>
        </View>
      ))}
      {selected <= today && (
        <>
          <Field
            label="A note for your meal · optional"
            placeholder="Tuesday’s very good pasta"
            value={caption}
            editable={!busy}
            onChangeText={setCaption}
          />
          {pendingPhoto && (
            <>
              <Image
                accessibilityLabel="Unsaved meal photo"
                source={{ uri: pendingPhoto.uri }}
                style={{ width: "100%", aspectRatio: 1, borderRadius: 22 }}
              />
              <Text style={s.body}>
                This photo is still waiting to be saved.
              </Text>
              <Button
                title="Save meal photo"
                pending={busy}
                disabled={!ready}
                onPress={() => void retry()}
              />
            </>
          )}
          {!pendingPhoto && selected === today && (
            <Button
              title="Photograph today’s meal"
              icon="camera"
              disabled={busy || !ready}
              onPress={() => void pick(false)}
            />
          )}
          {!pendingPhoto && (
            <Button
              title="Add a meal from photos"
              secondary
              disabled={busy || !ready}
              onPress={() => void pick(true)}
            />
          )}
        </>
      )}
      <ErrorText message={error} />
    </FormPage>
  );
}
