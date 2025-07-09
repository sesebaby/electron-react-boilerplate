/**
 * 性能监控系统
 * 监控应用性能指标，包括数据库查询、内存使用、响应时间等
 */

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: number;
  tags?: Record<string, string>;
}

export interface DatabaseQueryMetric {
  query: string;
  duration: number;
  success: boolean;
  connectionId?: string;
  recordCount?: number;
  timestamp: number;
}

export interface MemoryMetric {
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  timestamp: number;
}

export interface ServiceMetric {
  serviceName: string;
  methodName: string;
  duration: number;
  success: boolean;
  timestamp: number;
  errorType?: string;
  errorMessage?: string;
}

export interface PerformanceReport {
  period: {
    start: number;
    end: number;
    duration: number;
  };
  database: {
    totalQueries: number;
    averageResponseTime: number;
    slowQueries: DatabaseQueryMetric[];
    errorRate: number;
    topQueries: Array<{
      query: string;
      count: number;
      averageTime: number;
      totalTime: number;
    }>;
  };
  memory: {
    current: MemoryMetric;
    peak: MemoryMetric;
    average: MemoryMetric;
    growthRate: number;
  };
  services: {
    totalCalls: number;
    averageResponseTime: number;
    errorRate: number;
    slowServices: ServiceMetric[];
    topServices: Array<{
      serviceName: string;
      methodName: string;
      count: number;
      averageTime: number;
      errorCount: number;
    }>;
  };
  alerts: Array<{
    type: 'warning' | 'error' | 'critical';
    message: string;
    timestamp: number;
    details?: any;
  }>;
}

export interface MonitorConfig {
  enableDatabaseMonitoring: boolean;
  enableMemoryMonitoring: boolean;
  enableServiceMonitoring: boolean;
  slowQueryThreshold: number;
  slowServiceThreshold: number;
  memoryGrowthThreshold: number;
  reportInterval: number;
  maxHistorySize: number;
  alertThresholds: {
    errorRate: number;
    memoryUsage: number;
    responseTime: number;
  };
}

export class PerformanceMonitor {
  private config: MonitorConfig;
  private metrics: PerformanceMetric[] = [];
  private databaseQueries: DatabaseQueryMetric[] = [];
  private memoryMetrics: MemoryMetric[] = [];
  private serviceMetrics: ServiceMetric[] = [];
  private alerts: Array<{
    type: 'warning' | 'error' | 'critical';
    message: string;
    timestamp: number;
    details?: any;
  }> = [];

  private reportInterval?: NodeJS.Timeout;
  private memoryInterval?: NodeJS.Timeout;
  private isStarted = false;

  constructor(config: Partial<MonitorConfig> = {}) {
    this.config = {
      enableDatabaseMonitoring: config.enableDatabaseMonitoring ?? true,
      enableMemoryMonitoring: config.enableMemoryMonitoring ?? true,
      enableServiceMonitoring: config.enableServiceMonitoring ?? true,
      slowQueryThreshold: config.slowQueryThreshold ?? 1000, // 1 second
      slowServiceThreshold: config.slowServiceThreshold ?? 2000, // 2 seconds
      memoryGrowthThreshold: config.memoryGrowthThreshold ?? 0.1, // 10% growth
      reportInterval: config.reportInterval ?? 300000, // 5 minutes
      maxHistorySize: config.maxHistorySize ?? 1000,
      alertThresholds: {
        errorRate: config.alertThresholds?.errorRate ?? 0.05, // 5%
        memoryUsage: config.alertThresholds?.memoryUsage ?? 0.8, // 80%
        responseTime: config.alertThresholds?.responseTime ?? 3000 // 3 seconds
      }
    };
  }

  /**
   * 启动性能监控
   */
  start(): void {
    if (this.isStarted) {
      return;
    }

    console.log('Starting performance monitoring...');
    
    this.isStarted = true;

    // 启动定期报告
    this.reportInterval = setInterval(() => {
      this.generateReport();
    }, this.config.reportInterval);

    // 启动内存监控
    if (this.config.enableMemoryMonitoring) {
      this.memoryInterval = setInterval(() => {
        this.collectMemoryMetrics();
      }, 10000); // 每10秒收集一次内存指标
    }

    console.log('Performance monitoring started');
  }

