import { z } from 'zod';
import {
  ProductStatus,
  TransactionType,
  SupplierRating,
  SupplierStatus,
  PurchaseOrderStatus,
  OrderItemStatus,
  ReceiptStatus,
  CustomerType,
  CustomerLevel,
  CustomerStatus,
  SalesOrderStatus,
  PaymentStatus,
  DeliveryStatus,
  PayableStatus,
  ReceivableStatus,
  PaymentMethod,
  UserRole,
  UserStatus
} from '../types/entities';

// 通用验证规则
const idSchema = z.string().min(1, 'ID不能为空');
const dateSchema = z.date();
const positiveNumberSchema = z.number().min(0, '数值不能为负数');
const requiredStringSchema = z.string().min(1, '此字段不能为空');
const optionalStringSchema = z.string().optional();
const phoneSchema = z.string().regex(/^1[3-9]\d{9}$/, '请输入有效的手机号码').optional();
const emailSchema = z.string().email('请输入有效的邮箱地址').optional();

// 基础实体验证
export const BaseEntitySchema = z.object({
  id: idSchema,
  createdAt: dateSchema,
  updatedAt: dateSchema
});

// 商品验证 Schema
export const ProductSchema = z.object({
  id: idSchema.optional(),
  sku: z.string().min(1, 'SKU不能为空').max(50, 'SKU长度不能超过50字符'),
  name: z.string().min(1, '商品名称不能为空').max(100, '商品名称长度不能超过100字符'),
  description: z.string().max(500, '商品描述长度不能超过500字符').optional(),
  categoryId: idSchema,
  unitId: idSchema,
  brand: z.string().max(50, '品牌长度不能超过50字符').optional(),
  model: z.string().max(50, '型号长度不能超过50字符').optional(),
  barcode: z.string().max(50, '条形码长度不能超过50字符').optional(),
  purchasePrice: z.number().min(0, '采购价不能为负数'),
  salePrice: z.number().min(0, '销售价不能为负数'),
  minStock: z.number().min(0, '最小库存不能为负数'),
  maxStock: z.number().min(0, '最大库存不能为负数'),
  status: z.nativeEnum(ProductStatus),
  images: z.array(z.string().url('图片地址格式不正确')).optional(),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
}).refine(data => data.maxStock >= data.minStock, {
  message: '最大库存不能小于最小库存',
  path: ['maxStock']
}).refine(data => data.salePrice >= data.purchasePrice, {
  message: '销售价不能低于采购价',
  path: ['salePrice']
});

// 商品分类验证 Schema
export const CategorySchema = z.object({
  id: idSchema.optional(),
  name: z.string().min(1, '分类名称不能为空').max(50, '分类名称长度不能超过50字符'),
  parentId: idSchema.optional(),
  level: z.number().min(1).max(5, '分类层级不能超过5级'),
  sortOrder: z.number().min(0),
  isActive: z.boolean(),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
});

// 计量单位验证 Schema
export const UnitSchema = z.object({
  id: idSchema.optional(),
  name: z.string().min(1, '单位名称不能为空').max(20, '单位名称长度不能超过20字符'),
  symbol: z.string().min(1, '单位符号不能为空').max(10, '单位符号长度不能超过10字符'),
  precision: z.number().min(0).max(6, '精度不能超过6位小数'),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
});

// 仓库验证 Schema
export const WarehouseSchema = z.object({
  id: idSchema.optional(),
  code: z.string().min(1, '仓库编码不能为空').max(20, '仓库编码长度不能超过20字符'),
  name: z.string().min(1, '仓库名称不能为空').max(50, '仓库名称长度不能超过50字符'),
  address: z.string().max(200, '地址长度不能超过200字符').optional(),
  manager: z.string().max(20, '负责人姓名长度不能超过20字符').optional(),
  phone: phoneSchema,
  isDefault: z.boolean(),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
});

// 库存验证 Schema
export const InventoryStockSchema = z.object({
  id: idSchema.optional(),
  productId: idSchema,
  warehouseId: idSchema,
  currentStock: positiveNumberSchema,
  availableStock: positiveNumberSchema,
  reservedStock: positiveNumberSchema,
  avgCost: positiveNumberSchema,
  lastInDate: dateSchema.optional(),
  lastOutDate: dateSchema.optional(),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
}).refine(data => data.currentStock === data.availableStock + data.reservedStock, {
  message: '当前库存必须等于可用库存加预留库存',
  path: ['currentStock']
});

