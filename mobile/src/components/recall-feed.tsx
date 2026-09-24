import { useCallback, useRef, useState } from "react";
import { Linking, Text, View } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useKitchen } from "../state/kitchen-store";
import { potentialPantryMatches } from "../utils/recalls";
import { recallApi, type RecallFeed } from "../services/api";
import { Button, ErrorText, s } from "./ui";

export function RecallNotices({ showAll = false }: { showAll?: boolean }) {
  const {
    pantry,
    pantryState: { loading: pantryLoading, error: pantryError },
  } = useKitchen();
  const [feed, setFeed] = useState<RecallFeed | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const request = useRef(0);
  const load = useCallback(async () => {
    const ticket = ++request.current;
    setLoading(true);
    try {
      const next = await recallApi.get();
      if (ticket !== request.current) return;
      setFeed(next);
      setError("");
    } catch {
      if (ticket !== request.current) return;
      setError(
        "Couldn’t check recalls. Previously loaded notices may be out of date.",
      );
    } finally {
      if (ticket === request.current) setLoading(false);
    }
  }, []);
  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );
  const open = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      setError("Couldn’t open the official notice. Please try again.");
    }
  };
  const notices = (feed?.items || [])
    .map((item) => ({
      ...item,
      matches: potentialPantryMatches(item, pantry),
    }))
    .filter((item) => showAll || item.matches.length > 0);
  return (
    <View style={{ gap: 14 }}>
      <Text style={s.title}>
        {showAll ? "All current recalls" : "Recall notices"}
      </Text>
      <Text style={s.body}>
        {showAll
          ? "All notices in the current U.S. FDA feed, including supplements, pet products, and other FDA-regulated products."
          : "Potential matches to your pantry, based on item names."}
      </Text>
      <Text style={s.muted}>
        These are not confirmed matches to your pantry. Open the notice to check
        the brand, package, lot, and instructions. This feed does not cover
        every recall.
      </Text>
      <ErrorText message={error} />
      {feed?.stale && (
        <Text accessibilityRole="alert" style={s.body}>
          The FDA feed is currently unavailable.{" "}
          {feed.items.length
            ? "Showing older notices."
            : "Recall status is unknown."}
        </Text>
      )}
      {feed?.lastSuccessfulCheck && (
        <Text style={s.muted}>
          Last checked: {new Date(feed.lastSuccessfulCheck).toLocaleString()}
        </Text>
      )}
      {loading && <Text style={s.muted}>Checking recalls…</Text>}
      {!showAll && pantryLoading && (
        <Text style={s.muted}>Loading pantry items…</Text>
      )}
      {!showAll && !!pantryError && (
        <ErrorText message="Couldn’t load your pantry. Potential matches may be incomplete." />
      )}
      {showAll && (
        <Button
          secondary
          title={loading ? "Checking recalls…" : "Refresh recalls"}
          disabled={loading}
          onPress={() => void load()}
        />
      )}
      {notices.map((item) => (
        <View key={item.id} style={s.card}>
          <Text style={s.eyebrow}>
            FDA · {new Date(item.publishedAt).toLocaleDateString()}
          </Text>
          <Text style={s.heading}>{item.title}</Text>
          {!showAll && (
            <Text style={s.body}>
              Potential match:{" "}
              {item.matches.map((match) => match.name).join(", ")}
            </Text>
          )}
          <Text style={s.body}>{item.description}</Text>
          <Button
            secondary
            title="Read official notice"
            icon="link"
            onPress={() => void open(item.url)}
          />
        </View>
      ))}
      {feed &&
        !feed.stale &&
        !loading &&
        !error &&
        !notices.length &&
        (showAll || (!pantryLoading && !pantryError)) && (
          <Text style={s.body}>
            {showAll
              ? "No notices in the current feed."
              : pantry.some((item) => item.quantity > 0)
                ? "No potential name matches found in this feed. This does not mean your items are recall-free."
                : "Add pantry items to see potential recall matches."}
          </Text>
        )}
      {!showAll && (
        <Button
          secondary
          title="Show all"
          onPress={() => router.push("/recalls")}
        />
      )}
      {showAll && (
        <View style={s.card}>
          <Text style={s.heading}>USDA recalls</Text>
          <Text style={s.body}>
            USDA feed integration is not available yet. Check meat, poultry, and
            processed egg recalls on the official site.
          </Text>
          <Button
            secondary
            title="Open USDA recalls"
            icon="link"
            onPress={() => void open("https://www.fsis.usda.gov/recalls")}
          />
        </View>
      )}
    </View>
  );
}
