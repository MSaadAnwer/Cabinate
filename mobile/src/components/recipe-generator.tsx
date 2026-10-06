import { useEffect, useRef, useState } from "react";
import { Keyboard, Text, View } from "react-native";
import { recipeApi } from "../services/api";
import type { GeneratedRecipe } from "../types/recipe";
import { Button, ErrorText, s } from "./ui";

export function RecipeGenerator({ onChoose, disabled, hasDraft, variant = "draft" }: {
  onChoose: (recipe: GeneratedRecipe) => void | Promise<void>;
  disabled: boolean;
  hasDraft: boolean;
  variant?: "draft" | "inspiration";
}) {
  const [recipes, setRecipes] = useState<GeneratedRecipe[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const [savingIndex, setSavingIndex] = useState<number | null>(null);
  const [saved, setSaved] = useState<number[]>([]);
  const choosing = useRef(false);
  const history = useRef<string[]>([]);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const generate = async () => {
    if (request.current || choosing.current) return;
    Keyboard.dismiss();
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    setError("");
    try {
      const next = await recipeApi.generate(history.current, controller.signal);
      if (controller.signal.aborted) return;
      setRecipes(next);
      setExpanded(null);
      setSaved([]);
      history.current = [...history.current, ...next.map((recipe) => recipe.title)].slice(-60);
    } catch (e) {
      if (!controller.signal.aborted) {
        const failure = e as { status?: number; message?: string };
        setError(failure.status === 0
          ? "Could not generate recipes. Check your connection and try again."
          : failure.message || "Could not generate recipes. Please try again.");
      }
    } finally {
      if (!controller.signal.aborted) setPending(false);
      request.current = null;
    }
  };

  const choose = async (recipe: GeneratedRecipe, index: number) => {
    if (choosing.current || request.current || saved.includes(index)) return;
    choosing.current = true;
    setSavingIndex(index);
    setError("");
    try {
      await onChoose(recipe);
      if (variant === "inspiration") setSaved(previous => [...previous, index]);
    } catch (e) {
      setError((e as Error).message || "Could not save this recipe. Try again.");
    } finally {
      choosing.current = false;
      setSavingIndex(null);
    }
  };

  return (
    <View style={variant === "inspiration" ? { gap: 12 } : s.card}>
      {variant === "draft" && <>
      <Text style={s.eyebrow}>Cook with what you have</Text>
      <Text style={s.heading}>Come up with something</Text>
      <Text style={s.muted}>Get three recipe ideas using your pantry ingredients. Pick a favorite to review and save.</Text>
      </>}
      <Button
        title={pending ? "Coming up with three ideas…" : recipes.length ? "Generate three new recipes" : variant === "inspiration" ? "Generate recipes" : "Generate three recipes"}
        icon="sparkles"
        pending={pending}
        disabled={disabled || savingIndex !== null}
        onPress={() => void generate()}
      />
      <ErrorText message={error} />
      {recipes.map((recipe, index) => (
        <View key={recipe.title} style={s.card}>
          <Text style={s.heading}>{recipe.title}</Text>
          <Text style={s.body}>{recipe.description}</Text>
          <Text style={s.muted}>{recipe.prepTimeMinutes + recipe.cookTimeMinutes} min · Serves {recipe.servings}</Text>
          <Text style={s.muted}>{recipe.ingredients.join(" · ")}</Text>
          <Button secondary title={expanded === index ? "Hide cooking steps" : "Preview cooking steps"}
            onPress={() => setExpanded(expanded === index ? null : index)} />
          {expanded === index && recipe.steps.map((step, i) => (
            <Text key={i} style={s.body}>{i + 1}. {step}</Text>
          ))}
          <Button secondary title={variant === "inspiration" ? saved.includes(index) ? "Saved to cookbook" : "Save to cookbook" : hasDraft ? "Replace draft with this recipe" : "Use this recipe"}
            pending={savingIndex === index}
            disabled={disabled || pending || savingIndex !== null || saved.includes(index)} onPress={() => void choose(recipe, index)} />
        </View>
      ))}
    </View>
  );
}
