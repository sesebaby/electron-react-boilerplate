import React from 'react';
import { Dashboard } from './components/Dashboard';
import { SearchAndFilters } from './components/SearchAndFilters';
import { InventoryTable } from './components/InventoryTable';
import { StatusBar } from './components/StatusBar';
import { useInventory } from './hooks/useInventory';
import './globals.css';

const App: React.FC = () => {
  const {
    items,
    summary,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    updateItem
  } = useInventory();

  return (
    <div className="app-bg">
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-screen flex flex-col">
        {/* Header - Fixed height */}
        <header className="text-center py-6 flex-shrink-0">
          <h1 className="text-3xl md:text-4xl font-bold text-gradient mb-1">
            📦 Inventory Management System
          </h1>
          <p className="text-base text-white/80">
            Manage your inventory with style and efficiency
          </p>
        </header>

        {/* Main Content - Flexible height */}
        <main className="animate-fade-in-up flex-1 flex flex-col min-h-0">
          {/* Dashboard Cards - Fixed height */}
          <div className="flex-shrink-0 mb-6">
            <Dashboard summary={summary} />
          </div>
          
          {/* Search and Filters - Fixed height */}
          <div className="flex-shrink-0 mb-6">
            <SearchAndFilters
              searchTerm={searchTerm}
              setSearchTerm={setSearchTerm}
              categoryFilter={categoryFilter}
              setCategoryFilter={setCategoryFilter}
              statusFilter={statusFilter}
              setStatusFilter={setStatusFilter}
              categories={summary.categories}
            />
          </div>

          {/* Inventory Table - Flexible height with scroll */}
          <div className="flex-1 min-h-0">
            <InventoryTable
              items={items}
              onUpdateItem={updateItem}
            />
          </div>
        </main>

        {/* Footer - Fixed height with top margin */}
        <footer className="flex-shrink-0 pt-6 pb-4">
          <StatusBar summary={summary} />
        </footer>
      </div>
    </div>
  );
};

export default App;