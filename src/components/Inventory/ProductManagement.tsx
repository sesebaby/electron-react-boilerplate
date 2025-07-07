import React, { useState, useEffect } from 'react';
import { productService, categoryService, unitService, productConversionService } from '../../services/business';
import { Product, Category, Unit, ProductStatus, ProductConversionSetting } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';
import ConfirmDialog from '../ui/ConfirmDialog';
import UnitConversionSettings from './UnitConversionSettings';
import { userActionLogger, UserActionType, ActionContext } from '../../utils/userActionLogger';
import { usePerformanceLogger } from '../../hooks/usePerformanceLogger';

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

interface ConversionSettings {
  enableConversion: boolean;
  conversionType: 'global' | 'custom';
  globalRuleId?: string;
  customRule?: {
    fromUnitId: string;
    toUnitId: string;
    conversionRate: number;
    description: string;
  };
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

const emptyConversionSettings: ConversionSettings = {
  enableConversion: false,
  conversionType: 'global',
  globalRuleId: undefined,
  customRule: undefined
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
  const [conversionSettings, setConversionSettings] = useState<ConversionSettings>(emptyConversionSettings);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<ProductStatus | ''>('');

  // 确认对话框状态
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // 性能监控
  const { stats } = usePerformanceLogger('ProductManagement', {
    enableInProduction: true,
    trackRerenders: true
  });

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
    
    // 记录操作开始
    const actionId = `product-${editingProduct ? 'update' : 'create'}-${Date.now()}`;
    userActionLogger.startAction(actionId, {
      type: editingProduct ? UserActionType.UPDATE : UserActionType.CREATE,
      context: ActionContext.INVENTORY,
      description: `${editingProduct ? 'Update' : 'Create'} product: ${formData.name}`,
      target: 'product',
      details: {
        productId: editingProduct?.id,
        productName: formData.name,
        sku: formData.sku
      }
    });
    
    try {
      let productId: string;
      
      if (editingProduct) {
        await productService.update(editingProduct.id, formData);
        productId = editingProduct.id;
        
        // 记录更新成功
        userActionLogger.logBusinessAction({
          type: UserActionType.UPDATE,
          entity: 'product',
          entityId: productId,
          context: ActionContext.INVENTORY,
          description: `Updated product: ${formData.name}`,
          details: {
            changes: formData,
            sku: formData.sku
          },
          success: true
        });
      } else {
        const newProduct = await productService.create(formData);
        productId = newProduct.id;
        
        // 记录创建成功
        userActionLogger.logBusinessAction({
          type: UserActionType.CREATE,
          entity: 'product',
          entityId: productId,
          context: ActionContext.INVENTORY,
          description: `Created new product: ${formData.name}`,
          details: {
            product: formData,
            sku: formData.sku
          },
          success: true
        });
      }
      
      // 保存或更新单位换算设置
      if (conversionSettings.enableConversion) {
        const existingConversionSetting = await productConversionService.findByProductId(productId);
        
        const conversionData = {
          productId,
          enableConversion: conversionSettings.enableConversion,
          conversionType: conversionSettings.conversionType,
          globalRuleId: conversionSettings.globalRuleId,
          customRule: conversionSettings.customRule,
          isActive: true
        };
        
        if (existingConversionSetting) {
          await productConversionService.update(existingConversionSetting.id, conversionData);
        } else {
          await productConversionService.create(conversionData);
        }
      } else {
        // 如果禁用换算，删除现有的换算设置
        await productConversionService.deleteByProductId(productId);
      }
      
      await loadData();
      setShowForm(false);
      setEditingProduct(null);
      setFormData(emptyForm);
      setConversionSettings(emptyConversionSettings);
      
      // 完成操作追踪
      userActionLogger.completeAction(actionId, {
        success: true
      });
    } catch (err) {
      const errorMessage = editingProduct ? '更新商品失败' : '创建商品失败';
      setError(errorMessage);
      console.error('Failed to save product:', err);
      
      // 记录操作失败
      userActionLogger.completeAction(actionId, {
        success: false,
        errorMessage: err instanceof Error ? err.message : 'Unknown error'
      });
      
      // 记录业务操作失败
      userActionLogger.logBusinessAction({
        type: editingProduct ? UserActionType.UPDATE : UserActionType.CREATE,
        entity: 'product',
        entityId: editingProduct?.id,
        context: ActionContext.INVENTORY,
        description: `Failed to ${editingProduct ? 'update' : 'create'} product: ${formData.name}`,
        details: {
          error: err instanceof Error ? err.message : 'Unknown error',
          formData: formData
        },
        success: false,
        errorMessage: errorMessage
      });
    }
  };

