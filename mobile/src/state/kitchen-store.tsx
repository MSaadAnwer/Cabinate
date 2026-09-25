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
import { categories } from "../utils/kitchen";
import { parseLocalData, type LocalData } from "../utils/local-data";
import {
  createRemoteCollection,
  initialCollection,
} from "../utils/remote-collection";
export type {
  ListItem,
  GroceryList,
  PhotoEntry,
  Receipt,
} from "../utils/local-data";

const empty: LocalData = { lists: [], meals: [], receipts: [], steps: {} };
const key = "cabinate:kitchen:v1";

function useStore() {
  const [pantryState, setPantryState] = useState(initialCollection<PantryItem>);
  const [recipeState, setRecipeState] = useState(initialCollection<Recipe>);
  const [pantryCollection] = useState(() =>
    createRemoteCollection(() => pantryApi.getAll(), setPantryState),
  );
  const [recipeCollection] = useState(() =>
    createRemoteCollection(() => recipeApi.getAll(), setRecipeState),
  );
  const [data, setData] = useState<LocalData>(empty);
  const [ready, setReady] = useState(false);
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
  const deletePantryItem = useCallback(
    async (id: string, beforeRemove?: () => void) => {
      try {
        await pantryApi.delete(id);
      } catch (error) {
        if ((error as { status?: number }).status !== 404) throw error;
      }
      beforeRemove?.();
      pantryCollection.remove(id);
    },
    [pantryCollection],
  );
  const reload = useCallback(async () => {
    await Promise.all([pantryCollection.reload(), recipeCollection.reload()]);
  }, [pantryCollection, recipeCollection]);
  useEffect(() => {
    let active = true;
    void reload();
    AsyncStorage.getItem(key)
      .then((raw) => {
        if (!active) return;
        if (raw) {
          persistence.current!.hydrate(parseLocalData(raw, categories));
        }
        setReady(true);
      })
      .catch(() => {
        if (active)
          setStorageError(
            "Could not load saved lists and photos. Restart the app before making changes.",
          );
      });
    return () => {
      active = false;
    };
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
  const deleteMealPhoto = useCallback(
    (id: string, beforeRemove?: () => void): Promise<void> => {
      if (!ready)
        return Promise.reject(
          new Error("Your saved photos are still loading. Please try again."),
        );
      return persistence.current!.commit(
        (previous) => ({
          ...previous,
          meals: previous.meals.filter((photo) => photo.id !== id),
        }),
        beforeRemove,
      );
    },
    [ready],
  );
  return {
    pantry: pantryState.items,
    pantryState,
    upsertPantryItem: pantryCollection.upsert,
    deletePantryItem,
    deleteMealPhoto,
    recipes: recipeState.items,
    recipeState,
    upsertRecipe: recipeCollection.upsert,
    data,
    update,
    ready,
    loading: pantryState.loading || recipeState.loading,
    loaded: pantryState.loaded && recipeState.loaded,
    error: pantryState.error || recipeState.error,
    storageError,
    reload,
  };
}
export const KitchenContext = createContext<ReturnType<typeof useStore> | null>(null);
export function KitchenProvider({ children }: { children: ReactNode }) {
  return <KitchenContext value={useStore()}>{children}</KitchenContext>;
}
export function useKitchen() {
  const store = use(KitchenContext);
  if (!store) throw new Error("KitchenProvider is required");
  return store;
}
