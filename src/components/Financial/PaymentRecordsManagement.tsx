import React, { useState, useEffect } from 'react';
import accountsPayableService from '../../services/business/accountsPayableService';
import { supplierService } from '../../services/business';
import { Payment, PaymentMethod, Supplier } from '../../types/entities';
import { GlassInput, GlassSelect, GlassCard } from '../ui/FormControls';

interface PaymentStatData {
  count: number;
  amount: number;
}

type PaymentStats = {
  [key in PaymentMethod]: PaymentStatData;
};

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
  const [stats, setStats] = useState<PaymentStats | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const _loadData = async () => {
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

  const _getPaymentMethodText = (method: PaymentMethod): string => {
    switch (method) {
      case PaymentMethod.CASH: return '现金';
      case PaymentMethod.BANK_TRANSFER: return '银行转账';
      case PaymentMethod.CHECK: return '支票';
      case PaymentMethod.CREDIT_CARD: return '信用卡';
      case PaymentMethod.OTHER: return '其他';
      default: return method;
    }
  };

  const _getPaymentMethodIcon = (method: PaymentMethod): string => {
    switch (method) {
      case PaymentMethod.CASH: return '💵';
      case PaymentMethod.BANK_TRANSFER: return '🏦';
      case PaymentMethod.CHECK: return '🧾';
      case PaymentMethod.CREDIT_CARD: return '💳';
      case PaymentMethod.OTHER: return '📄';
      default: return '📄';
    }
  };

  const __getPaymentMethodClass = (method: PaymentMethod): string => {
    switch (method) {
      case PaymentMethod.CASH: return 'text-green-600 bg-green-50 border-green-200';
      case PaymentMethod.BANK_TRANSFER: return 'text-blue-600 bg-blue-50 border-blue-200';
      case PaymentMethod.CHECK: return 'text-purple-600 bg-purple-50 border-purple-200';
      case PaymentMethod.CREDIT_CARD: return 'text-orange-600 bg-orange-50 border-orange-200';
      case PaymentMethod.OTHER: return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const __getSupplierName = async (payableId: string): Promise<string> => {
    try {
      const _payable = await accountsPayableService.findById(payableId);
      if (payable) {
        const _supplier = suppliers.find(s => s.id === payable.supplierId);
        return supplier ? supplier.name : '未知供应商';
      }
      return '未知供应商';
    } catch {
      return '未知供应商';
    }
  };

  const _formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const _formatDateTime = (date: Date): string => {
    return new Date(date).toLocaleString('zh-CN');
  };

  const _getUniqueOperators = (): string[] => {
    const _operators = new Set(payments.map(p => p.operator));
    return Array.from(operators).filter(Boolean);
  };

  const _filteredPayments = payments.filter(payment => {
    const _matchesSearch = !searchTerm || 
      payment.paymentNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.operator.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.remark?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const _matchesMethod = !selectedMethod || payment.paymentMethod === selectedMethod;
    const _matchesOperator = !selectedOperator || payment.operator === selectedOperator;
    
    const _paymentDate = new Date(payment.paymentDate);
    const _matchesDateRange = (!dateRange.startDate || paymentDate >= new Date(dateRange.startDate)) &&
                           (!dateRange.endDate || paymentDate <= new Date(dateRange.endDate));
    
    return matchesSearch && matchesMethod && matchesOperator && matchesDateRange;
  });

  const _calculateSummary = () => {
    const _totalAmount = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const _totalCount = filteredPayments.length;
    const _todayPayments = filteredPayments.filter(p => 
      new Date(p.paymentDate).toDateString() === new Date().toDateString()
    );
    const _todayAmount = todayPayments.reduce((sum, p) => sum + p.amount, 0);

    return {
      totalAmount,
      totalCount,
      todayCount: todayPayments.length,
      todayAmount
    };
  };

  const _summary = calculateSummary();

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 ${className || ''}`}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载付款记录数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${className || ''}`} style={{ background: 'var(--app-background)' }}>
      <div className="p-6 space-y-6">
        {/* 页面头部 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold financial-title">
              付款记录管理
            </h1>
            <p className="mt-1 financial-subtitle">查看和分析所有付款交易记录</p>
          </div>
        </div>

        {/* 错误消息 */}
        {error && (
          <GlassCard className="border-red-200 bg-red-50/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-red-600">
                <span>❌</span>
                <span>{error}</span>
              </div>
              <button 
                onClick={() => setError(null)}
                className="text-red-400 hover:text-red-600 transition-colors"
              >
                ✕
              </button>
            </div>
          </GlassCard>
        )}

        {/* 统计汇总 */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">📊</div>
            <div className="text-2xl font-bold financial-value-total">{summary.totalCount}</div>
            <div className="text-sm financial-description">总付款笔数</div>
          </GlassCard>

          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">💰</div>
            <div className="text-2xl font-bold financial-value-expense">¥{(summary.totalAmount / 10000).toFixed(1)}万</div>
            <div className="text-sm financial-description">总付款金额</div>
          </GlassCard>
          
          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">📅</div>
            <div className="text-2xl font-bold financial-value-today">{summary.todayCount}</div>
            <div className="text-sm financial-description">今日付款笔数</div>
          </GlassCard>

          <GlassCard className="text-center p-6">
            <div className="text-3xl mb-3">💵</div>
            <div className="text-2xl font-bold financial-value-today">¥{summary.todayAmount.toLocaleString()}</div>
            <div className="text-sm financial-description">今日付款金额</div>
          </GlassCard>
        </div>

        {/* 付款方式统计 */}
        {stats && (
          <GlassCard>
            <div className="p-4 border-b border-white/20">
              <h3 className="text-lg font-semibold financial-title">付款方式统计</h3>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {Object.entries(stats).map(([method, data]) => (
                  <div key={method} className="text-center p-4 bg-white/30 rounded-xl border border-white/20">
                    <div className="text-2xl mb-2">{getPaymentMethodIcon(method as PaymentMethod)}</div>
                    <div className="font-medium financial-text mb-1">{getPaymentMethodText(method as PaymentMethod)}</div>
                    <div className="text-sm financial-subtitle">{data.count} 笔</div>
                    <div className="text-sm font-medium financial-value-expense">¥{data.amount.toLocaleString()}</div>
                  </div>
                ))}
              </div>
            </div>
          </GlassCard>
        )}

        {/* 筛选条件 */}
        <GlassCard>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 p-4">
            <div>
              <label className="block text-sm font-medium financial-label mb-2">搜索付款</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 financial-icon">🔍</span>
                <GlassInput
                  type="text"
                  placeholder="搜索付款单号、经办人、备注..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium financial-label mb-2">付款方式</label>
              <GlassSelect
                value={selectedMethod}
                onChange={(e) => setSelectedMethod(e.target.value as PaymentMethod)}
              >
                <option value="">全部方式</option>
                <option value={PaymentMethod.BANK_TRANSFER}>银行转账</option>
                <option value={PaymentMethod.CASH}>现金</option>
                <option value={PaymentMethod.CHECK}>支票</option>
                <option value={PaymentMethod.CREDIT_CARD}>信用卡</option>
                <option value={PaymentMethod.OTHER}>其他</option>
              </GlassSelect>
            </div>

            <div>
              <label className="block text-sm font-medium financial-label mb-2">经办人</label>
              <GlassSelect
                value={selectedOperator}
                onChange={(e) => setSelectedOperator(e.target.value)}
              >
                <option value="">全部经办人</option>
                {getUniqueOperators().map(operator => (
                  <option key={operator} value={operator}>
                    {operator}
                  </option>
                ))}
              </GlassSelect>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">开始日期</label>
              <GlassInput
                type="date"
                value={dateRange.startDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">结束日期</label>
              <GlassInput
                type="date"
                value={dateRange.endDate}
                onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
              />
            </div>
          </div>
        </GlassCard>

        {/* 付款记录列表 */}
        <GlassCard>
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold financial-title">付款记录列表</h3>
              <span className="text-sm financial-subtitle">共 {filteredPayments.length} 条记录</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium financial-table-header uppercase tracking-wider">付款单号</th>
                  <th className="px-6 py-3 text-left text-xs font-medium financial-table-header uppercase tracking-wider">付款日期</th>
                  <th className="px-6 py-3 text-left text-xs font-medium financial-table-header uppercase tracking-wider">付款方式</th>
                  <th className="px-6 py-3 text-left text-xs font-medium financial-table-header uppercase tracking-wider">付款金额</th>
                  <th className="px-6 py-3 text-left text-xs font-medium financial-table-header uppercase tracking-wider">经办人</th>
                  <th className="px-6 py-3 text-left text-xs font-medium financial-table-header uppercase tracking-wider">备注</th>
                  <th className="px-6 py-3 text-left text-xs font-medium financial-table-header uppercase tracking-wider">创建时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {filteredPayments.map(payment => (
                  <tr key={payment.id} className="hover:bg-white/50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium financial-text">{payment.paymentNo}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap financial-text">
                      {formatDate(payment.paymentDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="financial-status-processing">
                        <span className="mr-1">{getPaymentMethodIcon(payment.paymentMethod)}</span>
                        {getPaymentMethodText(payment.paymentMethod)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-lg font-semibold financial-value-expense">¥{payment.amount.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap financial-text">
                      {payment.operator}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap financial-subtitle">
                      {payment.remark || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatDateTime(payment.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredPayments.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">📤</div>
                <h3 className="text-lg font-medium financial-title mb-2">没有找到付款记录</h3>
                <p className="financial-subtitle">请调整筛选条件或检查数据范围</p>
              </div>
            )}
          </div>
        </GlassCard>
      </div>
    </div>
  );
};

export default PaymentRecordsManagement;