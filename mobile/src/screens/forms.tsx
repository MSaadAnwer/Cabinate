import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Button, ErrorText, Field, FormPage, s } from "../components/ui";
import { pantryApi, recipeApi, ingestApi } from "../services/api";
import { capturePhoto } from "../services/photos";
import { useKitchen } from "../state/kitchen-store";
import {
  categories,
  categoryFor,
  localDate,
  newId,
  validDate,
} from "../utils/kitchen";

export function AddPantryScreen() {
  const params = useLocalSearchParams<{ category?: string }>();
  const { setPantry } = useKitchen();
  const [name, setName] = useState(""),
    [quantity, setQuantity] = useState("1"),
    [unit, setUnit] = useState("pcs");
  const [category, setCategory] = useState(params.category || ""),
    [date, setDate] = useState(""),
    [location, setLocation] = useState("CABINET");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const save = async () => {
    if (!name.trim() || !unit.trim()) {
      setError("Add an item name and unit.");
      return;
    }
    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0) {
      setError("Quantity must be greater than zero.");
      return;
    }
    if (date && !validDate(date)) {
      setError("Use a real date in YYYY-MM-DD format.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const item = await pantryApi.create({
        name: name.trim(),
        quantity: Number(quantity),
        unit: unit.trim(),
        category: category || categoryFor(name),
        location,
        expirationDate: date || undefined,
      });
      setPantry((previous) => [item, ...previous]);
      router.back();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <FormPage>
      <Text style={s.title}>Something fresh.</Text>
      <Field
        label="Item name"
        placeholder="Whole milk"
        value={name}
        onChangeText={setName}
        maxLength={120}
      />
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Field
            label="Quantity"
            keyboardType="decimal-pad"
            value={quantity}
            onChangeText={setQuantity}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            label="Unit"
            placeholder="pcs, g, ml…"
            value={unit}
            onChangeText={setUnit}
          />
        </View>
      </View>
      <Text style={s.muted}>Category</Text>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {categories.map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            accessibilityState={{
              selected: (category || categoryFor(name)) === value,
            }}
            onPress={() => setCategory(value)}
            style={[
              s.chip,
              {
                backgroundColor:
                  (category || categoryFor(name)) === value
                    ? "#E1E8CE"
                    : "transparent",
              },
            ]}
          >
            <Text style={s.body}>{value}</Text>
          </Pressable>
        ))}
      </View>
      <Field
        label="Expiration · optional"
        placeholder="YYYY-MM-DD"
        value={date}
        onChangeText={setDate}
        keyboardType="numbers-and-punctuation"
        maxLength={10}
      />
      <Text style={s.muted}>Keep it in the…</Text>
      <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
        {["FRIDGE", "FREEZER", "CABINET", "COUNTER"].map((value) => (
          <Pressable
            key={value}
            accessibilityRole="button"
            onPress={() => setLocation(value)}
            style={[
              s.chip,
              {
                backgroundColor: location === value ? "#E1E8CE" : "transparent",
              },
            ]}
          >
            <Text style={s.body}>{value.toLowerCase()}</Text>
          </Pressable>
        ))}
      </View>
      <ErrorText message={error} />
      <Button
        title={busy ? "Adding…" : "Add to pantry"}
        disabled={busy}
        onPress={() => void save()}
      />
    </FormPage>
  );
}
export function AddRecipeScreen() {
  const { sourceUrl = "" } = useLocalSearchParams<{ sourceUrl?: string }>();
  const { setRecipes } = useKitchen();
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [ingredients, setIngredients] = useState(""),
    [steps, setSteps] = useState(""),
    [servings, setServings] = useState("2");
  const [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const save = async () => {
    if (!title.trim() || !ingredients.trim() || !steps.trim()) {
      setError("Add a title, ingredients, and cooking steps.");
      return;
    }
    if (!Number.isInteger(Number(servings)) || Number(servings) < 1) {
      setError("Servings must be a whole number of at least 1.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const item = await recipeApi.create({
        title: title.trim(),
        description: description.trim() || undefined,
        servings: Number(servings),
        sourceUrl: sourceUrl || undefined,
        rawText: `Ingredients:\n${ingredients
          .split("\n")
          .filter((line) => line.trim())
          .map((line) => `- ${line.trim()}`)
          .join("\n")}\n\nInstructions:\n${steps
          .split("\n")
          .filter((line) => line.trim())
          .map(
            (line, i) => `${i + 1}. ${line.replace(/^\d+[.)]\s*/, "").trim()}`,
          )
          .join("\n")}`,
      });
      setRecipes((previous) => [item, ...previous]);
      router.replace({ pathname: "/recipe-detail", params: { id: item.id } });
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <FormPage>
      <Text style={s.title}>A keeper for your cookbook.</Text>
      {!!sourceUrl && (
        <Text selectable style={s.muted}>
          From: {sourceUrl}
        </Text>
      )}
      <Field
        label="Recipe title"
        placeholder="Sunday’s tomato pasta"
        value={title}
        onChangeText={setTitle}
        maxLength={120}
      />
      <Field
        label="A little note · optional"
        placeholder="Why you love it"
        value={description}
        onChangeText={setDescription}
      />
      <Field
        label="Servings"
        keyboardType="number-pad"
        value={servings}
        onChangeText={setServings}
      />
      <Field
        label="Ingredients · one per line"
        placeholder={"200 g pasta\n3 tomatoes\n2 tbsp olive oil"}
        multiline
        value={ingredients}
        onChangeText={setIngredients}
      />
      <Field
        label="Cooking steps · one per line"
        placeholder={"Bring a pot of water to a boil.\nChop the tomatoes."}
        multiline
        value={steps}
        onChangeText={setSteps}
      />
      <ErrorText message={error} />
      <Button
        title={busy ? "Saving…" : "Save recipe"}
        disabled={busy}
        onPress={() => void save()}
      />
    </FormPage>
  );
}
export function CaptureLinkScreen() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const isRecipe = kind !== "pantry";
  const [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const validate = () => {
    try {
      const link = new URL(url.trim());
      if (!["https:", "http:"].includes(link.protocol)) throw new Error();
      return true;
    } catch {
      setError("Paste a valid https:// or http:// link.");
      return false;
    }
  };
  const save = async () => {
    if (!validate()) return;
    setBusy(true);
    setError("");
    try {
      await ingestApi.ingest({
        source: isRecipe ? "SOCIAL_LINK" : "PRODUCT_LINK",
        sourceUrl: url.trim(),
        contentType: "text/plain",
        payload: url.trim(),
        metadata: { client: "cabinate-mobile", automaticExtraction: false },
      });
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <FormPage>
      <Text style={s.title}>
        {isRecipe ? "Found something delicious?" : "Keep that product handy."}
      </Text>
      <Text style={s.body}>
        {isRecipe
          ? "Save a link from Instagram, TikTok, or YouTube. Add its ingredients and steps by hand to turn it into a recipe."
          : "Save a product link, then add its details to your pantry by hand."}
      </Text>
      <Field
        label={isRecipe ? "Video link" : "Product link"}
        placeholder="https://…"
        autoCapitalize="none"
        keyboardType="url"
        value={url}
        onChangeText={(value) => {
          setUrl(value);
          setSaved(false);
        }}
      />
      <Text style={s.muted}>
        Automatic extraction is coming later. Saving a link keeps it in your
        capture inbox; it won’t create inventory or recipe details
        automatically.
      </Text>
      <ErrorText message={error} />
      <Button
        title={saved ? "Link saved" : busy ? "Saving…" : "Save link for later"}
        disabled={busy || saved}
        onPress={() => void save()}
      />
      {saved && (
        <Button
          secondary
          title="View saved links"
          onPress={() => router.push("/captures")}
        />
      )}
      <Button
        secondary
        title={isRecipe ? "Add the recipe details" : "Add the item manually"}
        onPress={() => {
          if (validate())
            router.push(
              isRecipe
                ? { pathname: "/add-recipe", params: { sourceUrl: url.trim() } }
                : "/add-pantry",
            );
        }}
      />
    </FormPage>
  );
}
export function ReceiptScreen() {
  const { data, update, ready } = useKitchen();
  const [uri, setUri] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const pick = async (library: boolean) => {
    setBusy(true);
    setError("");
    try {
      const image = await capturePhoto(library);
      if (image) {
        setUri(image);
        setSaved(false);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  const save = async () => {
    setBusy(true);
    try {
      await update((previous) => ({
        ...previous,
        receipts: [
          { id: newId(), date: localDate(), uri },
          ...previous.receipts,
        ],
      }));
      setSaved(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <FormPage>
      <Text style={s.title}>Bring the shop home.</Text>
      <Text style={s.body}>
        Photograph a receipt and keep it handy while you add your purchases.
      </Text>
      <Button
        title="Take a receipt photo"
        icon="camera"
        disabled={busy}
        onPress={() => void pick(false)}
      />
      <Button
        title="Choose from photos"
        secondary
        disabled={busy}
        onPress={() => void pick(true)}
      />
      {!!uri && (
        <>
          <Image
            accessibilityLabel="Receipt preview"
            source={{ uri }}
            resizeMode="contain"
            style={{
              width: "100%",
              height: 330,
              backgroundColor: "#EBEBDF",
              borderRadius: 16,
            }}
          />
          <Button
            title={saved ? "Receipt saved" : "Save receipt on this device"}
            disabled={busy || saved || !ready}
            onPress={() => void save()}
          />
          <Button
            secondary
            title="Add a purchased item"
            onPress={() => router.push("/add-pantry")}
          />
        </>
      )}
      <ErrorText message={error} />
      <Text style={s.muted}>
        Automatic receipt reading is coming later. Review the image and add each
        item manually for now.
      </Text>
      {data.receipts.length > 0 && (
        <Text style={s.heading}>Saved receipts</Text>
      )}
      {data.receipts.map((receipt) => (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Open receipt from ${receipt.date}`}
          key={receipt.id}
          style={[s.card, s.row]}
          onPress={() => {
            setUri(receipt.uri);
            setSaved(true);
          }}
        >
          <Image
            source={{ uri: receipt.uri }}
            style={{ width: 55, height: 65, borderRadius: 8 }}
          />
          <Text style={s.body}>{receipt.date}</Text>
        </Pressable>
      ))}
    </FormPage>
  );
}
