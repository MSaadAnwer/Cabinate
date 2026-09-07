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
        <div className="brand" onClick={() => setActiveTab('pantry')}>
          <div className="brand-icon">
            <ChefHat size={22} />
          </div>
          <div>
            <div className="brand-title">Cabinate</div>
            <div className="brand-subtitle">Pantry & Nutrition Architect</div>
          </div>
        </div>

        {/* Center Tabs */}
        <nav className="nav-tabs" aria-label="Main Navigation">
          <button
            className={`nav-tab-btn ${activeTab === 'pantry' ? 'active' : ''}`}
            onClick={() => setActiveTab('pantry')}
          >
            Pantry Inventory
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'recipes' ? 'active' : ''}`}
            onClick={() => setActiveTab('recipes')}
          >
            Recipes
          </button>
          <button
            className={`nav-tab-btn ${activeTab === 'ingest' ? 'active' : ''}`}
            onClick={() => setActiveTab('ingest')}
          >
            Raw Ingestion
          </button>
        </nav>

        {/* Right Actions */}
        <div className="nav-actions">
          <div className="status-indicator" title={isOnline ? 'Connected to Spring Boot API' : 'API Connection Failed'}>
            <div className={`status-dot ${isOnline ? '' : 'offline'}`} />
            <span>{isOnline ? 'API Online' : 'API Offline'}</span>
          </div>

          <button
            className="btn btn-secondary btn-sm"
            onClick={onSeedData}
            disabled={isSeeding}
            title="Populate MongoDB with default recipes and pantry items"
          >
            <Database size={14} />
            <span>{isSeeding ? 'Seeding...' : 'Seed Data'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
