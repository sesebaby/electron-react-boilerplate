import React, { useState, useEffect } from 'react';
import { userService } from '../../services/business';
import { User, UserRole, UserStatus } from '../../types/entities';
import { GlassInput, GlassSelect, GlassButton, GlassCard } from '../ui/FormControls';

interface UserManagementProps {
  className?: string;
}

interface UserForm {
  username: string;
  nickname: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  password?: string;
}

const roleLabels: Record<UserRole, string> = {
  [UserRole.ADMIN]: '系统管理员',
  [UserRole.PURCHASER]: '采购人员',
  [UserRole.SALESPERSON]: '销售人员',
  [UserRole.WAREHOUSE]: '仓库管理员',
  [UserRole.FINANCE]: '财务人员'
};

const statusLabels: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: '正常',
  [UserStatus.INACTIVE]: '停用',
  [UserStatus.LOCKED]: '锁定'
};

const roleColors: Record<UserRole, string> = {
  [UserRole.ADMIN]: 'bg-red-100 text-red-800 border-red-200',
  [UserRole.PURCHASER]: 'bg-blue-100 text-blue-800 border-blue-200',
  [UserRole.SALESPERSON]: 'bg-green-100 text-green-800 border-green-200',
  [UserRole.WAREHOUSE]: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  [UserRole.FINANCE]: 'bg-purple-100 text-purple-800 border-purple-200'
};

const statusColors: Record<UserStatus, string> = {
  [UserStatus.ACTIVE]: 'bg-green-100 text-green-800 border-green-200',
  [UserStatus.INACTIVE]: 'bg-gray-100 text-gray-800 border-gray-200',
  [UserStatus.LOCKED]: 'bg-red-100 text-red-800 border-red-200'
};

