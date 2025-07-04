import React, { useState, useEffect } from 'react';
import { userService } from '../../services/business';
import { User, UserRole, UserStatus } from '../../types/entities';

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
      <div className={`user-management ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载用户数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`user-management ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>用户管理</h2>
          <p>管理系统用户账号、角色和权限</p>
        </div>
        <div className="header-actions">
          <button className="glass-button secondary" onClick={loadData}>
            <span className="button-icon">🔄</span>
            刷新
          </button>
          <button className="glass-button primary" onClick={handleCreate}>
            <span className="button-icon">➕</span>
            新增用户
          </button>
        </div>
      </div>

      {/* 错误消息 */}
      {error && (
        <div className="error-message">
          <span className="error-icon">❌</span>
          {error}
          <button onClick={() => setError(null)} className="close-error">✕</button>
        </div>
      )}

      {/* 搜索和筛选 */}
      <div className="filter-section">
        <div className="filter-row">
          <div className="search-box">
            <input
              type="text"
              placeholder="搜索用户名、昵称、邮箱或手机号..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="glass-input"
            />
            <span className="search-icon">🔍</span>
          </div>
          
          <div className="filter-group">
            <label>状态筛选</label>
            <select 
              value={statusFilter} 
              onChange={(e) => setStatusFilter(e.target.value as UserStatus | 'all')}
              className="glass-input"
            >
              <option value="all">全部状态</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>角色筛选</label>
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value as UserRole | 'all')}
              className="glass-input"
            >
              <option value="all">全部角色</option>
              {Object.entries(roleLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 用户列表 */}
      <div className="table-section">
        <div className="glass-table-container">
          <table className="glass-table">
            <thead>
              <tr>
                <th>用户信息</th>
                <th>角色</th>
                <th>状态</th>
                <th>最后登录</th>
                <th>注册时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td>
                    <div className="user-info">
                      <div className="user-main">
                        <span className="user-nickname">{user.nickname}</span>
                        <span className="user-username">@{user.username}</span>
                      </div>
                      <div className="user-contact">
                        {user.email && <span className="user-email">{user.email}</span>}
                        {user.phone && <span className="user-phone">{user.phone}</span>}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className={`role-badge ${user.role}`}>
                      {roleLabels[user.role]}
                    </span>
                  </td>
                  <td>
                    <span className={`status-badge ${user.status}`}>
                      {statusLabels[user.status]}
                    </span>
                  </td>
                  <td className="date-cell">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString('zh-CN') : '从未登录'}
                  </td>
                  <td className="date-cell">
                    {new Date(user.createdAt).toLocaleDateString('zh-CN')}
                  </td>
                  <td>
                    <div className="action-buttons">
                      <button
                        className="action-button view"
                        onClick={() => handleView(user)}
                        title="查看详情"
                      >
                        👁️
                      </button>
                      {currentUser?.role === UserRole.ADMIN && (
                        <>
                          <button
                            className="action-button edit"
                            onClick={() => handleEdit(user)}
                            title="编辑用户"
                          >
                            ✏️
                          </button>
                          <button
                            className="action-button password"
                            onClick={() => handleChangePassword(user)}
                            title="修改密码"
                          >
                            🔑
                          </button>
                          {user.status === UserStatus.ACTIVE ? (
                            <button
                              className="action-button disable"
                              onClick={() => handleStatusChange(user, UserStatus.INACTIVE)}
                              title="停用用户"
                            >
                              🚫
                            </button>
                          ) : (
                            <button
                              className="action-button enable"
                              onClick={() => handleStatusChange(user, UserStatus.ACTIVE)}
                              title="启用用户"
                            >
                              ✅
                            </button>
                          )}
                          <button
                            className="action-button delete"
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
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <p>暂无用户数据</p>
            </div>
          )}
        </div>
      </div>

      {/* 统计信息 */}
      <div className="statistics-section">
        <div className="stat-card">
          <span className="stat-label">总用户数</span>
          <span className="stat-value">{users.length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">正常用户</span>
          <span className="stat-value">{users.filter(u => u.status === UserStatus.ACTIVE).length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">管理员</span>
          <span className="stat-value">{users.filter(u => u.role === UserRole.ADMIN).length}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">本周活跃</span>
          <span className="stat-value">
            {users.filter(u => 
              u.lastLoginAt && 
              new Date().getTime() - new Date(u.lastLoginAt).getTime() < 7 * 24 * 60 * 60 * 1000
            ).length}
          </span>
        </div>
      </div>

      {/* 模态框 */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>
                {modalMode === 'create' && '新增用户'}
                {modalMode === 'edit' && '编辑用户'}
                {modalMode === 'view' && '用户详情'}
                {modalMode === 'password' && '修改密码'}
              </h3>
              <button className="close-button" onClick={() => setShowModal(false)}>✕</button>
            </div>
            
            <div className="modal-body">
              {modalMode === 'password' ? (
                <form onSubmit={handlePasswordSubmit}>
                  {currentUser?.id === selectedUser?.id && (
                    <div className="form-group">
                      <label>当前密码 <span className="required">*</span></label>
                      <input
                        type="password"
                        value={passwordData.oldPassword}
                        onChange={(e) => setPasswordData(prev => ({ ...prev, oldPassword: e.target.value }))}
                        className="glass-input"
                        placeholder="请输入当前密码"
                        required
                      />
                    </div>
                  )}
                  
                  <div className="form-group">
                    <label>新密码 <span className="required">*</span></label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                      className="glass-input"
                      placeholder="请输入新密码"
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div className="form-group">
                    <label>确认新密码 <span className="required">*</span></label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      className="glass-input"
                      placeholder="请再次输入新密码"
                      required
                      minLength={6}
                    />
                  </div>
                  
                  <div className="form-actions">
                    <button type="button" className="glass-button secondary" onClick={() => setShowModal(false)}>
                      取消
                    </button>
                    <button type="submit" className="glass-button primary">
                      确认修改
                    </button>
                  </div>
                </form>
              ) : modalMode === 'view' && selectedUser ? (
                <div className="user-details">
                  <div className="detail-group">
                    <label>用户名</label>
                    <span>{selectedUser.username}</span>
                  </div>
                  <div className="detail-group">
                    <label>昵称</label>
                    <span>{selectedUser.nickname}</span>
                  </div>
                  <div className="detail-group">
                    <label>邮箱</label>
                    <span>{selectedUser.email || '未设置'}</span>
                  </div>
                  <div className="detail-group">
                    <label>手机号</label>
                    <span>{selectedUser.phone || '未设置'}</span>
                  </div>
                  <div className="detail-group">
                    <label>角色</label>
                    <span className={`role-badge ${selectedUser.role}`}>
                      {roleLabels[selectedUser.role]}
                    </span>
                  </div>
                  <div className="detail-group">
                    <label>状态</label>
                    <span className={`status-badge ${selectedUser.status}`}>
                      {statusLabels[selectedUser.status]}
                    </span>
                  </div>
                  <div className="detail-group">
                    <label>注册时间</label>
                    <span>{new Date(selectedUser.createdAt).toLocaleString('zh-CN')}</span>
                  </div>
                  <div className="detail-group">
                    <label>最后登录</label>
                    <span>{selectedUser.lastLoginAt ? new Date(selectedUser.lastLoginAt).toLocaleString('zh-CN') : '从未登录'}</span>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  <div className="form-row">
                    <div className="form-group">
                      <label>用户名 <span className="required">*</span></label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData(prev => ({ ...prev, username: e.target.value }))}
                        className="glass-input"
                        placeholder="请输入用户名"
                        required
                        disabled={modalMode === 'view'}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>昵称 <span className="required">*</span></label>
                      <input
                        type="text"
                        value={formData.nickname}
                        onChange={(e) => setFormData(prev => ({ ...prev, nickname: e.target.value }))}
                        className="glass-input"
                        placeholder="请输入昵称"
                        required
                        disabled={modalMode === 'view'}
                      />
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>邮箱</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="glass-input"
                        placeholder="请输入邮箱地址"
                        disabled={modalMode === 'view'}
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>手机号</label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="glass-input"
                        placeholder="请输入手机号"
                        disabled={modalMode === 'view'}
                      />
                    </div>
                  </div>
                  
                  {modalMode === 'create' && (
                    <div className="form-group">
                      <label>密码 <span className="required">*</span></label>
                      <input
                        type="password"
                        value={formData.password || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                        className="glass-input"
                        placeholder="请输入密码"
                        required
                        minLength={6}
                      />
                    </div>
                  )}
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label>角色 <span className="required">*</span></label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData(prev => ({ ...prev, role: e.target.value as UserRole }))}
                        className="glass-input"
                        required
                        disabled={modalMode === 'view'}
                      >
                        {Object.entries(roleLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="form-group">
                      <label>状态 <span className="required">*</span></label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value as UserStatus }))}
                        className="glass-input"
                        required
                        disabled={modalMode === 'view'}
                      >
                        {Object.entries(statusLabels).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  {modalMode !== 'view' && (
                    <div className="form-actions">
                      <button type="button" className="glass-button secondary" onClick={() => setShowModal(false)}>
                        取消
                      </button>
                      <button type="submit" className="glass-button primary">
                        {modalMode === 'create' ? '创建用户' : '保存修改'}
                      </button>
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