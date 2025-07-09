# 📦 Enterprise Inventory Management System (进销存管理系统)

一个基于 Electron + React + TypeScript + SQLite 的现代化企业级进销存管理系统，采用玻璃感设计风格，提供美观、高效的全流程业务管理界面。

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)

## ✨ 功能特性

### 🎨 **现代化UI设计**
- **玻璃态设计 (Glassmorphism)**：半透明背景 + 毛玻璃效果
- **未来科技风**：紫蓝渐变背景 + 发光动效
- **响应式布局**：适配桌面和移动设备
- **流畅动画**：悬浮、过渡、脉冲等交互效果

### 📊 **核心业务功能**

#### 🏠 **仪表盘 (Dashboard)**
- **数据概览**：库存总值、采购金额、销售额、利润分析
- **图表分析**：销售趋势、库存周转、热销商品分析
- **快速操作**：常用功能快捷入口

#### 📦 **库存管理 (Inventory)**
- **库存总览**：多仓库库存统计、库存预警
- **商品管理**：产品信息、分类管理、SKU管理
- **库存调整**：入库、出库、盘点、调拨
- **仓库管理**：多仓库支持、库位管理

#### 🛒 **采购管理 (Purchase)**
- **供应商管理**：供应商档案、联系方式、合作历史
- **采购订单**：订单创建、审批、跟踪
- **采购收货**：收货确认、质检记录、入库处理

#### 💰 **销售管理 (Sales)**
- **客户管理**：客户档案、信用管理、交易历史
- **销售订单**：订单管理、价格策略、折扣管理
- **销售出库**：发货管理、物流跟踪、签收确认

#### 💼 **财务管理 (Financial)**
- **应付账款**：供应商付款管理、账期跟踪
- **应收账款**：客户收款管理、账龄分析
- **收支记录**：收入支出明细、财务报表

#### 📊 **报表分析 (Reports)**
- **库存报表**：库存明细、库存周转、呆滞分析
- **销售报表**：销售统计、客户分析、商品排行
- **采购报表**：采购分析、供应商评估
- **财务报表**：损益分析、现金流报表

#### 📅 **日历功能 (Calendar)**
- **业务日历**：重要事件提醒、任务计划
- **周视图**：业务安排可视化管理

#### ⚙️ **系统管理 (System)**
- **用户管理**：用户权限、角色分配
- **权限控制**：功能权限、数据权限
- **操作日志**：系统操作记录、审计追踪
- **系统设置**：参数配置、基础数据设置

### 🔧 **技术特色**
- **跨平台桌面应用**：基于 Electron 框架
- **现代化前端技术栈**：React 18 + TypeScript + Webpack 5 + Tailwind CSS
- **企业级数据库**：SQLite 数据库 + 完整的数据迁移系统
- **模块化架构**：分层服务架构 + 业务服务管理器
- **组件化设计**：Radix UI + 自定义组件库
- **状态管理**：React Hooks + Context API
- **安全特性**：用户权限管理 + 操作日志 + 数据加密
- **数据导入导出**：Excel 导入导出 + 数据备份
- **实时监控**：系统状态监控 + 错误边界处理

## 🛠️ **技术栈详情**

### 前端技术栈
- **框架**: React 18.3.1 (现代化前端框架)
- **语言**: TypeScript 5.4.5 (类型安全)
- **构建工具**: Webpack 5.91.0 (模块打包)
- **样式框架**: Tailwind CSS 3.3.7 (实用优先CSS)
- **表单管理**: React Hook Form 7.60.0 (高性能表单库)
- **UI组件库**: Radix UI + 自定义组件
  - `@radix-ui/react-dropdown-menu`
  - `@radix-ui/react-scroll-area`
  - `@radix-ui/react-select`
  - `@radix-ui/react-separator`
  - `@radix-ui/react-slot`
- **图标库**: Lucide React 0.525.0
- **样式工具**: 
  - `class-variance-authority` (组件变体管理)
  - `clsx` (条件性CSS类名)
  - `tailwind-merge` (类名合并)

### 后端技术栈
- **桌面框架**: Electron 30.0.0 (跨平台桌面应用)
- **数据库**: 
  - SQLite 3 (轻量级关系型数据库)
  - Better-SQLite3 12.2.0 (高性能SQLite绑定)
