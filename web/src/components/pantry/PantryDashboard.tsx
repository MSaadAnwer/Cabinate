import React, { useState, useMemo } from 'react';
import type { PantryItem, CreatePantryItemRequest, UpdatePantryItemRequest } from '../../types/pantry';
import { PantryItemCard } from './PantryItemCard';
import { ExpiringBanner } from './ExpiringBanner';
import { PantryItemModal } from './PantryItemModal';
import { Plus, Search, PackageOpen, Sparkles } from 'lucide-react';

interface PantryDashboardProps {
  items: PantryItem[];
  expiringItems: PantryItem[];
  onAddItem: (item: CreatePantryItemRequest) => Promise<void>;
  onUpdateItem: (id: string, item: UpdatePantryItemRequest) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onSeedSampleData: () => void;
  isLoading: boolean;
}

const CATEGORIES = [
  { id: 'ALL', label: 'All Items' },
  { id: 'PRODUCE', label: 'Produce' },
  { id: 'DAIRY', label: 'Dairy & Eggs' },
  { id: 'MEAT', label: 'Meat & Seafood' },
  { id: 'GRAINS', label: 'Grains & Pasta' },
  { id: 'PANTRY', label: 'Pantry Staples' },
];

export const PantryDashboard: React.FC<PantryDashboardProps> = ({
  items,
  expiringItems,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onSeedSampleData,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PantryItem | null>(null);

  // Filter items by category and search
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        selectedCategory === 'ALL' ||
        item.category?.toUpperCase() === selectedCategory;
      const matchesSearch =
        !searchQuery.trim() ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.location?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [items, selectedCategory, searchQuery]);

  const handleEdit = (item: PantryItem) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleAddNew = () => {
    setEditingItem(null);
    setIsModalOpen(true);
  };

  const handleModalSubmit = async (
    itemData: CreatePantryItemRequest | UpdatePantryItemRequest,
    id?: string
  ) => {
    if (id) {
      await onUpdateItem(id, itemData as UpdatePantryItemRequest);
    } else {
      await onAddItem(itemData as CreatePantryItemRequest);
    }
  };

  const handleQuickQuantity = async (id: string, newQuantity: number) => {
    const target = items.find((i) => i.id === id);
    if (!target) return;
    await onUpdateItem(id, {
      name: target.name,
      quantity: newQuantity,
      unit: target.unit,
      category: target.category || undefined,
      location: target.location || undefined,
      expirationDate: target.expirationDate || undefined,
    });
  };

  return (
    <div className="container">
      {/* View Header */}
      <div className="view-header">
        <div className="view-header-content text-left">
          <h1>Pantry & Stock Inventory</h1>
          <p>
            Real-time operational inventory tracking stock levels, storage zones, and shelf-life urgency.
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-primary" onClick={handleAddNew}>
            <Plus size={16} />
            <span>Add Pantry Item</span>
          </button>
        </div>
      </div>

      {/* Expiring items spotlight banner */}
      <ExpiringBanner
        items={expiringItems}
        onSelectItem={(item) => {
          setSearchQuery(item.name);
        }}
      />

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-box">
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="input-field search-input"
            placeholder="Search pantry by ingredient or location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="category-pills">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              className={`category-pill ${selectedCategory === cat.id ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat.id)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Item Grid or Empty State */}
      {isLoading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--color-emerald)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '14px', fontSize: '14px' }}>Loading pantry inventory...</p>
        </div>
      ) : filteredItems.length > 0 ? (
        <div className="card-grid">
          {filteredItems.map((item) => (
            <PantryItemCard
              key={item.id}
              item={item}
              onEdit={handleEdit}
              onDelete={onDeleteItem}
              onQuickQuantityChange={handleQuickQuantity}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <PackageOpen className="empty-state-icon" />
          <h3>No pantry items found</h3>
          <p>
            {searchQuery || selectedCategory !== 'ALL'
              ? 'Try adjusting your search criteria or clearing selected category filters.'
              : 'Your pantry is currently empty. Seed default culinary items or add items manually.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {searchQuery || selectedCategory !== 'ALL' ? (
              <button
                className="btn btn-secondary"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('ALL');
                }}
              >
                Reset Filters
              </button>
            ) : (
              <>
                <button className="btn btn-primary" onClick={handleAddNew}>
                  <Plus size={15} />
                  <span>Add First Item</span>
                </button>
                <button className="btn btn-secondary" onClick={onSeedSampleData}>
                  <Sparkles size={15} />
                  <span>Populate Demo Stock</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Item Modal (Create/Edit) */}
      <PantryItemModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleModalSubmit}
        initialItem={editingItem}
      />
    </div>
  );
};
