import { useEffect, useRef, useState } from "react";
import { Keyboard, Text, View } from "react-native";
import { recipeApi } from "../services/api";
import type { GeneratedRecipe } from "../types/recipe";
import { Button, ErrorText, s } from "./ui";

export function RecipeGenerator({ onChoose, disabled, hasDraft }: {
  onChoose: (recipe: GeneratedRecipe) => void;
  disabled: boolean;
  hasDraft: boolean;
}) {
  const [recipes, setRecipes] = useState<GeneratedRecipe[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<number | null>(null);
  const history = useRef<string[]>([]);
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);

  const generate = async () => {
    if (request.current) return;
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
      history.current = [...history.current, ...next.map((recipe) => recipe.title)].slice(-60);
    } catch (e) {
      if (!controller.signal.aborted) {
        const failure = e as { status?: number; message?: string };
        setError(failure.status === 0
          ? "Could not generate recipes. Check your connection and try again. Your draft is still here."
          : failure.message || "Could not generate recipes. Please try again.");
      }
    } finally {
      if (!controller.signal.aborted) setPending(false);
      request.current = null;
    }
  };

  return (
    <View style={s.card}>
      <Text style={s.eyebrow}>Cook with what you have</Text>
      <Text style={s.heading}>Come up with something</Text>
      <Text style={s.muted}>Get three recipe ideas using your pantry ingredients. Pick a favorite to review and save.</Text>
      <Button
        title={pending ? "Coming up with three ideas…" : recipes.length ? "Generate three new recipes" : "Generate three recipes"}
        pending={pending}
        disabled={disabled}
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
          <Button secondary title={hasDraft ? "Replace draft with this recipe" : "Use this recipe"}
            disabled={disabled || pending} onPress={() => onChoose(recipe)} />
        </View>
      ))}
    </View>
  );
}
