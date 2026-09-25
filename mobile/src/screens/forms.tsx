import { useRef, useState } from "react";
import { Image, Keyboard, Text, TextInput, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  Button,
  ErrorText,
  Field,
  FormPage,
  Sheet,
  Touch,
  s,
} from "../components/ui";
import { useFeedback } from "../components/feedback";
import { useFormDraft } from "../components/form-draft";
import DateField from "../components/date-field";
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
  const { upsertPantryItem } = useKitchen();
  const { notify } = useFeedback();
  const [name, setName] = useState(""),
    [quantity, setQuantity] = useState("1"),
    [unit, setUnit] = useState("pcs");
  const [category, setCategory] = useState(params.category || ""),
    [date, setDate] = useState(""),
    [location, setLocation] = useState("CABINET");
  const [details, setDetails] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saving = useRef(false);
  const nameInput = useRef<TextInput>(null),
    quantityInput = useRef<TextInput>(null),
    unitInput = useRef<TextInput>(null);
  const draft = useFormDraft(
    !!name ||
      quantity !== "1" ||
      unit !== "pcs" ||
      category !== (params.category || "") ||
      !!date ||
      location !== "CABINET",
    busy,
  );
  const save = async () => {
    if (saving.current) return;
    const invalid: Record<string, string> = {};
    if (!name.trim()) invalid.name = "Give this item a name.";
    if (!unit.trim()) invalid.unit = "Add a unit, such as pcs, g or ml.";
    if (!Number.isFinite(Number(quantity)) || Number(quantity) <= 0)
      invalid.quantity = "Use a quantity greater than zero.";
    if (date && !validDate(date))
      invalid.date = "Choose a valid expiration date.";
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      (invalid.name
        ? nameInput
        : invalid.quantity
          ? quantityInput
          : unitInput
      ).current?.focus();
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    Keyboard.dismiss();
    try {
      const item = await pantryApi.create({
        name: name.trim(),
        quantity: Number(quantity),
        unit: unit.trim(),
        category: category || categoryFor(name),
        location,
        expirationDate: date || undefined,
      });
      upsertPantryItem(item);
      notify("Added to your pantry");
      draft.finish(() =>
        router.canGoBack() ? router.back() : router.replace("/pantry"),
      );
    } catch (e) {
      setError((e as Error).message);
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
            title="Add to pantry"
            pending={busy}
            onPress={() => void save()}
          />
        </>
      }
    >
      {draft.guard}
      <Text style={s.title}>Add pantry item</Text>
      <Field
        inputRef={nameInput}
        onNext={() => quantityInput.current?.focus()}
        autoFocus
        label="Item name"
        placeholder="Whole milk"
        value={name}
        onChangeText={(value) => {
          setName(value);
          setErrors((previous) => ({ ...previous, name: "" }));
        }}
        error={errors.name}
        editable={!busy}
        maxLength={120}
        returnKeyType="next"
        onSubmitEditing={() => quantityInput.current?.focus()}
      />
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Field
            inputRef={quantityInput}
            onNext={() => unitInput.current?.focus()}
            label="Quantity"
            keyboardType="decimal-pad"
            value={quantity}
            onChangeText={(value) => {
              setQuantity(value);
              setErrors((previous) => ({ ...previous, quantity: "" }));
            }}
            error={errors.quantity}
            editable={!busy}
            returnKeyType="next"
            onSubmitEditing={() => unitInput.current?.focus()}
          />
        </View>
        <View style={{ flex: 1 }}>
          <Field
            inputRef={unitInput}
            label="Unit"
            placeholder="pcs, g, ml…"
            value={unit}
            onChangeText={(value) => {
              setUnit(value);
              setErrors((previous) => ({ ...previous, unit: "" }));
            }}
            error={errors.unit}
            editable={!busy}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />
        </View>
      </View>
      <DateField
        value={date}
        onChange={(value) => {
          setDate(value);
          setErrors((previous) => ({ ...previous, date: "" }));
        }}
        error={errors.date}
        disabled={busy}
      />
      <Touch
        accessibilityState={{ expanded: details }}
        disabled={busy}
        onPress={() => {
          Keyboard.dismiss();
          setDetails(!details);
        }}
        style={[s.card, { padding: 16 }]}
      >
        <Text style={s.body}>
          {details ? "Hide storage details" : "Category & storage"}
        </Text>
        <Text style={s.muted}>
          {category || categoryFor(name)} · {location.toLowerCase()}
        </Text>
      </Touch>
      {details && (
        <>
          <Text style={s.body}>Category</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {categories.map((value) => (
              <Touch
                key={value}
                disabled={busy}
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
              </Touch>
            ))}
          </View>
          <Text style={s.body}>Keep it in the…</Text>
          <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
            {["FRIDGE", "FREEZER", "CABINET", "COUNTER"].map((value) => (
              <Touch
                key={value}
                disabled={busy}
                accessibilityState={{ selected: location === value }}
                onPress={() => setLocation(value)}
                style={[
                  s.chip,
                  {
                    backgroundColor:
                      location === value ? "#E1E8CE" : "transparent",
                  },
                ]}
              >
                <Text style={s.body}>{value.toLowerCase()}</Text>
              </Touch>
            ))}
          </View>
        </>
      )}
    </FormPage>
  );
}

