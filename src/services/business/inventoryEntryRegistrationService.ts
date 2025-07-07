// 出入库登记数据服务

export interface InventoryEntryItem {
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

export interface InventoryEntryFilter {
  startDate: string;
  endDate: string;
  displayMode: 'amount' | 'quantity' | 'converted';
  categoryFilter?: string;
  warehouseFilter?: string;
}

export class InventoryEntryRegistrationService {
  private static instance: InventoryEntryRegistrationService;

  private constructor() {}

  public static getInstance(): InventoryEntryRegistrationService {
    if (!InventoryEntryRegistrationService.instance) {
      InventoryEntryRegistrationService.instance = new InventoryEntryRegistrationService();
    }
    return InventoryEntryRegistrationService.instance;
  }

  /**
   * 获取出入库登记数据
   * @param filter 筛选条件
   * @returns 出入库登记数据列表
   */
  public async getInventoryEntryData(filter: InventoryEntryFilter): Promise<InventoryEntryItem[]> {
    try {
      // 生成指定时间范围内的日期列表
      const dateRange = this.generateDateRange(filter.startDate, filter.endDate);
      
      // 模拟数据 - 在实际应用中，这里应该从数据库或API获取数据
      const mockData = this.generateMockData(dateRange, filter);
      
      return mockData;
    } catch (error) {
      console.error('获取出入库登记数据失败:', error);
      throw new Error('获取出入库登记数据失败');
    }
  }

