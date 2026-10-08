import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import { Navbar } from './components/navigation/Navbar';
import { PantryDashboard } from './components/pantry/PantryDashboard';
import { RecipeDashboard } from './components/recipe/RecipeDashboard';
import { IngestDashboard } from './components/ingest/IngestDashboard';
import { pantryApi, recipeApi, ingestApi, seedApi } from './services/api';
import type { PantryItem, CreatePantryItemRequest, UpdatePantryItemRequest } from './types/pantry';
import type { Recipe, CreateRecipeRequest } from './types/recipe';
import type { RawIngestPayload, IngestPayloadRequest } from './types/ingest';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { getExpiringItems } from './utils/pantry';
import { getErrorMessage } from './utils/errors';
import { loadSnapshot } from './utils/loadSnapshot';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pantry' | 'recipes' | 'ingest'>('pantry');
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingestPayloads, setIngestPayloads] = useState<RawIngestPayload[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const loadController = useRef<AbortController | null>(null);
  const seeding = useRef(false);
  const dataRevision = useRef(0);
  const toastTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const expiringItems = getExpiringItems(pantryItems);

  const addToast = useCallback((message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, type, message }]);
    toastTimers.current.set(id, setTimeout(() => {
      toastTimers.current.delete(id);
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000));
  }, []);

  const removeToast = useCallback((id: string) => {
    clearTimeout(toastTimers.current.get(id));
    toastTimers.current.delete(id);
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const loadAllData = useCallback(async () => {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    try {
      await loadSnapshot(() => Promise.all([
        pantryApi.getAll(undefined, undefined, controller.signal),
        recipeApi.getAll(undefined, controller.signal),
        ingestApi.getAll(undefined, undefined, controller.signal),
      ]), () => dataRevision.current, controller.signal, ([pantryRes, recipesRes, ingestRes]) => {
        setPantryItems(pantryRes);
        setRecipes(recipesRes);
        setIngestPayloads(ingestRes);
        setIsOnline(true);
      });
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      setIsOnline(false);
      addToast(getErrorMessage(err, 'Failed to connect to Cabinate'), 'error');
    } finally {
      if (!controller.signal.aborted) setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    const timer = setTimeout(() => void loadAllData(), 0);
    const timers = toastTimers.current;
    return () => {
      clearTimeout(timer);
      loadController.current?.abort();
      timers.forEach(clearTimeout);
      timers.clear();
    };
  }, [loadAllData]);

  // Seed handler
  const handleSeedData = async () => {
    if (seeding.current) return;
    seeding.current = true;
    try {
      setIsSeeding(true);
      const res = await seedApi.triggerSeed(false);
      addToast(
        `Added sample data: ${res.summary.pantryItemsSeeded} pantry items and ${res.summary.recipesSeeded} recipes`,
        'success'
      );
      await loadAllData();
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Could not add sample data'), 'error');
    } finally {
      seeding.current = false;
      setIsSeeding(false);
    }
  };

  // Pantry handlers
  const handleAddPantryItem = async (data: CreatePantryItemRequest) => {
    try {
      const created = await pantryApi.create(data);
      dataRevision.current++;
      setPantryItems((prev) => [created, ...prev]);
      addToast(`Added "${created.name}" to inventory`, 'success');
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Failed to add pantry item'), 'error');
      throw err;
    }
  };

  const handleUpdatePantryItem = async (id: string, data: UpdatePantryItemRequest) => {
    try {
      const updated = await pantryApi.update(id, data);
      dataRevision.current++;
      setPantryItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      addToast(`Updated "${updated.name}"`, 'success');
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Failed to update pantry item'), 'error');
      throw err;
    }
  };

  const handleDeletePantryItem = async (id: string) => {
    try {
      const item = pantryItems.find((value) => value.id === id);
      if (!item) return;
      await pantryApi.delete(id, item.version);
      dataRevision.current++;
      setPantryItems((prev) => prev.filter((item) => item.id !== id));
      addToast('Item removed from pantry', 'info');
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Failed to delete pantry item'), 'error');
    }
  };

  // Recipe handlers
  const handleAddRecipe = async (data: CreateRecipeRequest) => {
    try {
      const created = await recipeApi.create(data);
      dataRevision.current++;
      setRecipes((prev) => [created, ...prev]);
      addToast(`Created recipe "${created.title}"`, 'success');
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Failed to create recipe'), 'error');
      throw err;
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    try {
      const recipe = recipes.find((value) => value.id === id);
      if (!recipe) return;
      await recipeApi.delete(id, recipe.version);
      dataRevision.current++;
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      addToast('Recipe deleted', 'info');
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Failed to delete recipe'), 'error');
    }
  };

  // Ingest handlers
  const handleIngestPayload = async (data: IngestPayloadRequest) => {
    try {
      const created = await ingestApi.ingest(data);
      dataRevision.current++;
      setIngestPayloads((prev) => [created, ...prev]);
      addToast(`Payload ingested via ${created.source}`, 'success');
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Could not import recipe content'), 'error');
      throw err;
    }
  };

  const handleUpdateIngestStatus = async (id: string, status: string) => {
    try {
      const payload = ingestPayloads.find((value) => value.id === id);
      if (!payload) return;
      const updated = await ingestApi.updateStatus(id, status, payload.version);
      dataRevision.current++;
      setIngestPayloads((prev) => prev.map((p) => (p.id === id ? updated : p)));
      addToast(`Status updated to ${status}`, 'info');
    } catch (err: unknown) {
      addToast(getErrorMessage(err, 'Failed to update status'), 'error');
    }
  };

  return (
    <div className="app-wrapper">
      <Navbar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onSeedData={handleSeedData}
        isSeeding={isSeeding}
        isOnline={isOnline}
      />

      <main className="app-main">
        {!isOnline && !isLoading && <div className="container" role="alert" style={{ marginBottom: 20 }}>
          <p>Could not load your latest data.</p>
          <button className="btn btn-secondary" onClick={() => { setIsLoading(true); void loadAllData(); }}>Try Again</button>
        </div>}
        {activeTab === 'pantry' && (
          <PantryDashboard
            items={pantryItems}
            expiringItems={expiringItems}
            onAddItem={handleAddPantryItem}
            onUpdateItem={handleUpdatePantryItem}
            onDeleteItem={handleDeletePantryItem}
            onSeedSampleData={handleSeedData}
            isSeeding={isSeeding}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'recipes' && (
          <RecipeDashboard
            recipes={recipes}
            onAddRecipe={handleAddRecipe}
            onDeleteRecipe={handleDeleteRecipe}
            onSeedSampleData={handleSeedData}
            isSeeding={isSeeding}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'ingest' && (
          <IngestDashboard
            payloads={ingestPayloads}
            onIngest={handleIngestPayload}
            onUpdateStatus={handleUpdateIngestStatus}
            isLoading={isLoading}
          />
        )}
      </main>

      {/* Global Toast Notifications */}
      <div className="toast-container" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`toast toast-${toast.type}`}>
            {toast.type === 'success' && <CheckCircle2 size={16} />}
            {toast.type === 'error' && <AlertCircle size={16} />}
            {toast.type === 'info' && <Info size={16} />}
            <span style={{ flex: 1 }}>{toast.message}</span>
            <button
              aria-label="Dismiss notification"
              onClick={() => removeToast(toast.id)}
              style={{ background: 'transparent', border: 'none', color: 'inherit', cursor: 'pointer', padding: '2px' }}
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default App;
