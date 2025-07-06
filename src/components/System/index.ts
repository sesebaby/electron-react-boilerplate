// 系统管理模块导出

export { default as UserManagement } from './UserManagement';
export { default as PermissionManagement } from './PermissionManagement';
export { default as SystemSettings } from './SystemSettings';
export { default as OperationLogs } from './OperationLogs';

// 保留原有的System组件用于向后兼容
export { default as System } from './System';

// 默认导出用户管理组件
export { default } from './UserManagement';
