// 核心实体类型定义

export interface BaseEntity {
  id: string;
  createdAt: Date;
  updatedAt: Date;
}

// =============== 三层单位换算架构 ===============

// 第一层：计量单位管理
export interface Unit extends BaseEntity {
  name: string;             // 单位名称（如：千克、个、箱）
  symbol: string;           // 单位符号（如：kg、pcs、box）
  type: UnitType;           // 单位类型
  precision: number;        // 精度（小数位数）
  description?: string;     // 单位描述
  isActive: boolean;        // 是否启用
}

export enum UnitType {
  WEIGHT = 'weight',        // 重量
  LENGTH = 'length',        // 长度
  VOLUME = 'volume',        // 体积
  QUANTITY = 'quantity',    // 数量
  AREA = 'area',           // 面积
  TIME = 'time'            // 时间
}

// 第二层：全局换算规则
export interface GlobalConversionRule extends BaseEntity {
  name: string;             // 规则名称（如：重量标准换算）
  fromUnitId: string;       // 源单位ID
  toUnitId: string;         // 目标单位ID
  conversionRate: number;   // 换算比率：1源单位 = conversionRate目标单位
  category: UnitType;       // 换算类别
  description: string;      // 换算描述（如：1千克 = 1000克）
  isActive: boolean;        // 是否启用
}

// 第三层：商品换算设置
export interface ProductConversionSetting extends BaseEntity {
  productId: string;        // 关联商品ID
  enableConversion: boolean; // 是否启用换算
  conversionType: 'global' | 'custom'; // 换算类型
  globalRuleId?: string;    // 全局规则ID（当使用全局换算时）
  customRule?: {            // 自定义换算规则
    fromUnitId: string;
    toUnitId: string;
    conversionRate: number;
    description: string;
  };
  isActive: boolean;        // 是否启用
}

// 兼容性：保持原有UnitConversion接口
export interface UnitConversion extends BaseEntity {
  productId: string;        // 关联的商品ID
  baseUnitId: string;       // 基础单位ID（如：个、克、毫升）
  packageUnitId: string;    // 包装单位ID（如：箱、包、件）
  conversionRate: number;   // 转换比率：1个包装单位 = conversionRate个基础单位
  isActive: boolean;        // 是否启用
  description?: string;     // 转换规则描述
}

// =============== 日历视图 ===============

export interface DailyBusinessSummary {
  date: Date;
  purchases: {
    totalAmount: number;      // 采购总数量
    totalValue: number;       // 采购总金额
    orderCount: number;       // 采购订单数
    topProducts: Array<{
      productId: string;
      productName: string;
      quantity: number;
      value: number;
    }>;
  };
  sales: {
    totalAmount: number;      // 销售总数量
    totalValue: number;       // 销售总金额
    orderCount: number;       // 销售订单数
    topProducts: Array<{
      productId: string;
      productName: string;
      quantity: number;
      value: number;
    }>;
  };
  inventory: {
    totalValue: number;       // 库存总价值
    lowStockCount: number;    // 低库存商品数
    outOfStockCount: number;  // 缺货商品数
    newProductCount: number;  // 新增商品数
  };
  movements: {
    inbound: number;          // 入库总量
    outbound: number;         // 出库总量
    adjustments: number;      // 调整数量
  };
}

export interface WeeklyCalendarData {
  weekStart: Date;
  weekEnd: Date;
  days: DailyBusinessSummary[];
  weeklyTotals: {
    purchases: number;
    sales: number;
    netChange: number;        // 净变化（入库-出库）
  };
}

export interface CalendarViewOptions {
  startDate: Date;
  endDate: Date;
  warehouseId?: string;
  categoryId?: string;
  productId?: string;
}

