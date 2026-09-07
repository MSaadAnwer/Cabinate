import React from 'react';
import type { PantryItem } from '../../types/pantry';
import { AlertTriangle, Clock } from 'lucide-react';

interface ExpiringBannerProps {
  items: PantryItem[];
  onSelectItem: (item: PantryItem) => void;
}

export const ExpiringBanner: React.FC<ExpiringBannerProps> = ({ items, onSelectItem }) => {
  if (!items || items.length === 0) return null;

  return (
    <div className="expiring-spotlight">
      <div className="expiring-header">
        <div className="expiring-icon-badge">
          <AlertTriangle size={22} />
        </div>
        <div style={{ textAlign: 'left' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: 'var(--color-amber-light)' }}>
              Pantry Attention Required
            </h3>
            <span className="badge badge-expiring">
              {items.length} {items.length === 1 ? 'item' : 'items'} expiring soon
            </span>
          </div>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginTop: '2px' }}>
            The following ingredients need to be used within the next 7 days to minimize waste:
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
        {items.slice(0, 4).map((item) => (
          <button
            key={item.id}
            onClick={() => onSelectItem(item)}
            className="btn btn-secondary btn-sm"
            style={{ fontSize: '12px', padding: '4px 10px', borderColor: 'rgba(245, 158, 11, 0.3)' }}
          >
            <Clock size={11} color="var(--color-amber)" />
            <span>{item.name} ({item.quantity} {item.unit})</span>
          </button>
        ))}
        {items.length > 4 && (
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            +{items.length - 4} more
          </span>
        )}
      </div>
    </div>
  );
};
