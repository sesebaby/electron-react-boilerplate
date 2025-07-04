import React, { useState, useEffect } from 'react';
import { 
  accountsPayableService, 
  accountsReceivableService, 
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
        receivablesData, 
        paymentsData, 
        receiptsData,
        salesData,
        purchaseData
      ] = await Promise.all([
        accountsPayableService.findAll(),
        accountsReceivableService.findAll(),
        accountsPayableService.findAllPayments(),
        accountsReceivableService.findAllReceipts(),
        salesOrderService.findAll(),
        purchaseOrderService.findAll()
      ]);
      
      setPayables(payablesData);
      setReceivables(receivablesData);
      setPayments(paymentsData);
      setReceipts(receiptsData);
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
      <div className="financial-overview">
        <div className="statistics-grid">
          <div className="stat-item">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-value">¥{(overview.totalSales / 10000).toFixed(1)}万</div>
              <div className="stat-label">销售收入</div>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">🛒</div>
            <div className="stat-content">
              <div className="stat-value">¥{(overview.totalPurchases / 10000).toFixed(1)}万</div>
              <div className="stat-label">采购支出</div>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <div className="stat-value">¥{(overview.grossProfit / 10000).toFixed(1)}万</div>
              <div className="stat-label">毛利润</div>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">💵</div>
            <div className="stat-content">
              <div className="stat-value">¥{(overview.totalReceipts / 10000).toFixed(1)}万</div>
              <div className="stat-label">现金收入</div>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">💸</div>
            <div className="stat-content">
              <div className="stat-value">¥{(overview.totalPayments / 10000).toFixed(1)}万</div>
              <div className="stat-label">现金支出</div>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">🏦</div>
            <div className="stat-content">
              <div className="stat-value">¥{(overview.netCashFlow / 10000).toFixed(1)}万</div>
              <div className="stat-label">净现金流</div>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">¥{(overview.totalReceivables / 10000).toFixed(1)}万</div>
              <div className="stat-label">应收账款</div>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">📋</div>
            <div className="stat-content">
              <div className="stat-value">¥{(overview.totalPayables / 10000).toFixed(1)}万</div>
              <div className="stat-label">应付账款</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderCashFlow = () => {
    const cashFlowData = getCashFlowAnalysis();
    
    return (
      <div className="cashflow-analysis">
        <h3>现金流量分析</h3>
        <div className="glass-table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>月份</th>
                <th>现金流入</th>
                <th>现金流出</th>
                <th>净现金流</th>
              </tr>
            </thead>
            <tbody>
              {cashFlowData.map((data) => {
                const monthName = new Date(data.month + '-01').toLocaleDateString('zh-CN', {
                  year: 'numeric',
                  month: 'long'
                });
                
                return (
                  <tr key={data.month}>
                    <td>{monthName}</td>
                    <td className="amount-cell positive">¥{data.inflow.toLocaleString()}</td>
                    <td className="amount-cell negative">¥{data.outflow.toLocaleString()}</td>
                    <td className={`amount-cell ${data.net >= 0 ? 'positive' : 'negative'}`}>
                      ¥{data.net.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const renderAging = () => {
    const { payableAging, receivableAging } = getAgingAnalysis();
    
    return (
      <div className="aging-analysis">
        <div className="aging-section">
          <h3>应收账款账龄分析</h3>
          <div className="aging-grid">
            <div className="aging-item">
              <div className="aging-period">未到期</div>
              <div className="aging-amount">¥{receivableAging.current.toLocaleString()}</div>
            </div>
            <div className="aging-item warning">
              <div className="aging-period">1-30天</div>
              <div className="aging-amount">¥{receivableAging.days30.toLocaleString()}</div>
            </div>
            <div className="aging-item danger">
              <div className="aging-period">31-60天</div>
              <div className="aging-amount">¥{receivableAging.days60.toLocaleString()}</div>
            </div>
            <div className="aging-item danger">
              <div className="aging-period">61-90天</div>
              <div className="aging-amount">¥{receivableAging.days90.toLocaleString()}</div>
            </div>
            <div className="aging-item critical">
              <div className="aging-period">90天以上</div>
              <div className="aging-amount">¥{receivableAging.over90.toLocaleString()}</div>
            </div>
          </div>
        </div>
        
        <div className="aging-section">
          <h3>应付账款账龄分析</h3>
          <div className="aging-grid">
            <div className="aging-item">
              <div className="aging-period">未到期</div>
              <div className="aging-amount">¥{payableAging.current.toLocaleString()}</div>
            </div>
            <div className="aging-item warning">
              <div className="aging-period">1-30天</div>
              <div className="aging-amount">¥{payableAging.days30.toLocaleString()}</div>
            </div>
            <div className="aging-item danger">
              <div className="aging-period">31-60天</div>
              <div className="aging-amount">¥{payableAging.days60.toLocaleString()}</div>
            </div>
            <div className="aging-item danger">
              <div className="aging-period">61-90天</div>
              <div className="aging-amount">¥{payableAging.days90.toLocaleString()}</div>
            </div>
            <div className="aging-item critical">
              <div className="aging-period">90天以上</div>
              <div className="aging-amount">¥{payableAging.over90.toLocaleString()}</div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderProfitLoss = () => {
    const overview = calculateFinancialOverview();
    const grossMargin = overview.totalSales > 0 ? (overview.grossProfit / overview.totalSales * 100).toFixed(1) : '0.0';
    
    return (
      <div className="profit-loss-statement">
        <h3>损益分析</h3>
        <div className="financial-metrics">
          <div className="metric-group">
            <h4>收入</h4>
            <div className="financial-metric">
              <span className="metric-label">销售收入</span>
              <span className="metric-value positive">¥{overview.totalSales.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="metric-group">
            <h4>成本</h4>
            <div className="financial-metric">
              <span className="metric-label">采购成本</span>
              <span className="metric-value negative">¥{overview.totalPurchases.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="metric-group">
            <h4>利润</h4>
            <div className="financial-metric">
              <span className="metric-label">毛利润</span>
              <span className={`metric-value ${overview.grossProfit >= 0 ? 'positive' : 'negative'}`}>
                ¥{overview.grossProfit.toLocaleString()}
              </span>
            </div>
            <div className="financial-metric">
              <span className="metric-label">毛利率</span>
              <span className="metric-value neutral">{grossMargin}%</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderBalance = () => {
    const overview = calculateFinancialOverview();
    
    return (
      <div className="balance-sheet">
        <h3>财务状况表</h3>
        <div className="balance-sections">
          <div className="balance-section">
            <h4>资产</h4>
            <div className="financial-metric">
              <span className="metric-label">应收账款</span>
              <span className="metric-value">¥{overview.totalReceivables.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="balance-section">
            <h4>负债</h4>
            <div className="financial-metric">
              <span className="metric-label">应付账款</span>
              <span className="metric-value">¥{overview.totalPayables.toLocaleString()}</span>
            </div>
          </div>
          
          <div className="balance-section">
            <h4>净资产</h4>
            <div className="financial-metric">
              <span className="metric-label">净值</span>
              <span className={`metric-value ${overview.netWorth >= 0 ? 'positive' : 'negative'}`}>
                ¥{overview.netWorth.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const tabs = [
    { id: 'overview' as FinancialTab, label: '财务概览', icon: '📊' },
    { id: 'cashflow' as FinancialTab, label: '现金流量', icon: '💰' },
    { id: 'profitloss' as FinancialTab, label: '损益分析', icon: '📈' },
    { id: 'balance' as FinancialTab, label: '财务状况', icon: '⚖️' },
    { id: 'aging' as FinancialTab, label: '账龄分析', icon: '📅' }
  ];

  if (loading) {
    return (
      <div className={`financial-reports ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载财务报表数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`financial-reports ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>财务报表</h2>
          <p>财务状况、现金流和盈利分析报表</p>
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
        {activeTab === 'cashflow' && renderCashFlow()}
        {activeTab === 'profitloss' && renderProfitLoss()}
        {activeTab === 'balance' && renderBalance()}
        {activeTab === 'aging' && renderAging()}
      </div>
    </div>
  );
};

export default FinancialReports;