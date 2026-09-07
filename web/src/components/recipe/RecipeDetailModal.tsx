import React from 'react';
import type { Recipe } from '../../types/recipe';
import { X, Clock, Users, ExternalLink, FileText } from 'lucide-react';

interface RecipeDetailModalProps {
  recipe: Recipe | null;
  isOpen: boolean;
  onClose: () => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  isOpen,
  onClose,
}) => {
  if (!isOpen || !recipe) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '680px' }} onClick={(e) => e.stopPropagation()}>
        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div>
            <h2 style={{ fontSize: '22px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '6px' }}>
              {recipe.title}
            </h2>
            {recipe.description && (
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                {recipe.description}
              </p>
            )}
          </div>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Metrics Bar */}
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', padding: '12px 16px', background: 'var(--bg-surface-elevated)', borderRadius: 'var(--radius-md)', marginBottom: '20px', border: '1px solid var(--border-subtle)' }}>
          {recipe.prepTimeMinutes != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <Clock size={14} color="var(--color-emerald)" />
              <span>Prep: <strong>{recipe.prepTimeMinutes}m</strong></span>
            </div>
          )}
          {recipe.cookTimeMinutes != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <Clock size={14} color="var(--color-amber)" />
              <span>Cook: <strong>{recipe.cookTimeMinutes}m</strong></span>
            </div>
          )}
          {recipe.servings != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <Users size={14} color="var(--color-indigo)" />
              <span>Servings: <strong>{recipe.servings}</strong></span>
            </div>
          )}
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: 'var(--color-emerald-light)', marginLeft: 'auto', textDecoration: 'none' }}
            >
              <span>Original Source</span>
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        {/* Raw Text & Instructions */}
        <div style={{ textAlign: 'left', marginBottom: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
            <FileText size={16} color="var(--color-emerald)" />
            <h4 style={{ fontSize: '15px', fontWeight: 700 }}>Ingredients & Preparation</h4>
          </div>
          <div style={{ background: 'var(--bg-app)', border: '1px solid var(--border-subtle)', borderRadius: 'var(--radius-md)', padding: '16px', fontFamily: 'var(--font-mono)', fontSize: '13px', lineHeight: 1.6, color: 'var(--text-primary)', whiteSpace: 'pre-wrap', maxHeight: '360px', overflowY: 'auto' }}>
            {recipe.rawText}
          </div>
        </div>

        {/* Metadata Footer */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--text-muted)', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)' }}>
          <span>ID: {recipe.id}</span>
          <span>Added: {new Date(recipe.createdAt).toLocaleDateString()}</span>
        </div>
      </div>
    </div>
  );
};