export function AddRecipeScreen() {
  const { sourceUrl = "" } = useLocalSearchParams<{ sourceUrl?: string }>();
  const { upsertRecipe } = useKitchen();
  const { notify } = useFeedback();
  const [title, setTitle] = useState(""),
    [description, setDescription] = useState(""),
    [ingredients, setIngredients] = useState(""),
    [steps, setSteps] = useState(""),
    [servings, setServings] = useState("2");
  const [details, setDetails] = useState(false),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const saving = useRef(false);
  const titleInput = useRef<TextInput>(null),
    ingredientsInput = useRef<TextInput>(null),
    stepsInput = useRef<TextInput>(null),
    servingsInput = useRef<TextInput>(null);
  const draft = useFormDraft(
    !!title || !!description || !!ingredients || !!steps || servings !== "2",
    busy,
  );
  const save = async () => {
    if (saving.current) return;
    const invalid: Record<string, string> = {};
    if (!title.trim()) invalid.title = "Give your recipe a title.";
    if (!ingredients.trim())
      invalid.ingredients = "Add at least one ingredient.";
    if (!steps.trim()) invalid.steps = "Add the cooking steps.";
    if (!Number.isInteger(Number(servings)) || Number(servings) < 1)
      invalid.servings = "Use a whole number of at least 1.";
    setErrors(invalid);
    if (Object.keys(invalid).length) {
      if (invalid.servings) setDetails(true);
      (invalid.title
        ? titleInput
        : invalid.ingredients
          ? ingredientsInput
          : invalid.steps
            ? stepsInput
            : servingsInput
      ).current?.focus();
      return;
    }
    saving.current = true;
    setBusy(true);
    setError("");
    Keyboard.dismiss();
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
      upsertRecipe(item);
      notify("Saved to your cookbook");
      draft.finish(() =>
        router.dismissTo({
          pathname: "/cookbook/recipe",
          params: { id: item.id },
        }),
      );
    } catch (e) {
      setError((e as Error).message);
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
            title="Save recipe"
            pending={busy}
            onPress={() => void save()}
          />
        </>
      }
    >
      {draft.guard}
      <Text style={s.title}>Add recipe</Text>
      {!!sourceUrl && (
        <Text selectable style={s.muted}>
          From: {sourceUrl}
        </Text>
      )}
      <Field
        inputRef={titleInput}
        autoFocus
        label="Recipe title"
        placeholder="Sunday’s tomato pasta"
        value={title}
        onChangeText={(value) => {
          setTitle(value);
          setErrors((previous) => ({ ...previous, title: "" }));
        }}
        error={errors.title}
        editable={!busy}
        maxLength={120}
        returnKeyType="next"
        onSubmitEditing={() => ingredientsInput.current?.focus()}
      />
      <Field
        inputRef={ingredientsInput}
        label="Ingredients · one per line"
        placeholder={"200 g pasta\n3 tomatoes\n2 tbsp olive oil"}
        multiline
        value={ingredients}
        onChangeText={(value) => {
          setIngredients(value);
          setErrors((previous) => ({ ...previous, ingredients: "" }));
        }}
        error={errors.ingredients}
        editable={!busy}
      />
      <Field
        inputRef={stepsInput}
        label="Cooking steps · one per line"
        placeholder={"Bring a pot of water to a boil.\nChop the tomatoes."}
        multiline
        value={steps}
        onChangeText={(value) => {
          setSteps(value);
          setErrors((previous) => ({ ...previous, steps: "" }));
        }}
        error={errors.steps}
        editable={!busy}
      />
      <Touch
        accessibilityState={{ expanded: details }}
        disabled={busy}
        onPress={() => setDetails(!details)}
        style={[s.card, { padding: 16 }]}
      >
        <Text style={s.body}>
          {details ? "Hide recipe details" : "Servings & description"}
        </Text>
        <Text style={s.muted}>Serves {servings}</Text>
      </Touch>
      {details && (
        <>
          <Field
            inputRef={servingsInput}
            label="Servings"
            keyboardType="number-pad"
            value={servings}
            onChangeText={(value) => {
              setServings(value);
              setErrors((previous) => ({ ...previous, servings: "" }));
            }}
            error={errors.servings}
            editable={!busy}
          />
          <Field
            label="Description · optional"
            placeholder="Why you love it"
            value={description}
            onChangeText={setDescription}
            editable={!busy}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />
        </>
      )}
    </FormPage>
  );
}

