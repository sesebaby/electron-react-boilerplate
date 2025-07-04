// 核心实体类型定义

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// 商品实体
export interface Product extends BaseEntity {
  sku: string;                    // 商品编码
  name: string;                   // 商品名称
  description?: string;           // 商品描述
  categoryId: string;             // 分类ID
  unitId: string;                 // 计量单位ID
  brand?: string;                 // 品牌
  model?: string;                 // 型号规格
  barcode?: string;               // 条形码
  purchasePrice: number;          // 采购价
  salePrice: number;              // 销售价
  minStock: number;               // 最小库存
  maxStock: number;               // 最大库存
  status: ProductStatus;          // 状态
  images?: string[];              // 商品图片
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued'
}

// 商品分类实体
export interface Category extends BaseEntity {
  name: string;                   // 分类名称
  parentId?: string;              // 父分类ID
  level: number;                  // 分类层级
  sortOrder: number;              // 排序
  isActive: boolean;              // 是否启用
  children?: Category[];          // 子分类
}

// 计量单位实体
export interface Unit extends BaseEntity {
  name: string;                   // 单位名称
  symbol: string;                 // 单位符号
  precision: number;              // 精度
}

// 仓库实体
export interface Warehouse extends BaseEntity {
  code: string;                   // 仓库编码
  name: string;                   // 仓库名称
  address?: string;               // 仓库地址
  manager?: string;               // 负责人
  phone?: string;                 // 联系电话
  isDefault: boolean;             // 是否默认仓库
}

// 库存实体
export interface InventoryStock extends BaseEntity {
  productId: string;              // 商品ID
  warehouseId: string;            // 仓库ID
  currentStock: number;           // 当前库存
  availableStock: number;         // 可用库存
  reservedStock: number;          // 预留库存
  minStock: number;               // 最小库存
  maxStock: number;               // 最大库存
  avgCost: number;                // 平均成本
  unitPrice: number;              // 单价
  lastInDate?: Date;              // 最后入库日期
  lastOutDate?: Date;             // 最后出库日期
  lastMovementDate?: Date;        // 最后库存变动日期
  
  // 关联实体
  product?: Product;
  warehouse?: Warehouse;
}

// 库存流水实体
export interface InventoryTransaction extends BaseEntity {
  transactionNo: string;          // 流水单号
  productId: string;              // 商品ID
  warehouseId: string;            // 仓库ID
  transactionType: TransactionType; // 操作类型
  quantity: number;               // 数量(正负数)
  unitPrice: number;              // 单价
  totalAmount: number;            // 金额
  referenceType?: string;         // 关联单据类型
  referenceId?: string;           // 关联单据ID
  remark?: string;                // 备注
  operator: string;               // 操作人
  
  // 关联实体
  product?: Product;
  warehouse?: Warehouse;
}

export enum TransactionType {
  IN = 'in',                      // 入库
  OUT = 'out',                    // 出库
  ADJUST = 'adjust'               // 调整
}

// 供应商实体
export interface Supplier extends BaseEntity {
  code: string;                   // 供应商编码
  name: string;                   // 供应商名称
  contactPerson?: string;         // 联系人
  phone?: string;                 // 电话
  email?: string;                 // 邮箱
  address?: string;               // 地址
  paymentTerms?: string;          // 付款条件
  creditLimit: number;            // 信用额度
  rating: SupplierRating;         // 供应商评级
  status: SupplierStatus;         // 状态
}

export enum SupplierRating {
  A = 'A',
  B = 'B', 
  C = 'C',
  D = 'D'
}

export enum SupplierStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

// 采购订单实体
export interface PurchaseOrder extends BaseEntity {
  orderNo: string;                // 订单编号
  supplierId: string;             // 供应商ID
  orderDate: Date;                // 订单日期
  expectedDate?: Date;            // 预计到货日期
  status: PurchaseOrderStatus;    // 状态
  totalAmount: number;            // 订单总额
  discountAmount: number;         // 折扣金额
  taxAmount: number;              // 税额
  finalAmount: number;            // 最终金额
  remark?: string;                // 备注
  creator: string;                // 创建人
  
  // 关联实体
  supplier?: Supplier;
  items?: PurchaseOrderItem[];
}

export enum PurchaseOrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  PARTIAL = 'partial',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// 采购订单明细实体
export interface PurchaseOrderItem extends BaseEntity {
  orderId: string;                // 订单ID
  productId: string;              // 商品ID
  quantity: number;               // 采购数量
  unitPrice: number;              // 采购单价
  discountRate: number;           // 折扣率
  amount: number;                 // 明细金额
  receivedQuantity: number;       // 已收货数量
  status: OrderItemStatus;        // 明细状态
  
  // 关联实体
  order?: PurchaseOrder;
  product?: Product;
}

export enum OrderItemStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  COMPLETED = 'completed'
}

// 采购收货实体
export interface PurchaseReceipt extends BaseEntity {
  receiptNo: string;              // 收货单号
  orderId: string;                // 采购订单ID
  supplierId: string;             // 供应商ID
  warehouseId: string;            // 收货仓库ID
  receiptDate: Date;              // 收货日期
  status: ReceiptStatus;          // 状态
  totalQuantity: number;          // 收货总数量
  totalAmount: number;            // 收货总金额
  receiver: string;               // 收货人
  remark?: string;                // 备注
  
  // 关联实体
  order?: PurchaseOrder;
  supplier?: Supplier;
  warehouse?: Warehouse;
  items?: PurchaseReceiptItem[];
}

export enum ReceiptStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed'
}

// 采购收货明细实体
export interface PurchaseReceiptItem extends BaseEntity {
  receiptId: string;              // 收货单ID
  productId: string;              // 商品ID
  orderItemId: string;            // 订单明细ID
  quantity: number;               // 收货数量
  unitPrice: number;              // 单价
  amount: number;                 // 金额
  
