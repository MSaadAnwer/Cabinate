import { useFormDraft } from "../components/form-draft";
import { Touch as Pressable, useFeedback } from "../components/feedback";
import { useRef, useState } from "react";
import { RefreshControl, Switch, Text, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { FoodShape, Icon } from "../components/art";
import {
  Button,
  CheckRow,
  DataNotice,
  Empty,
  ErrorText,
  Field,
  SearchField,
  FloatingAdd,
  FormPage,
  Page,
  reportError,
  s,
} from "../components/ui";
import { useKitchen } from "../state/kitchen-store";
import {
  inPantry,
  newId,
  parseRecipe,
  categoryFor,
  recipeArtwork,
} from "../utils/kitchen";

export default function CookbookScreen() {
  const {
    recipes,
    recipeState: { loading, loaded, error },
    reload,
  } = useKitchen();
  const [query, setQuery] = useState("");
  const matches = recipes.filter((recipe) =>
    recipe.title.toLowerCase().includes(query.toLowerCase()),
  );
  return (
    <View style={{ flex: 1 }}>
      <Page
        refreshControl={
          <RefreshControl refreshing={loading && loaded} onRefresh={reload} />
        }
      >
        <View style={s.row}>
          <Text style={[s.title, { flex: 1 }]}>Your cookbook.</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="AI pantry recipes"
            onPress={() => router.push("/inspiration")}
            style={{
              width: 48,
              height: 48,
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 24,
              backgroundColor: "#EAE2B9",
            }}
          >
            <Icon name="sparkles" />
          </Pressable>
        </View>
        <SearchField
          label="Find a recipe"
          value={query}
          onChangeText={setQuery}
          placeholder="Something delicious…"
        />
        <DataNotice
          loading={loading}
          loaded={loaded}
          error={error}
          onRetry={() => void reload()}
        />
        {matches.map((recipe) => (
          <Pressable
            key={recipe.id}
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: "/cookbook/recipe",
                params: { id: recipe.id },
              })
            }
            style={[s.card, s.row, { padding: 14 }]}
          >
            <View
              style={{
                backgroundColor: recipeArtwork(recipe.id).background,
                borderRadius: 16,
                width: 80,
                height: 104,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <FoodShape
                category={recipeArtwork(recipe.id).category}
                width={64}
                height={80}
              />
            </View>
            <View style={{ flex: 1, gap: 9 }}>
              <Text style={[s.heading, { fontSize: 21 }]}>{recipe.title}</Text>
              <Text style={s.muted}>
                {(recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0) >
                0
                  ? `${(recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0)} min · `
                  : ""}
                {recipe.servings
                  ? `Serves ${recipe.servings}`
                  : "Made for your table"}
              </Text>
            </View>
            <Icon name="chevron" size={16} />
          </Pressable>
        ))}
        {!matches.length && loaded && !loading && !query && (
          <Empty
            title="A recipe worth keeping"
            text="Add a family favorite by hand, or save a video link for later."
          />
        )}
        {!matches.length && loaded && !!query && (
          <Text style={s.muted}>No recipes match “{query}”.</Text>
        )}
      </Page>
      <FloatingAdd
        actions={[
          {
            title: "Write a recipe",
            icon: "edit",
            onPress: () => router.push("/add-recipe"),
          },
          {
            title: "Paste a video link",
            icon: "link",
            onPress: () =>
              router.push({
                pathname: "/capture-link",
                params: { kind: "recipe" },
              }),
          },
        ]}
      />
    </View>
  );
}
export function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    recipes,
    data,
    update,
    recipeState: { loaded, loading, error },
    reload,
  } = useKitchen();
  const [tab, setTab] = useState<"ingredients" | "steps">("ingredients");
  const recipe = recipes.find((item) => item.id === id);
  if (!recipe && (!loaded || loading || error))
    return (
      <Page>
        <DataNotice
          loading={loading}
          loaded={loaded}
          error={error}
          subject="this recipe"
          onRetry={() => void reload()}
        />
      </Page>
    );
  if (!recipe)
    return (
      <Page>
        <Empty
          title="Recipe not found"
          text="Return to your cookbook to choose another recipe."
        />
      </Page>
    );
  const parsed = parseRecipe(recipe.rawText),
    checked = data.steps[id] || [];
  return (
    <Page>
      <Text style={s.eyebrow}>From your cookbook</Text>
      <Text style={s.title}>{recipe.title}</Text>
      {recipe.description && <Text style={s.body}>{recipe.description}</Text>}
      <Text style={s.muted}>
        {recipe.servings ? `Serves ${recipe.servings}` : ""}
        {recipe.cookTimeMinutes
          ? ` · ${recipe.cookTimeMinutes} min cooking`
          : ""}
      </Text>
      <Button
        secondary
        icon="list"
        title="Make a grocery list"
        onPress={() =>
          router.push({ pathname: "/import-list", params: { recipeId: id } })
        }
      />
      <View style={[s.row, { gap: 8 }]}>
        {(["ingredients", "steps"] as const).map((value) => (
          <Pressable
            key={value}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === value }}
            onPress={() => setTab(value)}
            style={[
              s.chip,
              {
                flex: 1,
                alignItems: "center",
                backgroundColor: tab === value ? "#E2E8D2" : "transparent",
              },
            ]}
          >
            <Text style={s.body}>
              {value === "ingredients" ? "Ingredients" : "Let’s cook"}
            </Text>
          </Pressable>
        ))}
      </View>
      {tab === "ingredients" ? (
        <View style={s.card}>
          {parsed.ingredients.length ? (
            parsed.ingredients.map((line, i) => (
              <Text selectable key={i} style={[s.body, { paddingVertical: 5 }]}>
                • {line}
              </Text>
            ))
          ) : (
            <Text style={s.muted}>
              No separate ingredient list yet. Add ingredients when saving your
              next recipe.
            </Text>
          )}
        </View>
      ) : (
        <View>
          <Text style={s.muted}>
            {checked.length} of {parsed.steps.length} steps complete
          </Text>
          {parsed.steps.map((step, index) => (
            <CheckRow
              key={index}
              checked={checked.includes(index)}
              title={`${index + 1}. ${step}`}
              onPress={() => {
                void update((previous) => {
                  const values = previous.steps[id] || [];
                  return {
                    ...previous,
                    steps: {
                      ...previous.steps,
                      [id]: values.includes(index)
                        ? values.filter((value) => value !== index)
                        : [...values, index],
                    },
                  };
                }).catch(reportError);
              }}
            />
          ))}
          {!parsed.steps.length && (
            <Text selectable style={s.body}>
              {recipe.rawText}
            </Text>
          )}
          {parsed.steps.length > 0 &&
            checked.length === parsed.steps.length && (
              <View style={{ paddingTop: 24, gap: 16 }}>
                <Text style={s.heading}>Dinner is served.</Text>
                <Button
                  icon="camera"
                  title="Save a meal photo"
                  onPress={() => router.push("/calendar")}
                />
                <Button
                  secondary
                  title="Reset cooking progress"
                  onPress={() => {
                    void update((previous) => ({
                      ...previous,
                      steps: { ...previous.steps, [id]: [] },
                    })).catch(reportError);
                  }}
                />
              </View>
            )}
        </View>
      )}
    </Page>
  );
}
export function ImportListScreen() {
  const { recipeId } = useLocalSearchParams<{ recipeId?: string }>();
  const {
    recipes,
    pantry,
    recipeState: { loading, loaded, error: apiError },
    pantryState,
    reload,
    data,
    update,
    ready,
  } = useKitchen();
  const [selected, setSelected] = useState(recipeId || "");
  const [usePantry, setUsePantry] = useState(false),
    [name, setName] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const [excluded, setExcluded] = useState<string[]>([]);
  const recipe = recipes.find((item) => item.id === selected);
  const ingredients = recipe ? parseRecipe(recipe.rawText).ingredients : [];
  const available = ingredients.filter(
    (line) => usePantry && inPantry(line, pantry),
  );
  const included = ingredients.filter(
    (line) => !available.includes(line) && !excluded.includes(line),
  );
  const { notify } = useFeedback();
  const saving = useRef(false);
  const draft = useFormDraft(
    selected !== (recipeId || "") || !!name || usePantry || excluded.length > 0,
    busy,
  );
  const save = async () => {
    if (
      saving.current ||
      !ready ||
      !recipe ||
      !included.length ||
      (usePantry &&
        (!pantryState.loaded || pantryState.loading || !!pantryState.error))
    )
      return;
    saving.current = true;
    setBusy(true);
    setError("");
    const id = newId();
    try {
      await update((previous) => ({
        ...previous,
        lists: [
          {
            id,
            name: name.trim() || `For ${recipe.title}`,
            createdAt: new Date().toISOString(),
            items: included.map((line) => ({
              id: newId(),
              name: line,
              category: categoryFor(line),
              checked: false,
            })),
          },
          ...previous.lists,
        ],
      }));
      notify("List created");
      draft.finish(() =>
        router.dismissTo({ pathname: "/lists/detail", params: { id } }),
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
        recipe ? (
          <>
            <ErrorText message={error} />
            <Button
              title={`Create list · ${included.length} items`}
              pending={busy}
              disabled={
                !included.length ||
                !ready ||
                (usePantry &&
                  (!pantryState.loaded ||
                    pantryState.loading ||
                    !!pantryState.error))
              }
              onPress={() => void save()}
            />
          </>
        ) : undefined
      }
    >
      {draft.guard}
      <Text style={s.title}>From recipe to list.</Text>
      <Text style={s.body}>Choose something you’d love to cook.</Text>
      <DataNotice
        loading={loading}
        loaded={loaded}
        error={apiError}
        onRetry={() => void reload()}
      />
      {recipes.map((item) => (
        <Pressable
          key={item.id}
          disabled={busy}
          accessibilityRole="radio"
          accessibilityState={{ checked: selected === item.id }}
          onPress={() => {
            setSelected(item.id);
            setExcluded([]);
            setName("");
          }}
          style={[
            s.card,
            s.row,
            {
              padding: 15,
              backgroundColor: selected === item.id ? "#E6EBD7" : "#FFFEF7",
            },
          ]}
        >
          <Text style={[s.body, { flex: 1 }]}>{item.title}</Text>
          {selected === item.id && <Icon name="check" />}
        </Pressable>
      ))}
      {!recipes.length && loaded && !loading && (
        <Empty
          title="Start with a recipe"
          text="Save a recipe in your cookbook, then come back to make its shopping list."
        />
      )}
      {recipe && (
        <>
          <Field
            label="List name"
            editable={!busy}
            placeholder={`For ${recipe.title}`}
            value={name}
            onChangeText={setName}
          />
          <View style={s.row}>
            <View style={{ flex: 1 }}>
              <Text style={s.body}>Use what’s in my pantry</Text>
              <Text style={s.muted}>Skip matching, unexpired ingredients.</Text>
            </View>
            <Switch
              accessibilityLabel="Use pantry when making this list"
              value={usePantry}
              onValueChange={setUsePantry}
              disabled={
                busy ||
                (!usePantry &&
                  (!pantryState.loaded ||
                    pantryState.loading ||
                    !!pantryState.error))
              }
              trackColor={{ true: "#819568" }}
            />
          </View>
          <DataNotice
            loading={pantryState.loading}
            loaded={pantryState.loaded}
            error={pantryState.error}
            subject="your pantry"
            onRetry={() => void reload()}
          />
          <Text style={s.muted}>
            Review before saving: matching uses ingredient names, not
            quantities. Items with different names stay on your list.
          </Text>
          {ingredients.map((line, index) => (
            <CheckRow
              key={index}
              checked={included.includes(line)}
              disabled={busy || available.includes(line)}
              title={line}
              detail={
                available.includes(line)
                  ? "In your pantry · switch pantry matching off to include"
                  : undefined
              }
              onPress={() => {
                if (!available.includes(line))
                  setExcluded((previous) =>
                    previous.includes(line)
                      ? previous.filter((value) => value !== line)
                      : [...previous, line],
                  );
              }}
            />
          ))}
          {!ingredients.length && (
            <Text style={s.muted}>
              This recipe doesn’t have a readable ingredient section. Create a
              manual list for it instead.
            </Text>
          )}
          {ingredients.length > 0 && !included.length && (
            <Text style={s.body}>
              Nothing left to buy. Include an ingredient above if you still need
              it.
            </Text>
          )}

          <Text style={s.muted}>
            {data.lists.length} lists saved on this device
          </Text>
        </>
      )}
    </FormPage>
  );
}
export function InspirationScreen() {
  const { pantry, recipes, loaded, loading, error, reload } = useKitchen();
  const matches = recipes
    .map((recipe) => ({
      recipe,
      count: parseRecipe(recipe.rawText).ingredients.filter((line) =>
        inPantry(line, pantry),
      ).length,
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count);
  return (
    <Page>
      <Icon name="sparkles" size={38} />
      <Text style={s.title}>What’s for dinner?</Text>
      <View style={s.card}>
        <Text style={s.heading}>A little inspiration, coming soon.</Text>
        <Text style={s.body}>
          AI recipe creation will live here. For now, rediscover saved recipes
          that use ingredients you already have.
        </Text>
      </View>
      <DataNotice
        loading={loading}
        loaded={loaded}
        error={error}
        onRetry={() => void reload()}
      />
      {matches.map(({ recipe, count }) => (
        <Pressable
          key={recipe.id}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: "/cookbook/recipe",
              params: { id: recipe.id },
            })
          }
          style={s.card}
        >
          <Text style={s.heading}>{recipe.title}</Text>
          <Text style={s.muted}>
            {count} ingredient{count === 1 ? "" : "s"} matched in your pantry
          </Text>
        </Pressable>
      ))}
      {!matches.length && loaded && (
        <Text style={s.muted}>
          No saved recipe matches yet. Add pantry items and recipes to start
          finding ideas here.
        </Text>
      )}
    </Page>
  );
}
