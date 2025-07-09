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
    const cacheKey = this.getCacheKey(weekStart, options);
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!;
    }

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const days: DailyBusinessSummary[] = [];
    const weeklyTotals = { purchases: 0, sales: 0, netChange: 0 };

    // 生成7天的数据
    for (let i = 0; i < 7; i++) {
      const currentDate = new Date(weekStart);
      currentDate.setDate(currentDate.getDate() + i);
      
      const dailyData = await this.getDailyData(currentDate, options);
      days.push(dailyData);

      // 累计周汇总
      weeklyTotals.purchases += dailyData.purchases.totalValue;
      weeklyTotals.sales += dailyData.sales.totalValue;
      weeklyTotals.netChange += (dailyData.movements.inbound - dailyData.movements.outbound);
    }

    const weeklyData: WeeklyCalendarData = {
      weekStart,
      weekEnd,
      days,
      weeklyTotals
    };

    this.cache.set(cacheKey, weeklyData);
    return weeklyData;
  }

  /**
   * 获取指定日期的业务数据汇总
   * @param date 日期
   * @param options 筛选选项
   * @returns 日业务汇总
   */
  async getDailyData(date: Date, options?: CalendarViewOptions): Promise<DailyBusinessSummary> {
    const dateStr = date.toISOString().split('T')[0];
    
    // 模拟数据生成（实际应该从真实数据源聚合）
    const dailyData = this.generateMockDailyData(date);
    
    return dailyData;
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
    
    for (let i = 0; i < weekCount; i++) {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      
      const weekData = await this.getWeeklyData(weekStart, options);
      weeks.push(weekData);
    }
    
    return weeks;
  }

  // =============== 辅助方法 ===============

  private getCacheKey(weekStart: Date, options?: CalendarViewOptions): string {
    const dateStr = weekStart.toISOString().split('T')[0];
    const optionsStr = options ? JSON.stringify(options) : '';
    return `${dateStr}-${optionsStr}`;
  }

  private generateMockDailyData(date: Date): DailyBusinessSummary {
    const dayOfWeek = date.getDay(); // 0=周日, 1=周一, ..., 6=周六
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    const isWorkday = !isWeekend;

    // 基础活动系数（工作日更活跃）
    const activityFactor = isWorkday ? 1.0 : 0.3;
    
    // 随机因子（增加真实感）
    const randomFactor = 0.5 + Math.random();
    
    const finalFactor = activityFactor * randomFactor;

    // 生成采购数据
    const purchases = {
      totalAmount: Math.floor(finalFactor * (50 + Math.random() * 200)),
      totalValue: Math.floor(finalFactor * (5000 + Math.random() * 20000)),
      orderCount: Math.floor(finalFactor * (1 + Math.random() * 5)),
      topProducts: this.generateTopProducts('purchase', finalFactor)
    };

    // 生成销售数据
    const sales = {
      totalAmount: Math.floor(finalFactor * (30 + Math.random() * 150)),
      totalValue: Math.floor(finalFactor * (3000 + Math.random() * 15000)),
      orderCount: Math.floor(finalFactor * (2 + Math.random() * 8)),
      topProducts: this.generateTopProducts('sales', finalFactor)
    };

    // 生成库存数据
    const inventory = {
      totalValue: 150000 + Math.floor(Math.random() * 50000),
      lowStockCount: Math.floor(Math.random() * 3),
      outOfStockCount: Math.floor(Math.random() * 2),
      newProductCount: isWorkday ? Math.floor(Math.random() * 2) : 0
    };

    // 生成库存变动数据
    const movements = {
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
    const products = [
      { id: 'product-001', name: 'iPhone 15 Pro', basePrice: 8999 },
      { id: 'product-002', name: '小米13 Ultra', basePrice: 5999 },
      { id: 'product-003', name: '薯片', basePrice: 15 },
      { id: 'product-004', name: '运动鞋', basePrice: 299 }
    ];

    const count = Math.min(3, Math.floor(factor * 2) + 1);
    const selected = products.slice(0, count);

    return selected.map(product => {
      const quantity = Math.floor(factor * (1 + Math.random() * 10));
      const value = quantity * product.basePrice;
      
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
    const result = new Date(date);
    const day = result.getDay();
    const diff = result.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一开始
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
    const weekStart = this.getWeekStart(date);
    const weekEnd = new Date(weekStart);
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
    const today = new Date();
    const fourWeeksAgo = new Date(today);
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

    for (let i = 0; i < 4; i++) {
      const weekStart = CalendarDataService.getWeekStart(fourWeeksAgo);
      weekStart.setDate(weekStart.getDate() + (i * 7));
      
      // 异步预加载数据
      this.getWeeklyData(weekStart).catch(console.error);
    }
  }
}

export const calendarDataService = new CalendarDataService();
