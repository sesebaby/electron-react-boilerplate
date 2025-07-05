import React, { useState, useEffect } from 'react';
import UserManagement from './UserManagement';
import { GlassCard } from '../ui/FormControls';

interface SystemProps {
  className?: string;
}

type SystemTab = 'users' | 'permissions' | 'settings' | 'logs';

export const System: React.FC<SystemProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState<SystemTab>('users');

  // 根据当前页面设置活动标签
  useEffect(() => {
    const currentHash = window.location.hash.replace('#', '');
    if (['users', 'permissions', 'settings', 'logs'].includes(currentHash)) {
      setActiveTab(currentHash as SystemTab);
    }
  }, []);

  const handleTabChange = (tab: SystemTab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  const tabs = [
    { id: 'users' as SystemTab, label: '用户管理', icon: '👥', description: '管理系统用户' },
    { id: 'permissions' as SystemTab, label: '权限管理', icon: '🔐', description: '角色权限设置' },
    { id: 'settings' as SystemTab, label: '系统设置', icon: '⚙️', description: '系统参数配置' },
    { id: 'logs' as SystemTab, label: '操作日志', icon: '📋', description: '操作记录查看' }
  ];

  const renderComingSoon = (title: string, description: string) => (
    <GlassCard className="text-center p-12">
      <div className="text-6xl mb-6">🚧</div>
      <h3 className="text-2xl font-bold text-gray-800 mb-4">{title}</h3>
      <p className="text-gray-600 mb-6">{description}</p>
      <div className="inline-flex items-center px-4 py-2 bg-yellow-50 border border-yellow-200 rounded-xl text-yellow-700">
        <span className="mr-2">⏳</span>
        功能正在开发中，敬请期待...
      </div>
    </GlassCard>
  );

  return (
    <div 
      className={`min-h-screen ${className || ''}`}
      style={{ background: 'var(--app-background)' }}
    >
      <div className="p-6 space-y-6">
        {/* 页面头部 */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 
              className="text-3xl font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              系统管理
            </h1>
            <p 
              className="mt-1"
              style={{ color: 'var(--text-secondary)' }}
            >
              用户、权限、设置和日志管理
            </p>
          </div>
        </div>

        {/* 标签导航 */}
        <GlassCard className="p-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`
                  flex-1 min-w-0 px-6 py-4 rounded-xl transition-all duration-300 flex flex-col items-center text-center
                  ${activeTab === tab.id ? 'shadow-lg transform scale-105' : ''}
                `}
                style={activeTab === tab.id ? {
                  background: 'var(--popup-background)',
                  color: 'var(--popup-text-primary)',
                  border: 'var(--popup-border)'
                } : {
                  background: 'var(--hover-background)',
                  color: 'var(--text-secondary)'
                }}
                onClick={() => handleTabChange(tab.id)}
              >
                <span className="text-2xl mb-2">{tab.icon}</span>
                <span className="font-medium text-sm">{tab.label}</span>
                <span 
                  className="text-xs mt-1"
                  style={{ 
                    color: activeTab === tab.id ? 'var(--popup-text-secondary)' : 'var(--text-tertiary)'
                  }}
                >
                  {tab.description}
                </span>
              </button>
            ))}
          </div>
        </GlassCard>

        {/* 内容区域 */}
        <div className="tab-content">
          {activeTab === 'users' && <UserManagement />}
          
          {activeTab === 'permissions' && 
            renderComingSoon('权限管理', '管理系统角色和权限设置')
          }
          
          {activeTab === 'settings' && 
            renderComingSoon('系统设置', '配置系统参数和业务规则')
          }
          
          {activeTab === 'logs' && 
            renderComingSoon('操作日志', '查看系统操作记录和审计日志')
          }
        </div>
      </div>
    </div>
  );
};

export default System;