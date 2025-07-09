# 采购订单和采购收货关系流程图

## 整体业务流程

```mermaid
graph TD
    A[创建采购订单] --> B[采购订单状态: Draft]
    B --> C[确认采购订单]
    C --> D[采购订单状态: Confirmed]
    D --> E{是否需要收货?}
    E -->|是| F[手动创建采购收货单]
    E -->|否| G[订单完成]
    F --> H[采购收货单状态: Draft]
    H --> I[添加收货项目]
    I --> J[确认收货]
    J --> K[采购收货单状态: Confirmed]
    K --> L[自动更新库存]
    L --> M[更新订单已收货数量]
    M --> N{订单是否完全收货?}
    N -->|是| O[采购订单状态: Completed]
    N -->|否| P[采购订单状态: Partial]
    P --> F
    O --> Q[流程结束]
    G --> Q
```

## 数据关系图

```mermaid
erDiagram
    PurchaseOrder {
        string id PK
        string orderNo
        string supplierId FK
        string status
        date orderDate
        decimal totalAmount
        date createdAt
        date updatedAt
    }
    
    PurchaseOrderItem {
        string id PK
        string orderId FK
        string productId FK
        decimal quantity
        decimal unitPrice
        decimal receivedQuantity
        decimal amount
        date createdAt
        date updatedAt
    }
    
    PurchaseReceipt {
        string id PK
        string receiptNo
        string orderId FK
        string supplierId FK
        string warehouseId FK
        string status
        date receiptDate
        string receiver
        decimal totalQuantity
        decimal totalAmount
        date createdAt
        date updatedAt
    }
    
    PurchaseReceiptItem {
        string id PK
        string receiptId FK
        string productId FK
        string orderItemId FK
        decimal quantity
        decimal unitPrice
        decimal amount
        date createdAt
        date updatedAt
    }
    
    Supplier {
        string id PK
        string name
        string code
        string contact
        string phone
        string email
        string address
        string status
    }
    
    Product {
        string id PK
        string name
        string code
        string unit
        decimal price
        string categoryId
        string status
    }
    
    Warehouse {
        string id PK
        string name
        string code
        string address
        string status
    }
    
    InventoryStock {
        string id PK
        string productId FK
        string warehouseId FK
        decimal quantity
        decimal unitPrice
        string referenceType
        string referenceId
        date createdAt
    }
    
    PurchaseOrder ||--o{ PurchaseOrderItem : "contains"
    PurchaseOrder ||--o{ PurchaseReceipt : "generates"
    PurchaseReceipt ||--o{ PurchaseReceiptItem : "contains"
    PurchaseOrderItem ||--o| PurchaseReceiptItem : "received_from"
    Supplier ||--o{ PurchaseOrder : "supplies"
    Supplier ||--o{ PurchaseReceipt : "supplies"
    Product ||--o{ PurchaseOrderItem : "ordered"
    Product ||--o{ PurchaseReceiptItem : "received"
    Product ||--o{ InventoryStock : "stocked"
    Warehouse ||--o{ PurchaseReceipt : "receives_at"
    Warehouse ||--o{ InventoryStock : "stores"
    PurchaseReceipt ||--o{ InventoryStock : "updates"
```

## 服务层交互流程

```mermaid
sequenceDiagram
    participant UI as 用户界面
    participant POS as PurchaseOrderService
    participant PRS as PurchaseReceiptService
    participant ISS as InventoryStockService
    participant SS as SupplierService
    participant WS as WarehouseService
    participant PS as ProductService
    
    Note over UI,PS: 1. 创建采购订单
    UI->>POS: 创建采购订单
    POS->>SS: 验证供应商
    POS->>PS: 验证产品
    POS->>POS: 生成订单号
    POS->>UI: 返回订单信息
    
    Note over UI,PS: 2. 手动创建收货单
    UI->>PRS: 创建收货单(orderId)
    PRS->>POS: 验证采购订单存在
    PRS->>SS: 验证供应商存在
    PRS->>WS: 验证仓库存在
    PRS->>PRS: 生成收货单号
    PRS->>UI: 返回收货单信息
    
    Note over UI,PS: 3. 添加收货项目
    UI->>PRS: 添加收货项目
    PRS->>PS: 验证产品存在
    PRS->>PRS: 计算金额
    PRS->>PRS: 重新计算总额
    PRS->>UI: 返回项目信息
    
    Note over UI,PS: 4. 确认收货
    UI->>PRS: 确认收货单
    PRS->>PRS: 更新状态为CONFIRMED
    
    loop 每个收货项目
        PRS->>ISS: 库存入库
        ISS->>ISS: 更新库存数量
    end
    
    PRS->>POS: 更新订单项目已收货数量
    POS->>POS: 检查订单完成状态
    PRS->>UI: 返回确认结果
```

## 状态转换图

```mermaid
stateDiagram-v2
    [*] --> PO_Draft : 创建采购订单
    PO_Draft --> PO_Confirmed : 确认订单
    PO_Confirmed --> PO_Partial : 部分收货
    PO_Confirmed --> PO_Completed : 完全收货
    PO_Partial --> PO_Completed : 完全收货
    PO_Confirmed --> PO_Cancelled : 取消订单
    PO_Partial --> PO_Cancelled : 取消订单
    PO_Completed --> [*]
    PO_Cancelled --> [*]
    
    state PO_Confirmed {
        [*] --> CreateReceipt : 手动创建收货单
        CreateReceipt --> PR_Draft : 收货单草稿
        PR_Draft --> PR_Confirmed : 确认收货
        PR_Confirmed --> UpdateInventory : 更新库存
        UpdateInventory --> UpdateOrderItem : 更新订单项目
        UpdateOrderItem --> [*]
    }
```

## 关键业务规则

### 1. 创建规则
- 采购收货单必须关联现有的采购订单
- 收货单创建时不会自动生成，需要手动触发
- 一个采购订单可以对应多个收货单（分批收货）

### 2. 收货规则
- 收货数量不能超过订单数量减去已收货数量
- 收货单确认后才会更新库存
- 收货单确认是原子操作，失败会回滚

### 3. 库存更新规则
- 只有确认状态的收货单才会更新库存
- 库存更新失败会回滚所有相关操作
- 库存更新成功后会更新订单项目的已收货数量

### 4. 订单状态规则
- Confirmed: 订单已确认，等待收货
- Partial: 部分收货，还有未收货项目
- Completed: 所有项目已完全收货