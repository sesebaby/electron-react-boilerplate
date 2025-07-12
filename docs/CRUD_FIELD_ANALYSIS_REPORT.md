# 进销存系统 CRUD 字段匹配分析报告

## 执行摘要

本报告对进销存系统的前后端CRUD操作进行了全面分析，重点检查了前端TypeScript接口与后端数据库字段之间的匹配情况。

### 主要发现

1. **命名规范不一致**：后端数据库使用 snake_case，前端使用 camelCase
2. **字段映射机制**：系统通过字段映射表实现前后端字段转换
3. **潜在问题**：部分字段映射可能存在不一致或缺失

## 系统架构概述

### 技术栈
- **前端**：React + TypeScript
- **后端**：Electron Main Process + SQLite
- **通信**：IPC (Inter-Process Communication)

### 模块列表

1. **库存管理**
   - 产品管理 (Product Management)
   - 分类管理 (Category Management)
   - 仓库管理 (Warehouse Management)
   - 库存调整 (Stock Adjustment)
   - 交易记录 (Transaction Records)

2. **采购管理**
   - 供应商管理 (Supplier Management)
   - 采购订单 (Purchase Orders)
   - 采购收货 (Purchase Receipts)

3. **销售管理**
   - 客户管理 (Customer Management)
   - 销售订单 (Sales Orders)
   - 销售发货 (Sales Delivery)

4. **财务管理**
   - 应付账款 (Accounts Payable)
   - 应收账款 (Accounts Receivable)
   - 付款记录 (Payment Records)
   - 收款记录 (Receipt Records)

5. **系统管理**
   - 用户管理 (User Management)
   - 权限管理 (Permission Management)
   - 系统设置 (System Settings)
   - 操作日志 (Operation Logs)

6. **通用管理**
   - 单位管理 (Unit Management)
   - 换算规则 (Conversion Rules)

## 详细字段分析

### 1. 库存物品 (Inventory Items)

