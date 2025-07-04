import React, { useState, useEffect } from 'react';
import { supplierService } from '../../services/business';
import { Supplier, SupplierStatus, SupplierRating } from '../../types/entities';
import './Purchase.css';

interface SupplierManagementProps {
  className?: string;
}

interface SupplierForm {
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: string;
  creditLimit: number;
  rating: SupplierRating;
  status: SupplierStatus;
}

const emptyForm: SupplierForm = {
  code: '',
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  paymentTerms: '',
  creditLimit: 0,
  rating: SupplierRating.C,
  status: SupplierStatus.ACTIVE
};

export const SupplierManagement: React.FC<SupplierManagementProps> = ({ className }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierForm>(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<SupplierStatus | ''>('');
  const [selectedRating, setSelectedRating] = useState<SupplierRating | ''>('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [suppliersData, statsData] = await Promise.all([
        supplierService.findAll(),
        supplierService.getSupplierStats()
      ]);
      
      setSuppliers(suppliersData);
      setStats(statsData);
    } catch (err) {
      setError('加载供应商数据失败');
      console.error('Failed to load supplier data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSupplier) {
        await supplierService.update(editingSupplier.id, formData);
      } else {
        // 如果code为空，自动生成
        if (!formData.code) {
          formData.code = await supplierService.generateSupplierCode();
        }
        await supplierService.create(formData);
      }
      
      await loadData();
      setShowForm(false);
      setEditingSupplier(null);
      setFormData(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存供应商失败');
      console.error('Failed to save supplier:', err);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      code: supplier.code,
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      paymentTerms: supplier.paymentTerms || '',
      creditLimit: supplier.creditLimit,
      rating: supplier.rating,
      status: supplier.status
    });
    setShowForm(true);
  };

  const handleDelete = async (supplierId: string) => {
    if (!confirm('确定要删除这个供应商吗？删除后无法恢复！')) return;
    
    try {
      await supplierService.delete(supplierId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除供应商失败');
      console.error('Failed to delete supplier:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSupplier(null);
    setFormData(emptyForm);
  };

  const handleInputChange = (field: keyof SupplierForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusText = (status: SupplierStatus): string => {
    switch (status) {
      case SupplierStatus.ACTIVE: return '正常';
      case SupplierStatus.INACTIVE: return '停用';
      default: return status;
    }
  };

  const getStatusClass = (status: SupplierStatus): string => {
    switch (status) {
      case SupplierStatus.ACTIVE: return 'status-active';
      case SupplierStatus.INACTIVE: return 'status-inactive';
      default: return '';
    }
  };

  const getRatingText = (rating: SupplierRating): string => {
    switch (rating) {
      case SupplierRating.A: return 'A级 - 优秀';
      case SupplierRating.B: return 'B级 - 良好';
      case SupplierRating.C: return 'C级 - 一般';
      case SupplierRating.D: return 'D级 - 较差';
      default: return rating;
    }
  };

  const getRatingClass = (rating: SupplierRating): string => {
    switch (rating) {
      case SupplierRating.A: return 'rating-a';
      case SupplierRating.B: return 'rating-b';
      case SupplierRating.C: return 'rating-c';
      case SupplierRating.D: return 'rating-d';
      default: return '';
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = !searchTerm || 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !selectedStatus || supplier.status === selectedStatus;
    const matchesRating = !selectedRating || supplier.rating === selectedRating;
    
    return matchesSearch && matchesStatus && matchesRating;
  });

  if (loading) {
    return (
      <div className={`supplier-management ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载供应商数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`supplier-management ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>供应商管理</h2>
          <p>管理供应商信息，包括联系方式、信用额度和评级</p>
        </div>
        <div className="header-actions">
          <button 
            className="glass-button primary"
            onClick={() => setShowForm(true)}
          >
            <span className="button-icon">➕</span>
            新增供应商
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
              <div className="stat-icon">🏢</div>
              <div className="stat-content">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">总供应商数</div>
              </div>
            </div>
            
            <div className="stat-item active">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{stats.active}</div>
                <div className="stat-label">活跃供应商</div>
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
                <div className="stat-value">{stats.byRating.A}</div>
                <div className="stat-label">A级供应商</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 搜索和过滤 */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>搜索供应商</label>
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="搜索供应商名称、编码、联系人..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label>供应商状态</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as SupplierStatus)}
              className="glass-select"
            >
              <option value="">全部状态</option>
              <option value={SupplierStatus.ACTIVE}>正常</option>
              <option value={SupplierStatus.INACTIVE}>停用</option>
            </select>
          </div>

          <div className="filter-group">
            <label>供应商评级</label>
            <select
              value={selectedRating}
              onChange={(e) => setSelectedRating(e.target.value as SupplierRating)}
              className="glass-select"
            >
              <option value="">全部评级</option>
              <option value={SupplierRating.A}>A级 - 优秀</option>
              <option value={SupplierRating.B}>B级 - 良好</option>
              <option value={SupplierRating.C}>C级 - 一般</option>
              <option value={SupplierRating.D}>D级 - 较差</option>
            </select>
          </div>
        </div>
      </div>

      {/* 供应商列表 */}
      <div className="content-section">
        <div className="section-header">
          <h3>供应商列表</h3>
          <span className="item-count">共 {filteredSuppliers.length} 个供应商</span>
        </div>

        <div className="glass-table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>供应商信息</th>
                <th>编码</th>
                <th>联系方式</th>
                <th>信用额度</th>
                <th>评级</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredSuppliers.map(supplier => (
                <tr key={supplier.id}>
                  <td className="supplier-info-cell">
                    <div className="supplier-info">
                      <div className="supplier-name">{supplier.name}</div>
                      {supplier.contactPerson && (
                        <div className="supplier-contact">联系人: {supplier.contactPerson}</div>
                      )}
                      {supplier.address && (
                        <div className="supplier-address">{supplier.address}</div>
                      )}
                    </div>
                  </td>
                  <td className="code-cell">
                    <code className="supplier-code">{supplier.code}</code>
                  </td>
                  <td className="contact-cell">
                    <div className="contact-info">
                      {supplier.phone && (
                        <div className="contact-item">
                          <span className="contact-icon">📞</span>
                          <span className="contact-value">{supplier.phone}</span>
                        </div>
                      )}
                      {supplier.email && (
                        <div className="contact-item">
                          <span className="contact-icon">📧</span>
                          <span className="contact-value">{supplier.email}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="credit-cell">
                    <div className="credit-info">
                      <span className="credit-amount">¥{supplier.creditLimit.toLocaleString()}</span>
                      {supplier.paymentTerms && (
                        <div className="payment-terms">{supplier.paymentTerms}</div>
                      )}
                    </div>
                  </td>
                  <td>
                    <span className={`rating-badge ${getRatingClass(supplier.rating)}`}>
                      {supplier.rating}级
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(supplier.status)}`}>
                      {getStatusText(supplier.status)}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="action-btn edit"
                      onClick={() => handleEdit(supplier)}
                      title="编辑"
                    >
                      ✏️
                    </button>
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDelete(supplier.id)}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredSuppliers.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🏢</div>
              <h3>没有找到供应商</h3>
              <p>请调整搜索条件或添加新供应商</p>
            </div>
          )}
        </div>
      </div>

      {/* 供应商表单模态框 */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingSupplier ? '编辑供应商' : '新增供应商'}</h3>
              <button className="close-btn" onClick={handleCancel}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="supplier-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>供应商编码</label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                    className="glass-input"
                    placeholder="留空自动生成"
                  />
                </div>

                <div className="form-group">
                  <label>供应商名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="glass-input"
                    placeholder="输入供应商名称"
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
                    placeholder="联系人姓名"
                  />
                </div>

                <div className="form-group">
                  <label>联系电话</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="glass-input"
                    placeholder="联系电话"
                  />
                </div>

                <div className="form-group">
                  <label>电子邮箱</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className="glass-input"
                    placeholder="电子邮箱"
                  />
                </div>

                <div className="form-group">
                  <label>付款条件</label>
                  <input
                    type="text"
                    value={formData.paymentTerms}
                    onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                    className="glass-input"
                    placeholder="如：30天付款"
                  />
                </div>

                <div className="form-group">
                  <label>信用额度 *</label>
                  <input
                    type="number"
                    min="0"
                    step="1000"
                    value={formData.creditLimit}
                    onChange={(e) => handleInputChange('creditLimit', parseFloat(e.target.value) || 0)}
                    className="glass-input"
                    placeholder="0"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>供应商评级</label>
                  <select
                    value={formData.rating}
                    onChange={(e) => handleInputChange('rating', e.target.value as SupplierRating)}
                    className="glass-select"
                  >
                    <option value={SupplierRating.A}>A级 - 优秀</option>
                    <option value={SupplierRating.B}>B级 - 良好</option>
                    <option value={SupplierRating.C}>C级 - 一般</option>
                    <option value={SupplierRating.D}>D级 - 较差</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>供应商状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value as SupplierStatus)}
                    className="glass-select"
                  >
                    <option value={SupplierStatus.ACTIVE}>正常</option>
                    <option value={SupplierStatus.INACTIVE}>停用</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label>供应商地址</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="glass-textarea"
                    placeholder="供应商详细地址"
                    rows={3}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="glass-button secondary">
                  取消
                </button>
                <button type="submit" className="glass-button primary">
                  {editingSupplier ? '更新供应商' : '创建供应商'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManagement;