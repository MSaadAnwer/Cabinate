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
  corrections?: Record<string, Category>,
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
  const key = groceryKey(name);
  if (corrections && Object.hasOwn(corrections, key)) return corrections[key];
  const text = ` ${key} `;
  if (text.includes(" frozen ") || text.includes(" ice cream "))
    return "Frozen";
  // Match whole words and prefer specific products over their ingredients:
  // peanut butter, orange juice and coconut milk are not dairy or produce.
  const matches = foodVocabulary.filter(({ phrase }) =>
    text.includes(` ${phrase} `),
  );
  matches.sort(
    (a, b) =>
      b.phrase.split(" ").length - a.phrase.split(" ").length ||
      b.priority - a.priority,
  );
  if (matches.length) return matches[0].category;
  return "Other";
}

const singulars: Record<string, string> = {
  tomatoes: "tomato",
  potatoes: "potato",
  sweetcorn: "corn",
  chillies: "chili",
  chilies: "chili",
  leaves: "leaf",
  loaves: "loaf",
  knives: "knife",
  mangoes: "mango",
  avocados: "avocado",
};
/** Same product spelling for plurals, accents, quantities and common descriptors. */
export function groceryKey(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\d+(?:[./]\d+)?/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
    .map(
      (word) =>
        singulars[word] ||
        (word.endsWith("ies")
          ? `${word.slice(0, -3)}y`
          : /(ches|shes|xes|zes)$/.test(word)
            ? word.slice(0, -2)
            : word.endsWith("s") && !/(ss|us|is)$/.test(word)
              ? word.slice(0, -1)
              : word),
    )
    .filter(
      (word) =>
        !/^(a|an|of|fresh|organic|large|small|medium|chopped|diced|sliced|whole|cup|tbsp|tsp|teaspoon|tablespoon|lb|oz|kg|g|ml|liter|litre|pound|ounce|pack|bag|bunch)$/.test(
          word,
        ),
    )
    .join(" ");
}

const foodGroups: [Category, number, string][] = [
  [
    "Produce",
    0,
    "apple|orange|mandarin|clementine|tangerine|grapefruit|lemon|lime|banana|pear|peach|nectarine|plum|apricot|cherry|grape|strawberry|blueberry|raspberry|blackberry|berry|cranberry|mango|pineapple|melon|watermelon|cantaloupe|kiwi|papaya|pomegranate|fig|date|avocado|tomato|potato|sweet potato|yam|onion|shallot|garlic|ginger|carrot|celery|lettuce|spinach|kale|cabbage|broccoli|cauliflower|cucumber|zucchini|courgette|squash|pumpkin|eggplant|aubergine|pepper|chili|jalapeno|mushroom|asparagus|artichoke|beet|beetroot|radish|turnip|parsnip|leek|fennel|okra|corn|pea|green bean|snap pea|brussels sprout|cilantro|coriander|parsley|basil|dill|mint|rosemary|thyme|sage|chive|scallion|spring onion|arugula|rocket",
  ],
  [
    "Dairy",
    1,
    "milk|cheese|yogurt|yoghurt|butter|cream|egg|feta|parmesan|parmigiano|mozzarella|cheddar|ricotta|gouda|brie|kefir|buttermilk|sour cream|cream cheese|cottage cheese|heavy cream",
  ],
  [
    "Meat & fish",
    2,
    "chicken|beef|salmon|fish|pork|turkey|shrimp|prawn|bacon|tuna|lamb|steak|sausage|ham|duck|cod|haddock|tilapia|trout|sardine|mackerel|crab|lobster|mussel|clam|scallop|ground beef|ground turkey",
  ],
  [
    "Bread & grains",
    3,
    "bread|sourdough|bagel|baguette|roll|pita|naan|tortilla|croissant|pasta|rice|oat|flour|quinoa|fettuccine|spaghetti|penne|macaroni|noodle|couscous|bulgur|barley|cereal|granola|oatmeal",
  ],
  [
    "Cupboard",
    4,
    "can|canned|tin|tinned|jarred|oil|salt|spice|cinnamon|nutmeg|turmeric|oregano|clove|honey|bean|chickpea|lentil|cumin|paprika|tahini|sugar|syrup|seed|nut|almond|walnut|cashew|peanut|pistachio|pecan|vinegar|sauce|ketchup|mustard|mayonnaise|jam|jelly|raisin|dried fruit|chocolate|cocoa|coffee|tea|soda|sparkling water|cracker|chip|juice|stock|broth|soup|tofu|tempeh|baking powder|baking soda|peanut butter|almond butter|coconut milk|coconut cream|almond milk|oat milk|soy milk|rice milk|orange juice|apple juice|lemon juice|lime juice|tomato sauce|tomato paste|chicken stock|chicken broth|beef stock|beef broth|fish sauce|soy sauce|rice vinegar|black pepper|white pepper|chili powder|garlic powder|onion powder|dried basil|dried thyme|dried rosemary|dried dill|dried parsley|canned tuna|canned salmon|canned tomato|canned corn|canned bean",
  ],
  [
    "Other",
    5,
    "can opener|paper towel|toilet paper|dish soap|hand soap|laundry detergent|trash bag|cat food|dog food|apple cider soap",
  ],
];
const foodVocabulary = foodGroups.flatMap(([category, priority, words]) =>
  words
    .split("|")
    .map((word) => ({ category, priority, phrase: groceryKey(word) })),
);

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

export function recipeArtwork(id: string) {
  let hash = 0;
  for (const char of id) hash = ((hash << 5) - hash + char.charCodeAt(0)) >>> 0;
  const styles = [
    { category: "Produce" as Category, background: "#EFF0DE" },
    { category: "Meat & fish" as Category, background: "#E9EEE9" },
    { category: "Bread & grains" as Category, background: "#F3E8DE" },
  ];
  return styles[hash % styles.length];
}
