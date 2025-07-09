import React, { useState, useMemo, useEffect } from 'react';
import { Card } from '../ui/card';
import { inventoryEntryRegistrationService, InventoryEntryItem } from '../../services/business/inventoryEntryRegistrationService';
import { 
  Table, 
  TableContainer,
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableEmpty,
  TableLoading
} from '../ui/table';

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

  // 获取当前月份的所有日期 - 基于当前实际月份，不依赖timeRange
  const monthDates = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    return Array.from({ length: daysInMonth }, (_, i) => {
      const day = i + 1;
      // 直接构建日期字符串，避免时区问题
      return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
    });
  }, []); // 移除依赖，只在组件首次加载时计算

  // 生成周快捷选择 - 基于当前月份
  const weekRanges = useMemo(() => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    // 直接构建日期字符串，避免时区问题
    const currentMonthFirstDay = `${year}-${String(month + 1).padStart(2, '0')}-01`;
    return inventoryEntryRegistrationService.getMonthlyWeekRanges(currentMonthFirstDay);
  }, []); // 移除依赖，只基于当前月份

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
        // 按一级分类、二级分类排序
        const sortedData = result.sort((a, b) => {
          // 首先按一级分类排序
          if (a.primaryCategory !== b.primaryCategory) {
            return a.primaryCategory.localeCompare(b.primaryCategory, 'zh-CN');
          }
          // 然后按二级分类排序
          if (a.secondaryCategory !== b.secondaryCategory) {
            return a.secondaryCategory.localeCompare(b.secondaryCategory, 'zh-CN');
          }
          // 最后按物品名称排序
          return a.name.localeCompare(b.name, 'zh-CN');
        });
        setData(sortedData);
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
                  ? 'btn-active-selection'
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
                    ? 'btn-active-selection'
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
                    ? 'btn-active-selection'
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
        <div className="relative">
          {/* 表格容器 - 支持横向和纵向滚动 */}
          <TableContainer height="600px">
            <Table stickyHeader minWidth="1400px">
              {/* 固定表头 */}
              <TableHeader sticky>
                {/* 第一层表头 - 日期 */}
                <TableRow>
                  <TableHead
                    fixed
                    fixedPosition="left"
                    fixedOffset={0}
                    className="min-w-[60px] text-left border-r table-first-column-enhanced"
                    rowSpan={2}
                  >
                    序号
                  </TableHead>
                  <TableHead
                    fixed
                    fixedPosition="left"
                    fixedOffset="60px"
                    className="min-w-[120px] text-left border-r table-first-column-enhanced"
                    rowSpan={2}
                  >
                    一级分类
                  </TableHead>
                  <TableHead
                    fixed
                    fixedPosition="left"
                    fixedOffset="180px"
                    className="min-w-[120px] text-left border-r table-first-column-enhanced"
                    rowSpan={2}
                  >
                    二级分类
                  </TableHead>
                  <TableHead
                    fixed
                    fixedPosition="left"
                    fixedOffset="300px"
                    className="min-w-[150px] text-left border-r table-first-column-enhanced"
                    rowSpan={2}
                  >
                    物品名称
                  </TableHead>
                  <TableHead
                    fixed
                    fixedPosition="left"
                    fixedOffset="450px"
                    className="min-w-[100px] text-center border-r table-first-column-enhanced"
                    rowSpan={2}
                  >
                    总出库
                  </TableHead>
                  {filteredDates.map(date => (
                    <TableHead key={date} colSpan={5} className="text-center border-r min-w-[300px] table-header-enhanced">
                      {new Date(date).getDate()}日
                    </TableHead>
                  ))}
                </TableRow>

                {/* 第二层表头 - 入库/时段/库存 */}
                <TableRow>
                  {filteredDates.map(date => (
                    <React.Fragment key={date}>
                      <TableHead className="text-center border-r min-w-[60px] table-header-enhanced">
                        入库
                      </TableHead>
                      <TableHead className="text-center border-r min-w-[60px] table-header-enhanced">
                        早
                      </TableHead>
                      <TableHead className="text-center border-r min-w-[60px] table-header-enhanced">
                        中
                      </TableHead>
                      <TableHead className="text-center border-r min-w-[60px] table-header-enhanced">
                        晚
                      </TableHead>
                      <TableHead className="text-center border-r min-w-[60px] table-header-enhanced">
                        库存
                      </TableHead>
                    </React.Fragment>
                  ))}
                </TableRow>
              </TableHeader>

              {/* 数据行 */}
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5 + filteredDates.length * 5} className="text-center py-8">
                      <div className="flex items-center justify-center gap-3">
                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        <span className="text-white/60">加载中...</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5 + filteredDates.length * 5} className="text-center py-12">
                      <div className="text-6xl mb-4">📊</div>
                      <div className="text-white/60">暂无数据</div>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell 
                      fixed 
                      fixedPosition="left" 
                      fixedOffset={0}
                      className="min-w-[60px] text-center border-r"
                    >
                      {index + 1}
                    </TableCell>
                    <TableCell 
                      fixed 
                      fixedPosition="left" 
                      fixedOffset="60px"
                      className="min-w-[120px] text-left border-r"
                    >
                      {item.primaryCategory}
                    </TableCell>
                    <TableCell 
                      fixed 
                      fixedPosition="left" 
                      fixedOffset="180px"
                      className="min-w-[120px] text-left border-r"
                    >
                      {item.secondaryCategory}
                    </TableCell>
                    <TableCell 
                      fixed 
                      fixedPosition="left" 
                      fixedOffset="300px"
                      className="min-w-[150px] text-left border-r"
                    >
                      {item.name}
                    </TableCell>
                    <TableCell 
                      fixed 
                      fixedPosition="left" 
                      fixedOffset="450px"
                      className="min-w-[100px] text-center border-r"
                    >
                      <span className="financial-value-accent">
                        {item.totalOut}
                      </span>
                    </TableCell>
                    {filteredDates.map(date => {
                      const dayData = item.dailyData[date];
                      return (
                        <React.Fragment key={date}>
                          <TableCell className="text-center border-r min-w-[60px]">
                            <span className="financial-value-positive font-medium">
                              {dayData?.stockIn || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[60px]">
                            <span className="financial-value-warning">
                              {dayData?.morning || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[60px]">
                            <span className="financial-value-warning">
                              {dayData?.noon || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[60px]">
                            <span className="financial-value-warning">
                              {dayData?.evening || 0}
                            </span>
                          </TableCell>
                          <TableCell className="text-center border-r min-w-[60px]">
                            <span className="financial-value-neutral font-medium">
                              {dayData?.stock || 0}
                            </span>
                          </TableCell>
                        </React.Fragment>
                      );
                    })}
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
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