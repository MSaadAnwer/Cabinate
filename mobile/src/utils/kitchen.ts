import type { PantryItem } from "../types/pantry";

export const categories = [
  "Produce",
  "Dairy",
  "Frozen",
  "Meat & fish",
  "Bread & grains",
  "Cupboard",
  "Other",
] as const;
export type Category = (typeof categories)[number];
export const categoryColors = [
  "#BCCD9A",
  "#B8D5DF",
  "#DFCCE4",
  "#E6A59A",
  "#EED58F",
  "#C8C0A4",
  "#D7D9C8",
];

export function categoryFor(
  name: string,
  category?: string | null,
  location?: string | null,
): Category {
  if (location?.toUpperCase() === "FREEZER") return "Frozen";
  const aliases: Record<string, Category> = {
    PRODUCE: "Produce",
    DAIRY: "Dairy",
    FROZEN: "Frozen",
    MEAT: "Meat & fish",
    GRAINS: "Bread & grains",
    PANTRY: "Cupboard",
  };
  if (category && aliases[category.toUpperCase()])
    return aliases[category.toUpperCase()];
  if (category && categories.includes(category as Category))
    return category as Category;
  const text = name.toLowerCase();
  if (/\b(frozen|ice cream)\b/.test(text)) return "Frozen";
  if (
    /\b(milk|cheese|yogurt|butter|cream|eggs?|feta|parmesan|parmigiano)\b/.test(
      text,
    )
  )
    return "Dairy";
  if (/\b(chicken|beef|salmon|fish|pork|turkey|shrimp|bacon|tuna)\b/.test(text))
    return "Meat & fish";
  if (
    /\b(bread|pasta|rice|oats|flour|quinoa|fettuccine|tortillas?)\b/.test(text)
  )
    return "Bread & grains";
  if (
    /\b(tomato\w*|onion\w*|garlic|pepper\w*|lemon\w*|lime\w*|apple\w*|banana\w*|spinach|avocado\w*|berries|blueberries|raspberries|asparagus|cilantro|parsley|dill|potato\w*|carrot\w*|lettuce)\b/.test(
      text,
    )
  )
    return "Produce";
  if (
    /\b(oil|salt|spice\w*|honey|beans?|chickpeas?|cans?|cumin|paprika|tahini|sugar|syrup|seeds?)\b/.test(
      text,
    )
  )
    return "Cupboard";
  return "Other";
}

export function parseRecipe(raw: string): {
  ingredients: string[];
  steps: string[];
} {
  const ingredients: string[] = [],
    steps: string[] = [];
  let section: "ingredients" | "steps" | null = null;
  for (const original of raw.split(/\r?\n/)) {
    const line = original.trim();
    if (!line) continue;
    if (/^ingredients?\s*:?$/i.test(line)) {
      section = "ingredients";
      continue;
    }
    if (/^(instructions?|directions?|method|steps?)\s*:?$/i.test(line)) {
      section = "steps";
      continue;
    }
    if (section === "steps" || (!section && /^\d+[.)]\s/.test(line)))
      steps.push(line.replace(/^\d+[.)]\s*/, ""));
    else if (section === "ingredients" || /^[-*•]/.test(line))
      ingredients.push(line.replace(/^[-*•]\s*/, ""));
  }
  return { ingredients, steps };
}

// Conservative, whole-word matching. Never treat "milk" as "almond milk" or "rice" as "rice vinegar".
export function ingredientName(line: string): string {
  return line
    .toLowerCase()
    .split(/[,;(]/)[0]
    .replace(/^[\s\d./¼½¾⅓⅔⅛-]+/, "")
    .replace(
      /^(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|grams?|g|kg|ml|l|lbs?|pounds?|cans?|cloves?|pinch|scoops?)\b\s*/i,
      "",
    )
    .replace(
      /\b(fresh|organic|large|small|medium|chopped|diced|minced|sliced|whole|unsalted|grated|cooked)\b/g,
      "",
    )
    .replace(/[^a-z\s]/g, "")
    .replace(/\b(tomatoes)\b/g, "tomato")
    .replace(/\b(potatoes)\b/g, "potato")
    .replace(
      /\b(eggs|onions|lemons|carrots|cloves|apples|bananas)\b/g,
      (word) => word.slice(0, -1),
    )
    .replace(/\s+/g, " ")
    .trim();
}
export function inPantry(line: string, pantry: PantryItem[]): boolean {
  const name = ingredientName(line);
  const today = localDate();
  return (
    !!name &&
    pantry.some(
      (item) =>
        item.quantity > 0 &&
        (!item.expirationDate || item.expirationDate >= today) &&
        ingredientName(item.name) === name,
    )
  );
}
export function localDate(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function validDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T12:00:00`);
  return !Number.isNaN(date.getTime()) && localDate(date) === value;
}
export function daysUntil(date: string): number {
  return Math.round(
    (new Date(`${date}T12:00:00`).getTime() -
      new Date(`${localDate()}T12:00:00`).getTime()) /
      86400000,
  );
}
export function expiryLabel(date?: string | null): string {
  if (!date) return "No expiration set";
  const days = daysUntil(date);
  if (days < 0) return `Expired ${Math.abs(days)}d ago`;
  if (days === 0) return "Expires today";
  if (days === 1) return "Expires tomorrow";
  return `Expires in ${days} days`;
}
export const newId = () =>
  `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
