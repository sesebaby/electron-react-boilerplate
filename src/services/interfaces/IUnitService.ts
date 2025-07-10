/**
 * 计量单位服务接口
 */

import { Unit, UnitType } from '../../types/entities';
import { 
  IBusinessService, 
  PaginatedResult, 
  PaginationParams, 
  BaseFilter, 
  ServiceResult,
  ServiceStatistics,
  BatchOperationResult
} from './IBusinessService';

/**
 * 单位查询过滤器
 */
export interface UnitFilter extends BaseFilter {
  /** 单位类型 */
  type?: UnitType;
  /** 是否为基础单位 */
  isBaseUnit?: boolean;
  /** 是否启用 */
  isActive?: boolean;
}

/**
 * 单位换算规则
 */
export interface UnitConversionRule {
  /** 源单位ID */
  fromUnitId: string;
  /** 目标单位ID */
  toUnitId: string;
  /** 换算比率 */
  conversionRate: number;
  /** 换算公式 */
  formula?: string;
  /** 是否为双向换算 */
  bidirectional: boolean;
}

/**
 * 单位换算结果
 */
export interface UnitConversionResult {
  /** 原始数量 */
  originalQuantity: number;
  /** 原始单位 */
  originalUnit: Unit;
  /** 转换后数量 */
  convertedQuantity: number;
  /** 转换后单位 */
  convertedUnit: Unit;
  /** 换算比率 */
  conversionRate: number;
  /** 换算路径（如果需要多步换算） */
  conversionPath?: Unit[];
}

/**
 * 单位统计信息
 */
export interface UnitStatistics extends ServiceStatistics {
  /** 各类型单位数量 */
  countByType: Record<UnitType, number>;
  /** 基础单位数量 */
  baseUnitCount: number;
  /** 派生单位数量 */
  derivedUnitCount: number;
  /** 换算规则数量 */
  conversionRuleCount: number;
}

/**
 * 单位服务接口
 */
export interface IUnitService extends IBusinessService {
  // ==================== 基础CRUD操作 ====================

  /**
   * 创建单位
   */
  create(data: Omit<Unit, 'id' | 'createdAt' | 'updatedAt'>, currentUserId?: string): Promise<Unit>;

  /**
   * 根据ID获取单位
   */
  findById(id: string): Promise<Unit | null>;

  /**
   * 根据符号获取单位
   */
  findBySymbol(symbol: string): Promise<Unit | null>;

  /**
   * 根据名称获取单位
   */
  findByName(name: string): Promise<Unit | null>;

  /**
   * 获取所有单位
   */
  findAll(): Promise<Unit[]>;

  /**
   * 分页查询单位
   */
  findPaginated(params: PaginationParams, filter?: UnitFilter): Promise<PaginatedResult<Unit>>;

  /**
   * 更新单位
   */
  update(id: string, data: Partial<Unit>, currentUserId?: string): Promise<Unit>;

  /**
   * 删除单位
   */
  delete(id: string, currentUserId?: string): Promise<void>;

  /**
   * 批量删除单位
   */
  deleteBatch(ids: string[], currentUserId?: string): Promise<BatchOperationResult<string>>;

  // ==================== 类型和分类查询 ====================

  /**
   * 根据类型获取单位列表
   */
  findByType(type: UnitType): Promise<Unit[]>;

  /**
   * 获取所有单位类型
   */
  getAllTypes(): Promise<UnitType[]>;

  /**
   * 获取基础单位列表
   */
  findBaseUnits(): Promise<Unit[]>;

  /**
   * 获取派生单位列表
   */
  findDerivedUnits(): Promise<Unit[]>;

  /**
   * 获取指定类型的基础单位
   */
  findBaseUnitByType(type: UnitType): Promise<Unit | null>;

  // ==================== 单位换算 ====================

  /**
   * 添加换算规则
   */
  addConversionRule(rule: Omit<UnitConversionRule, 'id'>): Promise<UnitConversionRule>;

