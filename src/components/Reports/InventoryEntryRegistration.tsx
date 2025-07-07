import React, { useState, useMemo } from 'react';
import { Card } from '../ui/card';

interface TimeRange {
  startDate: string;
  endDate: string;
}

interface DisplayMode {
  type: 'amount' | 'quantity' | 'converted';
  label: string;
}

interface InventoryItem {
  id: string;
  primaryCategory: string;
  secondaryCategory: string;
  name: string;
  totalOut: number;
  dailyData: {
    [date: string]: {
      stockIn: number;
      morning: number;
      noon: number;
      evening: number;
      stock: number;
    };
  };
}

const displayModes: DisplayMode[] = [
  { type: 'amount', label: '金额' },
  { type: 'quantity', label: '数量' },
  { type: 'converted', label: '换算数量' }
];

export const InventoryEntryRegistration: React.FC = () => {
  const [timeRange, setTimeRange] = useState<TimeRange>({
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const [displayMode, setDisplayMode] = useState<DisplayMode['type']>('quantity');
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);

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
    const weeks = [];
    const currentDate = new Date(timeRange.startDate);
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const firstDay = new Date(year, month, 1);
    
    for (let week = 1; week <= 5; week++) {
      const startDay = (week - 1) * 7 + 1;
      const endDay = Math.min(week * 7, new Date(year, month + 1, 0).getDate());
      
      if (startDay <= new Date(year, month + 1, 0).getDate()) {
        weeks.push({
          week,
          startDate: new Date(year, month, startDay).toISOString().split('T')[0],
          endDate: new Date(year, month, endDay).toISOString().split('T')[0],
          label: `第${week}周`
        });
      }
    }
    
    return weeks;
  }, [timeRange.startDate]);

  // 模拟数据
  const mockData: InventoryItem[] = [
    {
      id: '1',
      primaryCategory: '食品',
      secondaryCategory: '蔬菜',
      name: '白菜',
      totalOut: 120,
      dailyData: Object.fromEntries(
        monthDates.map(date => [
          date,
          {
            stockIn: Math.floor(Math.random() * 20),
            morning: Math.floor(Math.random() * 10),
            noon: Math.floor(Math.random() * 15),
            evening: Math.floor(Math.random() * 8),
            stock: Math.floor(Math.random() * 50)
          }
        ])
      )
    },
    {
      id: '2',
      primaryCategory: '食品',
      secondaryCategory: '水果',
      name: '苹果',
      totalOut: 85,
      dailyData: Object.fromEntries(
        monthDates.map(date => [
          date,
          {
            stockIn: Math.floor(Math.random() * 25),
            morning: Math.floor(Math.random() * 12),
            noon: Math.floor(Math.random() * 18),
            evening: Math.floor(Math.random() * 10),
            stock: Math.floor(Math.random() * 60)
          }
        ])
      )
    },
    {
      id: '3',
      primaryCategory: '用品',
      secondaryCategory: '清洁用品',
      name: '洗涤剂',
      totalOut: 30,
      dailyData: Object.fromEntries(
        monthDates.map(date => [
          date,
          {
            stockIn: Math.floor(Math.random() * 5),
            morning: Math.floor(Math.random() * 3),
            noon: Math.floor(Math.random() * 5),
            evening: Math.floor(Math.random() * 2),
            stock: Math.floor(Math.random() * 20)
          }
        ])
      )
    }
  ];

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

  const filteredDates = monthDates.filter(date => {
    return date >= timeRange.startDate && date <= timeRange.endDate;
  });

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
        <div className="overflow-x-auto">
          <table className="w-full">
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
              {mockData.map((item, index) => (
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
                          <span className="financial-value-negative">
                            {dayData?.morning || 0}
                          </span>
                        </td>
                        <td className="px-1 py-3 text-xs text-white/80 text-center border-r border-white/10">
                          <span className="financial-value-negative">
                            {dayData?.noon || 0}
                          </span>
                        </td>
                        <td className="px-1 py-3 text-xs text-white/80 text-center border-r border-white/10">
                          <span className="financial-value-negative">
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
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* 操作按钮区域 */}
      <div className="flex justify-between items-center">
        <div className="text-sm text-white/60">
          显示 {mockData.length} 条记录，时间范围：{timeRange.startDate} 至 {timeRange.endDate}
        </div>
        <div className="flex gap-3">
          <button className="glass-button px-4 py-2 text-sm">
            导出数据
          </button>
          <button className="glass-button px-4 py-2 text-sm bg-blue-500/20 border-blue-400/30 hover:bg-blue-500/30">
            打印报表
          </button>
        </div>
      </div>
    </div>
  );
};

export default InventoryEntryRegistration;