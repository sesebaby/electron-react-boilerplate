/**
 * 数据库连接池
 * 管理数据库连接的创建、分配和回收，提高性能和资源利用率
 */

export interface DatabaseConnection {
  id: string;
  isActive: boolean;
  lastUsed: number;
  createdAt: number;
  queryCount: number;
}

export interface PoolConfig {
  maxConnections: number;
  minConnections: number;
  acquireTimeoutMs: number;
  idleTimeoutMs: number;
  maxLifetimeMs: number;
  checkInterval: number;
}

export interface PoolStats {
  totalConnections: number;
  activeConnections: number;
  idleConnections: number;
  waitingRequests: number;
  totalQueries: number;
  avgResponseTime: number;
  errorCount: number;
}

export class DatabasePool {
  private connections = new Map<string, DatabaseConnection>();
  private availableConnections: string[] = [];
  private pendingRequests: Array<{
    resolve: (connectionId: string) => void;
    reject: (error: Error) => void;
    timestamp: number;
  }> = [];
  
  private config: PoolConfig;
  private stats: PoolStats = {
    totalConnections: 0,
    activeConnections: 0,
    idleConnections: 0,
    waitingRequests: 0,
    totalQueries: 0,
    avgResponseTime: 0,
    errorCount: 0
  };
  
  private cleanupInterval?: NodeJS.Timeout;
  private isShuttingDown = false;

  constructor(config: Partial<PoolConfig> = {}) {
    this.config = {
      maxConnections: config.maxConnections || 10,
      minConnections: config.minConnections || 2,
      acquireTimeoutMs: config.acquireTimeoutMs || 30000,
      idleTimeoutMs: config.idleTimeoutMs || 300000, // 5 minutes
      maxLifetimeMs: config.maxLifetimeMs || 3600000, // 1 hour
      checkInterval: config.checkInterval || 60000 // 1 minute
    };

    this.initialize();
  }

  /**
   * 初始化连接池
   */
  private async initialize(): Promise<void> {
    console.log('Initializing database connection pool...');
    
    // 创建最小连接数
    for (let i = 0; i < this.config.minConnections; i++) {
      await this.createConnection();
    }

    // 启动清理任务
    this.startCleanupTask();
    
    console.log(`Database pool initialized with ${this.connections.size} connections`);
  }

  /**
   * 创建新连接
   */
  private async createConnection(): Promise<string> {
    if (this.connections.size >= this.config.maxConnections) {
      throw new Error('Maximum number of connections reached');
    }

    const connectionId = `conn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const connection: DatabaseConnection = {
      id: connectionId,
      isActive: false,
      lastUsed: Date.now(),
      createdAt: Date.now(),
      queryCount: 0
    };

    this.connections.set(connectionId, connection);
    this.availableConnections.push(connectionId);
    this.stats.totalConnections++;
    this.stats.idleConnections++;

    console.log(`Created database connection: ${connectionId}`);
    return connectionId;
  }

  /**
   * 获取连接
   */
  async acquireConnection(): Promise<string> {
    if (this.isShuttingDown) {
      throw new Error('Database pool is shutting down');
    }

    // 如果有可用连接，直接返回
    if (this.availableConnections.length > 0) {
      const connectionId = this.availableConnections.shift()!;
      const connection = this.connections.get(connectionId)!;
      
      connection.isActive = true;
      connection.lastUsed = Date.now();
      
      this.stats.activeConnections++;
      this.stats.idleConnections--;
      
      return connectionId;
    }

    // 如果没有可用连接但还能创建新连接
    if (this.connections.size < this.config.maxConnections) {
      const connectionId = await this.createConnection();
      return this.acquireConnection(); // 递归获取刚创建的连接
    }

    // 如果已达到最大连接数，等待可用连接
    return new Promise((resolve, reject) => {
      const request = {
        resolve,
        reject,
        timestamp: Date.now()
      };

      this.pendingRequests.push(request);
      this.stats.waitingRequests++;

      // 设置超时
      setTimeout(() => {
        const index = this.pendingRequests.indexOf(request);
        if (index !== -1) {
          this.pendingRequests.splice(index, 1);
          this.stats.waitingRequests--;
          reject(new Error('Connection acquire timeout'));
        }
      }, this.config.acquireTimeoutMs);
    });
  }

  /**
   * 释放连接
   */
  releaseConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      console.warn(`Attempted to release unknown connection: ${connectionId}`);
      return;
    }

    if (!connection.isActive) {
      console.warn(`Attempted to release inactive connection: ${connectionId}`);
      return;
    }

    connection.isActive = false;
    connection.lastUsed = Date.now();
    
    this.stats.activeConnections--;
    this.stats.idleConnections++;

    // 如果有等待的请求，立即分配给它们
    if (this.pendingRequests.length > 0) {
      const request = this.pendingRequests.shift()!;
      this.stats.waitingRequests--;
      
      connection.isActive = true;
      this.stats.activeConnections++;
      this.stats.idleConnections--;
      
      request.resolve(connectionId);
    } else {
      this.availableConnections.push(connectionId);
    }
  }

  /**
   * 记录查询统计
   */
  recordQuery(connectionId: string, duration: number, success: boolean): void {
    const connection = this.connections.get(connectionId);
    if (connection) {
      connection.queryCount++;
    }

    this.stats.totalQueries++;
    
    if (!success) {
      this.stats.errorCount++;
    }

    // 更新平均响应时间
    this.stats.avgResponseTime = 
      (this.stats.avgResponseTime * (this.stats.totalQueries - 1) + duration) / this.stats.totalQueries;
  }

  /**
   * 启动清理任务
   */
  private startCleanupTask(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupConnections();
    }, this.config.checkInterval);
  }

  /**
   * 清理过期和闲置连接
   */
  private cleanupConnections(): void {
    const now = Date.now();
    const connectionsToRemove: string[] = [];

    for (const [connectionId, connection] of this.connections) {
      if (connection.isActive) {
        continue; // 不清理活跃连接
      }

      const idleTime = now - connection.lastUsed;
      const lifetime = now - connection.createdAt;

      // 检查是否超过最大生命周期或空闲时间
      if (lifetime > this.config.maxLifetimeMs || idleTime > this.config.idleTimeoutMs) {
        connectionsToRemove.push(connectionId);
      }
    }

    // 移除过期连接，但保持最小连接数
    for (const connectionId of connectionsToRemove) {
      if (this.connections.size > this.config.minConnections) {
        this.removeConnection(connectionId);
      }
    }

    // 如果连接数少于最小值，创建新连接
    while (this.connections.size < this.config.minConnections) {
      this.createConnection().catch(error => {
        console.error('Failed to create connection during cleanup:', error);
      });
    }
  }

  /**
   * 移除连接
   */
  private removeConnection(connectionId: string): void {
    const connection = this.connections.get(connectionId);
    if (!connection) {
      return;
    }

    // 从可用连接列表中移除
    const availableIndex = this.availableConnections.indexOf(connectionId);
    if (availableIndex !== -1) {
      this.availableConnections.splice(availableIndex, 1);
      this.stats.idleConnections--;
    }

    // 移除连接
    this.connections.delete(connectionId);
    this.stats.totalConnections--;

    console.log(`Removed database connection: ${connectionId}`);
  }

  /**
   * 获取连接池状态
   */
  getStats(): PoolStats {
    return { ...this.stats };
  }

  /**
   * 获取详细状态信息
   */
  getDetailedStatus(): {
    config: PoolConfig;
    stats: PoolStats;
    connections: Array<{
      id: string;
      isActive: boolean;
      lastUsed: string;
      createdAt: string;
      queryCount: number;
      idleTime: number;
      lifetime: number;
    }>;
  } {
    const now = Date.now();
    
    return {
      config: this.config,
      stats: this.getStats(),
      connections: Array.from(this.connections.values()).map(conn => ({
        id: conn.id,
        isActive: conn.isActive,
        lastUsed: new Date(conn.lastUsed).toISOString(),
        createdAt: new Date(conn.createdAt).toISOString(),
        queryCount: conn.queryCount,
        idleTime: now - conn.lastUsed,
        lifetime: now - conn.createdAt
      }))
    };
  }

  /**
   * 执行数据库操作（带连接管理）
   */
  async executeWithConnection<T>(
    operation: (connectionId: string) => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    let connectionId: string | null = null;
    
    try {
      connectionId = await this.acquireConnection();
      const result = await operation(connectionId);
      
      const duration = Date.now() - startTime;
      this.recordQuery(connectionId, duration, true);
      
      return result;
    } catch (error) {
      if (connectionId) {
        const duration = Date.now() - startTime;
        this.recordQuery(connectionId, duration, false);
      }
      throw error;
    } finally {
      if (connectionId) {
        this.releaseConnection(connectionId);
      }
    }
  }

  /**
   * 关闭连接池
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down database connection pool...');
    
    this.isShuttingDown = true;

    // 停止清理任务
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // 拒绝所有等待的请求
    for (const request of this.pendingRequests) {
      request.reject(new Error('Database pool is shutting down'));
    }
    this.pendingRequests.length = 0;

    // 等待所有活跃连接完成
    const maxWaitTime = 30000; // 30秒
    const checkInterval = 100;
    let waitTime = 0;

    while (this.stats.activeConnections > 0 && waitTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, checkInterval));
      waitTime += checkInterval;
    }

    // 关闭所有连接
    this.connections.clear();
    this.availableConnections.length = 0;
    
    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      idleConnections: 0,
      waitingRequests: 0,
      totalQueries: 0,
      avgResponseTime: 0,
      errorCount: 0
    };

    console.log('Database connection pool shut down');
  }
}

// 创建全局连接池实例
export const databasePool = new DatabasePool({
  maxConnections: 15,
  minConnections: 3,
  acquireTimeoutMs: 30000,
  idleTimeoutMs: 300000,
  maxLifetimeMs: 3600000,
  checkInterval: 60000
});

export default databasePool;