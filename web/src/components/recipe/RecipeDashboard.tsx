import React, { useState, useMemo } from 'react';
import type { Recipe, CreateRecipeRequest } from '../../types/recipe';
import { RecipeCard } from './RecipeCard';
import { RecipeDetailModal } from './RecipeDetailModal';
import { RecipeCreateModal } from './RecipeCreateModal';
import { Plus, Search, BookOpen, Sparkles } from 'lucide-react';

interface RecipeDashboardProps {
  recipes: Recipe[];
  onAddRecipe: (recipe: CreateRecipeRequest) => Promise<void>;
  onDeleteRecipe: (id: string) => Promise<void>;
  onSeedSampleData: () => void;
  isLoading: boolean;
}

export const RecipeDashboard: React.FC<RecipeDashboardProps> = ({
  recipes,
  onAddRecipe,
  onDeleteRecipe,
  onSeedSampleData,
  isLoading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const filteredRecipes = useMemo(() => {
    if (!searchQuery.trim()) return recipes;
    const q = searchQuery.toLowerCase();
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        (r.description && r.description.toLowerCase().includes(q)) ||
        r.rawText.toLowerCase().includes(q)
    );
  }, [recipes, searchQuery]);

  const handleViewDetails = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setIsDetailOpen(true);
  };

  return (
    <div className="container">
      {/* View Header */}
      <div className="view-header">
        <div className="view-header-content text-left">
          <h1>Recipe Architect & Library</h1>
          <p>
            Structured recipes ready for autonomous nutritional enrichment and pantry matching.
          </p>
        </div>
        <div className="view-header-actions">
          <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
            <Plus size={16} />
            <span>Add New Recipe</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="search-box" style={{ maxWidth: '480px' }}>
          <Search size={16} className="search-icon" />
          <input
            type="text"
            className="input-field search-input"
            placeholder="Search recipes by title, ingredients, or keywords..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
          Showing <strong>{filteredRecipes.length}</strong> of <strong>{recipes.length}</strong> recipes
        </div>
      </div>

      {/* Grid or Empty State */}
      {isLoading ? (
        <div style={{ padding: '60px 0', textAlign: 'center', color: 'var(--text-muted)' }}>
          <div style={{ display: 'inline-block', width: '32px', height: '32px', border: '3px solid var(--border-subtle)', borderTopColor: 'var(--color-emerald)', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
          <p style={{ marginTop: '14px', fontSize: '14px' }}>Loading recipe catalog...</p>
        </div>
      ) : filteredRecipes.length > 0 ? (
        <div className="card-grid">
          {filteredRecipes.map((recipe) => (
            <RecipeCard
              key={recipe.id}
              recipe={recipe}
              onViewDetails={handleViewDetails}
              onDelete={onDeleteRecipe}
            />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <BookOpen className="empty-state-icon" />
          <h3>No recipes match your search</h3>
          <p>
            {searchQuery
              ? `No recipes found matching "${searchQuery}". Clear your search or create a new recipe.`
              : 'Your recipe repository is currently empty. Add your favorite meal or populate sample recipes.'}
          </p>
          <div style={{ display: 'flex', gap: '10px', justifyContent: 'center' }}>
            {searchQuery ? (
              <button className="btn btn-secondary" onClick={() => setSearchQuery('')}>
                Clear Search
              </button>
            ) : (
              <>
                <button className="btn btn-primary" onClick={() => setIsCreateOpen(true)}>
                  <Plus size={15} />
                  <span>Create Recipe</span>
                </button>
                <button className="btn btn-secondary" onClick={onSeedSampleData}>
                  <Sparkles size={15} />
                  <span>Populate Demo Recipes</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      <RecipeDetailModal
        recipe={selectedRecipe}
        isOpen={isDetailOpen}
        onClose={() => {
          setIsDetailOpen(false);
          setSelectedRecipe(null);
        }}
      />

      {/* Create Modal */}
      <RecipeCreateModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSubmit={onAddRecipe}
      />
    </div>
  );
};
