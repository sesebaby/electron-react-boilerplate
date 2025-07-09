import { DailyBusinessSummary, WeeklyCalendarData, CalendarViewOptions } from '../../types/entities';
import { 
  purchaseOrderService, 
  salesOrderService, 
  inventoryStockService,
  productService 
} from './index';

export class CalendarDataService {
  private cache = new Map<string, WeeklyCalendarData>();

  constructor() {
    this.initializeTestData();
  }

  // =============== 主要API方法 ===============

  /**
   * 获取指定周的日历数据
   * @param weekStart 周开始日期
   * @param options 筛选选项
   * @returns 周日历数据
   */
  async getWeeklyData(weekStart: Date, options?: CalendarViewOptions): Promise<WeeklyCalendarData> {
    const _cacheKey = this.getCacheKey(weekStart, options);
    
    if (this.cache.has(_cacheKey)) {
      return this.cache.get(_cacheKey)!;
    }

    const _weekEnd = new Date(weekStart);
    _weekEnd.setDate(_weekEnd.getDate() + 6);

    const days: DailyBusinessSummary[] = [];
    const _weeklyTotals = { purchases: 0, sales: 0, netChange: 0 };

    // 生成7天的数据
    for (let _i = 0; _i < 7; _i++) {
      const _currentDate = new Date(weekStart);
      _currentDate.setDate(_currentDate.getDate() + _i);
      
      const _dailyData = await this.getDailyData(_currentDate, options);
      days.push(_dailyData);

      // 累计周汇总
      _weeklyTotals.purchases += _dailyData.purchases.totalValue;
      _weeklyTotals.sales += _dailyData.sales.totalValue;
      _weeklyTotals.netChange += (_dailyData.movements.inbound - _dailyData.movements.outbound);
    }

    const weeklyData: WeeklyCalendarData = {
      weekStart,
      weekEnd: _weekEnd,
      days,
      weeklyTotals: _weeklyTotals
    };

    this.cache.set(_cacheKey, weeklyData);
    return weeklyData;
  }

  /**
   * 获取指定日期的业务数据汇总
   * @param date 日期
   * @param options 筛选选项
   * @returns 日业务汇总
   */
  async getDailyData(date: Date, options?: CalendarViewOptions): Promise<DailyBusinessSummary> {
    const _dateStr = date.toISOString().split('T')[0];
    
    // 模拟数据生成（实际应该从真实数据源聚合）
    const _dailyData = this.generateMockDailyData(date);
    
    return _dailyData;
  }

  /**
   * 获取多周数据（用于月视图或趋势分析）
   * @param startDate 开始日期
   * @param weekCount 周数
   * @param options 筛选选项
   * @returns 多周数据数组
   */
  async getMultiWeekData(
    startDate: Date, 
    weekCount: number, 
    options?: CalendarViewOptions
  ): Promise<WeeklyCalendarData[]> {
    const weeks: WeeklyCalendarData[] = [];
    
    for (let _i = 0; i < weekCount; i++) {
      const _weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      
      const _weekData = await this.getWeeklyData(weekStart, options);
      weeks.push(weekData);
    }
    
    return weeks;
  }

  // =============== 辅助方法 ===============

  private getCacheKey(weekStart: Date, options?: CalendarViewOptions): string {
    const _dateStr = weekStart.toISOString().split('T')[0];
    const _optionsStr = options ? JSON.stringify(options) : '';
    return `${dateStr}-${optionsStr}`;
  }