  /**
   * 停止性能监控
   */
  stop(): void {
    if (!this.isStarted) {
      return;
    }

    console.log('Stopping performance monitoring...');
    
    this.isStarted = false;

    if (this.reportInterval) {
      clearInterval(this.reportInterval);
    }

    if (this.memoryInterval) {
      clearInterval(this.memoryInterval);
    }

    console.log('Performance monitoring stopped');
  }

  /**
   * 跟踪数据库查询
   */
  trackDatabaseQuery(query: string, duration: number, success: boolean, options?: {
    connectionId?: string;
    recordCount?: number;
  }): void {
    if (!this.config.enableDatabaseMonitoring) {
      return;
    }

    const metric: DatabaseQueryMetric = {
      query: this.sanitizeQuery(query),
      duration,
      success,
      connectionId: options?.connectionId,
      recordCount: options?.recordCount,
      timestamp: Date.now()
    };

    this.databaseQueries.push(metric);
    this.trimHistory(this.databaseQueries);

    // 检查慢查询
    if (duration > this.config.slowQueryThreshold) {
      this.addAlert('warning', `Slow database query detected: ${duration}ms`, {
        query: metric.query,
        duration,
        connectionId: options?.connectionId
      });
    }

    // 检查查询错误
    if (!success) {
      this.addAlert('error', `Database query failed: ${metric.query}`, {
        query: metric.query,
        duration,
        connectionId: options?.connectionId
      });
    }
  }

  /**
   * 跟踪服务初始化
   */
  trackServiceInitialization(serviceName: string, duration: number, success: boolean): void {
    if (!this.config.enableServiceMonitoring) {
      return;
    }

    const metric: ServiceMetric = {
      serviceName,
      methodName: 'initialize',
      duration,
      success,
      timestamp: Date.now()
    };

    this.serviceMetrics.push(metric);
    this.trimHistory(this.serviceMetrics);

    // 检查慢服务
    if (duration > this.config.slowServiceThreshold) {
      this.addAlert('warning', `Slow service initialization: ${serviceName} (${duration}ms)`, {
        serviceName,
        duration
      });
    }

    // 检查服务错误
    if (!success) {
      this.addAlert('error', `Service initialization failed: ${serviceName}`, {
        serviceName,
        duration
      });
    }
  }

  /**
   * 跟踪服务方法调用
   */
  trackServiceMethod(serviceName: string, methodName: string, duration: number, success: boolean, error?: Error): void {
    if (!this.config.enableServiceMonitoring) {
      return;
    }

    const metric: ServiceMetric = {
      serviceName,
      methodName,
      duration,
      success,
      timestamp: Date.now(),
      errorType: error?.name,
      errorMessage: error?.message
    };

    this.serviceMetrics.push(metric);
    this.trimHistory(this.serviceMetrics);

    // 检查慢方法
    if (duration > this.config.slowServiceThreshold) {
      this.addAlert('warning', `Slow service method: ${serviceName}.${methodName} (${duration}ms)`, {
        serviceName,
        methodName,
        duration
      });
    }

    // 检查方法错误
    if (!success) {
      this.addAlert('error', `Service method failed: ${serviceName}.${methodName}`, {
        serviceName,
        methodName,
        duration,
        errorType: error?.name,
        errorMessage: error?.message
      });
    }
  }

  /**
   * 跟踪内存使用
   */
  trackMemoryUsage(): MemoryMetric {
    if (!this.config.enableMemoryMonitoring) {
      return {
        heapUsed: 0,
        heapTotal: 0,
        external: 0,
        rss: 0,
        timestamp: Date.now()
      };
    }

    const memoryUsage = process.memoryUsage();
    const metric: MemoryMetric = {
      heapUsed: memoryUsage.heapUsed,
      heapTotal: memoryUsage.heapTotal,
      external: memoryUsage.external,
      rss: memoryUsage.rss,
      timestamp: Date.now()
    };

    this.memoryMetrics.push(metric);
    this.trimHistory(this.memoryMetrics);

    return metric;
  }