#### 数据库表结构 (inventory_items)
```sql
CREATE TABLE inventory_items (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  sku TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  supplier TEXT,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER NOT NULL DEFAULT 0,
  unit_price REAL NOT NULL DEFAULT 0,
  total_value REAL NOT NULL DEFAULT 0,
  last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
  status TEXT CHECK(status IN ('in-stock', 'low-stock', 'out-of-stock', 'discontinued')),
  location TEXT,
  reorder_level INTEGER DEFAULT 0,
  max_stock INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### 前端接口定义 (Product)
```typescript
interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  categoryId: string;      // 注意：数据库中是 category
  unitId: string;          // 注意：数据库中没有此字段
  brand?: string;          // 注意：数据库中没有此字段
  model?: string;          // 注意：数据库中没有此字段
  barcode?: string;        // 注意：数据库中没有此字段
  purchasePrice: number;   // 注意：数据库中没有此字段
  salePrice: number;       // 注意：数据库中对应 unit_price
  minStock: number;        // 注意：数据库中对应 reorder_level
  maxStock: number;        // 对应：max_stock
  status: ProductStatus;
  isActive: boolean;       // 注意：数据库中没有此字段
  images?: string[];       // 注意：数据库中没有此字段
  createdAt: Date;
  updatedAt: Date;
}
```

#### 字段映射表 (INVENTORY_FIELD_MAP)
```javascript
const INVENTORY_FIELD_MAP = {
  stock_quantity: 'stockQuantity',
  reserved_quantity: 'reservedQuantity', 
  unit_price: 'unitPrice',
  total_value: 'totalValue',
  last_updated: 'lastUpdated',
  reorder_level: 'reorderLevel',
  max_stock: 'maxStock',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
  category: 'categoryId'  // 映射 category 到 categoryId
};
```

#### 问题分析

1. **字段不匹配**：
   - 前端的 `unitId`, `brand`, `model`, `barcode`, `purchasePrice`, `isActive`, `images` 在数据库中不存在
   - 数据库的 `supplier`, `location` 在前端接口中未定义

2. **字段映射问题**：
   - `category` 被映射为 `categoryId`，但类型可能不一致
   - `unit_price` 应该映射为 `salePrice` 而非 `unitPrice`
   - `reorder_level` 应该映射为 `minStock`

### 2. 仓库管理 (Warehouses)

#### 数据库表结构
```sql
CREATE TABLE warehouses (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE,
  name TEXT NOT NULL,
  location TEXT,
  address TEXT,
  manager TEXT,
  phone TEXT,
  type TEXT CHECK(type IN ('main', 'branch', 'temporary')) DEFAULT 'branch',
  capacity INTEGER DEFAULT 0,
  is_default BOOLEAN NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### 前端接口定义
```typescript
interface Warehouse {
  id: string;
  code: string;
  name: string;
  address?: string;
  location?: string;  // 注意：与数据库字段重复
  manager?: string;
  isDefault: boolean;  // 对应：is_default
  isActive: boolean;   // 对应：is_active
  createdAt: Date;
  updatedAt: Date;
}
```

#### 问题分析
- 数据库的 `phone`, `type`, `capacity` 字段在前端未定义
- 需要确保 `is_default` 和 `is_active` 正确映射

### 3. 用户管理 (Users)

#### 数据库表结构
```sql
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  nickname TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  avatar TEXT,
  role TEXT NOT NULL CHECK(role IN ('admin', 'purchaser', 'salesperson', 'warehouse', 'finance')),
  status TEXT NOT NULL CHECK(status IN ('active', 'inactive', 'locked')) DEFAULT 'active',
  last_login_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

### 4. 分类管理 (Categories)

#### 数据库表结构
```sql
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  parent_id TEXT,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  level INTEGER DEFAULT 1,      -- 通过迁移添加
  sort_order INTEGER DEFAULT 0,  -- 通过迁移添加
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
)
```

#### 前端接口定义
```typescript
interface Category {
  id: string;
  name: string;
  code?: string;         // 注意：数据库中没有此字段
  description?: string;
  parentId?: string;     // 对应：parent_id
  level: number;
  sortOrder: number;     // 对应：sort_order
  isActive: boolean;     // 对应：is_active
  status?: string;       // 注意：数据库中没有此字段
  children?: Category[];
  createdAt: Date;
  updatedAt: Date;
}
```

## 建议和解决方案

### 1. 立即需要修复的问题

1. **完善字段映射表**：
   ```javascript
   // 建议的完整映射表
   const INVENTORY_FIELD_MAP = {
     stock_quantity: 'stockQuantity',
     reserved_quantity: 'reservedQuantity',
     unit_price: 'salePrice',  // 修正映射
     total_value: 'totalValue',
     last_updated: 'lastUpdated',
     reorder_level: 'minStock',  // 修正映射
     max_stock: 'maxStock',
     created_at: 'createdAt',
     updated_at: 'updatedAt',
     category: 'categoryId',
     is_active: 'isActive'
   };
   ```

2. **数据库迁移**：
   - 添加缺失的字段到数据库
   - 或在前端接口中移除不存在的字段

3. **统一字段命名**：
   - 建立统一的命名规范文档
   - 确保所有模块遵循相同的映射规则

### 2. 长期改进建议

1. **创建统一的字段映射层**：
   - 建立中央化的字段映射配置
   - 自动化字段转换过程

2. **使用 ORM 或查询构建器**：
   - 考虑使用 TypeORM 或 Prisma
   - 自动处理字段映射和类型转换

3. **API 文档自动生成**：
   - 使用 OpenAPI/Swagger
   - 确保前后端接口保持同步

4. **单元测试**：
   - 为每个 CRUD 操作添加测试
   - 验证字段映射的正确性

## 风险评估

### 高风险
- 字段映射错误可能导致数据丢失或损坏
- 类型不匹配可能导致运行时错误

### 中风险
- 缺失字段可能影响功能完整性
- 命名不一致增加维护成本

### 低风险
- 未使用的字段占用存储空间

## 总结

系统的CRUD操作基本功能完整，但存在字段映射不一致的问题。建议优先修复高风险问题，逐步完善字段映射机制，确保数据的完整性和系统的稳定性。

---
报告生成时间：2025年7月11日
分析人员：Backend-Frontend QA Specialist