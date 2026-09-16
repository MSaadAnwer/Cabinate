import { useState } from "react";
import { Alert, Image, Pressable, Text, View } from "react-native";
import {
  Button,
  ErrorText,
  Field,
  FormPage,
  IconButton,
  s,
} from "../components/ui";
import { useKitchen } from "../state/kitchen-store";
import { capturePhoto } from "../services/photos";
import { expiryLabel, localDate, newId } from "../utils/kitchen";

export default function CalendarScreen() {
  const { pantry, data, update, ready } = useKitchen();
  const [month, setMonth] = useState(
    () => new Date(new Date().getFullYear(), new Date().getMonth(), 1),
  );
  const [selected, setSelected] = useState(localDate()),
    [caption, setCaption] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const today = localDate();
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
  const photos = data.meals.filter((meal) => meal.date === selected),
    expiring = pantry.filter((item) => item.expirationDate === selected);
  const pick = async (library: boolean) => {
    setBusy(true);
    setError("");
    try {
      const uri = await capturePhoto(library);
      if (uri) {
        await update((previous) => ({
          ...previous,
          meals: [
            ...previous.meals,
            {
              id: newId(),
              uri,
              date: selected,
              caption: caption.trim() || "A meal to remember",
            },
          ],
        }));
        setCaption("");
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const changeMonth = (amount: number) => {
    const next = new Date(month.getFullYear(), month.getMonth() + amount, 1);
    setMonth(next);
    setSelected(localDate(next));
  };
  return (
    <FormPage>
      <Text style={s.eyebrow}>Your kitchen, day by day</Text>
      <Text style={s.title}>Little moments.{"\n"}Lovely meals.</Text>
      <View style={s.row}>
        <IconButton
          name="back"
          label="Previous month"
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
          onPress={() => changeMonth(1)}
        />
      </View>
      <View style={{ flexDirection: "row" }}>
        {["S", "M", "T", "W", "T", "F", "S"].map((day, index) => (
          <Text
            key={index}
            style={[s.muted, { width: "14.2857%", textAlign: "center" }]}
          >
            {day}
          </Text>
        ))}
      </View>
      <View style={{ flexDirection: "row", flexWrap: "wrap", rowGap: 8 }}>
        {cells.map((date, index) => {
          const photo = date && data.meals.find((meal) => meal.date === date);
          const expiration =
            date && pantry.some((item) => item.expirationDate === date);
          return date ? (
            <Pressable
              key={date}
              accessibilityRole="button"
              accessibilityState={{ selected: selected === date }}
              accessibilityLabel={`${date}${photo ? ", meal photo" : ""}${expiration ? ", food expiration" : ""}`}
              onPress={() => setSelected(date)}
              style={{ width: "14.2857%", aspectRatio: 0.83, padding: 2 }}
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
      <Text style={s.heading}>
        {new Date(`${selected}T12:00:00`).toLocaleDateString(undefined, {
          weekday: "long",
          month: "long",
          day: "numeric",
        })}
      </Text>
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
      {!expiring.length && (
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
            accessibilityRole="button"
            onPress={() =>
              Alert.alert(
                "Remove meal photo?",
                "This removes it from your calendar.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Remove",
                    style: "destructive",
                    onPress: () => {
                      void update((previous) => ({
                        ...previous,
                        meals: previous.meals.filter(
                          (item) => item.id !== photo.id,
                        ),
                      })).catch((e) => setError((e as Error).message));
                    },
                  },
                ],
              )
            }
            style={{ minHeight: 44, justifyContent: "center" }}
          >
            <Text style={s.muted}>Remove photo</Text>
          </Pressable>
        </View>
      ))}
      {selected <= today && (
        <>
          <Field
            label="A note for your meal · optional"
            placeholder="Tuesday’s very good pasta"
            value={caption}
            onChangeText={setCaption}
          />
          {selected === today && (
            <Button
              title="Photograph today’s meal"
              icon="camera"
              disabled={busy || !ready}
              onPress={() => void pick(false)}
            />
          )}
          <Button
            title="Add a meal from photos"
            secondary
            disabled={busy || !ready}
            onPress={() => void pick(true)}
          />
        </>
      )}
      <ErrorText message={error} />
    </FormPage>
  );
}
