import React, { useState, useEffect } from 'react';
import { supplierService } from '../../services/business';
import { Supplier, SupplierStatus, SupplierRating } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';

interface SupplierManagementProps {
  className?: string;
}

interface SupplierForm {
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: string;
  creditLimit: number;
  rating: SupplierRating;
  status: SupplierStatus;
}

const emptyForm: SupplierForm = {
  code: '',
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  paymentTerms: '',
  creditLimit: 0,
  rating: SupplierRating.C,
  status: SupplierStatus.ACTIVE
};

export const SupplierManagement: React.FC<SupplierManagementProps> = ({ className }) => {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [formData, setFormData] = useState<SupplierForm>(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<SupplierStatus | ''>('');
  const [selectedRating, setSelectedRating] = useState<SupplierRating | ''>('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [suppliersData, statsData] = await Promise.all([
        supplierService.findAll(),
        supplierService.getSupplierStats()
      ]);
      
      setSuppliers(suppliersData);
      setStats(statsData);
    } catch (err) {
      setError('加载供应商数据失败');
      console.error('Failed to load supplier data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingSupplier) {
        await supplierService.update(editingSupplier.id, formData);
      } else {
        // 如果code为空，自动生成
        if (!formData.code) {
          formData.code = await supplierService.generateSupplierCode();
        }
        await supplierService.create(formData);
      }
      
      await loadData();
      setShowForm(false);
      setEditingSupplier(null);
      setFormData(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存供应商失败');
      console.error('Failed to save supplier:', err);
    }
  };

  const handleEdit = (supplier: Supplier) => {
    setEditingSupplier(supplier);
    setFormData({
      code: supplier.code,
      name: supplier.name,
      contactPerson: supplier.contactPerson || '',
      phone: supplier.phone || '',
      email: supplier.email || '',
      address: supplier.address || '',
      paymentTerms: supplier.paymentTerms || '',
      creditLimit: supplier.creditLimit,
      rating: supplier.rating,
      status: supplier.status
    });
    setShowForm(true);
  };

  const handleDelete = async (supplierId: string) => {
    if (!confirm('确定要删除这个供应商吗？删除后无法恢复！')) return;
    
    try {
      await supplierService.delete(supplierId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除供应商失败');
      console.error('Failed to delete supplier:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingSupplier(null);
    setFormData(emptyForm);
  };

  const handleInputChange = (field: keyof SupplierForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const getStatusText = (status: SupplierStatus): string => {
    switch (status) {
      case SupplierStatus.ACTIVE: return '正常';
      case SupplierStatus.INACTIVE: return '停用';
      default: return status;
    }
  };

  const getStatusStyles = (status: SupplierStatus): string => {
    switch (status) {
      case SupplierStatus.ACTIVE: return 'text-green-300 bg-green-500/20 border-green-400/30';
      case SupplierStatus.INACTIVE: return 'text-red-300 bg-red-500/20 border-red-400/30';
      default: return 'text-white/80';
    }
  };

  const getRatingText = (rating: SupplierRating): string => {
    switch (rating) {
      case SupplierRating.A: return 'A级 - 优秀';
      case SupplierRating.B: return 'B级 - 良好';
      case SupplierRating.C: return 'C级 - 一般';
      case SupplierRating.D: return 'D级 - 较差';
      default: return rating;
    }
  };

  const getRatingStyles = (rating: SupplierRating): string => {
    switch (rating) {
      case SupplierRating.A: return 'text-green-300 bg-green-500/20 border-green-400/30';
      case SupplierRating.B: return 'text-blue-300 bg-blue-500/20 border-blue-400/30';
      case SupplierRating.C: return 'text-yellow-300 bg-yellow-500/20 border-yellow-400/30';
      case SupplierRating.D: return 'text-red-300 bg-red-500/20 border-red-400/30';
      default: return 'text-white/80';
    }
  };

  const filteredSuppliers = suppliers.filter(supplier => {
    const matchesSearch = !searchTerm || 
      supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      supplier.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (supplier.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = !selectedStatus || supplier.status === selectedStatus;
    const matchesRating = !selectedRating || supplier.rating === selectedRating;
    
    return matchesSearch && matchesStatus && matchesRating;
  });

  if (loading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/80">加载供应商数据中...</p>
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
          <h1 className="text-3xl font-bold text-white mb-2">供应商管理</h1>
          <p className="text-white/70">管理供应商信息，包括联系方式、信用额度和评级</p>
        </div>
        <GlassButton
          variant="primary"
          onClick={() => setShowForm(true)}
          className="self-start lg:self-auto"
        >
          <span className="mr-2">➕</span>
          新增供应商
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
                🏢
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-white/70 text-sm">总供应商数</div>
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
                <div className="text-white/70 text-sm">活跃供应商</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center text-2xl">
                💰
              </div>
              <div>
                <div className="text-2xl font-bold text-white">¥{(stats.totalCreditLimit / 10000).toFixed(1)}万</div>
                <div className="text-white/70 text-sm">总信用额度</div>
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center text-2xl">
                ⭐
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.byRating.A}</div>
                <div className="text-white/70 text-sm">A级供应商</div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 搜索和过滤 */}
      <GlassCard title="搜索和筛选">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-white/50">🔍</span>
            </div>
            <GlassInput
              label="搜索供应商"
              type="text"
              placeholder="搜索供应商名称、编码、联系人..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <GlassSelect
            label="供应商状态"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as SupplierStatus)}
          >
            <option value="">全部状态</option>
            <option value={SupplierStatus.ACTIVE}>正常</option>
            <option value={SupplierStatus.INACTIVE}>停用</option>
          </GlassSelect>

          <GlassSelect
            label="供应商评级"
            value={selectedRating}
            onChange={(e) => setSelectedRating(e.target.value as SupplierRating)}
          >
            <option value="">全部评级</option>
            <option value={SupplierRating.A}>A级 - 优秀</option>
            <option value={SupplierRating.B}>B级 - 良好</option>
            <option value={SupplierRating.C}>C级 - 一般</option>
            <option value={SupplierRating.D}>D级 - 较差</option>
          </GlassSelect>
        </div>
      </GlassCard>

      {/* 供应商列表 */}
      <GlassCard title={`供应商列表 (${filteredSuppliers.length})`}>
        {filteredSuppliers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🏢</div>
            <h3 className="text-xl font-semibold text-white mb-2">没有找到供应商</h3>
            <p className="text-white/70 mb-4">请调整搜索条件或添加新供应商</p>
            <GlassButton variant="primary" onClick={() => setShowForm(true)}>
              添加第一个供应商
            </GlassButton>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 font-semibold text-white/90">供应商信息</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">编码</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">联系方式</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">信用额度</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">评级</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">状态</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.map(supplier => (
                  <tr key={supplier.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-semibold text-white mb-1">{supplier.name}</div>
                        {supplier.contactPerson && (
                          <div className="text-white/70 text-sm">联系人: {supplier.contactPerson}</div>
                        )}
                        {supplier.address && (
                          <div className="text-white/60 text-sm max-w-xs truncate" title={supplier.address}>
                            {supplier.address}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <code className="px-2 py-1 bg-white/10 text-white font-mono text-sm rounded">
                        {supplier.code}
                      </code>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {supplier.phone && (
                          <div className="flex items-center gap-2 text-white/80 text-sm">
                            <span>📞</span>
                            <span>{supplier.phone}</span>
                          </div>
                        )}
                        {supplier.email && (
                          <div className="flex items-center gap-2 text-white/80 text-sm">
                            <span>📧</span>
                            <span>{supplier.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-semibold text-white">¥{supplier.creditLimit.toLocaleString()}</div>
                        {supplier.paymentTerms && (
                          <div className="text-white/70 text-sm">{supplier.paymentTerms}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getRatingStyles(supplier.rating)}`}>
                        {supplier.rating}级
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyles(supplier.status)}`}>
                        {getStatusText(supplier.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(supplier)}
                          className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded hover:bg-blue-500/30 transition-colors"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(supplier.id)}
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

      {/* 供应商表单模态框 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingSupplier ? '编辑供应商' : '新增供应商'}
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
                  label="供应商编码"
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  placeholder="留空自动生成"
                />

                <GlassInput
                  label="供应商名称"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="输入供应商名称"
                  required
                />

                <GlassInput
                  label="联系人"
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                  placeholder="联系人姓名"
                />

                <GlassInput
                  label="联系电话"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="联系电话"
                />

                <GlassInput
                  label="电子邮箱"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="电子邮箱"
                />

                <GlassInput
                  label="付款条件"
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                  placeholder="如：30天付款"
                />

                <GlassInput
                  label="信用额度"
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.creditLimit}
                  onChange={(e) => handleInputChange('creditLimit', parseFloat(e.target.value) || 0)}
                  placeholder="0"
                  required
                />

                <GlassSelect
                  label="供应商评级"
                  value={formData.rating}
                  onChange={(e) => handleInputChange('rating', e.target.value as SupplierRating)}
                >
                  <option value={SupplierRating.A}>A级 - 优秀</option>
                  <option value={SupplierRating.B}>B级 - 良好</option>
                  <option value={SupplierRating.C}>C级 - 一般</option>
                  <option value={SupplierRating.D}>D级 - 较差</option>
                </GlassSelect>

                <GlassSelect
                  label="供应商状态"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as SupplierStatus)}
                >
                  <option value={SupplierStatus.ACTIVE}>正常</option>
                  <option value={SupplierStatus.INACTIVE}>停用</option>
                </GlassSelect>
              </div>

              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">供应商地址</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all resize-none"
                  placeholder="供应商详细地址"
                  rows={3}
                />
              </div>

              <div className="flex gap-4 pt-4">
                <GlassButton
                  type="button"
                  variant="secondary"
                  onClick={handleCancel}
                >
                  取消
                </GlassButton>
                <GlassButton
                  type="submit"
                  variant="primary"
                >
                  {editingSupplier ? '更新供应商' : '创建供应商'}
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierManagement;