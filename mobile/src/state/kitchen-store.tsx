import { createOrderedStore } from "../utils/ordered-store";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  createContext,
  use,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { pantryApi, recipeApi } from "../services/api";
import type { PantryItem } from "../types/pantry";
import type { Recipe } from "../types/recipe";
import type { Category } from "../utils/kitchen";

export interface ListItem {
  id: string;
  name: string;
  category: Category;
  checked: boolean;
}
export interface GroceryList {
  id: string;
  name: string;
  items: ListItem[];
  createdAt: string;
}
export interface PhotoEntry {
  id: string;
  date: string;
  uri: string;
  caption: string;
}
export interface Receipt {
  id: string;
  uri: string;
  date: string;
}
interface LocalData {
  lists: GroceryList[];
  meals: PhotoEntry[];
  receipts: Receipt[];
  steps: Record<string, number[]>;
}
const empty: LocalData = { lists: [], meals: [], receipts: [], steps: {} };
const key = "cabinate:kitchen:v1";

function useStore() {
  const [pantry, setPantry] = useState<PantryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [data, setData] = useState<LocalData>(empty);
  const [ready, setReady] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState("");
  const [storageError, setStorageError] = useState("");
  const persistence = useRef<ReturnType<
    typeof createOrderedStore<LocalData>
  > | null>(null);
  if (!persistence.current)
    persistence.current = createOrderedStore(
      empty,
      (value) => AsyncStorage.setItem(key, JSON.stringify(value)),
      setData,
      setStorageError,
    );
  const deletedPantryIds = useRef(new Set<string>());
  const deletePantryItem = useCallback(
    async (id: string, beforeRemove?: () => void) => {
      try {
        await pantryApi.delete(id);
      } catch (error) {
        if ((error as { status?: number }).status !== 404) throw error;
      }
      // Also filter late refresh responses, so a deleted expiration cannot reappear.
      deletedPantryIds.current.add(id);
      beforeRemove?.();
      setPantry((previous) => previous.filter((item) => item.id !== id));
    },
    [],
  );
  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const [p, r] = await Promise.all([
        pantryApi.getAll(),
        recipeApi.getAll(),
      ]);
      setPantry(p.filter((item) => !deletedPantryIds.current.has(item.id)));
      setRecipes(r);
      setLoaded(true);
      setError("");
    } catch (e) {
      setError(
        (e as Error).message || "Could not connect. Pull down to retry.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void reload();
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (raw) {
          const parsed = JSON.parse(raw) as LocalData;
          if (
            !Array.isArray(parsed.lists) ||
            !Array.isArray(parsed.meals) ||
            !Array.isArray(parsed.receipts) ||
            typeof parsed.steps !== "object"
          )
            throw new Error("Invalid saved data");
          persistence.current!.hydrate(parsed);
        }
        setReady(true);
      })
      .catch(() =>
        setStorageError(
          "Could not load saved lists and photos. Restart the app before making changes.",
        ),
      );
  }, [reload]);
  const update = useCallback(
    (change: (previous: LocalData) => LocalData): Promise<void> => {
      if (!ready)
        return Promise.reject(
          new Error("Your saved data is still loading. Please try again."),
        );
      return persistence.current!.update(change);
    },
    [ready],
  );
  return {
    pantry,
    setPantry,
    deletePantryItem,
    recipes,
    setRecipes,
    data,
    update,
    ready,
    loading,
    loaded,
    error,
    storageError,
    reload,
  };
}
const KitchenContext = createContext<ReturnType<typeof useStore> | null>(null);
export function KitchenProvider({ children }: { children: ReactNode }) {
  return <KitchenContext value={useStore()}>{children}</KitchenContext>;
}
export function useKitchen() {
  const store = use(KitchenContext);
  if (!store) throw new Error("KitchenProvider is required");
  return store;
}
