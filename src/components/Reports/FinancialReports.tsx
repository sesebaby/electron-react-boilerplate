import React, { useState, useEffect } from 'react';
import {
  accountsPayableService,
  // accountsReceivableService,
  salesOrderService,
  purchaseOrderService,
  salesDeliveryService,
  purchaseReceiptService
} from '../../services/business';
import { 
  AccountsPayable, 
  AccountsReceivable, 
  Payment, 
  Receipt, 
  SalesOrder, 
  PurchaseOrder 
} from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';

interface FinancialReportsProps {
  className?: string;
}

type FinancialTab = 'overview' | 'cashflow' | 'profitloss' | 'balance' | 'aging';

export const FinancialReports: React.FC<FinancialReportsProps> = ({ className }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<FinancialTab>('overview');
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  const [payables, setPayables] = useState<AccountsPayable[]>([]);
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [salesOrders, setSalesOrders] = useState<SalesOrder[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [
        payablesData,
        // receivablesData,
        paymentsData,
        // receiptsData,
        salesData,
        purchaseData
      ] = await Promise.all([
        accountsPayableService.findAll(),
        // accountsReceivableService.findAll(),
        accountsPayableService.findAllPayments(),
        // accountsReceivableService.findAllReceipts(),
        salesOrderService.findAll(),
        purchaseOrderService.findAll()
      ]);
      
      // 设置财务数据（部分启用）
      setPayables(payablesData);
      // setReceivables(receivablesData);
      setPayments(paymentsData);
      // setReceipts(receiptsData);
      setSalesOrders(salesData);
      setPurchaseOrders(purchaseData);
    } catch (err) {
      setError('加载财务报表数据失败');
      console.error('Failed to load financial reports data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredData = (data: any[], dateField: string) => {
    const startDate = new Date(dateRange.startDate);
    const endDate = new Date(dateRange.endDate);
    return data.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= startDate && itemDate <= endDate;
    });
  };

  const calculateFinancialOverview = () => {
    const filteredPayables = getFilteredData(payables, 'billDate');
    const filteredReceivables = getFilteredData(receivables, 'invoiceDate');
    const filteredPayments = getFilteredData(payments, 'paymentDate');
    const filteredReceipts = getFilteredData(receipts, 'receiptDate');
    const filteredSales = getFilteredData(salesOrders, 'orderDate');
    const filteredPurchases = getFilteredData(purchaseOrders, 'orderDate');

    const totalPayables = filteredPayables.reduce((sum, p) => sum + p.balanceAmount, 0);
    const totalReceivables = filteredReceivables.reduce((sum, r) => sum + r.balanceAmount, 0);
    const totalPayments = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalReceipts = filteredReceipts.reduce((sum, r) => sum + r.amount, 0);
    const totalSales = filteredSales.reduce((sum, s) => sum + s.totalAmount, 0);
    const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.totalAmount, 0);

    const netCashFlow = totalReceipts - totalPayments;
    const grossProfit = totalSales - totalPurchases;
    const netWorth = totalReceivables - totalPayables;

    return {
      totalPayables,
      totalReceivables,
      totalPayments,
      totalReceipts,
      totalSales,
      totalPurchases,
      netCashFlow,
      grossProfit,
      netWorth
    };
  };

  const getCashFlowAnalysis = () => {
    const filteredPayments = getFilteredData(payments, 'paymentDate');
    const filteredReceipts = getFilteredData(receipts, 'receiptDate');

    const monthlyData = new Map<string, {
      inflow: number;
      outflow: number;
      net: number;
    }>();

    filteredReceipts.forEach(receipt => {
      const monthKey = new Date(receipt.receiptDate).toISOString().substring(0, 7);
      const existing = monthlyData.get(monthKey) || { inflow: 0, outflow: 0, net: 0 };
      existing.inflow += receipt.amount;
      existing.net = existing.inflow - existing.outflow;
      monthlyData.set(monthKey, existing);
    });

    filteredPayments.forEach(payment => {
      const monthKey = new Date(payment.paymentDate).toISOString().substring(0, 7);
      const existing = monthlyData.get(monthKey) || { inflow: 0, outflow: 0, net: 0 };
      existing.outflow += payment.amount;
      existing.net = existing.inflow - existing.outflow;
      monthlyData.set(monthKey, existing);
    });

    return Array.from(monthlyData.entries())
      .map(([month, data]) => ({ month, ...data }))
      .sort((a, b) => a.month.localeCompare(b.month));
  };

  const getAgingAnalysis = () => {
    const now = new Date();
    
    const payableAging = {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      over90: 0
    };

    const receivableAging = {
      current: 0,
      days30: 0,
      days60: 0,
      days90: 0,
      over90: 0
    };

    payables.forEach(payable => {
      if (payable.balanceAmount <= 0) return;
      
      const daysPastDue = Math.floor((now.getTime() - new Date(payable.dueDate).getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysPastDue <= 0) {
        payableAging.current += payable.balanceAmount;
      } else if (daysPastDue <= 30) {
        payableAging.days30 += payable.balanceAmount;
      } else if (daysPastDue <= 60) {
        payableAging.days60 += payable.balanceAmount;
      } else if (daysPastDue <= 90) {
        payableAging.days90 += payable.balanceAmount;
      } else {
        payableAging.over90 += payable.balanceAmount;
      }
    });

    receivables.forEach(receivable => {
      if (receivable.balanceAmount <= 0) return;
      
      const daysPastDue = Math.floor((now.getTime() - new Date(receivable.dueDate).getTime()) / (24 * 60 * 60 * 1000));
      
      if (daysPastDue <= 0) {
        receivableAging.current += receivable.balanceAmount;
      } else if (daysPastDue <= 30) {
        receivableAging.days30 += receivable.balanceAmount;
      } else if (daysPastDue <= 60) {
        receivableAging.days60 += receivable.balanceAmount;
      } else if (daysPastDue <= 90) {
        receivableAging.days90 += receivable.balanceAmount;
      } else {
        receivableAging.over90 += receivable.balanceAmount;
      }
    });

    return { payableAging, receivableAging };
  };

  const renderOverview = () => {
    const overview = calculateFinancialOverview();

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <GlassCard className="text-center p-6">
          <div className="text-3xl mb-3">💰</div>
          <div className="text-2xl font-bold financial-value-positive">¥{(overview.totalSales / 10000).toFixed(1)}万</div>
          <div className="text-sm financial-description">销售收入</div>
        </GlassCard>

        <GlassCard className="text-center p-6">
          <div className="text-3xl mb-3">🛒</div>
          <div className="text-2xl font-bold financial-value-negative">¥{(overview.totalPurchases / 10000).toFixed(1)}万</div>
          <div className="text-sm financial-description">采购支出</div>
        </GlassCard>

        <GlassCard className="text-center p-6">
          <div className="text-3xl mb-3">📈</div>
          <div className={`text-2xl font-bold ${overview.grossProfit >= 0 ? 'financial-value-neutral' : 'financial-value-negative'}`}>
            ¥{(overview.grossProfit / 10000).toFixed(1)}万
          </div>
          <div className="text-sm financial-description">毛利润</div>
        </GlassCard>

        <GlassCard className="text-center p-6">
          <div className="text-3xl mb-3">🏦</div>
          <div className={`text-2xl font-bold ${overview.netCashFlow >= 0 ? 'financial-value-positive' : 'financial-value-negative'}`}>
            ¥{(overview.netCashFlow / 10000).toFixed(1)}万
          </div>
          <div className="text-sm financial-description">净现金流</div>
        </GlassCard>

        <GlassCard className="text-center p-6">
          <div className="text-3xl mb-3">💵</div>
          <div className="text-2xl font-bold financial-value-purple">¥{(overview.totalReceipts / 10000).toFixed(1)}万</div>
          <div className="text-sm financial-description">现金收入</div>
        </GlassCard>

        <GlassCard className="text-center p-6">
          <div className="text-3xl mb-3">💸</div>
          <div className="text-2xl font-bold financial-value-accent">¥{(overview.totalPayments / 10000).toFixed(1)}万</div>
          <div className="text-sm financial-description">现金支出</div>
        </GlassCard>

        <GlassCard className="text-center p-6">
          <div className="text-3xl mb-3">📊</div>
          <div className="text-2xl font-bold financial-value-indigo">¥{(overview.totalReceivables / 10000).toFixed(1)}万</div>
          <div className="text-sm financial-description">应收账款</div>
        </GlassCard>

        <GlassCard className="text-center p-6">
          <div className="text-3xl mb-3">📋</div>
          <div className="text-2xl font-bold financial-value-teal">¥{(overview.totalPayables / 10000).toFixed(1)}万</div>
          <div className="text-sm financial-description">应付账款</div>
        </GlassCard>
      </div>
    );
  };

  const renderCashFlow = () => {
    const cashFlowData = getCashFlowAnalysis();

    return (
      <GlassCard>
        <div className="p-4 border-b border-white/20">
          <h3 className="text-lg font-semibold financial-title">现金流量分析</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="financial-table-header">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">月份</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">现金流入</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">现金流出</th>
                <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider">净现金流</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50">
              {cashFlowData.map((data) => {
                const monthName = new Date(data.month + '-01').toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long'
                });

                return (
                  <tr key={data.month} className="hover:bg-white/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap font-medium financial-table-cell">{monthName}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="financial-value-positive font-semibold">¥{data.inflow.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="financial-value-negative font-semibold">¥{data.outflow.toLocaleString()}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`font-semibold ${data.net >= 0 ? 'financial-value-positive' : 'financial-value-negative'}`}>
                        ¥{data.net.toLocaleString()}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </GlassCard>
    );
  };

  const renderAging = () => {
    const { payableAging, receivableAging } = getAgingAnalysis();
    
    return (
      <div className="space-y-8">
        {/* 应收账款账龄分析 */}
        <GlassCard>
          <div className="p-4 border-b border-white/20">
            <h3 className="text-lg font-semibold financial-title">应收账款账龄分析</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center p-4 aging-card-normal rounded-xl">
                <div className="text-sm financial-description mb-1">未到期</div>
                <div className="text-xl font-bold">¥{receivableAging.current.toLocaleString()}</div>
              </div>
              <div className="text-center p-4 aging-card-warning rounded-xl">
                <div className="text-sm financial-description mb-1">1-30天</div>
                <div className="text-xl font-bold">¥{receivableAging.days30.toLocaleString()}</div>
              </div>
              <div className="text-center p-4 aging-card-accent rounded-xl">
                <div className="text-sm financial-description mb-1">31-60天</div>
                <div className="text-xl font-bold">¥{receivableAging.days60.toLocaleString()}</div>
              </div>
              <div className="text-center p-4 aging-card-danger rounded-xl">
                <div className="text-sm financial-description mb-1">61-90天</div>
                <div className="text-xl font-bold">¥{receivableAging.days90.toLocaleString()}</div>
              </div>
              <div className="text-center p-4 aging-card-purple rounded-xl">
                <div className="text-sm financial-description mb-1">90天以上</div>
                <div className="text-xl font-bold">¥{receivableAging.over90.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </GlassCard>
        
        {/* 应付账款账龄分析 */}
        <GlassCard>
          <div className="p-4 border-b border-white/20">
            <h3 className="text-lg font-semibold financial-title">应付账款账龄分析</h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="text-center p-4 aging-card-normal rounded-xl">
                <div className="text-sm financial-description mb-1">未到期</div>
                <div className="text-xl font-bold">¥{payableAging.current.toLocaleString()}</div>
              </div>
              <div className="text-center p-4 aging-card-warning rounded-xl">
                <div className="text-sm financial-description mb-1">1-30天</div>
                <div className="text-xl font-bold">¥{payableAging.days30.toLocaleString()}</div>
              </div>
              <div className="text-center p-4 aging-card-accent rounded-xl">
                <div className="text-sm financial-description mb-1">31-60天</div>
                <div className="text-xl font-bold">¥{payableAging.days60.toLocaleString()}</div>
              </div>
              <div className="text-center p-4 aging-card-danger rounded-xl">
                <div className="text-sm financial-description mb-1">61-90天</div>
                <div className="text-xl font-bold">¥{payableAging.days90.toLocaleString()}</div>
              </div>
              <div className="text-center p-4 aging-card-purple rounded-xl">
                <div className="text-sm financial-description mb-1">90天以上</div>
                <div className="text-xl font-bold">¥{payableAging.over90.toLocaleString()}</div>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  };

  const renderProfitLoss = () => {
    const overview = calculateFinancialOverview();
    const grossMargin = overview.totalSales > 0 ? (overview.grossProfit / overview.totalSales * 100).toFixed(1) : '0.0';

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6">
          <h4 className="text-lg font-semibold financial-title mb-4">收入</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="financial-subtitle">销售收入</span>
              <span className="font-semibold financial-value-positive">¥{overview.totalSales.toLocaleString()}</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h4 className="text-lg font-semibold financial-title mb-4">成本</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="financial-subtitle">采购成本</span>
              <span className="font-semibold financial-value-negative">¥{overview.totalPurchases.toLocaleString()}</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h4 className="text-lg font-semibold financial-title mb-4">利润</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="financial-subtitle">毛利润</span>
              <span className={`font-semibold ${overview.grossProfit >= 0 ? 'financial-value-positive' : 'financial-value-negative'}`}>
                ¥{overview.grossProfit.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="financial-subtitle">毛利率</span>
              <span className="font-semibold financial-value-neutral">{grossMargin}%</span>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  };

  const renderBalance = () => {
    const overview = calculateFinancialOverview();

    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <GlassCard className="p-6">
          <h4 className="text-lg font-semibold financial-title mb-4">资产</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="financial-subtitle">应收账款</span>
              <span className="font-semibold financial-value-neutral">¥{overview.totalReceivables.toLocaleString()}</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h4 className="text-lg font-semibold financial-title mb-4">负债</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="financial-subtitle">应付账款</span>
              <span className="font-semibold financial-value-accent">¥{overview.totalPayables.toLocaleString()}</span>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <h4 className="text-lg font-semibold financial-title mb-4">净资产</h4>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="financial-subtitle">净值</span>
              <span className={`font-semibold ${overview.netWorth >= 0 ? 'financial-value-positive' : 'financial-value-negative'}`}>
                ¥{overview.netWorth.toLocaleString()}
              </span>
            </div>
          </div>
        </GlassCard>
      </div>
    );
  };

  const tabs = [
    { id: 'overview' as FinancialTab, label: '财务概览', icon: '📊', description: '整体财务状况' },
    { id: 'cashflow' as FinancialTab, label: '现金流量', icon: '💰', description: '现金流分析' },
    { id: 'profitloss' as FinancialTab, label: '损益分析', icon: '📈', description: '盈利能力分析' },
    { id: 'balance' as FinancialTab, label: '财务状况', icon: '⚖️', description: '资产负债分析' },
    { id: 'aging' as FinancialTab, label: '账龄分析', icon: '📅', description: '应收应付账龄' }
  ];

  if (loading) {
    return (
      <div className={`min-h-screen ${className || ''}`}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-current financial-value-neutral mx-auto mb-4"></div>
            <p className="financial-subtitle">加载财务报表数据中...</p>
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
              财务报表
            </h1>
            <p className="financial-subtitle mt-1">财务状况、现金流和盈利分析报表</p>
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
          {activeTab === 'cashflow' && renderCashFlow()}
          {activeTab === 'profitloss' && renderProfitLoss()}
          {activeTab === 'balance' && renderBalance()}
          {activeTab === 'aging' && renderAging()}
        </div>
      </div>
    </div>
  );
};

export default FinancialReports;