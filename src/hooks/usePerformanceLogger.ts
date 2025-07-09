/**
 * React组件性能监控Hook
 * 监控组件的渲染性能、重渲染次数、生命周期时间等
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { _performanceMonitor as performanceMonitor } from '../utils/performanceMonitor';

export interface ComponentPerformanceStats {
  mountCount: number;
  updateCount: number;
  unmountCount: number;
  totalRenderTime: number;
  averageRenderTime: number;
  slowRenderCount: number;
  lastRenderTime: number;
}

export interface UsePerformanceLoggerOptions {
  componentName?: string;
  enableInProduction?: boolean;
  slowRenderThreshold?: number;
  trackRerenders?: boolean;
  trackProps?: boolean;
}

/**
 * React组件性能监控Hook
 */
export function usePerformanceLogger(
  componentName: string,
  options: UsePerformanceLoggerOptions = {}
) {
  const {
    enableInProduction = false,
    slowRenderThreshold = 16,
    trackRerenders = true,
    trackProps = false
  } = options;

  const _renderIdRef = useRef<string>('');
  const _mountTimeRef = useRef<number>(0);
  const _renderCountRef = useRef<number>(0);
  const _propsRef = useRef<any>(null);
  const _statsRef = useRef<ComponentPerformanceStats>({
    mountCount: 0,
    updateCount: 0,
    unmountCount: 0,
    totalRenderTime: 0,
    averageRenderTime: 0,
    slowRenderCount: 0,
    lastRenderTime: 0
  });

  // 检查是否应该启用监控
  const _isEnabled = process.env.NODE_ENV === 'development' || enableInProduction;

  /**
   * 开始渲染监控
   */
  const _startRender = useCallback((phase: 'mount' | 'update') => {
    if (!isEnabled) return;

    renderIdRef.current = performanceMonitor.startRender(componentName, phase);
    mountTimeRef.current = performance.now();
  }, [componentName, isEnabled]);

  /**
   * 结束渲染监控
   */
  const _endRender = useCallback((phase: 'mount' | 'update') => {
    if (!isEnabled || !renderIdRef.current) return;

    const _renderTime = performance.now() - mountTimeRef.current;
    performanceMonitor.endRender(renderIdRef.current, componentName, phase);

    // 更新统计信息
    const _stats = statsRef.current;
    stats.totalRenderTime += renderTime;
    stats.lastRenderTime = renderTime;
    
    if (phase === 'mount') {
      stats.mountCount++;
    } else {
      stats.updateCount++;
    }

    renderCountRef.current++;
    stats.averageRenderTime = stats.totalRenderTime / renderCountRef.current;

    if (renderTime > slowRenderThreshold) {
      stats.slowRenderCount++;
    }

    renderIdRef.current = '';
  }, [componentName, isEnabled, slowRenderThreshold]);

  /**
   * 检查Props变化
   */
  const _checkPropsChange = useCallback((newProps: any) => {
    if (!isEnabled || !trackProps || !propsRef.current) {
      propsRef.current = newProps;
      return;
    }

    const _oldProps = propsRef.current;
    const changedProps: string[] = [];

    // 检查哪些props发生了变化
    Object.keys(newProps).forEach(key => {
      if (oldProps[key] !== newProps[key]) {
        changedProps.push(key);
      }
    });

    Object.keys(oldProps).forEach(key => {
      if (!(key in newProps)) {
        changedProps.push(key);
      }
    });

    if (changedProps.length > 0) {
      // 记录到日志系统而不是直接调用recordMetric（因为它是私有方法）
      console.log('Props changed:', {
        componentName,
        changedProps,
        renderCount: renderCountRef.current
      });
    }

    propsRef.current = newProps;
  }, [componentName, isEnabled, trackProps]);

  // 组件挂载时的性能监控
  useEffect(() => {
    if (!isEnabled) return;

    startRender('mount');
    
    return () => {
      endRender('mount');
    };
  }, []);

  // 组件更新时的性能监控
  useEffect(() => {
    if (!isEnabled || renderCountRef.current === 0) return;

    startRender('update');
    endRender('update');
  });

  // 组件卸载时的性能监控
  useEffect(() => {
    return () => {
      if (!isEnabled) return;
      
      const _unmountRenderId = performanceMonitor.startRender(componentName, 'unmount');
      performanceMonitor.endRender(unmountRenderId, componentName, 'unmount');
      
      statsRef.current.unmountCount++;
    };
  }, []);

  return {
    stats: statsRef.current,
    checkPropsChange,
    startCustomRender: startRender,
    endCustomRender: endRender
  };
}