  const handleEdit = async (product: Product) => {
    // 记录查看/编辑操作
    userActionLogger.logBusinessAction({
      type: UserActionType.VIEW,
      entity: 'product',
      entityId: product.id,
      context: ActionContext.INVENTORY,
      description: `Opened product for editing: ${product.name}`,
      details: {
        sku: product.sku,
        action: 'edit'
      },
      success: true
    });
    
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
    
    // 加载现有的单位换算设置
    try {
      const existingConversionSetting = await productConversionService.findByProductId(product.id);
      if (existingConversionSetting) {
        setConversionSettings({
          enableConversion: existingConversionSetting.enableConversion,
          conversionType: existingConversionSetting.conversionType,
          globalRuleId: existingConversionSetting.globalRuleId,
          customRule: existingConversionSetting.customRule
        });
      } else {
        setConversionSettings(emptyConversionSettings);
      }
    } catch (err) {
      console.error('Failed to load conversion settings:', err);
      setConversionSettings(emptyConversionSettings);
    }
    
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    setDeleteTargetId(id);
    setShowConfirmDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;

    // 找到要删除的产品信息
    const productToDelete = products.find(p => p.id === deleteTargetId);
    
    try {
      await productService.delete(deleteTargetId);
      
      // 记录删除成功
      userActionLogger.logBusinessAction({
        type: UserActionType.DELETE,
        entity: 'product',
        entityId: deleteTargetId,
        context: ActionContext.INVENTORY,
        description: `Deleted product: ${productToDelete?.name || 'Unknown'}`,
        details: {
          productName: productToDelete?.name,
          sku: productToDelete?.sku,
          deletedAt: new Date().toISOString()
        },
        success: true
      });
      
      await loadData();
    } catch (err) {
      setError('删除商品失败');
      console.error('Failed to delete product:', err);
      
      // 记录删除失败
      userActionLogger.logBusinessAction({
        type: UserActionType.DELETE,
        entity: 'product',
        entityId: deleteTargetId,
        context: ActionContext.INVENTORY,
        description: `Failed to delete product: ${productToDelete?.name || 'Unknown'}`,
        details: {
          productName: productToDelete?.name,
          sku: productToDelete?.sku,
          error: err instanceof Error ? err.message : 'Unknown error'
        },
        success: false,
        errorMessage: '删除商品失败'
      });
    } finally {
      setShowConfirmDialog(false);
      setDeleteTargetId(null);
    }
  };

  const cancelDelete = () => {
    setShowConfirmDialog(false);
    setDeleteTargetId(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingProduct(null);
    setFormData(emptyForm);
    setConversionSettings(emptyConversionSettings);
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex">
          <div className="w-full h-full overflow-y-auto">
            <div className="min-h-full flex items-start justify-center p-2 sm:p-4">
              <div className="glass-card w-full max-w-4xl my-2 sm:my-8 shadow-2xl">
                <div className="bg-white/5 backdrop-blur-sm border-b border-white/10 px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
                  <h3 className="text-lg sm:text-xl font-bold text-white">
                    {editingProduct ? '编辑商品' : '新增商品'}
                  </h3>
                  <button
                    onClick={handleCancel}
                    className="w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                <div className="p-3 sm:p-6 max-h-[calc(100vh-8rem)] overflow-y-auto">
                  <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
                    {/* 基本信息 */}
                    <GlassCard title="基本信息">
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                        {/* 第一行：商品名称（全宽） */}
                        <div className="sm:col-span-2 lg:col-span-3">
                          <GlassInput
                            label="商品名称"
                            type="text"
                            placeholder="输入商品名称"
                            value={formData.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            required
                          />
                        </div>

                        {/* 第二行：SKU、分类、单位 */}
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

                        {/* 第三行：品牌、型号、状态 */}
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

                        <GlassSelect
                          label="商品状态"
                          value={formData.status}
                          onChange={(e) => handleInputChange('status', e.target.value as ProductStatus)}
                        >
                          <option value={ProductStatus.ACTIVE}>正常</option>
                          <option value={ProductStatus.INACTIVE}>停用</option>
                          <option value={ProductStatus.DISCONTINUED}>停产</option>
                        </GlassSelect>

                        {/* 第四行：价格信息（采购价、销售价占两列，条形码占一列） */}
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
                          label="条形码"
                          type="text"
                          placeholder="输入条形码"
                          value={formData.barcode}
                          onChange={(e) => handleInputChange('barcode', e.target.value)}
                        />

                        {/* 第五行：库存信息（最小、最大库存各占一列，空一列） */}
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

                        {/* 空位用于平衡布局 */}
                        <div className="hidden lg:block"></div>

                        {/* 第六行：商品描述（全宽） */}
                        <div className="sm:col-span-2 lg:col-span-3">
                          <GlassInput
                            label="商品描述"
                            placeholder="输入商品描述..."
                            value={formData.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                          />
                        </div>
                      </div>
                    </GlassCard>

                    {/* 单位换算设置 */}
                    <UnitConversionSettings
                      enableConversion={conversionSettings.enableConversion}
                      conversionType={conversionSettings.conversionType}
                      globalRuleId={conversionSettings.globalRuleId}
                      customRule={conversionSettings.customRule}
                      onSettingsChange={setConversionSettings}
                    />
                  </form>
                </div>

                {/* 提交按钮 - 固定在底部 */}
                <div className="bg-white/5 backdrop-blur-sm border-t border-white/10 px-4 sm:px-6 py-3 sm:py-4">
                  <div className="flex gap-3 sm:gap-4">
                    <GlassButton
                      type="submit"
                      variant="primary"
                      disabled={!formData.name || !formData.sku || !formData.categoryId || !formData.unitId}
                      className="flex-1"
                      onClick={handleSubmit}
                    >
                      {editingProduct ? '更新商品' : '创建商品'}
                    </GlassButton>
                    <GlassButton
                      type="button"
                      variant="secondary"
                      onClick={handleCancel}
                      className="flex-1"
                    >
                      取消
                    </GlassButton>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="删除商品"
        message="确定要删除这个商品吗？删除后无法恢复！"
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};

export default ProductManagement;