import React from 'react';
import type { Recipe } from '../../types/recipe';
import { Clock, Users, ExternalLink, BookOpen, Trash2 } from 'lucide-react';

interface RecipeCardProps {
  recipe: Recipe;
  onViewDetails: (recipe: Recipe) => void;
  onDelete: (id: string) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  onViewDetails,
  onDelete,
}) => {
  const totalMinutes = (recipe.prepTimeMinutes || 0) + (recipe.cookTimeMinutes || 0);

  return (
    <div className="glass-card glass-card-interactive" style={{ padding: '22px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', textAlign: 'left', minHeight: '220px' }}>
      <div>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '10px', marginBottom: '8px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.3 }}>
            {recipe.title}
          </h3>
          {recipe.sourceUrl && (
            <a
              href={recipe.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-ghost btn-sm"
              style={{ padding: '4px', color: 'var(--text-muted)' }}
              title="Open original source recipe"
              onClick={(e) => e.stopPropagation()}
            >
              <ExternalLink size={14} />
            </a>
          )}
        </div>

        {recipe.description && (
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {recipe.description}
          </p>
        )}
      </div>

      <div>
        {/* Metric Badges */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '16px' }}>
          {totalMinutes > 0 && (
            <span className="badge" style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#a5b4fc', border: '1px solid rgba(99, 102, 241, 0.3)' }}>
              <Clock size={11} />
              {totalMinutes} mins
            </span>
          )}
          {recipe.servings && recipe.servings > 0 && (
            <span className="badge" style={{ background: 'rgba(16, 185, 129, 0.15)', color: '#6ee7b7', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
              <Users size={11} />
              {recipe.servings} {recipe.servings === 1 ? 'serving' : 'servings'}
            </span>
          )}
        </div>

        {/* Footer Actions */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid var(--border-subtle)', paddingTop: '12px' }}>
          <button
            className="btn btn-primary btn-sm"
            onClick={() => onViewDetails(recipe)}
          >
            <BookOpen size={13} />
            <span>View Recipe</span>
          </button>
          <button
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--text-muted)' }}
            onClick={() => onDelete(recipe.id)}
            title="Delete recipe"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};
