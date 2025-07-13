# 背景
文件名：2025-01-12_1_api-interface-testing.md
创建于：2025-01-12_17:30:00
创建者：karlo
主分支：main
任务分支：task/api-interface-testing_2025-01-12_1
Yolo模式：On

# 任务描述
当前项目的前后端接口存在问题,比如接口不匹配,字段不一致等,怎么做前后端接口联调测试?

# 项目概览
这是一个基于Electron + React + TypeScript的单机版进销存系统，采用IPC通信方式，前端通过服务层与后端Electron主进程交互，数据存储在SQLite数据库中。

⚠️ 警告：永远不要修改此部分 ⚠️
RIPER-5协议要求：
- 必须在每个响应开头声明当前模式
- 研究模式只能进行信息收集和理解
- 创新模式只能讨论解决方案
- 规划模式创建详尽的技术规范
- 执行模式严格按计划实施
- 审查模式验证实施与计划的符合性
⚠️ 警告：永远不要修改此部分 ⚠️

# 分析

## 发现的主要问题

1. **类型定义不统一**: 存在两套类型系统(entities.ts vs inventory.ts)，字段命名不一致
2. **字段映射不匹配**: 前端组件使用旧字段名(unitPrice, reorderLevel)，但数据库映射使用新字段名(salePrice, minStock)
3. **数据类型不一致**: ID字段在数据库为INTEGER，前端期望string类型
4. **缺少IPC接口验证**: 现有合约测试不够完善，没有覆盖所有IPC通信接口

## 现有测试框架分析

项目具备完善的测试体系：
- **单元测试**: Jest + React Testing Library
- **集成测试**: Jest + 真实SQLite数据库  
- **合约测试**: API契约验证(但需增强)
- **E2E测试**: Playwright + Electron
- **Mock系统**: 统一Mock数据和数据库Mock

## 关键发现

- InventoryService已更新使用正确的Product类型
- 数据库处理器有完善的字段映射表
- 缺少完整的IPC接口联调测试
- 需要增强合约测试覆盖范围

# 提议的解决方案

## 方案1: 轻量级字段映射验证 ⭐ 推荐

**核心思路**: 专注解决字段不一致问题，建立简单有效的验证机制

**优势**:
- 开发成本低，见效快
- 直接解决当前核心问题
- 维护简单，不会成为负担
- 适合单机版简单应用

**实施内容**:
- 统一类型定义，废弃重复类型
- 增强现有字段映射测试
- 添加运行时字段验证
- 创建简单的接口一致性检查

## 方案2: 基础IPC接口测试

**核心思路**: 针对关键CRUD操作，建立基础的接口正确性验证

**优势**:
- 覆盖核心功能
- 测试简单易懂
- 能快速发现接口问题
- 不过度设计

**实施内容**:
- 测试产品增删改查接口
- 验证数据格式正确性
- 检查错误处理机制
- 确保数据持久化正确

## 方案3: 简化合约测试

**核心思路**: 基于现有合约测试，仅扩展必要的验证

**优势**:
- 利用现有基础
- 增量改进
- 维护成本可控
- 专注核心接口

**实施内容**:
- 扩展api-contract.test.ts
- 添加类型安全检查
- 验证关键字段映射
- 确保前后端类型一致

## 推荐方案: 轻量级组合策略

针对简单进销存软件，推荐采用**最小化有效**的测试策略：

### 第一步: 类型统一（优先级：高）
```typescript
// 1. 废弃src/types/inventory.ts，统一使用entities.ts
// 2. 更新所有组件使用Product接口
// 3. 确保InventoryService使用正确类型
```

### 第二步: 字段映射验证（优先级：高）
```typescript
// 增强现有合约测试，验证核心字段映射：
const CRITICAL_FIELDS = [
  'salePrice', 'minStock', 'categoryId', 'supplierId'
];
```

### 第三步: 基础接口测试（优先级：中）
```typescript
// 简单的CRUD接口测试：
- 创建产品 -> 验证数据保存正确
- 查询产品 -> 验证字段映射正确  
- 更新产品 -> 验证更新生效
- 删除产品 -> 验证删除成功
```

### 第四步: 运行时验证（优先级：低）
```typescript
// 开发环境下的字段验证，生产环境禁用
```

