import React, { useState, useEffect } from 'react';
import accountsReceivableService from '../../services/business/accountsReceivableService';
import { customerService } from '../../services/business';
import { AccountsReceivable, Receipt, ReceivableStatus, PaymentMethod, Customer } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';
import ConfirmDialog from '../ui/ConfirmDialog';

interface AccountsReceivableManagementProps {
  className?: string;
}

interface ReceivableForm {
  billNo: string;
  customerId: string;
  orderId: string;
  billDate: string;
  dueDate: string;
  totalAmount: number;
  remark: string;
}

interface ReceiptForm {
  receivableId: string;
  receiptNo: string;
  receiptDate: string;
  paymentMethod: PaymentMethod;
  amount: number;
  remark: string;
  operator: string;
}

const emptyReceivableForm: ReceivableForm = {
  billNo: '',
  customerId: '',
  orderId: '',
  billDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  totalAmount: 0,
  remark: ''
};

const emptyReceiptForm: ReceiptForm = {
  receivableId: '',
  receiptNo: '',
  receiptDate: new Date().toISOString().split('T')[0],
  paymentMethod: PaymentMethod.BANK_TRANSFER,
  amount: 0,
  remark: '',
  operator: '销售专员'
};

export const AccountsReceivableManagement: React.FC<AccountsReceivableManagementProps> = ({ className }) => {
  const [receivables, setReceivables] = useState<AccountsReceivable[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showReceivableForm, setShowReceivableForm] = useState(false);
  const [showReceiptForm, setShowReceiptForm] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState<AccountsReceivable | null>(null);
  const [selectedReceivable, setSelectedReceivable] = useState<AccountsReceivable | null>(null);
  const [receivableFormData, setReceivableFormData] = useState<ReceivableForm>(emptyReceivableForm);
  const [receiptFormData, setReceiptFormData] = useState<ReceiptForm>(emptyReceiptForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ReceivableStatus | ''>('');
  const [selectedCustomer, setSelectedCustomer] = useState('');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [receipts, setReceipts] = useState<Receipt[]>([]);
  const [showReceiptHistory, setShowReceiptHistory] = useState(false);

  // 确认对话框状态
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [receivablesData, customersData, statsData] = await Promise.all([
        accountsReceivableService.findAll(),
        customerService.findAll(),
        accountsReceivableService.getReceivableStats()
      ]);
      
      setReceivables(receivablesData);
      setCustomers(customersData);
      setStats(statsData);
    } catch (err) {
      setError('加载应收账款数据失败');
      console.error('Failed to load accounts receivable data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReceivableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingReceivable) {
        await accountsReceivableService.update(editingReceivable.id, {
          ...receivableFormData,
          billDate: new Date(receivableFormData.billDate),
          dueDate: new Date(receivableFormData.dueDate),
          balanceAmount: receivableFormData.totalAmount,
          receivedAmount: 0,
          status: ReceivableStatus.UNPAID
        });
      } else {
        await accountsReceivableService.create({
          ...receivableFormData,
          billDate: new Date(receivableFormData.billDate),
          dueDate: new Date(receivableFormData.dueDate),
          balanceAmount: receivableFormData.totalAmount,
          receivedAmount: 0,
          status: ReceivableStatus.UNPAID
        });
      }
      
      await loadData();
      setShowReceivableForm(false);
      setEditingReceivable(null);
      setReceivableFormData(emptyReceivableForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存应收账款失败');
      console.error('Failed to save accounts receivable:', err);
    }
  };

  const handleReceiptSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await accountsReceivableService.addReceipt({
        ...receiptFormData,
        receiptDate: new Date(receiptFormData.receiptDate)
      });
      
      await loadData();
      setShowReceiptForm(false);
      setReceiptFormData(emptyReceiptForm);
      setSelectedReceivable(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加收款记录失败');
      console.error('Failed to add receipt:', err);
    }
  };

  const handleEditReceivable = (receivable: AccountsReceivable) => {
    setEditingReceivable(receivable);
    setReceivableFormData({
      billNo: receivable.billNo,
      customerId: receivable.customerId,
      orderId: receivable.orderId || '',
      billDate: receivable.billDate.toISOString().split('T')[0],
      dueDate: receivable.dueDate.toISOString().split('T')[0],
      totalAmount: receivable.totalAmount,
      remark: ''
    });
    setShowReceivableForm(true);
  };

  const handleDeleteReceivable = (receivableId: string) => {
    setDeleteTargetId(receivableId);
    setShowConfirmDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;

    try {
      await accountsReceivableService.delete(deleteTargetId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除应收账款失败');
      console.error('Failed to delete accounts receivable:', err);
    } finally {
      setShowConfirmDialog(false);
      setDeleteTargetId(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirmDialog(false);
    setDeleteTargetId(null);
  };

  const handleAddReceipt = async (receivable: AccountsReceivable) => {
    setSelectedReceivable(receivable);
    const receiptNo = await accountsReceivableService.generateReceiptNo();
    setReceiptFormData({
      ...emptyReceiptForm,
      receivableId: receivable.id,
      receiptNo
    });
    setShowReceiptForm(true);
  };

  const handleViewReceipts = async (receivable: AccountsReceivable) => {
    try {
      const receiptHistory = await accountsReceivableService.getReceipts(receivable.id);
      setReceipts(receiptHistory);
      setSelectedReceivable(receivable);
      setShowReceiptHistory(true);
    } catch (err) {
      setError('加载收款记录失败');
      console.error('Failed to load receipts:', err);
    }
  };

  const handleCancel = () => {
    setShowReceivableForm(false);
    setShowReceiptForm(false);
    setShowReceiptHistory(false);
    setEditingReceivable(null);
    setSelectedReceivable(null);
    setReceivableFormData(emptyReceivableForm);
    setReceiptFormData(emptyReceiptForm);
  };

  const handleReceivableInputChange = (field: keyof ReceivableForm, value: any) => {
    setReceivableFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleReceiptInputChange = (field: keyof ReceiptForm, value: any) => {
    setReceiptFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateInvoiceNo = async () => {
    try {
      const billNo = await accountsReceivableService.generateInvoiceNo();
      setReceivableFormData(prev => ({ ...prev, billNo }));
    } catch (err) {
      console.error('Failed to generate invoice number:', err);
    }
  };

  const getStatusText = (status: ReceivableStatus): string => {
    switch (status) {
      case ReceivableStatus.UNPAID: return '未收款';
      case ReceivableStatus.PARTIAL: return '部分收款';
      case ReceivableStatus.PAID: return '已收款';
      default: return status;
    }
  };

  const getStatusClass = (status: ReceivableStatus): string => {
    switch (status) {
      case ReceivableStatus.UNPAID: return 'financial-status-unpaid';
      case ReceivableStatus.PARTIAL: return 'financial-status-partial';
      case ReceivableStatus.PAID: return 'financial-status-paid';
      default: return 'financial-status-default';
    }
  };

  const getReceiptMethodText = (method: PaymentMethod): string => {
    switch (method) {
      case PaymentMethod.CASH: return '现金';
      case PaymentMethod.BANK_TRANSFER: return '银行转账';
      case PaymentMethod.CHECK: return '支票';
      case PaymentMethod.CREDIT_CARD: return '信用卡';
      case PaymentMethod.OTHER: return '其他';
      default: return method;
    }
  };

  const getCustomerName = (customerId: string): string => {
    const customer = customers.find(c => c.id === customerId);
    return customer ? customer.name : '未知客户';
  };

  const isOverdue = (receivable: AccountsReceivable): boolean => {
    return receivable.status !== ReceivableStatus.PAID && new Date(receivable.dueDate) < new Date();
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const filteredReceivables = receivables.filter(receivable => {
    const matchesSearch = !searchTerm || 
      receivable.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getCustomerName(receivable.customerId).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !selectedStatus || receivable.status === selectedStatus;
    const matchesCustomer = !selectedCustomer || receivable.customerId === selectedCustomer;
    const matchesOverdue = !showOverdueOnly || isOverdue(receivable);
    
    return matchesSearch && matchesStatus && matchesCustomer && matchesOverdue;
  });

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 ${className || ''}`}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载应收账款数据中...</p>
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
              应收账款管理
            </h1>
            <p className="mt-1 financial-subtitle">管理客户应收账款和收款记录</p>
          </div>
          <GlassButton
            onClick={() => setShowReceivableForm(true)}
            variant="primary"
          >
            <span className="mr-2">💰</span>
            新建应收账款
          </GlassButton>
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

        {/* 统计信息 */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
            <GlassCard className="text-center p-4">
              <div className="text-2xl mb-2">💰</div>
              <div className="text-2xl font-bold financial-value-total">{stats.total}</div>
              <div className="text-sm financial-description">应收账款总数</div>
            </GlassCard>

            <GlassCard className="text-center p-4">
              <div className="text-2xl mb-2">🔴</div>
              <div className="text-2xl font-bold financial-value-unpaid">{stats.unpaid}</div>
              <div className="text-sm financial-description">未收款</div>
            </GlassCard>

            <GlassCard className="text-center p-4">
              <div className="text-2xl mb-2">🟡</div>
              <div className="text-2xl font-bold financial-value-partial">{stats.partial}</div>
              <div className="text-sm financial-description">部分收款</div>
            </GlassCard>

            <GlassCard className="text-center p-4">
              <div className="text-2xl mb-2">🟢</div>
              <div className="text-2xl font-bold financial-value-paid">{stats.paid}</div>
              <div className="text-sm financial-description">已收款</div>
            </GlassCard>

            <GlassCard className="text-center p-4">
              <div className="text-2xl mb-2">⚠️</div>
              <div className="text-2xl font-bold financial-value-overdue">{stats.overdue}</div>
              <div className="text-sm financial-description">逾期账款</div>
            </GlassCard>

            <GlassCard className="text-center p-4">
              <div className="text-2xl mb-2">💵</div>
              <div className="text-2xl font-bold financial-value-balance">¥{(stats.balanceAmount / 10000).toFixed(1)}万</div>
              <div className="text-sm financial-description">应收余额</div>
            </GlassCard>
          </div>
        )}

        {/* 筛选条件 */}
        <GlassCard>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            <div>
              <label className="block text-sm font-medium financial-label mb-2">搜索账款</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 financial-icon">🔍</span>
                <GlassInput
                  type="text"
                  placeholder="搜索发票号、客户..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium financial-label mb-2">收款状态</label>
              <GlassSelect
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as ReceivableStatus)}
              >
                <option value="">全部状态</option>
                <option value={ReceivableStatus.UNPAID}>未收款</option>
                <option value={ReceivableStatus.PARTIAL}>部分收款</option>
                <option value={ReceivableStatus.PAID}>已收款</option>
              </GlassSelect>
            </div>

            <div>
              <label className="block text-sm font-medium financial-label mb-2">客户</label>
              <GlassSelect
                value={selectedCustomer}
                onChange={(e) => setSelectedCustomer(e.target.value)}
              >
                <option value="">全部客户</option>
                {customers.map(customer => (
                  <option key={customer.id} value={customer.id}>
                    {customer.name}
                  </option>
                ))}
              </GlassSelect>
            </div>

            <div className="flex items-end">
              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showOverdueOnly}
                  onChange={(e) => setShowOverdueOnly(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span>只显示逾期账款</span>
              </label>
            </div>
          </div>
        </GlassCard>

        {/* 应收账款列表 */}
        <GlassCard>
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold financial-title">应收账款列表</h3>
              <span className="text-sm financial-subtitle">共 {filteredReceivables.length} 个账款</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium financial-table-header uppercase tracking-wider">发票信息</th>
                  <th className="px-6 py-3 text-left text-xs font-medium financial-table-header uppercase tracking-wider">客户</th>
                  <th className="px-6 py-3 text-left text-xs font-medium financial-table-header uppercase tracking-wider">发票日期</th>
                  <th className="px-6 py-3 text-left text-xs font-medium financial-table-header uppercase tracking-wider">到期日期</th>
                  <th className="px-6 py-3 text-left text-xs font-medium financial-table-header uppercase tracking-wider">总金额</th>
                  <th className="px-6 py-3 text-left text-xs font-medium financial-table-header uppercase tracking-wider">已收金额</th>
                  <th className="px-6 py-3 text-left text-xs font-medium financial-table-header uppercase tracking-wider">余额</th>
                  <th className="px-6 py-3 text-left text-xs font-medium financial-table-header uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium financial-table-header uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {filteredReceivables.map(receivable => (
                  <tr key={receivable.id} className={`hover:bg-white/50 transition-colors ${isOverdue(receivable) ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium financial-text">{receivable.billNo}</div>
                        {receivable.orderId && (
                          <div className="text-sm financial-subtitle">销售订单: {receivable.orderId}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="financial-text">{getCustomerName(receivable.customerId)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap financial-text">
                      {formatDate(receivable.billDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={isOverdue(receivable) ? 'financial-value-overdue' : 'financial-text'}>
                        {formatDate(receivable.dueDate)}
                        {isOverdue(receivable) && <span className="ml-1">⚠️</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap financial-value-total">
                      ¥{receivable.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap financial-value-paid">
                      ¥{receivable.receivedAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium financial-value-balance">¥{receivable.balanceAmount.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusClass(receivable.status)}`}>
                        {getStatusText(receivable.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditReceivable(receivable)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        
                        {receivable.status !== ReceivableStatus.PAID && (
                          <button 
                            onClick={() => handleAddReceipt(receivable)}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="添加收款"
                          >
                            💰
                          </button>
                        )}
                        
                        <button 
                          onClick={() => handleViewReceipts(receivable)}
                          className="text-purple-600 hover:text-purple-800 transition-colors"
                          title="收款记录"
                        >
                          📋
                        </button>
                        
                        <button 
                          onClick={() => handleDeleteReceivable(receivable.id)}
                          className="text-red-600 hover:text-red-800 transition-colors"
                          title="删除"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filteredReceivables.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-lg font-medium financial-title mb-2">没有找到应收账款</h3>
                <p className="financial-subtitle">请调整搜索条件或创建新的应收账款</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* 应收账款表单模态框 */}
        {showReceivableForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9998]">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <h3 className="text-xl font-semibold financial-title">
                  {editingReceivable ? '编辑应收账款' : '新建应收账款'}
                </h3>
                <button
                  type="button"
                  onClick={handleCancel}
                  className="financial-icon hover:opacity-70 transition-opacity"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleReceivableSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">发票编号 *</label>
                    <div className="flex space-x-2">
                      <GlassInput
                        type="text"
                        value={receivableFormData.billNo}
                        onChange={(e) => handleReceivableInputChange('billNo', e.target.value)}
                        placeholder="输入发票编号"
                        required
                        className="flex-1"
                      />
                      {!editingReceivable && (
                        <button
                          type="button"
                          onClick={generateInvoiceNo}
                          className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                          title="自动生成编号"
                        >
                          🔄
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">客户 *</label>
                    <GlassSelect
                      value={receivableFormData.customerId}
                      onChange={(e) => handleReceivableInputChange('customerId', e.target.value)}
                      required
                    >
                      <option value="">请选择客户</option>
                      {customers.map(customer => (
                        <option key={customer.id} value={customer.id}>
                          {customer.name} ({customer.code})
                        </option>
                      ))}
                    </GlassSelect>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">关联销售订单</label>
                    <GlassInput
                      type="text"
                      value={receivableFormData.orderId}
                      onChange={(e) => handleReceivableInputChange('orderId', e.target.value)}
                      placeholder="销售订单编号（可选）"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">发票日期 *</label>
                    <GlassInput
                      type="date"
                      value={receivableFormData.billDate}
                      onChange={(e) => handleReceivableInputChange('billDate', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">到期日期 *</label>
                    <GlassInput
                      type="date"
                      value={receivableFormData.dueDate}
                      onChange={(e) => handleReceivableInputChange('dueDate', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">总金额 *</label>
                    <GlassInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={receivableFormData.totalAmount}
                      onChange={(e) => handleReceivableInputChange('totalAmount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">备注</label>
                  <textarea
                    value={receivableFormData.remark}
                    onChange={(e) => handleReceivableInputChange('remark', e.target.value)}
                    placeholder="备注信息"
                    rows={3}
                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <GlassButton 
                    type="button" 
                    onClick={handleCancel}
                    className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    取消
                  </GlassButton>
                  <GlassButton 
                    type="submit"
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
                  >
                    {editingReceivable ? '更新账款' : '创建账款'}
                  </GlassButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 收款记录表单模态框 */}
        {showReceiptForm && selectedReceivable && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9998]">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <h3 className="text-xl font-semibold text-gray-800">添加收款记录</h3>
                <button 
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 border-b border-white/20">
                <h4 className="font-medium text-gray-800 mb-3">应收账款信息</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">发票编号:</span>
                    <span className="ml-2 font-medium">{selectedReceivable.billNo}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">客户:</span>
                    <span className="ml-2 font-medium">{getCustomerName(selectedReceivable.customerId)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">总金额:</span>
                    <span className="ml-2 font-medium">¥{selectedReceivable.totalAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">已收金额:</span>
                    <span className="ml-2 font-medium">¥{selectedReceivable.receivedAmount.toLocaleString()}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">剩余金额:</span>
                    <span className="ml-2 font-medium text-green-600">¥{selectedReceivable.balanceAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handleReceiptSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">收款单号 *</label>
                    <GlassInput
                      type="text"
                      value={receiptFormData.receiptNo}
                      onChange={(e) => handleReceiptInputChange('receiptNo', e.target.value)}
                      required
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">收款日期 *</label>
                    <GlassInput
                      type="date"
                      value={receiptFormData.receiptDate}
                      onChange={(e) => handleReceiptInputChange('receiptDate', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">收款方式 *</label>
                    <GlassSelect
                      value={receiptFormData.paymentMethod}
                      onChange={(e) => handleReceiptInputChange('paymentMethod', e.target.value as PaymentMethod)}
                      required
                    >
                      <option value={PaymentMethod.BANK_TRANSFER}>银行转账</option>
                      <option value={PaymentMethod.CASH}>现金</option>
                      <option value={PaymentMethod.CHECK}>支票</option>
                      <option value={PaymentMethod.CREDIT_CARD}>信用卡</option>
                      <option value={PaymentMethod.OTHER}>其他</option>
                    </GlassSelect>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">收款金额 *</label>
                    <GlassInput
                      type="number"
                      min="0.01"
                      max={selectedReceivable.balanceAmount}
                      step="0.01"
                      value={receiptFormData.amount}
                      onChange={(e) => handleReceiptInputChange('amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      required
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      最大金额: ¥{selectedReceivable.balanceAmount.toLocaleString()}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">经办人 *</label>
                    <GlassInput
                      type="text"
                      value={receiptFormData.operator}
                      onChange={(e) => handleReceiptInputChange('operator', e.target.value)}
                      placeholder="经办人姓名"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">备注</label>
                  <textarea
                    value={receiptFormData.remark}
                    onChange={(e) => handleReceiptInputChange('remark', e.target.value)}
                    placeholder="收款备注"
                    rows={3}
                    className="w-full px-4 py-3 bg-white/50 backdrop-blur-sm border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <GlassButton 
                    type="button" 
                    onClick={handleCancel}
                    className="bg-gray-100 text-gray-700 hover:bg-gray-200"
                  >
                    取消
                  </GlassButton>
                  <GlassButton 
                    type="submit"
                    className="bg-gradient-to-r from-green-500 to-blue-600 text-white hover:from-green-600 hover:to-blue-700"
                  >
                    确认收款
                  </GlassButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 收款记录查看模态框 */}
        {showReceiptHistory && selectedReceivable && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9998]">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <h3 className="text-xl font-semibold text-gray-800">
                  收款记录 - {selectedReceivable.billNo}
                </h3>
                <button 
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 border-b border-white/20">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">客户:</span>
                    <span className="ml-2 font-medium">{getCustomerName(selectedReceivable.customerId)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">总金额:</span>
                    <span className="ml-2 font-medium">¥{selectedReceivable.totalAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">已收金额:</span>
                    <span className="ml-2 font-medium">¥{selectedReceivable.receivedAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">剩余金额:</span>
                    <span className="ml-2 font-medium text-green-600">¥{selectedReceivable.balanceAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {receipts.length > 0 ? (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-4">收款记录明细</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50/50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">收款单号</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">收款日期</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">收款方式</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">收款金额</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">经办人</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">备注</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200/50">
                          {receipts.map(receipt => (
                            <tr key={receipt.id} className="hover:bg-white/50 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-900">{receipt.receiptNo}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{formatDate(receipt.receiptDate)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{getReceiptMethodText(receipt.paymentMethod)}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">¥{receipt.amount.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{receipt.operator}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{receipt.remark || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">💰</div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">暂无收款记录</h4>
                    <p className="text-gray-500">该应收账款还没有收款记录</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="删除应收账款"
        message="确定要删除这个应收账款吗？删除后无法恢复！"
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};

export default AccountsReceivableManagement;