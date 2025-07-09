import React, { useState, useEffect } from 'react';
import UserManagement from './UserManagement';
import SystemInitialization from './SystemInitialization';
import { GlassCard } from '../ui/FormControls';

interface SystemProps {
  className?: string;
}

type SystemTab = 'users' | 'permissions' | 'settings' | 'logs' | 'initialization';

export const System: React.FC<SystemProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState<SystemTab>('users');

  // 根据当前页面设置活动标签
  useEffect(() => {
    const _currentHash = window.location.hash.replace('#', '');
    if (['users', 'permissions', 'settings', 'logs', 'initialization'].includes(currentHash)) {
      setActiveTab(currentHash as SystemTab);
    }
  }, []);

  const _handleTabChange = (tab: SystemTab) => {
    setActiveTab(tab);
    window.location.hash = tab;
  };

  const _tabs = [
    { id: 'users' as SystemTab, label: '用户管理', icon: '👥', description: '管理系统用户' },
    { id: 'permissions' as SystemTab, label: '权限管理', icon: '🔐', description: '角色权限设置' },
    { id: 'settings' as SystemTab, label: '系统设置', icon: '⚙️', description: '系统参数配置' },
    { id: 'logs' as SystemTab, label: '操作日志', icon: '📋', description: '操作记录查看' },
    { id: 'initialization' as SystemTab, label: '系统初始化', icon: '🔄', description: '重置系统数据' }
  ];

  const _renderComingSoon = (title: string, description: string) => (
    <GlassCard className="text-center p-12">
      <div className="text-6xl mb-6">🚧</div>
      <h3 className="text-2xl font-bold text-white mb-4">{title}</h3>
      <p className="text-white/80 mb-6">{description}</p>
      <div className="inline-flex items-center px-4 py-2 bg-white/10 border border-white/20 rounded-xl text-white/90 backdrop-blur-sm">
        <span className="mr-2">⏳</span>
        功能正在开发中，敬请期待...
      </div>
    </GlassCard>
  );

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 页面头部 */}
      <GlassCard className="p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-white">
              系统管理
            </h1>
            <p className="mt-1 text-white/80">
              用户、权限、设置和日志管理
            </p>
          </div>
        </div>
      </GlassCard>

      {/* 标签导航 */}
      <GlassCard className="p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              type="button"
              className={`
                flex-1 min-w-0 px-6 py-4 rounded-xl transition-all duration-300 flex flex-col items-center text-center
                ${activeTab === tab.id
                  ? 'bg-white/20 text-white border border-white/30 shadow-lg transform scale-105'
                  : 'bg-white/10 text-white/70 hover:bg-white/15 hover:text-white/90'
                }
              `}
              onClick={() => handleTabChange(tab.id)}
            >
              <span className="text-2xl mb-2">{tab.icon}</span>
              <span className="font-medium text-sm">{tab.label}</span>
              <span className={`text-xs mt-1 ${
                activeTab === tab.id ? 'text-white/90' : 'text-white/60'
              }`}>
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

        {activeTab === 'initialization' && <SystemInitialization />}
      </div>
    </div>
  );
};

export default System;