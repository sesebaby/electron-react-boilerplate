import React, { useState } from 'react';
import AccountsPayableManagement from './AccountsPayableManagement';
import AccountsReceivableManagement from './AccountsReceivableManagement';
import PaymentRecordsManagement from './PaymentRecordsManagement';
import ReceiptRecordsManagement from './ReceiptRecordsManagement';
import { GlassCard } from '../ui/FormControls';

interface FinancialProps {
  className?: string;
}

type FinancialTab = 'payables' | 'receivables' | 'payments' | 'receipts' | 'reports';

// 根据URL路径确定默认显示的标签
const _getDefaultTab = (): FinancialTab => {
  const _hash = window.location.hash.replace('#', '');
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

  const _tabs = [
    { id: 'payables' as FinancialTab, label: '应付账款', icon: '💰', description: '管理供应商付款' },
    { id: 'receivables' as FinancialTab, label: '应收账款', icon: '💴', description: '管理客户收款' },
    { id: 'payments' as FinancialTab, label: '付款记录', icon: '📤', description: '查看付款历史' },
    { id: 'receipts' as FinancialTab, label: '收款记录', icon: '📥', description: '查看收款历史' },
    { id: 'reports' as FinancialTab, label: '财务报表', icon: '📊', description: '分析财务数据' }
  ];

  const _renderTabContent = () => {
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
          <div className="min-h-screen">
            <div className="flex items-center justify-center min-h-[50vh]">
              <GlassCard className="text-center p-12">
                <div className="text-6xl mb-6">🚧</div>
                <h3 className="text-2xl font-bold mb-3 text-white">
                  财务报表
                </h3>
                <p className="text-lg text-white/80">
                  此功能正在开发中，敬请期待...
                </p>
                <div className="mt-6 text-sm text-white/60">
                  即将推出：收支分析、资金流向、盈利报表等功能
                </div>
              </GlassCard>
            </div>
          </div>
        );
      default:
        return <AccountsPayableManagement />;
    }
  };

  return (
    <div 
      className={`min-h-screen bg-gradient-to-br from-indigo-500 to-purple-600 ${className || ''}`}
    >
      {/* 页面头部 */}
      <div className="p-6 pb-0">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2 text-white">
            财务管理
          </h1>
          <p className="text-white/80">管理应付账款、应收账款和财务报表</p>
        </div>

        {/* 标签导航 */}
        <GlassCard className="p-2">
          <div className="flex flex-wrap gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                className={`
                  flex-1 min-w-0 px-4 py-3 rounded-xl transition-all duration-300 flex flex-col items-center text-center
                  ${activeTab === tab.id 
                    ? 'bg-white/20 text-white border border-white/30 shadow-lg transform scale-105' 
                    : 'bg-white/10 text-white/70 hover:bg-white/15'
                  }
                `}
                onClick={() => setActiveTab(tab.id)}
              >
                <span className="text-xl mb-1">{tab.icon}</span>
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
      </div>

      {/* 内容区域 */}
      <div className="tab-content">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default Financial;