- **数据验证**: Zod 3.25.71 (TypeScript优先的模式验证)
- **加密**: bcryptjs 3.0.2 (密码哈希)
- **HTTP客户端**: Axios 1.10.0

### 数据处理
- **Excel处理**: xlsx 0.18.5 (Excel文件读写)
- **UUID生成**: uuid 11.1.0 (唯一标识符)

### 开发工具
- **代码规范**: ESLint 9.30.1 + TypeScript ESLint 8.35.1
- **并发执行**: concurrently 8.2.2
- **脚本执行**: ts-node 10.9.2

### 构建和部署
- **构建系统**: Webpack 5 + TypeScript
- **CSS后处理**: PostCSS 8.5.6 + Autoprefixer 10.4.21
- **兼容性**: Node.js Polyfills (buffer, crypto, process, stream, util)

### 设计系统
- **设计模式**: shadcn/ui 架构风格
- **主题系统**: CSS变量 + Tailwind CSS自定义主题
- **视觉风格**: Glassmorphism (玻璃态设计)
- **组件管理**: 无头组件 (Radix UI) + 自定义样式层

## 📐 **系统设计原则**

### 架构设计原则

#### 1. **扁平化架构**
- **文件结构扁平化**：避免嵌套超过5层的目录结构
- **组件层级扁平化**：减少组件嵌套深度，提高可维护性
- **状态结构扁平化**：避免复杂的嵌套状态，使用规范化数据结构

#### 2. **高内聚，低耦合**
- **模块内聚**：相关功能集中在同一模块内，职责明确
- **接口解耦**：模块间通过明确的接口通信，减少直接依赖
- **服务解耦**：业务服务独立，通过服务管理器统一调度

#### 3. **单一职责原则**
- **文件职责单一**：每个文件不超过300行代码
- **函数职责单一**：每个函数不超过50行代码
- **组件职责单一**：每个组件只负责一个明确的功能

#### 4. **配置即环境 (12-Factor App)**
- **配置外部化**：所有配置通过环境变量或配置文件管理
- **环境隔离**：开发、测试、生产环境配置分离
- **无状态设计**：应用本身不存储环境相关状态

#### 5. **统一编码规范**

##### 命名风格统一
- **文件命名**：PascalCase (组件) / camelCase (工具)
- **变量命名**：camelCase
- **常量命名**：UPPER_SNAKE_CASE
- **类型命名**：PascalCase

##### 代码风格统一
- **缩进**：2个空格
- **分号**：必须使用分号
- **引号**：优先使用单引号
- **对象末尾逗号**：必须添加

##### 注释风格统一
- **函数注释**：使用JSDoc规范
- **复杂逻辑注释**：说明业务逻辑和算法思路
- **TODO注释**：包含负责人和截止时间

#### 6. **质量保证体系**

##### ESLint规则完善
- **严格的TypeScript检查**：启用strict模式
- **React最佳实践**：Hook规则、组件规范
- **代码风格强制**：Prettier集成
- **安全规则**：防止常见安全漏洞

##### CI/CD流程
- **代码检查**：提交前强制lint检查
- **测试覆盖**：单元测试覆盖率要求
- **构建验证**：多环境构建测试
- **技术债务监控**：定期代码质量报告

### 技术选型原则
**优先使用成熟的流行解决方案，避免重复造轮子**

项目遵循"**成熟技术优先**"的原则，在选择技术方案时优先考虑：

1. **表单处理**: 使用 **React Hook Form** 而非自建表单验证
   - ✅ 高性能、声明式表单管理
   - ✅ 内置验证、错误处理、类型安全
   - ✅ 生态丰富、社区支持完善

2. **UI组件**: 使用 **Radix UI** 无头组件 + **shadcn/ui** 设计系统
   - ✅ 可访问性完善、符合WAI-ARIA标准
   - ✅ 高度可定制、主题系统完整
   - ✅ TypeScript友好、开发体验优秀

3. **状态管理**: React内置方案优先，复杂场景考虑成熟状态库
   - ✅ React Hooks + Context API (轻量场景)
   - 🔄 考虑引入 Zustand/Redux Toolkit (复杂状态)

4. **数据验证**: 使用 **Zod** 进行模式验证
   - ✅ TypeScript原生支持
   - ✅ 运行时类型安全
   - ✅ 与表单库深度集成