  /**
   * 删除换算规则
   */
  removeConversionRule(fromUnitId: string, toUnitId: string): Promise<void>;

  /**
   * 获取单位的所有换算规则
   */
  getConversionRules(unitId: string): Promise<UnitConversionRule[]>;

  /**
   * 获取两个单位之间的换算规则
   */
  getConversionRule(fromUnitId: string, toUnitId: string): Promise<UnitConversionRule | null>;

  /**
   * 执行单位换算
   */
  convert(quantity: number, fromUnitId: string, toUnitId: string): Promise<UnitConversionResult>;

  /**
   * 批量单位换算
   */
  convertBatch(conversions: Array<{
    quantity: number;
    fromUnitId: string;
    toUnitId: string;
  }>): Promise<UnitConversionResult[]>;

  /**
   * 检查两个单位是否可以换算
   */
  canConvert(fromUnitId: string, toUnitId: string): Promise<boolean>;

  /**
   * 获取单位换算路径
   */
  getConversionPath(fromUnitId: string, toUnitId: string): Promise<Unit[]>;

  // ==================== 验证和检查 ====================

  /**
   * 验证单位数据
   */
  validateUnit(data: Partial<Unit>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  /**
   * 检查单位符号是否唯一
   */
  isSymbolUnique(symbol: string, excludeId?: string): Promise<boolean>;

  /**
   * 检查单位名称是否唯一
   */
  isNameUnique(name: string, excludeId?: string): Promise<boolean>;

  /**
   * 检查单位是否可以删除
   */
  canDelete(id: string): Promise<{
    canDelete: boolean;
    reason?: string;
    relatedEntities?: {
      products: number;
      conversionRules: number;
    };
  }>;

  /**
   * 验证换算规则
   */
  validateConversionRule(rule: Partial<UnitConversionRule>): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }>;

  // ==================== 搜索和查询 ====================

  /**
   * 搜索单位
   */
  search(keyword: string, filter?: UnitFilter): Promise<Unit[]>;

  /**
   * 根据名称或符号模糊查询
   */
  findByNameOrSymbolLike(query: string): Promise<Unit[]>;

  /**
   * 获取常用单位列表
   */
  getCommonUnits(limit?: number): Promise<Unit[]>;

  /**
   * 获取推荐的换算单位
   */
  getRecommendedConversions(unitId: string): Promise<Unit[]>;

  // ==================== 统计和分析 ====================

  /**
   * 获取单位统计信息
   */
  getStatistics(): Promise<UnitStatistics>;

  /**
   * 获取单位使用情况统计
   */
  getUsageStatistics(unitId: string): Promise<{
    productCount: number;
    conversionRuleCount: number;
    lastUsed: Date | null;
    usageFrequency: number;
  }>;

  /**
   * 获取热门单位排行
   */
  getPopularUnits(limit?: number): Promise<Array<{
    unit: Unit;
    usageCount: number;
    productCount: number;
  }>>;

  // ==================== 数据管理 ====================

  /**
   * 导出单位数据
   */
  exportUnits(filter?: UnitFilter): Promise<ServiceResult<Unit[]>>;

  /**
   * 导入单位数据
   */
  importUnits(units: Partial<Unit>[]): Promise<BatchOperationResult<Unit>>;

  /**
   * 导出换算规则
   */
  exportConversionRules(): Promise<ServiceResult<UnitConversionRule[]>>;

  /**
   * 导入换算规则
   */
  importConversionRules(rules: Partial<UnitConversionRule>[]): Promise<BatchOperationResult<UnitConversionRule>>;

  /**
   * 重建换算规则索引
   */
  rebuildConversionIndex(): Promise<void>;

  // ==================== 缓存管理 ====================

  /**
   * 刷新单位缓存
   */
  refreshCache(): Promise<void>;

  /**
   * 清空单位缓存
   */
  clearCache(): Promise<void>;

  /**
   * 预热单位缓存
   */
  warmupCache(): Promise<void>;

  /**
   * 刷新换算规则缓存
   */
  refreshConversionCache(): Promise<void>;
}