  /**
   * 生成日期范围
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 日期字符串数组
   */
  private generateDateRange(startDate: string, endDate: string): string[] {
    const dates: string[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    const current = new Date(start);
    while (current <= end) {
      dates.push(current.toISOString().split('T')[0]);
      current.setDate(current.getDate() + 1);
    }
    
    return dates;
  }

  /**
   * 生成模拟数据
   * @param dateRange 日期范围
   * @param filter 筛选条件
   * @returns 模拟的出入库登记数据
   */
  private generateMockData(dateRange: string[], filter: InventoryEntryFilter): InventoryEntryItem[] {
    const categories = [
      { primary: '食品', secondary: ['蔬菜', '水果', '肉类', '调料'] },
      { primary: '用品', secondary: ['清洁用品', '办公用品', '日用品'] },
      { primary: '原料', secondary: ['调料', '包装材料', '添加剂'] },
      { primary: '设备', secondary: ['厨具', '餐具', '电器'] }
    ];

    const products = [
      { primary: '食品', secondary: '蔬菜', names: ['白菜', '萝卜', '土豆', '洋葱', '胡萝卜'] },
      { primary: '食品', secondary: '水果', names: ['苹果', '香蕉', '橙子', '葡萄', '梨'] },
      { primary: '食品', secondary: '肉类', names: ['猪肉', '牛肉', '鸡肉', '鱼肉'] },
      { primary: '用品', secondary: '清洁用品', names: ['洗涤剂', '消毒液', '抹布', '垃圾袋'] },
      { primary: '用品', secondary: '办公用品', names: ['纸张', '笔', '订书机', '文件夹'] },
      { primary: '原料', secondary: '调料', names: ['盐', '糖', '醋', '生抽', '老抽'] },
      { primary: '设备', secondary: '厨具', names: ['刀具', '锅具', '砧板', '勺子'] }
    ];

    const mockItems: InventoryEntryItem[] = [];

    // 生成15-20个产品的数据
    const numProducts = 15 + Math.floor(Math.random() * 6);
    
    for (let i = 0; i < numProducts; i++) {
      const productCategory = products[Math.floor(Math.random() * products.length)];
      const productName = productCategory.names[Math.floor(Math.random() * productCategory.names.length)];
      
      // 生成每日数据
      const dailyData: { [date: string]: any } = {};
      let totalOut = 0;
      
      dateRange.forEach(date => {
        const stockIn = Math.floor(Math.random() * 30) + 5; // 5-35
        const morning = Math.floor(Math.random() * 15) + 2; // 2-17
        const noon = Math.floor(Math.random() * 20) + 5; // 5-25
        const evening = Math.floor(Math.random() * 12) + 3; // 3-15
        const dailyOut = morning + noon + evening;
        const stock = Math.floor(Math.random() * 80) + 20; // 20-100
        
        totalOut += dailyOut;
        
        // 根据显示模式调整数值
        const multiplier = this.getDisplayModeMultiplier(filter.displayMode);
        
        dailyData[date] = {
          stockIn: Math.round(stockIn * multiplier),
          morning: Math.round(morning * multiplier),
          noon: Math.round(noon * multiplier),
          evening: Math.round(evening * multiplier),
          stock: Math.round(stock * multiplier)
        };
      });
      
      mockItems.push({
        id: `item-${i + 1}`,
        primaryCategory: productCategory.primary,
        secondaryCategory: productCategory.secondary,
        name: productName,
        totalOut: Math.round(totalOut * this.getDisplayModeMultiplier(filter.displayMode)),
        dailyData
      });
    }

    return mockItems;
  }

  /**
   * 获取显示模式的倍数
   * @param displayMode 显示模式
   * @returns 倍数
   */
  private getDisplayModeMultiplier(displayMode: 'amount' | 'quantity' | 'converted'): number {
    switch (displayMode) {
      case 'amount':
        return 12.5; // 假设平均单价为12.5元
      case 'quantity':
        return 1; // 数量本身
      case 'converted':
        return 0.8; // 换算数量（如公斤转斤等）
      default:
        return 1;
    }
  }

  /**
   * 获取月度周范围
   * @param date 日期
   * @returns 周范围数组
   */
  public getMonthlyWeekRanges(date: string): Array<{ week: number; startDate: string; endDate: string; label: string }> {
    const [year, month] = date.split('-').map(Number);
    const daysInMonth = new Date(year, month, 0).getDate();
    
    const weeks = [];
    
    for (let week = 1; week <= 5; week++) {
      const startDay = (week - 1) * 7 + 1;
      const endDay = Math.min(week * 7, daysInMonth);
      
      if (startDay <= daysInMonth) {
        weeks.push({
          week,
          startDate: `${year}-${String(month).padStart(2, '0')}-${String(startDay).padStart(2, '0')}`,
          endDate: `${year}-${String(month).padStart(2, '0')}-${String(endDay).padStart(2, '0')}`,
          label: `第${week}周`
        });
      }
    }
    
    return weeks;
  }

  /**
   * 导出数据为CSV格式
   * @param data 出入库登记数据
   * @param dateRange 日期范围
   * @returns CSV字符串
   */
  public exportToCSV(data: InventoryEntryItem[], dateRange: string[]): string {
    const headers = ['序号', '一级分类', '二级分类', '物品名称', '总出库'];
    
    // 添加日期相关的列头
    dateRange.forEach(date => {
      const day = new Date(date).getDate();
      headers.push(`${day}日-入库`, `${day}日-早`, `${day}日-中`, `${day}日-晚`, `${day}日-库存`);
    });

    const csvRows = [headers.join(',')];

    data.forEach((item, index) => {
      const row = [
        index + 1,
        item.primaryCategory,
        item.secondaryCategory,
        item.name,
        item.totalOut
      ];

      // 添加每日数据
      dateRange.forEach(date => {
        const dayData = item.dailyData[date];
        row.push(
          dayData?.stockIn || 0,
          dayData?.morning || 0,
          dayData?.noon || 0,
          dayData?.evening || 0,
          dayData?.stock || 0
        );
      });

      csvRows.push(row.join(','));
    });

    return csvRows.join('\n');
  }

  /**
   * 获取统计汇总信息
   * @param data 出入库登记数据
   * @returns 统计汇总
   */
  public getStatisticsSummary(data: InventoryEntryItem[]) {
    const totalItems = data.length;
    const totalOut = data.reduce((sum, item) => sum + item.totalOut, 0);
    const totalStock = data.reduce((sum, item) => {
      const latestStock = Object.values(item.dailyData).reduce((latest, current) => 
        latest + current.stock, 0) / Object.keys(item.dailyData).length;
      return sum + latestStock;
    }, 0);

    const categoryStats = data.reduce((stats, item) => {
      if (!stats[item.primaryCategory]) {
        stats[item.primaryCategory] = { count: 0, totalOut: 0 };
      }
      stats[item.primaryCategory].count++;
      stats[item.primaryCategory].totalOut += item.totalOut;
      return stats;
    }, {} as Record<string, { count: number; totalOut: number }>);

    return {
      totalItems,
      totalOut,
      totalStock: Math.round(totalStock),
      categoryStats
    };
  }
}

// 导出单例实例
export const inventoryEntryRegistrationService = InventoryEntryRegistrationService.getInstance();