  /**
   * 收集内存指标
   */
  private collectMemoryMetrics(): void {
    const metric = this.trackMemoryUsage();
    
    // 检查内存使用是否过高
    const memoryUsageRatio = metric.heapUsed / metric.heapTotal;
    if (memoryUsageRatio > this.config.alertThresholds.memoryUsage) {
      this.addAlert('warning', `High memory usage: ${(memoryUsageRatio * 100).toFixed(1)}%`, {
        heapUsed: metric.heapUsed,
        heapTotal: metric.heapTotal,
        usage: memoryUsageRatio
      });
    }

    // 检查内存增长率
    if (this.memoryMetrics.length >= 2) {
      const previous = this.memoryMetrics[this.memoryMetrics.length - 2];
      const growthRate = (metric.heapUsed - previous.heapUsed) / previous.heapUsed;
      
      if (growthRate > this.config.memoryGrowthThreshold) {
        this.addAlert('warning', `High memory growth rate: ${(growthRate * 100).toFixed(1)}%`, {
          previous: previous.heapUsed,
          current: metric.heapUsed,
          growthRate
        });
      }
    }
  }

  /**
   * 添加警报
   */
  private addAlert(type: 'warning' | 'error' | 'critical', message: string, details?: any): void {
    const alert = {
      type,
      message,
      timestamp: Date.now(),
      details
    };

    this.alerts.push(alert);
    this.trimHistory(this.alerts);

    // 输出到控制台
    const logLevel = type === 'warning' ? 'warn' : 'error';
    console[logLevel](`[PerformanceMonitor] ${type.toUpperCase()}: ${message}`, details);
  }

  /**
   * 生成性能报告
   */
  generateReport(): PerformanceReport {
    const now = Date.now();
    const reportStart = now - this.config.reportInterval;

    // 过滤时间范围内的数据
    const recentQueries = this.databaseQueries.filter(q => q.timestamp >= reportStart);
    const recentServices = this.serviceMetrics.filter(s => s.timestamp >= reportStart);
    const recentMemory = this.memoryMetrics.filter(m => m.timestamp >= reportStart);

    const report: PerformanceReport = {
      period: {
        start: reportStart,
        end: now,
        duration: this.config.reportInterval
      },
      database: this.generateDatabaseReport(recentQueries),
      memory: this.generateMemoryReport(recentMemory),
      services: this.generateServiceReport(recentServices),
      alerts: this.alerts.filter(a => a.timestamp >= reportStart)
    };

    console.log('[PerformanceMonitor] Generated performance report:', {
      period: report.period,
      database: {
        totalQueries: report.database.totalQueries,
        averageResponseTime: report.database.averageResponseTime,
        errorRate: report.database.errorRate
      },
      memory: {
        current: report.memory.current,
        growthRate: report.memory.growthRate
      },
      services: {
        totalCalls: report.services.totalCalls,
        averageResponseTime: report.services.averageResponseTime,
        errorRate: report.services.errorRate
      },
      alerts: report.alerts.length
    });

    return report;
  }

  /**
   * 生成数据库性能报告
   */
  private generateDatabaseReport(queries: DatabaseQueryMetric[]): PerformanceReport['database'] {
    if (queries.length === 0) {
      return {
        totalQueries: 0,
        averageResponseTime: 0,
        slowQueries: [],
        errorRate: 0,
        topQueries: []
      };
    }

    const totalQueries = queries.length;
    const averageResponseTime = queries.reduce((sum, q) => sum + q.duration, 0) / totalQueries;
    const slowQueries = queries.filter(q => q.duration > this.config.slowQueryThreshold);
    const errorRate = queries.filter(q => !q.success).length / totalQueries;

    // 统计查询频率
    const queryStats = new Map<string, { count: number; totalTime: number }>();
    queries.forEach(q => {
      const existing = queryStats.get(q.query) || { count: 0, totalTime: 0 };
      queryStats.set(q.query, {
        count: existing.count + 1,
        totalTime: existing.totalTime + q.duration
      });
    });

    const topQueries = Array.from(queryStats.entries())
      .map(([query, stats]) => ({
        query,
        count: stats.count,
        averageTime: stats.totalTime / stats.count,
        totalTime: stats.totalTime
      }))
      .sort((a, b) => b.totalTime - a.totalTime)
      .slice(0, 10);

    return {
      totalQueries,
      averageResponseTime,
      slowQueries: slowQueries.slice(0, 10),
      errorRate,
      topQueries
    };
  }

