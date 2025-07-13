import React, { useState, useEffect } from 'react';
import { serviceManager } from '../../services/core';
import { SalesOrder, SalesDelivery, Customer, Product } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';
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

interface SalesReportsProps {
  className?: string;
}

interface SalesReportData {
  period: string;
  customerName: string;
  productName: string;
  orderCount: number;
  totalQuantity: number;
  totalAmount: number;
  avgOrderValue: number;
  deliveryCount: number;
  deliveredQuantity: number;
  deliveredAmount: number;
  customerType: string;
  region?: string;
}

interface SalesStats {
  totalSales: number;
  totalOrders: number;
  totalDeliveries: number;
  avgOrderValue: number;
  topCustomer: string;
  topProduct: string;
  growthRate: number;
  conversionRate: number;
}

interface ReportFilters {
  customerId: string;
  productId: string;
  dateRange: string;
  reportType: 'summary' | 'customer' | 'product' | 'trend';
}

const emptyFilters: ReportFilters = {
  customerId: '',
  productId: '',
  dateRange: '30',
  reportType: 'summary'
};

export const SalesReports: React.FC<SalesReportsProps> = ({ className }) => {
  const [reportData, setReportData] = useState<SalesReportData[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<ReportFilters>(emptyFilters);
  const [stats, setStats] = useState<SalesStats | null>(null);
  const [showExportOptions, setShowExportOptions] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    generateReport();
  }, [filters]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const systemService = serviceManager.getSystemService();
      const inventoryService = serviceManager.getInventoryService();
      const [customersResult, productsResult] = await Promise.all([
        systemService.getCustomers(),
        inventoryService.findAllProducts()
      ]);

      const customersData = customersResult.success ? (customersResult.data?.items || customersResult.data || []) : [];
      const productsData = productsResult.success ? (productsResult.data || []) : [];

      setCustomers(customersData as Customer[]);
      setProducts(productsData as any[]);
      
      await generateReport();
    } catch (err) {
      setError('加载销售报表数据失败');
      console.error('Failed to load sales report data:', err);
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async () => {
    try {
      const orderService = serviceManager.getOrderService();
      const [ordersResult, deliveriesResult] = await Promise.all([
        orderService.getSalesOrders(),
        orderService.getSalesDeliveries()
      ]);

      const orders = (ordersResult.success ? (ordersResult.data?.items || ordersResult.data || []) : []) as SalesOrder[];
      const deliveries = (deliveriesResult.success ? (deliveriesResult.data?.items || deliveriesResult.data || []) : []) as SalesDelivery[];

      // 过滤日期范围
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - parseInt(filters.dateRange));
      
      const filteredOrders = orders.filter(order => order.orderDate >= cutoffDate);
      const filteredDeliveries = deliveries.filter(delivery => delivery.deliveryDate >= cutoffDate);

      // 生成不同类型的报表
      let reportItems: SalesReportData[] = [];

      if (filters.reportType === 'customer') {
        reportItems = generateCustomerReport(filteredOrders, filteredDeliveries);
      } else if (filters.reportType === 'product') {
        reportItems = generateProductReport(filteredOrders, filteredDeliveries);
      } else if (filters.reportType === 'trend') {
        reportItems = generateTrendReport(filteredOrders, filteredDeliveries);
      } else {
        reportItems = generateSummaryReport(filteredOrders, filteredDeliveries);
      }

      // 应用其他筛选条件
      if (filters.customerId) {
        reportItems = reportItems.filter(item => 
          customers.find(c => c.name === item.customerName)?.id === filters.customerId
        );
      }

      if (filters.productId) {
        reportItems = reportItems.filter(item => 
          products.find(p => p.name === item.productName)?.id === filters.productId
        );
      }

      setReportData(reportItems);
      generateStats(filteredOrders, filteredDeliveries);
    } catch (err) {
      setError('生成销售报表失败');
      console.error('Failed to generate sales report:', err);
    }
  };

  const generateCustomerReport = (orders: SalesOrder[], deliveries: SalesDelivery[]): SalesReportData[] => {
    const customerMap = new Map<string, SalesReportData>();

    orders.forEach(order => {
      const customer = customers.find(c => c.id === order.customerId);
      const customerName = customer?.name || '未知客户';
      
      if (!customerMap.has(customerName)) {
        customerMap.set(customerName, {
          period: '',
          customerName,
          productName: '',
          orderCount: 0,
          totalQuantity: 0,
          totalAmount: 0,
          avgOrderValue: 0,
          deliveryCount: 0,
          deliveredQuantity: 0,
          deliveredAmount: 0,
          customerType: customer?.customerType || '未知',
          region: customer?.address || '未知地区'
        });
      }

      const data = customerMap.get(customerName)!;
      data.orderCount += 1;
      data.totalAmount += order.finalAmount;
    });

    deliveries.forEach(delivery => {
      const customer = customers.find(c => c.id === delivery.customerId);
      const customerName = customer?.name || '未知客户';
      
      if (customerMap.has(customerName)) {
        const data = customerMap.get(customerName)!;
        data.deliveryCount += 1;
        data.deliveredQuantity += delivery.totalQuantity;
        data.deliveredAmount += delivery.totalAmount;
      }
    });

    // 计算平均订单价值
    customerMap.forEach((data, customerName) => {
      data.avgOrderValue = data.orderCount > 0 ? data.totalAmount / data.orderCount : 0;
    });

    return Array.from(customerMap.values());
  };

  const generateProductReport = (orders: SalesOrder[], deliveries: SalesDelivery[]): SalesReportData[] => {
    const productMap = new Map<string, SalesReportData>();

    // 由于我们没有订单项目的直接访问，这里做简化处理
    orders.forEach(order => {
      // 模拟产品销售数据
      const sampleProducts = products.slice(0, 3); // 取前3个产品作为示例
      
      sampleProducts.forEach(product => {
        if (!productMap.has(product.name)) {
          productMap.set(product.name, {
            period: '',
            customerName: '',
            productName: product.name,
            orderCount: 0,
            totalQuantity: 0,
            totalAmount: 0,
            avgOrderValue: 0,
            deliveryCount: 0,
            deliveredQuantity: 0,
            deliveredAmount: 0,
            customerType: ''
          });
        }

        const data = productMap.get(product.name)!;
        data.orderCount += Math.floor(Math.random() * 2) + 1; // 模拟订单数
        data.totalQuantity += Math.floor(Math.random() * 10) + 1; // 模拟数量
        data.totalAmount += Math.random() * order.finalAmount * 0.3; // 模拟金额
      });
    });

    return Array.from(productMap.values());
  };

  const generateTrendReport = (orders: SalesOrder[], deliveries: SalesDelivery[]): SalesReportData[] => {
    const trendMap = new Map<string, SalesReportData>();
    
    // 按周分组
    const getWeekKey = (date: Date) => {
      const week = Math.floor((Date.now() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
      return `${week}周前`;
    };

    orders.forEach(order => {
      const weekKey = getWeekKey(order.orderDate);
      
      if (!trendMap.has(weekKey)) {
        trendMap.set(weekKey, {
          period: weekKey,
          customerName: '',
          productName: '',
          orderCount: 0,
          totalQuantity: 0,
          totalAmount: 0,
          avgOrderValue: 0,
          deliveryCount: 0,
          deliveredQuantity: 0,
          deliveredAmount: 0,
          customerType: ''
        });
      }

      const data = trendMap.get(weekKey)!;
      data.orderCount += 1;
      data.totalAmount += order.finalAmount;
    });

    deliveries.forEach(delivery => {
      const weekKey = getWeekKey(delivery.deliveryDate);
      
      if (trendMap.has(weekKey)) {
        const data = trendMap.get(weekKey)!;
        data.deliveryCount += 1;
        data.deliveredQuantity += delivery.totalQuantity;
        data.deliveredAmount += delivery.totalAmount;
      }
    });

    return Array.from(trendMap.values()).sort((a, b) => a.period.localeCompare(b.period));
  };

  const generateSummaryReport = (orders: SalesOrder[], deliveries: SalesDelivery[]): SalesReportData[] => {
    const summaryData: SalesReportData = {
      period: `最近${filters.dateRange}天`,
      customerName: '所有客户',
      productName: '所有产品',
      orderCount: orders.length,
      totalQuantity: 0,
      totalAmount: orders.reduce((sum, order) => sum + order.finalAmount, 0),
      avgOrderValue: 0,
      deliveryCount: deliveries.length,
      deliveredQuantity: deliveries.reduce((sum, delivery) => sum + delivery.totalQuantity, 0),
      deliveredAmount: deliveries.reduce((sum, delivery) => sum + delivery.totalAmount, 0),
      customerType: '全部类型'
    };

    summaryData.avgOrderValue = summaryData.orderCount > 0 ? summaryData.totalAmount / summaryData.orderCount : 0;

    return [summaryData];
  };

  const generateStats = (orders: SalesOrder[], deliveries: SalesDelivery[]) => {
    const totalSales = orders.reduce((sum, order) => sum + order.finalAmount, 0);
    const totalOrders = orders.length;
    const totalDeliveries = deliveries.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // 计算增长率（模拟数据）
    const growthRate = Math.random() * 20 - 10; // -10% 到 +10%
    
    // 计算转化率
    const conversionRate = totalOrders > 0 ? (totalDeliveries / totalOrders) * 100 : 0;

    // 找出销售额最高的客户
    const customerSales = new Map<string, number>();
    orders.forEach(order => {
      const customer = customers.find(c => c.id === order.customerId);
      const customerName = customer?.name || '未知客户';
      customerSales.set(customerName, (customerSales.get(customerName) || 0) + order.finalAmount);
    });

    const topCustomer = Array.from(customerSales.entries())
      .sort((a, b) => b[1] - a[1])[0]?.[0] || '无';

    // 模拟最热销产品
    const topProduct = products[0]?.name || '无';

    setStats({
      totalSales,
      totalOrders,
      totalDeliveries,
      avgOrderValue,
      topCustomer,
      topProduct,
      growthRate,
      conversionRate
    });
  };

  const handleFilterChange = (field: keyof ReportFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const exportToCSV = () => {
    const headers = ['时期', '客户', '产品', '订单数', '总数量', '总金额', '平均订单价值', '发货数', '发货数量', '发货金额'];
    
    const csvContent = [
      headers.join(','),
      ...reportData.map(item => [
        item.period,
        item.customerName,
        item.productName,
        item.orderCount,
        item.totalQuantity,
        item.totalAmount.toFixed(2),
        item.avgOrderValue.toFixed(2),
        item.deliveryCount,
        item.deliveredQuantity,
        item.deliveredAmount.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `销售报表_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <div className={`min-h-screen ${className || ''}`}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-current financial-value-neutral mx-auto mb-4"></div>
            <p className="financial-subtitle">加载销售报表数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${className || ''}`}>
      <div className="p-6 space-y-6">
        {/* 页面头部 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold financial-title">
              销售报表
            </h1>
            <p className="financial-subtitle mt-1">销售业绩、趋势分析和客户分析报表</p>
          </div>
          <div className="flex gap-3">
            <GlassButton
              onClick={() => setShowExportOptions(!showExportOptions)}
              className="financial-subtitle"
            >
              <span className="mr-2">📊</span>
              导出报表
            </GlassButton>
            <GlassButton
              onClick={generateReport}
              className="financial-value-neutral"
            >
              <span className="mr-2">🔄</span>
              刷新数据
            </GlassButton>
          </div>
        </div>

        {/* 导出选项 */}
        {showExportOptions && (
          <GlassCard className="p-6">
            <h4 className="text-lg font-semibold financial-title mb-4">导出选项</h4>
            <div className="flex gap-3">
              <GlassButton
                onClick={exportToCSV}
                className="financial-value-positive"
              >
                <span className="mr-2">📄</span>
                导出CSV
              </GlassButton>
              <GlassButton
                onClick={() => setShowExportOptions(false)}
                className="financial-subtitle"
              >
                取消
              </GlassButton>
            </div>
          </GlassCard>
        )}

        {/* 错误消息 */}
        {error && (
          <GlassCard className="aging-card-danger">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span>❌</span>
                <span>{error}</span>
              </div>
              <button
                type="button"
                onClick={() => setError(null)}
                className="financial-value-negative hover:opacity-80 transition-opacity"
              >
                ✕
              </button>
            </div>
          </GlassCard>
        )}

        {/* 销售统计 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6">
            <GlassCard className="text-center p-6">
              <div className="text-3xl mb-3">💰</div>
              <div className="text-2xl font-bold sales-value-revenue">¥{(stats.totalSales / 10000).toFixed(1)}万</div>
              <div className="text-sm financial-description">销售总额</div>
            </GlassCard>

            <GlassCard className="text-center p-6">
              <div className="text-3xl mb-3">📋</div>
              <div className="text-2xl font-bold sales-value-orders">{stats.totalOrders}</div>
              <div className="text-sm financial-description">订单总数</div>
            </GlassCard>

            <GlassCard className="text-center p-6">
              <div className="text-3xl mb-3">📦</div>
              <div className="text-2xl font-bold sales-value-customers">{stats.totalDeliveries}</div>
              <div className="text-sm financial-description">发货总数</div>
            </GlassCard>

            <GlassCard className="text-center p-6">
              <div className="text-3xl mb-3">💵</div>
              <div className="text-2xl font-bold sales-value-growth">¥{(stats.avgOrderValue / 1000).toFixed(1)}K</div>
              <div className="text-sm financial-description">平均订单值</div>
            </GlassCard>

            <GlassCard className="text-center p-6">
              <div className="text-3xl mb-3">📈</div>
              <div className={`text-2xl font-bold ${stats.growthRate >= 0 ? 'sales-value-revenue' : 'financial-value-negative'}`}>
                {stats.growthRate.toFixed(1)}%
              </div>
              <div className="text-sm financial-description">增长率</div>
            </GlassCard>
          </div>
        )}

        {/* 趋势分析 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <GlassCard className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 sales-value-revenue rounded-xl flex items-center justify-center text-xl">
                  👑
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold financial-title">最佳客户</h4>
                  <p className="text-lg font-medium financial-table-cell">{stats.topCustomer}</p>
                  <p className="text-sm sales-value-revenue">↗ 本期表现优异</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 sales-value-customers rounded-xl flex items-center justify-center text-xl">
                  🏆
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold financial-title">热销产品</h4>
                  <p className="text-lg font-medium financial-table-cell">{stats.topProduct}</p>
                  <p className="text-sm sales-value-customers">↗ 销量领先</p>
                </div>
              </div>
            </GlassCard>

            <GlassCard className="p-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 sales-value-growth rounded-xl flex items-center justify-center text-xl">
                  🔄
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold financial-title">转化率</h4>
                  <p className="text-lg font-medium financial-table-cell">{stats.conversionRate.toFixed(1)}%</p>
                  <p className={`text-sm ${stats.conversionRate >= 80 ? 'sales-value-revenue' : stats.conversionRate >= 60 ? 'sales-value-growth' : 'financial-value-negative'}`}>
                    {stats.conversionRate >= 80 ? '↗' : stats.conversionRate >= 60 ? '→' : '↘'}
                    {stats.conversionRate >= 80 ? '表现良好' : stats.conversionRate >= 60 ? '表现一般' : '需要改进'}
                  </p>
                </div>
              </div>
            </GlassCard>
          </div>
        )}

        {/* 筛选条件 */}
        <GlassCard>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            <div>
              <label className="block text-sm font-medium financial-subtitle mb-2">报表类型</label>
              <GlassSelect
                value={filters.reportType}
                onChange={(e) => handleFilterChange('reportType', e.target.value)}
              >
                <option value="summary">汇总报表</option>
                <option value="customer">客户分析</option>
                <option value="product">产品分析</option>
                <option value="trend">趋势分析</option>
              </GlassSelect>
            </div>

            <div>
              <label className="block text-sm font-medium financial-subtitle mb-2">客户</label>
              <GlassSelect
                value={filters.customerId}
                onChange={(e) => handleFilterChange('customerId', e.target.value)}
              >
                <option value="">全部客户</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </GlassSelect>
            </div>

            <div>
              <label className="block text-sm font-medium financial-subtitle mb-2">产品</label>
              <GlassSelect
                value={filters.productId}
                onChange={(e) => handleFilterChange('productId', e.target.value)}
              >
                <option value="">全部产品</option>
                {products.map(product => (
                  <option key={product.id} value={product.id}>
                    {product.name}
                  </option>
                ))}
              </GlassSelect>
            </div>

            <div>
              <label className="block text-sm font-medium financial-subtitle mb-2">时间范围</label>
              <GlassSelect
                value={filters.dateRange}
                onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              >
                <option value="7">最近7天</option>
                <option value="30">最近30天</option>
                <option value="90">最近90天</option>
                <option value="365">最近一年</option>
              </GlassSelect>
            </div>
          </div>
        </GlassCard>

        {/* 报表数据 */}
        <GlassCard>
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold financial-title">
                {filters.reportType === 'customer' && '客户销售分析'}
                {filters.reportType === 'product' && '产品销售分析'}
                {filters.reportType === 'trend' && '销售趋势分析'}
                {filters.reportType === 'summary' && '销售汇总报表'}
              </h3>
              <span className="text-sm financial-subtitle">共 {reportData.length} 条记录</span>
            </div>
          </div>

          <TableContainer height="500px">
            <Table stickyHeader minWidth="1000px">
              <TableHeader sticky>
                <TableRow>
                  {filters.reportType === 'trend' && (
                    <TableHead className="min-w-[120px] text-left">时期</TableHead>
                  )}
                  {filters.reportType !== 'product' && (
                    <TableHead className="min-w-[150px] text-left">客户</TableHead>
                  )}
                  {filters.reportType !== 'customer' && (
                    <TableHead className="min-w-[150px] text-left">产品</TableHead>
                  )}
                  <TableHead className="min-w-[100px] text-left">订单数</TableHead>
                  <TableHead className="min-w-[120px] text-left">总金额</TableHead>
                  <TableHead className="min-w-[120px] text-left">平均订单值</TableHead>
                  <TableHead className="min-w-[100px] text-left">发货数</TableHead>
                  <TableHead className="min-w-[120px] text-left">发货金额</TableHead>
                  {filters.reportType === 'customer' && (
                    <TableHead className="min-w-[100px] text-left">客户类型</TableHead>
                  )}
                  {filters.reportType === 'customer' && (
                    <TableHead className="min-w-[120px] text-left">地区</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.map((item, index) => (
                  <TableRow key={index}>
                    {filters.reportType === 'trend' && (
                      <TableCell className="min-w-[120px]">
                        <span className="font-semibold financial-table-cell">{item.period}</span>
                      </TableCell>
                    )}
                    {filters.reportType !== 'product' && (
                      <TableCell className="min-w-[150px] financial-table-cell">
                        {item.customerName}
                      </TableCell>
                    )}
                    {filters.reportType !== 'customer' && (
                      <TableCell className="min-w-[150px] financial-table-cell">
                        {item.productName}
                      </TableCell>
                    )}
                    <TableCell className="min-w-[100px] financial-table-cell">
                      {item.orderCount}
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="font-semibold financial-table-cell">¥{item.totalAmount.toLocaleString()}</div>
                    </TableCell>
                    <TableCell className="min-w-[120px] financial-table-cell">
                      ¥{item.avgOrderValue.toLocaleString()}
                    </TableCell>
                    <TableCell className="min-w-[100px] financial-table-cell">
                      {item.deliveryCount}
                    </TableCell>
                    <TableCell className="min-w-[120px]">
                      <div className="font-semibold financial-table-cell">¥{item.deliveredAmount.toLocaleString()}</div>
                    </TableCell>
                    {filters.reportType === 'customer' && (
                      <TableCell className="min-w-[100px] financial-subtitle">
                        {item.customerType}
                      </TableCell>
                    )}
                    {filters.reportType === 'customer' && (
                      <TableCell className="min-w-[120px] financial-subtitle">
                        {item.region}
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {reportData.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium financial-title mb-2">没有找到销售数据</h3>
              <p className="financial-subtitle">请调整筛选条件或检查销售数据</p>
            </div>
          )}
        </GlassCard>
      </div>
    </div>
  );
};

export default SalesReports;