这种方案的特点是：
- **投入最小**: 主要是修复现有问题，而非构建复杂系统
- **效果最大**: 直接解决当前的字段不一致问题
- **维护简单**: 不会给项目增加过多负担
- **适合规模**: 符合单机版简单应用的定位


# 当前执行步骤："3. 制定详细实施计划"

## 详细实施计划

### 阶段1: 类型统一 (高优先级)

**文件修改清单:**
1. `src/types/inventory.ts` - 删除废弃的类型定义
2. `src/components/Inventory/WarehouseManagement.tsx` - 更新类型引用
3. `src/components/Settings/UnitManagement.tsx` - 更新类型引用
4. 所有引用`InventoryItem`的组件文件

**具体更改规范:**
- 移除`inventory.ts`中的`InventoryItem`接口
- 将所有组件中的`InventoryItem`替换为`Product`
- 更新import语句从`./types/inventory`改为`./types/entities`
- 确保字段名使用标准命名：`salePrice`、`minStock`、`categoryId`、`supplierId`

### 阶段2: 增强字段映射验证 (高优先级)

**文件修改清单:**
1. `tests/contract/api-contract.test.ts` - 扩展现有合约测试
2. 新建`tests/contract/field-mapping.test.ts` - 专门的字段映射测试
3. `public/database/handlers/inventoryHandlers.js` - 验证字段映射表

**测试规范:**
- 验证关键字段映射：`unit_price -> salePrice`、`reorder_level -> minStock`等
- 添加类型安全检查，确保前后端类型一致
- 测试数据转换的双向正确性
- 验证所有CRUD操作的字段映射

### 阶段3: 基础IPC接口测试 (中优先级)

**文件修改清单:**
1. 新建`tests/integration/ipc-interface.test.ts` - IPC接口测试
2. 扩展`tests/mocks/centralMockData.ts` - 添加测试数据

**测试内容:**
- 创建产品接口测试：验证数据正确保存
- 查询产品接口测试：验证字段映射正确
- 更新产品接口测试：验证更新生效
- 删除产品接口测试：验证删除成功
- 错误处理测试：验证异常情况处理

### 阶段4: 运行时验证 (低优先级)

**文件修改清单:**
1. `src/utils/fieldValidator.ts` - 新建字段验证工具
2. `src/services/database/electronDatabase.ts` - 添加验证调用

**验证规范:**
- 开发环境启用，生产环境禁用
- 验证关键字段存在性和类型正确性
- 记录验证失败日志
- 提供详细的错误信息

## 实施清单：

### 阶段1: 类型统一
1. 检查所有引用`InventoryItem`的文件
2. 删除`src/types/inventory.ts`文件
3. 更新`src/components/Inventory/WarehouseManagement.tsx`的类型引用
4. 更新`src/components/Settings/UnitManagement.tsx`的类型引用
5. 修复所有TypeScript编译错误
6. 运行类型检查验证修改正确

### 阶段2: 增强字段映射验证  
7. 扩展`tests/contract/api-contract.test.ts`添加关键字段验证
8. 创建`tests/contract/field-mapping.test.ts`专门测试字段映射
9. 验证`public/database/handlers/inventoryHandlers.js`字段映射表
10. 运行合约测试确保字段映射正确
11. 添加双向字段转换测试

### 阶段3: 基础IPC接口测试
12. 创建`tests/integration/ipc-interface.test.ts`文件
13. 在`tests/mocks/centralMockData.ts`中添加IPC测试数据
14. 实现产品CRUD操作的IPC接口测试
15. 添加错误处理场景测试
16. 运行集成测试验证IPC接口正确性

### 阶段4: 运行时验证
17. 创建`src/utils/fieldValidator.ts`字段验证工具
18. 在`src/services/database/electronDatabase.ts`中集成验证
19. 添加开发环境验证开关
20. 测试验证功能工作正常

### 最终验证
21. 运行所有测试套件确保没有回归
22. 执行类型检查和代码检查
23. 验证应用程序正常启动和运行

# 任务进度

[2025-01-12_17:45:00]
- 已修改：src/types/inventory.ts, src/components/InventoryTable.tsx, src/hooks/useInventory.ts, src/components/Layout/TopBar.tsx
- 更改：删除废弃的inventory.ts类型文件，统一使用Product接口，修复字段映射
- 原因：统一类型定义，解决前后端接口不一致问题
- 阻碍因素：需要修复大量import错误和字段映射问题
- 状态：未确认


# 最终审查