export function CaptureLinkScreen() {
  const { kind } = useLocalSearchParams<{ kind?: string }>();
  const isRecipe = kind !== "pantry";
  const { notify } = useFeedback();
  const [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [saved, setSaved] = useState(false);
  const saving = useRef(false);
  const draft = useFormDraft(!!url && !saved, busy);
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
    if (saving.current || saved || !validate()) return;
    saving.current = true;
    setBusy(true);
    setError("");
    Keyboard.dismiss();
    try {
      await ingestApi.ingest({
        source: isRecipe ? "SOCIAL_LINK" : "PRODUCT_LINK",
        sourceUrl: url.trim(),
        contentType: "text/plain",
        payload: url.trim(),
        metadata: { client: "cabinate-mobile", automaticExtraction: false },
      });
      setSaved(true);
      notify("Link saved");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <FormPage
      footer={
        <Button
          title={saved ? "Link saved" : "Save link for later"}
          pending={busy}
          disabled={saved}
          icon={saved ? "check" : undefined}
          onPress={() => void save()}
        />
      }
    >
      {draft.guard}
      <Text style={s.title}>
        {isRecipe ? "Save recipe link" : "Save product link"}
      </Text>
      <Text style={s.body}>
        {isRecipe
          ? "Save a video link for later, or add its ingredients and steps by hand."
          : "Save a product link, then add its details to your pantry by hand."}
      </Text>
      <Field
        autoFocus
        label={isRecipe ? "Video link" : "Product link"}
        placeholder="https://…"
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
        returnKeyType="done"
        onSubmitEditing={() => void save()}
        editable={!busy}
        value={url}
        onChangeText={(value) => {
          setUrl(value);
          setSaved(false);
          setError("");
        }}
        error={error}
      />
      <Text style={s.muted}>
        Saving a link keeps it in your capture inbox. Automatic extraction is
        coming later.
      </Text>
      {saved && (
        <>
          <Text accessibilityLiveRegion="polite" style={s.body}>
            Your link is saved in the capture inbox.
          </Text>
          <Button
            secondary
            title="View saved links"
            onPress={() => router.dismissTo("/captures")}
          />
        </>
      )}
      <Button
        secondary
        disabled={busy}
        title={isRecipe ? "Add the recipe details" : "Add the item manually"}
        onPress={() => {
          if (!validate()) return;
          if (isRecipe)
            draft.finish(() =>
              router.replace({
                pathname: "/add-recipe",
                params: { sourceUrl: url.trim() },
              }),
            );
          else router.push("/add-pantry");
        }}
      />
    </FormPage>
  );
}

export function ReceiptScreen() {
  const { data, update, ready } = useKitchen();
  const { notify } = useFeedback();
  const [uri, setUri] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [saved, setSaved] = useState(false);
  const saving = useRef(false);
  const draft = useFormDraft(!!uri && !saved, busy);
  const [replacement, setReplacement] = useState<(() => void) | null>(null);
  const afterReplacementDismiss = useRef<(() => void) | null>(null);
  const replacePhoto = (action: () => void) => {
    if (saving.current) return;
    if (uri && !saved) setReplacement(() => action);
    else action();
  };
  const pick = async (library: boolean) => {
    if (saving.current) return;
    saving.current = true;
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
      saving.current = false;
      setBusy(false);
    }
  };
  const save = async () => {
    if (saving.current || saved || !uri || !ready) return;
    saving.current = true;
    setBusy(true);
    setError("");
    try {
      await update((previous) => ({
        ...previous,
        receipts: [
          { id: newId(), date: localDate(), uri },
          ...previous.receipts,
        ],
      }));
      setSaved(true);
      notify("Receipt saved");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      saving.current = false;
      setBusy(false);
    }
  };
  return (
    <FormPage
      footer={
        uri ? (
          <>
            <ErrorText message={error} />
            <Button
              title={saved ? "Receipt saved" : "Save receipt on this device"}
              pending={busy}
              disabled={saved || !ready}
              icon={saved ? "check" : undefined}
              onPress={() => void save()}
            />
          </>
        ) : undefined
      }
    >
      {draft.guard}
      <Text style={s.title}>Receipt photo</Text>
      <Sheet
        visible={!!replacement}
        title="Replace this unsaved receipt?"
        onClose={() => setReplacement(null)}
        onDismiss={() => {
          const action = afterReplacementDismiss.current;
          afterReplacementDismiss.current = null;
          action?.();
        }}
      >
        <Text style={s.body}>
          Save your current receipt first if you want to keep it.
        </Text>
        <Button
          title="Keep current receipt"
          onPress={() => setReplacement(null)}
        />
        <Button
          title="Replace receipt"
          destructive
          onPress={() => {
            afterReplacementDismiss.current = replacement;
            setReplacement(null);
          }}
        />
      </Sheet>
      <Text style={s.body}>
        Photograph a receipt and keep it handy while you add your purchases.
      </Text>
      <Button
        title="Take a receipt photo"
        icon="camera"
        disabled={busy}
        onPress={() => replacePhoto(() => void pick(false))}
      />
      <Button
        title="Choose from photos"
        secondary
        disabled={busy}
        onPress={() => replacePhoto(() => void pick(true))}
      />
      {!uri && <ErrorText message={error} />}
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
          {saved && (
            <Text accessibilityLiveRegion="polite" style={s.body}>
              Your receipt is saved on this device.
            </Text>
          )}
          <Button
            secondary
            title="Add a purchased item"
            disabled={busy}
            onPress={() => router.push("/add-pantry")}
          />
        </>
      )}
      <Text style={s.muted}>
        Automatic receipt reading is coming later. Review the image and add each
        item manually for now.
      </Text>
      {data.receipts.length > 0 && (
        <Text style={s.heading}>Saved receipts</Text>
      )}
      {data.receipts.map((receipt) => (
        <Touch
          accessibilityLabel={`Open receipt from ${receipt.date}`}
          disabled={busy}
          key={receipt.id}
          style={[s.card, s.row]}
          onPress={() =>
            replacePhoto(() => {
              setUri(receipt.uri);
              setSaved(true);
              setError("");
            })
          }
        >
          <Image
            source={{ uri: receipt.uri }}
            style={{ width: 55, height: 65, borderRadius: 8 }}
          />
          <Text style={s.body}>{receipt.date}</Text>
        </Touch>
      ))}
    </FormPage>
  );
}
