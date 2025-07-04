import React, { useState, useEffect } from 'react';
import accountsPayableService from '../../services/business/accountsPayableService';
import { supplierService } from '../../services/business';
import { AccountsPayable, Payment, PayableStatus, PaymentMethod, Supplier } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';

interface AccountsPayableManagementProps {
  className?: string;
}

interface PayableForm {
  billNo: string;
  supplierId: string;
  orderId: string;
  billDate: string;
  dueDate: string;
  totalAmount: number;
  remark: string;
}

interface PaymentForm {
  payableId: string;
  paymentNo: string;
  paymentDate: string;
  paymentMethod: PaymentMethod;
  amount: number;
  remark: string;
  operator: string;
}

const emptyPayableForm: PayableForm = {
  billNo: '',
  supplierId: '',
  orderId: '',
  billDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  totalAmount: 0,
  remark: ''
};

const emptyPaymentForm: PaymentForm = {
  payableId: '',
  paymentNo: '',
  paymentDate: new Date().toISOString().split('T')[0],
  paymentMethod: PaymentMethod.BANK_TRANSFER,
  amount: 0,
  remark: '',
  operator: '财务专员'
};

export const AccountsPayableManagementTailwind: React.FC<AccountsPayableManagementProps> = ({ className }) => {
  const [payables, setPayables] = useState<AccountsPayable[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPayableForm, setShowPayableForm] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [editingPayable, setEditingPayable] = useState<AccountsPayable | null>(null);
  const [selectedPayable, setSelectedPayable] = useState<AccountsPayable | null>(null);
  const [payableFormData, setPayableFormData] = useState<PayableForm>(emptyPayableForm);
  const [paymentFormData, setPaymentFormData] = useState<PaymentForm>(emptyPaymentForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<PayableStatus | ''>('');
  const [selectedSupplier, setSelectedSupplier] = useState('');
  const [showOverdueOnly, setShowOverdueOnly] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [payablesData, suppliersData, statsData] = await Promise.all([
        accountsPayableService.findAll(),
        supplierService.findAll(),
        accountsPayableService.getPayableStats()
      ]);
      
      setPayables(payablesData);
      setSuppliers(suppliersData);
      setStats(statsData);
    } catch (err) {
      setError('加载应付账款数据失败');
      console.error('Failed to load accounts payable data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePayableSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingPayable) {
        await accountsPayableService.update(editingPayable.id, {
          ...payableFormData,
          billDate: new Date(payableFormData.billDate),
          dueDate: new Date(payableFormData.dueDate),
          balanceAmount: payableFormData.totalAmount,
          paidAmount: 0,
          status: PayableStatus.UNPAID
        });
      } else {
        await accountsPayableService.create({
          ...payableFormData,
          billDate: new Date(payableFormData.billDate),
          dueDate: new Date(payableFormData.dueDate),
          balanceAmount: payableFormData.totalAmount,
          paidAmount: 0,
          status: PayableStatus.UNPAID
        });
      }
      
      await loadData();
      setShowPayableForm(false);
      setEditingPayable(null);
      setPayableFormData(emptyPayableForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存应付账款失败');
      console.error('Failed to save accounts payable:', err);
    }
  };

  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      await accountsPayableService.addPayment({
        ...paymentFormData,
        paymentDate: new Date(paymentFormData.paymentDate)
      });
      
      await loadData();
      setShowPaymentForm(false);
      setPaymentFormData(emptyPaymentForm);
      setSelectedPayable(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加付款记录失败');
      console.error('Failed to add payment:', err);
    }
  };

  const handleEditPayable = (payable: AccountsPayable) => {
    setEditingPayable(payable);
    setPayableFormData({
      billNo: payable.billNo,
      supplierId: payable.supplierId,
      orderId: payable.orderId || '',
      billDate: payable.billDate.toISOString().split('T')[0],
      dueDate: payable.dueDate.toISOString().split('T')[0],
      totalAmount: payable.totalAmount,
      remark: ''
    });
    setShowPayableForm(true);
  };

  const handleDeletePayable = async (payableId: string) => {
    if (!confirm('确定要删除这个应付账款吗？删除后无法恢复！')) return;
    
    try {
      await accountsPayableService.delete(payableId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除应付账款失败');
      console.error('Failed to delete accounts payable:', err);
    }
  };

  const handleAddPayment = async (payable: AccountsPayable) => {
    setSelectedPayable(payable);
    const paymentNo = await accountsPayableService.generatePaymentNo();
    setPaymentFormData({
      ...emptyPaymentForm,
      payableId: payable.id,
      paymentNo
    });
    setShowPaymentForm(true);
  };

  const handleViewPayments = async (payable: AccountsPayable) => {
    try {
      const paymentHistory = await accountsPayableService.getPayments(payable.id);
      setPayments(paymentHistory);
      setSelectedPayable(payable);
      setShowPaymentHistory(true);
    } catch (err) {
      setError('加载付款记录失败');
      console.error('Failed to load payments:', err);
    }
  };

  const handleCancel = () => {
    setShowPayableForm(false);
    setShowPaymentForm(false);
    setShowPaymentHistory(false);
    setEditingPayable(null);
    setSelectedPayable(null);
    setPayableFormData(emptyPayableForm);
    setPaymentFormData(emptyPaymentForm);
  };

  const handlePayableInputChange = (field: keyof PayableForm, value: any) => {
    setPayableFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePaymentInputChange = (field: keyof PaymentForm, value: any) => {
    setPaymentFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateBillNo = async () => {
    try {
      const billNo = await accountsPayableService.generateBillNo();
      setPayableFormData(prev => ({ ...prev, billNo }));
    } catch (err) {
      console.error('Failed to generate bill number:', err);
    }
  };

  const getStatusText = (status: PayableStatus): string => {
    switch (status) {
      case PayableStatus.UNPAID: return '未付款';
      case PayableStatus.PARTIAL: return '部分付款';
      case PayableStatus.PAID: return '已付款';
      default: return status;
    }
  };

  const getStatusClass = (status: PayableStatus): string => {
    switch (status) {
      case PayableStatus.UNPAID: return 'text-red-600 bg-red-50 border-red-200';
      case PayableStatus.PARTIAL: return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case PayableStatus.PAID: return 'text-green-600 bg-green-50 border-green-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
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

  const getSupplierName = (supplierId: string): string => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : '未知供应商';
  };

  const isOverdue = (payable: AccountsPayable): boolean => {
    return payable.status !== PayableStatus.PAID && new Date(payable.dueDate) < new Date();
  };

  const formatDate = (date: Date): string => {
    return new Date(date).toLocaleDateString('zh-CN');
  };

  const filteredPayables = payables.filter(payable => {
    const matchesSearch = !searchTerm || 
      payable.billNo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      getSupplierName(payable.supplierId).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !selectedStatus || payable.status === selectedStatus;
    const matchesSupplier = !selectedSupplier || payable.supplierId === selectedSupplier;
    const matchesOverdue = !showOverdueOnly || isOverdue(payable);
    
    return matchesSearch && matchesStatus && matchesSupplier && matchesOverdue;
  });

  if (loading) {
    return (
      <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 ${className || ''}`}>
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">加载应付账款数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 ${className || ''}`}>
      <div className="p-6 space-y-6">
        {/* 页面头部 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              应付账款管理
            </h1>
            <p className="text-gray-600 mt-1">管理供应商应付账款和付款记录</p>
          </div>
          <GlassButton 
            onClick={() => setShowPayableForm(true)}
            className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
          >
            <span className="mr-2">💰</span>
            新建应付账款
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
              <div className="text-2xl font-bold text-blue-600">{stats.total}</div>
              <div className="text-sm text-gray-600">应付账款总数</div>
            </GlassCard>
            
            <GlassCard className="text-center p-4">
              <div className="text-2xl mb-2">🔴</div>
              <div className="text-2xl font-bold text-red-600">{stats.unpaid}</div>
              <div className="text-sm text-gray-600">未付款</div>
            </GlassCard>
            
            <GlassCard className="text-center p-4">
              <div className="text-2xl mb-2">🟡</div>
              <div className="text-2xl font-bold text-yellow-600">{stats.partial}</div>
              <div className="text-sm text-gray-600">部分付款</div>
            </GlassCard>
            
            <GlassCard className="text-center p-4">
              <div className="text-2xl mb-2">🟢</div>
              <div className="text-2xl font-bold text-green-600">{stats.paid}</div>
              <div className="text-sm text-gray-600">已付款</div>
            </GlassCard>

            <GlassCard className="text-center p-4">
              <div className="text-2xl mb-2">⚠️</div>
              <div className="text-2xl font-bold text-orange-600">{stats.overdue}</div>
              <div className="text-sm text-gray-600">逾期账款</div>
            </GlassCard>

            <GlassCard className="text-center p-4">
              <div className="text-2xl mb-2">💵</div>
              <div className="text-2xl font-bold text-purple-600">¥{(stats.balanceAmount / 10000).toFixed(1)}万</div>
              <div className="text-sm text-gray-600">应付余额</div>
            </GlassCard>
          </div>
        )}

        {/* 筛选条件 */}
        <GlassCard>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">搜索账款</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                <GlassInput
                  type="text"
                  placeholder="搜索账单号、供应商..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">付款状态</label>
              <GlassSelect
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as PayableStatus)}
              >
                <option value="">全部状态</option>
                <option value={PayableStatus.UNPAID}>未付款</option>
                <option value={PayableStatus.PARTIAL}>部分付款</option>
                <option value={PayableStatus.PAID}>已付款</option>
              </GlassSelect>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">供应商</label>
              <GlassSelect
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
              >
                <option value="">全部供应商</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>
                    {supplier.name}
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

        {/* 应付账款列表 */}
        <GlassCard>
          <div className="p-4 border-b border-white/20">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-800">应付账款列表</h3>
              <span className="text-sm text-gray-600">共 {filteredPayables.length} 个账款</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">账单信息</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">供应商</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">账单日期</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">到期日期</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">总金额</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">已付金额</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">余额</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200/50">
                {filteredPayables.map(payable => (
                  <tr key={payable.id} className={`hover:bg-white/50 transition-colors ${isOverdue(payable) ? 'bg-red-50/30' : ''}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="font-medium text-gray-900">{payable.billNo}</div>
                        {payable.orderId && (
                          <div className="text-sm text-gray-500">采购订单: {payable.orderId}</div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-gray-900">{getSupplierName(payable.supplierId)}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      {formatDate(payable.billDate)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={isOverdue(payable) ? 'text-red-600' : 'text-gray-900'}>
                        {formatDate(payable.dueDate)}
                        {isOverdue(payable) && <span className="ml-1">⚠️</span>}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      ¥{payable.totalAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-gray-900">
                      ¥{payable.paidAmount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="font-medium text-gray-900">¥{payable.balanceAmount.toLocaleString()}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusClass(payable.status)}`}>
                        {getStatusText(payable.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditPayable(payable)}
                          className="text-blue-600 hover:text-blue-800 transition-colors"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        
                        {payable.status !== PayableStatus.PAID && (
                          <button 
                            onClick={() => handleAddPayment(payable)}
                            className="text-green-600 hover:text-green-800 transition-colors"
                            title="添加付款"
                          >
                            💰
                          </button>
                        )}
                        
                        <button 
                          onClick={() => handleViewPayments(payable)}
                          className="text-purple-600 hover:text-purple-800 transition-colors"
                          title="付款记录"
                        >
                          📋
                        </button>
                        
                        <button 
                          onClick={() => handleDeletePayable(payable.id)}
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

            {filteredPayables.length === 0 && (
              <div className="text-center py-12">
                <div className="text-4xl mb-4">💰</div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">没有找到应付账款</h3>
                <p className="text-gray-500">请调整搜索条件或创建新的应付账款</p>
              </div>
            )}
          </div>
        </GlassCard>

        {/* 应付账款表单模态框 */}
        {showPayableForm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <h3 className="text-xl font-semibold text-gray-800">
                  {editingPayable ? '编辑应付账款' : '新建应付账款'}
                </h3>
                <button 
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handlePayableSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">账单编号 *</label>
                    <div className="flex space-x-2">
                      <GlassInput
                        type="text"
                        value={payableFormData.billNo}
                        onChange={(e) => handlePayableInputChange('billNo', e.target.value)}
                        placeholder="输入账单编号"
                        required
                        className="flex-1"
                      />
                      {!editingPayable && (
                        <button
                          type="button"
                          onClick={generateBillNo}
                          className="px-3 py-2 bg-blue-100 text-blue-600 rounded-lg hover:bg-blue-200 transition-colors"
                          title="自动生成编号"
                        >
                          🔄
                        </button>
                      )}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">供应商 *</label>
                    <GlassSelect
                      value={payableFormData.supplierId}
                      onChange={(e) => handlePayableInputChange('supplierId', e.target.value)}
                      required
                    >
                      <option value="">请选择供应商</option>
                      {suppliers.map(supplier => (
                        <option key={supplier.id} value={supplier.id}>
                          {supplier.name} ({supplier.code})
                        </option>
                      ))}
                    </GlassSelect>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">关联采购订单</label>
                    <GlassInput
                      type="text"
                      value={payableFormData.orderId}
                      onChange={(e) => handlePayableInputChange('orderId', e.target.value)}
                      placeholder="采购订单编号（可选）"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">账单日期 *</label>
                    <GlassInput
                      type="date"
                      value={payableFormData.billDate}
                      onChange={(e) => handlePayableInputChange('billDate', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">到期日期 *</label>
                    <GlassInput
                      type="date"
                      value={payableFormData.dueDate}
                      onChange={(e) => handlePayableInputChange('dueDate', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">总金额 *</label>
                    <GlassInput
                      type="number"
                      min="0"
                      step="0.01"
                      value={payableFormData.totalAmount}
                      onChange={(e) => handlePayableInputChange('totalAmount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">备注</label>
                  <textarea
                    value={payableFormData.remark}
                    onChange={(e) => handlePayableInputChange('remark', e.target.value)}
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
                    {editingPayable ? '更新账款' : '创建账款'}
                  </GlassButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 付款记录表单模态框 */}
        {showPaymentForm && selectedPayable && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <h3 className="text-xl font-semibold text-gray-800">添加付款记录</h3>
                <button 
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 border-b border-white/20">
                <h4 className="font-medium text-gray-800 mb-3">应付账款信息</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">账单编号:</span>
                    <span className="ml-2 font-medium">{selectedPayable.billNo}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">供应商:</span>
                    <span className="ml-2 font-medium">{getSupplierName(selectedPayable.supplierId)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">总金额:</span>
                    <span className="ml-2 font-medium">¥{selectedPayable.totalAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">已付金额:</span>
                    <span className="ml-2 font-medium">¥{selectedPayable.paidAmount.toLocaleString()}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-gray-600">剩余金额:</span>
                    <span className="ml-2 font-medium text-red-600">¥{selectedPayable.balanceAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePaymentSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">付款单号 *</label>
                    <GlassInput
                      type="text"
                      value={paymentFormData.paymentNo}
                      onChange={(e) => handlePaymentInputChange('paymentNo', e.target.value)}
                      required
                      readOnly
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">付款日期 *</label>
                    <GlassInput
                      type="date"
                      value={paymentFormData.paymentDate}
                      onChange={(e) => handlePaymentInputChange('paymentDate', e.target.value)}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">付款方式 *</label>
                    <GlassSelect
                      value={paymentFormData.paymentMethod}
                      onChange={(e) => handlePaymentInputChange('paymentMethod', e.target.value as PaymentMethod)}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">付款金额 *</label>
                    <GlassInput
                      type="number"
                      min="0.01"
                      max={selectedPayable.balanceAmount}
                      step="0.01"
                      value={paymentFormData.amount}
                      onChange={(e) => handlePaymentInputChange('amount', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                      required
                    />
                    <div className="text-xs text-gray-500 mt-1">
                      最大金额: ¥{selectedPayable.balanceAmount.toLocaleString()}
                    </div>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">经办人 *</label>
                    <GlassInput
                      type="text"
                      value={paymentFormData.operator}
                      onChange={(e) => handlePaymentInputChange('operator', e.target.value)}
                      placeholder="经办人姓名"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">备注</label>
                  <textarea
                    value={paymentFormData.remark}
                    onChange={(e) => handlePaymentInputChange('remark', e.target.value)}
                    placeholder="付款备注"
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
                    确认付款
                  </GlassButton>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* 付款记录查看模态框 */}
        {showPaymentHistory && selectedPayable && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
            <div className="bg-white/90 backdrop-blur-md rounded-2xl shadow-xl border border-white/20 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-white/20">
                <h3 className="text-xl font-semibold text-gray-800">
                  付款记录 - {selectedPayable.billNo}
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
                    <span className="text-gray-600">供应商:</span>
                    <span className="ml-2 font-medium">{getSupplierName(selectedPayable.supplierId)}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">总金额:</span>
                    <span className="ml-2 font-medium">¥{selectedPayable.totalAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">已付金额:</span>
                    <span className="ml-2 font-medium">¥{selectedPayable.paidAmount.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-600">剩余金额:</span>
                    <span className="ml-2 font-medium text-red-600">¥{selectedPayable.balanceAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              <div className="p-6">
                {payments.length > 0 ? (
                  <div>
                    <h4 className="font-medium text-gray-800 mb-4">付款记录明细</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50/50">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">付款单号</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">付款日期</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">付款方式</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">付款金额</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">经办人</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">备注</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200/50">
                          {payments.map(payment => (
                            <tr key={payment.id} className="hover:bg-white/50 transition-colors">
                              <td className="px-4 py-3 text-sm text-gray-900">{payment.paymentNo}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{formatDate(payment.paymentDate)}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{getPaymentMethodText(payment.paymentMethod)}</td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900">¥{payment.amount.toLocaleString()}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{payment.operator}</td>
                              <td className="px-4 py-3 text-sm text-gray-900">{payment.remark || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">💰</div>
                    <h4 className="text-lg font-medium text-gray-900 mb-2">暂无付款记录</h4>
                    <p className="text-gray-500">该应付账款还没有付款记录</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AccountsPayableManagementTailwind;