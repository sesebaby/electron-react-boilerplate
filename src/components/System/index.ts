// 系统管理模块导出

export { UserManagement } from './UserManagement';
export { PermissionManagement } from './PermissionManagement';
export { SystemSettings } from './SystemSettings';
export { OperationLogs } from './OperationLogs';

// 保留原有的System组件用于向后兼容
export { System } from './System';

// 默认导出
export { default } from './UserManagement';
