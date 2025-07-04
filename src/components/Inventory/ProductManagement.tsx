import React, { useState, useEffect } from 'react';
import { productService, categoryService, unitService } from '../../services/business';
import { Product, Category, Unit, ProductStatus } from '../../types/entities';
import './Inventory.css';

interface ProductManagementProps {
  className?: string;
}

interface ProductForm {
  name: string;
  sku: string;
  description: string;
  categoryId: string;
  unitId: string;
  brand: string;
  model: string;
  barcode: string;
  purchasePrice: number;
  salePrice: number;
  minStock: number;
  maxStock: number;
  status: ProductStatus;
}

const emptyForm: ProductForm = {
  name: '',
  sku: '',
  description: '',
  categoryId: '',
  unitId: '',
  brand: '',
  model: '',
  barcode: '',
  purchasePrice: 0,
  salePrice: 0,
  minStock: 0,
  maxStock: 0,
  status: ProductStatus.ACTIVE
};

export const ProductManagement: React.FC<ProductManagementProps> = ({ className }) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [formData, setFormData] = useState<ProductForm>(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ProductStatus | ''>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [productsData, categoriesData, unitsData] = await Promise.all([
        productService.findAll(),
        categoryService.findAll(),
        unitService.findAll()
      ]);
      
      setProducts(productsData);
      setCategories(categoriesData);
      setUnits(unitsData);
    } catch (err) {
      setError('加载数据失败');
      console.error('Failed to load product data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingProduct) {
        await productService.update(editingProduct.id, formData);
      } else {
        await productService.create(formData);
      }
      
      await loadData();
      setShowForm(false);
      setEditingProduct(null);
      setFormData(emptyForm);
    } catch (err) {
      setError(editingProduct ? '更新商品失败' : '创建商品失败');
      console.error('Failed to save product:', err);
    }
  };

  const handleEdit = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      description: product.description || '',
      categoryId: product.categoryId,
      unitId: product.unitId,
      brand: product.brand || '',
      model: product.model || '',
      barcode: product.barcode || '',
      purchasePrice: product.purchasePrice,
      salePrice: product.salePrice,
      minStock: product.minStock,
      maxStock: product.maxStock,
      status: product.status
    });
    setShowForm(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('确定要删除这个商品吗？')) return;
    
    try {
      await productService.delete(productId);
      await loadData();
    } catch (err) {
      setError('删除商品失败');
      console.error('Failed to delete product:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
    setFormData(emptyForm);
  };

  const handleInputChange = (field: keyof ProductForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getCategoryName = (categoryId: string): string => {
    const category = categories.find(c => c.id === categoryId);
    return category?.name || categoryId;
  };

  const getUnitName = (unitId: string): string => {
    const unit = units.find(u => u.id === unitId);
    return unit?.name || unitId;
  };

  const getStatusText = (status: ProductStatus): string => {
    switch (status) {
      case ProductStatus.ACTIVE: return '正常';
      case ProductStatus.INACTIVE: return '停用';
      case ProductStatus.DISCONTINUED: return '停产';
      default: return status;
    }
  };

  const getStatusClass = (status: ProductStatus): string => {
    switch (status) {
      case ProductStatus.ACTIVE: return 'status-active';
      case ProductStatus.INACTIVE: return 'status-inactive';
      case ProductStatus.DISCONTINUED: return 'status-discontinued';
      default: return '';
    }
  };

  const filteredProducts = products.filter(product => {
    const matchesSearch = !searchTerm || 
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (product.brand || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    const matchesStatus = !selectedStatus || product.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  if (loading) {
    return (
      <div className={`product-management ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载商品数据中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`product-management ${className || ''}`}>
        <div className="error-container">
          <div className="error-icon">❌</div>
          <h3>加载失败</h3>
          <p>{error}</p>
          <button onClick={loadData} className="retry-button">
            重新加载
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`product-management ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>商品管理</h2>
          <p>管理商品信息，包括基本信息、定价和库存设置</p>
        </div>
        <div className="header-actions">
          <button 
            className="glass-button primary"
            onClick={() => setShowForm(true)}
          >
            <span className="button-icon">➕</span>
            新增商品
          </button>
        </div>
      </div>

      {/* 搜索和过滤 */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="filter-group">
            <label>搜索商品</label>
            <div className="search-input-wrapper">
              <span className="search-icon">🔍</span>
              <input
                type="text"
                placeholder="搜索商品名称、SKU或品牌..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="glass-input"
              />
            </div>
          </div>
          
          <div className="filter-group">
            <label>商品分类</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="glass-select"
            >
              <option value="">全部分类</option>
              {categories.map(category => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>商品状态</label>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value as ProductStatus)}
              className="glass-select"
            >
              <option value="">全部状态</option>
              <option value={ProductStatus.ACTIVE}>正常</option>
              <option value={ProductStatus.INACTIVE}>停用</option>
              <option value={ProductStatus.DISCONTINUED}>停产</option>
            </select>
          </div>
        </div>
      </div>

      {/* 商品列表 */}
      <div className="content-section">
        <div className="section-header">
          <h3>商品列表</h3>
          <span className="item-count">共 {filteredProducts.length} 个商品</span>
        </div>

        <div className="glass-table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>商品信息</th>
                <th>SKU</th>
                <th>分类</th>
                <th>单位</th>
                <th>采购价</th>
                <th>销售价</th>
                <th>库存范围</th>
                <th>状态</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredProducts.map(product => (
                <tr key={product.id}>
                  <td className="product-info-cell">
                    <div className="product-info">
                      <div className="product-name">{product.name}</div>
                      {product.brand && (
                        <div className="product-brand">{product.brand}</div>
                      )}
                      {product.description && (
                        <div className="product-description">{product.description}</div>
                      )}
                    </div>
                  </td>
                  <td className="sku-cell">
                    <code className="sku-code">{product.sku}</code>
                  </td>
                  <td>{getCategoryName(product.categoryId)}</td>
                  <td>{getUnitName(product.unitId)}</td>
                  <td className="price-cell">
                    ¥{product.purchasePrice.toFixed(2)}
                  </td>
                  <td className="price-cell">
                    ¥{product.salePrice.toFixed(2)}
                  </td>
                  <td className="stock-range-cell">
                    {product.minStock} - {product.maxStock}
                  </td>
                  <td>
                    <span className={`status-badge ${getStatusClass(product.status)}`}>
                      {getStatusText(product.status)}
                    </span>
                  </td>
                  <td className="actions-cell">
                    <button 
                      className="action-btn edit"
                      onClick={() => handleEdit(product)}
                      title="编辑"
                    >
                      ✏️
                    </button>
                    <button 
                      className="action-btn delete"
                      onClick={() => handleDelete(product.id)}
                      title="删除"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {filteredProducts.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📦</div>
              <h3>没有找到商品</h3>
              <p>请调整搜索条件或添加新商品</p>
            </div>
          )}
        </div>
      </div>

      {/* 商品表单模态框 */}
      {showForm && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>{editingProduct ? '编辑商品' : '新增商品'}</h3>
              <button className="close-btn" onClick={handleCancel}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="product-form">
              <div className="form-grid">
                <div className="form-group">
                  <label>商品名称 *</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    className="glass-input"
                    placeholder="输入商品名称"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>SKU编码 *</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => handleInputChange('sku', e.target.value)}
                    className="glass-input"
                    placeholder="输入SKU编码"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>商品分类 *</label>
                  <select
                    value={formData.categoryId}
                    onChange={(e) => handleInputChange('categoryId', e.target.value)}
                    className="glass-select"
                    required
                  >
                    <option value="">请选择分类</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>计量单位 *</label>
                  <select
                    value={formData.unitId}
                    onChange={(e) => handleInputChange('unitId', e.target.value)}
                    className="glass-select"
                    required
                  >
                    <option value="">请选择单位</option>
                    {units.map(unit => (
                      <option key={unit.id} value={unit.id}>
                        {unit.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>品牌</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => handleInputChange('brand', e.target.value)}
                    className="glass-input"
                    placeholder="输入品牌"
                  />
                </div>

                <div className="form-group">
                  <label>型号规格</label>
                  <input
                    type="text"
                    value={formData.model}
                    onChange={(e) => handleInputChange('model', e.target.value)}
                    className="glass-input"
                    placeholder="输入型号规格"
                  />
                </div>

                <div className="form-group">
                  <label>条形码</label>
                  <input
                    type="text"
                    value={formData.barcode}
                    onChange={(e) => handleInputChange('barcode', e.target.value)}
                    className="glass-input"
                    placeholder="输入条形码"
                  />
                </div>

                <div className="form-group">
                  <label>商品状态</label>
                  <select
                    value={formData.status}
                    onChange={(e) => handleInputChange('status', e.target.value as ProductStatus)}
                    className="glass-select"
                  >
                    <option value={ProductStatus.ACTIVE}>正常</option>
                    <option value={ProductStatus.INACTIVE}>停用</option>
                    <option value={ProductStatus.DISCONTINUED}>停产</option>
                  </select>
                </div>

                <div className="form-group">
                  <label>采购价 *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchasePrice}
                    onChange={(e) => handleInputChange('purchasePrice', parseFloat(e.target.value) || 0)}
                    className="glass-input"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>销售价 *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.salePrice}
                    onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value) || 0)}
                    className="glass-input"
                    placeholder="0.00"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>最小库存</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.minStock}
                    onChange={(e) => handleInputChange('minStock', parseInt(e.target.value) || 0)}
                    className="glass-input"
                    placeholder="0"
                  />
                </div>

                <div className="form-group">
                  <label>最大库存</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.maxStock}
                    onChange={(e) => handleInputChange('maxStock', parseInt(e.target.value) || 0)}
                    className="glass-input"
                    placeholder="0"
                  />
                </div>

                <div className="form-group full-width">
                  <label>商品描述</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    className="glass-textarea"
                    placeholder="输入商品描述"
                    rows={3}
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" onClick={handleCancel} className="glass-button secondary">
                  取消
                </button>
                <button type="submit" className="glass-button primary">
                  {editingProduct ? '更新商品' : '创建商品'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;