### 推荐技术升级路径
考虑到项目的现代化需求，建议采用以下成熟方案：

- **shadcn/ui**: 基于Radix UI的现代组件库，提供更好的开发体验
- **React Hook Form + Zod**: 完整的表单解决方案
- **组件架构**: 继续使用Radix UI作为无头组件基础
- **样式方案**: 保持Tailwind CSS + 自定义主题的方式

## 🚀 快速开始

### 📋 环境要求

- **Node.js**: >= 16.0.0
- **npm**: >= 8.0.0
- **操作系统**: Windows 10/11, macOS, Linux

### 🔧 安装依赖

```bash
# 克隆项目
git clone <repository-url>
cd InventoryTest

# 安装依赖
npm install
```

### 💻 开发模式

#### 启动完整开发环境
```bash
npm start
```
这会并行运行 webpack 监听模式和 Electron 应用，自动重载代码变更。

#### 仅启动 Web 开发服务器
```bash
npm run dev
```
在浏览器中访问 `http://localhost:3000` 进行 React 组件开发。

#### 仅启动 Electron 应用
```bash
npm run electron
```
直接启动 Electron 桌面应用。

### 🏗️ 构建和部署

#### 生产环境构建
```bash
npm run build
```
构建优化后的生产版本到 `dist/` 目录。

#### 监听模式构建
```bash
npm run build:watch
```
在开发时持续监听文件变更并重新构建。

### 🧪 代码质量

#### 运行 ESLint 检查
```bash
npm run lint
```

#### 运行测试
```bash
npm test
```

## 📁 项目结构

