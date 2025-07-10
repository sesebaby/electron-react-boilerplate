# 错误及修复记录

## [2025-07-10 13:49] 单位管理添加功能无响应问题
- **类型**：Service Configuration Error
- **位置**：src/services/business/index.ts:114-124
- **描述**：unitService 被定义为简单的占位符对象，而不是真正的 UnitService 实例，导致添加单位时调用的是虚假方法，没有实际的数据库操作
- **解决方案**：
  1. 替换占位符 unitService 为真实的 UnitService 实例导入
  2. 导入语句：`import unitServiceImpl from './unitService'`
  3. 导出语句：`export const unitService = unitServiceImpl`
  4. 同时修复了 warehouseService 的相同问题
  5. 修复了 dashboardService 中 warehouseStats.totalCount 改为 warehouseStats.total 的类型匹配问题

## [2025-07-10 13:49] 构建错误 - 类型不匹配
- **类型**：TypeScript Type Error
- **位置**：src/services/dashboard/dashboardService.ts:122
- **描述**：warehouseStats.totalCount 属性不存在，实际返回的是 warehouseStats.total
- **解决方案**：将 `warehouseStats.totalCount` 修改为 `warehouseStats.total`