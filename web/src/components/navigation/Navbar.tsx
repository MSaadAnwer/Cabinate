import React from 'react';
import { ChefHat, Database } from 'lucide-react';

interface NavbarProps {
  activeTab: 'pantry' | 'recipes' | 'ingest';
  setActiveTab: (tab: 'pantry' | 'recipes' | 'ingest') => void;
  onSeedData: () => void;
  isSeeding: boolean;
  isOnline: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onSeedData,
  isSeeding,
  isOnline,
}) => {
  return (
    <header className="app-header">
      <div className="container nav-container">
        {/* Brand */}
        <button className="brand" onClick={() => setActiveTab('pantry')} aria-label="Cabinate pantry">
          <div className="brand-icon">
            <ChefHat size={22} />
          </div>
          <div>
            <div className="brand-title">Cabinate</div>
            <div className="brand-subtitle">Pantry & Recipes</div>
          </div>
        </button>

        {/* Center Tabs */}
        <nav className="nav-tabs" aria-label="Main Navigation">
          <button
            className={`nav-tab-btn ${activeTab === 'pantry' ? 'active' : ''}`}
            onClick={() => setActiveTab('pantry')}
            aria-current={activeTab === 'pantry' ? 'page' : undefined}
          >
            Pantry
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'recipes' ? 'active' : ''}`}
            onClick={() => setActiveTab('recipes')}
            aria-current={activeTab === 'recipes' ? 'page' : undefined}
          >
            Recipes
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'ingest' ? 'active' : ''}`}
            onClick={() => setActiveTab('ingest')}
            aria-current={activeTab === 'ingest' ? 'page' : undefined}
          >
            Import
          </button>
        </nav>

        {/* Right Actions */}
        <div className="nav-actions">
          <div className="status-indicator" title={isOnline ? 'Connected to Cabinate' : 'Could not connect to Cabinate'}>
            <div className={`status-dot ${isOnline ? '' : 'offline'}`} />
            <span>{isOnline ? 'Connected' : 'Offline'}</span>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={onSeedData}
            disabled={isSeeding}
            title="Add sample recipes and pantry items"
          >
            <Database size={14} />
            <span>{isSeeding ? 'Adding...' : 'Sample Data'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
