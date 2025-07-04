import React, { useState, useEffect } from 'react';
import { warehouseService } from '../../services/business';
import { Warehouse } from '../../types/entities';

interface WarehouseManagementProps {
  className?: string;
}

interface WarehouseForm {
  code: string;
  name: string;
  address: string;
  manager: string;
  phone: string;
  isDefault: boolean;
}

const emptyForm: WarehouseForm = {
  code: '',
  name: '',
  address: '',
  manager: '',
  phone: '',
  isDefault: false
};

export const WarehouseManagement: React.FC<WarehouseManagementProps> = ({ className }) => {
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState<WarehouseForm>(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [warehousesData, statsData] = await Promise.all([
        warehouseService.findAll(),
        warehouseService.getWarehouseStats()
      ]);
      
      setWarehouses(warehousesData);
      setStats(statsData);
    } catch (err) {
      setError('加载仓库数据失败');
      console.error('Failed to load warehouse data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingWarehouse) {
        await warehouseService.update(editingWarehouse.id, formData);
      } else {
        await warehouseService.create(formData);
      }
      
      await loadData();
      setShowForm(false);
      setEditingWarehouse(null);
      setFormData(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存仓库失败');
      console.error('Failed to save warehouse:', err);
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    setFormData({
      code: warehouse.code,
      name: warehouse.name,
      address: warehouse.address || '',
      manager: warehouse.manager || '',
      phone: warehouse.phone || '',
      isDefault: warehouse.isDefault
    });
    setShowForm(true);
  };

  const handleDelete = async (warehouseId: string) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    if (warehouse?.isDefault) {
      setError('默认仓库不能删除');
      return;
    }
    
    if (!confirm('确定要删除这个仓库吗？删除后无法恢复！')) return;
    
    try {
      await warehouseService.delete(warehouseId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除仓库失败');
      console.error('Failed to delete warehouse:', err);
    }
  };

  const handleSetDefault = async (warehouseId: string) => {
    if (!confirm('确定要设置为默认仓库吗？')) return;
    
    try {
      await warehouseService.setDefault(warehouseId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '设置默认仓库失败');
      console.error('Failed to set default warehouse:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingWarehouse(null);
    setFormData(emptyForm);
  };

  const handleInputChange = (field: keyof WarehouseForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateWarehouseCode = () => {
    const maxCode = warehouses.reduce((max, warehouse) => {
      const match = warehouse.code.match(/WH(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return Math.max(max, num);
      }
      return max;
    }, 0);
    
    const newCode = `WH${String(maxCode + 1).padStart(3, '0')}`;
    setFormData(prev => ({ ...prev, code: newCode }));
  };

  const filteredWarehouses = warehouses.filter(warehouse => {
    const matchesSearch = !searchTerm || 
      warehouse.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      warehouse.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (warehouse.address || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (warehouse.manager || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !selectedStatus || 
      (selectedStatus === 'default' && warehouse.isDefault);
    
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className={`warehouse-management ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载仓库数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`warehouse-management ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>仓库管理</h2>
          <p>管理仓库信息、位置和仓库配置</p>
        </div>
        <div className="header-actions">
          <button 
            className="glass-button primary"
            onClick={() => setShowForm(true)}
          >
            <span className="button-icon">🏭</span>
            新建仓库
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
              <div className="stat-icon">🏭</div>
              <div className="stat-content">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">总仓库数</div>
              </div>
            </div>
            
            <div className="stat-item active">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{stats.active}</div>
                <div className="stat-label">启用仓库</div>
              </div>
            </div>
            
            <div className="stat-item credit">
              <div className="stat-icon">⭐</div>
              <div className="stat-content">
                <div className="stat-value">1</div>
                <div className="stat-label">默认仓库</div>
              </div>
            </div>
            
            <div className="stat-item rating">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">{(stats.totalCapacity / 10000).toFixed(1)}万</div>
                <div className="stat-label">总容量</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 搜索和过滤 */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>搜索仓库</label>
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="搜索仓库编码、名称、地址、管理员..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label>仓库状态</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="glass-select"
            >
              <option value="">全部仓库</option>
              <option value="default">默认仓库</option>
            </select>
          </div>
        </div>
      </div>

      {/* 仓库列表 */}
      <div className="content-section">
        <div className="section-header">
          <h3>仓库列表</h3>
          <span className="item-count">共 {filteredWarehouses.length} 个仓库</span>
        </div>

        <div className="glass-table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>仓库信息</th>
                <th>联系方式</th>
                <th>地址</th>
                <th>容量</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredWarehouses.map(warehouse => (
                <tr key={warehouse.id}>
                  <td className="warehouse-info-cell">
                    <div className="warehouse-info">
                      <div className="warehouse-name">
                        {warehouse.name}
                        {warehouse.isDefault && <span className="default-badge">默认</span>}
                      </div>
                      <div className="warehouse-code">{warehouse.code}</div>
                    </div>
                  </td>
                  <td className="contact-cell">
                    <div className="contact-info">
                      <div className="manager">👤 {warehouse.manager || '-'}</div>
                      <div className="phone">📞 {warehouse.phone || '-'}</div>
                    </div>
                  </td>
                  <td className="address-cell">
                    <div className="address">{warehouse.address || '-'}</div>
                  </td>
                  <td className="capacity-cell">
                    -
                  </td>
                  <td>
                    <div className="status-badges">
                      {warehouse.isDefault && (
                        <span className="status-badge status-default">默认</span>
                      )}
                    </div>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="action-btn edit"
                      onClick={() => handleEdit(warehouse)}
                      title="编辑"
                    >
                      ✏️
                    </button>
                    
                    {!warehouse.isDefault && (
                      <button 
                        className="action-btn default"
                        onClick={() => handleSetDefault(warehouse.id)}
                        title="设为默认"
                      >
                        ⭐
                      </button>
                    )}
                    
                    {!warehouse.isDefault && (
                      <button 
                        className="action-btn delete"
                        onClick={() => handleDelete(warehouse.id)}
                        title="删除"
                      >
                        🗑️
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredWarehouses.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">🏭</div>
              <h3>没有找到仓库</h3>
              <p>请调整搜索条件或创建新的仓库</p>
            </div>
          )}
        </div>
      </div>

      {/* 仓库表单模态框 */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingWarehouse ? '编辑仓库' : '新建仓库'}</h3>
              <button className="close-btn" onClick={handleCancel}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="warehouse-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>仓库编码 *</label>
                  <div className="input-with-button">
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => handleInputChange('code', e.target.value)}
                      className="glass-input"
                      placeholder="输入仓库编码"
                      required
                    />
                    {!editingWarehouse && (
                      <button
                        type="button"
                        className="generate-btn"
                        onClick={generateWarehouseCode}
                        title="自动生成编码"
                      >
                        🔄
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label>仓库名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="glass-input"
                    placeholder="输入仓库名称"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>管理员 *</label>
                  <input
                    type="text"
                    value={formData.manager}
                    onChange={(e) => handleInputChange('manager', e.target.value)}
                    className="glass-input"
                    placeholder="输入管理员姓名"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>联系电话 *</label>
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    className="glass-input"
                    placeholder="输入联系电话"
                    required
                  />
                </div>


                <div className="form-group">
                  <label>是否默认</label>
                  <select
                    value={formData.isDefault ? 'true' : 'false'}
                    onChange={(e) => handleInputChange('isDefault', e.target.value === 'true')}
                    className="glass-select"
                  >
                    <option value="false">否</option>
                    <option value="true">是</option>
                  </select>
                </div>


                <div className="form-group full-width">
                  <label>仓库地址 *</label>
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className="glass-input"
                    placeholder="输入仓库地址"
                    required
                  />
                </div>

              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="glass-button secondary">
                  取消
                </button>
                <button type="submit" className="glass-button primary">
                  {editingWarehouse ? '更新仓库' : '创建仓库'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default WarehouseManagement;