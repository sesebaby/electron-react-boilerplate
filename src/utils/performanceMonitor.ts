/**
 * 性能监控器
 * 监控应用的关键性能指标，包括API响应时间、页面加载性能、内存使用等
 */

import { logger } from './logger';

export interface PerformanceMetric {
  id: string;
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  category: PerformanceCategory;
  details?: Record<string, any>;
}

export enum PerformanceCategory {
  API = 'api',
  NAVIGATION = 'navigation',
  RENDER = 'render',
  MEMORY = 'memory',
  USER_INTERACTION = 'user_interaction',
  RESOURCE_LOADING = 'resource_loading'
}

export interface ApiPerformanceMetric {
  url: string;
  method: string;
  duration: number;
  status: number;
  size?: number;
  timestamp: Date;
}

export interface NavigationPerformanceMetric {
  from: string;
  to: string;
  duration: number;
  timestamp: Date;
  type: 'programmatic' | 'user';
}

export interface RenderPerformanceMetric {
  componentName: string;
  phase: 'mount' | 'update' | 'unmount';
  duration: number;
  renderCount: number;
  timestamp: Date;
}

export interface MemoryPerformanceMetric {
  usedJSHeapSize: number;
  totalJSHeapSize: number;
  jsHeapSizeLimit: number;
  timestamp: Date;
}

export interface PerformanceConfig {
  enableMonitoring: boolean;
  enableApiMonitoring: boolean;
  enableNavigationMonitoring: boolean;
  enableRenderMonitoring: boolean;
  enableMemoryMonitoring: boolean;
  sampleRate: number; // 0.0 - 1.0
  memoryMonitoringInterval: number; // 毫秒
  slowApiThreshold: number; // 毫秒
  slowRenderThreshold: number; // 毫秒
  maxMetricsInMemory: number;
}

class PerformanceMonitor {
  private config: PerformanceConfig;
  private metrics: PerformanceMetric[] = [];
  private apiMetrics: Map<string, number> = new Map(); // 跟踪API开始时间
  private renderMetrics: Map<string, number> = new Map(); // 跟踪渲染开始时间
  private memoryMonitorInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(config?: Partial<PerformanceConfig>) {
    this.config = {
      enableMonitoring: true,
      enableApiMonitoring: true,
      enableNavigationMonitoring: true,
      enableRenderMonitoring: true,
      enableMemoryMonitoring: true,
      sampleRate: 1.0, // 开发环境全采样，生产环境可降低
      memoryMonitoringInterval: 30000, // 30秒
      slowApiThreshold: 1000, // 1秒
      slowRenderThreshold: 16, // 16ms (60fps)
      maxMetricsInMemory: 1000,
      ...config
    };

    this.initialize();
  }

