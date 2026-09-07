export interface PantryItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  category?: string | null;
  location?: string | null;
  expirationDate?: string | null; // ISO Date YYYY-MM-DD
  createdAt: string;
  updatedAt: string;
}

export interface CreatePantryItemRequest {
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  location?: string;
  expirationDate?: string;
}

export interface UpdatePantryItemRequest {
  name: string;
  quantity: number;
  unit: string;
  category?: string;
  location?: string;
  expirationDate?: string;
}

export type PantryCategory = 'PRODUCE' | 'DAIRY' | 'MEAT' | 'GRAINS' | 'PANTRY' | 'OTHER';
export type PantryLocation = 'FRIDGE' | 'FREEZER' | 'CABINET' | 'COUNTER';
