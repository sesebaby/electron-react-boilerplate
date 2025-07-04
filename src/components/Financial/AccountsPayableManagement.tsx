import React, { useState, useEffect } from 'react';
import accountsPayableService from '../../services/business/accountsPayableService';
import { supplierService } from '../../services/business';
import { AccountsPayable, Payment, PayableStatus, PaymentMethod, Supplier } from '../../types/entities';

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

export const AccountsPayableManagement: React.FC<AccountsPayableManagementProps> = ({ className }) => {
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
      case PayableStatus.UNPAID: return 'status-unpaid';
      case PayableStatus.PARTIAL: return 'status-partial';
      case PayableStatus.PAID: return 'status-paid';
      default: return '';
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
      <div className={`accounts-payable-management ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载应付账款数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`accounts-payable-management ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>应付账款管理</h2>
          <p>管理供应商应付账款和付款记录</p>
        </div>
        <div className="header-actions">
          <button 
            className="glass-button primary"
            onClick={() => setShowPayableForm(true)}
          >
            <span className="button-icon">💰</span>
            新建应付账款
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

      {/* 统计信息 */}
      {stats && (
        <div className="statistics-section">
          <div className="statistics-grid">
            <div className="stat-item total">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">应付账款总数</div>
              </div>
            </div>
            
            <div className="stat-item unpaid">
              <div className="stat-icon">🔴</div>
              <div className="stat-content">
                <div className="stat-value">{stats.unpaid}</div>
                <div className="stat-label">未付款</div>
              </div>
            </div>
            
            <div className="stat-item partial">
              <div className="stat-icon">🟡</div>
              <div className="stat-content">
                <div className="stat-value">{stats.partial}</div>
                <div className="stat-label">部分付款</div>
              </div>
            </div>
            
            <div className="stat-item paid">
              <div className="stat-icon">🟢</div>
              <div className="stat-content">
                <div className="stat-value">{stats.paid}</div>
                <div className="stat-label">已付款</div>
              </div>
            </div>

            <div className="stat-item overdue">
              <div className="stat-icon">⚠️</div>
              <div className="stat-content">
                <div className="stat-value">{stats.overdue}</div>
                <div className="stat-label">逾期账款</div>
              </div>
            </div>

            <div className="stat-item amount">
              <div className="stat-icon">💵</div>
              <div className="stat-content">
                <div className="stat-value">¥{(stats.balanceAmount / 10000).toFixed(1)}万</div>
                <div className="stat-label">应付余额</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 筛选条件 */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>搜索账款</label>
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="搜索账单号、供应商..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label>付款状态</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as PayableStatus)}
              className="glass-select"
            >
              <option value="">全部状态</option>
              <option value={PayableStatus.UNPAID}>未付款</option>
              <option value={PayableStatus.PARTIAL}>部分付款</option>
              <option value={PayableStatus.PAID}>已付款</option>
            </select>
          </div>

          <div className="filter-group">
            <label>供应商</label>
            <select
              value={selectedSupplier}
              onChange={(e) => setSelectedSupplier(e.target.value)}
              className="glass-select"
            >
              <option value="">全部供应商</option>
              {suppliers.map(supplier => (
                <option key={supplier.id} value={supplier.id}>
                  {supplier.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>
              <input
                type="checkbox"
                checked={showOverdueOnly}
                onChange={(e) => setShowOverdueOnly(e.target.checked)}
                className="glass-checkbox"
              />
              只显示逾期账款
            </label>
          </div>
        </div>
      </div>

      {/* 应付账款列表 */}
      <div className="content-section">
        <div className="section-header">
          <h3>应付账款列表</h3>
          <span className="item-count">共 {filteredPayables.length} 个账款</span>
        </div>

        <div className="glass-table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>账单信息</th>
                <th>供应商</th>
                <th>账单日期</th>
                <th>到期日期</th>
                <th>总金额</th>
                <th>已付金额</th>
                <th>余额</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredPayables.map(payable => (
                <tr key={payable.id} className={isOverdue(payable) ? 'payable-overdue' : ''}>
                  <td className="bill-info-cell">
                    <div className="bill-info">
                      <div className="bill-no">{payable.billNo}</div>
                      {payable.orderId && (
                        <div className="order-ref">采购订单: {payable.orderId}</div>
                      )}
                    </div>
                  </td>
                  <td className="supplier-cell">
                    <div className="supplier-info">
                      <div className="supplier-name">{getSupplierName(payable.supplierId)}</div>
                    </div>
                  </td>
                  <td className="date-cell">
                    {formatDate(payable.billDate)}
                  </td>
                  <td className="date-cell">
                    <div className={isOverdue(payable) ? 'date-overdue' : ''}>
                      {formatDate(payable.dueDate)}
                      {isOverdue(payable) && <span className="overdue-indicator">⚠️</span>}
                    </div>
                  </td>
                  <td className="amount-cell">
                    ¥{payable.totalAmount.toLocaleString()}
                  </td>
                  <td className="amount-cell">
                    ¥{payable.paidAmount.toLocaleString()}
                  </td>
                  <td className="amount-cell">
                    <div className="balance-amount">¥{payable.balanceAmount.toLocaleString()}</div>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(payable.status)}`}>
                      {getStatusText(payable.status)}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="action-btn edit"
                      onClick={() => handleEditPayable(payable)}
                      title="编辑"
                    >
                      ✏️
                    </button>
                    
                    {payable.status !== PayableStatus.PAID && (
                      <button 
                        className="action-btn payment"
                        onClick={() => handleAddPayment(payable)}
                        title="添加付款"
                      >
                        💰
                      </button>
                    )}
                    
                    <button 
                      className="action-btn history"
                      onClick={() => handleViewPayments(payable)}
                      title="付款记录"
                    >
                      📋
                    </button>
                    
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDeletePayable(payable.id)}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredPayables.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">💰</div>
              <h3>没有找到应付账款</h3>
              <p>请调整搜索条件或创建新的应付账款</p>
            </div>
          )}
        </div>
      </div>

      {/* 应付账款表单模态框 */}
      {showPayableForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingPayable ? '编辑应付账款' : '新建应付账款'}</h3>
              <button className="close-btn" onClick={handleCancel}>✕</button>
            </div>

            <form onSubmit={handlePayableSubmit} className="payable-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>账单编号 *</label>
                  <div className="input-with-button">
                    <input
                      type="text"
                      value={payableFormData.billNo}
                      onChange={(e) => handlePayableInputChange('billNo', e.target.value)}
                      className="glass-input"
                      placeholder="输入账单编号"
                      required
                    />
                    {!editingPayable && (
                      <button
                        type="button"
                        className="generate-btn"
                        onClick={generateBillNo}
                        title="自动生成编号"
                      >
                        🔄
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>供应商 *</label>
                  <select
                    value={payableFormData.supplierId}
                    onChange={(e) => handlePayableInputChange('supplierId', e.target.value)}
                    className="glass-select"
                    required
                  >
                    <option value="">请选择供应商</option>
                    {suppliers.map(supplier => (
                      <option key={supplier.id} value={supplier.id}>
                        {supplier.name} ({supplier.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>关联采购订单</label>
                  <input
                    type="text"
                    value={payableFormData.orderId}
                    onChange={(e) => handlePayableInputChange('orderId', e.target.value)}
                    className="glass-input"
                    placeholder="采购订单编号（可选）"
                  />
                </div>

                <div className="form-group">
                  <label>账单日期 *</label>
                  <input
                    type="date"
                    value={payableFormData.billDate}
                    onChange={(e) => handlePayableInputChange('billDate', e.target.value)}
                    className="glass-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>到期日期 *</label>
                  <input
                    type="date"
                    value={payableFormData.dueDate}
                    onChange={(e) => handlePayableInputChange('dueDate', e.target.value)}
                    className="glass-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>总金额 *</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={payableFormData.totalAmount}
                    onChange={(e) => handlePayableInputChange('totalAmount', parseFloat(e.target.value) || 0)}
                    className="glass-input"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>备注</label>
                  <textarea
                    value={payableFormData.remark}
                    onChange={(e) => handlePayableInputChange('remark', e.target.value)}
                    className="glass-textarea"
                    placeholder="备注信息"
                    rows={3}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="glass-button secondary">
                  取消
                </button>
                <button type="submit" className="glass-button primary">
                  {editingPayable ? '更新账款' : '创建账款'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 付款记录表单模态框 */}
      {showPaymentForm && selectedPayable && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>添加付款记录</h3>
              <button className="close-btn" onClick={handleCancel}>✕</button>
            </div>

            <div className="payable-summary">
              <h4>应付账款信息</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="label">账单编号:</span>
                  <span className="value">{selectedPayable.billNo}</span>
                </div>
                <div className="summary-item">
                  <span className="label">供应商:</span>
                  <span className="value">{getSupplierName(selectedPayable.supplierId)}</span>
                </div>
                <div className="summary-item">
                  <span className="label">总金额:</span>
                  <span className="value">¥{selectedPayable.totalAmount.toLocaleString()}</span>
                </div>
                <div className="summary-item">
                  <span className="label">已付金额:</span>
                  <span className="value">¥{selectedPayable.paidAmount.toLocaleString()}</span>
                </div>
                <div className="summary-item">
                  <span className="label">剩余金额:</span>
                  <span className="value amount-highlight">¥{selectedPayable.balanceAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handlePaymentSubmit} className="payment-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>付款单号 *</label>
                  <input
                    type="text"
                    value={paymentFormData.paymentNo}
                    onChange={(e) => handlePaymentInputChange('paymentNo', e.target.value)}
                    className="glass-input"
                    required
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label>付款日期 *</label>
                  <input
                    type="date"
                    value={paymentFormData.paymentDate}
                    onChange={(e) => handlePaymentInputChange('paymentDate', e.target.value)}
                    className="glass-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>付款方式 *</label>
                  <select
                    value={paymentFormData.paymentMethod}
                    onChange={(e) => handlePaymentInputChange('paymentMethod', e.target.value as PaymentMethod)}
                    className="glass-select"
                    required
                  >
                    <option value={PaymentMethod.BANK_TRANSFER}>银行转账</option>
                    <option value={PaymentMethod.CASH}>现金</option>
                    <option value={PaymentMethod.CHECK}>支票</option>
                    <option value={PaymentMethod.CREDIT_CARD}>信用卡</option>
                    <option value={PaymentMethod.OTHER}>其他</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>付款金额 *</label>
                  <input
                    type="number"
                    min="0.01"
                    max={selectedPayable.balanceAmount}
                    step="0.01"
                    value={paymentFormData.amount}
                    onChange={(e) => handlePaymentInputChange('amount', parseFloat(e.target.value) || 0)}
                    className="glass-input"
                    placeholder="0.00"
                    required
                  />
                  <div className="field-hint">
                    最大金额: ¥{selectedPayable.balanceAmount.toLocaleString()}
                  </div>
                </div>

                <div className="form-group">
                  <label>经办人 *</label>
                  <input
                    type="text"
                    value={paymentFormData.operator}
                    onChange={(e) => handlePaymentInputChange('operator', e.target.value)}
                    className="glass-input"
                    placeholder="经办人姓名"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>备注</label>
                  <textarea
                    value={paymentFormData.remark}
                    onChange={(e) => handlePaymentInputChange('remark', e.target.value)}
                    className="glass-textarea"
                    placeholder="付款备注"
                    rows={3}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="glass-button secondary">
                  取消
                </button>
                <button type="submit" className="glass-button primary">
                  确认付款
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 付款记录查看模态框 */}
      {showPaymentHistory && selectedPayable && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <div className="modal-header">
              <h3>付款记录 - {selectedPayable.billNo}</h3>
              <button className="close-btn" onClick={handleCancel}>✕</button>
            </div>

            <div className="payment-history">
              <div className="payable-summary">
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="label">供应商:</span>
                    <span className="value">{getSupplierName(selectedPayable.supplierId)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">总金额:</span>
                    <span className="value">¥{selectedPayable.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">已付金额:</span>
                    <span className="value">¥{selectedPayable.paidAmount.toLocaleString()}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">剩余金额:</span>
                    <span className="value amount-highlight">¥{selectedPayable.balanceAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {payments.length > 0 ? (
                <div className="payment-list">
                  <h4>付款记录明细</h4>
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
                        </tr>
                      </thead>
                      <tbody>
                        {payments.map(payment => (
                          <tr key={payment.id}>
                            <td className="payment-no-cell">
                              {payment.paymentNo}
                            </td>
                            <td className="date-cell">
                              {formatDate(payment.paymentDate)}
                            </td>
                            <td className="method-cell">
                              {getPaymentMethodText(payment.paymentMethod)}
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
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="empty-payments">
                  <div className="empty-icon">💰</div>
                  <h4>暂无付款记录</h4>
                  <p>该应付账款还没有付款记录</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsPayableManagement;