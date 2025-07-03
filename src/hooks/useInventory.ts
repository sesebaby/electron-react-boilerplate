import { useState, useMemo } from 'react';
import { InventoryItem, InventorySummary } from '../types/inventory';
import { mockInventoryData } from '../data/mockData';

export const useInventory = () => {
  const [items, setItems] = useState<InventoryItem[]>(mockInventoryData);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           item.description.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [items, searchTerm, categoryFilter, statusFilter]);

  const summary: InventorySummary = useMemo(() => {
    const totalItems = items.length;
    const totalValue = items.reduce((sum, item) => sum + item.totalValue, 0);
    const lowStockItems = items.filter(item => item.status === 'low-stock').length;
    const outOfStockItems = items.filter(item => item.status === 'out-of-stock').length;
    const categories = Array.from(new Set(items.map(item => item.category)));

    return {
      totalItems,
      totalValue,
      lowStockItems,
      outOfStockItems,
      categories
    };
  }, [items]);

  const updateItem = (id: string, updates: Partial<InventoryItem>) => {
    setItems(prev => prev.map(item => 
      item.id === id ? { ...item, ...updates, lastUpdated: new Date() } : item
    ));
  };

  const addItem = (newItem: Omit<InventoryItem, 'id'>) => {
    const item: InventoryItem = {
      ...newItem,
      id: Date.now().toString(),
    };
    setItems(prev => [...prev, item]);
  };

  const deleteItem = (id: string) => {
    setItems(prev => prev.filter(item => item.id !== id));
  };

  return {
    items: filteredItems,
    allItems: items,
    summary,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    updateItem,
    addItem,
    deleteItem
  };
};