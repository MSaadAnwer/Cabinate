import { useCallback, useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { Icon, TomatoMark } from "../components/art";
import { Button, Empty, ErrorText, Page, s } from "../components/ui";
import { useKitchen } from "../state/kitchen-store";
import { daysUntil, expiryLabel } from "../utils/kitchen";
import { ingestApi } from "../services/api";
import type { RawIngestPayload } from "../types/ingest";
import { RecallNotices } from "../components/recall-feed";

export function NotificationsScreen() {
  const { pantry, loading, error, reload } = useKitchen();
  const items = pantry
    .filter(
      (item) => item.expirationDate && daysUntil(item.expirationDate) <= 7,
    )
    .sort((a, b) =>
      (a.expirationDate || "").localeCompare(b.expirationDate || ""),
    );
  return (
    <Page
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={reload} />
      }
    >
      <Text style={s.title}>A little heads-up.</Text>
      <Text style={s.eyebrow}>Use soon · next 7 days</Text>
      <ErrorText message={error} />
      {items.map((item) => (
        <Pressable
          key={item.id}
          accessibilityRole="button"
          onPress={() => router.push("/inventory")}
          style={[s.card, s.row]}
        >
          <Icon name="bell" color="#B56A53" />
          <View style={{ flex: 1, gap: 5 }}>
            <Text style={s.heading}>{item.name}</Text>
            <Text style={s.muted}>{expiryLabel(item.expirationDate)}</Text>
          </View>
        </Pressable>
      ))}
      {!items.length && !loading && !error && (
        <Empty
          title="Nothing expiring soon"
          text="Your dated pantry items look good for the next seven days."
        />
      )}
      <RecallNotices />
      <Text style={s.muted}>
        Expiration reminders are shown here when you open the app. Phone push
        notifications are not enabled yet.
      </Text>
    </Page>
  );
}
export function AccountScreen() {
  const { data, pantry, recipes } = useKitchen();
  return (
    <View style={{ flex: 1 }}>
      <Page>
        <View style={{ alignItems: "center", paddingVertical: 32, gap: 18 }}>
          <TomatoMark size={65} />
          <Text style={s.title}>Your little corner.</Text>
          <Text style={s.muted}>Welcome, home cook.</Text>
        </View>
        <View style={s.card}>
          <Text style={s.heading}>Account details</Text>
          <Text style={s.body}>
            Your profile, preferences, and household settings will live here.
          </Text>
          <Text style={s.muted}>Account sign-in is coming later.</Text>
        </View>
        <View style={s.card}>
          <Text style={s.eyebrow}>In your Cabinate</Text>
          <Text style={s.body}>
            {pantry.length} pantry items · {recipes.length} recipes
          </Text>
          <Text style={s.body}>
            {data.lists.length} lists · {data.meals.length} meal photos
          </Text>
        </View>
        <Button
          secondary
          title="Saved links & captures"
          icon="link"
          onPress={() => router.push("/captures")}
        />
        <Text style={s.muted}>
          Lists, cooking progress, receipts, and meal photos are saved on this
          device. Your pantry and cookbook are stored with Cabinate’s connected
          server.
        </Text>
      </Page>
    </View>
  );
}
export function CapturesScreen() {
  const [items, setItems] = useState<RawIngestPayload[]>([]),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await ingestApi.getAll());
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  return (
    <Page
      refreshControl={<RefreshControl refreshing={loading} onRefresh={load} />}
    >
      <Text style={s.title}>Saved for later.</Text>
      <ErrorText message={error} />
      {items.map((item) => (
        <View key={item.id} style={s.card}>
          <Text style={s.eyebrow}>{item.source.replaceAll("_", " ")}</Text>
          <Text selectable numberOfLines={4} style={s.body}>
            {item.sourceUrl || item.payload}
          </Text>
          <Text style={s.muted}>
            {item.status === "PENDING"
              ? "Saved · awaiting review"
              : item.status.toLowerCase()}
          </Text>
          {!!item.sourceUrl && item.source === "SOCIAL_LINK" && (
            <Button
              secondary
              title="Write recipe from this link"
              onPress={() =>
                router.push({
                  pathname: "/add-recipe",
                  params: { sourceUrl: item.sourceUrl! },
                })
              }
            />
          )}
        </View>
      ))}
      {!items.length && !loading && (
        <Empty
          title="Nothing saved yet"
          text="Paste a link from Pantry or Cookbook to keep it here."
        />
      )}
    </Page>
  );
}
