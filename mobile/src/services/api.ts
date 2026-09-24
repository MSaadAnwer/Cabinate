import { requestJson } from "./http";
import type { SeedResponse } from "../types/common";
import type { IngestPayloadRequest, RawIngestPayload } from "../types/ingest";
import type {
  CreatePantryItemRequest,
  PantryItem,
  UpdatePantryItemRequest,
} from "../types/pantry";
import type {
  CreateRecipeRequest,
  Recipe,
  UpdateRecipeRequest,
} from "../types/recipe";

const DEFAULT_API_URL = "http://localhost:8080/api/v1";
const BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;

function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return requestJson<T>(`${BASE_URL}${endpoint}`, options);
}

export const pantryApi = {
  delete: (id: string): Promise<void> =>
    request<void>(`/pantry/${encodeURIComponent(id)}`, { method: "DELETE" }),
  getAll: (category?: string, search?: string): Promise<PantryItem[]> => {
    const params = new URLSearchParams();
    if (category) params.append("category", category);
    if (search) params.append("search", search);
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<PantryItem[]>(`/pantry${query}`);
  },

  getExpiring: (beforeDate?: string): Promise<PantryItem[]> => {
    const query = beforeDate ? `?before=${encodeURIComponent(beforeDate)}` : "";
    return request<PantryItem[]>(`/pantry/expiring${query}`);
  },

  create: (item: CreatePantryItemRequest): Promise<PantryItem> => {
    return request<PantryItem>("/pantry", {
      method: "POST",
      body: JSON.stringify(item),
    });
  },

  update: (id: string, item: UpdatePantryItemRequest): Promise<PantryItem> => {
    return request<PantryItem>(`/pantry/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(item),
    });
  },
};

export const recipeApi = {
  getAll: (search?: string): Promise<Recipe[]> => {
    const query = search ? `?search=${encodeURIComponent(search)}` : "";
    return request<Recipe[]>(`/recipes${query}`);
  },

  create: (recipe: CreateRecipeRequest): Promise<Recipe> => {
    return request<Recipe>("/recipes", {
      method: "POST",
      body: JSON.stringify(recipe),
    });
  },

  update: (id: string, recipe: UpdateRecipeRequest): Promise<Recipe> => {
    return request<Recipe>(`/recipes/${encodeURIComponent(id)}`, {
      method: "PUT",
      body: JSON.stringify(recipe),
    });
  },
};

export const ingestApi = {
  getAll: (status?: string, source?: string): Promise<RawIngestPayload[]> => {
    const params = new URLSearchParams();
    if (status) params.append("status", status);
    if (source) params.append("source", source);
    const query = params.toString() ? `?${params.toString()}` : "";
    return request<RawIngestPayload[]>(`/ingest${query}`);
  },

  ingest: (payload: IngestPayloadRequest): Promise<RawIngestPayload> => {
    return request<RawIngestPayload>("/ingest", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },
};

export const seedApi = {
  triggerSeed: (force = false): Promise<SeedResponse> => {
    return request<SeedResponse>(`/seed?force=${force}`, {
      method: "POST",
    });
  },
};

export const apiConfig = {
  baseUrl: BASE_URL,
};

export interface RecallFeed {
  items: {
    id: string;
    title: string;
    description: string;
    url: string;
    publishedAt: string;
  }[];
  lastSuccessfulCheck: string | null;
  lastAttempt: string | null;
  stale: boolean;
}
export const recallApi = { get: () => request<RecallFeed>("/recalls") };
