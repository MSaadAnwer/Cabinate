import { useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Icon } from "../components/art";
import {
  Button,
  CheckRow,
  Empty,
  ErrorText,
  Field,
  FloatingAdd,
  FormPage,
  IconButton,
  Page,
  reportError,
  s,
} from "../components/ui";
import { useKitchen } from "../state/kitchen-store";
import {
  categories,
  categoryFor,
  newId,
  type Category,
} from "../utils/kitchen";

export default function ListsScreen() {
  const { data, ready } = useKitchen();
  return (
    <View style={{ flex: 1 }}>
      <Page>
        <Text style={s.eyebrow}>A thoughtful little shopping trip</Text>
        <Text style={s.title}>Your lists.</Text>
        {!data.lists.length && (
          <Empty
            title={ready ? "What are we picking up?" : "Opening your lists…"}
            text="A list for the week, a favorite recipe, or a quick stop at the store. Make it yours."
          />
        )}
        {data.lists.map((list) => (
          <Pressable
            key={list.id}
            accessibilityRole="button"
            onPress={() =>
              router.push({ pathname: "/list-detail", params: { id: list.id } })
            }
            style={[s.card, s.row]}
          >
            <View
              style={{
                backgroundColor: "#DCE6E5",
                borderRadius: 16,
                padding: 13,
              }}
            >
              <Icon name="list" />
            </View>
            <View style={{ flex: 1, gap: 5 }}>
              <Text style={s.heading}>{list.name}</Text>
              <Text style={s.muted}>
                {list.items.filter((item) => item.checked).length} of{" "}
                {list.items.length} picked up
              </Text>
            </View>
            <Icon name="chevron" size={17} />
          </Pressable>
        ))}
      </Page>
      <FloatingAdd
        actions={[
          {
            title: "Write a new list",
            icon: "edit",
            onPress: () => router.push("/new-list"),
          },
          {
            title: "Import from cookbook",
            icon: "book",
            onPress: () => router.push("/import-list"),
          },
        ]}
      />
    </View>
  );
}
export function NewListScreen() {
  const { update, ready } = useKitchen();
  const [name, setName] = useState(""),
    [items, setItems] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim()) {
      setError("Give your list a name.");
      return;
    }
    setBusy(true);
    setError("");
    const id = newId();
    try {
      await update((data) => ({
        ...data,
        lists: [
          {
            id,
            name: name.trim(),
            createdAt: new Date().toISOString(),
            items: items
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean)
              .map((line) => ({
                id: newId(),
                name: line,
                category: categoryFor(line),
                checked: false,
              })),
          },
          ...data.lists,
        ],
      }));
      router.replace({ pathname: "/list-detail", params: { id } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <FormPage>
      <Text style={s.title}>Start a little list.</Text>
      <Field
        label="List name"
        placeholder="Saturday at the farmers’ market"
        value={name}
        onChangeText={setName}
        maxLength={100}
      />
      <Field
        label="Items · one per line (optional)"
        placeholder={"Milk\nSourdough\nTomatoes"}
        multiline
        value={items}
        onChangeText={setItems}
      />
      <Text style={s.muted}>
        We’ll group your items by aisle. You can change a category later.
      </Text>
      <ErrorText message={error} />
      <Button
        title={busy ? "Saving…" : "Create list"}
        disabled={busy || !ready}
        onPress={() => void save()}
      />
    </FormPage>
  );
}
export function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, update } = useKitchen();
  const list = data.lists.find((item) => item.id === id);
  const [itemName, setItemName] = useState("");
  const [category, setCategory] = useState<Category | null>(null);
  const [showComposer, setShowComposer] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!list)
    return (
      <Page>
        <Empty
          title="List not found"
          text="Return to your lists to choose another."
        />
      </Page>
    );
  const addItem = async () => {
    if (!itemName.trim()) return;
    setBusy(true);
    try {
      await update((previous) => ({
        ...previous,
        lists: previous.lists.map((value) =>
          value.id === id
            ? {
                ...value,
                items: [
                  ...value.items,
                  {
                    id: newId(),
                    name: itemName.trim(),
                    category: category || categoryFor(itemName),
                    checked: false,
                  },
                ],
              }
            : value,
        ),
      }));
      setItemName("");
      setCategory(null);
    } catch (e) {
      reportError(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <FormPage>
      <View style={s.row}>
        <Text style={[s.title, { flex: 1 }]}>{list.name}</Text>
        <IconButton
          name="trash"
          label="Delete list"
          onPress={() =>
            Alert.alert(
              "Delete this list?",
              "This removes the list from this device.",
              [
                { text: "Cancel", style: "cancel" },
                {
                  text: "Delete",
                  style: "destructive",
                  onPress: () => {
                    void update((previous) => ({
                      ...previous,
                      lists: previous.lists.filter((value) => value.id !== id),
                    }))
                      .then(() => router.replace("/lists"))
                      .catch(reportError);
                  },
                },
              ],
            )
          }
        />
      </View>
      <Text style={s.muted}>
        {list.items.filter((item) => item.checked).length} of{" "}
        {list.items.length} picked up
      </Text>
      {!list.items.length && <Text style={s.muted}>Nothing on this list yet. Add your first item below.</Text>}
      {categories.map((value) => {
        const entries = list.items.filter((item) => item.category === value);
        return entries.length ? (
          <View key={value}>
            <Text style={s.eyebrow}>{value}</Text>
            {entries.map((item) => (
              <View key={item.id} style={s.row}>
                <View style={{ flex: 1 }}>
                <CheckRow
                  title={item.name}
                  checked={item.checked}
                  onPress={() => {
                    void update((previous) => ({
                      ...previous,
                      lists: previous.lists.map((l) =>
                        l.id === id
                          ? {
                              ...l,
                              items: l.items.map((i) =>
                                i.id === item.id
                                  ? { ...i, checked: !i.checked }
                                  : i,
                              ),
                            }
                          : l,
                      ),
                    })).catch(reportError);
                  }}
                />
                </View>
                <IconButton
                  name="edit"
                  label={`Change aisle for ${item.name}`}
                  onPress={() =>
                    Alert.alert(
                      "Move to aisle",
                      item.name,
                      categories.map((c) => ({
                        text: c,
                        onPress: () => {
                          void update((previous) => ({
                            ...previous,
                            lists: previous.lists.map((l) =>
                              l.id === id
                                ? {
                                    ...l,
                                    items: l.items.map((i) =>
                                      i.id === item.id
                                        ? { ...i, category: c }
                                        : i,
                                    ),
                                  }
                                : l,
                            ),
                          })).catch(reportError);
                        },
                      })),
                    )
                  }
                />
              </View>
            ))}
          </View>
        ) : null;
      })}
      <Button
        title={showComposer ? "Done adding" : "Add an item"}
        secondary
        icon={showComposer ? "check" : "plus"}
        onPress={() => setShowComposer((value) => !value)}
      />
      {showComposer && (
        <View style={{ gap: 12 }}>
          <Field
            label="Item name"
            placeholder="What else do you need?"
            value={itemName}
            onChangeText={setItemName}
            onSubmitEditing={() => void addItem()}
            returnKeyType="done"
          />
          <Text style={s.muted}>Aisle: {category || categoryFor(itemName)} · tap to change</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
            {categories.map((value) => (
              <Pressable
                key={value}
                accessibilityRole="button"
                accessibilityState={{ selected: (category || categoryFor(itemName)) === value }}
                onPress={() => setCategory(value)}
                style={[s.chip, { backgroundColor: (category || categoryFor(itemName)) === value ? "#E4E8D7" : "transparent" }]}
              >
                <Text style={s.muted}>{value}</Text>
              </Pressable>
            ))}
          </View>
          <Button title={busy ? "Adding…" : "Add to list"} disabled={!itemName.trim() || busy} onPress={() => void addItem()} />
        </View>
      )}
    </FormPage>
  );
}