```
inventory-management/
├── public/                          # Electron 主进程
│   ├── main.js                      # Electron 主进程入口
│   ├── preload.js                   # 预加载脚本
│   ├── database-handlers.js         # 数据库处理器
│   └── index.html                   # HTML 模板
├── data/                            # 数据存储
│   └── inventory.db                 # SQLite 数据库文件
├── src/                             # React 应用源码
│   ├── components/                  # React 组件
│   │   ├── Calendar/                # 日历模块
│   │   │   ├── CalendarOverviewPage.tsx
│   │   │   ├── DayCell.tsx
│   │   │   ├── DayDetailModal.tsx
│   │   │   └── WeeklyCalendarView.tsx
│   │   ├── Dashboard/               # 仪表盘模块
│   │   │   ├── Dashboard.tsx
│   │   │   ├── DashboardCharts.tsx
│   │   │   ├── DashboardOverview.tsx
│   │   │   └── DashboardQuickActions.tsx
│   │   ├── Financial/               # 财务管理模块
│   │   │   ├── AccountsPayableManagement.tsx
│   │   │   ├── AccountsReceivableManagement.tsx
│   │   │   ├── PaymentRecordsManagement.tsx
│   │   │   └── ReceiptRecordsManagement.tsx
│   │   ├── Inventory/               # 库存管理模块
│   │   │   ├── InventoryOverview.tsx
│   │   │   ├── ProductManagement.tsx
│   │   │   ├── CategoryManagement.tsx
│   │   │   ├── WarehouseManagement.tsx
│   │   │   ├── StockIn.tsx
│   │   │   ├── StockOut.tsx
│   │   │   ├── StockAdjust.tsx
│   │   │   └── TransactionRecords.tsx
│   │   ├── Purchase/                # 采购管理模块
│   │   │   ├── SupplierManagement.tsx
│   │   │   ├── PurchaseOrderManagement.tsx
│   │   │   └── PurchaseReceiptManagement.tsx
│   │   ├── Sales/                   # 销售管理模块
│   │   │   ├── CustomerManagement.tsx
│   │   │   ├── SalesOrderManagement.tsx
│   │   │   └── SalesDeliveryManagement.tsx
│   │   ├── Reports/                 # 报表模块
│   │   │   ├── InventoryReports.tsx
│   │   │   ├── SalesReports.tsx
│   │   │   ├── PurchaseReports.tsx
│   │   │   └── FinancialReports.tsx
│   │   ├── System/                  # 系统管理模块
│   │   │   ├── UserManagement.tsx
│   │   │   ├── PermissionManagement.tsx
│   │   │   ├── SystemSettings.tsx
│   │   │   └── OperationLogs.tsx
│   │   ├── Layout/                  # 布局组件
│   │   │   ├── AppLayout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   └── TopBar.tsx
│   │   ├── ui/                      # 基础UI组件
│   │   │   ├── FormControls.tsx     # React Hook Form集成组件
│   │   │   ├── button.tsx
│   │   │   ├── card.tsx
│   │   │   ├── table.tsx
│   │   │   ├── input.tsx
│   │   │   └── ...
│   │   └── security/                # 安全组件
│   │       ├── PermissionGate.tsx
│   │       └── SecurityMonitor.tsx
│   ├── services/                    # 服务层
│   │   ├── business/                # 业务服务
│   │   │   ├── categoryService.ts
│   │   │   ├── productService.ts
│   │   │   ├── inventoryStockService.ts
│   │   │   ├── warehouseService.ts
│   │   │   ├── supplierService.ts
│   │   │   ├── customerService.ts
│   │   │   ├── purchaseOrderService.ts
│   │   │   ├── salesOrderService.ts
│   │   │   ├── accountsPayableService.ts
│   │   │   ├── accountsReceivableService.ts
│   │   │   ├── userService.ts
│   │   │   ├── permissionService.ts
│   │   │   └── index.ts             # 服务管理器
│   │   ├── database/                # 数据库服务
│   │   │   ├── connection.ts
│   │   │   ├── electronDatabase.ts
│   │   │   ├── memoryDatabase.ts
│   │   │   └── inventoryDb.ts
│   │   ├── excel/                   # Excel 导入导出
│   │   │   ├── exporter.ts
│   │   │   └── importer.ts
│   │   ├── api/                     # API 客户端
│   │   │   └── apiClient.ts
│   │   └── dashboard/               # 仪表盘服务
│   │       └── dashboardService.ts
│   ├── hooks/                       # 自定义 Hooks
│   │   ├── useAuth.tsx
│   │   ├── useInventory.ts
│   │   ├── useTheme.ts
│   │   ├── useExcel.ts
│   │   ├── useErrorHandler.ts
│   │   └── useDialog.ts              # 对话框管理Hook
│   ├── contexts/                    # React Context
│   │   ├── DialogContext.tsx         # 对话框上下文
│   │   └── ThemeContext.tsx          # 主题上下文
│   ├── types/                       # TypeScript 类型定义
│   │   ├── entities.ts              # 实体类型
│   │   ├── database.ts              # 数据库类型
│   │   ├── inventory.ts             # 库存类型
│   │   ├── excel.ts                 # Excel类型
│   │   ├── electron.ts              # Electron类型
│   │   ├── consumption.ts           # 消耗数据类型
│   │   ├── fifo.ts                  # FIFO库存类型
│   │   ├── monthlyBalance.ts        # 月度结余类型
│   │   └── simpleNotification.ts    # 通知类型
│   ├── utils/                       # 工具函数
│   │   ├── formatters.ts            # 格式化工具
│   │   ├── errors.ts                # 错误处理
│   │   ├── secureLogger.ts          # 安全日志
│   │   ├── concurrency.ts           # 并发控制
│   │   ├── notificationHelper.ts    # 通知帮助
│   │   ├── dataCleanup.ts           # 数据清理
│   │   ├── logger.ts                # 高级日志系统
│   │   ├── concurrencyManager.ts    # 并发管理器
│   │   ├── consumptionCalculator.ts # 消耗计算器
│   │   ├── timeSlotHelper.ts        # 时间段帮助器
│   │   └── unitConversionHelper.ts  # 单位转换帮助器
│   ├── data/                        # 数据相关
│   │   └── (数据库表结构已嵌入到main.js中)
│   ├── database/                    # 数据库迁移
│   │   ├── migrations.ts            # 数据库迁移
│   │   └── seedData.ts              # 种子数据
│   ├── schemas/                     # 数据验证模式
│   │   └── validation.ts            # Zod 验证模式
│   ├── pages/                       # 页面组件
│   │   └── InventoryCardView.tsx
│   ├── styles/                      # 样式文件
│   │   ├── themes.css               # 主题样式
│   │   └── theme-adaptations.css    # 主题适配
│   ├── config/                      # 配置文件
│   │   └── index.ts                 # 应用配置
│   ├── constants/                   # 常量定义
│   │   └── index.ts                 # 应用常量
│   ├── lib/                         # 核心库
│   │   └── utils.ts                 # 核心工具函数
│   ├── globals.css                  # 全局样式
│   ├── App.tsx                      # 主应用组件
│   └── index.tsx                    # React 入口文件
├── dist/                            # 构建输出目录
├── 检查报告/                         # 开发文档
│   ├── DEVELOPMENT_PLAN.md          # 开发计划
│   ├── STATUS.md                    # 项目状态
│   └── ...                          # 其他开发文档
├── webpack.config.js                # Webpack 生产配置
├── webpack.dev.config.js            # Webpack 开发配置
├── tailwind.config.js               # Tailwind CSS 配置
├── postcss.config.js                # PostCSS 配置
├── tsconfig.json                    # TypeScript 配置
├── package.json                     # 项目依赖配置
├── CLAUDE.md                        # AI 开发指南
├── UI_DESIGN_SYSTEM.md             # UI 设计系统文档
└── README.md                        # 项目说明文档
```

## 🎨 设计系统

项目采用统一的玻璃感设计语言，详细设计规范请参考：
- 📖 [UI 设计系统文档](./UI_DESIGN_SYSTEM.md)

### 核心设计元素
```css
/* 玻璃卡片效果 */
background: rgba(255, 255, 255, 0.1);
backdrop-filter: blur(10px);
border-radius: 16px;
border: 1px solid rgba(255, 255, 255, 0.2);

/* 主背景渐变 */
background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
```

## 🔧 开发指南

### 添加新功能
1. 在 `src/components/` 创建新组件
2. 在 `src/types/` 定义相关类型
3. 使用玻璃感设计系统保持视觉一致性
4. 添加响应式断点适配移动设备

### 表单开发规范

#### 🔥 **使用 React Hook Form（推荐）**
新开发的表单组件应使用 React Hook Form + Zod 进行管理：

```tsx
// 新表单组件示例
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';

// 1. 定义验证模式
const warehouseSchema = z.object({
  code: z.string().min(1, '仓库编码不能为空'),
  name: z.string().min(1, '仓库名称不能为空'),
  address: z.string().min(1, '地址不能为空'),
  creator: z.string().min(1, '负责人不能为空'),
  isDefault: z.boolean()
});

type WarehouseForm = z.infer<typeof warehouseSchema>;

// 2. 使用 Hook Form
const Component = () => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset
  } = useForm<WarehouseForm>({
    resolver: zodResolver(warehouseSchema)
  });

  const onSubmit = async (data: WarehouseForm) => {
    // 处理表单提交
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <GlassInput
        label="仓库编码"
        register={register('code')}
        error={errors.code?.message}
        required
      />
      <GlassButton type="submit" loading={isSubmitting}>
        提交
      </GlassButton>
    </form>
  );
};
```

#### 📦 **表单组件使用**
使用增强的 FormControls 组件，支持 React Hook Form 集成：

```tsx
// 使用 register 属性进行集成
<GlassInput
  label="字段名称"
  register={register('fieldName', { required: '必填' })}
  error={errors.fieldName?.message}
  required
/>

<GlassSelect
  label="选择项"
  register={register('selectField')}
  error={errors.selectField?.message}
>
  <option value="">请选择</option>
  <option value="option1">选项1</option>
</GlassSelect>
```

#### ✅ **表单最佳实践**
1. **验证优先**: 使用 Zod 进行类型安全的数据验证
2. **性能优化**: 利用 React Hook Form 的非受控特性
3. **用户体验**: 实时验证反馈，清晰的错误提示
4. **一致性**: 统一使用 GlassInput/GlassSelect 组件

### TopBar组件设计模式
项目采用固定顶栏设计，关键实现要点：

#### ✅ 正确的布局结构
```tsx
// Layout/TopBar.tsx - 推荐架构
<header className="topbar-surface"> {/* 使用专用类 */}
  <div className="flex items-center justify-between h-16 px-4">
    {/* 左侧：品牌/标题 */}
    <div className="flex items-center gap-3">
      <h1 style={{ color: 'var(--text-primary)' }}>系统标题</h1>
    </div>
    
    {/* 右侧：操作按钮 */}
    <div className="flex items-center gap-2">
      <ThemeSwitcher />
      <UserMenu />
    </div>
  </div>
</header>
```

