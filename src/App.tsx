import React from 'react';
import { Dashboard } from './components/Dashboard';
import { SearchAndFilters } from './components/SearchAndFilters';
import { InventoryTable } from './components/InventoryTable';
import { StatusBar } from './components/StatusBar';
import { useInventory } from './hooks/useInventory';
import './App.css';

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
    <div className="app">
      <div className="app-container">
        <header className="app-header">
          <h1>📦 Inventory Management System</h1>
          <p>Manage your inventory with style and efficiency</p>
        </header>

        <main className="app-main">
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