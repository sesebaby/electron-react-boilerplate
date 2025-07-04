import React, { useState, useEffect } from 'react';
import accountsPayableService from '../../services/business/accountsPayableService';
import { supplierService } from '../../services/business';
import { Payment, PaymentMethod, Supplier } from '../../types/entities';

interface PaymentRecordsManagementProps {
  className?: string;
}

export const PaymentRecordsManagement: React.FC<PaymentRecordsManagementProps> = ({ className }) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | ''>('');
  const [selectedOperator, setSelectedOperator] = useState('');
  const [dateRange, setDateRange] = useState({
    startDate: '',
    endDate: ''
  });
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [paymentsData, suppliersData, methodStats] = await Promise.all([
        accountsPayableService.findAllPayments(),
        supplierService.findAll(),
        accountsPayableService.getPaymentMethodStats()
      ]);
      
      setPayments(paymentsData);
      setSuppliers(suppliersData);
      setStats(methodStats);
    } catch (err) {
      setError('加载付款记录数据失败');
      console.error('Failed to load payment records data:', err);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentMethodText = (method: PaymentMethod): string => {
    switch (method) {
      case PaymentMethod.CASH: return '现金';
      case PaymentMethod.BANK_TRANSFER: return '银行转账';
      case PaymentMethod.CHECK: return '支票';
      case PaymentMethod.CREDIT_CARD: return '信用卡';
      case PaymentMethod.OTHER: return '其他';
      default: return method;
    }
  };

  const getSupplierName = async (payableId: string): Promise<string> => {
    try {
      const payable = await accountsPayableService.findById(payableId);
      if (payable) {
        const supplier = suppliers.find(s => s.id === payable.supplierId);
        return supplier ? supplier.name : '未知供应商';
      }
      return '未知供应商';
    } catch {
      return '未知供应商';
    }
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const formatDateTime = (date: Date): string => {
    return new Date(date).toLocaleString('zh-CN');
  };

  const getUniqueOperators = (): string[] => {
    const operators = new Set(payments.map(p => p.operator));
    return Array.from(operators).filter(Boolean);
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = !searchTerm || 
      payment.paymentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.remark?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesMethod = !selectedMethod || payment.paymentMethod === selectedMethod;
    const matchesOperator = !selectedOperator || payment.operator === selectedOperator;
    
    const paymentDate = new Date(payment.paymentDate);
    const matchesDateRange = (!dateRange.startDate || paymentDate >= new Date(dateRange.startDate)) &&
                           (!dateRange.endDate || paymentDate <= new Date(dateRange.endDate));
    
    return matchesSearch && matchesMethod && matchesOperator && matchesDateRange;
  });

  const calculateSummary = () => {
    const totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalCount = filteredPayments.length;
    const todayPayments = filteredPayments.filter(p => 
      new Date(p.paymentDate).toDateString() === new Date().toDateString()
    );
    const todayAmount = todayPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalAmount,
      totalCount,
      todayCount: todayPayments.length,
      todayAmount
    };
  };

  const summary = calculateSummary();

  if (loading) {
    return (
      <div className={`payment-records-management ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载付款记录数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`payment-records-management ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>付款记录管理</h2>
          <p>查看和分析所有付款交易记录</p>
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

      {/* 统计汇总 */}
      <div className="statistics-section">
        <div className="statistics-grid">
          <div className="stat-item total">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-value">{summary.totalCount}</div>
              <div className="stat-label">总付款笔数</div>
            </div>
          </div>
          
          <div className="stat-item amount">
            <div className="stat-icon">💰</div>
            <div className="stat-content">
              <div className="stat-value">¥{(summary.totalAmount / 10000).toFixed(1)}万</div>
              <div className="stat-label">总付款金额</div>
            </div>
          </div>
          
          <div className="stat-item today">
            <div className="stat-icon">📅</div>
            <div className="stat-content">
              <div className="stat-value">{summary.todayCount}</div>
              <div className="stat-label">今日付款笔数</div>
            </div>
          </div>
          
          <div className="stat-item today-amount">
            <div className="stat-icon">💵</div>
            <div className="stat-content">
              <div className="stat-value">¥{summary.todayAmount.toLocaleString()}</div>
              <div className="stat-label">今日付款金额</div>
            </div>
          </div>
        </div>
      </div>

      {/* 付款方式统计 */}
      {stats && (
        <div className="payment-method-stats">
          <h3>付款方式统计</h3>
          <div className="method-stats-grid">
            {Object.entries(stats).map(([method, data]) => (
              <div key={method} className="method-stat-item">
                <div className="method-name">{getPaymentMethodText(method as PaymentMethod)}</div>
                <div className="method-data">
                  <div className="method-count">{(data as any).count} 笔</div>
                  <div className="method-amount">¥{(data as any).amount.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 筛选条件 */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>搜索付款</label>
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="搜索付款单号、经办人、备注..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label>付款方式</label>
            <select
              value={selectedMethod}
              onChange={(e) => setSelectedMethod(e.target.value as PaymentMethod)}
              className="glass-select"
            >
              <option value="">全部方式</option>
              <option value={PaymentMethod.BANK_TRANSFER}>银行转账</option>
              <option value={PaymentMethod.CASH}>现金</option>
              <option value={PaymentMethod.CHECK}>支票</option>
              <option value={PaymentMethod.CREDIT_CARD}>信用卡</option>
              <option value={PaymentMethod.OTHER}>其他</option>
            </select>
          </div>

          <div className="filter-group">
            <label>经办人</label>
            <select
              value={selectedOperator}
              onChange={(e) => setSelectedOperator(e.target.value)}
              className="glass-select"
            >
              <option value="">全部经办人</option>
              {getUniqueOperators().map(operator => (
                <option key={operator} value={operator}>
                  {operator}
                </option>
              ))}
            </select>
          </div>

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

      {/* 付款记录列表 */}
      <div className="content-section">
        <div className="section-header">
          <h3>付款记录列表</h3>
          <span className="item-count">共 {filteredPayments.length} 条记录</span>
        </div>

        <div className="glass-table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>付款单号</th>
                <th>付款日期</th>
                <th>付款方式</th>
                <th>付款金额</th>
                <th>经办人</th>
                <th>备注</th>
                <th>创建时间</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayments.map(payment => (
                <tr key={payment.id}>
                  <td className="payment-no-cell">
                    <div className="payment-no">{payment.paymentNo}</div>
                  </td>
                  <td className="date-cell">
                    {formatDate(payment.paymentDate)}
                  </td>
                  <td className="method-cell">
                    <span className="method-badge">
                      {getPaymentMethodText(payment.paymentMethod)}
                    </span>
                  </td>
                  <td className="amount-cell">
                    <div className="payment-amount">¥{payment.amount.toLocaleString()}</div>
                  </td>
                  <td className="operator-cell">
                    {payment.operator}
                  </td>
                  <td className="remark-cell">
                    {payment.remark || '-'}
                  </td>
                  <td className="datetime-cell">
                    {formatDateTime(payment.createdAt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPayments.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📤</div>
              <h3>没有找到付款记录</h3>
              <p>请调整筛选条件或检查数据范围</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PaymentRecordsManagement;