import React, { useState, useEffect } from 'react';
import './Reports.css';

interface FinancialReportsProps {
  className?: string;
}

export const FinancialReports: React.FC<FinancialReportsProps> = ({ className }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 模拟加载
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  }, []);

  if (loading) {
    return (
      <div className={`financial-reports ${className || ''}`}>
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>加载财务报表数据中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`financial-reports ${className || ''}`}>
      {/* 页面头部 */}
      <div className="page-header">
        <div className="header-left">
          <h2>财务报表</h2>
          <p>财务状况、现金流和盈利分析报表</p>
        </div>
        <div className="header-actions">
          <button className="glass-button secondary">
            <span className="button-icon">📊</span>
            导出报表
          </button>
          <button className="glass-button primary">
            <span className="button-icon">🔄</span>
            刷新数据
          </button>
        </div>
      </div>

      {/* 开发中提示 */}
      <div className="development-page">
        <div className="development-container">
          <div className="development-icon">🚧</div>
          <h2 className="development-title">财务报表开发中</h2>
          <p className="development-description">
            财务报表功能正在开发中，将包括：<br/>
            • 收入支出分析报表<br/>
            • 应收应付账款报表<br/>
            • 现金流量分析<br/>
            • 利润分析报表<br/>
            • 财务健康度评估
          </p>
          <div className="development-info">
            <div className="info-item">
              <span className="info-label">开发状态:</span>
              <span className="info-value">规划中</span>
            </div>
            <div className="info-item">
              <span className="info-label">预计完成:</span>
              <span className="info-value">下个版本</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FinancialReports;