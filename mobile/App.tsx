import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { ingestApi, pantryApi, recipeApi, seedApi } from './src/services/api';
import type { ApiErrorResponse } from './src/types/common';
import type { RawIngestPayload } from './src/types/ingest';
import type { PantryItem } from './src/types/pantry';
import type { Recipe } from './src/types/recipe';
import { buildDraftGroceryList } from './src/utils/groceryList';

type TabKey = 'inventory' | 'recipes' | 'grocery' | 'capture';
type CaptureMode = 'SOCIAL_LINK' | 'RECEIPT_TEXT' | 'RECIPE_TEXT';

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: 'inventory', label: 'Inventory' },
  { key: 'recipes', label: 'Recipes' },
  { key: 'grocery', label: 'Grocery List' },
  { key: 'capture', label: 'Capture' },
];

const captureModes: Array<{ key: CaptureMode; label: string; placeholder: string }> = [
  {
    key: 'SOCIAL_LINK',
    label: 'Social Link',
    placeholder: 'Paste an Instagram, TikTok, or YouTube Shorts link',
  },
  {
    key: 'RECEIPT_TEXT',
    label: 'Receipt',
    placeholder: 'Paste receipt text while camera/OCR is being wired in',
  },
  {
    key: 'RECIPE_TEXT',
    label: 'Recipe Notes',
    placeholder: 'Paste recipe caption, notes, or ingredients',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('inventory');
  const [pantryItems, setPantryItems] = useState<PantryItem[]>([]);
  const [expiringItems, setExpiringItems] = useState<PantryItem[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [ingestPayloads, setIngestPayloads] = useState<RawIngestPayload[]>([]);
  const [selectedRecipeId, setSelectedRecipeId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isOnline, setIsOnline] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [captureMode, setCaptureMode] = useState<CaptureMode>('SOCIAL_LINK');
  const [sourceUrl, setSourceUrl] = useState('');
  const [payload, setPayload] = useState('');
  const [isSubmittingCapture, setIsSubmittingCapture] = useState(false);

  const selectedRecipe = useMemo(
    () => recipes.find((recipe) => recipe.id === selectedRecipeId) ?? recipes[0] ?? null,
    [recipes, selectedRecipeId],
  );

  const draftGroceryList = useMemo(
    () => buildDraftGroceryList(selectedRecipe, pantryItems),
    [pantryItems, selectedRecipe],
  );

  const loadData = useCallback(async () => {
    try {
      setMessage(null);
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
      setSelectedRecipeId((current) => current ?? recipesRes[0]?.id ?? null);
      setIsOnline(true);
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      setIsOnline(false);
      setMessage(apiError.message ?? 'Cabinate API is unavailable.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const seedData = async () => {
    try {
      setIsSeeding(true);
      setMessage(null);
      const result = await seedApi.triggerSeed(false);
      setMessage(
        `Seeded ${result.summary.pantryItemsSeeded} pantry items and ${result.summary.recipesSeeded} recipes.`,
      );
      await loadData();
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      setMessage(apiError.message ?? 'Unable to seed Cabinate data.');
    } finally {
      setIsSeeding(false);
    }
  };

  const submitCapture = async () => {
    const activeMode = captureModes.find((mode) => mode.key === captureMode);
    const trimmedPayload = payload.trim();
    const trimmedSourceUrl = sourceUrl.trim();

    if (captureMode === 'SOCIAL_LINK' && !trimmedSourceUrl) {
      setMessage('Add a social link first.');
      return;
    }

    if (captureMode !== 'SOCIAL_LINK' && !trimmedPayload) {
      setMessage('Add capture text first.');
      return;
    }

    try {
      setIsSubmittingCapture(true);
      setMessage(null);
      const created = await ingestApi.ingest({
        source: captureMode,
        sourceUrl: trimmedSourceUrl || undefined,
        contentType: 'text/plain',
        payload: trimmedPayload || trimmedSourceUrl,
        metadata: {
          client: 'cabinate-mobile',
          captureLabel: activeMode?.label ?? captureMode,
        },
      });
      setIngestPayloads((current) => [created, ...current]);
      setPayload('');
      setSourceUrl('');
      setMessage('Capture saved for processing.');
    } catch (error) {
      const apiError = error as ApiErrorResponse;
      setMessage(apiError.message ?? 'Unable to save capture.');
    } finally {
      setIsSubmittingCapture(false);
    }
  };

  return (
    <SafeAreaView style={styles.shell}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.eyebrow}>Cabinate</Text>
          <Text style={styles.title}>Kitchen Command</Text>
        </View>
        <View style={[styles.statusPill, isOnline ? styles.statusOnline : styles.statusOffline]}>
          <Text style={[styles.statusText, isOnline ? styles.statusTextOnline : styles.statusTextOffline]}>
            {isOnline ? 'Online' : 'Offline'}
          </Text>
        </View>
      </View>

      <View style={styles.tabBar}>
        {tabs.map((tab) => (
          <Pressable
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            style={[styles.tabButton, activeTab === tab.key && styles.tabButtonActive]}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>{tab.label}</Text>
          </Pressable>
        ))}
      </View>

      {message && (
        <View style={styles.messageBox}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadData} />}
      >
        {isLoading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color="#1f7a4d" />
            <Text style={styles.mutedText}>Loading Cabinate</Text>
          </View>
        ) : (
          <>
            {activeTab === 'inventory' && (
              <InventoryView
                expiringItems={expiringItems}
                isSeeding={isSeeding}
                items={pantryItems}
                onSeed={seedData}
              />
            )}
            {activeTab === 'recipes' && (
              <RecipesView
                recipes={recipes}
                selectedRecipeId={selectedRecipe?.id ?? null}
                onSelectRecipe={setSelectedRecipeId}
              />
            )}
            {activeTab === 'grocery' && (
              <GroceryListView
                groceryItems={draftGroceryList}
                recipes={recipes}
                selectedRecipe={selectedRecipe}
                onSelectRecipe={setSelectedRecipeId}
              />
            )}
            {activeTab === 'capture' && (
              <CaptureView
                captureMode={captureMode}
                ingestPayloads={ingestPayloads}
                isSubmitting={isSubmittingCapture}
                payload={payload}
                sourceUrl={sourceUrl}
                onCaptureModeChange={setCaptureMode}
                onPayloadChange={setPayload}
                onSourceUrlChange={setSourceUrl}
                onSubmit={submitCapture}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function InventoryView({
  expiringItems,
  isSeeding,
  items,
  onSeed,
}: {
  expiringItems: PantryItem[];
  isSeeding: boolean;
  items: PantryItem[];
  onSeed: () => void;
}) {
  return (
    <View style={styles.stack}>
      <View style={styles.summaryGrid}>
        <MetricCard label="Items" value={items.length.toString()} tone="green" />
        <MetricCard label="Expiring" value={expiringItems.length.toString()} tone="amber" />
      </View>

      {items.length === 0 ? (
        <EmptyState
          actionLabel={isSeeding ? 'Seeding' : 'Seed Pantry'}
          body="Start with sample data or capture your first receipt."
          title="No pantry items yet"
          onAction={isSeeding ? undefined : onSeed}
        />
      ) : (
        <View style={styles.cardList}>
          {items.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.quantityText}>
                  {item.quantity} {item.unit}
                </Text>
              </View>
              <Text style={styles.mutedText}>
                {[item.category, item.location, item.expirationDate ? `Expires ${item.expirationDate}` : null]
                  .filter(Boolean)
                  .join(' / ')}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function RecipesView({
  onSelectRecipe,
  recipes,
  selectedRecipeId,
}: {
  onSelectRecipe: (id: string) => void;
  recipes: Recipe[];
  selectedRecipeId: string | null;
}) {
  return (
    <View style={styles.stack}>
      {recipes.length === 0 ? (
        <EmptyState body="Save a recipe from notes, captions, or raw text." title="No recipes yet" />
      ) : (
        recipes.map((recipe) => {
          const isSelected = selectedRecipeId === recipe.id;
          const totalMinutes = (recipe.prepTimeMinutes ?? 0) + (recipe.cookTimeMinutes ?? 0);

          return (
            <Pressable
              key={recipe.id}
              onPress={() => onSelectRecipe(recipe.id)}
              style={[styles.card, isSelected && styles.selectedCard]}
            >
              <View style={styles.cardHeader}>
                <Text style={styles.cardTitle}>{recipe.title}</Text>
                {totalMinutes > 0 && <Text style={styles.quantityText}>{totalMinutes} min</Text>}
              </View>
              {recipe.description ? <Text style={styles.bodyText}>{recipe.description}</Text> : null}
              <Text style={styles.mutedText}>{recipe.servings ? `${recipe.servings} servings` : 'Servings unset'}</Text>
            </Pressable>
          );
        })
      )}
    </View>
  );
}

function GroceryListView({
  groceryItems,
  onSelectRecipe,
  recipes,
  selectedRecipe,
}: {
  groceryItems: string[];
  onSelectRecipe: (id: string) => void;
  recipes: Recipe[];
  selectedRecipe: Recipe | null;
}) {
  return (
    <View style={styles.stack}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recipe</Text>
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recipeRail}>
        {recipes.map((recipe) => (
          <Pressable
            key={recipe.id}
            onPress={() => onSelectRecipe(recipe.id)}
            style={[styles.recipeChip, selectedRecipe?.id === recipe.id && styles.recipeChipActive]}
          >
            <Text style={[styles.recipeChipText, selectedRecipe?.id === recipe.id && styles.recipeChipTextActive]}>
              {recipe.title}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {selectedRecipe ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{selectedRecipe.title}</Text>
          <Text style={styles.bodyText}>Draft missing ingredients from the selected recipe.</Text>
        </View>
      ) : null}

      {groceryItems.length === 0 ? (
        <EmptyState body="Select a recipe with ingredient lines to build a draft list." title="Grocery list is empty" />
      ) : (
        <View style={styles.cardList}>
          {groceryItems.map((item) => (
            <View key={item} style={styles.listRow}>
              <View style={styles.checkCircle} />
              <Text style={styles.listText}>{item}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}

function CaptureView({
  captureMode,
  ingestPayloads,
  isSubmitting,
  onCaptureModeChange,
  onPayloadChange,
  onSourceUrlChange,
  onSubmit,
  payload,
  sourceUrl,
}: {
  captureMode: CaptureMode;
  ingestPayloads: RawIngestPayload[];
  isSubmitting: boolean;
  onCaptureModeChange: (mode: CaptureMode) => void;
  onPayloadChange: (value: string) => void;
  onSourceUrlChange: (value: string) => void;
  onSubmit: () => void;
  payload: string;
  sourceUrl: string;
}) {
  const activeMode = captureModes.find((mode) => mode.key === captureMode) ?? captureModes[0];

  return (
    <View style={styles.stack}>
      <View style={styles.modeGrid}>
        {captureModes.map((mode) => (
          <Pressable
            key={mode.key}
            onPress={() => onCaptureModeChange(mode.key)}
            style={[styles.modeButton, captureMode === mode.key && styles.modeButtonActive]}
          >
            <Text style={[styles.modeText, captureMode === mode.key && styles.modeTextActive]}>{mode.label}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.formCard}>
        <Text style={styles.sectionTitle}>{activeMode.label}</Text>
        {(captureMode === 'SOCIAL_LINK' || sourceUrl.length > 0) && (
          <TextInput
            autoCapitalize="none"
            keyboardType="url"
            onChangeText={onSourceUrlChange}
            placeholder="https://..."
            placeholderTextColor="#8a938d"
            style={styles.input}
            value={sourceUrl}
          />
        )}
        <TextInput
          multiline
          onChangeText={onPayloadChange}
          placeholder={activeMode.placeholder}
          placeholderTextColor="#8a938d"
          style={styles.textArea}
          textAlignVertical="top"
          value={payload}
        />
        <Pressable
          disabled={isSubmitting}
          onPress={onSubmit}
          style={[styles.primaryButton, isSubmitting && styles.primaryButtonDisabled]}
        >
          <Text style={styles.primaryButtonText}>{isSubmitting ? 'Saving' : 'Save Capture'}</Text>
        </Pressable>
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Recent Captures</Text>
        <Text style={styles.mutedText}>{ingestPayloads.length}</Text>
      </View>

      {ingestPayloads.slice(0, 5).map((item) => (
        <View key={item.id} style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{item.source}</Text>
            <Text style={styles.statusSmall}>{item.status}</Text>
          </View>
          <Text numberOfLines={2} style={styles.bodyText}>
            {item.sourceUrl || item.payload}
          </Text>
        </View>
      ))}
    </View>
  );
}

function MetricCard({ label, tone, value }: { label: string; tone: 'green' | 'amber'; value: string }) {
  return (
    <View style={[styles.metricCard, tone === 'green' ? styles.metricGreen : styles.metricAmber]}>
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function EmptyState({
  actionLabel,
  body,
  onAction,
  title,
}: {
  actionLabel?: string;
  body: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.bodyText}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable onPress={onAction} style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    flex: 1,
    backgroundColor: '#f7f8f4',
  },
  header: {
    alignItems: 'center',
    backgroundColor: '#f7f8f4',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 14,
    paddingHorizontal: 20,
    paddingTop: 18,
  },
  eyebrow: {
    color: '#1f7a4d',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  title: {
    color: '#19221c',
    fontSize: 28,
    fontWeight: '800',
    marginTop: 2,
  },
  statusPill: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  statusOnline: {
    backgroundColor: '#dff4e8',
  },
  statusOffline: {
    backgroundColor: '#ffe5df',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '800',
  },
  statusTextOnline: {
    color: '#1f7a4d',
  },
  statusTextOffline: {
    color: '#a9361f',
  },
  tabBar: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
    paddingHorizontal: 14,
  },
  tabButton: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#d9ddd5',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 6,
  },
  tabButtonActive: {
    backgroundColor: '#1f7a4d',
    borderColor: '#1f7a4d',
  },
  tabText: {
    color: '#3f4a43',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  messageBox: {
    backgroundColor: '#fff8da',
    borderColor: '#ead98e',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    marginHorizontal: 16,
    padding: 12,
  },
  messageText: {
    color: '#5a4715',
    fontSize: 13,
    lineHeight: 18,
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  loadingBlock: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 48,
  },
  stack: {
    gap: 12,
  },
  summaryGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  metricCard: {
    borderRadius: 8,
    flex: 1,
    padding: 16,
  },
  metricGreen: {
    backgroundColor: '#dff4e8',
  },
  metricAmber: {
    backgroundColor: '#ffe9bd',
  },
  metricValue: {
    color: '#18211c',
    fontSize: 30,
    fontWeight: '900',
  },
  metricLabel: {
    color: '#49534c',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 4,
  },
  cardList: {
    gap: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderColor: '#dde2dc',
    borderRadius: 8,
    borderWidth: 1,
    padding: 14,
  },
  selectedCard: {
    borderColor: '#1f7a4d',
    borderWidth: 2,
  },
  cardHeader: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  cardTitle: {
    color: '#19221c',
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    lineHeight: 21,
  },
  quantityText: {
    color: '#1f7a4d',
    fontSize: 13,
    fontWeight: '800',
  },
  mutedText: {
    color: '#68726c',
    fontSize: 13,
    lineHeight: 18,
  },
  bodyText: {
    color: '#3e4741',
    fontSize: 14,
    lineHeight: 20,
    marginTop: 7,
  },
  sectionHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  sectionTitle: {
    color: '#19221c',
    fontSize: 17,
    fontWeight: '800',
  },
  recipeRail: {
    gap: 8,
    paddingRight: 12,
  },
  recipeChip: {
    backgroundColor: '#ffffff',
    borderColor: '#d9ddd5',
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: 'center',
    maxWidth: 220,
    minHeight: 42,
    paddingHorizontal: 12,
  },
  recipeChipActive: {
    backgroundColor: '#23362b',
    borderColor: '#23362b',
  },
  recipeChipText: {
    color: '#3f4a43',
    fontSize: 13,
    fontWeight: '800',
  },
  recipeChipTextActive: {
    color: '#ffffff',
  },
  listRow: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#dde2dc',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    minHeight: 50,
    paddingHorizontal: 14,
  },
  checkCircle: {
    borderColor: '#1f7a4d',
    borderRadius: 999,
    borderWidth: 2,
    height: 20,
    width: 20,
  },
  listText: {
    color: '#26302a',
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
  },
  modeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  modeButton: {
    backgroundColor: '#ffffff',
    borderColor: '#d9ddd5',
    borderRadius: 8,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 44,
    paddingHorizontal: 8,
  },
  modeButtonActive: {
    backgroundColor: '#26302a',
    borderColor: '#26302a',
  },
  modeText: {
    color: '#3f4a43',
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  modeTextActive: {
    color: '#ffffff',
  },
  formCard: {
    backgroundColor: '#ffffff',
    borderColor: '#dde2dc',
    borderRadius: 8,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  input: {
    backgroundColor: '#f7f8f4',
    borderColor: '#d9ddd5',
    borderRadius: 8,
    borderWidth: 1,
    color: '#19221c',
    fontSize: 15,
    minHeight: 48,
    paddingHorizontal: 12,
  },
  textArea: {
    backgroundColor: '#f7f8f4',
    borderColor: '#d9ddd5',
    borderRadius: 8,
    borderWidth: 1,
    color: '#19221c',
    fontSize: 15,
    minHeight: 132,
    padding: 12,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1f7a4d',
    borderRadius: 8,
    justifyContent: 'center',
    minHeight: 48,
  },
  primaryButtonDisabled: {
    opacity: 0.7,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: '#1f7a4d',
    borderRadius: 8,
    justifyContent: 'center',
    marginTop: 14,
    minHeight: 46,
    paddingHorizontal: 16,
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '900',
  },
  statusSmall: {
    color: '#b75b2a',
    fontSize: 12,
    fontWeight: '900',
  },
  emptyState: {
    alignItems: 'flex-start',
    backgroundColor: '#ffffff',
    borderColor: '#dde2dc',
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  emptyTitle: {
    color: '#19221c',
    fontSize: 18,
    fontWeight: '800',
  },
});
