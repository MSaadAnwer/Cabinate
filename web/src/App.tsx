import React, { useState, useEffect, useCallback } from 'react';
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

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'pantry' | 'recipes' | 'ingest'>('pantry');
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [expiringItems, setExpiringItems] = useState<PantryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingestPayloads, setIngestPayloads] = useState<RawIngestPayload[]>([]);
  const [isOnline, setIsOnline] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  };

  const removeToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Load all initial data
  const loadAllData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [pantryRes, expiringRes, recipesRes, ingestRes] = await Promise.all([
        pantryApi.getAll(),
        pantryApi.getExpiring(),
        recipeApi.getAll(),
        ingestApi.getAll(),
      ]);

      setPantryItems(pantryRes);
      setExpiringItems(expiringRes);
      setRecipes(recipesRes);
      setIngestPayloads(ingestRes);
      setIsOnline(true);
    } catch (err: any) {
      setIsOnline(false);
      addToast(err?.message || 'Failed to connect to Cabinate API', 'error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  // Seed handler
  const handleSeedData = async () => {
    try {
      setIsSeeding(true);
      const res = await seedApi.triggerSeed(false);
      addToast(
        `Database Seeded: ${res.summary.pantryItemsSeeded} pantry items, ${res.summary.recipesSeeded} recipes!`,
        'success'
      );
      await loadAllData();
    } catch (err: any) {
      addToast(err?.message || 'Database seeding failed', 'error');
    } finally {
      setIsSeeding(false);
    }
  };

  // Pantry handlers
  const handleAddPantryItem = async (data: CreatePantryItemRequest) => {
    try {
      const created = await pantryApi.create(data);
      setPantryItems((prev) => [created, ...prev]);
      addToast(`Added "${created.name}" to inventory`, 'success');
      // Refresh expiring in case the new item has an early expiration
      const expiring = await pantryApi.getExpiring();
      setExpiringItems(expiring);
    } catch (err: any) {
      addToast(err?.message || 'Failed to add pantry item', 'error');
      throw err;
    }
  };

  const handleUpdatePantryItem = async (id: string, data: UpdatePantryItemRequest) => {
    try {
      const updated = await pantryApi.update(id, data);
      setPantryItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
      addToast(`Updated "${updated.name}"`, 'success');
      const expiring = await pantryApi.getExpiring();
      setExpiringItems(expiring);
    } catch (err: any) {
      addToast(err?.message || 'Failed to update pantry item', 'error');
      throw err;
    }
  };

  const handleDeletePantryItem = async (id: string) => {
    try {
      await pantryApi.delete(id);
      setPantryItems((prev) => prev.filter((item) => item.id !== id));
      setExpiringItems((prev) => prev.filter((item) => item.id !== id));
      addToast('Item removed from pantry', 'info');
    } catch (err: any) {
      addToast(err?.message || 'Failed to delete pantry item', 'error');
    }
  };

  // Recipe handlers
  const handleAddRecipe = async (data: CreateRecipeRequest) => {
    try {
      const created = await recipeApi.create(data);
      setRecipes((prev) => [created, ...prev]);
      addToast(`Created recipe "${created.title}"`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Failed to create recipe', 'error');
      throw err;
    }
  };

  const handleDeleteRecipe = async (id: string) => {
    try {
      await recipeApi.delete(id);
      setRecipes((prev) => prev.filter((r) => r.id !== id));
      addToast('Recipe deleted', 'info');
    } catch (err: any) {
      addToast(err?.message || 'Failed to delete recipe', 'error');
    }
  };

  // Ingest handlers
  const handleIngestPayload = async (data: IngestPayloadRequest) => {
    try {
      const created = await ingestApi.ingest(data);
      setIngestPayloads((prev) => [created, ...prev]);
      addToast(`Payload ingested via ${created.source}`, 'success');
    } catch (err: any) {
      addToast(err?.message || 'Ingestion failed', 'error');
      throw err;
    }
  };

  const handleUpdateIngestStatus = async (id: string, status: string) => {
    try {
      const updated = await ingestApi.updateStatus(id, status);
      setIngestPayloads((prev) => prev.map((p) => (p.id === id ? updated : p)));
      addToast(`Status updated to ${status}`, 'info');
    } catch (err: any) {
      addToast(err?.message || 'Failed to update status', 'error');
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
        {activeTab === 'pantry' && (
          <PantryDashboard
            items={pantryItems}
            expiringItems={expiringItems}
            onAddItem={handleAddPantryItem}
            onUpdateItem={handleUpdatePantryItem}
            onDeleteItem={handleDeletePantryItem}
            onSeedSampleData={handleSeedData}
            isLoading={isLoading}
          />
        )}

        {activeTab === 'recipes' && (
          <RecipeDashboard
            recipes={recipes}
            onAddRecipe={handleAddRecipe}
            onDeleteRecipe={handleDeleteRecipe}
            onSeedSampleData={handleSeedData}
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
