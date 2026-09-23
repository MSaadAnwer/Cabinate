import { useState } from "react";
import { Platform, Text, View } from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Button, ErrorText, Sheet, s } from "./ui";
import { localDate } from "../utils/kitchen";
import type { DateFieldProps } from "./date-field";

export default function DateField({
  value,
  onChange,
  error,
  disabled,
}: DateFieldProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(new Date());
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.body}>Expiration · optional</Text>
      <Button
        secondary
        disabled={disabled}
        icon="calendar"
        title={
          value
            ? new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
                month: "long",
                day: "numeric",
                year: "numeric",
              })
            : "Add an expiration date"
        }
        onPress={() => {
          setDraft(value ? new Date(`${value}T12:00:00`) : new Date());
          setOpen(true);
        }}
      />
      {!!value && (
        <Button
          secondary
          disabled={disabled}
          title="Remove expiration date"
          onPress={() => onChange("")}
        />
      )}
      <ErrorText message={error || ""} />
      {Platform.OS === "ios" ? (
        <Sheet
          visible={open}
          title="Expiration date"
          onClose={() => setOpen(false)}
        >
          <DateTimePicker
            value={draft}
            mode="date"
            display="spinner"
            themeVariant="light"
            onChange={(_, date) => {
              if (date) setDraft(date);
            }}
          />
          <Button
            title="Set date"
            onPress={() => {
              onChange(localDate(draft));
              setOpen(false);
            }}
          />
        </Sheet>
      ) : (
        open && (
          <DateTimePicker
            value={draft}
            mode="date"
            onChange={(event, date) => {
              setOpen(false);
              if (event.type === "set" && date) onChange(localDate(date));
            }}
          />
        )
      )}
    </View>
  );
}
