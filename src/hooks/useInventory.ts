import { useState, useMemo, useEffect, useCallback, useReducer } from 'react';
import { InventoryItem, InventorySummary } from '../types/inventory';
import InventoryService from '../services/inventory/inventoryService';

// 定义状态接口
interface InventoryState {
  items: InventoryItem[];
  searchTerm: string;
  categoryFilter: string;
  statusFilter: string;
  loading: boolean;
  error: string | null;
  currentPage: number;
  itemsPerPage: number;
}

// 定义Action类型
type InventoryAction = 
  | { type: 'SET_ITEMS'; payload: InventoryItem[] }
  | { type: 'SET_SEARCH_TERM'; payload: string }
  | { type: 'SET_CATEGORY_FILTER'; payload: string }
  | { type: 'SET_STATUS_FILTER'; payload: string }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'SET_CURRENT_PAGE'; payload: number }
  | { type: 'UPDATE_ITEM'; payload: { id: string; item: InventoryItem } }
  | { type: 'ADD_ITEM'; payload: InventoryItem }
  | { type: 'REMOVE_ITEM'; payload: string }
  | { type: 'RESET_PAGE' };

// Reducer函数
function inventoryReducer(state: InventoryState, action: InventoryAction): InventoryState {
  switch (action.type) {
    case 'SET_ITEMS':
      return { ...state, items: action.payload };
    case 'SET_SEARCH_TERM':
      return { ...state, searchTerm: action.payload, currentPage: 1 };
    case 'SET_CATEGORY_FILTER':
      return { ...state, categoryFilter: action.payload, currentPage: 1 };
    case 'SET_STATUS_FILTER':
      return { ...state, statusFilter: action.payload, currentPage: 1 };
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload };
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.payload };
    case 'UPDATE_ITEM':
      return {
        ...state,
        items: state.items.map(item => 
          item.id === action.payload.id ? action.payload.item : item
        )
      };
    case 'ADD_ITEM':
      return { ...state, items: [...state.items, action.payload] };
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(item => item.id !== action.payload) };
    case 'RESET_PAGE':
      return { ...state, currentPage: 1 };
    default:
      return state;
  }
}

// 初始状态
const initialState: InventoryState = {
  items: [],
  searchTerm: '',
  categoryFilter: 'all',
  statusFilter: 'all',
  loading: true,
  error: null,
  currentPage: 1,
  itemsPerPage: 5
};

export const _useInventory = () => {
  const [state, dispatch] = useReducer(inventoryReducer, initialState);

  const _filteredItems = useMemo(() => {
    return state.items.filter(item => {
      const _matchesSearch = item.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
                           item.sku.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
                           item.description.toLowerCase().includes(state.searchTerm.toLowerCase());
      
      const _matchesCategory = state.categoryFilter === 'all' || item.category === state.categoryFilter;
      const _matchesStatus = state.statusFilter === 'all' || item.status === state.statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [state.items, state.searchTerm, state.categoryFilter, state.statusFilter]);

  // Paginated items
  const _paginatedItems = useMemo(() => {
    const _startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const _endIndex = startIndex + state.itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, state.currentPage, state.itemsPerPage]);

  const _totalPages = Math.ceil(filteredItems.length / state.itemsPerPage);

  // Initialize service and load data
  useEffect(() => {
    const _initializeAndLoadData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });
        await InventoryService.initialize();
        await loadItems();
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : '初始化失败' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAndLoadData();
  }, []);

  const _loadItems = useCallback(async () => {
    try {
      const _allItems = await InventoryService.getAllItems();
      dispatch({ type: 'SET_ITEMS', payload: allItems });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : '加载数据失败' });
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
    const _updateSummary = async () => {
      try {
        const _newSummary = await InventoryService.calculateSummary();
        setSummary(newSummary);
      } catch (err) {
        console.error('Failed to calculate summary:', err);
        // 设置用户友好的错误信息
        dispatch({
          type: 'SET_ERROR',
          payload: '汇总数据计算失败，请刷新页面重试'
        });
      }
    };

    if (!state.loading) {
      updateSummary();
    }
  }, [state.items, state.loading]);

  const _updateItem = useCallback(async (id: string, updates: Partial<InventoryItem>) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const _updatedItem = await InventoryService.updateItem(id, updates);
      dispatch({ type: 'UPDATE_ITEM', payload: { id, item: updatedItem } });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : '更新失败' });
      throw err;
    }
  }, []);

  const _addItem = useCallback(async (newItem: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const _createdItem = await InventoryService.createItem(newItem);
      dispatch({ type: 'ADD_ITEM', payload: createdItem });
      return createdItem;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : '创建失败' });
      throw err;
    }
  }, []);

  const _deleteItem = useCallback(async (id: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const _success = await InventoryService.deleteItem(id);
      if (success) {
        dispatch({ type: 'REMOVE_ITEM', payload: id });
      }
      return success;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : '删除失败' });
      throw err;
    }
  }, []);

  const _searchItems = useCallback(async (term: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const _results = await InventoryService.searchItems(term);
      dispatch({ type: 'SET_ITEMS', payload: results });
      dispatch({ type: 'RESET_PAGE' });
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : '搜索失败' });
    }
  }, []);

  const _updateStock = useCallback(async (id: string, quantity: number, type: 'in' | 'out' | 'adjust') => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const _updatedItem = await InventoryService.updateStock(id, quantity, type);
      dispatch({ type: 'UPDATE_ITEM', payload: { id, item: updatedItem } });
      return updatedItem;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : '库存更新失败' });
      throw err;
    }
  }, []);

  const _bulkCreateItems = useCallback(async (items: Array<Omit<InventoryItem, 'id' | 'lastUpdated'>>) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const _createdItems = await InventoryService.bulkCreateItems(items);
      await loadItems(); // Reload all items
      return createdItems;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : '批量创建失败' });
      throw err;
    }
  }, [loadItems]);

  // 新的setter函数
  const _setSearchTerm = useCallback((term: string) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: term });
  }, []);

  const _setCategoryFilter = useCallback((category: string) => {
    dispatch({ type: 'SET_CATEGORY_FILTER', payload: category });
  }, []);

  const _setStatusFilter = useCallback((status: string) => {
    dispatch({ type: 'SET_STATUS_FILTER', payload: status });
  }, []);

  const _setCurrentPage = useCallback((page: number) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
  }, []);

  const _setError = useCallback((error: string | null) => {
    dispatch({ type: 'SET_ERROR', payload: error });
  }, []);

  return {
    items: paginatedItems,
    allItems: filteredItems,
    summary,
    searchTerm: state.searchTerm,
    setSearchTerm,
    categoryFilter: state.categoryFilter,
    setCategoryFilter,
    statusFilter: state.statusFilter,
    setStatusFilter,
    updateItem,
    addItem,
    deleteItem,
    searchItems,
    updateStock,
    bulkCreateItems,
    loadItems,
    loading: state.loading,
    error: state.error,
    setError,
    // Pagination
    currentPage: state.currentPage,
    setCurrentPage,
    totalPages,
    itemsPerPage: state.itemsPerPage,
    totalItems: filteredItems.length
  };
};