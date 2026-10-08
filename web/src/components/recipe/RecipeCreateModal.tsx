import React, { useState } from 'react';
import type { CreateRecipeRequest } from '../../types/recipe';
import { X, Plus } from 'lucide-react';
import { RecipeGenerator } from './RecipeGenerator';
import { Modal } from '../common/Modal';
import { getErrorMessage } from '../../utils/errors';

interface RecipeCreateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (recipe: CreateRecipeRequest) => Promise<void>;
}

const RecipeCreateForm: React.FC<Omit<RecipeCreateModalProps, 'isOpen'>> = ({
  onClose,
  onSubmit,
}) => {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sourceUrl, setSourceUrl] = useState('');
  const [rawText, setRawText] = useState('');
  const [prepTimeMinutes, setPrepTimeMinutes] = useState<number | ''>(10);
  const [cookTimeMinutes, setCookTimeMinutes] = useState<number | ''>(20);
  const [servings, setServings] = useState<number | ''>(4);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setErrorMessage('Recipe title is required');
      return;
    }
    if (!rawText.trim()) {
      setErrorMessage('Raw recipe ingredients and instructions are required');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onSubmit({
        title: title.trim(),
        description: description.trim() || undefined,
        sourceUrl: sourceUrl.trim() || undefined,
        rawText: rawText.trim(),
        prepTimeMinutes: prepTimeMinutes === '' ? undefined : Number(prepTimeMinutes),
        cookTimeMinutes: cookTimeMinutes === '' ? undefined : Number(cookTimeMinutes),
        servings: servings === '' ? undefined : Number(servings),
      });
      onClose();
    } catch (err: unknown) {
      setErrorMessage(getErrorMessage(err, 'Failed to create recipe'));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
      <Modal label="Add recipe" onClose={onClose} busy={isSubmitting} maxWidth="640px">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700 }}>Add New Recipe</h2>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={isSubmitting} aria-label="Close recipe form">
            <X size={18} />
          </button>
        </div>

        {errorMessage && (
          <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--color-rose)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--color-rose-light)', fontSize: '13px', marginBottom: '16px', textAlign: 'left' }}>
            {errorMessage}
          </div>
        )}

        <RecipeGenerator disabled={isSubmitting} hasDraft={!!title || !!rawText || !!description}
          onChoose={(recipe) => {
            setTitle(recipe.title);
            setDescription(recipe.description);
            setSourceUrl('');
            setPrepTimeMinutes(recipe.prepTimeMinutes);
            setCookTimeMinutes(recipe.cookTimeMinutes);
            setServings(recipe.servings);
            setRawText(`Ingredients:\n${recipe.ingredients.map(item => `- ${item}`).join('\n')}\n\nInstructions:\n${recipe.steps.map((step, i) => `${i + 1}. ${step}`).join('\n')}`);
            setErrorMessage('');
          }} />
        <form onSubmit={handleSubmit}>
          <fieldset disabled={isSubmitting}>
          <div className="form-group">
            <label className="form-label" htmlFor="recipe-title">Recipe Title *</label>
            <input
              type="text"
              id="recipe-title"
              className="input-field"
              placeholder="e.g. Tuscan White Bean & Kale Stew"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              autoFocus
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="recipe-description">Short Description</label>
            <input
              type="text"
              id="recipe-description"
              className="input-field"
              placeholder="e.g. Hearty comforting stew rich in plant protein and herbs"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="recipe-url">Source URL (Optional)</label>
            <input
              type="url"
              id="recipe-url"
              className="input-field"
              placeholder="https://cooking.nytimes.com/recipes/..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div className="form-group">
              <label className="form-label" htmlFor="recipe-prep">Prep (mins)</label>
              <input
                type="number"
                id="recipe-prep"
                min="0"
                className="input-field"
                value={prepTimeMinutes}
                onChange={(e) => setPrepTimeMinutes(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="recipe-cook">Cook (mins)</label>
              <input
                type="number"
                id="recipe-cook"
                min="0"
                className="input-field"
                value={cookTimeMinutes}
                onChange={(e) => setCookTimeMinutes(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="recipe-servings">Servings</label>
              <input
                type="number"
                id="recipe-servings"
                min="1"
                className="input-field"
                value={servings}
                onChange={(e) => setServings(e.target.value === '' ? '' : parseInt(e.target.value, 10))}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="recipe-instructions">Ingredients & Cooking Steps *</label>
            <textarea
              id="recipe-instructions"
              className="textarea-field"
              style={{ minHeight: '140px', fontFamily: 'var(--font-mono)', fontSize: '13px' }}
              placeholder={`Ingredients:\n- 2 cans cannellini beans\n- 1 bunch lacinato kale\n\nInstructions:\n1. Sauté aromatics in olive oil...`}
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
              <Plus size={15} />
              <span>{isSubmitting ? 'Submitting...' : 'Save Recipe'}</span>
            </button>
          </div>
          </fieldset>
        </form>
      </Modal>
  );
};

export const RecipeCreateModal: React.FC<RecipeCreateModalProps> = ({ isOpen, onClose, onSubmit }) => {
  return isOpen ? <RecipeCreateForm onClose={onClose} onSubmit={onSubmit} /> : null;
};
