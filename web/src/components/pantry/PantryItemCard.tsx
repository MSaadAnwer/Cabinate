import React from 'react';
import type { PantryItem } from '../../types/pantry';
import { MapPin, Plus, Minus, Trash2, Edit2, AlertTriangle, CheckCircle } from 'lucide-react';

interface PantryItemCardProps {
  item: PantryItem;
  onEdit: (item: PantryItem) => void;
  onDelete: (id: string) => void;
  onQuickQuantityChange: (id: string, newQuantity: number) => void;
}

export const PantryItemCard: React.FC<PantryItemCardProps> = ({
  item,
  onEdit,
  onDelete,
  onQuickQuantityChange,
}) => {
  // Expiry calculation
  const getExpiryInfo = (dateStr?: string | null) => {
    if (!dateStr) return null;
    const expDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const diffDays = Math.ceil((expDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        label: `Expired ${Math.abs(diffDays)}d ago`,
        status: 'expired',
        badgeClass: 'badge-expired',
      };
    } else if (diffDays === 0) {
      return {
        label: 'Expires today',
        status: 'expiring',
        badgeClass: 'badge-expiring',
      };
    } else if (diffDays <= 7) {
      return {
        label: `Expires in ${diffDays}d`,
        status: 'expiring',
        badgeClass: 'badge-expiring',
      };
    } else {
      return {
        label: `Exp: ${dateStr}`,
        status: 'safe',
        badgeClass: 'badge-fresh',
      };
    }
  };

  const expiry = getExpiryInfo(item.expirationDate);

  const getCategoryBadgeClass = (category?: string | null) => {
    switch (category?.toUpperCase()) {
      case 'PRODUCE': return 'badge-produce';
      case 'DAIRY': return 'badge-dairy';
      case 'MEAT': return 'badge-meat';
      case 'GRAINS': return 'badge-grains';
      case 'PANTRY': return 'badge-pantry';
      default: return 'badge-secondary';
    }
  };

  return (
    <div className="glass-card glass-card-interactive" style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px', textAlign: 'left' }}>
      {/* Header with Title and Badges */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div>
          <h3 style={{ fontSize: '17px', fontWeight: 700, marginBottom: '4px', color: 'var(--text-primary)' }}>
            {item.name}
          </h3>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {item.category && (
              <span className={`badge ${getCategoryBadgeClass(item.category)}`}>
                {item.category}
              </span>
            )}
            {item.location && (
              <span className="badge" style={{ background: 'rgba(255, 255, 255, 0.06)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                <MapPin size={10} />
                {item.location}
              </span>
            )}
          </div>
        </div>

        {/* Expiry Badge */}
        {expiry && (
          <span className={`badge ${expiry.badgeClass}`} title={`Expiration Date: ${item.expirationDate}`}>
            {expiry.status === 'expired' || expiry.status === 'expiring' ? (
              <AlertTriangle size={11} />
            ) : (
              <CheckCircle size={11} />
            )}
            {expiry.label}
          </span>
        )}
      </div>

      {/* Quantity Display and Stepper */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--bg-surface)', padding: '10px 14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
        <span style={{ fontSize: '13px', color: 'var(--text-secondary)', fontWeight: 500 }}>
          In Stock
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: '4px 8px', borderRadius: '4px' }}
            onClick={() => onQuickQuantityChange(item.id, Math.max(0, item.quantity - 1))}
            disabled={item.quantity <= 0}
            title="Decrease quantity by 1"
          >
            <Minus size={13} />
          </button>
          <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)', minWidth: '48px', textAlign: 'center' }}>
            {item.quantity} {item.unit}
          </span>
          <button
            className="btn btn-ghost btn-sm"
            style={{ padding: '4px 8px', borderRadius: '4px' }}
            onClick={() => onQuickQuantityChange(item.id, item.quantity + 1)}
            title="Increase quantity by 1"
          >
            <Plus size={13} />
          </button>
        </div>
      </div>

      {/* Footer Actions */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px', paddingTop: '8px', borderTop: '1px solid var(--border-subtle)' }}>
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onEdit(item)}
          title="Edit item details"
        >
          <Edit2 size={13} />
          <span>Edit</span>
        </button>
        <button
          className="btn btn-danger btn-sm"
          onClick={() => onDelete(item.id)}
          title="Remove from pantry"
        >
          <Trash2 size={13} />
          <span>Delete</span>
        </button>
      </div>
    </div>
  );
};
