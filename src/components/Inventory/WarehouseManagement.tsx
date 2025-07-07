import React, { useState, useEffect } from 'react';
import { warehouseService } from '../../services/business';
import { Warehouse } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';
import ConfirmDialog from '../ui/ConfirmDialog';
import { useAuth } from '../../hooks/useAuth';

interface WarehouseManagementProps {
  className?: string;
}

interface WarehouseForm {
  code: string;
  name: string;
  address: string;
  creator: string;
  phone: string;
  isDefault: boolean;
}

const emptyForm: WarehouseForm = {
  code: '',
  name: '',
  address: '',
  creator: '',
  phone: '',
  isDefault: false
};

export const WarehouseManagement: React.FC<WarehouseManagementProps> = ({ className }) => {
  const { user } = useAuth();
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingWarehouse, setEditingWarehouse] = useState<Warehouse | null>(null);
  const [formData, setFormData] = useState<WarehouseForm>(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [stats, setStats] = useState<any>(null);

  // 确认对话框状态
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showDefaultDialog, setShowDefaultDialog] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [defaultTargetId, setDefaultTargetId] = useState<string | null>(null);

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
      const submitData = {
        ...formData,
        manager: formData.creator
      };
      
      if (editingWarehouse) {
        await warehouseService.update(editingWarehouse.id, submitData);
      } else {
        await warehouseService.create(submitData);
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
      creator: warehouse.manager || '',
      phone: warehouse.phone || '',
      isDefault: warehouse.isDefault
    });
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
    setFormData(emptyForm);
  };

  const handleCreateNew = () => {
    const newFormData = {
      ...emptyForm,
      creator: user?.nickname || user?.username || ''
    };
    setFormData(newFormData);
    setShowForm(true);
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
    <div className={`space-y-6 ${className || ''}`}>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
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

          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center text-2xl">
                📊
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{(stats.totalCapacity / 10000).toFixed(1)}万</div>
                <div className="text-white/70 text-sm">总容量</div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 搜索和过滤 */}
      <GlassCard title="搜索和筛选">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <GlassInput
            label="搜索仓库"
            type="text"
            placeholder="搜索仓库编码、名称、地址、管理员..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          
          <GlassSelect
            label="仓库状态"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="">全部仓库</option>
            <option value="default">默认仓库</option>
          </GlassSelect>
        </div>
      </GlassCard>

      {/* 仓库列表 */}
      <GlassCard title={`仓库列表 (${filteredWarehouses.length})`}>
        {filteredWarehouses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏭</div>
            <h3 className="text-xl font-semibold text-white mb-2">没有找到仓库</h3>
            <p className="text-white/70 mb-4">请调整搜索条件或创建新的仓库</p>
            <GlassButton variant="primary" onClick={handleCreateNew}>
              添加第一个仓库
            </GlassButton>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 font-semibold text-white/90">仓库信息</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">联系方式</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">地址</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">容量</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">状态</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredWarehouses.map(warehouse => (
                  <tr key={warehouse.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
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
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="text-white/80 text-sm flex items-center gap-1">
                          <span>👤</span>
                          <span>{warehouse.manager || '-'}</span>
                        </div>
                        <div className="text-white/80 text-sm flex items-center gap-1">
                          <span>📞</span>
                          <span>{warehouse.phone || '-'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white/80 text-sm max-w-xs truncate">
                        {warehouse.address || '-'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-white/80">
                      -
                    </td>
                    <td className="py-3 px-4">
                      {warehouse.isDefault && (
                        <span className="inline-block px-2 py-1 rounded-full text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-400/30">
                          默认
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
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
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>

      {/* 仓库表单模态框 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-3xl w-full max-h-[90vh] overflow-y-auto">
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

            <form onSubmit={handleSubmit} className="space-y-8">
              {/* 基本信息 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="text-blue-400">📋</span>
                    基本信息
                  </h4>
                  <div className="flex-1 h-px bg-gradient-to-r from-blue-500/30 to-transparent"></div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="block text-white/90 text-sm font-medium flex items-center gap-2">
                      <span>仓库编码</span>
                      <span className="text-red-400">*</span>
                    </label>
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <GlassInput
                          type="text"
                          placeholder="如: WH001"
                          value={formData.code}
                          onChange={(e) => handleInputChange('code', e.target.value)}
                          required
                          className="flex-1"
                        />
                        {!editingWarehouse && (
                          <GlassButton
                            type="button"
                            onClick={generateWarehouseCode}
                            variant="secondary"
                            className="px-4 py-2"
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
                    value={formData.name}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    required
                    className=""
                  />

                  <GlassInput
                    label="创建者"
                    type="text"
                    placeholder="创建者姓名"
                    value={formData.creator}
                    onChange={(e) => handleInputChange('creator', e.target.value)}
                    required
                    disabled={!editingWarehouse}
                    className=""
                  />

                  <GlassInput
                    label="联系电话"
                    type="tel"
                    placeholder="输入联系电话"
                    value={formData.phone}
                    onChange={(e) => handleInputChange('phone', e.target.value)}
                    required
                    className=""
                  />
                </div>
              </div>

              {/* 位置信息 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="text-green-400">📍</span>
                    位置信息
                  </h4>
                  <div className="flex-1 h-px bg-gradient-to-r from-green-500/30 to-transparent"></div>
                </div>
                
                <GlassInput
                  label="仓库地址"
                  type="text"
                  placeholder="请输入详细地址"
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  required
                  className=""
                />
              </div>

              {/* 仓库配置 */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                    <span className="text-purple-400">⚙️</span>
                    仓库配置
                  </h4>
                  <div className="flex-1 h-px bg-gradient-to-r from-purple-500/30 to-transparent"></div>
                </div>
                
                <div className="bg-amber-500/10 border border-amber-400/20 rounded-lg p-4">
                  <GlassSelect
                    label="是否设为默认仓库"
                    value={formData.isDefault ? 'true' : 'false'}
                    onChange={(e) => handleInputChange('isDefault', e.target.value === 'true')}
                  >
                    <option value="false">否</option>
                    <option value="true">是</option>
                  </GlassSelect>
                  <p className="text-amber-300 text-xs mt-2 flex items-center gap-1">
                    <span>⚠️</span>
                    默认仓库将作为新产品的默认存储位置
                  </p>
                </div>
              </div>

              {/* 操作按钮 */}
              <div className="flex gap-4 pt-6 border-t border-white/10">
                <GlassButton
                  type="submit"
                  variant="primary"
                  disabled={!formData.code || !formData.name || !formData.creator || !formData.phone || !formData.address}
                  className="flex-1 py-3"
                >
                  <span className="mr-2">{editingWarehouse ? '💾' : '✨'}</span>
                  {editingWarehouse ? '更新仓库' : '创建仓库'}
                </GlassButton>
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                  className="px-6 py-3"
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