import type { PantryItem, CreatePantryItemRequest, UpdatePantryItemRequest } from '../types/pantry';
import type { Recipe, CreateRecipeRequest, UpdateRecipeRequest, GeneratedRecipe } from '../types/recipe';
import type { RawIngestPayload, IngestPayloadRequest } from '../types/ingest';
import type { SeedResponse } from '../types/common';
import { authenticatedJson } from '../../../shared/authenticated-http';

const BASE_URL = '/api/v1';

function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  return authenticatedJson<T>(`${BASE_URL}${endpoint}`, options, endpoint === '/recipes/generate' ? 65000 : 15000);
}

export const pantryApi = {
  getAll: (category?: string, search?: string): Promise<PantryItem[]> => {
    const params = new URLSearchParams();
    if (category) params.append('category', category);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<PantryItem[]>(`/pantry${query}`);
  },

  getExpiring: (beforeDate?: string): Promise<PantryItem[]> => {
    const query = beforeDate ? `?before=${encodeURIComponent(beforeDate)}` : '';
    return request<PantryItem[]>(`/pantry/expiring${query}`);
  },

  getById: (id: string): Promise<PantryItem> => {
    return request<PantryItem>(`/pantry/${encodeURIComponent(id)}`);
  },

  create: (item: CreatePantryItemRequest): Promise<PantryItem> => {
    return request<PantryItem>('/pantry', {
      method: 'POST',
      body: JSON.stringify(item),
    });
  },

  update: (id: string, item: UpdatePantryItemRequest): Promise<PantryItem> => {
    return request<PantryItem>(`/pantry/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(item),
    });
  },

  delete: (id: string, version: number): Promise<void> => {
    return request<void>(`/pantry/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'If-Match': `"${version}"` },
    });
  },
};

export const recipeApi = {
  generate: async (excludeTitles: string[], signal: AbortSignal): Promise<GeneratedRecipe[]> => {
    const controller = new AbortController();
    const abort = () => controller.abort();
    signal.addEventListener('abort', abort, { once: true });
    if (signal.aborted) abort();
    const timer = setTimeout(abort, 65000);
    try {
      return await request<GeneratedRecipe[]>('/recipes/generate', {
        method: 'POST', body: JSON.stringify({ excludeTitles }), signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
      signal.removeEventListener('abort', abort);
    }
  },
  getAll: (search?: string): Promise<Recipe[]> => {
    const query = search ? `?search=${encodeURIComponent(search)}` : '';
    return request<Recipe[]>(`/recipes${query}`);
  },

  getById: (id: string): Promise<Recipe> => {
    return request<Recipe>(`/recipes/${encodeURIComponent(id)}`);
  },

  create: (recipe: CreateRecipeRequest): Promise<Recipe> => {
    return request<Recipe>('/recipes', {
      method: 'POST',
      body: JSON.stringify(recipe),
    });
  },

  update: (id: string, recipe: UpdateRecipeRequest): Promise<Recipe> => {
    return request<Recipe>(`/recipes/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify(recipe),
    });
  },

  delete: (id: string, version: number): Promise<void> => {
    return request<void>(`/recipes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: { 'If-Match': `"${version}"` },
    });
  },
};

export const ingestApi = {
  getAll: (status?: string, source?: string): Promise<RawIngestPayload[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (source) params.append('source', source);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<RawIngestPayload[]>(`/ingest${query}`);
  },

  getById: (id: string): Promise<RawIngestPayload> => {
    return request<RawIngestPayload>(`/ingest/${encodeURIComponent(id)}`);
  },

  ingest: (payload: IngestPayloadRequest): Promise<RawIngestPayload> => {
    return request<RawIngestPayload>('/ingest', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateStatus: (id: string, status: string, version: number): Promise<RawIngestPayload> => {
    return request<RawIngestPayload>(`/ingest/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, version }),
    });
  },
};

export const seedApi = {
  triggerSeed: (force = false): Promise<SeedResponse> => {
    return request<SeedResponse>(`/seed?force=${force}`, {
      method: 'POST',
    });
  },
};
