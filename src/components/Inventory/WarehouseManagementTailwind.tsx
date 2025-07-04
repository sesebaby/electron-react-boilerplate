import React, { useState, useEffect } from 'react';
import { warehouseService } from '../../services/business';
import { Warehouse } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';

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

export const WarehouseManagementTailwind: React.FC<WarehouseManagementProps> = ({ className }) => {
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
          onClick={() => setShowForm(true)}
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
            <GlassButton variant="primary" onClick={() => setShowForm(true)}>
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
          <div className="glass-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingWarehouse ? '编辑仓库' : '新建仓库'}
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
                <div className="space-y-2">
                  <label className="block text-white/90 text-sm font-medium">仓库编码 *</label>
                  <div className="flex gap-2">
                    <GlassInput
                      type="text"
                      placeholder="输入仓库编码"
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
                        className="px-3"
                        title="自动生成编码"
                      >
                        🔄
                      </GlassButton>
                    )}
                  </div>
                </div>

                <GlassInput
                  label="仓库名称"
                  type="text"
                  placeholder="输入仓库名称"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  required
                />

                <GlassInput
                  label="管理员"
                  type="text"
                  placeholder="输入管理员姓名"
                  value={formData.manager}
                  onChange={(e) => handleInputChange('manager', e.target.value)}
                  required
                />

                <GlassInput
                  label="联系电话"
                  type="tel"
                  placeholder="输入联系电话"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  required
                />

                <GlassSelect
                  label="是否默认"
                  value={formData.isDefault ? 'true' : 'false'}
                  onChange={(e) => handleInputChange('isDefault', e.target.value === 'true')}
                >
                  <option value="false">否</option>
                  <option value="true">是</option>
                </GlassSelect>
              </div>

              <GlassInput
                label="仓库地址"
                type="text"
                placeholder="输入仓库地址"
                value={formData.address}
                onChange={(e) => handleInputChange('address', e.target.value)}
                required
              />

              <div className="flex gap-4 pt-4">
                <GlassButton
                  type="submit"
                  variant="primary"
                  disabled={!formData.code || !formData.name || !formData.manager || !formData.phone || !formData.address}
                >
                  {editingWarehouse ? '更新仓库' : '创建仓库'}
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

export default WarehouseManagementTailwind;