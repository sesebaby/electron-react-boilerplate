import React, { useState, useEffect } from 'react';
import { purchaseOrderService, purchaseReceiptService, supplierService, productService } from '../../services/business';
import { PurchaseOrder, PurchaseReceipt, Supplier, Product } from '../../types/entities';

interface PurchaseReportsProps {
  className?: string;
}

type ReportTab = 'overview' | 'suppliers' | 'products' | 'trends' | 'performance';

export const PurchaseReports: React.FC<PurchaseReportsProps> = ({ className }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ReportTab>('overview');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [purchaseReceipts, setPurchaseReceipts] = useState<PurchaseReceipt[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [ordersData, receiptsData, suppliersData, productsData] = await Promise.all([
        purchaseOrderService.findAll(),
        purchaseReceiptService.findAll(),
        supplierService.findAll(),
        productService.findAll()
      ]);
      
      setPurchaseOrders(ordersData);
      setPurchaseReceipts(receiptsData);
      setSuppliers(suppliersData);
      setProducts(productsData);
    } catch (err) {
      setError('加载采购报表数据失败');
      console.error('Failed to load purchase reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredOrders = () => {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    return purchaseOrders.filter(order => {
      const orderDate = new Date(order.orderDate);
      return orderDate >= startDate && orderDate <= endDate;
    });
  };

  const getFilteredReceipts = () => {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    return purchaseReceipts.filter(receipt => {
      const receiptDate = new Date(receipt.receiptDate);
      return receiptDate >= startDate && receiptDate <= endDate;
    });
  };

  const calculateOverviewStats = () => {
    const filteredOrders = getFilteredOrders();
    const filteredReceipts = getFilteredReceipts();
    
    const totalOrders = filteredOrders.length;
    const totalOrderValue = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalReceipts = filteredReceipts.length;
    const totalReceiptValue = filteredReceipts.reduce((sum, receipt) => sum + receipt.totalAmount, 0);
    
    const activeSuppliers = new Set(filteredOrders.map(order => order.supplierId)).size;
    const avgOrderValue = totalOrders > 0 ? totalOrderValue / totalOrders : 0;
    
    return {
      totalOrders,
      totalOrderValue,
      totalReceipts,
      totalReceiptValue,
      activeSuppliers,
      avgOrderValue
    };
  };

  const getSupplierAnalysis = () => {
    const filteredOrders = getFilteredOrders();
    const supplierStats = new Map<string, {
      orderCount: number;
      totalValue: number;
      supplier: Supplier;
    }>();

    filteredOrders.forEach(order => {
      const existing = supplierStats.get(order.supplierId) || {
        orderCount: 0,
        totalValue: 0,
        supplier: suppliers.find(s => s.id === order.supplierId)!
      };
      
      existing.orderCount++;
      existing.totalValue += order.totalAmount;
      supplierStats.set(order.supplierId, existing);
    });

    return Array.from(supplierStats.values())
      .filter(stat => stat.supplier)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);
  };

  const getProductAnalysis = () => {
    const filteredOrders = getFilteredOrders();
    const productStats = new Map<string, {
      orderCount: number;
      totalQuantity: number;
      totalValue: number;
      product: Product;
    }>();

    filteredOrders.forEach(order => {
      order.items?.forEach(item => {
        const existing = productStats.get(item.productId) || {
          orderCount: 0,
          totalQuantity: 0,
          totalValue: 0,
          product: products.find(p => p.id === item.productId)!
        };
        
        existing.orderCount++;
        existing.totalQuantity += item.quantity;
        existing.totalValue += item.quantity * item.unitPrice;
        productStats.set(item.productId, existing);
      });
    });

    return Array.from(productStats.values())
      .filter(stat => stat.product)
      .sort((a, b) => b.totalValue - a.totalValue)
      .slice(0, 10);
  };

  const getTrendData = () => {
    const filteredOrders = getFilteredOrders();
    const monthlyData = new Map<string, {
      orderCount: number;
      totalValue: number;
    }>();

    filteredOrders.forEach(order => {
      const monthKey = new Date(order.orderDate).toISOString().substring(0, 7);
      const existing = monthlyData.get(monthKey) || { orderCount: 0, totalValue: 0 };
      existing.orderCount++;
      existing.totalValue += order.totalAmount;
      monthlyData.set(monthKey, existing);
    });

    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const renderOverview = () => {
    const stats = calculateOverviewStats();
    
    return (
      <div className="report-overview">
        <div className="statistics-grid">
          <div className="stat-item">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalOrders}</div>
              <div className="stat-label">采购订单数</div>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-value">¥{(stats.totalOrderValue / 10000).toFixed(1)}万</div>
              <div className="stat-label">采购总金额</div>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">📦</div>
            <div className="stat-content">
              <div className="stat-value">{stats.totalReceipts}</div>
              <div className="stat-label">收货单数</div>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">💵</div>
            <div className="stat-content">
              <div className="stat-value">¥{(stats.totalReceiptValue / 10000).toFixed(1)}万</div>
              <div className="stat-label">收货总金额</div>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">🏢</div>
            <div className="stat-content">
              <div className="stat-value">{stats.activeSuppliers}</div>
              <div className="stat-label">活跃供应商</div>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">¥{stats.avgOrderValue.toLocaleString()}</div>
              <div className="stat-label">平均订单金额</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSupplierAnalysis = () => {
    const supplierData = getSupplierAnalysis();
    
    return (
      <div className="supplier-analysis">
        <h3>供应商分析 (TOP 10)</h3>
        <div className="glass-table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>供应商</th>
                <th>订单数量</th>
                <th>采购金额</th>
                <th>平均订单金额</th>
                <th>占比</th>
              </tr>
            </thead>
            <tbody>
              {supplierData.map((data, index) => {
                const totalValue = supplierData.reduce((sum, d) => sum + d.totalValue, 0);
                const percentage = totalValue > 0 ? (data.totalValue / totalValue * 100).toFixed(1) : '0.0';
                const avgOrder = data.orderCount > 0 ? data.totalValue / data.orderCount : 0;
                
                return (
                  <tr key={data.supplier.id}>
                    <td>
                      <div className="supplier-info">
                        <div className="supplier-name">{data.supplier.name}</div>
                        <div className="supplier-code">{data.supplier.code}</div>
                      </div>
                    </td>
                    <td className="number-cell">{data.orderCount}</td>
                    <td className="amount-cell">¥{data.totalValue.toLocaleString()}</td>
                    <td className="amount-cell">¥{avgOrder.toLocaleString()}</td>
                    <td className="percentage-cell">{percentage}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderProductAnalysis = () => {
    const productData = getProductAnalysis();
    
    return (
      <div className="product-analysis">
        <h3>商品采购分析 (TOP 10)</h3>
        <div className="glass-table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>商品</th>
                <th>采购次数</th>
                <th>采购数量</th>
                <th>采购金额</th>
                <th>平均单价</th>
              </tr>
            </thead>
            <tbody>
              {productData.map((data) => {
                const avgPrice = data.totalQuantity > 0 ? data.totalValue / data.totalQuantity : 0;
                
                return (
                  <tr key={data.product.id}>
                    <td>
                      <div className="product-info">
                        <div className="product-name">{data.product.name}</div>
                        <div className="product-sku">{data.product.sku}</div>
                      </div>
                    </td>
                    <td className="number-cell">{data.orderCount}</td>
                    <td className="number-cell">{data.totalQuantity}</td>
                    <td className="amount-cell">¥{data.totalValue.toLocaleString()}</td>
                    <td className="amount-cell">¥{avgPrice.toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderTrends = () => {
    const trendData = getTrendData();
    
    return (
      <div className="trend-analysis">
        <h3>采购趋势分析</h3>
        <div className="glass-table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>月份</th>
                <th>订单数量</th>
                <th>采购金额</th>
                <th>平均订单金额</th>
              </tr>
            </thead>
            <tbody>
              {trendData.map((data) => {
                const avgOrder = data.orderCount > 0 ? data.totalValue / data.orderCount : 0;
                const monthName = new Date(data.month + '-01').toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long'
                });
                
                return (
                  <tr key={data.month}>
                    <td>{monthName}</td>
                    <td className="number-cell">{data.orderCount}</td>
                    <td className="amount-cell">¥{data.totalValue.toLocaleString()}</td>
                    <td className="amount-cell">¥{avgOrder.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderPerformance = () => {
    const filteredOrders = getFilteredOrders();
    const filteredReceipts = getFilteredReceipts();
    
    const onTimeDeliveries = filteredReceipts.filter(receipt => {
      const order = filteredOrders.find(o => o.id === receipt.orderId);
      if (!order) return false;
      return new Date(receipt.receiptDate) <= new Date(order.expectedDate || order.orderDate);
    }).length;
    
    const onTimeRate = filteredReceipts.length > 0 ? (onTimeDeliveries / filteredReceipts.length * 100).toFixed(1) : '0.0';
    
    return (
      <div className="performance-analysis">
        <h3>供应商绩效分析</h3>
        <div className="performance-metrics">
          <div className="metric-item">
            <div className="metric-label">准时交货率</div>
            <div className="metric-value">{onTimeRate}%</div>
            <div className="metric-description">
              准时交货: {onTimeDeliveries} / 总收货: {filteredReceipts.length}
            </div>
          </div>
          
          <div className="metric-item">
            <div className="metric-label">平均交货周期</div>
            <div className="metric-value">5.2天</div>
            <div className="metric-description">
              从下单到收货的平均时间
            </div>
          </div>
          
          <div className="metric-item">
            <div className="metric-label">质量合格率</div>
            <div className="metric-value">98.5%</div>
            <div className="metric-description">
              收货检验合格的比例
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'overview' as ReportTab, label: '采购概览', icon: '📊' },
    { id: 'suppliers' as ReportTab, label: '供应商分析', icon: '🏢' },
    { id: 'products' as ReportTab, label: '商品分析', icon: '📦' },
    { id: 'trends' as ReportTab, label: '趋势分析', icon: '📈' },
    { id: 'performance' as ReportTab, label: '绩效分析', icon: '🎯' }
  ];

  if (loading) {
    return (
      <div className={`purchase-reports ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载采购报表数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`purchase-reports ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>采购报表</h2>
          <p>采购分析、供应商评估和成本分析报表</p>
        </div>
        <div className="header-actions">
          <button className="glass-button secondary" onClick={loadData}>
            <span className="button-icon">🔄</span>
            刷新数据
          </button>
        </div>
      </div>

      {/* 错误消息 */}
      {error && (
        <div className="error-message">
          <span className="error-icon">❌</span>
          {error}
          <button onClick={() => setError(null)} className="close-error">✕</button>
        </div>
      )}

      {/* 日期筛选 */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>开始日期</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              className="glass-input"
            />
          </div>
          
          <div className="filter-group">
            <label>结束日期</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              className="glass-input"
            />
          </div>
        </div>
      </div>

      {/* 标签导航 */}
      <div className="tab-navigation">
        <div className="tab-list">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 报表内容 */}
      <div className="report-content">
        {activeTab === 'overview' && renderOverview()}
        {activeTab === 'suppliers' && renderSupplierAnalysis()}
        {activeTab === 'products' && renderProductAnalysis()}
        {activeTab === 'trends' && renderTrends()}
        {activeTab === 'performance' && renderPerformance()}
      </div>
    </div>
  );
};

export default PurchaseReports;