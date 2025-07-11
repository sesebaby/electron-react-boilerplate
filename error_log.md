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

## [2025-07-11 16:10] npm start 命令启动失败修复
- **类型**：依赖项缺失 + TypeScript 编译错误
- **位置**:
  - public/main.js:4 (better-sqlite3 模块缺失)
  - src/components/Reports/AnalysisViews/CalendarOverviewPage.tsx:26,61,86 (未定义变量)
- **描述**:
  1. Electron 应用无法找到 better-sqlite3 模块，导致主进程启动失败
  2. CalendarOverviewPage.tsx 中使用了未导入的 calendarDataService 和 CalendarDataService
- **解决方案**:
  1. 使用 `npm install better-sqlite3` 安装缺失的依赖
  2. 使用 `npm run rebuild` 重新构建原生模块以兼容 Electron
  3. 修改 CalendarOverviewPage.tsx：
     - 添加 `import { CalendarDataService } from '../../../services/business'`
     - 将 `calendarDataService.getWeeklyData()` 替换为 `serviceManager.getReportService().getWeeklyData()`
     - 添加 `await serviceManager.initialize()` 确保服务初始化