  /**
   * 初始化性能监控
   */
  private initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    try {
      // 监控页面性能
      if (this.config.enableNavigationMonitoring) {
        this.monitorPagePerformance();
      }

      // 监控内存使用
      if (this.config.enableMemoryMonitoring) {
        this.startMemoryMonitoring();
      }

      // 监控资源加载性能
      this.monitorResourcePerformance();

      // 监控用户交互性能
      this.monitorInteractionPerformance();

      this.isInitialized = true;
      logger.info('Performance monitor initialized', {
        config: this.config
      }, 'PerformanceMonitor');

    } catch (error) {
      logger.error('Failed to initialize performance monitor', { error }, 'PerformanceMonitor');
    }
  }

  /**
   * 开始API性能监控
   */
  public startApiCall(requestId: string, url: string, method: string): void {
    if (!this.shouldSample() || !this.config.enableApiMonitoring) {
      return;
    }

    this.apiMetrics.set(requestId, performance.now());
    
    // 使用Performance API标记
    if (typeof performance.mark === 'function') {
      performance.mark(`api-start-${requestId}`);
    }
  }

  /**
   * 结束API性能监控
   */
  public endApiCall(
    requestId: string, 
    url: string, 
    method: string, 
    status: number, 
    size?: number
  ): void {
    if (!this.shouldSample() || !this.config.enableApiMonitoring) {
      return;
    }

    const startTime = this.apiMetrics.get(requestId);
    if (!startTime) return;

    const duration = performance.now() - startTime;
    this.apiMetrics.delete(requestId);

    // 使用Performance API测量
    if (typeof performance.mark === 'function' && typeof performance.measure === 'function') {
      performance.mark(`api-end-${requestId}`);
      performance.measure(`api-${requestId}`, `api-start-${requestId}`, `api-end-${requestId}`);
    }

    const metric: PerformanceMetric = {
      id: `api-${requestId}`,
      name: 'API调用',
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      category: PerformanceCategory.API,
      details: {
        url,
        method,
        status,
        size,
        isSlow: duration > this.config.slowApiThreshold
      }
    };

    this.recordMetric(metric);

    // 记录慢接口
    if (duration > this.config.slowApiThreshold) {
      logger.warn(`Slow API call detected: ${method} ${url}`, {
        duration: duration,
        threshold: this.config.slowApiThreshold,
        status,
        size
      }, 'PerformanceMonitor');
    }
  }

  /**
   * 监控组件渲染性能
   */
  public startRender(componentName: string, phase: 'mount' | 'update' | 'unmount'): string {
    if (!this.shouldSample() || !this.config.enableRenderMonitoring) {
      return '';
    }

    const renderId = `${componentName}-${phase}-${Date.now()}`;
    this.renderMetrics.set(renderId, performance.now());

    if (typeof performance.mark === 'function') {
      performance.mark(`render-start-${renderId}`);
    }

    return renderId;
  }

  /**
   * 结束组件渲染性能监控
   */
  public endRender(renderId: string, componentName: string, phase: 'mount' | 'update' | 'unmount'): void {
    if (!renderId || !this.shouldSample() || !this.config.enableRenderMonitoring) {
      return;
    }

    const startTime = this.renderMetrics.get(renderId);
    if (!startTime) return;

    const duration = performance.now() - startTime;
    this.renderMetrics.delete(renderId);

    if (typeof performance.mark === 'function' && typeof performance.measure === 'function') {
      performance.mark(`render-end-${renderId}`);
      performance.measure(`render-${renderId}`, `render-start-${renderId}`, `render-end-${renderId}`);
    }

    const metric: PerformanceMetric = {
      id: renderId,
      name: '组件渲染',
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      category: PerformanceCategory.RENDER,
      details: {
        componentName,
        phase,
        isSlow: duration > this.config.slowRenderThreshold
      }
    };

    this.recordMetric(metric);

    // 记录慢渲染
    if (duration > this.config.slowRenderThreshold) {
      logger.warn(`Slow render detected: ${componentName} (${phase})`, {
        duration: duration,
        threshold: this.config.slowRenderThreshold,
        componentName,
        phase
      }, 'PerformanceMonitor');
    }
  }

  /**
   * 监控页面导航性能
   */
  public recordNavigation(from: string, to: string, type: 'programmatic' | 'user' = 'user'): void {
    if (!this.shouldSample() || !this.config.enableNavigationMonitoring) {
      return;
    }

    // 使用Navigation Timing API
    const navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!navTiming) return;

    const metric: PerformanceMetric = {
      id: `navigation-${Date.now()}`,
      name: '页面导航',
      value: navTiming.loadEventEnd - navTiming.fetchStart,
      unit: 'ms',
      timestamp: new Date(),
      category: PerformanceCategory.NAVIGATION,
      details: {
        from,
        to,
        type,
        domContentLoaded: navTiming.domContentLoadedEventEnd - navTiming.fetchStart,
        firstPaint: this.getFirstPaint(),
        firstContentfulPaint: this.getFirstContentfulPaint(),
        largestContentfulPaint: this.getLargestContentfulPaint()
      }
    };

    this.recordMetric(metric);
  }

  /**
   * 监控页面性能指标
   */
  private monitorPagePerformance(): void {
    // 监听性能条目
    if ('PerformanceObserver' in window) {
      try {
        // 监控导航性能
        const navObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              const navEntry = entry as PerformanceNavigationTiming;
              this.recordPageLoadMetrics(navEntry);
            }
          });
        });
        navObserver.observe({ entryTypes: ['navigation'] });

        // 监控Core Web Vitals
        const vitalsObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            this.recordWebVital(entry);
          });
        });
        
        if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) {
          vitalsObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        }
        
        if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes.includes('first-input')) {
          vitalsObserver.observe({ entryTypes: ['first-input'] });
        }

      } catch (error) {
        logger.error('Failed to setup performance observers', { error }, 'PerformanceMonitor');
      }
    }
  }

  /**
   * 监控资源加载性能
   */
  private monitorResourcePerformance(): void {
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            if (entry.entryType === 'resource') {
              this.recordResourceMetric(entry as PerformanceResourceTiming);
            }
          });
        });
        resourceObserver.observe({ entryTypes: ['resource'] });
      } catch (error) {
        logger.error('Failed to setup resource performance observer', { error }, 'PerformanceMonitor');
      }
    }
  }

  /**
   * 监控用户交互性能
   */
  private monitorInteractionPerformance(): void {
    if ('PerformanceObserver' in window) {
      try {
        const interactionObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            this.recordInteractionMetric(entry);
          });
        });
        
        if (PerformanceObserver.supportedEntryTypes.includes('event')) {
          interactionObserver.observe({ entryTypes: ['event'] });
        }
        
        if (PerformanceObserver.supportedEntryTypes.includes('first-input')) {
          interactionObserver.observe({ entryTypes: ['first-input'] });
        }
      } catch (error) {
        logger.error('Failed to setup interaction performance observer', { error }, 'PerformanceMonitor');
      }
    }
  }

  /**
   * 开始内存监控
   */
  private startMemoryMonitoring(): void {
    if (typeof window === 'undefined' || !('performance' in window)) {
      return;
    }

    this.memoryMonitorInterval = setInterval(() => {
      this.recordMemoryMetrics();
    }, this.config.memoryMonitoringInterval);
  }

  /**
   * 记录内存指标
   */
  private recordMemoryMetrics(): void {
    if (!this.shouldSample() || typeof window === 'undefined') {
      return;
    }

    // @ts-ignore - 浏览器兼容性
    const memInfo = (performance as any).memory;
    if (!memInfo) return;

    const metric: PerformanceMetric = {
      id: `memory-${Date.now()}`,
      name: '内存使用',
      value: memInfo.usedJSHeapSize,
      unit: 'bytes',
      timestamp: new Date(),
      category: PerformanceCategory.MEMORY,
      details: {
        usedJSHeapSize: memInfo.usedJSHeapSize,
        totalJSHeapSize: memInfo.totalJSHeapSize,
        jsHeapSizeLimit: memInfo.jsHeapSizeLimit,
        usagePercent: (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100
      }
    };

    this.recordMetric(metric);

    // 警告高内存使用
    const usagePercent = (memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit) * 100;
    if (usagePercent > 80) {
      logger.warn('High memory usage detected', {
        usagePercent: usagePercent,
        usedJSHeapSize: memInfo.usedJSHeapSize,
        jsHeapSizeLimit: memInfo.jsHeapSizeLimit
      }, 'PerformanceMonitor');
    }
  }

  /**
   * 记录页面加载指标
   */
  private recordPageLoadMetrics(navEntry: PerformanceNavigationTiming): void {
    const metrics = [
      {
        name: 'DNS解析时间',
        value: navEntry.domainLookupEnd - navEntry.domainLookupStart,
        details: { phase: 'dns' }
      },
      {
        name: 'TCP连接时间',
        value: navEntry.connectEnd - navEntry.connectStart,
        details: { phase: 'tcp' }
      },
      {
        name: '请求响应时间',
        value: navEntry.responseEnd - navEntry.requestStart,
        details: { phase: 'request' }
      },
      {
        name: 'DOM解析时间',
        value: navEntry.domContentLoadedEventEnd - navEntry.domContentLoadedEventStart,
        details: { phase: 'dom' }
      },
      {
        name: '资源加载时间',
        value: navEntry.loadEventEnd - navEntry.domContentLoadedEventEnd,
        details: { phase: 'resources' }
      }
    ];

    metrics.forEach((metric, index) => {
      if (metric.value > 0) {
        this.recordMetric({
          id: `page-load-${index}-${Date.now()}`,
          name: metric.name,
          value: metric.value,
          unit: 'ms',
          timestamp: new Date(),
          category: PerformanceCategory.NAVIGATION,
          details: metric.details
        });
      }
    });
  }

  /**
   * 记录Web Vitals指标
   */
  private recordWebVital(entry: PerformanceEntry): void {
    let name = '';
    let value = 0;
    let details = {};

    switch (entry.entryType) {
      case 'largest-contentful-paint':
        name = 'Largest Contentful Paint';
        value = entry.startTime;
        break;
      case 'first-input':
        name = 'First Input Delay';
        value = (entry as any).processingStart - entry.startTime;
        details = { inputDelay: value };
        break;
      default:
        return;
    }

    this.recordMetric({
      id: `web-vital-${entry.entryType}-${Date.now()}`,
      name: name,
      value: value,
      unit: 'ms',
      timestamp: new Date(),
      category: PerformanceCategory.NAVIGATION,
      details: details
    });
  }

  /**
   * 记录资源加载指标
   */
  private recordResourceMetric(resourceEntry: PerformanceResourceTiming): void {
    // 只监控重要资源
    const importantResources = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2'];
    const isImportant = importantResources.some(ext => resourceEntry.name.includes(ext));
    
    if (!isImportant) return;

    const duration = resourceEntry.responseEnd - resourceEntry.startTime;
    
    this.recordMetric({
      id: `resource-${Date.now()}`,
      name: '资源加载',
      value: duration,
      unit: 'ms',
      timestamp: new Date(),
      category: PerformanceCategory.RESOURCE_LOADING,
      details: {
        url: resourceEntry.name,
        size: resourceEntry.transferSize,
        type: this.getResourceType(resourceEntry.name),
        cached: resourceEntry.transferSize === 0
      }
    });
  }

  /**
   * 记录交互指标
   */
  private recordInteractionMetric(entry: PerformanceEntry): void {
    if (entry.entryType === 'first-input') {
      const fid = (entry as any).processingStart - entry.startTime;
      
      this.recordMetric({
        id: `interaction-fid-${Date.now()}`,
        name: 'First Input Delay',
        value: fid,
        unit: 'ms',
        timestamp: new Date(),
        category: PerformanceCategory.USER_INTERACTION,
        details: {
          inputType: (entry as any).name,
          startTime: entry.startTime
        }
      });
    }
  }

  /**
   * 获取First Paint时间
   */
  private getFirstPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const fp = paintEntries.find(entry => entry.name === 'first-paint');
    return fp ? fp.startTime : 0;
  }

  /**
   * 获取First Contentful Paint时间
   */
  private getFirstContentfulPaint(): number {
    const paintEntries = performance.getEntriesByType('paint');
    const fcp = paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return fcp ? fcp.startTime : 0;
  }

  /**
   * 获取Largest Contentful Paint时间
   */
  private getLargestContentfulPaint(): number {
    const lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    return lcpEntries.length > 0 ? lcpEntries[lcpEntries.length - 1].startTime : 0;
  }

  /**
   * 获取资源类型
   */
  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.match(/\.(woff|woff2|ttf|otf)$/)) return 'font';
    return 'other';
  }

  /**
   * 记录性能指标
   */
  private recordMetric(metric: PerformanceMetric): void {
    // 添加到内存缓存
    this.metrics.push(metric);
    
    // 保持内存中的指标数量在限制内
    if (this.metrics.length > this.config.maxMetricsInMemory) {
      this.metrics = this.metrics.slice(-this.config.maxMetricsInMemory);
    }

    // 记录到日志系统
    logger.info(`Performance: ${metric.name}`, {
      metric: metric.name,
      value: metric.value,
      unit: metric.unit,
      category: metric.category,
      details: metric.details
    }, 'PerformanceMonitor');
  }

  /**
   * 判断是否应该采样
   */
  private shouldSample(): boolean {
    return Math.random() < this.config.sampleRate;
  }

  /**
   * 获取性能统计
   */
  public getStats(): {
    totalMetrics: number;
    metricsByCategory: Record<PerformanceCategory, number>;
    avgApiResponseTime: number;
    avgRenderTime: number;
    memoryUsage: MemoryPerformanceMetric | null;
  } {
    const metricsByCategory = {} as Record<PerformanceCategory, number>;
    Object.values(PerformanceCategory).forEach(category => {
      metricsByCategory[category] = 0;
    });

    let totalApiTime = 0;
    let apiCount = 0;
    let totalRenderTime = 0;
    let renderCount = 0;
    let latestMemory: MemoryPerformanceMetric | null = null;

    this.metrics.forEach(metric => {
      metricsByCategory[metric.category]++;
      
      if (metric.category === PerformanceCategory.API) {
        totalApiTime += metric.value;
        apiCount++;
      } else if (metric.category === PerformanceCategory.RENDER) {
        totalRenderTime += metric.value;
        renderCount++;
      } else if (metric.category === PerformanceCategory.MEMORY) {
        latestMemory = metric.details as MemoryPerformanceMetric;
      }
    });

    return {
      totalMetrics: this.metrics.length,
      metricsByCategory: metricsByCategory,
      avgApiResponseTime: apiCount > 0 ? totalApiTime / apiCount : 0,
      avgRenderTime: renderCount > 0 ? totalRenderTime / renderCount : 0,
      memoryUsage: latestMemory
    };
  }

  /**
   * 获取所有性能指标
   */
  public getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  /**
   * 清理性能指标
   */
  public clearMetrics(): void {
    this.metrics = [];
    logger.info('Performance metrics cleared', {}, 'PerformanceMonitor');
  }

  /**
   * 更新配置
   */
  public updateConfig(config: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
    logger.info('Performance monitor config updated', { config: this.config }, 'PerformanceMonitor');
  }

  /**
   * 销毁性能监控器
   */
  public destroy(): void {
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
      this.memoryMonitorInterval = null;
    }
    
    this.clearMetrics();
    this.apiMetrics.clear();
    this.renderMetrics.clear();
    
    logger.info('Performance monitor destroyed', {}, 'PerformanceMonitor');
  }
}

// 创建默认实例
export const performanceMonitor = new PerformanceMonitor({
  // 生产环境降低采样率
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  memoryMonitoringInterval: 60000, // 1分钟
});
export default PerformanceMonitor;