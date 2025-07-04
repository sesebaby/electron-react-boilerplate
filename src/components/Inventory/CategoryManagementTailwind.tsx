import React, { useState, useEffect } from 'react';
import { categoryService } from '../../services/business';
import { Category } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';

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

export const CategoryManagementTailwind: React.FC<CategoryManagementProps> = ({ className }) => {
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

  const filteredCategories = categories.filter(category => {
    const matchesSearch = !searchTerm || 
      category.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesParent = !selectedParent || category.parentId === selectedParent;
    
    return matchesSearch && matchesParent;
  });

  if (loading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/80">加载分类数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 页面头部 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">分类管理</h1>
          <p className="text-white/70">管理商品分类、层级关系和分类属性</p>
        </div>
        <GlassButton
          variant="primary"
          onClick={() => setShowForm(true)}
          className="self-start lg:self-auto"
        >
          <span className="mr-2">📂</span>
          新建分类
        </GlassButton>
      </div>

      {/* 错误消息 */}
      {error && (
        <div className="p-4 bg-red-500/20 border border-red-400/30 rounded-lg flex items-center gap-3">
          <span className="text-red-400 text-xl">❌</span>
          <span className="text-red-300 flex-1">{error}</span>
          <button 
            onClick={() => setError(null)} 
            className="text-red-300 hover:text-red-200 w-6 h-6 flex items-center justify-center"
          >
            ✕
          </button>
        </div>
      )}

      {/* 统计信息 */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-2xl">
                📂
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-white/70 text-sm">总分类数</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center text-2xl">
                ✅
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.active}</div>
                <div className="text-white/70 text-sm">启用分类</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center text-2xl">
                🏗️
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.roots}</div>
                <div className="text-white/70 text-sm">根分类</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center text-2xl">
                📊
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.maxLevel}</div>
                <div className="text-white/70 text-sm">最大层级</div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 搜索和过滤 */}
      <GlassCard title="搜索和筛选">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassInput
            label="搜索分类"
            type="text"
            placeholder="搜索分类名称..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <GlassSelect
            label="父分类"
            value={selectedParent}
            onChange={(e) => setSelectedParent(e.target.value)}
          >
            <option value="">全部分类</option>
            <option value="root">根分类</option>
            {getRootCategories().map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </GlassSelect>
        </div>
      </GlassCard>

      {/* 分类列表 */}
      <GlassCard title={`分类列表 (${filteredCategories.length})`}>
        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">📂</div>
            <h3 className="text-xl font-semibold text-white mb-2">没有找到分类</h3>
            <p className="text-white/70 mb-4">请调整搜索条件或创建新的分类</p>
            <GlassButton variant="primary" onClick={() => setShowForm(true)}>
              添加第一个分类
            </GlassButton>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 font-semibold text-white/90">分类信息</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">分类路径</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">级别</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">排序</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">状态</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredCategories.map(category => (
                  <tr key={category.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-white">{category.name}</div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white/80 text-sm">{getCategoryPath(category)}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30">
                        L{category.level}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-white/80">
                      {category.sortOrder}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${
                        category.isActive 
                          ? 'bg-green-500/20 text-green-300 border-green-400/30' 
                          : 'bg-gray-500/20 text-gray-300 border-gray-400/30'
                      }`}>
                        {category.isActive ? '启用' : '禁用'}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(category)}
                          className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded hover:bg-blue-500/30 transition-colors"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(category.id)}
                          className="px-3 py-1 text-xs bg-red-500/20 text-red-300 border border-red-400/30 rounded hover:bg-red-500/30 transition-colors"
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
          </div>
        )}
      </GlassCard>

      {/* 分类表单模态框 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingCategory ? '编辑分类' : '新建分类'}
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
                  label="分类名称"
                  type="text"
                  placeholder="输入分类名称"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />

                <GlassSelect
                  label="父分类"
                  value={formData.parentId}
                  onChange={(e) => handleInputChange('parentId', e.target.value)}
                >
                  <option value="">根分类</option>
                  {categories
                    .filter(c => c.id !== editingCategory?.id)
                    .map(category => (
                      <option key={category.id} value={category.id}>
                        {getCategoryPath(category)}
                      </option>
                    ))}
                </GlassSelect>

                <GlassInput
                  label="级别"
                  type="number"
                  value={formData.level}
                  onChange={(e) => handleInputChange('level', parseInt(e.target.value) || 1)}
                  min="1"
                  max="10"
                  disabled
                />

                <GlassInput
                  label="排序"
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => handleInputChange('sortOrder', parseInt(e.target.value) || 1)}
                  min="1"
                  placeholder="排序号"
                />

                <GlassSelect
                  label="状态"
                  value={formData.isActive ? 'true' : 'false'}
                  onChange={(e) => handleInputChange('isActive', e.target.value === 'true')}
                >
                  <option value="true">启用</option>
                  <option value="false">禁用</option>
                </GlassSelect>
              </div>

              <div className="flex gap-4 pt-4">
                <GlassButton
                  type="submit"
                  variant="primary"
                  disabled={!formData.name}
                >
                  {editingCategory ? '更新分类' : '创建分类'}
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

export default CategoryManagementTailwind;