  /**
   * 生成内存性能报告
   */
  private generateMemoryReport(metrics: MemoryMetric[]): PerformanceReport['memory'] {
    if (metrics.length === 0) {
      return {
        current: { heapUsed: 0, heapTotal: 0, external: 0, rss: 0, timestamp: Date.now() },
        peak: { heapUsed: 0, heapTotal: 0, external: 0, rss: 0, timestamp: Date.now() },
        average: { heapUsed: 0, heapTotal: 0, external: 0, rss: 0, timestamp: Date.now() },
        growthRate: 0
      };
    }

    const current = metrics[metrics.length - 1];
    const peak = metrics.reduce((peak, m) => m.heapUsed > peak.heapUsed ? m : peak);
    
    const average: MemoryMetric = {
      heapUsed: metrics.reduce((sum, m) => sum + m.heapUsed, 0) / metrics.length,
      heapTotal: metrics.reduce((sum, m) => sum + m.heapTotal, 0) / metrics.length,
      external: metrics.reduce((sum, m) => sum + m.external, 0) / metrics.length,
      rss: metrics.reduce((sum, m) => sum + m.rss, 0) / metrics.length,
      timestamp: Date.now()
    };

    const growthRate = metrics.length > 1 
      ? (current.heapUsed - metrics[0].heapUsed) / metrics[0].heapUsed
      : 0;

    return {
      current,
      peak,
      average,
      growthRate
    };
  }

  /**
   * 生成服务性能报告
   */
  private generateServiceReport(services: ServiceMetric[]): PerformanceReport['services'] {
    if (services.length === 0) {
      return {
        totalCalls: 0,
        averageResponseTime: 0,
        errorRate: 0,
        slowServices: [],
        topServices: []
      };
    }

    const totalCalls = services.length;
    const averageResponseTime = services.reduce((sum, s) => sum + s.duration, 0) / totalCalls;
    const slowServices = services.filter(s => s.duration > this.config.slowServiceThreshold);
    const errorRate = services.filter(s => !s.success).length / totalCalls;

    // 统计服务调用频率
    const serviceStats = new Map<string, { count: number; totalTime: number; errorCount: number }>();
    services.forEach(s => {
      const key = `${s.serviceName}.${s.methodName}`;
      const existing = serviceStats.get(key) || { count: 0, totalTime: 0, errorCount: 0 };
      serviceStats.set(key, {
        count: existing.count + 1,
        totalTime: existing.totalTime + s.duration,
        errorCount: existing.errorCount + (s.success ? 0 : 1)
      });
    });

    const topServices = Array.from(serviceStats.entries())
      .map(([key, stats]) => {
        const [serviceName, methodName] = key.split('.');
        return {
          serviceName,
          methodName,
          count: stats.count,
          averageTime: stats.totalTime / stats.count,
          errorCount: stats.errorCount
        };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalCalls,
      averageResponseTime,
      errorRate,
      slowServices: slowServices.slice(0, 10),
      topServices
    };
  }

  /**
   * 清理查询字符串（移除敏感信息）
   */
  private sanitizeQuery(query: string): string {
    return query.replace(/(['"]).+?\1/g, '$1***$1');
  }

  /**
   * 修剪历史记录
   */
  private trimHistory<T>(array: T[]): void {
    if (array.length > this.config.maxHistorySize) {
      array.splice(0, array.length - this.config.maxHistorySize);
    }
  }

  /**
   * 获取当前统计信息
   */
  getStats(): {
    isStarted: boolean;
    config: MonitorConfig;
    totalMetrics: number;
    recentAlerts: number;
    memoryUsage: MemoryMetric | null;
  } {
    return {
      isStarted: this.isStarted,
      config: this.config,
      totalMetrics: this.metrics.length + this.databaseQueries.length + this.serviceMetrics.length,
      recentAlerts: this.alerts.filter(a => Date.now() - a.timestamp < 3600000).length, // 1 hour
      memoryUsage: this.memoryMetrics.length > 0 ? this.memoryMetrics[this.memoryMetrics.length - 1] : null
    };
  }

  /**
   * 清理所有数据
   */
  clear(): void {
    this.metrics.length = 0;
    this.databaseQueries.length = 0;
    this.memoryMetrics.length = 0;
    this.serviceMetrics.length = 0;
    this.alerts.length = 0;
  }
}

// 创建全局性能监控实例
export const performanceMonitor = new PerformanceMonitor();

export default performanceMonitor;