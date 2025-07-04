import React from 'react';
import Dashboard from './Dashboard/Dashboard';
import MinimalDashboard from './MinimalDashboard';
import InventoryOverview from './Inventory/InventoryOverview';
import InventoryList from './Inventory/InventoryList';
import ProductManagement from './Inventory/ProductManagement';
import CategoryManagement from './Inventory/CategoryManagement';
import WarehouseManagement from './Inventory/WarehouseManagement';
import StockIn from './Inventory/StockIn';
import StockOut from './Inventory/StockOut';
import StockAdjust from './Inventory/StockAdjust';
import TransactionRecords from './Inventory/TransactionRecords';
import SupplierManagement from './Purchase/SupplierManagement';
import PurchaseOrderManagement from './Purchase/PurchaseOrderManagement';
import PurchaseReceiptManagement from './Purchase/PurchaseReceiptManagement';
import CustomerManagement from './Sales/CustomerManagement';
import SalesOrderManagement from './Sales/SalesOrderManagement';
import SalesDeliveryManagement from './Sales/SalesDeliveryManagement';
import InventoryReports from './Reports/InventoryReports';
import SalesReports from './Reports/SalesReports';
import PurchaseReports from './Reports/PurchaseReports';
import FinancialReports from './Reports/FinancialReports';
import SystemManagement from './SystemManagement/SystemManagement';

interface PageContainerProps {
  currentPage: string;
}

// 页面映射
const pageComponents: Record<string, React.ComponentType> = {
  'dashboard': Dashboard,
  'dashboard-minimal': MinimalDashboard,
  'inventory-overview': InventoryOverview,
  'inventory-products': InventoryList,
  'products': ProductManagement,
  'categories': CategoryManagement,
  'warehouses': WarehouseManagement,
  'stock-in': StockIn,
  'stock-out': StockOut,
  'stock-adjust': StockAdjust,
  'transaction-records': TransactionRecords,
  'suppliers': SupplierManagement,
  'purchase-orders': PurchaseOrderManagement,
  'purchase-receipts': PurchaseReceiptManagement,
  'customers': CustomerManagement,
  'sales-orders': SalesOrderManagement,
  'sales-delivery': SalesDeliveryManagement,
  'inventory-reports': InventoryReports,
  'sales-reports': SalesReports,
  'purchase-reports': PurchaseReports,
  'financial-reports': FinancialReports,
  'system-management': SystemManagement
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
  
  // 库存管理模块 - 已完成
  
  // 采购管理模块 - 已完成
  
  // 销售管理模块 - 已完成
  
  // 财务管理模块
  'accounts-payable': createDevelopmentPage('应付账款', '管理应付账款、付款计划和供应商结算'),
  'accounts-receivable': createDevelopmentPage('应收账款', '管理应收账款、收款计划和客户结算'),
  'payments': createDevelopmentPage('付款记录', '记录和管理所有付款交易'),
  'receipts': createDevelopmentPage('收款记录', '记录和管理所有收款交易'),
  
  // 报表分析模块 - 部分完成
  
  // 系统管理模块 - 部分完成
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