#### 🎨 主题适配设计
```css
/* TopBar专用CSS类 - 支持三种主题 */
.topbar-surface {
  background: var(--topbar-background);
  backdrop-filter: var(--glass-blur);
  border: var(--glass-border);
  box-shadow: var(--topbar-shadow);
  color: var(--text-primary);
  text-shadow: var(--popup-text-shadow);
}
```

#### 📋 TopBar设计原则
- **固定定位**：使用 `sticky top-0` 或 `fixed top-0` 保持顶部可见
- **层级管理**：z-index 要高于其他组件，建议 `z-50`
- **主题变量**：所有颜色使用CSS变量，避免硬编码
- **响应式高度**：固定高度 `h-16` (64px) 确保布局稳定
- **内容区域适配**：确保主内容区域 `padding-top` 与TopBar高度匹配

### 修改 Mock 数据
编辑 `src/data/mockData.ts` 文件来修改测试数据：

```typescript
export const mockInventoryData: InventoryItem[] = [
  {
    id: '1',
    name: '新商品名称',
    // ... 其他属性
  }
];
```

### 自定义样式
项目使用主题系统和CSS变量：
- 主题变量定义：`src/styles/themes.css`
- 主题适配样式：`src/styles/theme-adaptations.css`
- 全局基础样式：`src/globals.css`
- 设计系统变量：参考 `UI_DESIGN_SYSTEM.md`

## 📦 依赖说明

### 核心运行时依赖
- **electron**: 跨平台桌面应用框架
- **react**: 前端 UI 框架 (v18.3+)
- **react-dom**: React DOM 渲染器
- **typescript**: 类型安全的 JavaScript 超集
- **better-sqlite3**: 高性能 SQLite 数据库
- **tailwindcss**: 实用优先的 CSS 框架
- **lucide-react**: 现代图标库
- **zod**: TypeScript 优先的模式验证

### UI 组件库
- **@radix-ui/react-***: 无头 UI 组件库
  - dropdown-menu, scroll-area, select, separator, slot
- **class-variance-authority**: 组件变体管理
- **clsx**: 条件性 CSS 类名工具
- **tailwind-merge**: Tailwind 类名合并工具

### 数据处理
- **xlsx**: Excel 文件读写
- **uuid**: 唯一标识符生成
- **axios**: HTTP 客户端
- **bcryptjs**: 密码哈希和验证

### 开发依赖
- **webpack**: 模块打包工具 (v5+)
  - webpack-cli, webpack-dev-server
- **typescript**: TypeScript 编译器 (v5.4+)
- **ts-loader**: TypeScript 文件加载器
- **css-loader & style-loader**: CSS 文件处理
- **postcss & autoprefixer**: CSS 后处理器
- **html-webpack-plugin**: HTML 文件生成
- **concurrently**: 并行脚本执行
- **ts-node**: TypeScript 脚本直接执行

