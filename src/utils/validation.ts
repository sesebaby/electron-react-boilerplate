import { z } from 'zod';

export const InventoryItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, '商品名称不能为空'),
  description: z.string().default(''),
  sku: z.string().min(1, 'SKU不能为空'),
  category: z.string().min(1, '分类不能为空'),
  supplier: z.string().default(''),
  stockQuantity: z.number().min(0, '库存数量不能为负数'),
  reservedQuantity: z.number().min(0, '预留数量不能为负数').default(0),
  unitPrice: z.number().min(0, '单价不能为负数'),
  totalValue: z.number().min(0, '总价值不能为负数'),
  lastUpdated: z.date().optional(),
  status: z.enum(['in-stock', 'low-stock', 'out-of-stock', 'discontinued']).default('in-stock'),
  location: z.string().default(''),
  reorderLevel: z.number().min(0, '补货提醒不能为负数').default(0),
  maxStock: z.number().min(0, '最大库存不能为负数').default(0)
});

export const ExcelRowSchema = z.object({
  '商品名称': z.string().min(1),
  '商品描述': z.string().optional(),
  'SKU': z.string().min(1),
  '分类': z.string().min(1),
  '供应商': z.string().optional(),
  '库存数量': z.number(),
  '预留数量': z.number().optional(),
  '单价': z.number(),
  '状态': z.enum(['in-stock', 'low-stock', 'out-of-stock', 'discontinued']).optional(),
  '存放位置': z.string().optional(),
  '补货提醒': z.number().optional(),
  '最大库存': z.number().optional()
});

export type InventoryItemInput = z.infer<typeof InventoryItemSchema>;
export type ExcelRowInput = z.infer<typeof ExcelRowSchema>;

export const validateInventoryItem = (data: any): { success: boolean; data?: InventoryItemInput; errors?: string[] } => {
  try {
    const validated = InventoryItemSchema.parse(data);
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

export const validateExcelRow = (data: any): { success: boolean; data?: ExcelRowInput; errors?: string[] } => {
  try {
    const validated = ExcelRowSchema.parse(data);
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