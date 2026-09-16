import { useState } from "react";
import { Pressable, RefreshControl, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { FoodShape, Icon } from "../components/art";
import {
  BottomNav,
  Empty,
  ErrorText,
  Field,
  FloatingAdd,
  Page,
  s,
} from "../components/ui";
import { useKitchen } from "../state/kitchen-store";
import {
  categories,
  categoryFor,
  daysUntil,
  expiryLabel,
} from "../utils/kitchen";

export default function PantryScreen() {
  const { pantry, error, loading, reload } = useKitchen();
  return (
    <View style={{ flex: 1 }}>
      <Page
        bottom={110}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={reload} />
        }
      >
        <Text style={s.eyebrow}>A place for everything</Text>
        <Text style={s.title}>Your pantry.</Text>
        <ErrorText message={error} />
        <Pressable
          accessibilityRole="button"
          onPress={() => router.push("/inventory")}
          style={[
            s.row,
            {
              paddingHorizontal: 18,
              paddingVertical: 13,
              backgroundColor: "#E9ECDC",
              borderRadius: 12,
            },
          ]}
        >
          <Text style={[s.body, { flex: 1, fontWeight: "600" }]}>All</Text>
          <Text style={s.muted}>{pantry.length} items</Text>
          <Icon name="chevron" size={17} />
        </Pressable>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 16 }}>
          {categories.map((category) => (
            <Pressable
              key={category}
              accessibilityRole="button"
              accessibilityLabel={`Open ${category}`}
              onPress={() =>
                router.push({ pathname: "/inventory", params: { category } })
              }
              style={({ pressed }) => ({
                width: "47%",
                alignItems: "center",
                paddingVertical: 12,
                gap: 4,
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <FoodShape category={category} />
              <Text style={[s.heading, { fontSize: 19 }]}>{category}</Text>
              <Text style={s.muted}>
                {
                  pantry.filter(
                    (item) =>
                      categoryFor(item.name, item.category, item.location) ===
                      category,
                  ).length
                }{" "}
                items
              </Text>
            </Pressable>
          ))}
        </View>
      </Page>
      <FloatingAdd
        actions={[
          {
            title: "Photograph a receipt",
            icon: "camera",
            onPress: () => router.push("/receipt"),
          },
          {
            title: "Save a product link",
            icon: "link",
            onPress: () =>
              router.push({
                pathname: "/capture-link",
                params: { kind: "pantry" },
              }),
          },
          {
            title: "Add an item",
            icon: "edit",
            onPress: () => router.push("/add-pantry"),
          },
        ]}
      />
      <BottomNav active="Pantry" />
    </View>
  );
}
export function InventoryScreen() {
  const { category } = useLocalSearchParams<{ category?: string }>();
  const { pantry, loading, error, reload } = useKitchen();
  const [search, setSearch] = useState("");
  const items = pantry.filter(
    (item) =>
      (!category ||
        categoryFor(item.name, item.category, item.location) === category) &&
      item.name.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Page
      refreshControl={
        <RefreshControl refreshing={loading} onRefresh={reload} />
      }
    >
      <Text style={s.title}>{category || "All the good things."}</Text>
      <Field
        label="Find an item"
        placeholder="Search your pantry"
        value={search}
        onChangeText={setSearch}
      />
      <ErrorText message={error} />
      {!items.length && !loading && (
        <Empty
          title="A little room to grow"
          text="Add your first item using the button below."
        />
      )}
      {items.map((item) => (
        <View key={item.id} style={s.card}>
          <View style={s.row}>
            <Text selectable style={[s.heading, { fontSize: 21, flex: 1 }]}>
              {item.name}
            </Text>
            <Text style={s.body}>
              {item.quantity} {item.unit}
            </Text>
          </View>
          <Text style={s.muted}>
            {categoryFor(item.name, item.category, item.location)}
            {item.location ? ` · ${item.location.toLowerCase()}` : ""}
          </Text>
          <Text
            style={[
              s.muted,
              item.expirationDate && daysUntil(item.expirationDate) <= 7
                ? { color: "#AD5543" }
                : {},
            ]}
          >
            {expiryLabel(item.expirationDate)}
          </Text>
        </View>
      ))}
      <Pressable
        accessibilityRole="button"
        onPress={() =>
          router.push({ pathname: "/add-pantry", params: { category } })
        }
        style={[s.card, s.row]}
      >
        <Icon name="plus" />
        <Text style={s.body}>Add an item</Text>
      </Pressable>
    </Page>
  );
}
