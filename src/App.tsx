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
    updateItem,
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage,
    totalItems
  } = useInventory();

  return (
    <div className="app-bg">
      <div className="relative z-10 max-w-full 2xl:max-w-[95%] mx-auto px-2 sm:px-4 lg:px-6 2xl:px-4 h-screen flex flex-col">
        {/* Header - Compact on mobile */}
        <header className="text-center py-2 md:py-6 flex-shrink-0">
          <h1 className="text-xl md:text-3xl lg:text-4xl font-bold text-gradient mb-1">
            📦 Inventory Management System
          </h1>
          <p className="text-sm md:text-base text-white/80 hidden sm:block">
            Manage your inventory with style and efficiency
          </p>
        </header>

        {/* Main Content - Flexible height, prioritize table */}
        <main className="animate-fade-in-up flex-1 flex flex-col min-h-0">
          {/* Dashboard Cards - Compact on mobile, collapsible */}
          <div className="flex-shrink-0 mb-2 md:mb-4 lg:mb-6">
            <Dashboard summary={summary} />
          </div>
          
          {/* Search and Filters - Compact on mobile */}
          <div className="flex-shrink-0 mb-2 md:mb-4 lg:mb-6">
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

          {/* Inventory Table - PRIORITY: Takes most available space */}
          <div className="flex-1 min-h-0 overflow-hidden">
            <InventoryTable
              items={items}
              onUpdateItem={updateItem}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={totalItems}
              itemsPerPage={itemsPerPage}
            />
          </div>
        </main>

        {/* Footer - Compact on mobile, ensure no overlap */}
        <footer className="flex-shrink-0 pt-1 md:pt-2 pb-1 md:pb-2">
          <StatusBar summary={summary} />
        </footer>
      </div>
    </div>
  );
};

export default App;