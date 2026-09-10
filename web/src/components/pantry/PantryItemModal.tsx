import React, { useState } from 'react';
import type { PantryItem, CreatePantryItemRequest, UpdatePantryItemRequest } from '../../types/pantry';
import { X, Save, Plus } from 'lucide-react';

interface PantryItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (itemData: CreatePantryItemRequest | UpdatePantryItemRequest, id?: string) => Promise<void>;
  initialItem?: PantryItem | null;
}

interface PantryItemFormProps {
  initialItem?: PantryItem | null;
  onClose: () => void;
  onSubmit: (itemData: CreatePantryItemRequest | UpdatePantryItemRequest, id?: string) => Promise<void>;
}

const PantryItemForm: React.FC<PantryItemFormProps> = ({ initialItem, onClose, onSubmit }) => {
  const [name, setName] = useState(initialItem?.name || '');
  const [quantity, setQuantity] = useState<number | ''>(initialItem?.quantity ?? 1);
  const [unit, setUnit] = useState(initialItem?.unit || 'pcs');
  const [category, setCategory] = useState(initialItem?.category || 'PRODUCE');
  const [location, setLocation] = useState(initialItem?.location || 'FRIDGE');
  const [expirationDate, setExpirationDate] = useState(initialItem?.expirationDate || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMessage('Item name is required');
      return;
    }
    if (quantity === '' || quantity <= 0) {
      setErrorMessage('Quantity must be greater than zero');
      return;
    }
    if (!unit.trim()) {
      setErrorMessage('Unit is required (e.g. g, ml, pcs)');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      const payload = {
        name: name.trim(),
        quantity: Number(quantity),
        unit: unit.trim(),
        category,
        location,
        expirationDate: expirationDate || undefined,
      };

      await onSubmit(payload, initialItem?.id);
      onClose();
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to save pantry item');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>
          {initialItem ? 'Edit Pantry Item' : 'Add New Pantry Item'}
        </h2>
        <button className="btn btn-ghost btn-sm" onClick={onClose}>
          <X size={18} />
        </button>
      </div>

      {errorMessage && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--color-rose)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--color-rose-light)', fontSize: '13px', marginBottom: '16px', textAlign: 'left' }}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Item Name *</label>
          <input
            type="text"
            className="input-field"
            placeholder="e.g. Organic Rolled Oats"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={120}
            autoFocus
          />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Quantity *</label>
            <input
              type="number"
              step="0.1"
              min="0.01"
              className="input-field"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Unit *</label>
            <input
              type="text"
              className="input-field"
              placeholder="e.g. g, ml, pcs, bag"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label">Category</label>
            <select
              className="select-field"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option value="PRODUCE">Produce</option>
              <option value="DAIRY">Dairy & Eggs</option>
              <option value="MEAT">Meat & Seafood</option>
              <option value="GRAINS">Grains & Pasta</option>
              <option value="PANTRY">Pantry Staples</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Storage Location</label>
            <select
              className="select-field"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            >
              <option value="FRIDGE">Refrigerator</option>
              <option value="FREEZER">Freezer</option>
              <option value="CABINET">Cabinet / Cupboard</option>
              <option value="COUNTER">Countertop</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Expiration Date (Optional)</label>
          <input
            type="date"
            className="input-field"
            value={expirationDate}
            onChange={(e) => setExpirationDate(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '24px' }}>
          <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {initialItem ? <Save size={15} /> : <Plus size={15} />}
            <span>{isSubmitting ? 'Saving...' : initialItem ? 'Update Item' : 'Add Item'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export const PantryItemModal: React.FC<PantryItemModalProps> = ({
  isOpen,
  onClose,
  onSubmit,
  initialItem,
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <PantryItemForm
        key={initialItem?.id ?? 'new'}
        initialItem={initialItem}
        onClose={onClose}
        onSubmit={onSubmit}
      />
    </div>
  );
};
