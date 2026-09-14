export interface Recipe {
  id: string;
  title: string;
  description?: string | null;
  sourceUrl?: string | null;
  rawText: string;
  prepTimeMinutes?: number | null;
  cookTimeMinutes?: number | null;
  servings?: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateRecipeRequest {
  title: string;
  description?: string;
  sourceUrl?: string;
  rawText: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
}

export interface UpdateRecipeRequest {
  title: string;
  description?: string;
  sourceUrl?: string;
  rawText: string;
  prepTimeMinutes?: number;
  cookTimeMinutes?: number;
  servings?: number;
}