// 库存流水验证 Schema
export const InventoryTransactionSchema = z.object({
  id: idSchema.optional(),
  transactionNo: z.string().min(1, '流水单号不能为空'),
  productId: idSchema,
  warehouseId: idSchema,
  transactionType: z.nativeEnum(TransactionType),
  quantity: z.number().refine(val => val !== 0, '数量不能为0'),
  unitPrice: positiveNumberSchema,
  totalAmount: z.number(),
  referenceType: optionalStringSchema,
  referenceId: idSchema.optional(),
  remark: z.string().max(200, '备注长度不能超过200字符').optional(),
  operator: requiredStringSchema,
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
});

// 供应商验证 Schema
export const SupplierSchema = z.object({
  id: idSchema.optional(),
  code: z.string().min(1, '供应商编码不能为空').max(20, '供应商编码长度不能超过20字符'),
  name: z.string().min(1, '供应商名称不能为空').max(100, '供应商名称长度不能超过100字符'),
  contactPerson: z.string().max(20, '联系人姓名长度不能超过20字符').optional(),
  phone: phoneSchema,
  email: emailSchema,
  address: z.string().max(200, '地址长度不能超过200字符').optional(),
  paymentTerms: z.string().max(100, '付款条件长度不能超过100字符').optional(),
  creditLimit: positiveNumberSchema,
  rating: z.nativeEnum(SupplierRating),
  status: z.nativeEnum(SupplierStatus),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
});

// 采购订单验证 Schema
export const PurchaseOrderSchema = z.object({
  id: idSchema.optional(),
  orderNo: z.string().min(1, '订单编号不能为空'),
  supplierId: idSchema,
  orderDate: dateSchema,
  expectedDate: dateSchema.optional(),
  status: z.nativeEnum(PurchaseOrderStatus),
  totalAmount: positiveNumberSchema,
  discountAmount: positiveNumberSchema,
  taxAmount: positiveNumberSchema,
  finalAmount: positiveNumberSchema,
  remark: z.string().max(200, '备注长度不能超过200字符').optional(),
  creator: requiredStringSchema,
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
}).refine(data => data.finalAmount === data.totalAmount - data.discountAmount + data.taxAmount, {
  message: '最终金额计算错误',
  path: ['finalAmount']
});

// 采购订单明细验证 Schema
export const PurchaseOrderItemSchema = z.object({
  id: idSchema.optional(),
  orderId: idSchema,
  productId: idSchema,
  quantity: z.number().min(1, '采购数量必须大于0'),
  unitPrice: z.number().min(0, '单价不能为负数'),
  discountRate: z.number().min(0).max(1, '折扣率必须在0-1之间'),
  amount: positiveNumberSchema,
  receivedQuantity: positiveNumberSchema,
  status: z.nativeEnum(OrderItemStatus),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
}).refine(data => data.receivedQuantity <= data.quantity, {
  message: '收货数量不能超过采购数量',
  path: ['receivedQuantity']
});

// 客户验证 Schema
export const CustomerSchema = z.object({
  id: idSchema.optional(),
  code: z.string().min(1, '客户编码不能为空').max(20, '客户编码长度不能超过20字符'),
  name: z.string().min(1, '客户名称不能为空').max(100, '客户名称长度不能超过100字符'),
  contactPerson: z.string().max(20, '联系人姓名长度不能超过20字符').optional(),
  phone: phoneSchema,
  email: emailSchema,
  address: z.string().max(200, '地址长度不能超过200字符').optional(),
  customerType: z.nativeEnum(CustomerType),
  creditLimit: positiveNumberSchema,
  paymentTerms: z.string().max(100, '付款条件长度不能超过100字符').optional(),
  discountRate: z.number().min(0).max(1, '折扣率必须在0-1之间'),
  level: z.nativeEnum(CustomerLevel),
  status: z.nativeEnum(CustomerStatus),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
});

