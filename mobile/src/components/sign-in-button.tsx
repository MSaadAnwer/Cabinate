import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Touch } from "./feedback";

export type SignInMethod = "google" | "apple" | "email";

function ProviderMark({ method }: { method: SignInMethod }) {
  return <Svg width={22} height={22} viewBox="0 0 24 24" accessible={false}>
    {method === "google" ? <>
      <Path fill="#4285F4" d="M21.6 12.23c0-.71-.06-1.39-.18-2.05H12v3.88h5.38a4.6 4.6 0 0 1-1.99 3.02v2.51h3.23c1.89-1.74 2.98-4.3 2.98-7.36Z" />
      <Path fill="#34A853" d="M12 22c2.7 0 4.96-.9 6.62-2.41l-3.23-2.51c-.9.6-2.05.96-3.39.96-2.6 0-4.81-1.76-5.6-4.12H3.06v2.59A10 10 0 0 0 12 22Z" />
      <Path fill="#FBBC05" d="M6.4 13.92a6 6 0 0 1 0-3.84V7.49H3.06a10 10 0 0 0 0 9.02l3.34-2.59Z" />
      <Path fill="#EA4335" d="M12 5.96c1.47 0 2.79.51 3.82 1.51l2.87-2.87A9.6 9.6 0 0 0 12 2a10 10 0 0 0-8.94 5.49l3.34 2.59A5.99 5.99 0 0 1 12 5.96Z" />
    </> : method === "apple" ? <Path fill="#FFF" d="M17.05 12.54c.02 3.05 2.68 4.06 2.71 4.07-.02.07-.42 1.45-1.4 2.88-.85 1.24-1.74 2.48-3.13 2.51-1.36.03-1.8-.81-3.36-.81-1.56 0-2.05.78-3.34.84-1.34.05-2.36-1.34-3.21-2.58-1.75-2.54-3.08-7.18-1.29-10.31a5.02 5.02 0 0 1 4.25-2.57c1.33-.03 2.59.9 3.4.9.82 0 2.35-1.11 3.96-.95.68.03 2.59.27 3.81 2.06-.1.06-2.28 1.33-2.26 3.96ZM14.49 4.8c.71-.86 1.18-2.05 1.05-3.24-1.02.04-2.25.68-2.98 1.54-.66.76-1.24 1.98-1.08 3.15 1.14.09 2.3-.58 3.01-1.45Z" /> : <Path d="M3 5h18v14H3V5Zm0 1 9 7 9-7" fill="none" stroke="#173E2D" strokeWidth={1.7} strokeLinejoin="round" />}
  </Svg>;
}

export function SignInButton({ method, title, pending, disabled, onPress }: {
  method: SignInMethod; title: string; pending: boolean; disabled: boolean; onPress: () => void;
}) {
  const apple = method === "apple";
  return <Touch accessibilityLabel={title} accessibilityState={{ busy: pending }} disabled={disabled} onPress={onPress}
    style={[styles.button, apple ? styles.apple : method === "google" ? styles.google : styles.email]}>
    <View style={styles.mark}>{pending ? <ActivityIndicator size="small" color={apple ? "#FFF" : "#173E2D"} /> : <ProviderMark method={method} />}</View>
    <Text style={[styles.label, { color: apple ? "#FFF" : "#1F1F1F" }]}>{title}</Text>
    <View style={styles.mark} />
  </Touch>;
}

const styles = StyleSheet.create({
  button: { minHeight: 54, borderRadius: 10, borderWidth: 1, paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 10 },
  google: { backgroundColor: "#FFF", borderColor: "#747775" },
  apple: { backgroundColor: "#000", borderColor: "#000" },
  email: { backgroundColor: "transparent", borderColor: "#8C9B8F" },
  mark: { width: 22, alignItems: "center", justifyContent: "center" },
  label: { flex: 1, fontSize: 16, fontWeight: "600", textAlign: "center" },
});
