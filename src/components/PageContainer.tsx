import React from 'react';
import Dashboard from './Dashboard/Dashboard';
import MinimalDashboard from './MinimalDashboard';
import InventoryOverview from './Inventory/InventoryOverview';
import InventoryList from './Inventory/InventoryList';

interface PageContainerProps {
  currentPage: string;
}

// 页面映射
const pageComponents: Record<string, React.ComponentType> = {
  'dashboard': Dashboard,
  'dashboard-minimal': MinimalDashboard,
  'inventory-overview': InventoryOverview,
  'inventory-products': InventoryList
};

// 开发中的页面组件
const DevelopmentPage: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <div className="development-page">
    <div className="development-container">
      <div className="development-icon">🚧</div>
      <h2 className="development-title">{title}</h2>
      <p className="development-description">{description}</p>
      <div className="development-info">
        <div className="info-item">
          <span className="info-label">开发状态:</span>
          <span className="info-value">规划中</span>
        </div>
        <div className="info-item">
          <span className="info-label">预计完成:</span>
          <span className="info-value">2024年1月</span>
        </div>
      </div>
      <button 
        className="back-to-dashboard"
        onClick={() => window.location.hash = 'dashboard'}
      >
        返回仪表板
      </button>
    </div>
  </div>
);

// 为开发中的页面创建组件
const createDevelopmentPage = (title: string, description: string) => 
  () => <DevelopmentPage title={title} description={description} />;

// 扩展页面映射，包含开发中的页面
const allPageComponents: Record<string, React.ComponentType> = {
  ...pageComponents,
  
  // 库存管理模块 - 部分已实现
  'products': createDevelopmentPage('商品管理', '管理商品信息、分类、规格等基础数据'),
  'categories': createDevelopmentPage('分类管理', '管理商品分类、层级关系和分类属性'),
  'warehouses': createDevelopmentPage('仓库管理', '管理仓库信息、位置和仓库配置'),
  'stock-in': createDevelopmentPage('入库管理', '处理商品入库、验收和库存增加操作'),
  'stock-out': createDevelopmentPage('出库管理', '处理商品出库、发货和库存减少操作'),
  'stock-adjust': createDevelopmentPage('库存调整', '处理库存盘点、调整和异常处理'),
  
  // 采购管理模块
  'suppliers': createDevelopmentPage('供应商管理', '管理供应商信息、评级和合作关系'),
  'purchase-orders': createDevelopmentPage('采购订单', '创建、管理和跟踪采购订单'),
  'purchase-receipts': createDevelopmentPage('采购收货', '处理采购收货、验收和入库'),
  
  // 销售管理模块
  'customers': createDevelopmentPage('客户管理', '管理客户信息、等级和销售关系'),
  'sales-orders': createDevelopmentPage('销售订单', '创建、管理和跟踪销售订单'),
  'sales-delivery': createDevelopmentPage('销售出库', '处理销售出库、发货和配送'),
  
  // 财务管理模块
  'accounts-payable': createDevelopmentPage('应付账款', '管理应付账款、付款计划和供应商结算'),
  'accounts-receivable': createDevelopmentPage('应收账款', '管理应收账款、收款计划和客户结算'),
  'payments': createDevelopmentPage('付款记录', '记录和管理所有付款交易'),
  'receipts': createDevelopmentPage('收款记录', '记录和管理所有收款交易'),
  
  // 报表分析模块
  'inventory-reports': createDevelopmentPage('库存报表', '库存分析、周转率和库存预警报表'),
  'sales-reports': createDevelopmentPage('销售报表', '销售业绩、趋势分析和客户分析报表'),
  'purchase-reports': createDevelopmentPage('采购报表', '采购分析、供应商评估和成本分析报表'),
  'financial-reports': createDevelopmentPage('财务报表', '财务状况、现金流和盈利分析报表'),
  
  // 系统管理模块
  'users': createDevelopmentPage('用户管理', '管理系统用户、角色和访问权限'),
  'permissions': createDevelopmentPage('权限管理', '配置用户权限、角色权限和功能权限'),
  'settings': createDevelopmentPage('系统设置', '系统配置、参数设置和个性化选项'),
  'logs': createDevelopmentPage('操作日志', '查看系统操作记录、审计跟踪和异常日志')
};

export const PageContainer: React.FC<PageContainerProps> = ({ currentPage }) => {
  const PageComponent = allPageComponents[currentPage];

  if (!PageComponent) {
    return (
      <div className="page-not-found">
        <div className="not-found-container">
          <div className="not-found-icon">❓</div>
          <h2 className="not-found-title">页面未找到</h2>
          <p className="not-found-description">
            抱歉，找不到页面 "{currentPage}"
          </p>
          <button 
            className="back-to-dashboard"
            onClick={() => window.location.hash = 'dashboard'}
          >
            返回仪表板
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <PageComponent />
    </div>
  );
};

export default PageContainer;