  // 关联实体
  receipt?: PurchaseReceipt;
  product?: Product;
  orderItem?: PurchaseOrderItem;
}

// 客户实体
export interface Customer extends BaseEntity {
  code: string;                   // 客户编码
  name: string;                   // 客户名称
  contactPerson?: string;         // 联系人
  phone?: string;                 // 电话
  email?: string;                 // 邮箱
  address?: string;               // 地址
  customerType: CustomerType;     // 客户类型
  creditLimit: number;            // 信用额度
  paymentTerms?: string;          // 付款条件
  discountRate: number;           // 优惠折扣率
  level: CustomerLevel;           // 客户等级
  status: CustomerStatus;         // 状态
}

export enum CustomerType {
  INDIVIDUAL = 'individual',
  COMPANY = 'company'
}

export enum CustomerLevel {
  VIP = 'VIP',
  GOLD = 'Gold',
  SILVER = 'Silver',
  BRONZE = 'Bronze'
}

export enum CustomerStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive'
}

// 销售订单实体
export interface SalesOrder extends BaseEntity {
  orderNo: string;                // 订单编号
  customerId: string;             // 客户ID
  orderDate: Date;                // 订单日期
  deliveryDate?: Date;            // 交货日期
  status: SalesOrderStatus;       // 状态
  totalAmount: number;            // 订单总额
  discountAmount: number;         // 折扣金额
  taxAmount: number;              // 税额
  finalAmount: number;            // 最终金额
  paymentStatus: PaymentStatus;   // 付款状态
  remark?: string;                // 备注
  creator: string;                // 创建人
  
  // 关联实体
  customer?: Customer;
  items?: SalesOrderItem[];
}

export enum SalesOrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export enum PaymentStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid'
}

// 销售订单明细实体
export interface SalesOrderItem extends BaseEntity {
  orderId: string;                // 订单ID
  productId: string;              // 商品ID
  quantity: number;               // 销售数量
  unitPrice: number;              // 销售单价
  discountRate: number;           // 折扣率
  amount: number;                 // 明细金额
  shippedQuantity: number;        // 已发货数量
  status: OrderItemStatus;        // 明细状态
  
  // 关联实体
  order?: SalesOrder;
  product?: Product;
}

// 应付账款实体
export interface AccountsPayable extends BaseEntity {
  billNo: string;                 // 账单编号
  supplierId: string;             // 供应商ID
  orderId?: string;               // 采购订单ID
  billDate: Date;                 // 账单日期
  dueDate: Date;                  // 到期日期
  totalAmount: number;            // 账单总额
  paidAmount: number;             // 已付金额
  balanceAmount: number;          // 余额
  status: PayableStatus;          // 状态
  
  // 关联实体
  supplier?: Supplier;
  order?: PurchaseOrder;
  payments?: Payment[];
}

export enum PayableStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue'
}

// 应收账款实体
export interface AccountsReceivable extends BaseEntity {
  billNo: string;                 // 账单编号
  customerId: string;             // 客户ID
  orderId?: string;               // 销售订单ID
  billDate: Date;                 // 账单日期
  dueDate: Date;                  // 到期日期
  totalAmount: number;            // 账单总额
  receivedAmount: number;         // 已收金额
  balanceAmount: number;          // 余额
  status: ReceivableStatus;       // 状态
  
  // 关联实体
  customer?: Customer;
  order?: SalesOrder;
  receipts?: Receipt[];
}

export enum ReceivableStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
  OVERDUE = 'overdue'
}

// 付款记录实体
export interface Payment extends BaseEntity {
  paymentNo: string;              // 付款单号
  payableId: string;              // 应付账款ID
  paymentDate: Date;              // 付款日期
  paymentMethod: PaymentMethod;   // 付款方式
  amount: number;                 // 付款金额
  remark?: string;                // 备注
  operator: string;               // 操作人
  
  // 关联实体
  payable?: AccountsPayable;
}

export enum PaymentMethod {
  CASH = 'cash',
  BANK = 'bank',
  CHECK = 'check'
}

// 收款记录实体
export interface Receipt extends BaseEntity {
  receiptNo: string;              // 收款单号
  receivableId: string;           // 应收账款ID
  receiptDate: Date;              // 收款日期
  paymentMethod: PaymentMethod;   // 收款方式
  amount: number;                 // 收款金额
  remark?: string;                // 备注
  operator: string;               // 操作人
  
  // 关联实体
  receivable?: AccountsReceivable;
}

// 系统配置实体
export interface SystemConfig extends BaseEntity {
  key: string;                    // 配置键
  value: string;                  // 配置值
  description?: string;           // 描述
  category: string;               // 分类
}

// 操作日志实体
export interface OperationLog extends BaseEntity {
  operator: string;               // 操作人
  action: string;                 // 操作类型
  module: string;                 // 模块
  entityType: string;             // 实体类型
  entityId?: string;              // 实体ID
  description: string;            // 操作描述
  ipAddress?: string;             // IP地址
  userAgent?: string;             // 用户代理
}

// 用户实体
export interface User extends BaseEntity {
  username: string;               // 用户名
  password: string;               // 密码(加密)
  nickname: string;               // 昵称
  email?: string;                 // 邮箱
  phone?: string;                 // 电话
  avatar?: string;                // 头像
  role: UserRole;                 // 角色
  status: UserStatus;             // 状态
  lastLoginAt?: Date;             // 最后登录时间
}

export enum UserRole {
  ADMIN = 'admin',
  PURCHASER = 'purchaser',
  SALESPERSON = 'salesperson',
  WAREHOUSE = 'warehouse',
  FINANCE = 'finance'
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  LOCKED = 'locked'
}