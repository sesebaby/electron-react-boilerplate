import React, { useState, useEffect } from 'react';
import { customerService } from '../../services/business';
import { Customer, CustomerType, CustomerLevel, CustomerStatus } from '../../types/entities';

interface CustomerManagementProps {
  className?: string;
}

interface CustomerForm {
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  customerType: CustomerType;
  creditLimit: number;
  paymentTerms: string;
  discountRate: number;
  level: CustomerLevel;
  status: CustomerStatus;
}

const emptyForm: CustomerForm = {
  code: '',
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  customerType: CustomerType.COMPANY,
  creditLimit: 0,
  paymentTerms: '月结30天',
  discountRate: 0,
  level: CustomerLevel.BRONZE,
  status: CustomerStatus.ACTIVE
};

export const CustomerManagement: React.FC<CustomerManagementProps> = ({ className }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerForm>(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<CustomerType | ''>('');
  const [selectedLevel, setSelectedLevel] = useState<CustomerLevel | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<CustomerStatus | ''>('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [customersData, statsData] = await Promise.all([
        customerService.findAll(),
        customerService.getCustomerStats()
      ]);
      
      setCustomers(customersData);
      setStats(statsData);
    } catch (err) {
      setError('加载客户数据失败');
      console.error('Failed to load customer data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCustomer) {
        await customerService.update(editingCustomer.id, formData);
      } else {
        await customerService.create(formData);
      }
      
      await loadData();
      setShowForm(false);
      setEditingCustomer(null);
      setFormData(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存客户失败');
      console.error('Failed to save customer:', err);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      code: customer.code,
      name: customer.name,
      contactPerson: customer.contactPerson || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      customerType: customer.customerType,
      creditLimit: customer.creditLimit,
      paymentTerms: customer.paymentTerms || '月结30天',
      discountRate: customer.discountRate,
      level: customer.level,
      status: customer.status
    });
    setShowForm(true);
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm('确定要删除这个客户吗？删除后无法恢复！')) return;
    
    try {
      await customerService.delete(customerId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除客户失败');
      console.error('Failed to delete customer:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCustomer(null);
    setFormData(emptyForm);
  };

  const handleInputChange = (field: keyof CustomerForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateCustomerCode = () => {
    const maxCode = customers.reduce((max, customer) => {
      const match = customer.code.match(/CUS(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return Math.max(max, num);
      }
      return max;
    }, 0);
    
    const newCode = `CUS${String(maxCode + 1).padStart(3, '0')}`;
    setFormData(prev => ({ ...prev, code: newCode }));
  };

  const getTypeText = (type: CustomerType): string => {
    switch (type) {
      case CustomerType.COMPANY: return '企业客户';
      case CustomerType.INDIVIDUAL: return '个人客户';
      default: return type;
    }
  };

  const getLevelText = (level: CustomerLevel): string => {
    switch (level) {
      case CustomerLevel.VIP: return 'VIP';
      case CustomerLevel.GOLD: return '金牌';
      case CustomerLevel.SILVER: return '银牌';
      case CustomerLevel.BRONZE: return '铜牌';
      default: return level;
    }
  };

  const getStatusText = (status: CustomerStatus): string => {
    switch (status) {
      case CustomerStatus.ACTIVE: return '活跃';
      case CustomerStatus.INACTIVE: return '非活跃';
      default: return status;
    }
  };

  const getStatusClass = (status: CustomerStatus): string => {
    switch (status) {
      case CustomerStatus.ACTIVE: return 'status-active';
      case CustomerStatus.INACTIVE: return 'status-inactive';
      default: return '';
    }
  };

  const getLevelClass = (level: CustomerLevel): string => {
    switch (level) {
      case CustomerLevel.VIP: return 'level-vip';
      case CustomerLevel.GOLD: return 'level-gold';
      case CustomerLevel.SILVER: return 'level-silver';
      case CustomerLevel.BRONZE: return 'level-bronze';
      default: return '';
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchTerm || 
      customer.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedType || customer.customerType === selectedType;
    const matchesLevel = !selectedLevel || customer.level === selectedLevel;
    const matchesStatus = !selectedStatus || customer.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesLevel && matchesStatus;
  });

  if (loading) {
    return (
      <div className={`customer-management ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载客户数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`customer-management ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>客户管理</h2>
          <p>管理客户信息、等级和销售关系</p>
        </div>
        <div className="header-actions">
          <button 
            className="glass-button primary"
            onClick={() => setShowForm(true)}
          >
            <span className="button-icon">👤</span>
            新建客户
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
              <div className="stat-icon">👥</div>
              <div className="stat-content">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">总客户数</div>
              </div>
            </div>
            
            <div className="stat-item active">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{stats.active}</div>
                <div className="stat-label">活跃客户</div>
              </div>
            </div>
            
            <div className="stat-item credit">
              <div className="stat-icon">💰</div>
              <div className="stat-content">
                <div className="stat-value">¥{(stats.totalCreditLimit / 10000).toFixed(1)}万</div>
                <div className="stat-label">总信用额度</div>
              </div>
            </div>
            
            <div className="stat-item rating">
              <div className="stat-icon">⭐</div>
              <div className="stat-content">
                <div className="stat-value">{stats.vipCustomers}</div>
                <div className="stat-label">VIP客户</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 搜索和过滤 */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>搜索客户</label>
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="搜索客户编码、名称、联系人、电话、邮箱..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label>客户类型</label>
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as CustomerType)}
              className="glass-select"
            >
              <option value="">全部类型</option>
              <option value={CustomerType.COMPANY}>企业客户</option>
              <option value={CustomerType.INDIVIDUAL}>个人客户</option>
            </select>
          </div>

          <div className="filter-group">
            <label>客户等级</label>
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value as CustomerLevel)}
              className="glass-select"
            >
              <option value="">全部等级</option>
              <option value={CustomerLevel.VIP}>VIP</option>
              <option value={CustomerLevel.GOLD}>金牌</option>
              <option value={CustomerLevel.SILVER}>银牌</option>
              <option value={CustomerLevel.BRONZE}>铜牌</option>
            </select>
          </div>

          <div className="filter-group">
            <label>客户状态</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as CustomerStatus)}
              className="glass-select"
            >
              <option value="">全部状态</option>
              <option value={CustomerStatus.ACTIVE}>活跃</option>
              <option value={CustomerStatus.INACTIVE}>非活跃</option>
            </select>
          </div>
        </div>
      </div>

      {/* 客户列表 */}
      <div className="content-section">
        <div className="section-header">
          <h3>客户列表</h3>
          <span className="item-count">共 {filteredCustomers.length} 个客户</span>
        </div>

        <div className="glass-table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>客户信息</th>
                <th>联系方式</th>
                <th>类型/等级</th>
                <th>信用额度</th>
                <th>折扣率</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.map(customer => (
                <tr key={customer.id}>
                  <td className="customer-info-cell">
                    <div className="customer-info">
                      <div className="customer-name">{customer.name}</div>
                      <div className="customer-code">{customer.code}</div>
                      {customer.contactPerson && (
                        <div className="contact-person">联系人: {customer.contactPerson}</div>
                      )}
                    </div>
                  </td>
                  <td className="contact-cell">
                    <div className="contact-info">
                      {customer.phone && <div className="phone">📞 {customer.phone}</div>}
                      {customer.email && <div className="email">📧 {customer.email}</div>}
                      {customer.address && <div className="address">📍 {customer.address}</div>}
                    </div>
                  </td>
                  <td className="type-level-cell">
                    <div className="type-level">
                      <span className="customer-type">{getTypeText(customer.customerType)}</span>
                      <span className={`customer-level ${getLevelClass(customer.level)}`}>
                        {getLevelText(customer.level)}
                      </span>
                    </div>
                  </td>
                  <td className="credit-cell">
                    ¥{customer.creditLimit.toLocaleString()}
                  </td>
                  <td className="discount-cell">
                    {(customer.discountRate * 100).toFixed(1)}%
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(customer.status)}`}>
                      {getStatusText(customer.status)}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="action-btn edit"
                      onClick={() => handleEdit(customer)}
                      title="编辑"
                    >
                      ✏️
                    </button>
                    
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDelete(customer.id)}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCustomers.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>没有找到客户</h3>
              <p>请调整搜索条件或创建新的客户</p>
            </div>
          )}
        </div>
      </div>

      {/* 客户表单模态框 */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingCustomer ? '编辑客户' : '新建客户'}</h3>
              <button className="close-btn" onClick={handleCancel}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="customer-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>客户编码 *</label>
                  <div className="input-with-button">
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => handleInputChange('code', e.target.value)}
                      className="glass-input"
                      placeholder="输入客户编码"
                      required
                    />
                    {!editingCustomer && (
                      <button
                        type="button"
                        className="generate-btn"
                        onClick={generateCustomerCode}
                        title="自动生成编码"
                      >
                        🔄
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>客户名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="glass-input"
                    placeholder="输入客户名称"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>联系人</label>
                  <input
                    type="text"
                    value={formData.contactPerson}
                    onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                    className="glass-input"
                    placeholder="输入联系人姓名"
                  />
                </div>

                <div className="form-group">
                  <label>联系电话</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="glass-input"
                    placeholder="输入联系电话"
                  />
                </div>

                <div className="form-group">
                  <label>邮箱</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="glass-input"
                    placeholder="输入邮箱地址"
                  />
                </div>

                <div className="form-group">
                  <label>客户类型</label>
                  <select
                    value={formData.customerType}
                    onChange={(e) => handleInputChange('customerType', e.target.value as CustomerType)}
                    className="glass-select"
                  >
                    <option value={CustomerType.COMPANY}>企业客户</option>
                    <option value={CustomerType.INDIVIDUAL}>个人客户</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>客户等级</label>
                  <select
                    value={formData.level}
                    onChange={(e) => handleInputChange('level', e.target.value as CustomerLevel)}
                    className="glass-select"
                  >
                    <option value={CustomerLevel.BRONZE}>铜牌</option>
                    <option value={CustomerLevel.SILVER}>银牌</option>
                    <option value={CustomerLevel.GOLD}>金牌</option>
                    <option value={CustomerLevel.VIP}>VIP</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>客户状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value as CustomerStatus)}
                    className="glass-select"
                  >
                    <option value={CustomerStatus.ACTIVE}>活跃</option>
                    <option value={CustomerStatus.INACTIVE}>非活跃</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>信用额度</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.creditLimit}
                    onChange={(e) => handleInputChange('creditLimit', parseFloat(e.target.value) || 0)}
                    className="glass-input"
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>折扣率</label>
                  <input
                    type="number"
                    min="0"
                    max="1"
                    step="0.01"
                    value={formData.discountRate}
                    onChange={(e) => handleInputChange('discountRate', parseFloat(e.target.value) || 0)}
                    className="glass-input"
                    placeholder="0.00"
                  />
                </div>

                <div className="form-group">
                  <label>付款条件</label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                    className="glass-input"
                    placeholder="如：月结30天"
                  />
                </div>

                <div className="form-group full-width">
                  <label>客户地址</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="glass-input"
                    placeholder="输入客户地址"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="glass-button secondary">
                  取消
                </button>
                <button type="submit" className="glass-button primary">
                  {editingCustomer ? '更新客户' : '创建客户'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagement;