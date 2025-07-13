import { useState, useMemo, useEffect, useCallback, useReducer } from 'react';
import { InventoryItem, InventorySummary } from '../types/inventory';
import { serviceManager } from '../services/core';
import { DomainServiceManager } from '../services/domain/DomainServiceManager';
import { Product, ProductStatus } from '../types/entities';

// 状态转换函数
const convertProductStatusToInventoryStatus = (status: ProductStatus): InventoryItem['status'] => {
  switch (status) {
    case ProductStatus.ACTIVE:
      return 'in-stock';
    case ProductStatus.INACTIVE:
      return 'discontinued';
    case ProductStatus.DISCONTINUED:
      return 'discontinued';
    default:
      return 'in-stock';
  }
};

const convertInventoryStatusToProductStatus = (status: InventoryItem['status']): ProductStatus => {
  switch (status) {
    case 'in-stock':
    case 'low-stock':
    case 'out-of-stock':
      return ProductStatus.ACTIVE;
    case 'discontinued':
      return ProductStatus.DISCONTINUED;
    default:
      return ProductStatus.ACTIVE;
  }
};

// Product 转换为 InventoryItem 的辅助函数
const convertProductToInventoryItem = (product: Product): InventoryItem => {
  return {
    id: product.id,
    name: product.name,
    description: product.description || '',
    sku: product.sku,
    category: product.categoryId || '',
    supplier: product.supplierId || '',
    stockQuantity: product.stockQuantity || 0,
    reservedQuantity: product.reservedQuantity || 0,
    unitPrice: product.salePrice || 0,
    totalValue: product.totalValue || 0,
    status: convertProductStatusToInventoryStatus(product.status),
    location: product.location || '',
    reorderLevel: product.minStock || 0,
    maxStock: product.maxStock || 0,
    lastUpdated: product.lastUpdated || new Date()
  };
};

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

export const useInventory = () => {
  const [state, dispatch] = useReducer(inventoryReducer, initialState);

  const filteredItems = useMemo(() => {
    return state.items.filter(item => {
      const matchesSearch = item.name.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
                           item.sku.toLowerCase().includes(state.searchTerm.toLowerCase()) ||
                           (item.description || '').toLowerCase().includes(state.searchTerm.toLowerCase());
      
      const matchesCategory = state.categoryFilter === 'all' || item.category === state.categoryFilter;
      const matchesStatus = state.statusFilter === 'all' || item.status === state.statusFilter;
      
      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [state.items, state.searchTerm, state.categoryFilter, state.statusFilter]);

  // Paginated items
  const paginatedItems = useMemo(() => {
    const startIndex = (state.currentPage - 1) * state.itemsPerPage;
    const endIndex = startIndex + state.itemsPerPage;
    return filteredItems.slice(startIndex, endIndex);
  }, [filteredItems, state.currentPage, state.itemsPerPage]);

  const totalPages = Math.ceil(filteredItems.length / state.itemsPerPage);

  // Initialize service and load data
  useEffect(() => {
    const initializeAndLoadData = async () => {
      try {
        dispatch({ type: 'SET_LOADING', payload: true });
        dispatch({ type: 'SET_ERROR', payload: null });
        // 新架构不需要手动初始化，serviceManager已经处理了
        await loadItems();
      } catch (err) {
        dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : '初始化失败' });
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
      }
    };

    initializeAndLoadData();
  }, []);

  const loadItems = useCallback(async () => {
    try {
      const domainServiceManager = DomainServiceManager.getInstance();
      const inventoryService = domainServiceManager.getInventoryDomainService();
      const result = await inventoryService.getProductsWithStock();
      if (result.success && result.data) {
        // 转换新架构的ProductWithStock数据为旧的InventoryItem格式
        const items: InventoryItem[] = result.data.map((product: any) => convertProductToInventoryItem(product));
        dispatch({ type: 'SET_ITEMS', payload: items });
      } else {
        throw new Error(result.error || '获取产品数据失败');
      }
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
    const updateSummary = () => {
      try {
        // 使用本地计算而不是服务调用，因为新架构中没有直接的calculateSummary方法
        const allItems = state.items;
        const newSummary: InventorySummary = {
          totalItems: allItems.length,
          totalValue: allItems.reduce((sum, item) => sum + (item.totalValue || 0), 0),
          lowStockItems: allItems.filter(item => (item.stockQuantity || 0) <= item.reorderLevel).length,
          outOfStockItems: allItems.filter(item => (item.stockQuantity || 0) <= 0).length,
          categories: [...new Set(allItems.map(item => item.category))]
        };
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

  const updateItem = useCallback(async (id: string, updates: Partial<InventoryItem>) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const domainServiceManager = DomainServiceManager.getInstance();
      const inventoryService = domainServiceManager.getInventoryDomainService();

      // 转换InventoryItem更新为Product更新格式
      const productUpdates: any = {};
      if (updates.name) productUpdates.name = updates.name;
      if (updates.description) productUpdates.description = updates.description;
      if (updates.sku) productUpdates.sku = updates.sku;
      if (updates.category) productUpdates.categoryId = updates.category;
      if (updates.supplier) productUpdates.supplierId = updates.supplier;
      if (updates.stockQuantity !== undefined) productUpdates.stockQuantity = updates.stockQuantity;
      if (updates.reservedQuantity !== undefined) productUpdates.reservedQuantity = updates.reservedQuantity;
      if (updates.unitPrice !== undefined) productUpdates.salePrice = updates.unitPrice;
      if (updates.totalValue !== undefined) productUpdates.totalValue = updates.totalValue;
      if (updates.status) productUpdates.status = convertInventoryStatusToProductStatus(updates.status);
      if (updates.location) productUpdates.location = updates.location;
      if (updates.reorderLevel !== undefined) productUpdates.minStock = updates.reorderLevel;
      if (updates.maxStock !== undefined) productUpdates.maxStock = updates.maxStock;

      const result = await inventoryService.updateProduct(id, productUpdates);
      if (result.success && result.data) {
        // 转换回InventoryItem格式
        const updatedItem = convertProductToInventoryItem(result.data);
        dispatch({ type: 'UPDATE_ITEM', payload: { id, item: updatedItem } });
      } else {
        throw new Error(result.error || '更新产品失败');
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : '更新失败' });
      throw err;
    }
  }, []);

  const addItem = useCallback(async (newItem: Omit<InventoryItem, 'id' | 'lastUpdated'>) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const domainServiceManager = DomainServiceManager.getInstance();
      const inventoryService = domainServiceManager.getInventoryDomainService();

      // 转换InventoryItem格式为Product格式
      const productData = {
        name: newItem.name,
        description: newItem.description,
        sku: newItem.sku,
        categoryId: newItem.category,
        supplierId: newItem.supplier,
        stockQuantity: newItem.stockQuantity,
        reservedQuantity: newItem.reservedQuantity,
        salePrice: newItem.unitPrice,
        purchasePrice: newItem.unitPrice, // 添加必需的purchasePrice字段
        totalValue: newItem.totalValue,
        status: convertInventoryStatusToProductStatus(newItem.status),
        location: newItem.location,
        minStock: newItem.reorderLevel,
        maxStock: newItem.maxStock,
        isActive: true // 添加必需的isActive字段
      };

      const result = await inventoryService.createProduct(productData);
      if (result.success && result.data) {
        // 转换回InventoryItem格式
        const createdItem = convertProductToInventoryItem(result.data);
        dispatch({ type: 'ADD_ITEM', payload: createdItem });
        return createdItem;
      } else {
        throw new Error(result.error || '创建产品失败');
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : '创建失败' });
      throw err;
    }
  }, []);

  const deleteItem = useCallback(async (id: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const domainServiceManager = DomainServiceManager.getInstance();
      const inventoryService = domainServiceManager.getInventoryDomainService();
      const result = await inventoryService.deleteProduct(id);
      if (result.success) {
        dispatch({ type: 'REMOVE_ITEM', payload: id });
        return true;
      } else {
        throw new Error(result.error || '删除失败');
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : '删除失败' });
      throw err;
    }
  }, []);

  const searchItems = useCallback(async (term: string) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const domainServiceManager = DomainServiceManager.getInstance();
      const inventoryService = domainServiceManager.getInventoryDomainService();
      const result = await inventoryService.searchProducts(term);
      if (result.success && result.data) {
        // 转换搜索结果为InventoryItem格式
        const items: InventoryItem[] = result.data.map((product: any) => ({
          id: product.id,
          name: product.name,
          description: product.description || '',
          sku: product.sku,
          category: product.categoryId || '',
          supplier: product.supplierId || '',
          stockQuantity: product.stockQuantity || 0,
          reservedQuantity: product.reservedQuantity || 0,
          unitPrice: product.salePrice || 0,
          totalValue: product.totalValue || 0,
          status: convertProductStatusToInventoryStatus(product.status),
          location: product.location || '',
          reorderLevel: product.minStock || 0,
          maxStock: product.maxStock || 0,
          lastUpdated: product.lastUpdated || new Date()
        }));
        dispatch({ type: 'SET_ITEMS', payload: items });
        dispatch({ type: 'RESET_PAGE' });
      } else {
        throw new Error(result.error || '搜索失败');
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : '搜索失败' });
    }
  }, []);

  const updateStock = useCallback(async (id: string, quantity: number, type: 'in' | 'out' | 'adjust') => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const domainServiceManager = DomainServiceManager.getInstance();
      const inventoryService = domainServiceManager.getInventoryDomainService();
      const masterDataService = domainServiceManager.getMasterDataService();

      // 新架构中使用updateStock方法，需要先获取产品信息
      const productResult = await inventoryService.getProduct(id);
      if (!productResult.success || !productResult.data) {
        throw new Error('产品不存在');
      }

      // 获取默认仓库
      const warehousesResult = await masterDataService.getWarehouses();
      const defaultWarehouse = warehousesResult.success && warehousesResult.data && warehousesResult.data.length > 0
        ? warehousesResult.data[0].id
        : 'default';

      // 更新库存
      const transactionType = type === 'in' ? 'IN' : type === 'out' ? 'OUT' : 'ADJUST';
      const stockResult = await inventoryService.updateStock(id, defaultWarehouse, quantity, transactionType as any);

      if (stockResult.success) {
        // 重新获取更新后的产品信息
        const updatedProductResult = await inventoryService.getProduct(id);
        if (updatedProductResult.success && updatedProductResult.data) {
          const updatedItem = convertProductToInventoryItem(updatedProductResult.data);
          dispatch({ type: 'UPDATE_ITEM', payload: { id, item: updatedItem } });
          return updatedItem;
        }
      } else {
        throw new Error(stockResult.error || '库存更新失败');
      }
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : '库存更新失败' });
      throw err;
    }
  }, []);

  const bulkCreateItems = useCallback(async (items: Array<Omit<InventoryItem, 'id' | 'lastUpdated'>>) => {
    try {
      dispatch({ type: 'SET_ERROR', payload: null });
      const domainServiceManager = DomainServiceManager.getInstance();
      const inventoryService = domainServiceManager.getInventoryDomainService();

      // 批量创建产品 - 新架构中没有直接的bulkCreateItems方法，需要逐个创建
      const createdItems: InventoryItem[] = [];
      for (const item of items) {
        const productData = {
          name: item.name,
          description: item.description,
          sku: item.sku,
          categoryId: item.category,
          supplierId: item.supplier,
          stockQuantity: item.stockQuantity,
          reservedQuantity: item.reservedQuantity,
          salePrice: item.unitPrice,
          purchasePrice: item.unitPrice,
          totalValue: item.totalValue,
          status: convertInventoryStatusToProductStatus(item.status),
          location: item.location,
          minStock: item.reorderLevel,
          maxStock: item.maxStock,
          isActive: true
        };

        const result = await inventoryService.createProduct(productData);
        if (result.success && result.data) {
          createdItems.push(convertProductToInventoryItem(result.data));
        }
      }

      await loadItems(); // Reload all items
      return createdItems;
    } catch (err) {
      dispatch({ type: 'SET_ERROR', payload: err instanceof Error ? err.message : '批量创建失败' });
      throw err;
    }
  }, [loadItems]);

  // 新的setter函数
  const setSearchTerm = useCallback((term: string) => {
    dispatch({ type: 'SET_SEARCH_TERM', payload: term });
  }, []);

  const setCategoryFilter = useCallback((category: string) => {
    dispatch({ type: 'SET_CATEGORY_FILTER', payload: category });
  }, []);

  const setStatusFilter = useCallback((status: string) => {
    dispatch({ type: 'SET_STATUS_FILTER', payload: status });
  }, []);

  const setCurrentPage = useCallback((page: number) => {
    dispatch({ type: 'SET_CURRENT_PAGE', payload: page });
  }, []);

  const setError = useCallback((error: string | null) => {
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