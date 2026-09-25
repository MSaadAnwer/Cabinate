import { useRef, useState } from "react";
import { Keyboard, Text, TextInput, View } from "react-native";
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
  LoadingRows,
  Page,
  Sheet,
  Touch,
  s,
} from "../components/ui";
import { useFeedback } from "../components/feedback";
import { useFormDraft } from "../components/form-draft";
import { useKitchen } from "../state/kitchen-store";
import {
  categories,
  categoryFor,
  groceryKey,
  newId,
  type Category,
} from "../utils/kitchen";

export default function ListsScreen() {
  const { data, ready } = useKitchen();
  return (
    <View style={{ flex: 1 }}>
      <Page>
        <Text style={s.title}>Lists</Text>
        {!ready && <LoadingRows label="Opening your lists" />}
        {ready && !data.lists.length && (
          <Empty
            title="No lists yet"
            text="Create a list or import ingredients from a recipe."
          />
        )}
        {data.lists.map((list) => (
          <Touch
            key={list.id}
            onPress={() =>
              router.push({
                pathname: "/lists/detail",
                params: { id: list.id },
              })
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
            <Icon name="chevron" size={20} />
          </Touch>
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
  const { notify } = useFeedback();
  const [name, setName] = useState(""),
    [items, setItems] = useState(""),
    [error, setError] = useState(""),
    [nameError, setNameError] = useState(""),
    [busy, setBusy] = useState(false);
  const saving = useRef(false),
    nameInput = useRef<TextInput>(null),
    itemsInput = useRef<TextInput>(null);
  const draft = useFormDraft(!!name || !!items, busy);
  const save = async () => {
    if (saving.current || !ready) return;
    if (!name.trim()) {
      setNameError("Give your list a name.");
      nameInput.current?.focus();
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    setNameError("");
    Keyboard.dismiss();
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
                category: categoryFor(
                  line,
                  null,
                  null,
                  data.categoryCorrections,
                ),
                checked: false,
              })),
          },
          ...data.lists,
        ],
      }));
      notify("List created");
      draft.finish(() =>
        router.dismissTo({ pathname: "/lists/detail", params: { id } }),
      );
    } catch {
      setError(
        "Could not save your list. Your draft is still here. Try again.",
      );
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <FormPage
      footer={
        <>
          <ErrorText message={error} />
          <Button
            title="Create list"
            pending={busy}
            disabled={!ready}
            onPress={() => void save()}
          />
        </>
      }
    >
      {draft.guard}
      <Text style={s.title}>New list</Text>
      <Field
        inputRef={nameInput}
        autoFocus
        label="List name"
        placeholder="Saturday at the farmers’ market"
        value={name}
        onChangeText={(value) => {
          setName(value);
          setNameError("");
        }}
        maxLength={100}
        editable={!busy}
        error={nameError}
        returnKeyType="next"
        onSubmitEditing={() => itemsInput.current?.focus()}
      />
      <Field
        inputRef={itemsInput}
        label="Items · one per line (optional)"
        placeholder={"Milk\nSourdough\nTomatoes"}
        multiline
        value={items}
        onChangeText={setItems}
        editable={!busy}
      />
      <Text style={s.muted}>
        Items are grouped by aisle. Category corrections are remembered on this
        device.
      </Text>
    </FormPage>
  );
}

