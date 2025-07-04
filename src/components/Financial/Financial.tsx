import React, { useState } from 'react';
import AccountsPayableManagement from './AccountsPayableManagement';
import AccountsReceivableManagement from './AccountsReceivableManagement';
import PaymentRecordsManagement from './PaymentRecordsManagement';
import ReceiptRecordsManagement from './ReceiptRecordsManagement';
import './Financial.css';

interface FinancialProps {
  className?: string;
}

type FinancialTab = 'payables' | 'receivables' | 'payments' | 'receipts' | 'reports';

// 根据URL路径确定默认显示的标签
const getDefaultTab = (): FinancialTab => {
  const hash = window.location.hash.replace('#', '');
  switch (hash) {
    case 'accounts-payable':
      return 'payables';
    case 'accounts-receivable':
      return 'receivables';
    case 'payments':
      return 'payments';
    case 'receipts':
      return 'receipts';
    case 'financial-reports':
      return 'reports';
    default:
      return 'payables';
  }
};

export const Financial: React.FC<FinancialProps> = ({ className }) => {
  const [activeTab, setActiveTab] = useState<FinancialTab>(getDefaultTab());

  const tabs = [
    { id: 'payables' as FinancialTab, label: '应付账款', icon: '💰' },
    { id: 'receivables' as FinancialTab, label: '应收账款', icon: '💴' },
    { id: 'payments' as FinancialTab, label: '付款记录', icon: '📤' },
    { id: 'receipts' as FinancialTab, label: '收款记录', icon: '📥' },
    { id: 'reports' as FinancialTab, label: '财务报表', icon: '📊' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'payables':
        return <AccountsPayableManagement />;
      case 'receivables':
        return <AccountsReceivableManagement />;
      case 'payments':
        return <PaymentRecordsManagement />;
      case 'receipts':
        return <ReceiptRecordsManagement />;
      case 'reports':
        return (
          <div className="coming-soon">
            <div className="coming-soon-icon">🚧</div>
            <h3>财务报表</h3>
            <p>此功能正在开发中，敬请期待...</p>
          </div>
        );
      default:
        return <AccountsPayableManagement />;
    }
  };

  return (
    <div className={`financial-management ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h1>财务管理</h1>
          <p>管理应付账款、应收账款和财务报表</p>
        </div>
      </div>

      {/* 标签导航 */}
      <div className="tab-navigation">
        <div className="tab-list">
          {tabs.map(tab => (
            <button
              key={tab.id}
              className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <span className="tab-icon">{tab.icon}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 内容区域 */}
      <div className="tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Financial;