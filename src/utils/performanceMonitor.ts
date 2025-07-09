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

    const _startTime = this.apiMetrics.get(requestId);
    if (!_startTime) return;

    const _duration = performance.now() - _startTime;
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
        isSlow: _duration > this.config.slowApiThreshold
      }
    };

    this.recordMetric(metric);

    // 记录慢接口
    if (_duration > this.config.slowApiThreshold) {
      logger.warn(`Slow API call detected: ${method} ${url}`, {
        duration: _duration,
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

    const _renderId = `${componentName}-${phase}-${Date.now()}`;
    this.renderMetrics.set(_renderId, performance.now());

    if (typeof performance.mark === 'function') {
      performance.mark(`render-start-${_renderId}`);
    }

    return _renderId;
  }

  /**
   * 结束组件渲染性能监控
   */
  public endRender(renderId: string, componentName: string, phase: 'mount' | 'update' | 'unmount'): void {
    if (!renderId || !this.shouldSample() || !this.config.enableRenderMonitoring) {
      return;
    }

    const _startTime = this.renderMetrics.get(renderId);
    if (!_startTime) return;

    const _duration = performance.now() - _startTime;
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
        isSlow: _duration > this.config.slowRenderThreshold
      }
    };

    this.recordMetric(metric);

    // 记录慢渲染
    if (_duration > this.config.slowRenderThreshold) {
      logger.warn(`Slow render detected: ${componentName} (${phase})`, {
        duration: _duration,
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
    const _navTiming = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (!_navTiming) return;

    const metric: PerformanceMetric = {
      id: `navigation-${Date.now()}`,
      name: '页面导航',
      value: _navTiming.loadEventEnd - _navTiming.fetchStart,
      unit: 'ms',
      timestamp: new Date(),
      category: PerformanceCategory.NAVIGATION,
      details: {
        from,
        to,
        type,
        domContentLoaded: _navTiming.domContentLoadedEventEnd - _navTiming.fetchStart,
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
        const _navObserver = new PerformanceObserver((list) => {
          const _entries = list.getEntries();
          _entries.forEach((entry) => {
            if (entry.entryType === 'navigation') {
              const _navEntry = entry as PerformanceNavigationTiming;
              this.recordPageLoadMetrics(_navEntry);
            }
          });
        });
        _navObserver.observe({ entryTypes: ['navigation'] });

        // 监控Core Web Vitals
        const _vitalsObserver = new PerformanceObserver((list) => {
          const _entries = list.getEntries();
          _entries.forEach((entry) => {
            this.recordWebVital(entry);
          });
        });
        
        if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes.includes('largest-contentful-paint')) {
          _vitalsObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        }
        
        if ('PerformanceObserver' in window && PerformanceObserver.supportedEntryTypes.includes('first-input')) {
          _vitalsObserver.observe({ entryTypes: ['first-input'] });
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
        const _resourceObserver = new PerformanceObserver((list) => {
          const _entries = list.getEntries();
          _entries.forEach((entry) => {
            if (entry.entryType === 'resource') {
              this.recordResourceMetric(entry as PerformanceResourceTiming);
            }
          });
        });
        _resourceObserver.observe({ entryTypes: ['resource'] });
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
        const _interactionObserver = new PerformanceObserver((list) => {
          const _entries = list.getEntries();
          _entries.forEach((entry) => {
            this.recordInteractionMetric(entry);
          });
        });
        
        if (PerformanceObserver.supportedEntryTypes.includes('event')) {
          _interactionObserver.observe({ entryTypes: ['event'] });
        }
        
        if (PerformanceObserver.supportedEntryTypes.includes('first-input')) {
          _interactionObserver.observe({ entryTypes: ['first-input'] });
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
    const _memInfo = (performance as any).memory;
    if (!_memInfo) return;

    const metric: PerformanceMetric = {
      id: `memory-${Date.now()}`,
      name: '内存使用',
      value: _memInfo.usedJSHeapSize,
      unit: 'bytes',
      timestamp: new Date(),
      category: PerformanceCategory.MEMORY,
      details: {
        usedJSHeapSize: _memInfo.usedJSHeapSize,
        totalJSHeapSize: _memInfo.totalJSHeapSize,
        jsHeapSizeLimit: _memInfo.jsHeapSizeLimit,
        usagePercent: (_memInfo.usedJSHeapSize / _memInfo.jsHeapSizeLimit) * 100
      }
    };

    this.recordMetric(metric);

    // 警告高内存使用
    const _usagePercent = (_memInfo.usedJSHeapSize / _memInfo.jsHeapSizeLimit) * 100;
    if (_usagePercent > 80) {
      logger.warn('High memory usage detected', {
        usagePercent: _usagePercent,
        usedJSHeapSize: _memInfo.usedJSHeapSize,
        jsHeapSizeLimit: _memInfo.jsHeapSizeLimit
      }, 'PerformanceMonitor');
    }
  }

  /**
   * 记录页面加载指标
   */
  private recordPageLoadMetrics(navEntry: PerformanceNavigationTiming): void {
    const _metrics = [
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

    _metrics.forEach((metric, index) => {
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
    let _name = '';
    let _value = 0;
    let _details = {};

    switch (entry.entryType) {
      case 'largest-contentful-paint':
        _name = 'Largest Contentful Paint';
        _value = entry.startTime;
        break;
      case 'first-input':
        _name = 'First Input Delay';
        _value = (entry as any).processingStart - entry.startTime;
        _details = { inputDelay: _value };
        break;
      default:
        return;
    }

    this.recordMetric({
      id: `web-vital-${entry.entryType}-${Date.now()}`,
      name: _name,
      value: _value,
      unit: 'ms',
      timestamp: new Date(),
      category: PerformanceCategory.NAVIGATION,
      details: _details
    });
  }

  /**
   * 记录资源加载指标
   */
  private recordResourceMetric(resourceEntry: PerformanceResourceTiming): void {
    // 只监控重要资源
    const _importantResources = ['.js', '.css', '.png', '.jpg', '.jpeg', '.svg', '.woff', '.woff2'];
    const _isImportant = _importantResources.some(ext => resourceEntry.name.includes(ext));
    
    if (!_isImportant) return;

    const _duration = resourceEntry.responseEnd - resourceEntry.startTime;
    
    this.recordMetric({
      id: `resource-${Date.now()}`,
      name: '资源加载',
      value: _duration,
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
      const _fid = (entry as any).processingStart - entry.startTime;
      
      this.recordMetric({
        id: `interaction-fid-${Date.now()}`,
        name: 'First Input Delay',
        value: _fid,
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
    const _paintEntries = performance.getEntriesByType('paint');
    const _fp = _paintEntries.find(entry => entry.name === 'first-paint');
    return _fp ? _fp.startTime : 0;
  }

  /**
   * 获取First Contentful Paint时间
   */
  private getFirstContentfulPaint(): number {
    const _paintEntries = performance.getEntriesByType('paint');
    const _fcp = _paintEntries.find(entry => entry.name === 'first-contentful-paint');
    return _fcp ? _fcp.startTime : 0;
  }

  /**
   * 获取Largest Contentful Paint时间
   */
  private getLargestContentfulPaint(): number {
    const _lcpEntries = performance.getEntriesByType('largest-contentful-paint');
    return _lcpEntries.length > 0 ? _lcpEntries[_lcpEntries.length - 1].startTime : 0;
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
    const _metricsByCategory = {} as Record<PerformanceCategory, number>;
    Object.values(PerformanceCategory).forEach(category => {
      _metricsByCategory[category] = 0;
    });

    let _totalApiTime = 0;
    let _apiCount = 0;
    let _totalRenderTime = 0;
    let _renderCount = 0;
    let _latestMemory: MemoryPerformanceMetric | null = null;

    this.metrics.forEach(metric => {
      _metricsByCategory[metric.category]++;
      
      if (metric.category === PerformanceCategory.API) {
        _totalApiTime += metric.value;
        _apiCount++;
      } else if (metric.category === PerformanceCategory.RENDER) {
        _totalRenderTime += metric.value;
        _renderCount++;
      } else if (metric.category === PerformanceCategory.MEMORY) {
        _latestMemory = metric.details as MemoryPerformanceMetric;
      }
    });

    return {
      totalMetrics: this.metrics.length,
      metricsByCategory: _metricsByCategory,
      avgApiResponseTime: _apiCount > 0 ? _totalApiTime / _apiCount : 0,
      avgRenderTime: _renderCount > 0 ? _totalRenderTime / _renderCount : 0,
      memoryUsage: _latestMemory
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
export const _performanceMonitor = new PerformanceMonitor({
  // 生产环境降低采样率
  sampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  memoryMonitoringInterval: 60000, // 1分钟
});

// Named export without underscore for compatibility
export const performanceMonitor = _performanceMonitor;
export default PerformanceMonitor;