export function ListDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, update, ready } = useKitchen();
  const { notify } = useFeedback();
  const list = data.lists.find((item) => item.id === id);
  const [itemName, setItemName] = useState(""),
    [category, setCategory] = useState<Category | null>(null);
  const [showComposer, setShowComposer] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [aisleFor, setAisleFor] = useState<string | null>(null),
    [confirmDelete, setConfirmDelete] = useState(false);
  const saving = useRef(false),
    input = useRef<TextInput>(null);
  const draft = useFormDraft(!!itemName, busy);
  const addItem = async () => {
    if (!itemName.trim() || saving.current || !ready) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await update((previous) => ({
        ...previous,
        categoryCorrections: category
          ? {
              ...previous.categoryCorrections,
              [groceryKey(itemName)]: category,
            }
          : previous.categoryCorrections,
        lists: previous.lists.map((value) =>
          value.id === id
            ? {
                ...value,
                items: [
                  ...value.items,
                  {
                    id: newId(),
                    name: itemName.trim(),
                    category:
                      category ||
                      categoryFor(
                        itemName,
                        null,
                        null,
                        previous.categoryCorrections,
                      ),
                    checked: false,
                  },
                ],
              }
            : value,
        ),
      }));
      setItemName("");
      setCategory(null);
      input.current?.focus();
    } catch {
      setError("Could not add this item. Try again.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const removeList = async () => {
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await update((previous) => ({
        ...previous,
        lists: previous.lists.filter((value) => value.id !== id),
      }));
      setConfirmDelete(false);
      notify("List deleted");
      draft.finish(() => router.dismissTo("/lists"));
    } catch {
      setError("Could not delete this list. Try again.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  const chooseAisle = async (value: Category) => {
    if (aisleFor === "composer") {
      setCategory(value);
      setAisleFor(null);
      return;
    }
    if (saving.current) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await update((previous) => ({
        ...previous,
        categoryCorrections: {
          ...previous.categoryCorrections,
          [groceryKey(
            list?.items.find((item) => item.id === aisleFor)?.name || "",
          )]: value,
        },
        lists: previous.lists.map((l) =>
          l.id === id
            ? {
                ...l,
                items: l.items.map((i) =>
                  i.id === aisleFor ? { ...i, category: value } : i,
                ),
              }
            : l,
        ),
      }));
      setAisleFor(null);
    } catch {
      setError("Could not change this aisle. Try again.");
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  if (!ready)
    return (
      <Page>
        <LoadingRows label="Opening your list" />
      </Page>
    );
  if (!list && !busy)
    return (
      <Page>
        <Empty
          title="List not found"
          text="Return to your lists to choose another."
        />
        <Button
          title="Back to lists"
          onPress={() => router.dismissTo("/lists")}
        />
      </Page>
    );
  return (
    <FormPage
      footer={
        <>
          <ErrorText message={error} />
          {showComposer ? (
            <>
              <View style={s.row}>
                <View style={{ flex: 1 }}>
                  <Field
                    inputRef={input}
                    autoFocus
                    label="Item name"
                    placeholder="What else do you need?"
                    value={itemName}
                    onChangeText={setItemName}
                    editable={!busy}
                    onSubmitEditing={() => void addItem()}
                    submitBehavior="submit"
                    returnKeyType="done"
                  />
                </View>
                <IconButton
                  name="close"
                  label="Close item composer"
                  disabled={busy}
                  onPress={() => {
                    Keyboard.dismiss();
                    setShowComposer(false);
                  }}
                />
              </View>
              <Touch
                disabled={busy}
                accessibilityLabel="Choose aisle for new item"
                onPress={() => setAisleFor("composer")}
                style={{ minHeight: 44, justifyContent: "center" }}
              >
                <Text style={s.muted}>
                  Aisle:{" "}
                  {category ||
                    categoryFor(
                      itemName,
                      null,
                      null,
                      data.categoryCorrections,
                    )}{" "}
                  · Change
                </Text>
              </Touch>
              <Button
                title="Add to list"
                pending={busy}
                disabled={!itemName.trim()}
                onPress={() => void addItem()}
              />
            </>
          ) : (
            <Button
              title="Add an item"
              icon="plus"
              onPress={() => setShowComposer(true)}
            />
          )}
        </>
      }
    >
      {draft.guard}
      <View style={s.row}>
        <Text style={[s.title, { flex: 1 }]}>{list?.name}</Text>
        <IconButton
          name="trash"
          label="Delete list"
          destructive
          disabled={busy}
          onPress={() => setConfirmDelete(true)}
        />
      </View>
      <Text style={s.muted}>
        {list?.items.filter((item) => item.checked).length || 0} of{" "}
        {list?.items.length || 0} picked up
      </Text>
      {!list?.items.length && (
        <Text style={s.muted}>
          Nothing on this list yet. Add your first item below.
        </Text>
      )}
      {categories.map((value) => {
        const entries =
          list?.items.filter((item) => item.category === value) || [];
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
                      })).catch(() => {});
                    }}
                  />
                </View>
                <IconButton
                  name="more"
                  label={`Change aisle for ${item.name}`}
                  disabled={busy}
                  onPress={() => setAisleFor(item.id)}
                />
              </View>
            ))}
          </View>
        ) : null;
      })}
      <Sheet
        visible={!!aisleFor}
        title="Move to aisle"
        onClose={() => {
          if (!busy) setAisleFor(null);
        }}
      >
        <Text style={s.body}>
          {aisleFor === "composer"
            ? itemName || "New item"
            : list?.items.find((i) => i.id === aisleFor)?.name}
        </Text>
        {categories.map((value) => {
          const selected =
            (aisleFor === "composer"
              ? category ||
                categoryFor(itemName, null, null, data.categoryCorrections)
              : list?.items.find((i) => i.id === aisleFor)?.category) === value;
          return (
            <Touch
              key={value}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              disabled={busy}
              onPress={() => void chooseAisle(value)}
              style={[
                s.row,
                {
                  minHeight: 48,
                  padding: 12,
                  borderRadius: 14,
                  backgroundColor: selected ? "#E6EBD9" : "transparent",
                },
              ]}
            >
              <Text style={[s.body, { flex: 1 }]}>{value}</Text>
              {selected && <Icon name="check" />}
            </Touch>
          );
        })}
        <ErrorText message={error} />
      </Sheet>
      <Sheet
        visible={confirmDelete}
        title="Delete this list?"
        onClose={() => {
          if (!busy) setConfirmDelete(false);
        }}
      >
        <Text style={s.body}>This removes the list from this device.</Text>
        <ErrorText message={error} />
        <Button
          title="Delete list"
          destructive
          pending={busy}
          onPress={() => void removeList()}
        />
        <Button
          title="Keep list"
          secondary
          disabled={busy}
          onPress={() => setConfirmDelete(false)}
        />
      </Sheet>
    </FormPage>
  );
}