/**
 * 高阶组件性能监控器
 */
export function withPerformanceLogger<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string,
  options: UsePerformanceLoggerOptions = {}
): React.ComponentType<P> {
  const _displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  const _MemoizedComponent = React.memo<P>((props: P) => {
    const { checkPropsChange } = usePerformanceLogger(displayName, options);
    
    // 检查props变化
    useEffect(() => {
      checkPropsChange(props);
    }, [props, checkPropsChange]);

    return React.createElement(WrappedComponent, props);
  });

  MemoizedComponent.displayName = `withPerformanceLogger(${displayName})`;
  
  return MemoizedComponent;
}

/**
 * React Profiler性能监控Hook
 */
export function useProfiler(componentName: string, phase?: string) {
  const _onRenderCallback = useCallback((
    id: string,
    phase: 'mount' | 'update',
    actualDuration: number,
    baseDuration: number,
    startTime: number,
    commitTime: number,
    interactions: Set<any>
  ) => {
    console.log('React Profiler measurement:', {
      componentName: id,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      interactionCount: interactions.size
    });
  }, []);

  return onRenderCallback;
}

/**
 * 异步操作性能监控Hook
 */
export function useAsyncPerformance(operationName: string) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const _startTimeRef = useRef<number>(0);

  const _executeAsync = useCallback(async <T>(
    asyncOperation: () => Promise<T>
  ): Promise<T> => {
    setIsLoading(true);
    setError(null);
    startTimeRef.current = performance.now();

    try {
      const _result = await asyncOperation();
      const _duration = performance.now() - startTimeRef.current;

      console.log('Async operation completed:', {
        operationName,
        duration,
        success: true
      });

      return result;
    } catch (err) {
      const _duration = performance.now() - startTimeRef.current;
      const _error = err as Error;

      console.log('Async operation failed:', {
        operationName,
        duration,
        success: false,
        error: error.message
      });

      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [operationName]);

  return {
    executeAsync,
    isLoading,
    error
  };
}

/**
 * 内存泄漏检测Hook
 */
export function useMemoryLeakDetection(componentName: string) {
  const _mountTimeRef = useRef<number>(Date.now());
  const _intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // 每30秒检查一次内存使用
    intervalRef.current = setInterval(() => {
      // @ts-ignore
      const _memInfo = (performance as any).memory;
      if (!memInfo) return;

      const _age = Date.now() - mountTimeRef.current;
      
      console.log('Component memory check:', {
        componentName,
        componentAge: age,
        usedJSHeapSize: memInfo.usedJSHeapSize,
        totalJSHeapSize: memInfo.totalJSHeapSize
      });
    }, 30000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [componentName]);

  return {
    componentAge: Date.now() - mountTimeRef.current
  };
}

/**
 * 用户交互性能监控Hook
 */
export function useInteractionPerformance() {
  const _measureInteraction = useCallback((
    interactionType: string,
    callback: () => void | Promise<void>
  ) => {
    const _startTime = performance.now();
    
    const _handleComplete = () => {
      const _duration = performance.now() - startTime;
      
      console.log('User interaction measurement:', {
        interactionType,
        duration,
        isSlowInteraction: duration > 100 // 100ms threshold
      });
    };

    try {
      const _result = callback();
      
      if (result instanceof Promise) {
        return result.finally(handleComplete);
      } else {
        handleComplete();
        return result;
      }
    } catch (error) {
      handleComplete();
      throw error;
    }
  }, []);

  return { measureInteraction };
}

export default usePerformanceLogger;