  private generateMockDailyData(date: Date): DailyBusinessSummary {
    const _dayOfWeek = date.getDay(); // 0=周日, 1=周一, ..., 6=周六
    const _isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const _isWorkday = !isWeekend;

    // 基础活动系数（工作日更活跃）
    const _activityFactor = isWorkday ? 1.0 : 0.3;
    
    // 随机因子（增加真实感）
    const _randomFactor = 0.5 + Math.random();
    
    const _finalFactor = activityFactor * randomFactor;

    // 生成采购数据
    const _purchases = {
      totalAmount: Math.floor(finalFactor * (50 + Math.random() * 200)),
      totalValue: Math.floor(finalFactor * (5000 + Math.random() * 20000)),
      orderCount: Math.floor(finalFactor * (1 + Math.random() * 5)),
      topProducts: this.generateTopProducts('purchase', finalFactor)
    };

    // 生成销售数据
    const _sales = {
      totalAmount: Math.floor(finalFactor * (30 + Math.random() * 150)),
      totalValue: Math.floor(finalFactor * (3000 + Math.random() * 15000)),
      orderCount: Math.floor(finalFactor * (2 + Math.random() * 8)),
      topProducts: this.generateTopProducts('sales', finalFactor)
    };

    // 生成库存数据
    const _inventory = {
      totalValue: 150000 + Math.floor(Math.random() * 50000),
      lowStockCount: Math.floor(Math.random() * 3),
      outOfStockCount: Math.floor(Math.random() * 2),
      newProductCount: isWorkday ? Math.floor(Math.random() * 2) : 0
    };

    // 生成库存变动数据
    const _movements = {
      inbound: purchases.totalAmount,
      outbound: sales.totalAmount,
      adjustments: Math.floor((Math.random() - 0.5) * 20) // 可能为负数
    };

    return {
      date,
      purchases,
      sales,
      inventory,
      movements
    };
  }

  private generateTopProducts(type: 'purchase' | 'sales', factor: number): Array<{
    productId: string;
    productName: string;
    quantity: number;
    value: number;
  }> {
    const _products = [
      { id: 'product-001', name: 'iPhone 15 Pro', basePrice: 8999 },
      { id: 'product-002', name: '小米13 Ultra', basePrice: 5999 },
      { id: 'product-003', name: '薯片', basePrice: 15 },
      { id: 'product-004', name: '运动鞋', basePrice: 299 }
    ];

    const _count = Math.min(3, Math.floor(factor * 2) + 1);
    const _selected = products.slice(0, count);

    return selected.map(product => {
      const _quantity = Math.floor(factor * (1 + Math.random() * 10));
      const _value = quantity * product.basePrice;
      
      return {
        productId: product.id,
        productName: product.name,
        quantity,
        value
      };
    });
  }

  // =============== 工具方法 ===============

  /**
   * 获取周的开始日期（周一）
   * @param date 任意日期
   * @returns 该周的周一日期
   */
  static getWeekStart(date: Date): Date {
    const _result = new Date(date);
    const _day = result.getDay();
    const _diff = result.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一开始
    result.setDate(diff);
    result.setHours(0, 0, 0, 0);
    return result;
  }

  /**
   * 获取周的结束日期（周日）
   * @param date 任意日期
   * @returns 该周的周日日期
   */
  static getWeekEnd(date: Date): Date {
    const _weekStart = this.getWeekStart(date);
    const _weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);
    return weekEnd;
  }

  /**
   * 格式化日期为字符串
   * @param date 日期
   * @returns 格式化的日期字符串
   */
  static formatDate(date: Date): string {
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  }

  /**
   * 清除缓存
   */
  clearCache(): void {
    this.cache.clear();
  }

  // =============== 测试数据初始化 ===============

  private initializeTestData(): void {
    // 预生成最近4周的数据到缓存
    const _today = new Date();
    const _fourWeeksAgo = new Date(_today);
    _fourWeeksAgo.setDate(_fourWeeksAgo.getDate() - 28);

    for (let _i = 0; _i < 4; _i++) {
      const _weekStart = CalendarDataService.getWeekStart(_fourWeeksAgo);
      _weekStart.setDate(_weekStart.getDate() + (_i * 7));
      
      // 异步预加载数据
      this.getWeeklyData(_weekStart).catch(console.error);
    }
  }
}

export const _calendarDataService = new CalendarDataService();
// Named export without underscore for compatibility
export const calendarDataService = _calendarDataService;