### 开发工具配置
- **@types/***: TypeScript 类型定义文件
- **buffer, crypto-browserify, process**: Node.js 兼容层
- **path-browserify, stream-browserify, util**: 浏览器兼容工具

## 🐛 常见问题

### Q: 系统无法启动或初始化失败？
A: 
1. 确保已运行 `npm run build` 构建应用
2. 检查 `data/inventory.db` 数据库文件权限
3. 查看控制台错误日志，检查数据库连接和服务初始化

### Q: 数据库相关错误？
A: 
1. 检查 SQLite 数据库文件是否存在于 `data/` 目录
2. 验证数据库表结构是否完整 (参考 `public/main.js` 中的嵌入式schema)
3. 尝试删除数据库文件让系统重新创建

### Q: 权限访问被拒绝？
A: 
1. 检查用户是否已正确登录
2. 确认用户权限配置 (`src/services/business/permissionService.ts`)
3. 联系系统管理员分配相应权限

### Q: Excel 导入导出功能异常？
A: 
1. 确保上传的 Excel 文件格式正确
2. 检查文件大小限制
3. 验证 Excel 数据格式与系统要求匹配

### Q: 如何添加新的业务模块？
A: 
1. 在 `src/components/` 下创建新模块目录
2. 在 `src/services/business/` 下创建对应业务服务
3. 在数据库中添加相应表结构 (修改 `public/main.js` 中的嵌入式schema)
4. 更新路由和权限配置

### Q: 如何自定义主题样式？
A: 
1. 编辑 `src/styles/themes.css` 修改主题变量
2. 参考 `UI_DESIGN_SYSTEM.md` 了解设计规范
3. 使用 Tailwind CSS 类名进行样式定制

### Q: 系统性能优化建议？
A: 
1. 定期清理历史数据和日志
2. 合理设置数据分页大小
3. 优化数据库查询索引
4. 监控内存使用情况

## 🤝 贡献指南

1. Fork 本仓库
2. 创建功能分支：`git checkout -b feature/new-feature`
3. 提交更改：`git commit -m 'Add new feature'`
4. 推送分支：`git push origin feature/new-feature`
5. 提交 Pull Request

## 📄 许可证

本项目采用 [MIT License](LICENSE) 开源协议。

## 🙋‍♂️ 支持

如果您在使用过程中遇到问题或有建议，请：

1. 查看 [常见问题](#-常见问题) 部分
2. 提交 [Issue](../../issues)
3. 参考 [AI 开发指南](./CLAUDE.md)

---

## 📊 系统架构

### 数据库设计
- **SQLite 本地数据库**：轻量级、高性能
- **完整的关系模型**：库存、采购、销售、财务一体化
- **数据迁移系统**：版本控制和数据升级
- **自动备份机制**：数据安全保障

### 服务层架构
- **业务服务管理器**：统一的服务生命周期管理
- **分层架构设计**：数据层、业务层、表现层分离
- **事务管理**：保证数据一致性
- **错误处理机制**：完善的异常捕获和处理

### 安全特性
- **用户权限管理**：基于角色的访问控制 (RBAC)
- **数据加密存储**：敏感信息安全保护
- **操作日志记录**：完整的审计跟踪
- **输入验证**：防止 SQL 注入和 XSS 攻击

---

**构建时间**: 2024年7月  
**技术栈**: Electron + React 18 + TypeScript 5 + SQLite + Tailwind CSS  
**架构模式**: 分层架构 + 服务化设计  
**设计风格**: Glassmorphism / 未来科技风  
**适用场景**: 中小企业进销存管理、仓储物流、零售连锁  

🌟 **如果这个项目对您有帮助，请给我们一个 Star！**

## 🔄 版本更新日志

### v1.0.1 (2025-07-08)
#### 🔧 **表格组件重构**
- **修复逐日消耗视图表格header-body对齐问题**
  - 重构ConsumptionTable组件，采用单表格架构替代双表格结构
  - 实现CSS sticky positioning实现固定表头，消除表头与内容脱节
  - 优化table-cell-fixed类，增强固定列的背景模糊和z-index层级
  - 添加table-header-sticky类，确保表头在滚动时保持正确位置
  - 修复表格中分类数据格式显示错误，确保数据正确对齐
  - 支持所有主题（玻璃未来风、科技暗黑风、温暖商务风）的表格样式适配

#### 📐 **CSS架构改进**
- **新增consumption-table专用样式系统**
  - `.consumption-table-container`: 单一表格容器
  - `.table-header-sticky`: 粘性表头样式
  - `.table-header-row-primary/.table-header-row-secondary`: 双层表头结构
  - 增强`.table-cell-fixed`对表头固定列的支持，提高z-index层级
  - 确保所有表格样式使用CSS变量，支持主题动态切换

#### 🎨 **主题兼容性增强**
- 表格组件完全支持三种主题的动态切换
- 优化backdrop-filter和背景色在不同主题下的表现
- 确保固定表头在主题切换时样式正确渲染

### v1.0.0 (当前版本)
- ✅ 完整的进销存业务流程
- ✅ 企业级数据库设计
- ✅ 现代化 UI/UX 设计
- ✅ 完善的权限管理系统
- ✅ Excel 数据导入导出
- ✅ 多主题支持
- ✅ 完整的报表系统

### 计划中的功能
- 📋 移动端 APP 支持
- 🌐 多语言国际化
- 📊 更多数据可视化图表
- 🔗 第三方系统集成 API
- ☁️ 云端数据同步