// 销售订单验证 Schema
export const SalesOrderSchema = z.object({
  id: idSchema.optional(),
  orderNo: z.string().min(1, '订单编号不能为空'),
  customerId: idSchema,
  orderDate: dateSchema,
  deliveryDate: dateSchema.optional(),
  status: z.nativeEnum(SalesOrderStatus),
  totalAmount: positiveNumberSchema,
  discountAmount: positiveNumberSchema,
  taxAmount: positiveNumberSchema,
  finalAmount: positiveNumberSchema,
  paymentStatus: z.nativeEnum(PaymentStatus),
  remark: z.string().max(200, '备注长度不能超过200字符').optional(),
  creator: requiredStringSchema,
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
}).refine(data => data.finalAmount === data.totalAmount - data.discountAmount + data.taxAmount, {
  message: '最终金额计算错误',
  path: ['finalAmount']
});

// 销售订单明细验证 Schema
export const SalesOrderItemSchema = z.object({
  id: idSchema.optional(),
  orderId: idSchema,
  productId: idSchema,
  quantity: z.number().min(1, '销售数量必须大于0'),
  unitPrice: z.number().min(0, '单价不能为负数'),
  discountRate: z.number().min(0).max(1, '折扣率必须在0-1之间'),
  amount: positiveNumberSchema,
  deliveredQuantity: positiveNumberSchema,
  status: z.nativeEnum(OrderItemStatus),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
}).refine(data => data.deliveredQuantity <= data.quantity, {
  message: '配送数量不能超过销售数量',
  path: ['deliveredQuantity']
});

// 销售出库验证 Schema
export const SalesDeliverySchema = z.object({
  id: idSchema.optional(),
  deliveryNo: z.string().min(1, '出库单号不能为空'),
  orderId: idSchema,
  customerId: idSchema,
  warehouseId: idSchema,
  deliveryDate: dateSchema,
  status: z.nativeEnum(DeliveryStatus),
  totalQuantity: positiveNumberSchema,
  totalAmount: positiveNumberSchema,
  deliveryPerson: requiredStringSchema,
  remark: z.string().max(200, '备注长度不能超过200字符').optional(),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
});

// 销售出库明细验证 Schema
export const SalesDeliveryItemSchema = z.object({
  id: idSchema.optional(),
  deliveryId: idSchema,
  productId: idSchema,
  orderItemId: idSchema,
  quantity: z.number().min(1, '出库数量必须大于0'),
  unitPrice: z.number().min(0, '单价不能为负数'),
  amount: positiveNumberSchema,
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
}).refine(data => data.amount === data.quantity * data.unitPrice, {
  message: '金额计算错误',
  path: ['amount']
});

// 应付账款验证 Schema
export const AccountsPayableSchema = z.object({
  id: idSchema.optional(),
  billNo: z.string().min(1, '账单编号不能为空'),
  supplierId: idSchema,
  orderId: z.string().min(1).optional(),
  billDate: dateSchema,
  dueDate: dateSchema,
  totalAmount: positiveNumberSchema,
  paidAmount: positiveNumberSchema,
  balanceAmount: positiveNumberSchema,
  status: z.nativeEnum(PayableStatus),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
}).refine(data => data.balanceAmount === data.totalAmount - data.paidAmount, {
  message: '余额计算错误',
  path: ['balanceAmount']
}).refine(data => data.dueDate >= data.billDate, {
  message: '到期日期不能早于账单日期',
  path: ['dueDate']
});

// 应收账款验证 Schema
export const AccountsReceivableSchema = z.object({
  id: idSchema.optional(),
  billNo: z.string().min(1, '账单编号不能为空'),
  customerId: idSchema,
  orderId: z.string().min(1).optional(),
  billDate: dateSchema,
  dueDate: dateSchema,
  totalAmount: positiveNumberSchema,
  receivedAmount: positiveNumberSchema,
  balanceAmount: positiveNumberSchema,
  status: z.nativeEnum(ReceivableStatus),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
}).refine(data => data.balanceAmount === data.totalAmount - data.receivedAmount, {
  message: '余额计算错误',
  path: ['balanceAmount']
}).refine(data => data.dueDate >= data.billDate, {
  message: '到期日期不能早于账单日期',
  path: ['dueDate']
});

// 付款记录验证 Schema
export const PaymentSchema = z.object({
  id: idSchema.optional(),
  paymentNo: z.string().min(1, '付款单号不能为空'),
  payableId: idSchema,
  paymentDate: dateSchema,
  paymentMethod: z.nativeEnum(PaymentMethod),
  amount: z.number().min(0.01, '付款金额必须大于0'),
  remark: z.string().max(200, '备注长度不能超过200字符').optional(),
  operator: requiredStringSchema,
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
});

// 收款记录验证 Schema
export const ReceiptSchema = z.object({
  id: idSchema.optional(),
  receiptNo: z.string().min(1, '收款单号不能为空'),
  receivableId: idSchema,
  receiptDate: dateSchema,
  paymentMethod: z.nativeEnum(PaymentMethod),
  amount: z.number().min(0.01, '收款金额必须大于0'),
  remark: z.string().max(200, '备注长度不能超过200字符').optional(),
  operator: requiredStringSchema,
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
});

// 用户验证 Schema
export const UserSchema = z.object({
  id: idSchema.optional(),
  username: z.string()
    .min(3, '用户名至少3个字符')
    .max(20, '用户名最多20个字符')
    .regex(/^[a-zA-Z0-9_]+$/, '用户名只能包含字母、数字和下划线'),
  password: z.string()
    .min(6, '密码至少6个字符')
    .max(50, '密码最多50个字符'),
  nickname: z.string().min(1, '昵称不能为空').max(20, '昵称最多20个字符'),
  email: emailSchema,
  phone: phoneSchema,
  avatar: z.string().refine(
    (val) => !val || val === '' || z.string().url().safeParse(val).success,
    '头像地址格式不正确'
  ).optional(),
  role: z.nativeEnum(UserRole),
  status: z.nativeEnum(UserStatus),
  lastLoginAt: dateSchema.optional(),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
});

// 系统配置验证 Schema
export const SystemConfigSchema = z.object({
  id: idSchema.optional(),
  key: z.string().min(1, '配置键不能为空').max(50, '配置键长度不能超过50字符'),
  value: z.string().max(500, '配置值长度不能超过500字符'),
  description: z.string().max(200, '描述长度不能超过200字符').optional(),
  category: z.string().min(1, '分类不能为空').max(50, '分类长度不能超过50字符'),
  createdAt: dateSchema.optional(),
  updatedAt: dateSchema.optional()
});

// 导出类型推断
export type ProductInput = z.infer<typeof ProductSchema>;
export type CategoryInput = z.infer<typeof CategorySchema>;
export type UnitInput = z.infer<typeof UnitSchema>;
export type WarehouseInput = z.infer<typeof WarehouseSchema>;
export type InventoryStockInput = z.infer<typeof InventoryStockSchema>;
export type InventoryTransactionInput = z.infer<typeof InventoryTransactionSchema>;
export type SupplierInput = z.infer<typeof SupplierSchema>;
export type PurchaseOrderInput = z.infer<typeof PurchaseOrderSchema>;
export type PurchaseOrderItemInput = z.infer<typeof PurchaseOrderItemSchema>;
export type CustomerInput = z.infer<typeof CustomerSchema>;
export type SalesOrderInput = z.infer<typeof SalesOrderSchema>;
export type SalesOrderItemInput = z.infer<typeof SalesOrderItemSchema>;
export type AccountsPayableInput = z.infer<typeof AccountsPayableSchema>;
export type AccountsReceivableInput = z.infer<typeof AccountsReceivableSchema>;
export type PaymentInput = z.infer<typeof PaymentSchema>;
export type ReceiptInput = z.infer<typeof ReceiptSchema>;
export type UserInput = z.infer<typeof UserSchema>;
export type SystemConfigInput = z.infer<typeof SystemConfigSchema>;

// 通用验证函数
export const validateEntity = <T>(schema: z.ZodSchema<T>, data: unknown): {
  success: boolean;
  data?: T;
  errors?: string[];
} => {
  try {
    const validated = schema.parse(data);
    return { success: true, data: validated };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return {
        success: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
      };
    }
    return { success: false, errors: ['验证失败'] };
  }
};