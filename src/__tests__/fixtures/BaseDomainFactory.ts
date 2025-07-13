/**
 * 领域数据工厂基类
 * 提供通用的数据生成接口和关联性管理
 */

export interface DataDependency {
  id: string;
  type: string;
  data: any;
  dependencies: string[];
}

export interface FactoryOptions {
  [key: string]: any;
}

export abstract class BaseDomainFactory {
  protected static sequence = 1;
  protected static dependencyGraph: Map<string, DataDependency> = new Map();
  protected static dataCache: Map<string, any[]> = new Map();

  /**
   * 获取下一个序列号
   */
  protected static getNextSequence(): number {
    return this.sequence++;
  }

  /**
   * 生成时间戳字符串
   */
  protected static getTimestamp(): string {
    return Date.now().toString();
  }

  /**
   * 生成唯一ID
   */
  protected static generateId(prefix: string = 'test'): string {
    return `${prefix}_${this.getTimestamp()}_${this.getNextSequence()}`;
  }

  /**
   * 记录数据依赖关系
   */
  protected static recordDependency(
    id: string,
    type: string,
    data: any,
    dependencies: string[] = []
  ): void {
    this.dependencyGraph.set(id, {
      id,
      type,
      data,
      dependencies
    });
  }

  /**
   * 获取依赖的数据
   */
  protected static getDependency(id: string): DataDependency | undefined {
    return this.dependencyGraph.get(id);
  }

  /**
   * 验证依赖关系
   */
  protected static validateDependencies(dependencies: string[]): boolean {
    return dependencies.every(dep => this.dependencyGraph.has(dep));
  }

  /**
   * 缓存数据
   */
  protected static cacheData(type: string, data: any): void {
    if (!this.dataCache.has(type)) {
      this.dataCache.set(type, []);
    }
    this.dataCache.get(type)!.push(data);
  }

  /**
   * 获取缓存数据
   */
  protected static getCachedData(type: string): any[] {
    return this.dataCache.get(type) || [];
  }

  /**
   * 获取第一个缓存数据
   */
  protected static getFirstCachedData(type: string): any | null {
    const cached = this.getCachedData(type);
    return cached.length > 0 ? cached[0] : null;
  }

  /**
   * 清理所有数据
   */
  public static clearAllData(): void {
    this.dependencyGraph.clear();
    this.dataCache.clear();
    this.sequence = 1;
  }

  /**
   * 清理特定类型的数据
   */
  public static clearDataByType(type: string): void {
    // 清理依赖图中的特定类型
    const keysToDelete: string[] = [];
    this.dependencyGraph.forEach((value, key) => {
      if (value.type === type) {
        keysToDelete.push(key);
      }
    });
    keysToDelete.forEach(key => this.dependencyGraph.delete(key));

    // 清理缓存
    this.dataCache.delete(type);
  }

  /**
   * 获取数据统计信息
   */
  public static getDataStats(): {
    totalDependencies: number;
    totalCachedTypes: number;
    dependencyTypes: Record<string, number>;
    cachedTypes: Record<string, number>;
  } {
    const dependencyTypes: Record<string, number> = {};
    const cachedTypes: Record<string, number> = {};

    this.dependencyGraph.forEach(value => {
      dependencyTypes[value.type] = (dependencyTypes[value.type] || 0) + 1;
    });

    this.dataCache.forEach((value, key) => {
      cachedTypes[key] = value.length;
    });

    return {
      totalDependencies: this.dependencyGraph.size,
      totalCachedTypes: this.dataCache.size,
      dependencyTypes,
      cachedTypes
    };
  }

  /**
   * 深度复制对象
   */
  protected static deepClone<T>(obj: T): T {
    return JSON.parse(JSON.stringify(obj));
  }

  /**
   * 合并选项
   */
  protected static mergeOptions<T extends FactoryOptions>(
    defaults: T,
    overrides: Partial<T> = {}
  ): T {
    return { ...defaults, ...overrides };
  }

  /**
   * 生成随机数字
   */
  protected static randomInt(min: number = 1, max: number = 1000): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  /**
   * 生成随机小数
   */
  protected static randomFloat(min: number = 1, max: number = 1000, precision: number = 2): number {
    const value = Math.random() * (max - min) + min;
    return Number(value.toFixed(precision));
  }

  /**
   * 从数组中随机选择元素
   */
  protected static randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  /**
   * 生成中文名称
   */
  protected static generateChineseName(category: string, sequence?: number): string {
    const seq = sequence || this.getNextSequence();
    const categoryMap: Record<string, string> = {
      'product': '产品',
      'category': '分类',
      'unit': '单位',
      'warehouse': '仓库',
      'supplier': '供应商',
      'customer': '客户'
    };
    return `测试${categoryMap[category] || category}_${seq}`;
  }
}