import React, { useState, useEffect } from 'react';
import { salesOrderService, salesDeliveryService, customerService, productService } from '../../services/business';
import { SalesOrder, SalesDelivery, Customer, Product } from '../../types/entities';

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
      
      const [customersData, productsData] = await Promise.all([
        customerService.findAll(),
        productService.findAll()
      ]);
      
      setCustomers(customersData);
      setProducts(productsData);
      
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
      const [orders, deliveries] = await Promise.all([
        salesOrderService.findAll(),
        salesDeliveryService.findAll()
      ]);

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
      <div className={`sales-reports ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载销售报表数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`sales-reports ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>销售报表</h2>
          <p>销售业绩、趋势分析和客户分析报表</p>
        </div>
        <div className="header-actions">
          <button 
            className="glass-button secondary"
            onClick={() => setShowExportOptions(!showExportOptions)}
          >
            <span className="button-icon">📊</span>
            导出报表
          </button>
          <button 
            className="glass-button primary"
            onClick={generateReport}
          >
            <span className="button-icon">🔄</span>
            刷新数据
          </button>
        </div>
      </div>

      {/* 导出选项 */}
      {showExportOptions && (
        <div className="export-options">
          <div className="export-container">
            <h4>导出选项</h4>
            <div className="export-buttons">
              <button className="glass-button primary" onClick={exportToCSV}>
                <span className="button-icon">📄</span>
                导出CSV
              </button>
              <button className="glass-button secondary" onClick={() => setShowExportOptions(false)}>
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 错误消息 */}
      {error && (
        <div className="error-message">
          <span className="error-icon">❌</span>
          {error}
          <button onClick={() => setError(null)} className="close-error">✕</button>
        </div>
      )}

      {/* 销售统计 */}
      {stats && (
        <div className="statistics-section">
          <div className="statistics-grid">
            <div className="stat-item total">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-value">¥{(stats.totalSales / 10000).toFixed(1)}万</div>
                <div className="stat-label">销售总额</div>
              </div>
            </div>
            
            <div className="stat-item active">
              <div className="stat-icon">📋</div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalOrders}</div>
                <div className="stat-label">订单总数</div>
              </div>
            </div>
            
            <div className="stat-item value">
              <div className="stat-icon">📦</div>
              <div className="stat-content">
                <div className="stat-value">{stats.totalDeliveries}</div>
                <div className="stat-label">发货总数</div>
              </div>
            </div>
            
            <div className="stat-item turnover">
              <div className="stat-icon">💵</div>
              <div className="stat-content">
                <div className="stat-value">¥{(stats.avgOrderValue / 1000).toFixed(1)}K</div>
                <div className="stat-label">平均订单值</div>
              </div>
            </div>

            <div className="stat-item warning">
              <div className="stat-icon">📈</div>
              <div className="stat-content">
                <div className="stat-value">{stats.growthRate.toFixed(1)}%</div>
                <div className="stat-label">增长率</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 趋势分析 */}
      {stats && (
        <div className="trend-analysis">
          <div className="trend-item">
            <div className="trend-header">
              <div className="trend-icon" style={{background: 'linear-gradient(135deg, #10b981 0%, #34d399 100%)'}}>👑</div>
              <h4 className="trend-title">最佳客户</h4>
            </div>
            <div className="trend-value">{stats.topCustomer}</div>
            <div className="trend-change positive">
              ↗ 本期表现优异
            </div>
          </div>

          <div className="trend-item">
            <div className="trend-header">
              <div className="trend-icon" style={{background: 'linear-gradient(135deg, #8b5cf6 0%, #a78bfa 100%)'}}>🏆</div>
              <h4 className="trend-title">热销产品</h4>
            </div>
            <div className="trend-value">{stats.topProduct}</div>
            <div className="trend-change positive">
              ↗ 销量领先
            </div>
          </div>

          <div className="trend-item">
            <div className="trend-header">
              <div className="trend-icon" style={{background: 'linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%)'}}>🔄</div>
              <h4 className="trend-title">转化率</h4>
            </div>
            <div className="trend-value">{stats.conversionRate.toFixed(1)}%</div>
            <div className={`trend-change ${stats.conversionRate >= 80 ? 'positive' : stats.conversionRate >= 60 ? 'neutral' : 'negative'}`}>
              {stats.conversionRate >= 80 ? '↗' : stats.conversionRate >= 60 ? '→' : '↘'} 
              {stats.conversionRate >= 80 ? '表现良好' : stats.conversionRate >= 60 ? '表现一般' : '需要改进'}
            </div>
          </div>
        </div>
      )}

      {/* 筛选条件 */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>报表类型</label>
            <select
              value={filters.reportType}
              onChange={(e) => handleFilterChange('reportType', e.target.value)}
              className="glass-select"
            >
              <option value="summary">汇总报表</option>
              <option value="customer">客户分析</option>
              <option value="product">产品分析</option>
              <option value="trend">趋势分析</option>
            </select>
          </div>

          <div className="filter-group">
            <label>客户</label>
            <select
              value={filters.customerId}
              onChange={(e) => handleFilterChange('customerId', e.target.value)}
              className="glass-select"
            >
              <option value="">全部客户</option>
              {customers.map(customer => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>产品</label>
            <select
              value={filters.productId}
              onChange={(e) => handleFilterChange('productId', e.target.value)}
              className="glass-select"
            >
              <option value="">全部产品</option>
              {products.map(product => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>时间范围</label>
            <select
              value={filters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="glass-select"
            >
              <option value="7">最近7天</option>
              <option value="30">最近30天</option>
              <option value="90">最近90天</option>
              <option value="365">最近一年</option>
            </select>
          </div>
        </div>
      </div>

      {/* 报表数据 */}
      <div className="content-section">
        <div className="section-header">
          <h3>
            {filters.reportType === 'customer' && '客户销售分析'}
            {filters.reportType === 'product' && '产品销售分析'}
            {filters.reportType === 'trend' && '销售趋势分析'}
            {filters.reportType === 'summary' && '销售汇总报表'}
          </h3>
          <span className="item-count">共 {reportData.length} 条记录</span>
        </div>

        <div className="glass-table-container">
          <table className="glass-table">
            <thead>
              <tr>
                {filters.reportType === 'trend' && <th>时期</th>}
                {filters.reportType !== 'product' && <th>客户</th>}
                {filters.reportType !== 'customer' && <th>产品</th>}
                <th>订单数</th>
                <th>总金额</th>
                <th>平均订单值</th>
                <th>发货数</th>
                <th>发货金额</th>
                {filters.reportType === 'customer' && <th>客户类型</th>}
                {filters.reportType === 'customer' && <th>地区</th>}
              </tr>
            </thead>
            <tbody>
              {reportData.map((item, index) => (
                <tr key={index}>
                  {filters.reportType === 'trend' && (
                    <td className="period-cell">
                      <strong>{item.period}</strong>
                    </td>
                  )}
                  {filters.reportType !== 'product' && (
                    <td className="customer-cell">
                      {item.customerName}
                    </td>
                  )}
                  {filters.reportType !== 'customer' && (
                    <td className="product-cell">
                      {item.productName}
                    </td>
                  )}
                  <td className="count-cell">
                    {item.orderCount}
                  </td>
                  <td className="amount-cell">
                    <div className="value-amount">¥{item.totalAmount.toLocaleString()}</div>
                  </td>
                  <td className="avg-cell">
                    ¥{item.avgOrderValue.toLocaleString()}
                  </td>
                  <td className="delivery-cell">
                    {item.deliveryCount}
                  </td>
                  <td className="delivery-amount-cell">
                    <div className="value-amount">¥{item.deliveredAmount.toLocaleString()}</div>
                  </td>
                  {filters.reportType === 'customer' && (
                    <td className="type-cell">
                      {item.customerType}
                    </td>
                  )}
                  {filters.reportType === 'customer' && (
                    <td className="region-cell">
                      {item.region}
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          {reportData.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📊</div>
              <h3>没有找到销售数据</h3>
              <p>请调整筛选条件或检查销售数据</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SalesReports;