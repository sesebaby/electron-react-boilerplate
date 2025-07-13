# UI组件迁移指南

## 📋 迁移概述

本指南说明如何将现有UI组件从复杂的InventoryService迁移到新的轻量级服务架构。

## 🔄 迁移策略

### 1. 渐进式迁移
- 逐个组件迁移，保持功能可用
- 使用适配器模式提供向后兼容
- 每个组件迁移后立即测试

### 2. 兼容性保证
- 保持现有API接口不变
- 数据格式保持一致
- 错误处理方式统一

## 📝 具体迁移步骤

### 步骤1：更新服务导入

**原代码**：
```typescript
// 旧的复杂导入方式
import { serviceManager } from '../../services/core';
const inventoryService = serviceManager.getInventoryService();
```

**新代码**：
```typescript
// 新的简化导入方式
import { serviceManager } from '../../services/simple/SimpleServiceManager';
const productService = serviceManager.getProductService();
```

### 步骤2：更新方法调用

**原代码**：
```typescript
// 复杂的方法调用
const result = await inventoryService.getProducts(filter, pagination);
if (result.success && result.data) {
  const items = result.data.items; // 复杂的数据结构
  setProducts(items);
}
```

**新代码**：
```typescript
// 简化的方法调用
const result = await productService.getProducts(filter);
if (result.success && result.data) {
  setProducts(result.data); // 直接的数据结构
}
```

### 步骤3：更新错误处理

**原代码**：
```typescript
// 复杂的错误处理
try {
  const result = await inventoryService.createProduct(productData);
  if (!result.success) {
    setError(result.error || '创建失败');
  }
} catch (error) {
  setError(error instanceof Error ? error.message : '未知错误');
}
```

**新代码**：
```typescript
// 统一的错误处理
const result = await productService.createProduct(productData);
if (!result.success) {
  setError(result.error || '创建失败');
} else {
  setProduct(result.data);
}
```

## 🔧 具体组件迁移示例

### useInventory Hook 迁移

**迁移前**：
```typescript
// src/hooks/useInventory.ts (原版本)
const loadItems = useCallback(async () => {
  try {
    const inventoryService = serviceManager.getInventoryService();
    const result = await inventoryService.getProducts();
    if (result.success && result.data) {
      const items: InventoryItem[] = result.data.items.map(convertProductToInventoryItem);
      dispatch({ type: 'SET_ITEMS', payload: items });
    }
  } catch (err) {
    dispatch({ type: 'SET_ERROR', payload: err.message });
  }
}, []);
```

**迁移后**：
```typescript
// src/hooks/useInventory.ts (新版本)
const loadItems = useCallback(async () => {
  try {
    const productService = serviceManager.getProductService();
    const result = await productService.getProducts();
    if (result.success && result.data) {
      // 直接使用产品数据，无需复杂转换
      const items: InventoryItem[] = result.data.map(convertProductToInventoryItem);
      dispatch({ type: 'SET_ITEMS', payload: items });
    } else {
      dispatch({ type: 'SET_ERROR', payload: result.error || '加载失败' });
    }
  } catch (err) {
    dispatch({ type: 'SET_ERROR', payload: '加载数据失败' });
  }
}, []);
```

### ProductManagement 组件迁移

**迁移前**：
```typescript
// src/components/Inventory/ProductManagement.tsx (原版本)
useEffect(() => {
  const initServices = async () => {
    try {
      await serviceManager.initialize(); // 复杂初始化
      const inventoryService = serviceManager.getInventoryService();
      setServices({
        productService: inventoryService,
        categoryService: inventoryService,
        unitService: inventoryService
      });
    } catch (error) {
      setServicesError(error.message);
    }
  };
  initServices();
}, []);
```

**迁移后**：
```typescript
// src/components/Inventory/ProductManagement.tsx (新版本)
useEffect(() => {
  const initServices = async () => {
    try {
      // 无需复杂初始化，直接获取服务
      const productService = serviceManager.getProductService();
      // const categoryService = serviceManager.getCategoryService(); // 待实现
      // const unitService = serviceManager.getUnitService(); // 待实现
      
      setServices({
        productService: productService,
        categoryService: productService, // 临时使用产品服务
        unitService: productService // 临时使用产品服务
      });
    } catch (error) {
      setServicesError('服务初始化失败');
    }
  };
  initServices();
}, []);
```

### StockIn 组件迁移

**迁移前**：
```typescript
// src/components/Inventory/StockIn.tsx (原版本)
const loadData = async () => {
  try {
    const inventoryService = serviceManager.getInventoryService();
    const [productsResult, warehousesResult] = await Promise.all([
      inventoryService.findAllProducts(),
      inventoryService.findAllWarehouses()
    ]);
    
    const productsData = productsResult.success ? 
      (Array.isArray(productsResult.data) ? productsResult.data : productsResult.data?.items || []) : [];
    setProducts(productsData);
  } catch (err) {
    setError('加载数据失败');
  }
};
```

**迁移后**：
```typescript
// src/components/Inventory/StockIn.tsx (新版本)
const loadData = async () => {
  try {
    const productService = serviceManager.getProductService();
    // const warehouseService = serviceManager.getWarehouseService(); // 待实现
    
    const productsResult = await productService.getProducts();
    // const warehousesResult = await warehouseService.getWarehouses(); // 待实现
    
    if (productsResult.success) {
      setProducts(productsResult.data || []);
    } else {
      setError(productsResult.error || '加载产品失败');
    }
  } catch (err) {
    setError('加载数据失败');
  }
};
```

## 📋 迁移检查清单

### 组件迁移前检查
- [ ] 确认组件使用的InventoryService方法
- [ ] 识别数据格式和错误处理方式
- [ ] 准备测试用例验证功能

### 组件迁移中检查
- [ ] 更新服务导入语句
- [ ] 修改方法调用方式
- [ ] 统一错误处理逻辑
- [ ] 简化数据处理流程

### 组件迁移后检查
- [ ] 功能测试通过
- [ ] 错误处理正常
- [ ] 性能无明显下降
- [ ] 代码更简洁易读

## ⚠️ 常见问题和解决方案

### 问题1：方法不存在
**现象**：调用新服务时提示方法不存在
**解决**：检查方法名是否正确，或使用适配器模式

### 问题2：数据格式不匹配
**现象**：新服务返回的数据格式与预期不符
**解决**：添加数据转换函数或更新组件逻辑

### 问题3：错误处理不一致
**现象**：错误信息显示不正确
**解决**：统一使用新的错误处理模式

## 📈 迁移效果验证

### 性能指标
- [ ] 组件加载时间不增加
- [ ] 内存使用量减少
- [ ] 代码行数减少

### 功能指标
- [ ] 所有原有功能正常
- [ ] 错误处理正确
- [ ] 用户体验无变化

### 代码质量指标
- [ ] 代码更简洁
- [ ] 逻辑更清晰
- [ ] 维护更容易

---

**文档版本**: v1.0  
**最后更新**: 2025-07-13  
**适用范围**: InventoryService重构项目
