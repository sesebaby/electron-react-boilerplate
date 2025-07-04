import React, { useState, useEffect } from 'react';
import { customerService } from '../../services/business';
import { Customer, CustomerType, CustomerLevel, CustomerStatus } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';

interface CustomerManagementProps {
  className?: string;
}

interface CustomerForm {
  code: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  customerType: CustomerType;
  creditLimit: number;
  paymentTerms: string;
  discountRate: number;
  level: CustomerLevel;
  status: CustomerStatus;
}

const emptyForm: CustomerForm = {
  code: '',
  name: '',
  contactPerson: '',
  phone: '',
  email: '',
  address: '',
  customerType: CustomerType.COMPANY,
  creditLimit: 0,
  paymentTerms: '月结30天',
  discountRate: 0,
  level: CustomerLevel.BRONZE,
  status: CustomerStatus.ACTIVE
};

export const CustomerManagementTailwind: React.FC<CustomerManagementProps> = ({ className }) => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<CustomerForm>(emptyForm);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<CustomerType | ''>('');
  const [selectedLevel, setSelectedLevel] = useState<CustomerLevel | ''>('');
  const [selectedStatus, setSelectedStatus] = useState<CustomerStatus | ''>('');
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [customersData, statsData] = await Promise.all([
        customerService.findAll(),
        customerService.getCustomerStats()
      ]);
      
      setCustomers(customersData);
      setStats(statsData);
    } catch (err) {
      setError('加载客户数据失败');
      console.error('Failed to load customer data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingCustomer) {
        await customerService.update(editingCustomer.id, formData);
      } else {
        await customerService.create(formData);
      }
      
      await loadData();
      setShowForm(false);
      setEditingCustomer(null);
      setFormData(emptyForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : '保存客户失败');
      console.error('Failed to save customer:', err);
    }
  };

  const handleEdit = (customer: Customer) => {
    setEditingCustomer(customer);
    setFormData({
      code: customer.code,
      name: customer.name,
      contactPerson: customer.contactPerson || '',
      phone: customer.phone || '',
      email: customer.email || '',
      address: customer.address || '',
      customerType: customer.customerType,
      creditLimit: customer.creditLimit,
      paymentTerms: customer.paymentTerms || '月结30天',
      discountRate: customer.discountRate,
      level: customer.level,
      status: customer.status
    });
    setShowForm(true);
  };

  const handleDelete = async (customerId: string) => {
    if (!confirm('确定要删除这个客户吗？删除后无法恢复！')) return;
    
    try {
      await customerService.delete(customerId);
      await loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除客户失败');
      console.error('Failed to delete customer:', err);
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingCustomer(null);
    setFormData(emptyForm);
  };

  const handleInputChange = (field: keyof CustomerForm, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const generateCustomerCode = () => {
    const maxCode = customers.reduce((max, customer) => {
      const match = customer.code.match(/CUS(\d+)/);
      if (match) {
        const num = parseInt(match[1]);
        return Math.max(max, num);
      }
      return max;
    }, 0);
    
    const newCode = `CUS${String(maxCode + 1).padStart(3, '0')}`;
    setFormData(prev => ({ ...prev, code: newCode }));
  };

  const getTypeText = (type: CustomerType): string => {
    switch (type) {
      case CustomerType.COMPANY: return '企业客户';
      case CustomerType.INDIVIDUAL: return '个人客户';
      default: return type;
    }
  };

  const getLevelText = (level: CustomerLevel): string => {
    switch (level) {
      case CustomerLevel.VIP: return 'VIP';
      case CustomerLevel.GOLD: return '金牌';
      case CustomerLevel.SILVER: return '银牌';
      case CustomerLevel.BRONZE: return '铜牌';
      default: return level;
    }
  };

  const getStatusText = (status: CustomerStatus): string => {
    switch (status) {
      case CustomerStatus.ACTIVE: return '活跃';
      case CustomerStatus.INACTIVE: return '非活跃';
      default: return status;
    }
  };

  const getStatusStyles = (status: CustomerStatus): string => {
    switch (status) {
      case CustomerStatus.ACTIVE: return 'text-green-300 bg-green-500/20 border-green-400/30';
      case CustomerStatus.INACTIVE: return 'text-red-300 bg-red-500/20 border-red-400/30';
      default: return 'text-white/80';
    }
  };

  const getLevelStyles = (level: CustomerLevel): string => {
    switch (level) {
      case CustomerLevel.VIP: return 'text-purple-300 bg-purple-500/20 border-purple-400/30';
      case CustomerLevel.GOLD: return 'text-yellow-300 bg-yellow-500/20 border-yellow-400/30';
      case CustomerLevel.SILVER: return 'text-gray-300 bg-gray-500/20 border-gray-400/30';
      case CustomerLevel.BRONZE: return 'text-orange-300 bg-orange-500/20 border-orange-400/30';
      default: return 'text-white/80';
    }
  };

  const filteredCustomers = customers.filter(customer => {
    const matchesSearch = !searchTerm || 
      customer.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.contactPerson || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.phone || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (customer.email || '').toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedType || customer.customerType === selectedType;
    const matchesLevel = !selectedLevel || customer.level === selectedLevel;
    const matchesStatus = !selectedStatus || customer.status === selectedStatus;
    
    return matchesSearch && matchesType && matchesLevel && matchesStatus;
  });

  if (loading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <div className="flex items-center justify-center min-h-96">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <p className="text-white/80">加载客户数据中...</p>
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
          <h1 className="text-3xl font-bold text-white mb-2">客户管理</h1>
          <p className="text-white/70">管理客户信息、等级和销售关系</p>
        </div>
        <GlassButton
          variant="primary"
          onClick={() => setShowForm(true)}
          className="self-start lg:self-auto"
        >
          <span className="mr-2">👤</span>
          新建客户
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
                👥
              </div>
              <div>
                <div className="text-2xl font-bold text-white">{stats.total}</div>
                <div className="text-white/70 text-sm">总客户数</div>
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
                <div className="text-white/70 text-sm">活跃客户</div>
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
                <div className="text-2xl font-bold text-white">{stats.vipCustomers}</div>
                <div className="text-white/70 text-sm">VIP客户</div>
              </div>
            </div>
          </GlassCard>
        </div>
      )}

      {/* 搜索和过滤 */}
      <GlassCard title="搜索和筛选">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <span className="text-white/50">🔍</span>
            </div>
            <GlassInput
              label="搜索客户"
              type="text"
              placeholder="搜索客户编码、名称、联系人..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <GlassSelect
            label="客户类型"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value as CustomerType)}
          >
            <option value="">全部类型</option>
            <option value={CustomerType.COMPANY}>企业客户</option>
            <option value={CustomerType.INDIVIDUAL}>个人客户</option>
          </GlassSelect>

          <GlassSelect
            label="客户等级"
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value as CustomerLevel)}
          >
            <option value="">全部等级</option>
            <option value={CustomerLevel.VIP}>VIP</option>
            <option value={CustomerLevel.GOLD}>金牌</option>
            <option value={CustomerLevel.SILVER}>银牌</option>
            <option value={CustomerLevel.BRONZE}>铜牌</option>
          </GlassSelect>

          <GlassSelect
            label="客户状态"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value as CustomerStatus)}
          >
            <option value="">全部状态</option>
            <option value={CustomerStatus.ACTIVE}>活跃</option>
            <option value={CustomerStatus.INACTIVE}>非活跃</option>
          </GlassSelect>
        </div>
      </GlassCard>

      {/* 客户列表 */}
      <GlassCard title={`客户列表 (${filteredCustomers.length})`}>
        {filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">👥</div>
            <h3 className="text-xl font-semibold text-white mb-2">没有找到客户</h3>
            <p className="text-white/70 mb-4">请调整搜索条件或创建新的客户</p>
            <GlassButton variant="primary" onClick={() => setShowForm(true)}>
              创建第一个客户
            </GlassButton>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1000px]">
              <thead>
                <tr className="border-b border-white/10">
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[200px]">客户信息</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[200px]">联系方式</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">类型/等级</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">信用额度</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">折扣率</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[100px]">状态</th>
                  <th className="text-left py-3 px-4 font-semibold text-white/90 min-w-[120px]">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map(customer => (
                  <tr key={customer.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-semibold text-white mb-1">{customer.name}</div>
                        <div className="text-white/70 text-sm">编码: {customer.code}</div>
                        {customer.contactPerson && (
                          <div className="text-white/60 text-sm">联系人: {customer.contactPerson}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        {customer.phone && (
                          <div className="flex items-center gap-2 text-white/80 text-sm">
                            <span>📞</span>
                            <span>{customer.phone}</span>
                          </div>
                        )}
                        {customer.email && (
                          <div className="flex items-center gap-2 text-white/80 text-sm">
                            <span>📧</span>
                            <span>{customer.email}</span>
                          </div>
                        )}
                        {customer.address && (
                          <div className="flex items-center gap-2 text-white/60 text-sm max-w-xs truncate" title={customer.address}>
                            <span>📍</span>
                            <span>{customer.address}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="space-y-1">
                        <div className="text-white/80 text-sm">{getTypeText(customer.customerType)}</div>
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getLevelStyles(customer.level)}`}>
                          {getLevelText(customer.level)}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div>
                        <div className="font-semibold text-white">¥{customer.creditLimit.toLocaleString()}</div>
                        {customer.paymentTerms && (
                          <div className="text-white/70 text-sm">{customer.paymentTerms}</div>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <div className="text-white">{(customer.discountRate * 100).toFixed(1)}%</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyles(customer.status)}`}>
                        {getStatusText(customer.status)}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEdit(customer)}
                          className="px-3 py-1 text-xs bg-blue-500/20 text-blue-300 border border-blue-400/30 rounded hover:bg-blue-500/30 transition-colors"
                          title="编辑"
                        >
                          ✏️
                        </button>
                        <button
                          onClick={() => handleDelete(customer.id)}
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

      {/* 客户表单模态框 */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="glass-card max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">
                {editingCustomer ? '编辑客户' : '新建客户'}
              </h3>
              <button
                onClick={handleCancel}
                className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10 transition-colors text-white/70 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="relative">
                  <GlassInput
                    label="客户编码"
                    type="text"
                    value={formData.code}
                    onChange={(e) => handleInputChange('code', e.target.value)}
                    placeholder="输入客户编码"
                    required
                  />
                  {!editingCustomer && (
                    <button
                      type="button"
                      onClick={generateCustomerCode}
                      className="absolute right-3 top-8 w-8 h-8 flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 rounded transition-colors"
                      title="自动生成编码"
                    >
                      🔄
                    </button>
                  )}
                </div>

                <GlassInput
                  label="客户名称"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  placeholder="输入客户名称"
                  required
                />

                <GlassInput
                  label="联系人"
                  type="text"
                  value={formData.contactPerson}
                  onChange={(e) => handleInputChange('contactPerson', e.target.value)}
                  placeholder="输入联系人姓名"
                />

                <GlassInput
                  label="联系电话"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                  placeholder="输入联系电话"
                />

                <GlassInput
                  label="邮箱"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  placeholder="输入邮箱地址"
                />

                <GlassSelect
                  label="客户类型"
                  value={formData.customerType}
                  onChange={(e) => handleInputChange('customerType', e.target.value as CustomerType)}
                >
                  <option value={CustomerType.COMPANY}>企业客户</option>
                  <option value={CustomerType.INDIVIDUAL}>个人客户</option>
                </GlassSelect>

                <GlassSelect
                  label="客户等级"
                  value={formData.level}
                  onChange={(e) => handleInputChange('level', e.target.value as CustomerLevel)}
                >
                  <option value={CustomerLevel.BRONZE}>铜牌</option>
                  <option value={CustomerLevel.SILVER}>银牌</option>
                  <option value={CustomerLevel.GOLD}>金牌</option>
                  <option value={CustomerLevel.VIP}>VIP</option>
                </GlassSelect>

                <GlassSelect
                  label="客户状态"
                  value={formData.status}
                  onChange={(e) => handleInputChange('status', e.target.value as CustomerStatus)}
                >
                  <option value={CustomerStatus.ACTIVE}>活跃</option>
                  <option value={CustomerStatus.INACTIVE}>非活跃</option>
                </GlassSelect>

                <GlassInput
                  label="信用额度"
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.creditLimit}
                  onChange={(e) => handleInputChange('creditLimit', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />

                <GlassInput
                  label="折扣率"
                  type="number"
                  min="0"
                  max="1"
                  step="0.01"
                  value={formData.discountRate}
                  onChange={(e) => handleInputChange('discountRate', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />

                <GlassInput
                  label="付款条件"
                  type="text"
                  value={formData.paymentTerms}
                  onChange={(e) => handleInputChange('paymentTerms', e.target.value)}
                  placeholder="如：月结30天"
                />
              </div>

              <div>
                <label className="block text-white/90 text-sm font-medium mb-2">客户地址</label>
                <textarea
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:border-white/40 focus:bg-white/15 transition-all resize-none"
                  placeholder="输入客户地址"
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
                  {editingCustomer ? '更新客户' : '创建客户'}
                </GlassButton>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerManagementTailwind;