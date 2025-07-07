import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../ui/card';
import { inventoryEntryRegistrationService, InventoryEntryItem } from '../../services/business/inventoryEntryRegistrationService';

interface TimeRange {
  startDate: string;
  endDate: string;
}

interface DisplayMode {
  type: 'amount' | 'quantity' | 'converted';
  label: string;
}

// InventoryItem 接口已从服务中导入为 InventoryEntryItem

const displayModes: DisplayMode[] = [
  { type: 'amount', label: '金额' },
  { type: 'quantity', label: '数量' },
  { type: 'converted', label: '换算数量' }
];

export const InventoryEntryRegistration: React.FC = () => {
  // 获取当前月份的开始和结束日期
  const getCurrentMonthRange = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const startDate = new Date(year, month, 1).toISOString().split('T')[0];
    const endDate = new Date(year, month + 1, 0).toISOString().split('T')[0];
    return { startDate, endDate };
  };

  const [timeRange, setTimeRange] = useState<TimeRange>(getCurrentMonthRange());
  const [displayMode, setDisplayMode] = useState<DisplayMode['type']>('quantity');
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [data, setData] = useState<InventoryEntryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);

  // 获取当前月份的所有日期
  const monthDates = useMemo(() => {
    const currentDate = new Date(timeRange.startDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    return Array.from({ length: daysInMonth }, (_, i) => {
      const date = new Date(year, month, i + 1);
      return date.toISOString().split('T')[0];
    });
  }, [timeRange.startDate]);

  // 生成周快捷选择
  const weekRanges = useMemo(() => {
    return inventoryEntryRegistrationService.getMonthlyWeekRanges(timeRange.startDate);
  }, [timeRange.startDate]);

  // 获取数据
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const result = await inventoryEntryRegistrationService.getInventoryEntryData({
          startDate: timeRange.startDate,
          endDate: timeRange.endDate,
          displayMode
        });
        setData(result);
      } catch (error) {
        console.error('获取出入库登记数据失败:', error);
        // 可以在这里添加错误提示
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [timeRange, displayMode]);

  // 导出数据功能
  const handleExportData = () => {
    try {
      const csvData = inventoryEntryRegistrationService.exportToCSV(data, filteredDates);
      const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `出入库登记_${timeRange.startDate}_${timeRange.endDate}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('导出数据失败:', error);
    }
  };

  const handleWeekSelect = (week: number) => {
    const weekRange = weekRanges.find(w => w.week === week);
    if (weekRange) {
      setTimeRange({
        startDate: weekRange.startDate,
        endDate: weekRange.endDate
      });
      setSelectedWeek(week);
    }
  };

  const handleFullMonthSelect = () => {
    setTimeRange(getCurrentMonthRange());
    setSelectedWeek(null);
  };

  const filteredDates = useMemo(() => {
    // 如果选择了全月（selectedWeek为null），显示整个月的所有日期
    if (selectedWeek === null) {
      return monthDates;
    }
    // 如果选择了具体的周，则根据时间范围过滤
    return monthDates.filter(date => {
      return date >= timeRange.startDate && date <= timeRange.endDate;
    });
  }, [monthDates, timeRange, selectedWeek]);

  return (
    <div className="space-y-6">
      {/* 标题区域 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">出入库登记</h1>
        <div className="text-sm text-white/70">
          数据统计和跟踪管理
        </div>
      </div>

      {/* 控制面板 */}
      <Card className="p-6">
        <div className="space-y-4">
          {/* 时间范围选择 */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-white">时间范围:</label>
              <input
                type="date"
                value={timeRange.startDate}
                onChange={(e) => setTimeRange(prev => ({ ...prev, startDate: e.target.value }))}
                className="glass-input px-3 py-1.5 text-sm"
              />
              <span className="text-white/60">至</span>
              <input
                type="date"
                value={timeRange.endDate}
                onChange={(e) => setTimeRange(prev => ({ ...prev, endDate: e.target.value }))}
                className="glass-input px-3 py-1.5 text-sm"
              />
            </div>
          </div>

          {/* 快捷周选择 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-white mr-2">快捷选择:</span>
            <button
              onClick={handleFullMonthSelect}
              className={`glass-button px-3 py-1.5 text-sm font-medium ${
                selectedWeek === null
                  ? 'bg-blue-500/30 border-blue-400/50'
                  : ''
              }`}
            >
              全月
            </button>
            {weekRanges.map(({ week, label }) => (
              <button
                key={week}
                onClick={() => handleWeekSelect(week)}
                className={`glass-button px-3 py-1.5 text-sm font-medium ${
                  selectedWeek === week
                    ? 'bg-blue-500/30 border-blue-400/50'
                    : ''
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* 显示模式切换 */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-white mr-2">显示模式:</span>
            {displayModes.map(mode => (
              <button
                key={mode.type}
                onClick={() => setDisplayMode(mode.type)}
                className={`glass-button px-3 py-1.5 text-sm font-medium ${
                  displayMode === mode.type
                    ? 'bg-green-500/30 border-green-400/50'
                    : ''
                }`}
              >
                {mode.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {/* 数据表格 */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent">
          <table className="w-full min-w-max">
            {/* 嵌套表头 */}
            <thead>
              {/* 第一层表头 - 日期 */}
              <tr className="bg-white/10 border-b border-white/20">
                <th rowSpan={2} className="px-4 py-3 text-left text-sm font-semibold text-white border-r border-white/20">
                  序号
                </th>
                <th rowSpan={2} className="px-4 py-3 text-left text-sm font-semibold text-white border-r border-white/20">
                  一级分类
                </th>
                <th rowSpan={2} className="px-4 py-3 text-left text-sm font-semibold text-white border-r border-white/20">
                  二级分类
                </th>
                <th rowSpan={2} className="px-4 py-3 text-left text-sm font-semibold text-white border-r border-white/20">
                  物品名称
                </th>
                <th rowSpan={2} className="px-4 py-3 text-center text-sm font-semibold text-white border-r border-white/20">
                  总出库
                </th>
                {filteredDates.map(date => (
                  <th key={date} colSpan={5} className="px-2 py-3 text-center text-xs font-semibold text-white border-r border-white/20">
                    {new Date(date).getDate()}日
                  </th>
                ))}
              </tr>
              
              {/* 第二层表头 - 入库/时段/库存 */}
              <tr className="bg-white/15 border-b border-white/20">
                {filteredDates.map(date => (
                  <React.Fragment key={date}>
                    <th className="px-1 py-2 text-center text-xs font-medium text-white border-r border-white/10 min-w-[60px]">
                      入库
                    </th>
                    <th className="px-1 py-2 text-center text-xs font-medium text-white border-r border-white/10 min-w-[60px]">
                      早
                    </th>
                    <th className="px-1 py-2 text-center text-xs font-medium text-white border-r border-white/10 min-w-[60px]">
                      中
                    </th>
                    <th className="px-1 py-2 text-center text-xs font-medium text-white border-r border-white/10 min-w-[60px]">
                      晚
                    </th>
                    <th className="px-1 py-2 text-center text-xs font-medium text-white border-r border-white/20 min-w-[60px]">
                      库存
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            {/* 数据行 */}
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={5 + filteredDates.length * 5} className="px-4 py-8 text-center text-white/60">
                    加载中...
                  </td>
                </tr>
              ) : data.length === 0 ? (
                <tr>
                  <td colSpan={5 + filteredDates.length * 5} className="px-4 py-8 text-center text-white/60">
                    暂无数据
                  </td>
                </tr>
              ) : (
                data.map((item, index) => (
                <tr key={item.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                  <td className="px-4 py-3 text-sm text-white/90 border-r border-white/10">
                    {index + 1}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/90 border-r border-white/10">
                    {item.primaryCategory}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/90 border-r border-white/10">
                    {item.secondaryCategory}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/90 border-r border-white/10">
                    {item.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-white/90 text-center border-r border-white/10">
                    <span className="financial-value-accent">
                      {item.totalOut}
                    </span>
                  </td>
                  {filteredDates.map(date => {
                    const dayData = item.dailyData[date];
                    return (
                      <React.Fragment key={date}>
                        <td className="px-1 py-3 text-xs text-white/80 text-center border-r border-white/10">
                          <span className="financial-value-positive font-medium">
                            {dayData?.stockIn || 0}
                          </span>
                        </td>
                        <td className="px-1 py-3 text-xs text-white/80 text-center border-r border-white/10">
                          <span className="financial-value-warning">
                            {dayData?.morning || 0}
                          </span>
                        </td>
                        <td className="px-1 py-3 text-xs text-white/80 text-center border-r border-white/10">
                          <span className="financial-value-warning">
                            {dayData?.noon || 0}
                          </span>
                        </td>
                        <td className="px-1 py-3 text-xs text-white/80 text-center border-r border-white/10">
                          <span className="financial-value-warning">
                            {dayData?.evening || 0}
                          </span>
                        </td>
                        <td className="px-1 py-3 text-xs text-white/80 text-center border-r border-white/20">
                          <span className="financial-value-neutral font-medium">
                            {dayData?.stock || 0}
                          </span>
                        </td>
                      </React.Fragment>
                    );
                  })}
                </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 操作按钮区域 */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-white/60">
          显示 {data.length} 条记录，时间范围：{timeRange.startDate} 至 {timeRange.endDate}
        </div>
        <div className="flex gap-3">
          <button 
            className="glass-button px-4 py-2 text-sm"
            onClick={handleExportData}
            disabled={loading || data.length === 0}
          >
            导出数据
          </button>
          <button 
            className="glass-button px-4 py-2 text-sm bg-blue-500/20 border-blue-400/30 hover:bg-blue-500/30"
            onClick={() => window.print()}
          >
            打印报表
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryEntryRegistration;