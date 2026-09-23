import { Text, View } from "react-native";
import { colors, s } from "./ui";

export type DateFieldProps = {
  value: string;
  onChange: (date: string) => void;
  error?: string;
  disabled?: boolean;
};
// The browser preview uses its native date control; iPhone uses date-field.native.
export default function DateField({
  value,
  onChange,
  error,
  disabled,
}: DateFieldProps) {
  return (
    <View style={{ gap: 8 }}>
      <Text style={s.body}>Expiration · optional</Text>
      <input
        aria-label="Expiration date"
        aria-invalid={!!error}
        disabled={disabled}
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        style={{
          minHeight: 50,
          padding: "0 12px",
          border: `1px solid ${error ? colors.red : colors.line}`,
          borderRadius: 14,
          background: colors.white,
          color: colors.ink,
          fontSize: 16,
          boxSizing: "border-box",
          width: "100%",
        }}
      />
      {error && (
        <Text accessibilityRole="alert" style={[s.body, { color: colors.red }]}>
          {error}
        </Text>
      )}
    </View>
  );
}
