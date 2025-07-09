/**
 * 查询缓存系统
 * 缓存数据库查询结果，减少重复查询，提高性能
 */

export interface CacheEntry<T = any> {
  key: string;
  data: T;
  timestamp: number;
  ttl: number; // 生存时间（毫秒）
  accessCount: number;
  lastAccessed: number;
  size: number; // 估算的内存大小（字节）
}

export interface CacheConfig {
  maxSize: number; // 最大缓存大小（字节）
  defaultTTL: number; // 默认TTL（毫秒）
  maxEntries: number; // 最大条目数
  cleanupInterval: number; // 清理间隔（毫秒）
  enableCompression: boolean; // 是否启用压缩
}

export interface CacheStats {
  hits: number;
  misses: number;
  hitRate: number;
  totalEntries: number;
  totalSize: number;
  oldestEntry: number;
  newestEntry: number;
  averageAccessCount: number;
  memoryUsage: number;
}

export type CacheKey = string | { [key: string]: any };

export class QueryCache {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    hitRate: 0,
    totalEntries: 0,
    totalSize: 0,
    oldestEntry: 0,
    newestEntry: 0,
    averageAccessCount: 0,
    memoryUsage: 0
  };
  
  private cleanupInterval?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 50 * 1024 * 1024, // 50MB
      defaultTTL: config.defaultTTL || 300000, // 5 minutes
      maxEntries: config.maxEntries || 1000,
      cleanupInterval: config.cleanupInterval || 60000, // 1 minute
      enableCompression: config.enableCompression || false
    };

    this.startCleanupTask();
  }

  /**
   * 生成缓存键
   */
  private generateKey(key: CacheKey): string {
    if (typeof key === 'string') {
      return key;
    }
    
    // 为对象键创建确定性字符串
    const sortedEntries = Object.entries(key)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}:${JSON.stringify(v)}`)
      .join('|');
    
    return `obj:${sortedEntries}`;
  }

  /**
   * 估算数据大小
   */
  private estimateSize(data: any): number {
    const jsonString = JSON.stringify(data);
    return new Blob([jsonString]).size;
  }

  /**
   * 获取缓存项
   */
  get<T = any>(key: CacheKey, defaultValue?: T): T | null {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return defaultValue || null;
    }

    const now = Date.now();
    
    // 检查是否过期
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      this.updateStats();
      this.stats.misses++;
      this.updateHitRate();
      return defaultValue || null;
    }

    // 更新访问信息
    entry.accessCount++;
    entry.lastAccessed = now;
    
    this.stats.hits++;
    this.updateHitRate();
    
    return entry.data;
  }

  /**
   * 设置缓存项
   */
  set<T = any>(key: CacheKey, data: T, ttl?: number): boolean {
    if (this.isShuttingDown) {
      return false;
    }

    const cacheKey = this.generateKey(key);
    const now = Date.now();
    const size = this.estimateSize(data);
    const entryTTL = ttl || this.config.defaultTTL;

    // 检查是否会超过大小限制
    if (size > this.config.maxSize * 0.1) { // 单个条目不能超过总大小的10%
      console.warn(`Cache entry too large: ${size} bytes`);
      return false;
    }

    // 如果缓存将满，进行清理
    if (this.shouldEvict(size)) {
      this.evictEntries(size);
    }

    const entry: CacheEntry<T> = {
      key: cacheKey,
      data,
      timestamp: now,
      ttl: entryTTL,
      accessCount: 1,
      lastAccessed: now,
      size
    };

    this.cache.set(cacheKey, entry);
    this.updateStats();
    
    return true;
  }

  /**
   * 删除缓存项
   */
  delete(key: CacheKey): boolean {
    const cacheKey = this.generateKey(key);
    const success = this.cache.delete(cacheKey);
    
    if (success) {
      this.updateStats();
    }
    
    return success;
  }

  /**
   * 检查缓存项是否存在且未过期
   */
  has(key: CacheKey): boolean {
    const cacheKey = this.generateKey(key);
    const entry = this.cache.get(cacheKey);
    
    if (!entry) {
      return false;
    }

    const now = Date.now();
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(cacheKey);
      this.updateStats();
      return false;
    }

    return true;
  }

  /**
   * 清空缓存
   */
  clear(): void {
    this.cache.clear();
    this.updateStats();
  }

  /**
   * 获取或设置缓存项（如果不存在则调用函数获取）
   */
  async getOrSet<T = any>(
    key: CacheKey,
    fetcher: () => Promise<T>,
    ttl?: number
  ): Promise<T> {
    const cached = this.get<T>(key);
    
    if (cached !== null) {
      return cached;
    }

    try {
      const data = await fetcher();
      this.set(key, data, ttl);
      return data;
    } catch (error) {
      console.error('Error fetching data for cache:', error);
      throw error;
    }
  }

  /**
   * 批量获取
   */
  getBatch<T = any>(keys: CacheKey[]): Map<string, T | null> {
    const results = new Map<string, T | null>();
    
    for (const key of keys) {
      const cacheKey = this.generateKey(key);
      results.set(cacheKey, this.get<T>(key));
    }
    
    return results;
  }

  /**
   * 批量设置
   */
  setBatch<T = any>(entries: Array<{ key: CacheKey; data: T; ttl?: number }>): boolean[] {
    return entries.map(entry => this.set(entry.key, entry.data, entry.ttl));
  }

  /**
   * 根据模式删除缓存项
   */
  deleteByPattern(pattern: string | RegExp): number {
    let deletedCount = 0;
    const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
    
    for (const [key] of this.cache) {
      if (regex.test(key)) {
        this.cache.delete(key);
        deletedCount++;
      }
    }
    
    if (deletedCount > 0) {
      this.updateStats();
    }
    
    return deletedCount;
  }

  /**
   * 判断是否需要驱逐条目
   */
  private shouldEvict(newEntrySize: number): boolean {
    return (
      this.stats.totalSize + newEntrySize > this.config.maxSize ||
      this.stats.totalEntries >= this.config.maxEntries
    );
  }

  /**
   * 驱逐缓存条目（LRU + 大小优先）
   */
  private evictEntries(requiredSpace: number): void {
    const entries = Array.from(this.cache.entries()).map(([key, entry]) => ({
      key,
      entry,
      score: this.calculateEvictionScore(entry)
    }));

    // 按驱逐分数排序（分数越高越容易被驱逐）
    entries.sort((a, b) => b.score - a.score);

    let freedSpace = 0;
    let evictedCount = 0;

    for (const { key, entry } of entries) {
      if (freedSpace >= requiredSpace && evictedCount >= Math.min(10, entries.length * 0.1)) {
        break;
      }

      this.cache.delete(key);
      freedSpace += entry.size;
      evictedCount++;
    }

    console.log(`Evicted ${evictedCount} cache entries, freed ${freedSpace} bytes`);
    this.updateStats();
  }

  /**
   * 计算驱逐分数
   */
  private calculateEvictionScore(entry: CacheEntry): number {
    const now = Date.now();
    const age = now - entry.timestamp;
    const timeSinceAccess = now - entry.lastAccessed;
    const timeToExpiry = entry.ttl - age;
    
    // 分数计算：年龄 + 未访问时间 + 大小权重 - 访问频率权重 - 剩余时间权重
    return (
      age * 0.3 +
      timeSinceAccess * 0.4 +
      entry.size * 0.0001 -
      entry.accessCount * 1000 -
      Math.max(0, timeToExpiry) * 0.1
    );
  }

  /**
   * 启动清理任务
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * 清理过期条目
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`Cleaned up ${cleanedCount} expired cache entries`);
      this.updateStats();
    }
  }

  /**
   * 更新统计信息
   */
  private updateStats(): void {
    const entries = Array.from(this.cache.values());
    
    this.stats.totalEntries = entries.length;
    this.stats.totalSize = entries.reduce((sum, entry) => sum + entry.size, 0);
    
    if (entries.length > 0) {
      this.stats.oldestEntry = Math.min(...entries.map(e => e.timestamp));
      this.stats.newestEntry = Math.max(...entries.map(e => e.timestamp));
      this.stats.averageAccessCount = entries.reduce((sum, e) => sum + e.accessCount, 0) / entries.length;
    } else {
      this.stats.oldestEntry = 0;
      this.stats.newestEntry = 0;
      this.stats.averageAccessCount = 0;
    }

    // 估算内存使用（包括键和元数据）
    this.stats.memoryUsage = this.stats.totalSize * 1.2; // 20% 的元数据开销
  }

  /**
   * 更新命中率
   */
  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  /**
   * 获取缓存统计信息
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * 获取详细状态信息
   */
  getDetailedStatus(): {
    config: CacheConfig;
    stats: CacheStats;
    entries: Array<{
      key: string;
      size: number;
      age: number;
      ttl: number;
      accessCount: number;
      lastAccessed: string;
      timeToExpiry: number;
    }>;
  } {
    const now = Date.now();
    
    return {
      config: this.config,
      stats: this.getStats(),
      entries: Array.from(this.cache.values()).map(entry => ({
        key: entry.key,
        size: entry.size,
        age: now - entry.timestamp,
        ttl: entry.ttl,
        accessCount: entry.accessCount,
        lastAccessed: new Date(entry.lastAccessed).toISOString(),
        timeToExpiry: Math.max(0, entry.ttl - (now - entry.timestamp))
      }))
    };
  }

  /**
   * 预热缓存
   */
  async warmUp(entries: Array<{ key: CacheKey; fetcher: () => Promise<any>; ttl?: number }>): Promise<void> {
    console.log(`Warming up cache with ${entries.length} entries...`);
    
    const promises = entries.map(async ({ key, fetcher, ttl }) => {
      try {
        const data = await fetcher();
        this.set(key, data, ttl);
      } catch (error) {
        console.error(`Failed to warm up cache entry ${this.generateKey(key)}:`, error);
      }
    });

    await Promise.all(promises);
    console.log('Cache warm-up completed');
  }

  /**
   * 关闭缓存
   */
  shutdown(): void {
    console.log('Shutting down query cache...');
    
    this.isShuttingDown = true;

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.clear();
    console.log('Query cache shut down');
  }
}

// 创建全局查询缓存实例
export const queryCache = new QueryCache({
  maxSize: 100 * 1024 * 1024, // 100MB
  defaultTTL: 300000, // 5 minutes
  maxEntries: 2000,
  cleanupInterval: 60000, // 1 minute
  enableCompression: false
});

export default queryCache;