import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { userService } from '../services/business';
import { GlassButton, GlassInput } from './ui/FormControls';

interface PasswordChangeData {
  oldPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export const GlobalPasswordChangeModal: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [passwordData, setPasswordData] = useState<PasswordChangeData>({
    oldPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // 监听来自TopBar的密码修改事件
  useEffect(() => {
    const handleChangePassword = () => {
      if (user) {
        setIsOpen(true);
        setError(null);
        setPasswordData({
          oldPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      }
    };

    window.addEventListener('change-password', handleChangePassword);
    return () => {
      window.removeEventListener('change-password', handleChangePassword);
    };
  }, [user]);

  const handleClose = () => {
    setIsOpen(false);
    setError(null);
    setPasswordData({
      oldPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // 表单验证
    if (!passwordData.oldPassword.trim()) {
      setError('请输入当前密码');
      return;
    }

    if (!passwordData.newPassword.trim()) {
      setError('请输入新密码');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('新密码至少6个字符');
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }

    setIsLoading(true);
    try {
      await userService.changePassword(user.id, passwordData.oldPassword, passwordData.newPassword);
      
      // 显示成功消息
      const { notificationHelper } = await import('../utils/notificationHelper');
      notificationHelper.showSuccess('密码修改', '密码修改成功');
      
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '密码修改失败');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: keyof PasswordChangeData, value: string) => {
    setPasswordData(prev => ({
      ...prev,
      [field]: value
    }));
    // 清除错误信息
    if (error) {
      setError(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[9998]">
      <div className="glass-card w-full max-w-md p-6 mx-4">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">修改密码</h2>
          <button
            type="button"
            onClick={handleClose}
            className="text-white/60 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              当前密码
            </label>
            <GlassInput
              type="password"
              value={passwordData.oldPassword}
              onChange={(e) => handleInputChange('oldPassword', e.target.value)}
              placeholder="请输入当前密码"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              新密码
            </label>
            <GlassInput
              type="password"
              value={passwordData.newPassword}
              onChange={(e) => handleInputChange('newPassword', e.target.value)}
              placeholder="请输入新密码（至少6个字符）"
              disabled={isLoading}
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-white/80 mb-2">
              确认密码
            </label>
            <GlassInput
              type="password"
              value={passwordData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              placeholder="请再次输入新密码"
              disabled={isLoading}
              required
            />
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-400/30 rounded-lg p-3">
              <p className="text-red-100 text-sm">{error}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <GlassButton
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1"
            >
              取消
            </GlassButton>
            <GlassButton
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-gradient-to-r from-blue-500 to-purple-600"
            >
              {isLoading ? '修改中...' : '确认修改'}
            </GlassButton>
          </div>
        </form>
      </div>
    </div>
  );
};

export default GlobalPasswordChangeModal;