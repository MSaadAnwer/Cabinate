export interface ApiErrorResponse {
  timestamp?: string;
  status: number;
  error: string;
  message: string;
  path?: string;
  fieldErrors?: Record<string, string>;
}

export interface SeedResponse {
  message: string;
  forced: boolean;
  summary: {
    recipesSeeded: number;
    pantryItemsSeeded: number;
    ingestPayloadsSeeded: number;
  };
}