// 商品实体
export interface Product extends BaseEntity {
  sku: string;                    // 商品编码
  name: string;                   // 商品名称
  description?: string;           // 商品描述
  categoryId: string;             // 分类ID
  unitId?: string;                // 计量单位ID（可选，向后兼容）
  supplierId?: string;            // 供应商ID（新增）
  brand?: string;                 // 品牌
  model?: string;                 // 型号规格
  barcode?: string;               // 条形码
  purchasePrice: number;          // 采购价
  salePrice: number;              // 销售价（对应数据库unit_price）
  minStock: number;               // 最小库存（对应数据库reorder_level）
  maxStock: number;               // 最大库存
  status: ProductStatus;          // 状态
  isActive: boolean;              // 是否启用
  images?: string[];              // 商品图片
  location?: string;              // 库存位置（新增）
  stockQuantity?: number;         // 当前库存（新增）
  reservedQuantity?: number;      // 预留库存（新增）
  totalValue?: number;            // 总价值（新增）
  lastUpdated?: Date;             // 最后更新时间（新增）
}

export enum ProductStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DISCONTINUED = 'discontinued'
}

// 库存商品类型别名（兼容性）
export type InventoryItem = Product;

// 分类状态枚举
export enum CategoryStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  ARCHIVED = 'archived'
}

// 仓库状态枚举
export enum WarehouseStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  MAINTENANCE = 'maintenance'
}

// 仓库类型枚举
export enum WarehouseType {
  MAIN = 'main',
  BRANCH = 'branch',
  VIRTUAL = 'virtual'
}

// 订单状态枚举（通用）
export enum OrderStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// 商品分类实体
export interface Category extends BaseEntity {
  name: string;                   // 分类名称
  code?: string;                  // 分类编码
  description?: string;           // 分类描述
  parentId?: string;              // 父分类ID
  level: number;                  // 分类层级
  sortOrder: number;              // 排序
  isActive: boolean;              // 是否启用
  status?: string;                // 状态
  children?: Category[];          // 子分类
}

// 计量单位实体（已在上面定义，此处删除重复定义）

// 仓库实体
export interface Warehouse extends BaseEntity {
  code: string;                   // 仓库编码
  name: string;                   // 仓库名称
  address?: string;               // 仓库地址
  location?: string;              // 位置
  manager?: string;               // 负责人
  isDefault: boolean;             // 是否默认仓库
  isActive: boolean;              // 是否启用
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
  unitCost: number;               // 单位成本
  unitPrice: number;              // 单价
  totalValue: number;             // 总价值
  safetyStock?: number;           // 安全库存（兼容字段）
  isLowStock?: boolean;           // 是否低库存（兼容字段）
  isOutOfStock?: boolean;         // 是否缺货（兼容字段）
  lastInDate?: Date;              // 最后入库日期
  lastOutDate?: Date;             // 最后出库日期
  lastMovementDate?: Date;        // 最后库存变动日期
  lastUpdated?: Date;             // 最后更新时间（兼容字段）
  
  // 关联实体
  product?: Product;
  warehouse?: Warehouse;
}

// 库存流水实体
export interface InventoryTransaction extends BaseEntity {
  transactionNo: string;          // 流水单号
  productId: string;              // 商品ID
  warehouseId: string;            // 仓库ID
  type: TransactionType;          // 操作类型（兼容字段）
  transactionType: TransactionType; // 操作类型
  quantity: number;               // 数量(正负数)
  unitPrice: number;              // 单价
  unitCost: number;               // 单位成本（兼容字段）
  totalAmount: number;            // 金额
  totalCost: number;              // 总成本（兼容字段）
  referenceType?: string;         // 关联单据类型
  referenceId?: string;           // 关联单据ID
  remark?: string;                // 备注
  notes?: string;                 // 备注（兼容字段）
  operator: string;               // 操作人
  createdBy: string;              // 创建人（兼容字段）

  // 关联实体
  product?: Product;
  warehouse?: Warehouse;
}

// 库存交易记录（用于库存服务）
export interface StockTransaction {
  id: string;
  productId: string;
  warehouseId: string;
  type: TransactionType;
  quantity: number;
  unitCost: number;
  totalCost: number;
  referenceId?: string;
  referenceType?: string;
  notes?: string;
  createdAt: Date;
  createdBy: string;
}

export enum TransactionType {
  IN = 'in',                      // 入库
  OUT = 'out',                    // 出库
  ADJUST = 'adjust'               // 调整
}

// 批量操作结果类型
export interface BatchOperationResult<T = any> {
  total: number;
  successful: number;
  failed: number;
  successfulItems: T[];
  failedItems: { item: T; error: string }[];
}

// 产品库存信息类型
export interface ProductInventoryInfo {
  productId: string;
  totalStock: number;
  availableStock: number;
  reservedStock: number;
  warehouses: Array<{
    warehouseId: string;
    stock: number;
    available: number;
    reserved: number;
  }>;
}

// 产品价格历史类型
export interface ProductPriceHistory {
  productId: string;
  priceType: 'purchase' | 'sale';
  price: number;
  effectiveDate: Date;
  operator: string;
  reason?: string;
}

// 财务统计接口
export interface FinancialStatistics {
  totalCount: number;
  totalAmount: number;
  paidAmount: number;
  receivedAmount: number;
  remainingAmount: number;
  overdueAmount: number;
  overdueCount: number;
  lastUpdated: Date;
}

// 财务过滤器接口
export interface FinancialFilter {
  supplierId?: string;
  customerId?: string;
  startDate?: Date;
  endDate?: Date;
  status?: string;
  amountRange?: {
    min?: number;
    max?: number;
  };
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
  isActive: boolean;              // 是否启用
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
  paymentStatus: PaymentStatus;   // 付款状态
  isActive: boolean;              // 是否启用
  notes?: string;                 // 备注
  cancelReason?: string;          // 取消原因
  cancelledBy?: string;           // 取消人
  updatedBy?: string;             // 更新人
  
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
  totalPrice: number;             // 总价
  receivedQuantity: number;       // 已收货数量
  status: OrderItemStatus;        // 明细状态
  
  // 关联实体
  order?: PurchaseOrder;
  product?: Product;
}

export enum OrderItemStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
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
  receivedQuantity: number;       // 收货数量
  unitPrice: number;              // 单价
  amount: number;                 // 金额
  totalPrice: number;             // 总价
  
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
  isActive: boolean;              // 是否启用
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
  isActive: boolean;              // 是否启用
  updatedBy?: string;             // 更新人
  
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
  PAID = 'paid',
  PENDING = 'pending',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled'
}

// 销售订单明细实体
export interface SalesOrderItem extends BaseEntity {
  orderId: string;                // 订单ID
  productId: string;              // 商品ID
  quantity: number;               // 销售数量
  unitPrice: number;              // 销售单价
  discountRate: number;           // 折扣率
  amount: number;                 // 明细金额
  totalPrice: number;             // 总价
  deliveredQuantity: number;      // 已配送数量
  status: OrderItemStatus;        // 明细状态
  
  // 关联实体
  order?: SalesOrder;
  product?: Product;
}

// 销售出库实体
export interface SalesDelivery extends BaseEntity {
  deliveryNo: string;             // 出库单号
  orderId: string;                // 销售订单ID
  customerId: string;             // 客户ID
  warehouseId: string;            // 出库仓库ID
  deliveryDate: Date;             // 出库日期
  status: DeliveryStatus;         // 状态
  totalQuantity: number;          // 出库总数量
  totalAmount: number;            // 出库总金额
  deliveryPerson: string;         // 配送人
  deliverer: string;              // 发货人
  remark?: string;                // 备注
  
  // 关联实体
  order?: SalesOrder;
  customer?: Customer;
  warehouse?: Warehouse;
  items?: SalesDeliveryItem[];
}

export enum DeliveryStatus {
  DRAFT = 'draft',
  CONFIRMED = 'confirmed',
  SHIPPED = 'shipped',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

// 销售出库明细实体
export interface SalesDeliveryItem extends BaseEntity {
  deliveryId: string;             // 出库单ID
  productId: string;              // 商品ID
  orderItemId: string;            // 订单明细ID
  quantity: number;               // 出库数量
  deliveredQuantity: number;      // 发货数量
  unitPrice: number;              // 单价
  amount: number;                 // 金额
  totalPrice: number;             // 总价
  
  // 关联实体
  delivery?: SalesDelivery;
  product?: Product;
  orderItem?: SalesOrderItem;
}

// 应付账款实体
export interface AccountsPayable extends BaseEntity {
  billNo: string;                 // 账单编号
  supplierId: string;             // 供应商ID
  orderId?: string;               // 采购订单ID
  purchaseOrderId?: string;       // 采购订单ID（兼容字段）
  billDate: Date;                 // 账单日期
  dueDate: Date;                  // 到期日期
  totalAmount: number;            // 账单总额
  amount?: number;                // 金额（兼容字段）
  paidAmount: number;             // 已付金额
  balanceAmount: number;          // 余额
  remainingAmount?: number;       // 剩余金额（兼容字段）
  status: PayableStatus;          // 状态
  description?: string;           // 描述

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
  salesOrderId?: string;          // 销售订单ID（兼容字段）
  billDate: Date;                 // 账单日期
  dueDate: Date;                  // 到期日期
  totalAmount: number;            // 账单总额
  amount?: number;                // 金额（兼容字段）
  receivedAmount: number;         // 已收金额
  balanceAmount: number;          // 余额
  remainingAmount?: number;       // 剩余金额（兼容字段）
  status: ReceivableStatus;       // 状态
  description?: string;           // 描述

  // 关联实体
  customer?: Customer;
  order?: SalesOrder;
  receipts?: Receipt[];
}

export enum ReceivableStatus {
  UNPAID = 'unpaid',
  PARTIAL = 'partial',
  PAID = 'paid',
  PENDING = 'pending',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
  RECEIVED = 'received'
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
  BANK_TRANSFER = 'bank_transfer',
  CHECK = 'check',
  CREDIT_CARD = 'credit_card',
  OTHER = 'other'
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
  ADMIN = 'admin',        // 管理员：拥有所有权限
  OPERATOR = 'operator'   // 操作员：拥有业务操作权限
}

export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  LOCKED = 'locked'
}

// 权限模块枚举
export enum PermissionModule {
  SYSTEM = 'system',           // 系统管理
  INVENTORY = 'inventory',     // 库存管理
  PURCHASE = 'purchase',       // 采购管理
  SALES = 'sales',            // 销售管理
  FINANCE = 'finance',        // 财务管理
  REPORTS = 'reports'         // 报表分析
}

// 权限操作枚举
export enum PermissionAction {
  VIEW = 'view',              // 查看
  CREATE = 'create',          // 创建
  UPDATE = 'update',          // 更新
  DELETE = 'delete',          // 删除
  EXPORT = 'export',          // 导出
  IMPORT = 'import'           // 导入
}

// 角色权限实体
export interface RolePermission extends BaseEntity {
  role: UserRole;                    // 角色
  module: PermissionModule;          // 权限模块
  actions: PermissionAction[];       // 允许的操作
  description?: string;              // 权限描述
}

// 权限配置实体
export interface PermissionConfig {
  role: UserRole;
  permissions: {
    [key in PermissionModule]?: PermissionAction[];
  };
}

// =============== 通知系统实体 ===============

// 通知类型枚举
export enum NotificationType {
  INFO = 'info',
  WARNING = 'warning',
  ERROR = 'error',
  SUCCESS = 'success'
}

// 通知优先级枚举
export enum NotificationPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// 通知状态枚举
export enum NotificationStatus {
  UNREAD = 'unread',
  READ = 'read',
  DELETED = 'deleted'
}

// 通知实体
export interface Notification extends BaseEntity {
  type: NotificationType;           // 通知类型
  title: string;                    // 通知标题
  message: string;                  // 通知消息
  priority: NotificationPriority;   // 优先级
  status: NotificationStatus;       // 状态
  targetUsers: string[];            // 目标用户ID数组
  relatedEntity?: {                 // 关联实体
    type: string;                   // 实体类型
    id: string;                     // 实体ID
  };
  readAt?: Date;                    // 已读时间
  expiresAt?: Date;                 // 过期时间
}

// 通知配置实体
export interface NotificationConfig extends BaseEntity {
  userId: string;                   // 用户ID
  enabledTypes: NotificationType[]; // 启用的通知类型
  enabledPriorities: NotificationPriority[]; // 启用的优先级
  enableSound: boolean;             // 是否启用声音
  enableDesktop: boolean;           // 是否启用桌面通知
}