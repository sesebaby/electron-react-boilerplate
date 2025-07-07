# 出入库汇总组件

## 功能概述

出入库汇总组件是一个专业的库存进出汇总分析表，用于展示指定时间段内物品的期初库存、入库、出库和期末库存情况。支持按数量、换算数量和金额三个维度进行统计分析。

## 主要特性

### 📊 数据展示
- **嵌套表头结构**：期初库存、入库合计、出库合计、期末库存
- **多维度统计**：数量、换算数量、金额三个维度
- **固定列设计**：序号、物品名称、一级分类、二级分类始终可见
- **响应式表格**：支持水平和垂直滚动，表头固定

### ⏰ 时间控制
- **日期区间选择器**：自定义开始和结束日期
- **快捷时间按钮**：
  - 上上月：前两个月的完整月份
  - 上月：上个月的完整月份
  - 当月：当前月份（从月初到今天）
- **默认时间范围**：当前月份

### 🔍 筛选功能
- **商品分类筛选**：按一级分类筛选
- **商品筛选**：按具体商品筛选
- **关键词搜索**：支持商品名称和编码搜索
- **显示选项**：可选择是否显示无变动的商品

### 📈 统计信息
- **商品种类**：统计期内涉及的商品数量
- **期初库存**：时间段开始时的库存总值
- **入库金额**：期间内入库的总金额
- **出库金额**：期间内出库的总金额
- **期末库存**：时间段结束时的库存总值
- **周转率**：库存周转效率指标

### 📤 导出功能
- **CSV格式**：包含完整明细数据，可用Excel打开
- **Excel格式**：格式化的电子表格（当前为CSV格式）
- **汇总统计**：仅包含统计数据的文本文件

### 🎨 主题适配
- **玻璃未来风主题**：深色背景 + 白色文字，科技感设计
- **深色科技风主题**：基于Slate色系，专业科技感
- **温暖商务风主题**：基于Amber色系，温暖商务感
- **自动适配**：根据当前主题自动调整颜色和样式

## 技术实现

### 组件架构
```
InventoryMovementSummary/
├── InventoryMovementSummary.tsx    # 主组件
├── components/
│   ├── TimeControl.tsx             # 时间控制组件
│   ├── MovementSummaryTable.tsx    # 汇总表格组件
│   ├── ExportOptions.tsx           # 导出选项组件
│   └── index.ts                    # 组件导出
└── InventoryMovementSummary.md     # 文档说明
```

### 数据流
1. **基础数据加载**：产品、分类、仓库信息
2. **库存事务获取**：根据时间范围获取库存变动记录
3. **期初库存计算**：计算时间段开始前的库存状态
4. **期间变动汇总**：统计期间内的入库和出库
5. **期末库存计算**：期初 + 入库 - 出库
6. **数据排序和筛选**：按条件处理最终数据

### FIFO库存逻辑
- 支持先进先出（FIFO）库存计算
- 准确计算库存成本
- 考虑批次管理和过期追踪

### 响应式设计
- **桌面端优化**：1920x1080分辨率
- **笔记本适配**：1366x768分辨率
- **表格滚动**：固定列和表头设计
- **移动端友好**：响应式布局

## 使用方法

### 基本使用
```tsx
import { InventoryMovementSummary } from './components/Reports';

function App() {
  return (
    <InventoryMovementSummary />
  );
}
```

### 自定义配置
```tsx
<InventoryMovementSummary
  className="custom-class"
  defaultFilters={{
    timeRange: {
      startDate: new Date('2024-01-01'),
      endDate: new Date('2024-01-31')
    },
    showZeroMovement: true
  }}
  defaultConfig={{
    displayDimension: MovementDimension.AMOUNT,
    showConvertedQuantity: false
  }}
  onDataChange={(data) => console.log('数据更新:', data)}
  onError={(error) => console.error('错误:', error)}
/>
```

## 数据结构

### 主要类型
- `InventoryMovementSummaryData`：汇总数据行
- `MovementSummaryFilters`：筛选条件
- `MovementSummaryConfig`：组件配置
- `TimeRangeFilter`：时间范围
- `StockQuantityInfo`：库存数量信息

### 示例数据
```typescript
{
  id: "product-001",
  sequence: 1,
  productName: "iPhone 14 Pro",
  productSku: "IP14P-128-BLK",
  primaryCategory: "电子产品",
  secondaryCategory: "智能手机",
  openingStock: { quantity: 100, convertedQuantity: 10, amount: 799900 },
  inboundTotal: { quantity: 50, convertedQuantity: 5, amount: 399950 },
  outboundTotal: { quantity: 30, convertedQuantity: 3, amount: 239970 },
  closingStock: { quantity: 120, convertedQuantity: 12, amount: 959880 }
}
```

## 性能优化

- **虚拟化表格**：大数据量时的性能优化
- **数据缓存**：避免重复计算
- **懒加载**：按需加载数据
- **防抖搜索**：优化搜索性能

## 浏览器兼容性

- Chrome 80+
- Firefox 75+
- Safari 13+
- Edge 80+

## 更新日志

### v1.0.0 (2024-12-25)
- ✨ 初始版本发布
- 📊 支持出入库汇总分析
- 🎨 完整主题适配
- 📤 导出功能
- 📱 响应式设计

## 开发计划

### 下一版本 (v1.1.0)
- [ ] 真正的Excel导出支持
- [ ] 列显示控制功能
- [ ] 自动刷新选项
- [ ] 更多筛选条件
- [ ] 数据钻取功能

### 未来版本
- [ ] 图表可视化
- [ ] 数据对比功能
- [ ] 批量操作
- [ ] 打印功能
- [ ] 移动端优化
