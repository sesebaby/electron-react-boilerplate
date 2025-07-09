/**
 * 出入库汇总组件的本地存储工具
 */

import { ColumnDisplayConfig, MovementSummaryConfig, MovementSummaryFilters } from '../types/inventoryMovement';

const _STORAGE_KEYS = {
  COLUMN_DISPLAY: 'inventory-movement-column-display',
  CONFIG: 'inventory-movement-config',
  FILTERS: 'inventory-movement-filters'
} as const;

const STORAGE_KEYS = _STORAGE_KEYS;

/**
 * 保存列显示配置到本地存储
 */
export const _saveColumnDisplayConfig = (config: ColumnDisplayConfig): void => {
  try {
    localStorage.setItem(_STORAGE_KEYS.COLUMN_DISPLAY, JSON.stringify(config));
  } catch (error) {
    console.warn('Failed to save column display config:', error);
  }
};

/**
 * 从本地存储加载列显示配置
 */
export const _loadColumnDisplayConfig = (): ColumnDisplayConfig | null => {
  try {
    const _stored = localStorage.getItem(_STORAGE_KEYS.COLUMN_DISPLAY);
    if (_stored) {
      return JSON.parse(_stored);
    }
  } catch (error) {
    console.warn('Failed to load column display config:', error);
  }
  return null;
};

/**
 * 获取默认列显示配置
 */
export const _getDefaultColumnDisplayConfig = (): ColumnDisplayConfig => {
  return {
    openingStock: { quantity: true, convertedQuantity: true, amount: true },
    inboundTotal: { quantity: true, convertedQuantity: true, amount: true },
    outboundTotal: { quantity: true, convertedQuantity: true, amount: true },
    closingStock: { quantity: true, convertedQuantity: true, amount: true }
  };
};

/**
 * 保存组件配置到本地存储
 */
export const _saveMovementConfig = (config: MovementSummaryConfig): void => {
  try {
    localStorage.setItem(_STORAGE_KEYS.CONFIG, JSON.stringify(config));
  } catch (error) {
    console.warn('Failed to save movement config:', error);
  }
};

/**
 * 从本地存储加载组件配置
 */
export const _loadMovementConfig = (): MovementSummaryConfig | null => {
  try {
    const _stored = localStorage.getItem(_STORAGE_KEYS.CONFIG);
    if (_stored) {
      return JSON.parse(_stored);
    }
  } catch (error) {
    console.warn('Failed to load movement config:', error);
  }
  return null;
};

/**
 * 保存筛选条件到本地存储（不包含时间范围）
 */
export const _saveMovementFilters = (filters: Partial<MovementSummaryFilters>): void => {
  try {
    // 只保存非时间相关的筛选条件
    const filtersToSave = {
      productId: filters.productId,
      categoryId: filters.categoryId,
      warehouseId: filters.warehouseId,
      showZeroMovement: filters.showZeroMovement
    };
    localStorage.setItem(STORAGE_KEYS.FILTERS, JSON.stringify(filtersToSave));
  } catch (error) {
    console.warn('Failed to save movement filters:', error);
  }
};

/**
 * 从本地存储加载筛选条件
 */
export const loadMovementFilters = (): Partial<MovementSummaryFilters> | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.FILTERS);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.warn('Failed to load movement filters:', error);
  }
  return null;
};

/**
 * 清除所有本地存储的配置
 */
export const clearAllStoredConfig = (): void => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
  } catch (error) {
    console.warn('Failed to clear stored config:', error);
  }
};

/**
 * 验证列显示配置是否有效
 */
export const _validateColumnDisplayConfig = (config: ColumnDisplayConfig): boolean => {
  // 检查是否至少有一列被选中
  return Object.values(config).some(section =>
    section.quantity || section.convertedQuantity || section.amount
  );
};

/**
 * 获取当前月份的时间范围
 */
export const _getCurrentMonthRange = () => {
  const _now = new Date();
  const _startDate = new Date(_now.getFullYear(), _now.getMonth(), 1);
  const _endDate = new Date();
  return { startDate: _startDate, endDate: _endDate };
};

/**
 * 获取上个月的时间范围
 */
export const _getLastMonthRange = () => {
  const _now = new Date();
  const _startDate = new Date(_now.getFullYear(), _now.getMonth() - 1, 1);
  const _endDate = new Date(_now.getFullYear(), _now.getMonth(), 0);
  return { startDate: _startDate, endDate: _endDate };
};

/**
 * 获取上上月的时间范围
 */
export const _getLastLastMonthRange = () => {
  const _now = new Date();
  const _startDate = new Date(_now.getFullYear(), _now.getMonth() - 2, 1);
  const _endDate = new Date(_now.getFullYear(), _now.getMonth() - 1, 0);
  return { startDate: _startDate, endDate: _endDate };
};

// Re-export without underscores for backward compatibility
export const saveColumnDisplayConfig = _saveColumnDisplayConfig;
export const loadColumnDisplayConfig = _loadColumnDisplayConfig;
export const getDefaultColumnDisplayConfig = _getDefaultColumnDisplayConfig;
export const saveMovementConfig = _saveMovementConfig;
export const loadMovementConfig = _loadMovementConfig;
export const saveMovementFilters = _saveMovementFilters;
export const loadMovementFilters = _loadMovementFilters;
export const clearAllStoredConfig = _clearAllStoredConfig;
export const validateColumnDisplayConfig = _validateColumnDisplayConfig;
export const getCurrentMonthRange = _getCurrentMonthRange;
export const getLastMonthRange = _getLastMonthRange;
export const getLastLastMonthRange = _getLastLastMonthRange;
