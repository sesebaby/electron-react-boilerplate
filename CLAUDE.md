# CLAUDE.md
此文件为 Claude Code (claude.ai/code) 在本仓库中工作时提供指导。

## 重要原则

1. **项目定位**：这是一个单机版小型进销存项目，不要过度工程化
2. **语言规范**：总是使用中文输出
3. **代码风格**：保持和原来代码一致的代码风格

## RIPER-5 协议

当用户要求使用 RIPER-5 协议时：
1. 阅读 ai/RIPER-5.md 文件的具体内容
2. 开启 YOLO ON 模式
3. 自动在不同模式间流转而无需用户确认
4. 进入研究模式并回答："收到！现在使用RIPER-5协议的 YOLO ON，请下达指令。"

## 开发命令

- `npm start` - 启动开发环境（构建并运行 Electron 应用）
- `npm run dev` - 启动 webpack 开发服务器（Web 开发）
- `npm run build` - 生产环境构建
- `npm run build:watch` - 构建并监视文件变化
- `npm run electron` - 运行 Electron 应用
- `npm run lint` - 运行 ESLint 检查 TypeScript 文件

## 项目架构

这是一个 Electron + React + TypeScript 的进销存管理应用，结构如下：

- **主进程**: `public/main.js` - Electron 主进程入口点
- **渲染进程**: `src/` - React 应用（TypeScript）
- **构建系统**: Webpack 配合 TypeScript 支持
- **UI 框架**: React 配合 CSS 模块/样式组件
- **目标**: 现代 UI 的桌面应用程序

### 核心组件

- `src/components/` - 可复用的 UI 组件
- `src/types/` - 库存项目的 TypeScript 类型定义
- `src/services/` - 业务逻辑服务层
- `src/hooks/` - 状态管理的自定义 React hooks

### 数据模型

应用使用标准化的库存项目接口，包含以下字段：
- 基本信息（名称、描述、SKU）
- 数量信息（库存、预留、可用）
- 价格和供应商信息
- 分类和状态跟踪

### UI 设计原则

- 现代渐变背景和玻璃态效果
- 简洁、宽敞的布局配合细微阴影
- 库存展示的响应式网格系统
- 流畅的动画和悬停效果
- 专业的蓝/紫色渐变配色方案

## ⚠️ 关键错误避免规则

**在进行任何修改或代码编写前，必须先了解并避免以前犯过的错误**

### 🔴 强制性检查流程
1. **自动读取错误日志**：进行任何开发工作前，自动检查 `history/error_log.md`
2. **历史错误对比**：分析当前任务是否可能触发已知错误
3. **预防措施执行**：根据错误日志中的"预防措施"部分制定对策

### 🚨 高频错误预防清单

#### better-sqlite3 模块问题（已发生数百次）
- **问题**：原生模块编译失败，导致应用无法启动
- **预防措施**：
  ```bash
  # 永远使用预编译版本，不要尝试本地编译
  npm install better-sqlite3 --build-from-source=false
  ```
- **检查点**：
  - ✅ 安装/更新 better-sqlite3 时必须使用 `--build-from-source=false`
  - ✅ 避免运行 `npm rebuild better-sqlite3`
  - ✅ 在 package.json 中锁定 better-sqlite3 版本
  - ✅ 优先考虑 sql.js 等无需编译的替代方案

#### 数据库处理器缺失
- **问题**：IPC 处理器未注册导致前端调用失败
- **预防措施**：
  - 新增数据库操作前，检查对应 IPC 处理器是否存在
  - 在 `public/database/handlers/` 中注册所有必需的处理器

#### 服务实例占位符问题
- **问题**：使用占位符对象而非真实服务实例
- **预防措施**：
  - 检查 `src/services/business/index.ts` 中的服务导出
  - 确保所有服务都是真实实例，不是占位符

### 📋 强制性开发检查清单

**每次开发前必须执行：**
1. [ ] 读取 `history/error_log.md` 最新 3 条错误记录
2. [ ] 分析当前任务是否涉及已知问题领域
3. [ ] 制定相应预防措施
4. [ ] 验证关键依赖模块状态（特别是 better-sqlite3）
5. [ ] 确认 IPC 处理器完整性

**开发过程中必须遵循：**
- 🚫 **禁止**本地编译 better-sqlite3（使用 --build-from-source=false）
- 🚫 **禁止**使用占位符服务对象
- ✅ **必须**在添加新功能前检查对应 IPC 处理器
- ✅ **必须**验证数据结构匹配性

**完成后必须执行：**
1. [ ] 运行 `npm run build` 验证构建
2. [ ] 运行 `npm start` 验证启动
3. [ ] 如发现新错误，立即更新 `history/error_log.md`

### 🎯 目标：零重复错误
通过严格遵循上述规则，确保已解决的问题不再重复发生，提高开发效率和代码质量。

