# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 重要原则

1. **项目定位**：这是一个单机版小型进销存项目，不要过度工程化
2. **语言规范**：总使用中文输出
3. **代码风格**：保持和原来代码一致的代码风格

## RIPER-5 协议

当用户要求使用 RIPER-5 协议时：
1. 阅读 ai/RIPER-5.md 文件的具体内容
2. 开启 YOLO ON 模式
3. 自动在不同模式间流转而无需用户确认
4. 进入研究模式并回答："收到！现在使用RIPER-5协议的 YOLO ON，请下达指令。"

## Development Commands

- `npm start` - Start the development environment (builds and runs Electron app)
- `npm run dev` - Start webpack dev server for web development
- `npm run build` - Build for production
- `npm run build:watch` - Build and watch for changes
- `npm run electron` - Run the Electron app
- `npm run lint` - Run ESLint on TypeScript files

## Architecture

This is an Electron + React + TypeScript inventory management application with the following structure:

- **Main Process**: `public/main.js` - Electron main process entry point
- **Renderer Process**: `src/` - React application (TypeScript)
- **Build System**: Webpack with TypeScript support
- **UI Framework**: React with CSS modules/styled components
- **Target**: Desktop application with modern UI

### Key Components

- `src/components/` - Reusable UI components
- `src/types/` - TypeScript type definitions for inventory items
- `src/data/` - Mock data and data management utilities
- `src/hooks/` - Custom React hooks for state management

### Inventory Data Model

The application uses a standardized inventory item interface with fields for:
- Basic info (name, description, SKU)
- Quantities (stock, reserved, available)
- Pricing and supplier information
- Categories and status tracking

### UI Design Principles

- Modern gradient backgrounds and glass-morphism effects
- Clean, spacious layouts with subtle shadows
- Responsive grid systems for inventory display
- Smooth animations and hover effects
- Professional color scheme with blue/purple gradients

