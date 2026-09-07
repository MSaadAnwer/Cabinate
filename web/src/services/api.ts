import type { PantryItem, CreatePantryItemRequest, UpdatePantryItemRequest } from '../types/pantry';
import type { Recipe, CreateRecipeRequest, UpdateRecipeRequest } from '../types/recipe';
import type { RawIngestPayload, IngestPayloadRequest } from '../types/ingest';
import type { ApiErrorResponse, SeedResponse } from '../types/common';

const BASE_URL = '/api/v1';

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${BASE_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...options.headers,
  };

  try {
    const response = await fetch(url, { ...options, headers });

    if (!response.ok) {
      let errorBody: ApiErrorResponse;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = {
          status: response.status,
          error: response.statusText,
          message: `Request failed with status ${response.status}`,
        };
      }
      throw errorBody;
    }

    if (response.status === 204) {
      return {} as T;
    }

    return await response.json();
  } catch (error: any) {
    if (error && error.status && error.message) {
      throw error;
    }
    throw {
      status: 0,
      error: 'Network Error',
      message: error?.message || 'Unable to connect to Cabinate API. Ensure Spring Boot is running on port 8080.',
    } as ApiErrorResponse;
  }
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

  delete: (id: string): Promise<void> => {
    return request<void>(`/pantry/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
  },
};

export const recipeApi = {
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

  delete: (id: string): Promise<void> => {
    return request<void>(`/recipes/${encodeURIComponent(id)}`, {
      method: 'DELETE',
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

  updateStatus: (id: string, status: string): Promise<RawIngestPayload> => {
    return request<RawIngestPayload>(`/ingest/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
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
