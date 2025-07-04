import React from 'react';
import { DashboardTailwind } from './Dashboard/DashboardTailwind';
import MinimalDashboard from './MinimalDashboard';
import { InventoryOverviewTailwind } from './Inventory/InventoryOverviewTailwind';
import { InventoryListTailwind } from './Inventory/InventoryListTailwind';
import { ProductManagementTailwind } from './Inventory/ProductManagementTailwind';
import { CategoryManagementTailwind } from './Inventory/CategoryManagementTailwind';
import { WarehouseManagementTailwind } from './Inventory/WarehouseManagementTailwind';
import { StockInTailwind } from './Inventory/StockInTailwind';
import { StockOutTailwind } from './Inventory/StockOutTailwind';
import { StockAdjustTailwind } from './Inventory/StockAdjustTailwind';
import { TransactionRecordsTailwind } from './Inventory/TransactionRecordsTailwind';
import SupplierManagementTailwind from './Purchase/SupplierManagementTailwind';
import PurchaseOrderManagementTailwind from './Purchase/PurchaseOrderManagementTailwind';
import PurchaseReceiptManagementTailwind from './Purchase/PurchaseReceiptManagementTailwind';
import CustomerManagementTailwind from './Sales/CustomerManagementTailwind';
import SalesOrderManagementTailwind from './Sales/SalesOrderManagementTailwind';
import SalesDeliveryManagementTailwind from './Sales/SalesDeliveryManagementTailwind';
import InventoryReports from './Reports/InventoryReports';
import SalesReports from './Reports/SalesReports';
import PurchaseReports from './Reports/PurchaseReports';
import FinancialReports from './Reports/FinancialReports';
import FinancialTailwind from './Financial/FinancialTailwind';
import SystemManagement from './SystemManagement/SystemManagement';
import System from './System/System';

interface PageContainerProps {
  currentPage: string;
}

// 页面映射
const pageComponents: Record<string, React.ComponentType> = {
  'dashboard': DashboardTailwind,
  'dashboard-minimal': MinimalDashboard,
  'inventory-overview': InventoryOverviewTailwind,
  'inventory-products': InventoryListTailwind,
  'products': ProductManagementTailwind,
  'categories': CategoryManagementTailwind,
  'warehouses': WarehouseManagementTailwind,
  'stock-in': StockInTailwind,
  'stock-out': StockOutTailwind,
  'stock-adjust': StockAdjustTailwind,
  'transaction-records': TransactionRecordsTailwind,
  'suppliers': SupplierManagementTailwind,
  'purchase-orders': PurchaseOrderManagementTailwind,
  'purchase-receipts': PurchaseReceiptManagementTailwind,
  'customers': CustomerManagementTailwind,
  'sales-orders': SalesOrderManagementTailwind,
  'sales-delivery': SalesDeliveryManagementTailwind,
  'inventory-reports': InventoryReports,
  'sales-reports': SalesReports,
  'purchase-reports': PurchaseReports,
  'financial-reports': FinancialReports,
  'financial': FinancialTailwind,
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
  
  // 财务管理模块 - 已完成基础功能
  'accounts-payable': FinancialTailwind,
  'accounts-receivable': FinancialTailwind,
  'payments': FinancialTailwind,
  'receipts': FinancialTailwind,
  
  // 报表分析模块 - 部分完成
  
  // 系统管理模块 - 用户管理已完成，其他开发中
  'users': System,
  'permissions': System,
  'settings': System,
  'logs': System
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