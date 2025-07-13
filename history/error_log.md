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

## [2025-07-13 17:30] 仓库新建操作及关键业务数据库查询失败修复
- **类型**：Database Handler Missing + Data Structure Error
- **位置**：
  - public/database/handlers/systemHandlers.js (缺少 db-get 处理器)
  - src/services/domain/MasterDataService.ts (数据结构处理错误)
- **描述**：
  1. 系统缺少通用的 `db-get` IPC 处理器，导致所有使用 `window.electronAPI.dbGet()` 的业务功能失败
  2. MasterDataService 的 `getWarehouses()` 方法没有正确处理 `dbGetAllWarehouses()` 的返回结果结构
  3. 影响范围：仓库管理、分类管理、单位管理的创建、更新、删除操作中的唯一性检查
- **错误信息**：
  - `Error: No handler registered for 'db-get'`
  - `TypeError: n.map is not a function`
- **解决方案**：
  1. 在 `public/database/handlers/systemHandlers.js` 中添加通用数据库查询处理器：
     - 添加 `db-get` 处理器用于单行查询
     - 添加 `db-all` 处理器用于多行查询
     - 包含安全检查，只允许 SELECT 查询
  2. 修复 `MasterDataService.getWarehouses()` 方法：
     - 正确处理返回结果的 `success` 和 `data` 字段
     - 确保返回数组格式的数据
- **验证结果**：
  - ✅ 仓库新建功能正常工作
  - ✅ 仓库数据加载正常显示
  - ✅ 分类和单位管理的数据库查询功能恢复正常

## [2025-07-13 19:40] better-sqlite3 编译失败导致应用无法启动
- **类型**：Native Module Compilation Error
- **位置**：
  - node_modules/better-sqlite3/ (原生模块编译失败)
  - Python distutils 模块缺失
  - NODE_MODULE_VERSION 版本不匹配
- **描述**：
  - better-sqlite3 需要原生编译，但 Python 3.12 环境缺少 distutils 模块
  - 编译的模块版本(NODE_MODULE_VERSION 123)与当前 Node.js 版本(115)不匹配
  - 导致 npm build 和 npm start 都失败，应用无法启动
  - 错误信息：`ModuleNotFoundError: No module named 'distutils'`
  - 错误信息：`was compiled against a different Node.js version`
- **解决方案**：
  1. **根本解决**：使用预编译版本避免本地编译
     ```bash
     npm uninstall better-sqlite3
     npm install better-sqlite3 --build-from-source=false
     ```
  2. **预防措施**：
     - 优先使用预编译的 better-sqlite3 版本
     - 避免依赖本地 Python/C++ 编译环境
     - 在 package.json 中锁定 better-sqlite3 版本
  3. **环境诊断**：
     - Windows 环境下 Python distutils 模块经常缺失
     - Electron 版本与 Node.js 版本可能不匹配
- **根本原因**：
  - **频发性**：此问题已出现数百次，说明编译环境不稳定
  - **环境依赖**：依赖复杂的原生编译工具链(Python, Visual Studio, node-gyp)
  - **版本冲突**：Electron 内置 Node.js 版本与系统 Node.js 版本不同步
- **长期解决策略**：
  - 项目中应始终使用预编译版本
  - 添加环境检查脚本确保兼容性
  - 考虑替代方案(如 sql.js)减少原生依赖