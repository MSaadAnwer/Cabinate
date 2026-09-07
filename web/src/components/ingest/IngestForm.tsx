import React, { useState } from 'react';
import type { IngestPayloadRequest } from '../../types/ingest';
import { UploadCloud, Clipboard, Globe, Code, Sparkles } from 'lucide-react';

interface IngestFormProps {
  onIngest: (payload: IngestPayloadRequest) => Promise<void>;
}

export const IngestForm: React.FC<IngestFormProps> = ({ onIngest }) => {
  const [source, setSource] = useState('CLIPBOARD');
  const [sourceUrl, setSourceUrl] = useState('');
  const [contentType, setContentType] = useState('text/plain');
  const [payload, setPayload] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSourceChange = (newSource: string) => {
    setSource(newSource);
    if (newSource === 'WEB_SCRAPE') {
      setContentType('text/html');
    } else if (newSource === 'JSON_IMPORT') {
      setContentType('application/json');
    } else {
      setContentType('text/plain');
    }
  };

  const loadSample = (type: 'clipboard' | 'json' | 'web') => {
    if (type === 'clipboard') {
      setSource('CLIPBOARD');
      setContentType('text/plain');
      setSourceUrl('');
      setPayload(
        "Grandma's golden chicken noodle soup: 1 whole chicken boiled with onions, carrots, celery, and garlic for 90 minutes. Strain broth, shred chicken, add egg noodles and fresh dill. Simmer until noodles are tender."
      );
    } else if (type === 'json') {
      setSource('JSON_IMPORT');
      setContentType('application/json');
      setSourceUrl('https://api.spoonacular.com/recipes/716429/information');
      setPayload(
        JSON.stringify(
          {
            title: 'Pasta with Garlic, Scallions, Cauliflower & Breadcrumbs',
            servings: 2,
            readyInMinutes: 45,
            extendedIngredients: [
              { name: 'cauliflower florets', amount: 3.0, unit: 'cups' },
              { name: 'rigatoni pasta', amount: 0.5, unit: 'lb' },
              { name: 'olive oil', amount: 2.0, unit: 'tbsp' },
              { name: 'panko breadcrumbs', amount: 0.25, unit: 'cup' },
            ],
          },
          null,
          2
        )
      );
    } else {
      setSource('WEB_SCRAPE');
      setContentType('text/html');
      setSourceUrl('https://minimalistbaker.com/garlic-herb-roasted-potatoes');
      setPayload(
        `<article>
  <h1>Crispy Garlic Herb Roasted Potatoes</h1>
  <p>Toss 2 lbs baby Yukon gold potatoes halved with 3 tbsp extra virgin olive oil, 4 minced garlic cloves, 1 tbsp chopped fresh rosemary, and 1 tsp sea salt. Roast at 425°F for 35 minutes until golden and crispy.</p>
</article>`
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payload.trim()) {
      setErrorMessage('Payload content cannot be empty');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage('');
      await onIngest({
        source,
        sourceUrl: sourceUrl.trim() || undefined,
        contentType,
        payload: payload.trim(),
        metadata: {
          clientTimestamp: new Date().toISOString(),
          pastedFrom: 'Web App Workshop',
        },
      });
      setPayload('');
      setSourceUrl('');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to ingest payload');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: '24px', textAlign: 'left' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: 700 }}>Ingest Raw Culinary Data</h3>
          <p style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
            Submit unstructured text, web dumps, or external recipe JSON into the operational lakehouse staging queue.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '6px' }}>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => loadSample('clipboard')}
            title="Load sample clipboard note"
          >
            <Sparkles size={12} color="var(--color-emerald)" />
            <span>Sample Text</span>
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            onClick={() => loadSample('json')}
            title="Load sample API JSON"
          >
            <Code size={12} color="var(--color-indigo)" />
            <span>Sample JSON</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid var(--color-rose)', borderRadius: 'var(--radius-md)', padding: '10px 14px', color: 'var(--color-rose-light)', fontSize: '13px', marginBottom: '16px' }}>
          {errorMessage}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Source selector buttons */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginBottom: '16px' }}>
          <button
            type="button"
            className={`btn ${source === 'CLIPBOARD' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'center' }}
            onClick={() => handleSourceChange('CLIPBOARD')}
          >
            <Clipboard size={14} />
            <span>Clipboard / Text</span>
          </button>
          <button
            type="button"
            className={`btn ${source === 'WEB_SCRAPE' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'center' }}
            onClick={() => handleSourceChange('WEB_SCRAPE')}
          >
            <Globe size={14} />
            <span>Web Scrape</span>
          </button>
          <button
            type="button"
            className={`btn ${source === 'JSON_IMPORT' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'center' }}
            onClick={() => handleSourceChange('JSON_IMPORT')}
          >
            <Code size={14} />
            <span>JSON Import</span>
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
          <div className="form-group">
            <label className="form-label">Source URL (Optional)</label>
            <input
              type="url"
              className="input-field"
              placeholder="https://example.com/recipe..."
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Content Type</label>
            <select
              className="select-field"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
            >
              <option value="text/plain">text/plain</option>
              <option value="text/html">text/html</option>
              <option value="application/json">application/json</option>
            </select>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Raw Payload Content *</label>
          <textarea
            className="textarea-field"
            style={{ minHeight: '160px', fontFamily: 'var(--font-mono)', fontSize: '13px' }}
            placeholder="Paste raw recipe text, HTML snippet, or structured JSON payload here..."
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            <UploadCloud size={16} />
            <span>{isSubmitting ? 'Ingesting...' : 'Ingest Payload'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
