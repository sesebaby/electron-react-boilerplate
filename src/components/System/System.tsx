import React, { useState, useEffect } from 'react';
import UserManagement from './UserManagement';
import './System.css';

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
    { id: 'users' as SystemTab, label: '用户管理', icon: '👥' },
    { id: 'permissions' as SystemTab, label: '权限管理', icon: '🔐' },
    { id: 'settings' as SystemTab, label: '系统设置', icon: '⚙️' },
    { id: 'logs' as SystemTab, label: '操作日志', icon: '📋' }
  ];

  return (
    <div className={`system ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>系统管理</h2>
          <p>用户、权限、设置和日志管理</p>
        </div>
      </div>

      {/* 标签导航 */}
      <div className="tab-navigation">
        <div className="tab-list">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => handleTabChange(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="tab-content">
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'permissions' && (
          <div className="permission-management">
            <div className="page-header">
              <h3>权限管理</h3>
              <p>管理系统角色和权限设置</p>
            </div>
            <div className="coming-soon">
              <div className="coming-soon-icon">🚧</div>
              <h4>功能开发中</h4>
              <p>权限管理功能正在开发中，敬请期待...</p>
            </div>
          </div>
        )}
        {activeTab === 'settings' && (
          <div className="system-settings">
            <div className="page-header">
              <h3>系统设置</h3>
              <p>配置系统参数和业务规则</p>
            </div>
            <div className="coming-soon">
              <div className="coming-soon-icon">🚧</div>
              <h4>功能开发中</h4>
              <p>系统设置功能正在开发中，敬请期待...</p>
            </div>
          </div>
        )}
        {activeTab === 'logs' && (
          <div className="operation-logs">
            <div className="page-header">
              <h3>操作日志</h3>
              <p>查看系统操作记录和审计日志</p>
            </div>
            <div className="coming-soon">
              <div className="coming-soon-icon">🚧</div>
              <h4>功能开发中</h4>
              <p>操作日志功能正在开发中，敬请期待...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default System;