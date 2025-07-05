import React, { useState, useEffect } from 'react';
import { productService, categoryService, unitService } from '../../services/business';
import { Product, Category, Unit, ProductStatus } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';

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

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这个商品吗？')) return;
    
    try {
      await productService.delete(id);
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

  // 过滤商品
  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.brand?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || product.categoryId === selectedCategory;
    const matchesStatus = !selectedStatus || product.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusText = (status: ProductStatus) => {
    switch (status) {
      case ProductStatus.ACTIVE: return '正常';
      case ProductStatus.INACTIVE: return '停用';
      case ProductStatus.DISCONTINUED: return '停产';
      default: return '未知';
    }
  };

  const getStatusColor = (status: ProductStatus) => {
    switch (status) {
      case ProductStatus.ACTIVE: return 'bg-green-500/20 text-green-300 border-green-400/30';
      case ProductStatus.INACTIVE: return 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30';
      case ProductStatus.DISCONTINUED: return 'bg-red-500/20 text-red-300 border-red-400/30';
      default: return 'bg-gray-500/20 text-gray-300 border-gray-400/30';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
          <p className="text-white/80">正在加载商品数据...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <GlassCard className="text-center">
        <div className="text-red-400 text-6xl mb-4">⚠️</div>
        <h3 className="text-xl font-semibold text-white mb-2">加载失败</h3>
        <p className="text-red-400 mb-4">{error}</p>
        <GlassButton onClick={loadData}>重新加载</GlassButton>
      </GlassCard>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 页面头部 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">商品管理</h1>
          <p className="text-white/70">管理商品信息，包括基本信息、定价和库存设置</p>
        </div>
        <GlassButton
          variant="primary"
          onClick={() => setShowForm(true)}
          className="self-start lg:self-auto"
        >
          <span className="mr-2">➕</span>
          新增商品
        </GlassButton>
      </div>

      {/* 搜索和过滤 */}
      <GlassCard title="搜索和筛选">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <GlassInput
            label="搜索商品"
            type="text"
            placeholder="搜索商品名称、SKU或品牌..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <GlassSelect
            label="商品分类"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="">全部分类</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </GlassSelect>

          <GlassSelect
            label="商品状态"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as ProductStatus)}
          >
            <option value="">全部状态</option>
            <option value={ProductStatus.ACTIVE}>正常</option>
            <option value={ProductStatus.INACTIVE}>停用</option>
            <option value={ProductStatus.DISCONTINUED}>停产</option>
          </GlassSelect>
        </div>
      </GlassCard>

      {/* 商品列表 */}
      <GlassCard title={`商品列表 (${filteredProducts.length})`}>
        {filteredProducts.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📦</div>
            <h3 className="text-xl font-semibold text-white mb-2">没有找到商品</h3>
            <p className="text-white/70 mb-4">请调整搜索条件或添加新商品</p>
            <GlassButton variant="primary" onClick={() => setShowForm(true)}>
              添加第一个商品
            </GlassButton>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 font-semibold text-white/90">商品信息</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">SKU</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">分类</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">价格</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">库存范围</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">状态</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const category = categories.find(c => c.id === product.categoryId);
                  return (
                    <tr key={product.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-semibold text-white">{product.name}</div>
                          {product.brand && (
                            <div className="text-sm text-white/70">{product.brand} {product.model}</div>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-white/80 font-mono">{product.sku}</td>
                      <td className="py-3 px-4 text-white/80">{category?.name || '未分类'}</td>
                      <td className="py-3 px-4">
                        <div className="text-white">¥{product.salePrice.toFixed(2)}</div>
                        <div className="text-sm text-white/70">成本: ¥{product.purchasePrice.toFixed(2)}</div>
                      </td>
                      <td className="py-3 px-4 text-white/80">
                        {product.minStock} - {product.maxStock}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(product.status)}`}>
                          {getStatusText(product.status)}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEdit(product)}
                            className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded hover:bg-blue-500/30 transition-colors"
                          >
                            编辑
                          </button>
                          <button
                            onClick={() => handleDelete(product.id)}
                            className="px-3 py-1 text-xs bg-red-500/20 text-red-300 border border-red-400/30 rounded hover:bg-red-500/30 transition-colors"
                          >
                            删除
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* 商品表单模态框 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingProduct ? '编辑商品' : '新增商品'}
              </h3>
              <button
                onClick={handleCancel}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <GlassInput
                  label="商品名称"
                  type="text"
                  placeholder="输入商品名称"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />

                <GlassInput
                  label="SKU编码"
                  type="text"
                  placeholder="输入SKU编码"
                  value={formData.sku}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  required
                />

                <GlassSelect
                  label="商品分类"
                  value={formData.categoryId}
                  onChange={(e) => handleInputChange('categoryId', e.target.value)}
                  required
                >
                  <option value="">请选择分类</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </GlassSelect>

                <GlassSelect
                  label="计量单位"
                  value={formData.unitId}
                  onChange={(e) => handleInputChange('unitId', e.target.value)}
                  required
                >
                  <option value="">请选择单位</option>
                  {units.map(unit => (
                    <option key={unit.id} value={unit.id}>
                      {unit.name}
                    </option>
                  ))}
                </GlassSelect>

                <GlassInput
                  label="品牌"
                  type="text"
                  placeholder="输入品牌"
                  value={formData.brand}
                  onChange={(e) => handleInputChange('brand', e.target.value)}
                />

                <GlassInput
                  label="型号规格"
                  type="text"
                  placeholder="输入型号规格"
                  value={formData.model}
                  onChange={(e) => handleInputChange('model', e.target.value)}
                />

                <GlassInput
                  label="采购价"
                  type="number"
                  placeholder="0.00"
                  value={formData.purchasePrice}
                  onChange={(e) => handleInputChange('purchasePrice', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  required
                />

                <GlassInput
                  label="销售价"
                  type="number"
                  placeholder="0.00"
                  value={formData.salePrice}
                  onChange={(e) => handleInputChange('salePrice', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                  required
                />

                <GlassInput
                  label="最小库存"
                  type="number"
                  placeholder="0"
                  value={formData.minStock}
                  onChange={(e) => handleInputChange('minStock', parseInt(e.target.value) || 0)}
                  min="0"
                />

                <GlassInput
                  label="最大库存"
                  type="number"
                  placeholder="0"
                  value={formData.maxStock}
                  onChange={(e) => handleInputChange('maxStock', parseInt(e.target.value) || 0)}
                  min="0"
                />

                <GlassSelect
                  label="商品状态"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as ProductStatus)}
                >
                  <option value={ProductStatus.ACTIVE}>正常</option>
                  <option value={ProductStatus.INACTIVE}>停用</option>
                  <option value={ProductStatus.DISCONTINUED}>停产</option>
                </GlassSelect>

                <GlassInput
                  label="条形码"
                  type="text"
                  placeholder="输入条形码"
                  value={formData.barcode}
                  onChange={(e) => handleInputChange('barcode', e.target.value)}
                />
              </div>

              <GlassInput
                label="商品描述"
                placeholder="输入商品描述..."
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
              />

              <div className="flex gap-4 pt-4">
                <GlassButton
                  type="submit"
                  variant="primary"
                  disabled={!formData.name || !formData.sku || !formData.categoryId || !formData.unitId}
                >
                  {editingProduct ? '更新商品' : '创建商品'}
                </GlassButton>
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                >
                  取消
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductManagement;