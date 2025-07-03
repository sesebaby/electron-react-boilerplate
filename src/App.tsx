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
      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 min-h-screen">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold text-gradient mb-2">
            📦 Inventory Management System
          </h1>
          <p className="text-lg text-white/80">
            Manage your inventory with style and efficiency
          </p>
        </header>

        <main className="animate-fade-in-up">
          <Dashboard summary={summary} />
          
          <SearchAndFilters
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            categoryFilter={categoryFilter}
            setCategoryFilter={setCategoryFilter}
            statusFilter={statusFilter}
            setStatusFilter={setStatusFilter}
            categories={summary.categories}
          />

          <InventoryTable
            items={items}
            onUpdateItem={updateItem}
          />
        </main>

        <StatusBar summary={summary} />
      </div>
    </div>
  );
};

export default App;