/**
 * 库存登记报表服务
 */

import { serviceManager } from '../core';

export interface InventoryEntryItem {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  category: string;
  warehouse: string;
  date: string;
  quantity: number;
  amount: number;
  type: 'in' | 'out';
  remark?: string;
}

export interface TimeRange {
  startDate: string;
  endDate: string;
}

export interface WeekRange {
  week: number;
  startDate: string;
  endDate: string;
  label: string;
}

/**
 * 库存登记报表服务
 */
class InventoryEntryRegistrationService {
  
  /**
   * 获取月度周范围
   */
  getMonthlyWeekRanges(monthFirstDay: string): WeekRange[] {
    const firstDay = new Date(monthFirstDay);
    const year = firstDay.getFullYear();
    const month = firstDay.getMonth();
    
    const weeks: WeekRange[] = [];
    let currentWeek = 1;
    let currentDate = new Date(year, month, 1);
    
    while (currentDate.getMonth() === month) {
      const weekStart = new Date(currentDate);
      const weekEnd = new Date(currentDate);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      // 如果结束日期超过月末，调整到月末
      if (weekEnd.getMonth() !== month) {
        weekEnd.setDate(new Date(year, month + 1, 0).getDate());
        weekEnd.setMonth(month);
      }
      
      weeks.push({
        week: currentWeek,
        startDate: weekStart.toISOString().split('T')[0],
        endDate: weekEnd.toISOString().split('T')[0],
        label: `第${currentWeek}周`
      });
      
      currentWeek++;
      currentDate.setDate(currentDate.getDate() + 7);
    }
    
    return weeks;
  }
  
  /**
   * 获取库存登记数据
   */
  async getInventoryEntryData(timeRange: TimeRange): Promise<InventoryEntryItem[]> {
    try {
      // 模拟数据 - 实际应该从数据库获取
      const mockData: InventoryEntryItem[] = [
        {
          id: '1',
          productId: 'p1',
          productName: '测试商品1',
          sku: 'TEST001',
          category: '测试分类',
          warehouse: '默认仓库',
          date: timeRange.startDate,
          quantity: 100,
          amount: 1000,
          type: 'in',
          remark: '期初入库'
        },
        {
          id: '2',
          productId: 'p2',
          productName: '测试商品2',
          sku: 'TEST002',
          category: '测试分类',
          warehouse: '默认仓库',
          date: timeRange.startDate,
          quantity: 50,
          amount: 500,
          type: 'out',
          remark: '销售出库'
        }
      ];
      
      return mockData;
    } catch (error) {
      console.error('获取库存登记数据失败:', error);
      return [];
    }
  }
  
  /**
   * 导出为CSV
   */
  exportToCSV(data: InventoryEntryItem[], dates: string[]): string {
    const headers = ['商品名称', 'SKU', '分类', '仓库', '日期', '数量', '金额', '类型', '备注'];
    const csvContent = [
      headers.join(','),
      ...data.map(item => [
        item.productName,
        item.sku,
        item.category,
        item.warehouse,
        item.date,
        item.quantity,
        item.amount,
        item.type === 'in' ? '入库' : '出库',
        item.remark || ''
      ].join(','))
    ].join('\n');
    
    return csvContent;
  }
}

// 导出服务实例
export const inventoryEntryRegistrationService = new InventoryEntryRegistrationService();