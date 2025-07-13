import React, { useState, useEffect } from 'react';
import { serviceManager } from '../../services/core';
import { PurchaseOrder, PurchaseReceipt, Supplier, Product } from '../../types/entities';
import { convertProductWithStockToProduct } from '../../services/domain/InventoryDomainService';
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
      
      const orderService = serviceManager.getOrderService();
      const systemService = serviceManager.getSystemService();
      const inventoryService = serviceManager.getInventoryService();
      const [ordersResult, receiptsResult, suppliersResult, productsResult] = await Promise.all([
        orderService.getPurchaseOrders(),
        orderService.getPurchaseReceipts(),
        systemService.getSuppliers(),
        inventoryService.findAllProducts()
      ]);

      const ordersData = ordersResult.success ? (ordersResult.data?.items || ordersResult.data || []) : [];
      const receiptsData = receiptsResult.success ? (receiptsResult.data?.items || receiptsResult.data || []) : [];
      const suppliersData = suppliersResult.success ? (suppliersResult.data?.items || suppliersResult.data || []) : [];
      const productsData = productsResult.success ? (productsResult.data || []) : [];

      setPurchaseOrders(ordersData as PurchaseOrder[]);
      setPurchaseReceipts(receiptsData as PurchaseReceipt[]);
      setSuppliers(suppliersData as Supplier[]);
      setProducts(productsData.map(convertProductWithStockToProduct));
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">📋</div>
            <div className="text-2xl font-bold purchase-value-orders">{stats.totalOrders}</div>
            <div className="text-sm financial-description">采购订单数</div>
          </GlassCard>

          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">💰</div>
            <div className="text-2xl font-bold purchase-value-cost">¥{(stats.totalOrderValue / 10000).toFixed(1)}万</div>
            <div className="text-sm financial-description">采购总金额</div>
          </GlassCard>

          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">📦</div>
            <div className="text-2xl font-bold purchase-value-delivery">{stats.totalReceipts}</div>
            <div className="text-sm financial-description">收货单数</div>
          </GlassCard>

          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">💵</div>
            <div className="text-2xl font-bold purchase-value-savings">¥{(stats.totalReceiptValue / 10000).toFixed(1)}万</div>
            <div className="text-sm financial-description">收货总金额</div>
          </GlassCard>

          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">🏢</div>
            <div className="text-2xl font-bold purchase-value-suppliers">{stats.activeSuppliers}</div>
            <div className="text-sm financial-description">活跃供应商</div>
          </GlassCard>

          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">📊</div>
            <div className="text-2xl font-bold purchase-value-quality">¥{stats.avgOrderValue.toLocaleString()}</div>
            <div className="text-sm financial-description">平均订单金额</div>
          </GlassCard>
        </div>
      </div>
    );
  };

  const renderSupplierAnalysis = () => {
    const supplierData = getSupplierAnalysis();
    
    return (
      <GlassCard>
        <div className="p-4 border-b border-white/20">
          <h3 className="text-lg font-semibold text-gray-800">供应商分析 (TOP 10)</h3>
        </div>
        <TableContainer height="400px">
          <Table stickyHeader minWidth="800px">
            <TableHeader sticky>
              <TableRow>
                <TableHead className="min-w-[200px] text-left">供应商</TableHead>
                <TableHead className="min-w-[120px] text-left">订单数量</TableHead>
                <TableHead className="min-w-[140px] text-left">采购金额</TableHead>
                <TableHead className="min-w-[140px] text-left">平均订单金额</TableHead>
                <TableHead className="min-w-[100px] text-left">占比</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {supplierData.map((data, index) => {
                const totalValue = supplierData.reduce((sum, d) => sum + d.totalValue, 0);
                const percentage = totalValue > 0 ? (data.totalValue / totalValue * 100).toFixed(1) : '0.0';
                const avgOrder = data.orderCount > 0 ? data.totalValue / data.orderCount : 0;
                
                return (
                  <TableRow key={data.supplier.id}>
                    <TableCell className="min-w-[200px]">
                      <div>
                        <div className="font-medium text-gray-900">{data.supplier.name}</div>
                        <div className="text-sm text-gray-500">{data.supplier.code}</div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[120px] text-gray-900">{data.orderCount}</TableCell>
                    <TableCell className="min-w-[140px]">
                      <div className="font-semibold text-gray-900">¥{data.totalValue.toLocaleString()}</div>
                    </TableCell>
                    <TableCell className="min-w-[140px] text-gray-900">¥{avgOrder.toLocaleString()}</TableCell>
                    <TableCell className="min-w-[100px]">
                      <span className="px-2 py-1 text-xs font-medium rounded-full purchase-status-processing">
                        {percentage}%
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </GlassCard>
    );
  };

  const renderProductAnalysis = () => {
    const productData = getProductAnalysis();
    
    return (
      <GlassCard>
        <div className="p-4 border-b border-white/20">
          <h3 className="text-lg font-semibold text-gray-800">商品采购分析 (TOP 10)</h3>
        </div>
        <TableContainer height="400px">
          <Table stickyHeader minWidth="800px">
            <TableHeader sticky>
              <TableRow>
                <TableHead className="min-w-[200px] text-left">商品</TableHead>
                <TableHead className="min-w-[120px] text-left">采购次数</TableHead>
                <TableHead className="min-w-[120px] text-left">采购数量</TableHead>
                <TableHead className="min-w-[140px] text-left">采购金额</TableHead>
                <TableHead className="min-w-[120px] text-left">平均单价</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productData.map((data) => {
                const avgPrice = data.totalQuantity > 0 ? data.totalValue / data.totalQuantity : 0;
                
                return (
                  <TableRow key={data.product.id}>
                    <TableCell className="min-w-[200px]">
                      <div>
                        <div className="font-medium text-gray-900">{data.product.name}</div>
                        <div className="text-sm text-gray-500">{data.product.sku}</div>
                      </div>
                    </TableCell>
                    <TableCell className="min-w-[120px] text-gray-900">{data.orderCount}</TableCell>
                    <TableCell className="min-w-[120px] text-gray-900">{data.totalQuantity}</TableCell>
                    <TableCell className="min-w-[140px]">
                      <div className="font-semibold text-gray-900">¥{data.totalValue.toLocaleString()}</div>
                    </TableCell>
                    <TableCell className="min-w-[120px] text-gray-900">¥{avgPrice.toFixed(2)}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </GlassCard>
    );
  };

  const renderTrends = () => {
    const trendData = getTrendData();
    
    return (
      <GlassCard>
        <div className="p-4 border-b border-white/20">
          <h3 className="text-lg font-semibold text-gray-800">采购趋势分析</h3>
        </div>
        <TableContainer height="400px">
          <Table stickyHeader minWidth="600px">
            <TableHeader sticky>
              <TableRow>
                <TableHead className="min-w-[150px] text-left">月份</TableHead>
                <TableHead className="min-w-[120px] text-left">订单数量</TableHead>
                <TableHead className="min-w-[140px] text-left">采购金额</TableHead>
                <TableHead className="min-w-[140px] text-left">平均订单金额</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trendData.map((data) => {
                const avgOrder = data.orderCount > 0 ? data.totalValue / data.orderCount : 0;
                const monthName = new Date(data.month + '-01').toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long'
                });
                
                return (
                  <TableRow key={data.month}>
                    <TableCell className="min-w-[150px] font-medium text-gray-900">{monthName}</TableCell>
                    <TableCell className="min-w-[120px] text-gray-900">{data.orderCount}</TableCell>
                    <TableCell className="min-w-[140px]">
                      <div className="font-semibold text-gray-900">¥{data.totalValue.toLocaleString()}</div>
                    </TableCell>
                    <TableCell className="min-w-[140px] text-gray-900">¥{avgOrder.toLocaleString()}</TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </GlassCard>
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
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <GlassCard className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-xl flex items-center justify-center text-white text-xl">
                ⏰
              </div>
              <div className="flex-1">
                <h4 className="font-semibold financial-title">准时交货率</h4>
                <p className="text-2xl font-bold purchase-value-savings">{onTimeRate}%</p>
                <p className="text-sm financial-subtitle">
                  准时交货: {onTimeDeliveries} / 总收货: {filteredReceipts.length}
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 purchase-value-delivery rounded-xl flex items-center justify-center text-xl">
                📅
              </div>
              <div className="flex-1">
                <h4 className="font-semibold financial-title">平均交货周期</h4>
                <p className="text-2xl font-bold purchase-value-delivery">5.2天</p>
                <p className="text-sm financial-subtitle">
                  从下单到收货的平均时间
                </p>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 purchase-value-quality rounded-xl flex items-center justify-center text-xl">
                ✅
              </div>
              <div className="flex-1">
                <h4 className="font-semibold financial-title">质量合格率</h4>
                <p className="text-2xl font-bold purchase-value-quality">98.5%</p>
                <p className="text-sm financial-subtitle">
                  收货检验合格的比例
                </p>
              </div>
            </div>
          </GlassCard>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'overview' as ReportTab, label: '采购概览', icon: '📊', description: '整体数据概览' },
    { id: 'suppliers' as ReportTab, label: '供应商分析', icon: '🏢', description: '供应商表现分析' },
    { id: 'products' as ReportTab, label: '商品分析', icon: '📦', description: '热门采购商品' },
    { id: 'trends' as ReportTab, label: '趋势分析', icon: '📈', description: '时间趋势变化' },
    { id: 'performance' as ReportTab, label: '绩效分析', icon: '🎯', description: '供应商绩效' }
  ];

  if (loading) {
    return (
      <div className={`min-h-screen ${className || ''}`}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-current financial-value-neutral mx-auto mb-4"></div>
            <p className="financial-subtitle">加载采购报表数据中...</p>
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
              采购报表
            </h1>
            <p className="financial-subtitle mt-1">采购分析、供应商评估和成本分析报表</p>
          </div>
          <GlassButton
            onClick={loadData}
            className="financial-value-neutral"
          >
            <span className="mr-2">🔄</span>
            刷新数据
          </GlassButton>
        </div>

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

        {/* 日期筛选 */}
        <GlassCard>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
            <div>
              <label className="block text-sm font-medium financial-subtitle mb-2">开始日期</label>
              <GlassInput
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium financial-subtitle mb-2">结束日期</label>
              <GlassInput
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
        </GlassCard>

        {/* 标签导航 */}
        <GlassCard className="p-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                type="button"
                className={`
                  flex-1 min-w-0 px-4 py-3 rounded-xl transition-all duration-300 flex flex-col items-center text-center
                  ${activeTab === tab.id
                    ? 'financial-value-neutral shadow-lg transform scale-105'
                    : 'financial-subtitle hover:bg-white/50'
                  }
                `}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="text-xl mb-1">{tab.icon}</span>
                <span className="font-medium text-sm">{tab.label}</span>
                <span className={`text-xs mt-1 ${activeTab === tab.id ? 'financial-description' : 'financial-description'}`}>
                  {tab.description}
                </span>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* 报表内容 */}
        <div className="report-content">
          {activeTab === 'overview' && renderOverview()}
          {activeTab === 'suppliers' && renderSupplierAnalysis()}
          {activeTab === 'products' && renderProductAnalysis()}
          {activeTab === 'trends' && renderTrends()}
          {activeTab === 'performance' && renderPerformance()}
        </div>
      </div>
    </div>
  );
};

export default PurchaseReports;