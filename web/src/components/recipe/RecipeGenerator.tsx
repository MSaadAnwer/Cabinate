import { useEffect, useRef, useState } from 'react';
import { recipeApi } from '../../services/api';
import type { GeneratedRecipe } from '../../types/recipe';

export function RecipeGenerator({ disabled, hasDraft, onChoose }: {
  disabled: boolean;
  hasDraft: boolean;
  onChoose: (recipe: GeneratedRecipe) => void;
}) {
  const [recipes, setRecipes] = useState<GeneratedRecipe[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const history = useRef<string[]>([]);
  const active = useRef<AbortController | null>(null);
  useEffect(() => () => active.current?.abort(), []);
  const generate = async () => {
    if (active.current) return;
    const controller = new AbortController();
    active.current = controller;
    setPending(true);
    setError('');
    try {
      const next = await recipeApi.generate(history.current, controller.signal);
      if (controller.signal.aborted) return;
      setRecipes(next);
      history.current = [...history.current, ...next.map(recipe => recipe.title)].slice(-60);
    } catch (e) {
      if (!controller.signal.aborted) setError((e as { message?: string }).message || 'Could not generate recipes. Please try again.');
    } finally {
      if (!controller.signal.aborted) setPending(false);
      active.current = null;
    }
  };
  return <section style={{ marginBottom: 24, display: 'grid', gap: 12 }} aria-label="Pantry recipe ideas">
    <h3>Come up with something</h3>
    <p>Get three recipes using your pantry ingredients. Choose one to review and save.</p>
    <button type="button" className="btn btn-secondary" disabled={disabled || pending} onClick={() => void generate()}>
      {pending ? 'Coming up with three ideas…' : recipes.length ? 'Generate three new recipes' : 'Generate three recipes'}
    </button>
    {error && <p role="alert">{error}</p>}
    <div aria-live="polite" aria-busy={pending} style={{ display: 'grid', gap: 12 }}>
      {recipes.map(recipe => <article key={recipe.title} style={{ padding: 16, border: '1px solid var(--color-border)', borderRadius: 12 }}>
        <h4>{recipe.title}</h4>
        <p>{recipe.description}</p>
        <p>{recipe.prepTimeMinutes + recipe.cookTimeMinutes} min · Serves {recipe.servings}</p>
        <details style={{ margin: '12px 0' }}>
          <summary>Ingredients & cooking steps</summary>
          <ul>{recipe.ingredients.map((ingredient, i) => <li key={i}>{ingredient}</li>)}</ul>
          <ol>{recipe.steps.map((step, i) => <li key={i}>{step}</li>)}</ol>
        </details>
        <button type="button" className="btn btn-secondary" disabled={disabled || pending} onClick={() => onChoose(recipe)}>
          {hasDraft ? 'Replace draft with this recipe' : 'Use this recipe'}
        </button>
      </article>)}
    </div>
  </section>;
}
