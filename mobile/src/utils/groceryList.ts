import type { PantryItem } from '../types/pantry';
import type { Recipe } from '../types/recipe';

const ingredientLinePattern =
  /^[-*]?\s*(\d|one|two|three|four|five|six|seven|eight|nine|ten|cup|tbsp|tsp|oz|g|gram|grams|ml|lb|lbs|can|cans|clove|cloves|large|small|medium)/i;

export function buildDraftGroceryList(recipe: Recipe | null, pantryItems: PantryItem[]): string[] {
  if (!recipe) {
    return [];
  }

  const pantryNames = pantryItems.map((item) => normalize(item.name)).filter(Boolean);

  return recipe.rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && ingredientLinePattern.test(line))
    .map(cleanIngredientLine)
    .filter((line) => line.length > 0)
    .filter((line) => !pantryNames.some((name) => normalize(line).includes(name) || name.includes(normalize(line))))
    .slice(0, 12);
}

function cleanIngredientLine(line: string): string {
  return line.replace(/^[-*]\s*/, '').replace(/\s+/g, ' ').trim();
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\b(organic|fresh|large|small|medium|whole|chopped|diced|minced|sliced|thin|extra virgin)\b/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}