export const UserManagement: React.FC<UserManagementProps> = ({ className }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<UserStatus | 'all'>('all');
  const [roleFilter, setRoleFilter] = useState<UserRole | 'all'>('all');
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | 'view' | 'password'>('create');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  
  // Form state
  const [formData, setFormData] = useState<UserForm>({
    username: '',
    nickname: '',
    email: '',
    phone: '',
    role: UserRole.WAREHOUSE,
    status: UserStatus.ACTIVE
  });
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [currentUser, setCurrentUser] = useState<User | null>(null);

  useEffect(() => {
    loadData();
    loadCurrentUser();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const usersData = await userService.findAll();
      setUsers(usersData);
    } catch (err) {
      setError('加载用户数据失败');
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadCurrentUser = () => {
    const user = userService.getCurrentUser();
    setCurrentUser(user);
  };

  const handleCreate = () => {
    setModalMode('create');
    setFormData({
      username: '',
      nickname: '',
      email: '',
      phone: '',
      role: UserRole.WAREHOUSE,
      status: UserStatus.ACTIVE,
      password: ''
    });
    setShowModal(true);
  };

  const handleEdit = (user: User) => {
    setModalMode('edit');
    setSelectedUser(user);
    setFormData({
      username: user.username,
      nickname: user.nickname,
      email: user.email || '',
      phone: user.phone || '',
      role: user.role,
      status: user.status
    });
    setShowModal(true);
  };

  const handleView = (user: User) => {
    setModalMode('view');
    setSelectedUser(user);
    setShowModal(true);
  };

  const handleChangePassword = (user: User) => {
    setModalMode('password');
    setSelectedUser(user);
    setPasswordData({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username.trim() || !formData.nickname.trim()) {
      setError('请填写必填字段');
      return;
    }

    try {
      setError(null);
      
      if (modalMode === 'create') {
        if (!formData.password) {
          setError('请设置密码');
          return;
        }
        
        await userService.create({
          username: formData.username.trim(),
          nickname: formData.nickname.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          role: formData.role,
          status: formData.status,
          password: formData.password
        });
      } else if (modalMode === 'edit' && selectedUser) {
        await userService.update(selectedUser.id, {
          username: formData.username.trim(),
          nickname: formData.nickname.trim(),
          email: formData.email.trim() || undefined,
          phone: formData.phone.trim() || undefined,
          role: formData.role,
          status: formData.status
        });
      }
      
      setShowModal(false);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '操作失败');
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('新密码至少6个字符');
      return;
    }

    try {
      setError(null);
      
      if (currentUser?.role === UserRole.ADMIN && currentUser.id !== selectedUser.id) {
        // Admin can reset password without old password
        await userService.resetPassword(selectedUser.id, passwordData.newPassword);
      } else {
        // User changing own password needs old password
        await userService.changePassword(selectedUser.id, passwordData.oldPassword, passwordData.newPassword);
      }
      
      setShowModal(false);
      setPasswordData({ oldPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setError(err instanceof Error ? err.message : '密码修改失败');
    }
  };

  const handleDelete = async (user: User) => {
    if (!window.confirm(`确定要删除用户 "${user.nickname}" 吗？此操作不可恢复。`)) {
      return;
    }

    try {
      setError(null);
      await userService.delete(user.id);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除失败');
    }
  };

  const handleStatusChange = async (user: User, newStatus: UserStatus) => {
    try {
      setError(null);
      await userService.setStatus(user.id, newStatus);
      loadData();
    } catch (err) {
      setError(err instanceof Error ? err.message : '状态修改失败');
    }
  };

  const getFilteredUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.nickname.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.phone?.includes(searchTerm)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    return filtered;
  };

  const filteredUsers = getFilteredUsers();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white/30 border-b-white mx-auto mb-4"></div>
          <p className="text-white/70">加载用户数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 页面头部 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-white">用户管理</h2>
          <p className="mt-1 text-white/70">管理系统用户账号、角色和权限</p>
        </div>
        <div className="flex gap-3">
          <GlassButton 
            onClick={loadData}
            variant="secondary"
          >
            <span className="mr-2">🔄</span>
            刷新
          </GlassButton>
          <GlassButton 
            onClick={handleCreate}
            variant="primary"
          >
            <span className="mr-2">➕</span>
            新增用户
          </GlassButton>
        </div>
      </div>

      {/* 错误消息 */}
      {error && (
        <GlassCard className="border-red-200 bg-red-50/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 text-red-600">
              <span>❌</span>
              <span>{error}</span>
            </div>
            <button 
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 transition-colors"
            >
              ✕
            </button>
          </div>
        </GlassCard>
      )}

      {/* 搜索和筛选 */}
      <GlassCard>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
          <div className="relative">
            <GlassInput
              type="text"
              placeholder="搜索用户名、昵称、邮箱或手机号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
            <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">状态筛选</label>
            <GlassSelect 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as UserStatus | 'all')}
            >
              <option value="all">全部状态</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </GlassSelect>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">角色筛选</label>
            <GlassSelect 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
            >
              <option value="all">全部角色</option>
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </GlassSelect>
          </div>
        </div>
      </GlassCard>

      {/* 用户列表 */}
      <GlassCard>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">用户信息</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">角色</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">状态</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">最后登录</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">注册时间</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200/50">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-white/50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-medium text-gray-900">{user.nickname}</span>
                        <span className="text-sm text-gray-500">@{user.username}</span>
                      </div>
                      <div className="text-sm text-gray-500 space-x-2">
                        {user.email && <span>{user.email}</span>}
                        {user.phone && <span>{user.phone}</span>}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleColors[user.role]}`}>
                      {roleLabels[user.role]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[user.status]}`}>
                      {statusLabels[user.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : '从未登录'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        onClick={() => handleView(user)}
                        title="查看详情"
                      >
                        👁️
                      </button>
                      {currentUser?.role === UserRole.ADMIN && (
                        <>
                          <button
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                            onClick={() => handleEdit(user)}
                            title="编辑用户"
                          >
                            ✏️
                          </button>
                          <button
                            className="p-2 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                            onClick={() => handleChangePassword(user)}
                            title="修改密码"
                          >
                            🔑
                          </button>
                          {user.status === UserStatus.ACTIVE ? (
                            <button
                              className="p-2 text-yellow-600 hover:bg-yellow-50 rounded-lg transition-colors"
                              onClick={() => handleStatusChange(user, UserStatus.INACTIVE)}
                              title="停用用户"
                            >
                              🚫
                            </button>
                          ) : (
                            <button
                              className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                              onClick={() => handleStatusChange(user, UserStatus.ACTIVE)}
                              title="启用用户"
                            >
                              ✅
                            </button>
                          )}
                          <button
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            onClick={() => handleDelete(user)}
                            title="删除用户"
                          >
                            🗑️
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {filteredUsers.length === 0 && (
            <div className="text-center py-12">
              <div className="text-4xl mb-4">👥</div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">暂无用户数据</h3>
              <p className="text-gray-500">请调整筛选条件或添加新用户</p>
            </div>
          )}
        </div>
      </GlassCard>

      {/* 统计信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <GlassCard className="text-center p-6">
          <div className="text-3xl mb-3">👥</div>
          <div className="text-2xl font-bold text-blue-600">{users.length}</div>
          <div className="text-sm text-gray-600">总用户数</div>
        </GlassCard>
        
        <GlassCard className="text-center p-6">
          <div className="text-3xl mb-3">✅</div>
          <div className="text-2xl font-bold text-green-600">{users.filter(u => u.status === UserStatus.ACTIVE).length}</div>
          <div className="text-sm text-gray-600">正常用户</div>
        </GlassCard>
        
        <GlassCard className="text-center p-6">
          <div className="text-3xl mb-3">👑</div>
          <div className="text-2xl font-bold text-red-600">{users.filter(u => u.role === UserRole.ADMIN).length}</div>
          <div className="text-sm text-gray-600">管理员</div>
        </GlassCard>
        
        <GlassCard className="text-center p-6">
          <div className="text-3xl mb-3">📊</div>
          <div className="text-2xl font-bold text-purple-600">
            {users.filter(u => 
              u.lastLoginAt && 
              new Date().getTime() - new Date(u.lastLoginAt).getTime() < 7 * 24 * 60 * 60 * 1000
            ).length}
          </div>
          <div className="text-sm text-gray-600">本周活跃</div>
        </GlassCard>
      </div>

      {/* 模态框 */}
      {showModal && (
        <div className="popup-overlay flex items-center justify-center p-4 z-50">
          <div className="popup-dropdown max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-6 border-b border-white/20">
              <h3 className="text-lg font-semibold text-white">
                {modalMode === 'create' && '新增用户'}
                {modalMode === 'edit' && '编辑用户'}
                {modalMode === 'view' && '用户详情'}
                {modalMode === 'password' && '修改密码'}
              </h3>
              <button
                type="button"
                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/70 hover:text-white"
                onClick={() => setShowModal(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="p-6">
              {modalMode === 'password' ? (
                <form onSubmit={handlePasswordSubmit} className="space-y-4">
                  {currentUser?.id === selectedUser?.id && (
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        当前密码 <span className="text-red-400">*</span>
                      </label>
                      <GlassInput
                        type="password"
                        value={passwordData.oldPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, oldPassword: e.target.value }))}
                        placeholder="请输入当前密码"
                        required
                      />
                    </div>
                  )}
                  
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      新密码 <span className="text-red-400">*</span>
                    </label>
                    <GlassInput
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      placeholder="请输入新密码"
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-white mb-2">
                      确认新密码 <span className="text-red-400">*</span>
                    </label>
                    <GlassInput
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      placeholder="请再次输入新密码"
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <GlassButton 
                      type="button" 
                      onClick={() => setShowModal(false)}
                      className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
                    >
                      取消
                    </GlassButton>
                    <GlassButton 
                      type="submit"
                      className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
                    >
                      确认修改
                    </GlassButton>
                  </div>
                </form>
              ) : modalMode === 'view' && selectedUser ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <label className="block text-white/70 mb-1">用户名</label>
                      <div className="font-medium text-white">{selectedUser.username}</div>
                    </div>
                    <div>
                      <label className="block text-white/70 mb-1">昵称</label>
                      <div className="font-medium text-white">{selectedUser.nickname}</div>
                    </div>
                    <div>
                      <label className="block text-white/70 mb-1">邮箱</label>
                      <div className="font-medium text-white">{selectedUser.email || '未设置'}</div>
                    </div>
                    <div>
                      <label className="block text-white/70 mb-1">手机号</label>
                      <div className="font-medium text-white">{selectedUser.phone || '未设置'}</div>
                    </div>
                    <div>
                      <label className="block text-white/70 mb-1">角色</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${roleColors[selectedUser.role]}`}>
                        {roleLabels[selectedUser.role]}
                      </span>
                    </div>
                    <div>
                      <label className="block text-white/70 mb-1">状态</label>
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${statusColors[selectedUser.status]}`}>
                        {statusLabels[selectedUser.status]}
                      </span>
                    </div>
                    <div>
                      <label className="block text-white/70 mb-1">注册时间</label>
                      <div className="font-medium text-white">{new Date(selectedUser.createdAt).toLocaleString('zh-CN')}</div>
                    </div>
                    <div>
                      <label className="block text-white/70 mb-1">最后登录</label>
                      <div className="font-medium text-white">
                        {selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString('zh-CN') : '从未登录'}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        用户名 <span className="text-red-400">*</span>
                      </label>
                      <GlassInput
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="请输入用户名"
                        required
                        disabled={modalMode === 'view'}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        昵称 <span className="text-red-400">*</span>
                      </label>
                      <GlassInput
                        type="text"
                        value={formData.nickname}
                        onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                        placeholder="请输入昵称"
                        required
                        disabled={modalMode === 'view'}
                      />
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">邮箱</label>
                      <GlassInput
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="请输入邮箱地址"
                        disabled={modalMode === 'view'}
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">手机号</label>
                      <GlassInput
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        placeholder="请输入手机号"
                        disabled={modalMode === 'view'}
                      />
                    </div>
                  </div>
                  
                  {modalMode === 'create' && (
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        密码 <span className="text-red-400">*</span>
                      </label>
                      <GlassInput
                        type="password"
                        value={formData.password || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="请输入密码"
                        required
                        minLength={6}
                      />
                    </div>
                  )}
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        角色 <span className="text-red-400">*</span>
                      </label>
                      <GlassSelect
                        value={formData.role}
                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                        required
                        disabled={modalMode === 'view'}
                      >
                        {Object.entries(roleLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </GlassSelect>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-white mb-2">
                        状态 <span className="text-red-400">*</span>
                      </label>
                      <GlassSelect
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as UserStatus }))}
                        required
                        disabled={modalMode === 'view'}
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </GlassSelect>
                    </div>
                  </div>
                  
                  {modalMode !== 'view' && (
                    <div className="flex gap-3 pt-4">
                      <GlassButton 
                        type="button" 
                        onClick={() => setShowModal(false)}
                        className="flex-1 bg-gray-100 text-gray-700 hover:bg-gray-200"
                      >
                        取消
                      </GlassButton>
                      <GlassButton 
                        type="submit"
                        className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700"
                      >
                        {modalMode === 'create' ? '创建用户' : '保存修改'}
                      </GlassButton>
                    </div>
                  )}
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;