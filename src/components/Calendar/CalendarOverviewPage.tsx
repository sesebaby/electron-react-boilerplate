import React, { useState, useEffect } from 'react';
import { WeeklyCalendarData, DailyBusinessSummary } from '../../types/entities';
import { calendarDataService, CalendarDataService } from '../../services/business';
import WeeklyCalendarView from './WeeklyCalendarView';
import DayDetailModal from './DayDetailModal';

const CalendarOverviewPage: React.FC = () => {
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    return CalendarDataService.getWeekStart(new Date());
  });
  const [weekData, setWeekData] = useState<WeeklyCalendarData | null>(null);
  const [selectedDay, setSelectedDay] = useState<DailyBusinessSummary | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 加载周数据
  const loadWeekData = async (weekStart: Date) => {
    try {
      setLoading(true);
      setError(null);
      const data = await calendarDataService.getWeeklyData(weekStart);
      setWeekData(data);
    } catch (err) {
      setError('加载日历数据失败');
      console.error('加载日历数据失败:', err);
    } finally {
      setLoading(false);
    }
  };

  // 初始加载
  useEffect(() => {
    loadWeekData(currentWeekStart);
  }, [currentWeekStart]);

  // 导航到上一周
  const goToPreviousWeek = () => {
    const prevWeek = new Date(currentWeekStart);
    prevWeek.setDate(prevWeek.getDate() - 7);
    setCurrentWeekStart(prevWeek);
  };

  // 导航到下一周
  const goToNextWeek = () => {
    const nextWeek = new Date(currentWeekStart);
    nextWeek.setDate(nextWeek.getDate() + 7);
    setCurrentWeekStart(nextWeek);
  };

  // 导航到当前周
  const goToCurrentWeek = () => {
    const currentWeek = CalendarDataService.getWeekStart(new Date());
    setCurrentWeekStart(currentWeek);
  };

  // 处理日期点击
  const handleDayClick = (dayData: DailyBusinessSummary) => {
    setSelectedDay(dayData);
    setIsDetailModalOpen(true);
  };

  // 关闭详情模态框
  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedDay(null);
  };

  // 格式化周范围显示
  const formatWeekRange = (start: Date, end: Date): string => {
    const startStr = start.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    const endStr = end.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric' });
    return `${startStr} - ${endStr}`;
  };

  // 检查是否是当前周
  const isCurrentWeek = (): boolean => {
    const currentWeek = CalendarDataService.getWeekStart(new Date());
    return currentWeekStart.getTime() === currentWeek.getTime();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <div className="text-gray-600">加载日历数据中...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="text-red-600 mb-4">❌ {error}</div>
          <button
            onClick={() => loadWeekData(currentWeekStart)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和导航 */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">日历式整体视图</h1>
          <p className="text-gray-600 mt-1">查看每日采购、销售和库存变化趋势</p>
        </div>

        {/* 周导航 */}
        <div className="flex items-center gap-2">
          <button
            onClick={goToPreviousWeek}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="上一周"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="px-4 py-2 bg-gray-100 rounded-lg text-sm font-medium text-gray-700 min-w-[200px] text-center">
            {weekData && formatWeekRange(weekData.weekStart, weekData.weekEnd)}
          </div>

          <button
            onClick={goToNextWeek}
            className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            title="下一周"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {!isCurrentWeek() && (
            <button
              onClick={goToCurrentWeek}
              className="ml-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
            >
              回到本周
            </button>
          )}
        </div>
      </div>

      {/* 快速统计 */}
      {weekData && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-blue-600 text-sm font-medium">本周采购</div>
                <div className="text-2xl font-bold text-blue-700">
                  ¥{weekData.weeklyTotals.purchases.toLocaleString()}
                </div>
              </div>
              <div className="text-blue-500 text-3xl">📦</div>
            </div>
          </div>

          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-green-600 text-sm font-medium">本周销售</div>
                <div className="text-2xl font-bold text-green-700">
                  ¥{weekData.weeklyTotals.sales.toLocaleString()}
                </div>
              </div>
              <div className="text-green-500 text-3xl">💰</div>
            </div>
          </div>

          <div className={`p-4 rounded-lg border ${
            weekData.weeklyTotals.netChange > 0 
              ? 'bg-green-50 border-green-200' 
              : weekData.weeklyTotals.netChange < 0 
                ? 'bg-red-50 border-red-200' 
                : 'bg-gray-50 border-gray-200'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className={`text-sm font-medium ${
                  weekData.weeklyTotals.netChange > 0 
                    ? 'text-green-600' 
                    : weekData.weeklyTotals.netChange < 0 
                      ? 'text-red-600' 
                      : 'text-gray-600'
                }`}>
                  本周净变化
                </div>
                <div className={`text-2xl font-bold ${
                  weekData.weeklyTotals.netChange > 0 
                    ? 'text-green-700' 
                    : weekData.weeklyTotals.netChange < 0 
                      ? 'text-red-700' 
                      : 'text-gray-700'
                }`}>
                  {weekData.weeklyTotals.netChange > 0 ? '+' : ''}{weekData.weeklyTotals.netChange}
                </div>
              </div>
              <div className={`text-3xl ${
                weekData.weeklyTotals.netChange > 0 
                  ? 'text-green-500' 
                  : weekData.weeklyTotals.netChange < 0 
                    ? 'text-red-500' 
                    : 'text-gray-500'
              }`}>
                {weekData.weeklyTotals.netChange > 0 ? '📈' : weekData.weeklyTotals.netChange < 0 ? '📉' : '📊'}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 周日历视图 */}
      {weekData && (
        <WeeklyCalendarView
          weekData={weekData}
          selectedDate={selectedDay?.date}
          onDayClick={handleDayClick}
        />
      )}

      {/* 日详情模态框 */}
      <DayDetailModal
        isOpen={isDetailModalOpen}
        onClose={closeDetailModal}
        data={selectedDay}
      />

      {/* 使用说明 */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-blue-800 font-medium mb-2">💡 使用说明</h3>
        <ul className="text-blue-700 text-sm space-y-1">
          <li>• 点击任意日期查看当日详细业务数据</li>
          <li>• 右上角的彩色圆点表示当日活动强度（绿色=高，黄色=中，灰色=低）</li>
          <li>• 使用左右箭头导航不同周份，点击"回到本周"快速返回当前周</li>
          <li>• 周汇总显示本周的采购、销售总额和库存净变化</li>
        </ul>
      </div>
    </div>
  );
};

export default CalendarOverviewPage;
