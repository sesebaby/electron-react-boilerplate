/**
 * 逐日消耗视图主组件
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  DailyConsumptionViewProps,
  DailyConsumptionViewConfig,
  ConsumptionTableData,
  DisplayMode,
  TimeSlot
} from '../../types/consumption';
import { DEFAULT_TIME_SLOT_CONFIG } from '../../utils/timeSlotHelper';
import { dailyConsumptionService } from '../../services/business';
import ConsumptionControls from './ConsumptionControls';
import ConsumptionTable from './ConsumptionTable';
import ConsumptionSummary from './ConsumptionSummary';

// 基准日期配置 - 第1天的起始日期
const BASE_DATE = new Date('2024-01-01');

const DailyConsumptionView: React.FC<DailyConsumptionViewProps> = ({
  className = '',
  initialConfig,
  onConfigChange,
  onDataExport
}) => {
  
  // 默认配置
  const getDefaultConfig = (): DailyConsumptionViewConfig => {
    // 默认显示第1周 (第1天到第7天)
    const startDate = new Date(BASE_DATE);
    const endDate = new Date(BASE_DATE);
    endDate.setDate(BASE_DATE.getDate() + 6);
    
    return {
      dateRange: {
        startDate,
        endDate
      },
      displayMode: DisplayMode.QUANTITY,
      timeSlotConfig: DEFAULT_TIME_SLOT_CONFIG,
      showSubCategories: true,
      groupByCategory: true,
      ...initialConfig
    };
  };

  // 状态管理
  const [config, setConfig] = useState<DailyConsumptionViewConfig>(getDefaultConfig());
  const [data, setData] = useState<ConsumptionTableData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * 加载消耗数据
   */
  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      console.log('开始加载消耗数据...', config);
      const result = await dailyConsumptionService.getConsumptionData(config);
      setData(result);
      console.log('消耗数据加载完成', result);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '加载数据失败';
      setError(errorMessage);
      console.error('加载消耗数据失败:', err);
    } finally {
      setLoading(false);
    }
  }, [config]);

  /**
   * 处理配置变更
   */
  const handleConfigChange = useCallback((newConfig: DailyConsumptionViewConfig) => {
    setConfig(newConfig);
    if (onConfigChange) {
      onConfigChange(newConfig);
    }
  }, [onConfigChange]);

  /**
   * 处理刷新
   */
  const handleRefresh = useCallback(() => {
    // 清除缓存并重新加载
    dailyConsumptionService.clearCache();
    loadData();
  }, [loadData]);

  /**
   * 处理导出
   */
  const handleExport = useCallback(() => {
    if (data && onDataExport) {
      onDataExport(data);
    } else {
      // 默认导出逻辑
      console.log('导出消耗数据', data);
      // TODO: 实现默认的导出功能
    }
  }, [data, onDataExport]);

  /**
   * 处理分类展开/折叠
   */
  const handleCategoryToggle = useCallback((categoryId: string) => {
    console.log('切换分类展开状态:', categoryId);
    // 这里可以添加分类展开状态的持久化逻辑
  }, []);

  /**
   * 处理单元格点击
   */
  const handleCellClick = useCallback((id: string, date: string, timeSlot: TimeSlot) => {
    console.log('单元格点击:', { id, date, timeSlot });
    // 这里可以添加单元格点击的详细信息显示逻辑
    // 例如显示该时间段的详细交易记录
  }, []);

  // 初始加载数据
  useEffect(() => {
    loadData();
  }, [loadData]);

  // 错误显示组件
  const renderError = () => (
    <div className="glass-surface backdrop-blur-lg rounded-xl border border-red-400/30 p-8 text-center">
      <div className="text-red-300 mb-4">
        <span className="text-4xl mb-4 block">⚠️</span>
        <h3 className="text-lg font-semibold mb-2">数据加载失败</h3>
        <p className="text-sm text-red-200/80">{error}</p>
      </div>
      <button
        onClick={handleRefresh}
        className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-400/30 rounded-lg text-sm text-white/90 transition-colors duration-200"
      >
        重试
      </button>
    </div>
  );

  // 空数据显示组件
  const renderEmptyState = () => (
    <div className="glass-surface backdrop-blur-lg rounded-xl border border-white/20 p-8 text-center">
      <div className="text-white/70">
        <span className="text-4xl mb-4 block">📊</span>
        <h3 className="text-lg font-semibold mb-2 text-white/90">暂无消耗数据</h3>
        <p className="text-sm mb-4">在选定的日期范围内没有找到出库记录</p>
        <div className="space-y-2 text-sm text-white/60">
          <p>• 请检查日期范围设置</p>
          <p>• 确认该时间段内有出库操作</p>
          <p>• 检查分类和产品筛选条件</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 页面标题 */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <span className="text-3xl">📈</span>
          <div>
            <h1 className="text-2xl font-bold text-white/95 drop-shadow-lg">逐日消耗视图</h1>
            <p className="text-sm text-white/70">
              按时间段统计和分析产品消耗数据
            </p>
          </div>
        </div>
      </div>

      {/* 控制面板 */}
      <ConsumptionControls
        config={config}
        onChange={handleConfigChange}
        onRefresh={handleRefresh}
        onExport={handleExport}
        loading={loading}
      />

      {/* 错误状态 */}
      {error && renderError()}

      {/* 数据内容 */}
      {!error && (
        <>
          {/* 汇总信息 */}
          {data && !loading && (
            <ConsumptionSummary
              totals={data.totals}
              displayMode={config.displayMode}
              dateRange={config.dateRange}
            />
          )}

          {/* 数据表格 */}
          {loading && (
            <div className="glass-surface backdrop-blur-lg rounded-xl border border-white/20 p-8">
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white/70"></div>
                <span className="ml-3 text-white/80 drop-shadow-md">加载消耗数据中...</span>
              </div>
            </div>
          )}

          {!loading && data && data.categories.length > 0 && (
            <ConsumptionTable
              data={data}
              loading={loading}
              onCategoryToggle={handleCategoryToggle}
              onCellClick={handleCellClick}
            />
          )}

          {!loading && data && data.categories.length === 0 && renderEmptyState()}
        </>
      )}

      {/* 页脚信息 */}
      <div className="text-center text-sm text-white/60">
        <p>💡 提示：点击表格单元格可查看详细交易记录，点击分类名称可展开/折叠子项</p>
      </div>
    </div>
  );
};

export default DailyConsumptionView;
