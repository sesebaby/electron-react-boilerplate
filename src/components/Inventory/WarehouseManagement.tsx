import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { warehouseService } from '../../services/business';
import { Warehouse } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';
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

interface WarehouseManagementProps {
  className?: string;
}

interface WarehouseForm {
  code: string;
  name: string;
  address: string;
  creator: string;
  isDefault: boolean;
}

const emptyForm: WarehouseForm = {
  code: '',
  name: '',
  address: '',
  creator: '',
  isDefault: false
};

export const WarehouseManagement: React.FC<WarehouseManagementProps> = ({ className }) => {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [stats, setStats] = useState<any>(null);

  // 确认对话框状态
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDefaultDialog, setShowDefaultDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [defaultTargetId, setDefaultTargetId] = useState<string | null>(null);

  // React Hook Form setup
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
    setValue,
    watch,
    trigger,
    clearErrors
  } = useForm<WarehouseForm>({
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

  const onSubmit = async (data: WarehouseForm) => {
    try {
      const submitData = {
        ...data,
        manager: data.creator
      };
      
      if (editingWarehouse) {
        await warehouseService.update(editingWarehouse.id, submitData);
      } else {
        await warehouseService.create(submitData);
      }
      
      await loadData();
      setShowForm(false);
      setEditingWarehouse(null);
      reset(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存仓库失败');
      console.error('Failed to save warehouse:', err);
    }
  };

  const handleEdit = (warehouse: Warehouse) => {
    setEditingWarehouse(warehouse);
    reset({
      code: warehouse.code,
      name: warehouse.name,
      address: warehouse.address || '',
      creator: warehouse.manager || '',
      isDefault: warehouse.isDefault
    });
    clearErrors();
    setShowForm(true);
  };

  const handleDelete = (warehouseId: string) => {
    const warehouse = warehouses.find(w => w.id === warehouseId);
    if (warehouse?.isDefault) {
      setError('默认仓库不能删除');
      return;
    }

    setDeleteTargetId(warehouseId);
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    if (!deleteTargetId) return;

    try {
      await warehouseService.delete(deleteTargetId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除仓库失败');
      console.error('Failed to delete warehouse:', err);
    } finally {
      setShowDeleteDialog(false);
      setDeleteTargetId(null);
    }
  };

  const cancelDelete = () => {
    setShowDeleteDialog(false);
    setDeleteTargetId(null);
  };

  const handleSetDefault = (warehouseId: string) => {
    setDefaultTargetId(warehouseId);
    setShowDefaultDialog(true);
  };

  const confirmSetDefault = async () => {
    if (!defaultTargetId) return;

    try {
      await warehouseService.setDefault(defaultTargetId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '设置默认仓库失败');
      console.error('Failed to set default warehouse:', err);
    } finally {
      setShowDefaultDialog(false);
      setDefaultTargetId(null);
    }
  };

  const cancelSetDefault = () => {
    setShowDefaultDialog(false);
    setDefaultTargetId(null);
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingWarehouse(null);
    reset(emptyForm);
    clearErrors();
  };

  const handleCreateNew = () => {
    const newFormData = {
      ...emptyForm,
      creator: user?.nickname || user?.username || ''
    };
    reset(newFormData);
    clearErrors();
    setShowForm(true);
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
    setValue('code', newCode);
    clearErrors('code');
  };

  // 初始化时自动生成编码
  useEffect(() => {
    if (showForm && !editingWarehouse && !formData.code && warehouses.length >= 0) {
      setTimeout(() => generateWarehouseCode(), 100);
    }
  }, [showForm, editingWarehouse, warehouses.length]);

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
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/80">加载仓库数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-8 p-6 ${className || ''}`}>
      {/* 页面头部 */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">仓库管理</h1>
          <p className="text-white/70">管理仓库信息、位置和仓库配置</p>
        </div>
        <GlassButton
          variant="primary"
          onClick={handleCreateNew}
          className="self-start lg:self-auto"
        >
          <span className="mr-2">🏭</span>
          新建仓库
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center text-2xl">
                🏭
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-white/70 text-sm">总仓库数</div>
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
                <div className="text-white/70 text-sm">启用仓库</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center text-2xl">
                ⭐
              </div>
              <div>
                <div className="text-2xl font-bold text-white">1</div>
                <div className="text-white/70 text-sm">默认仓库</div>
              </div>
            </div>
          </GlassCard>

        </div>
      )}

      {/* 搜索和过滤 */}
      <GlassCard title="搜索和筛选" className="py-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <GlassInput
            type="text"
            placeholder="搜索仓库编码、名称、地址、管理员..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <GlassSelect
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">全部仓库</option>
            <option value="default">默认仓库</option>
          </GlassSelect>
        </div>
      </GlassCard>

      {/* 仓库列表 */}
      <Card className="glass-card h-full flex flex-col overflow-hidden">
        <CardContent className="p-0 flex-1 flex flex-col">
          {/* 表格标题 */}
          <div className="flex-shrink-0 p-4 border-b border-white/20 bg-white/5">
            <h3 className="text-lg font-semibold text-white/90">
              仓库列表 ({filteredWarehouses.length})
            </h3>
          </div>
          {/* 空状态检查 */}
          {filteredWarehouses.length === 0 ? (
            <TableEmpty
              icon={<div className="text-6xl">🏭</div>}
              message="没有找到仓库"
              description="请调整搜索条件或创建新的仓库"
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
                      className="min-w-[200px]"
                    >
                      仓库信息
                    </TableHead>
                    <TableHead className="min-w-[120px]">负责人</TableHead>
                    <TableHead className="min-w-[200px]">地址</TableHead>
                    <TableHead className="min-w-[100px] text-center">状态</TableHead>
                    <TableHead className="min-w-[150px] text-center">操作</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {filteredWarehouses.map(warehouse => (
                    <TableRow key={warehouse.id}>
                      <TableCell 
                        fixed 
                        fixedPosition="left" 
                        fixedOffset={0}
                        className="min-w-[200px]"
                      >
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white">{warehouse.name}</span>
                            {warehouse.isDefault && (
                              <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">
                                默认
                              </span>
                            )}
                          </div>
                          <div className="text-white/70 text-sm font-mono">{warehouse.code}</div>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[120px]">
                        <div className="text-white/80 text-sm flex items-center gap-1">
                          <span>👤</span>
                          <span>{warehouse.manager || '-'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[200px]">
                        <div className="text-white/80 text-sm max-w-xs truncate">
                          {warehouse.address || '-'}
                        </div>
                      </TableCell>
                      <TableCell className="min-w-[100px] text-center">
                        {warehouse.isDefault && (
                          <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">
                            默认
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="min-w-[150px] text-center">
                        <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleEdit(warehouse)}
                          className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded hover:bg-blue-500/30 transition-colors"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        
                        {!warehouse.isDefault && (
                          <button
                            onClick={() => handleSetDefault(warehouse.id)}
                            className="px-3 py-1 text-xs bg-yellow-500/20 text-yellow-300 border border-yellow-400/30 rounded hover:bg-yellow-500/30 transition-colors"
                            title="设为默认"
                          >
                            ⭐
                          </button>
                        )}
                        
                        {!warehouse.isDefault && (
                          <button
                            onClick={() => handleDelete(warehouse.id)}
                            className="px-3 py-1 text-xs bg-red-500/20 text-red-300 border border-red-400/30 rounded hover:bg-red-500/30 transition-colors"
                            title="删除"
                          >
                            🗑️
                          </button>
                        )}
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

      {/* 仓库表单模态框 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-4xl w-full max-h-[90vh] overflow-y-auto p-8">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl flex items-center justify-center text-2xl">
                  🏭
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">
                    {editingWarehouse ? '编辑仓库' : '新建仓库'}
                  </h3>
                  <p className="text-white/70 text-sm mt-1">
                    {editingWarehouse ? '修改仓库信息和配置' : '创建新的仓库管理节点'}
                  </p>
                </div>
              </div>
              <button
                onClick={handleCancel}
                className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
              {/* 基本信息 */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <h4 className="text-xl font-semibold text-white flex items-center gap-2">
                    <span className="text-blue-400">📋</span>
                    基本信息
                  </h4>
                  <div className="flex-1 h-px bg-gradient-to-r from-blue-500/30 to-transparent"></div>
                </div>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-3">
                      <div className="flex gap-3 items-end">
                        <GlassInput
                          label="仓库编码"
                          type="text"
                          placeholder="如: WH001"
                          register={register('code', { 
                            required: '仓库编码不能为空' 
                          })}
                          required
                          error={errors.code?.message}
                          className="flex-1"
                        />
                        {!editingWarehouse && (
                          <GlassButton
                            type="button"
                            onClick={generateWarehouseCode}
                            variant="secondary"
                            className="h-12 px-3"
                            title="自动生成编码"
                          >
                            🔄 自动生成
                          </GlassButton>
                        )}
                      </div>
                      <div className="bg-blue-500/10 border border-blue-400/20 rounded-lg p-3">
                        <p className="text-blue-300 text-xs flex items-center gap-1">
                          <span>💡</span>
                          编码规则：WH + 3位数字序号，如 WH001、WH002...
                        </p>
                      </div>
                    </div>
                  </div>

                  <GlassInput
                    label="仓库名称"
                    type="text"
                    placeholder="如: 主仓库、备用仓库"
                    register={register('name', { 
                      required: '仓库名称不能为空' 
                    })}
                    required
                    error={errors.name?.message}
                    className=""
                  />

                  <GlassInput
                    label="负责人"
                    type="text"
                    placeholder="负责人姓名"
                    register={register('creator', { 
                      required: '负责人不能为空' 
                    })}
                    required
                    error={errors.creator?.message}
                    disabled={!editingWarehouse}
                  />
                </div>
              </div>

              {/* 位置信息 */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <h4 className="text-xl font-semibold text-white flex items-center gap-2">
                    <span className="text-green-400">📍</span>
                    位置信息
                  </h4>
                  <div className="flex-1 h-px bg-gradient-to-r from-green-500/30 to-transparent"></div>
                </div>
                
                <GlassInput
                  label="仓库地址"
                  type="text"
                  placeholder="请输入详细地址"
                  register={register('address', { 
                    required: '仓库地址不能为空' 
                  })}
                  required
                  error={errors.address?.message}
                />
              </div>

              {/* 仓库配置 */}
              <div className="space-y-6">
                <div className="flex items-center gap-3 mb-6">
                  <h4 className="text-xl font-semibold text-white flex items-center gap-2">
                    <span className="text-purple-400">⚙️</span>
                    仓库配置
                  </h4>
                  <div className="flex-1 h-px bg-gradient-to-r from-purple-500/30 to-transparent"></div>
                </div>
                
                <div className="bg-amber-500/10 border border-amber-400/20 rounded-lg p-6">
                  <GlassSelect
                    label="是否设为默认仓库"
                    register={register('isDefault', {
                      setValueAs: (value) => value === 'true'
                    })}
                  >
                    <option value="false">否</option>
                    <option value="true">是</option>
                  </GlassSelect>
                  <p className="text-amber-300 text-xs mt-3 flex items-center gap-1">
                    <span>⚠️</span>
                    默认仓库将作为新产品的默认存储位置
                  </p>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-4 pt-8 border-t border-white/10">
                <GlassButton
                  type="submit"
                  variant="primary"
                  loading={isSubmitting}
                  className="flex-1 py-4"
                >
                  <span className="mr-2">{editingWarehouse ? '💾' : '✨'}</span>
                  {editingWarehouse ? '更新仓库' : '创建仓库'}
                </GlassButton>
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                  className="px-8 py-4"
                >
                  <span className="mr-2">❌</span>
                  取消
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 删除确认对话框 */}
      <ConfirmDialog
        isOpen={showDeleteDialog}
        title="删除仓库"
        message="确定要删除这个仓库吗？删除后无法恢复！"
        confirmText="删除"
        cancelText="取消"
        variant="danger"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
      />

      {/* 设置默认仓库确认对话框 */}
      <ConfirmDialog
        isOpen={showDefaultDialog}
        title="设置默认仓库"
        message="确定要设置为默认仓库吗？"
        confirmText="确定"
        cancelText="取消"
        variant="warning"
        onConfirm={confirmSetDefault}
        onCancel={cancelSetDefault}
      />

    </div>
  );
};

export default WarehouseManagement;