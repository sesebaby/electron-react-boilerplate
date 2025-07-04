export const APP_CONFIG = {
  DATABASE: {
    DEFAULT_PATH: 'data/inventory.db',
    TIMEOUT: 5000
  },
  EXCEL: {
    DEFAULT_SHEET_NAME: 'inventory',
    MAX_ROWS: 10000,
    SUPPORTED_EXTENSIONS: ['.xlsx', '.xls']
  },
  PAGINATION: {
    DEFAULT_PAGE_SIZE: 20,
    MAX_PAGE_SIZE: 100
  }
};

export const INVENTORY_STATUS = {
  IN_STOCK: 'in-stock',
  LOW_STOCK: 'low-stock',
  OUT_OF_STOCK: 'out-of-stock',
  DISCONTINUED: 'discontinued'
} as const;

export const TRANSACTION_TYPES = {
  IN: 'in',
  OUT: 'out',
  ADJUST: 'adjust'
} as const;

export const DEFAULT_COLUMN_MAPPING = {
  '商品名称': 'name',
  '商品描述': 'description',
  'SKU': 'sku',
  '分类': 'category',
  '供应商': 'supplier',
  '库存数量': 'stockQuantity',
  '预留数量': 'reservedQuantity',
  '单价': 'unitPrice',
  '状态': 'status',
  '存放位置': 'location',
  '补货提醒': 'reorderLevel',
  '最大库存': 'maxStock'
} as const;

export const EXCEL_HEADERS = [
  '商品名称',
  '商品描述', 
  'SKU',
  '分类',
  '供应商',
  '库存数量',
  '预留数量',
  '单价',
  '总价值',
  '状态',
  '存放位置',
  '补货提醒',
  '最大库存',
  '最后更新时间'
] as const;