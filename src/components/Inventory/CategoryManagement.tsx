import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { categoryService } from '../../services/business';
import { Category } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';
import { Card, CardContent } from '../ui/card';
import { 
  Table, 
  TableContainer,
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableEmpty,
  TableLoading
} from '../ui/table';
import { notificationHelper } from '../../utils/notificationHelper';
import ConfirmDialog from '../ui/ConfirmDialog';
import ErrorDisplay from '../ui/ErrorDisplay';

interface CategoryManagementProps {
  className?: string;
}

// 定义验证模式
const categorySchema = z.object({
  name: z.string().min(1, '分类名称不能为空').max(50, '分类名称最多50个字符'),
  parentId: z.string().optional(),
  level: z.number().min(1, '级别不能小于1').max(10, '级别不能超过10'),
  sortOrder: z.number().min(1, '排序号不能小于1'),
  isActive: z.boolean()
});

type CategoryForm = z.infer<typeof categorySchema>;

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
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedParent, setSelectedParent] = useState('');
  const [stats, setStats] = useState<any>(null);
  
  // 确认对话框状态
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
    clearErrors
  } = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: emptyForm,
    mode: 'onBlur'
  });

  const formData = watch(); // 监听表单数据变化

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
      const errorMessage = err instanceof Error ? err.message : '加载分类数据失败';
      notificationHelper.showError('数据加载失败', errorMessage);
      console.error('Failed to load category data:', err);
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async (data: CategoryForm) => {
    try {
      // 处理根分类的parentId：将空字符串转换为undefined
      const submitData = {
        ...data,
        parentId: data.parentId || undefined
      };

      if (editingCategory) {
        await categoryService.update(editingCategory.id, submitData);
      } else {
        await categoryService.create(submitData);
      }

      await loadData();
      setShowForm(false);
      setEditingCategory(null);
      reset(emptyForm);
      clearErrors();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '保存分类失败';
      setError(errorMessage);
      notificationHelper.showError('分类保存失败', errorMessage);
      console.error('Failed to save category:', err);
    }
  };

  const handleEdit = (category: Category) => {
    setEditingCategory(category);
    reset({
      name: category.name,
      parentId: category.parentId || '',
      level: category.level,
      sortOrder: category.sortOrder,
      isActive: category.isActive
    });
    clearErrors();
    setShowForm(true);
  };

  const handleDelete = (categoryId: string) => {
    setDeleteTargetId(categoryId);
    setShowConfirmDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;

    try {
      await categoryService.delete(deleteTargetId);
      await loadData();
      notificationHelper.showSuccess('删除成功', '分类已成功删除');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '删除分类失败';
      notificationHelper.showError('分类删除失败', errorMessage);
      console.error('Failed to delete category:', err);
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
    setEditingCategory(null);
    reset(emptyForm);
    clearErrors();
    setError(null); // 清除错误信息
  };

  // 处理父分类变更时自动调整级别
  const handleParentChange = (parentId: string) => {
    setValue('parentId', parentId);
    
    if (parentId) {
      const parentCategory = categories.find(c => c.id === parentId);
      if (parentCategory) {
        setValue('level', parentCategory.level + 1);
      }
    } else {
      setValue('level', 1);
    }
    
    // 当用户开始输入时清除错误信息
    if (error) {
      setError(null);
    }
  };

  const handleCreateNew = () => {
    reset(emptyForm);
    clearErrors();
    setShowForm(true);
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
        {/* 页面头部 */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">分类管理</h1>
            <p className="text-white/70">管理商品分类、层级关系和分类属性</p>
          </div>
        </div>
        <Card className="glass-card h-full">
          <CardContent className="p-0 h-full">
            <TableLoading message="正在加载分类数据..." />
          </CardContent>
        </Card>
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
          onClick={handleCreateNew}
          className="self-start lg:self-auto"
        >
          <span className="mr-2">📂</span>
          新建分类
        </GlassButton>
      </div>



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
      <Card className="glass-card h-full flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 flex flex-col">
          {/* 表格标题 */}
          <div className="flex-shrink-0 p-4 border-b border-white/20 bg-white/5">
            <h3 className="text-lg font-semibold text-white/90">
              分类列表 (${filteredCategories.length})
            </h3>
          </div>

          {/* 空状态检查 */}
          {filteredCategories.length === 0 ? (
            <TableEmpty
              icon={<div className="text-6xl">📂</div>}
              message="没有找到分类"
              description="请调整搜索条件或创建新的分类"
            />
          ) : (
            /* 表格内容 */
            <TableContainer height="600px" className="flex-1">
              <Table stickyHeader minWidth="800px">
                <TableHeader sticky>
                  <TableRow>
                    <TableHead
                      fixed
                      fixedPosition="left"
                      fixedOffset={0}
                      className="min-w-[200px] table-first-column-enhanced"
                    >
                      分类信息
                    </TableHead>
                    <TableHead className="min-w-[250px] table-header-enhanced">分类路径</TableHead>
                    <TableHead className="min-w-[80px] text-center table-header-enhanced">级别</TableHead>
                    <TableHead className="min-w-[80px] text-center table-header-enhanced">排序</TableHead>
                    <TableHead className="min-w-[100px] text-center table-header-enhanced">状态</TableHead>
                    <TableHead className="min-w-[120px] text-center table-header-enhanced">操作</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredCategories.map(category => (
                    <TableRow key={category.id}>
                      <TableCell 
                        fixed 
                        fixedPosition="left" 
                        fixedOffset={0}
                        className="min-w-[200px]"
                      >
                        <div className="font-semibold text-white">{category.name}</div>
                      </TableCell>
                      <TableCell className="min-w-[250px]">
                        <div className="text-white/80 text-sm">{getCategoryPath(category)}</div>
                      </TableCell>
                      <TableCell className="min-w-[80px] text-center">
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30">
                          L{category.level}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[80px] text-center text-white/80">
                        {category.sortOrder}
                      </TableCell>
                      <TableCell className="min-w-[100px] text-center">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${
                          category.isActive 
                            ? 'bg-green-500/20 text-green-300 border-green-400/30' 
                            : 'bg-gray-500/20 text-gray-300 border-gray-400/30'
                        }`}>
                          {category.isActive ? '启用' : '禁用'}
                        </span>
                      </TableCell>
                      <TableCell className="min-w-[120px] text-center">
                        <div className="flex gap-2 justify-center">
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>

      {/* 分类表单模态框 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[9998]">
          <div className="glass-card max-w-3xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-semibold text-white mb-2">
                  {editingCategory ? '编辑分类' : '新建分类'}
                </h3>
                <p className="text-white/70 text-sm">
                  {editingCategory ? '修改分类信息和层级关系' : '创建新的商品分类，设置层级关系和属性'}
                </p>
              </div>
              <button
                onClick={handleCancel}
                className="w-10 h-10 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
              {/* 错误信息显示 */}
              {error && (
                <ErrorDisplay
                  error={new Error(error)}
                  variant="inline"
                  onClear={() => setError(null)}
                />
              )}

              {/* 基本信息区域 */}
              <div className="space-y-6">
                <h4 className="text-lg font-medium text-white border-b border-white/20 pb-3">基本信息</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="md:col-span-2">
                    <GlassInput
                      label="分类名称"
                      type="text"
                      placeholder="输入分类名称"
                      register={register('name')}
                      error={errors.name?.message}
                      required
                    />
                  </div>

                  <GlassSelect
                    label="父分类"
                    register={register('parentId', {
                      onChange: (e) => handleParentChange(e.target.value)
                    })}
                    error={errors.parentId?.message}
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
                    register={register('level', {
                      setValueAs: (value) => parseInt(value) || 1
                    })}
                    error={errors.level?.message}
                    min="1"
                    max="10"
                    disabled
                  />
                </div>
              </div>

              {/* 属性设置区域 */}
              <div className="space-y-6">
                <h4 className="text-lg font-medium text-white border-b border-white/20 pb-3">属性设置</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <GlassInput
                    label="排序"
                    type="number"
                    register={register('sortOrder', {
                      setValueAs: (value) => parseInt(value) || 1
                    })}
                    error={errors.sortOrder?.message}
                    min="1"
                    placeholder="排序号"
                  />

                  <GlassSelect
                    label="状态"
                    register={register('isActive', {
                      setValueAs: (value) => value === 'true'
                    })}
                    error={errors.isActive?.message}
                  >
                    <option value="true">启用</option>
                    <option value="false">禁用</option>
                  </GlassSelect>
                </div>
              </div>

              {/* 弹出窗口底部 */}
              <div className="bg-white/5 backdrop-blur-sm border-t border-white/10 px-4 sm:px-6 py-3 sm:py-4 shrink-0">
                <div className="flex gap-3 sm:gap-4">
                  <GlassButton
                    type="button"
                    variant="secondary"
                    onClick={handleCancel}
                    className="flex-1 min-h-[44px] sm:min-h-[48px] touch-manipulation"
                  >
                    取消
                  </GlassButton>
                  <GlassButton
                    type="submit"
                    variant="primary"
                    loading={isSubmitting}
                    className="flex-1 min-h-[44px] sm:min-h-[48px] touch-manipulation"
                  >
                    <span className="mr-2">{editingCategory ? '💾' : '✨'}</span>
                    {editingCategory ? '更新分类' : '创建分类'}
                  </GlassButton>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showConfirmDialog}
        title="删除分类"
        message="确定要删除这个分类吗？删除后无法恢复！"
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />
    </div>
  );
};

export default CategoryManagement;