import { useState, useMemo, useEffect, useCallback } from 'react';
import { InventoryItem, InventorySummary } from '../types/inventory';
import InventoryService from '../services/inventory/inventoryService';

export const useInventory = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(5);

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

  // Paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, currentPage, itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  // Initialize service and load data
  useEffect(() => {
    const initializeAndLoadData = async () => {
      try {
        setLoading(true);
        setError(null);
        await InventoryService.initialize();
        await loadItems();
      } catch (err) {
        setError(err instanceof Error ? err.message : '初始化失败');
      } finally {
        setLoading(false);
      }
    };

    initializeAndLoadData();
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const allItems = await InventoryService.getAllItems();
      setItems(allItems);
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败');
    }
  }, []);

  const [summary, setSummary] = useState<InventorySummary>({
    totalItems: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    categories: []
  });

  // Update summary when items change
  useEffect(() => {
    const updateSummary = async () => {
      try {
        const newSummary = await InventoryService.calculateSummary();
        setSummary(newSummary);
      } catch (err) {
        console.error('Failed to calculate summary:', err);
      }
    };
    
    if (!loading) {
      updateSummary();
    }
  }, [items, loading]);

  const updateItem = useCallback(async (id: string, updates: Partial<InventoryItem>) => {
    try {
      setError(null);
      const updatedItem = await InventoryService.updateItem(id, updates);
      setItems(prev => prev.map(item => 
        item.id === id ? updatedItem : item
      ));
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新失败');
      throw err;
    }
  }, []);

  const addItem = useCallback(async (newItem: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    try {
      setError(null);
      const createdItem = await InventoryService.createItem(newItem);
      setItems(prev => [...prev, createdItem]);
      return createdItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败');
      throw err;
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    try {
      setError(null);
      const success = await InventoryService.deleteItem(id);
      if (success) {
        setItems(prev => prev.filter(item => item.id !== id));
      }
      return success;
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
      throw err;
    }
  }, []);

  const searchItems = useCallback(async (term: string) => {
    try {
      setError(null);
      const results = await InventoryService.searchItems(term);
      setItems(results);
      setCurrentPage(1); // Reset to first page
    } catch (err) {
      setError(err instanceof Error ? err.message : '搜索失败');
    }
  }, []);

  const updateStock = useCallback(async (id: string, quantity: number, type: 'in' | 'out' | 'adjust') => {
    try {
      setError(null);
      const updatedItem = await InventoryService.updateStock(id, quantity, type);
      setItems(prev => prev.map(item => 
        item.id === id ? updatedItem : item
      ));
      return updatedItem;
    } catch (err) {
      setError(err instanceof Error ? err.message : '库存更新失败');
      throw err;
    }
  }, []);

  const bulkCreateItems = useCallback(async (items: Array<Omit<InventoryItem, 'id' | 'lastUpdated'>>) => {
    try {
      setError(null);
      const createdItems = await InventoryService.bulkCreateItems(items);
      await loadItems(); // Reload all items
      return createdItems;
    } catch (err) {
      setError(err instanceof Error ? err.message : '批量创建失败');
      throw err;
    }
  }, [loadItems]);

  return {
    items: paginatedItems,
    allItems: filteredItems,
    summary,
    searchTerm,
    setSearchTerm,
    categoryFilter,
    setCategoryFilter,
    statusFilter,
    setStatusFilter,
    updateItem,
    addItem,
    deleteItem,
    searchItems,
    updateStock,
    bulkCreateItems,
    loadItems,
    loading,
    error,
    setError,
    // Pagination
    currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage,
    totalItems: filteredItems.length
  };
};