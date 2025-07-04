import React, { useState, useEffect } from 'react';
import accountsReceivableService from '../../services/business/accountsReceivableService';
import { customerService } from '../../services/business';
import { AccountsReceivable, Receipt, ReceivableStatus, PaymentMethod, Customer } from '../../types/entities';
import './Financial.css';

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

  const handleDeleteReceivable = async (receivableId: string) => {
    if (!confirm('确定要删除这个应收账款吗？删除后无法恢复！')) return;
    
    try {
      await accountsReceivableService.delete(receivableId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除应收账款失败');
      console.error('Failed to delete accounts receivable:', err);
    }
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
      case ReceivableStatus.UNPAID: return 'status-unpaid';
      case ReceivableStatus.PARTIAL: return 'status-partial';
      case ReceivableStatus.PAID: return 'status-paid';
      default: return '';
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
      <div className={`accounts-receivable-management ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载应收账款数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`accounts-receivable-management ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>应收账款管理</h2>
          <p>管理客户应收账款和收款记录</p>
        </div>
        <div className="header-actions">
          <button 
            className="glass-button primary"
            onClick={() => setShowReceivableForm(true)}
          >
            <span className="button-icon">💰</span>
            新建应收账款
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
                <div className="stat-label">应收账款总数</div>
              </div>
            </div>
            
            <div className="stat-item unpaid">
              <div className="stat-icon">🔴</div>
              <div className="stat-content">
                <div className="stat-value">{stats.unpaid}</div>
                <div className="stat-label">未收款</div>
              </div>
            </div>
            
            <div className="stat-item partial">
              <div className="stat-icon">🟡</div>
              <div className="stat-content">
                <div className="stat-value">{stats.partial}</div>
                <div className="stat-label">部分收款</div>
              </div>
            </div>
            
            <div className="stat-item paid">
              <div className="stat-icon">🟢</div>
              <div className="stat-content">
                <div className="stat-value">{stats.paid}</div>
                <div className="stat-label">已收款</div>
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
                <div className="stat-label">应收余额</div>
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
                placeholder="搜索发票号、客户..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label>收款状态</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as ReceivableStatus)}
              className="glass-select"
            >
              <option value="">全部状态</option>
              <option value={ReceivableStatus.UNPAID}>未收款</option>
              <option value={ReceivableStatus.PARTIAL}>部分收款</option>
              <option value={ReceivableStatus.PAID}>已收款</option>
            </select>
          </div>

          <div className="filter-group">
            <label>客户</label>
            <select
              value={selectedCustomer}
              onChange={(e) => setSelectedCustomer(e.target.value)}
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

      {/* 应收账款列表 */}
      <div className="content-section">
        <div className="section-header">
          <h3>应收账款列表</h3>
          <span className="item-count">共 {filteredReceivables.length} 个账款</span>
        </div>

        <div className="glass-table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>发票信息</th>
                <th>客户</th>
                <th>发票日期</th>
                <th>到期日期</th>
                <th>总金额</th>
                <th>已收金额</th>
                <th>余额</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredReceivables.map(receivable => (
                <tr key={receivable.id} className={isOverdue(receivable) ? 'receivable-overdue' : ''}>
                  <td className="bill-info-cell">
                    <div className="bill-info">
                      <div className="bill-no">{receivable.billNo}</div>
                      {receivable.orderId && (
                        <div className="order-ref">销售订单: {receivable.orderId}</div>
                      )}
                    </div>
                  </td>
                  <td className="customer-cell">
                    <div className="customer-info">
                      <div className="customer-name">{getCustomerName(receivable.customerId)}</div>
                    </div>
                  </td>
                  <td className="date-cell">
                    {formatDate(receivable.billDate)}
                  </td>
                  <td className="date-cell">
                    <div className={isOverdue(receivable) ? 'date-overdue' : ''}>
                      {formatDate(receivable.dueDate)}
                      {isOverdue(receivable) && <span className="overdue-indicator">⚠️</span>}
                    </div>
                  </td>
                  <td className="amount-cell">
                    ¥{receivable.totalAmount.toLocaleString()}
                  </td>
                  <td className="amount-cell">
                    ¥{receivable.receivedAmount.toLocaleString()}
                  </td>
                  <td className="amount-cell">
                    <div className="balance-amount">¥{receivable.balanceAmount.toLocaleString()}</div>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(receivable.status)}`}>
                      {getStatusText(receivable.status)}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="action-btn edit"
                      onClick={() => handleEditReceivable(receivable)}
                      title="编辑"
                    >
                      ✏️
                    </button>
                    
                    {receivable.status !== ReceivableStatus.PAID && (
                      <button 
                        className="action-btn receipt"
                        onClick={() => handleAddReceipt(receivable)}
                        title="添加收款"
                      >
                        💰
                      </button>
                    )}
                    
                    <button 
                      className="action-btn history"
                      onClick={() => handleViewReceipts(receivable)}
                      title="收款记录"
                    >
                      📋
                    </button>
                    
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDeleteReceivable(receivable.id)}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredReceivables.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">💰</div>
              <h3>没有找到应收账款</h3>
              <p>请调整搜索条件或创建新的应收账款</p>
            </div>
          )}
        </div>
      </div>

      {/* 应收账款表单模态框 */}
      {showReceivableForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingReceivable ? '编辑应收账款' : '新建应收账款'}</h3>
              <button className="close-btn" onClick={handleCancel}>✕</button>
            </div>

            <form onSubmit={handleReceivableSubmit} className="receivable-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>发票编号 *</label>
                  <div className="input-with-button">
                    <input
                      type="text"
                      value={receivableFormData.billNo}
                      onChange={(e) => handleReceivableInputChange('billNo', e.target.value)}
                      className="glass-input"
                      placeholder="输入发票编号"
                      required
                    />
                    {!editingReceivable && (
                      <button
                        type="button"
                        className="generate-btn"
                        onClick={generateInvoiceNo}
                        title="自动生成编号"
                      >
                        🔄
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>客户 *</label>
                  <select
                    value={receivableFormData.customerId}
                    onChange={(e) => handleReceivableInputChange('customerId', e.target.value)}
                    className="glass-select"
                    required
                  >
                    <option value="">请选择客户</option>
                    {customers.map(customer => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name} ({customer.code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>关联销售订单</label>
                  <input
                    type="text"
                    value={receivableFormData.orderId}
                    onChange={(e) => handleReceivableInputChange('orderId', e.target.value)}
                    className="glass-input"
                    placeholder="销售订单编号（可选）"
                  />
                </div>

                <div className="form-group">
                  <label>发票日期 *</label>
                  <input
                    type="date"
                    value={receivableFormData.billDate}
                    onChange={(e) => handleReceivableInputChange('billDate', e.target.value)}
                    className="glass-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>到期日期 *</label>
                  <input
                    type="date"
                    value={receivableFormData.dueDate}
                    onChange={(e) => handleReceivableInputChange('dueDate', e.target.value)}
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
                    value={receivableFormData.totalAmount}
                    onChange={(e) => handleReceivableInputChange('totalAmount', parseFloat(e.target.value) || 0)}
                    className="glass-input"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>备注</label>
                  <textarea
                    value={receivableFormData.remark}
                    onChange={(e) => handleReceivableInputChange('remark', e.target.value)}
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
                  {editingReceivable ? '更新账款' : '创建账款'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 收款记录表单模态框 */}
      {showReceiptForm && selectedReceivable && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>添加收款记录</h3>
              <button className="close-btn" onClick={handleCancel}>✕</button>
            </div>

            <div className="receivable-summary">
              <h4>应收账款信息</h4>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="label">发票编号:</span>
                  <span className="value">{selectedReceivable.billNo}</span>
                </div>
                <div className="summary-item">
                  <span className="label">客户:</span>
                  <span className="value">{getCustomerName(selectedReceivable.customerId)}</span>
                </div>
                <div className="summary-item">
                  <span className="label">总金额:</span>
                  <span className="value">¥{selectedReceivable.totalAmount.toLocaleString()}</span>
                </div>
                <div className="summary-item">
                  <span className="label">已收金额:</span>
                  <span className="value">¥{selectedReceivable.receivedAmount.toLocaleString()}</span>
                </div>
                <div className="summary-item">
                  <span className="label">剩余金额:</span>
                  <span className="value amount-highlight">¥{selectedReceivable.balanceAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <form onSubmit={handleReceiptSubmit} className="receipt-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>收款单号 *</label>
                  <input
                    type="text"
                    value={receiptFormData.receiptNo}
                    onChange={(e) => handleReceiptInputChange('receiptNo', e.target.value)}
                    className="glass-input"
                    required
                    readOnly
                  />
                </div>

                <div className="form-group">
                  <label>收款日期 *</label>
                  <input
                    type="date"
                    value={receiptFormData.receiptDate}
                    onChange={(e) => handleReceiptInputChange('receiptDate', e.target.value)}
                    className="glass-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>收款方式 *</label>
                  <select
                    value={receiptFormData.paymentMethod}
                    onChange={(e) => handleReceiptInputChange('paymentMethod', e.target.value as PaymentMethod)}
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
                  <label>收款金额 *</label>
                  <input
                    type="number"
                    min="0.01"
                    max={selectedReceivable.balanceAmount}
                    step="0.01"
                    value={receiptFormData.amount}
                    onChange={(e) => handleReceiptInputChange('amount', parseFloat(e.target.value) || 0)}
                    className="glass-input"
                    placeholder="0.00"
                    required
                  />
                  <div className="field-hint">
                    最大金额: ¥{selectedReceivable.balanceAmount.toLocaleString()}
                  </div>
                </div>

                <div className="form-group">
                  <label>经办人 *</label>
                  <input
                    type="text"
                    value={receiptFormData.operator}
                    onChange={(e) => handleReceiptInputChange('operator', e.target.value)}
                    className="glass-input"
                    placeholder="经办人姓名"
                    required
                  />
                </div>

                <div className="form-group full-width">
                  <label>备注</label>
                  <textarea
                    value={receiptFormData.remark}
                    onChange={(e) => handleReceiptInputChange('remark', e.target.value)}
                    className="glass-textarea"
                    placeholder="收款备注"
                    rows={3}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="glass-button secondary">
                  取消
                </button>
                <button type="submit" className="glass-button primary">
                  确认收款
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 收款记录查看模态框 */}
      {showReceiptHistory && selectedReceivable && (
        <div className="modal-overlay">
          <div className="modal-content large-modal">
            <div className="modal-header">
              <h3>收款记录 - {selectedReceivable.billNo}</h3>
              <button className="close-btn" onClick={handleCancel}>✕</button>
            </div>

            <div className="receipt-history">
              <div className="receivable-summary">
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="label">客户:</span>
                    <span className="value">{getCustomerName(selectedReceivable.customerId)}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">总金额:</span>
                    <span className="value">¥{selectedReceivable.totalAmount.toLocaleString()}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">已收金额:</span>
                    <span className="value">¥{selectedReceivable.receivedAmount.toLocaleString()}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">剩余金额:</span>
                    <span className="value amount-highlight">¥{selectedReceivable.balanceAmount.toLocaleString()}</span>
                  </div>
                </div>
              </div>

              {receipts.length > 0 ? (
                <div className="receipt-list">
                  <h4>收款记录明细</h4>
                  <div className="glass-table-container">
                    <table className="glass-table">
                      <thead>
                        <tr>
                          <th>收款单号</th>
                          <th>收款日期</th>
                          <th>收款方式</th>
                          <th>收款金额</th>
                          <th>经办人</th>
                          <th>备注</th>
                        </tr>
                      </thead>
                      <tbody>
                        {receipts.map(receipt => (
                          <tr key={receipt.id}>
                            <td className="receipt-no-cell">
                              {receipt.receiptNo}
                            </td>
                            <td className="date-cell">
                              {formatDate(receipt.receiptDate)}
                            </td>
                            <td className="method-cell">
                              {getReceiptMethodText(receipt.paymentMethod)}
                            </td>
                            <td className="amount-cell">
                              <div className="payment-amount">¥{receipt.amount.toLocaleString()}</div>
                            </td>
                            <td className="operator-cell">
                              {receipt.operator}
                            </td>
                            <td className="remark-cell">
                              {receipt.remark || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="empty-receipts">
                  <div className="empty-icon">💰</div>
                  <h4>暂无收款记录</h4>
                  <p>该应收账款还没有收款记录</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountsReceivableManagement;