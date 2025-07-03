# 📦 Inventory Management System

一个基于 Electron + React + TypeScript 的现代化库存管理系统，采用玻璃感设计风格，提供美观、高效的库存管理界面。

![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![Node](https://img.shields.io/badge/node-%3E%3D16.0.0-brightgreen.svg)

## ✨ 功能特性

### 🎨 **现代化UI设计**
- **玻璃态设计 (Glassmorphism)**：半透明背景 + 毛玻璃效果
- **未来科技风**：紫蓝渐变背景 + 发光动效
- **响应式布局**：适配桌面和移动设备
- **流畅动画**：悬浮、过渡、脉冲等交互效果

### 📊 **库存管理功能**
- **仪表盘概览**：总库存、总价值、低库存预警
- **智能搜索**：支持商品名称、SKU、描述全文搜索
- **多维筛选**：按分类、状态筛选库存
- **详细表格**：完整的商品信息展示
- **实时状态栏**：系统状态、时间、用户信息

### 🔧 **技术特色**
- **跨平台桌面应用**：基于 Electron 框架
- **现代化前端技术栈**：React 18 + TypeScript + Webpack 5
- **模块化组件设计**：可复用的 UI 组件库
- **响应式表格**：自适应列宽，避免内容换行
- **Mock 数据系统**：完整的测试数据支持

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
InventoryTest/
├── public/                 # Electron 主进程文件
│   ├── main.js             # Electron 入口文件
│   └── index.html          # HTML 模板
├── src/                    # React 应用源码
│   ├── components/         # React 组件
│   │   ├── Dashboard.tsx   # 仪表盘组件
│   │   ├── SearchAndFilters.tsx  # 搜索筛选组件
│   │   ├── InventoryTable.tsx    # 库存表格组件
│   │   ├── StatusBar.tsx   # 状态栏组件
│   │   └── *.css          # 组件样式文件
│   ├── hooks/             # 自定义 React Hooks
│   │   └── useInventory.ts # 库存数据管理
│   ├── types/             # TypeScript 类型定义
│   │   └── inventory.ts   # 库存相关类型
│   ├── data/              # 数据层
│   │   └── mockData.ts    # Mock 测试数据
│   ├── App.tsx            # 主应用组件
│   ├── App.css            # 全局样式
│   └── index.tsx          # React 入口文件
├── dist/                  # 构建输出目录
├── webpack.config.js      # Webpack 配置
├── tsconfig.json          # TypeScript 配置
├── package.json           # 项目配置
├── CLAUDE.md             # AI 开发指南
├── UI_DESIGN_SYSTEM.md   # UI 设计系统文档
└── README.md             # 项目说明文档
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
项目使用 CSS Modules 和全局样式相结合：
- 组件级样式：`ComponentName.css`
- 全局样式：`App.css`
- 设计系统变量：参考 `UI_DESIGN_SYSTEM.md`

## 📦 依赖说明

### 核心依赖
- **electron**: 桌面应用框架
- **react**: 前端 UI 框架
- **react-dom**: React DOM 渲染
- **typescript**: 类型安全的 JavaScript

### 开发依赖
- **webpack**: 模块打包工具
- **ts-loader**: TypeScript 加载器
- **css-loader**: CSS 文件处理
- **style-loader**: 样式注入
- **html-webpack-plugin**: HTML 文件生成
- **concurrently**: 并行运行多个脚本

## 🐛 常见问题

### Q: Electron 应用无法启动？
A: 确保已运行 `npm run build` 构建 React 应用，Electron 需要加载构建后的文件。

### Q: 表格在小屏幕上显示不完整？
A: 表格设计为水平滚动，保持列宽不换行。可以左右滑动查看完整内容。

### Q: 如何添加新的库存状态？
A: 在 `src/types/inventory.ts` 的 `status` 类型中添加新状态，并在相关组件中添加对应的样式和逻辑。

### Q: 如何修改主题颜色？
A: 编辑 `src/App.css` 中的渐变背景色，或参考 `UI_DESIGN_SYSTEM.md` 进行系统性修改。

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

**构建时间**: 2024年7月  
**技术栈**: Electron + React + TypeScript + Webpack  
**设计风格**: Glassmorphism / 未来科技风  

🌟 **如果这个项目对您有帮助，请给我们一个 Star！**