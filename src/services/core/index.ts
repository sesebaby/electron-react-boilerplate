/**
 * 核心服务导出
 * 重构后使用领域服务架构
 */

export { ServiceManager, serviceManager } from './ServiceManager';
// 使用新的领域服务替换巨型InventoryService
export { DomainServiceManager } from '../domain/DomainServiceManager';
export { InventoryDomainService } from '../domain/InventoryDomainService';
export { MasterDataService } from '../domain/MasterDataService';
export { ReportService as DomainReportService } from '../domain/ReportService';

// 保留其他核心服务
export { OrderService } from './OrderService';
export { FinancialService } from './FinancialService';
export { SystemService } from './SystemService';
export { ReportService } from './ReportService';
export { DatabaseManager } from './database';
export * from './types';