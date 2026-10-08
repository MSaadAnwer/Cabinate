import React, { useState } from 'react';
import type { PantryItem, CreatePantryItemRequest, UpdatePantryItemRequest } from '../../types/pantry';
import { X, Save, Plus } from 'lucide-react';
import { Modal } from '../common/Modal';
import { getErrorMessage } from '../../utils/errors';

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
    if (quantity === '' || !Number.isFinite(quantity) || quantity < 0 || (!initialItem && quantity === 0)) {
      setErrorMessage(initialItem ? 'Quantity must be zero or greater' : 'Quantity must be greater than zero');
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
        ...(initialItem ? { version: initialItem.version } : {}),
        name: name.trim(),
        quantity: Number(quantity),
        unit: unit.trim(),
        category,
        location,
        expirationDate: expirationDate || undefined,
      };

      await onSubmit(payload, initialItem?.id);
      onClose();
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, 'Failed to save pantry item'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal label={initialItem ? 'Edit pantry item' : 'Add pantry item'} onClose={onClose} busy={isSubmitting}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h2 style={{ fontSize: '20px', fontWeight: 700 }}>
          {initialItem ? 'Edit Pantry Item' : 'Add New Pantry Item'}
        </h2>
        <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={isSubmitting} aria-label="Close pantry item form">
          <X size={18} />
        </button>
      </div>

      {errorMessage && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--color-rose)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--color-rose-light)', fontSize: '13px', marginBottom: '16px', textAlign: 'left' }}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <fieldset disabled={isSubmitting}>
        <div className="form-group">
          <label className="form-label" htmlFor="pantry-name">Item Name *</label>
          <input
            type="text"
            id="pantry-name"
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
            <label className="form-label" htmlFor="pantry-quantity">Quantity *</label>
            <input
              type="number"
              id="pantry-quantity"
              step="any"
              min={initialItem ? '0' : '0.01'}
              className="input-field"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value === '' ? '' : parseFloat(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="pantry-unit">Unit *</label>
            <input
              type="text"
              id="pantry-unit"
              className="input-field"
              placeholder="e.g. g, ml, pcs, bag"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="pantry-category">Category</label>
            <select
              id="pantry-category"
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
            <label className="form-label" htmlFor="pantry-location">Storage Location</label>
            <select
              id="pantry-location"
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
          <label className="form-label" htmlFor="pantry-expiration">Expiration Date (Optional)</label>
          <input
            type="date"
            id="pantry-expiration"
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
        </fieldset>
      </form>
    </Modal>
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
      <PantryItemForm
        key={initialItem?.id ?? 'new'}
        initialItem={initialItem}
        onClose={onClose}
        onSubmit={onSubmit}
      />
  );
};
