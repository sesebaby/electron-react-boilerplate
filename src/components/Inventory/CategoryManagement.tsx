import React, { useState, useEffect } from 'react';
import { categoryService } from '../../services/business';
import { Category } from '../../types/entities';
import './Inventory.css';

interface CategoryManagementProps {
  className?: string;
}

interface CategoryForm {
  name: string;
  parentId: string;
  level: number;
  sortOrder: number;
  isActive: boolean;
}

const emptyForm: CategoryForm = {
  name: '',
  parentId: '',
  level: 1,
  sortOrder: 1,
  isActive: true
};

export const CategoryManagement: React.FC<CategoryManagementProps> = ({ className }) => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<CategoryForm>(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParent, setSelectedParent] = useState('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [categoriesData, statsData] = await Promise.all([
        categoryService.findAll(),
        categoryService.getCategoryStats()
      ]);
      
      setCategories(categoriesData);
      setStats(statsData);
    } catch (err) {
      setError('加载分类数据失败');
      console.error('Failed to load category data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCategory) {
        await categoryService.update(editingCategory.id, formData);
      } else {
        await categoryService.create(formData);
      }
      
      await loadData();
      setShowForm(false);
      setEditingCategory(null);
      setFormData(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存分类失败');
      console.error('Failed to save category:', err);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      parentId: category.parentId || '',
      level: category.level,
      sortOrder: category.sortOrder,
      isActive: category.isActive
    });
    setShowForm(true);
  };

  const handleDelete = async (categoryId: string) => {
    if (!confirm('确定要删除这个分类吗？删除后无法恢复！')) return;
    
    try {
      await categoryService.delete(categoryId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除分类失败');
      console.error('Failed to delete category:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCategory(null);
    setFormData(emptyForm);
  };

  const handleInputChange = (field: keyof CategoryForm, value: any) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value };
      
      // 自动调整级别
      if (field === 'parentId') {
        if (value) {
          const parentCategory = categories.find(c => c.id === value);
          if (parentCategory) {
            newData.level = parentCategory.level + 1;
          }
        } else {
          newData.level = 1;
        }
      }
      
      return newData;
    });
  };

  const getCategoryPath = (category: Category): string => {
    const path = [];
    let current = category;
    
    while (current) {
      path.unshift(current.name);
      if (current.parentId) {
        current = categories.find(c => c.id === current.parentId)!;
      } else {
        break;
      }
    }
    
    return path.join(' > ');
  };

  const getRootCategories = (): Category[] => {
    return categories.filter(c => !c.parentId);
  };

  const getSubCategories = (parentId: string): Category[] => {
    return categories.filter(c => c.parentId === parentId);
  };

  const filteredCategories = categories.filter(category => {
    const matchesSearch = !searchTerm || 
      category.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesParent = !selectedParent || category.parentId === selectedParent;
    
    return matchesSearch && matchesParent;
  });

  if (loading) {
    return (
      <div className={`category-management ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载分类数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`category-management ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>分类管理</h2>
          <p>管理商品分类、层级关系和分类属性</p>
        </div>
        <div className="header-actions">
          <button 
            className="glass-button primary"
            onClick={() => setShowForm(true)}
          >
            <span className="button-icon">📂</span>
            新建分类
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
              <div className="stat-icon">📂</div>
              <div className="stat-content">
                <div className="stat-value">{stats.total}</div>
                <div className="stat-label">总分类数</div>
              </div>
            </div>
            
            <div className="stat-item active">
              <div className="stat-icon">✅</div>
              <div className="stat-content">
                <div className="stat-value">{stats.active}</div>
                <div className="stat-label">启用分类</div>
              </div>
            </div>
            
            <div className="stat-item credit">
              <div className="stat-icon">🏗️</div>
              <div className="stat-content">
                <div className="stat-value">{stats.roots}</div>
                <div className="stat-label">根分类</div>
              </div>
            </div>
            
            <div className="stat-item rating">
              <div className="stat-icon">📊</div>
              <div className="stat-content">
                <div className="stat-value">{stats.maxLevel}</div>
                <div className="stat-label">最大层级</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 搜索和过滤 */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>搜索分类</label>
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="搜索分类名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label>父分类</label>
            <select
              value={selectedParent}
              onChange={(e) => setSelectedParent(e.target.value)}
              className="glass-select"
            >
              <option value="">全部分类</option>
              <option value="root">根分类</option>
              {getRootCategories().map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 分类列表 */}
      <div className="content-section">
        <div className="section-header">
          <h3>分类列表</h3>
          <span className="item-count">共 {filteredCategories.length} 个分类</span>
        </div>

        <div className="glass-table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>分类信息</th>
                <th>分类路径</th>
                <th>级别</th>
                <th>排序</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredCategories.map(category => (
                <tr key={category.id}>
                  <td className="category-info-cell">
                    <div className="category-info">
                      <div className="category-name">{category.name}</div>
                    </div>
                  </td>
                  <td className="path-cell">
                    <div className="category-path">{getCategoryPath(category)}</div>
                  </td>
                  <td className="level-cell">
                    <span className="level-badge">L{category.level}</span>
                  </td>
                  <td className="sort-cell">
                    {category.sortOrder}
                  </td>
                  <td>
                    <span className={`status-badge ${category.isActive ? 'status-active' : 'status-inactive'}`}>
                      {category.isActive ? '启用' : '禁用'}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="action-btn edit"
                      onClick={() => handleEdit(category)}
                      title="编辑"
                    >
                      ✏️
                    </button>
                    
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDelete(category.id)}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredCategories.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <h3>没有找到分类</h3>
              <p>请调整搜索条件或创建新的分类</p>
            </div>
          )}
        </div>
      </div>

      {/* 分类表单模态框 */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingCategory ? '编辑分类' : '新建分类'}</h3>
              <button className="close-btn" onClick={handleCancel}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="category-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>分类名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="glass-input"
                    placeholder="输入分类名称"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>父分类</label>
                  <select
                    value={formData.parentId}
                    onChange={(e) => handleInputChange('parentId', e.target.value)}
                    className="glass-select"
                  >
                    <option value="">根分类</option>
                    {categories
                      .filter(c => c.id !== editingCategory?.id)
                      .map(category => (
                        <option key={category.id} value={category.id}>
                          {getCategoryPath(category)}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>级别</label>
                  <input
                    type="number"
                    value={formData.level}
                    onChange={(e) => handleInputChange('level', parseInt(e.target.value) || 1)}
                    className="glass-input"
                    min="1"
                    max="10"
                    disabled
                  />
                </div>

                <div className="form-group">
                  <label>排序</label>
                  <input
                    type="number"
                    value={formData.sortOrder}
                    onChange={(e) => handleInputChange('sortOrder', parseInt(e.target.value) || 1)}
                    className="glass-input"
                    min="1"
                    placeholder="排序号"
                  />
                </div>

                <div className="form-group">
                  <label>状态</label>
                  <select
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={(e) => handleInputChange('isActive', e.target.value === 'true')}
                    className="glass-select"
                  >
                    <option value="true">启用</option>
                    <option value="false">禁用</option>
                  </select>
                </div>

              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="glass-button secondary">
                  取消
                </button>
                <button type="submit" className="glass-button primary">
                  {editingCategory ? '更新分类' : '创建分类'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryManagement;