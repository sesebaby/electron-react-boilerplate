-- ================================================
-- 进销存管理系统 SQLite 数据库初始化脚本
-- 创建日期: 2025-07-14
-- 描述: 完整的进销存系统数据库表结构和默认数据
-- ================================================

-- 启用外键约束
PRAGMA foreign_keys = ON;

-- 开始事务
BEGIN TRANSACTION;

-- ================================================
-- 基础表结构
-- ================================================

-- 用户表
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
);

-- 系统配置表
CREATE TABLE system_configs (
  id TEXT PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 计量单位表
CREATE TABLE units (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  precision INTEGER NOT NULL DEFAULT 2,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 商品分类表
CREATE TABLE categories (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  parent_id TEXT,
  level INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- 仓库表
CREATE TABLE warehouses (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  address TEXT,
  manager TEXT,
  phone TEXT,
  is_default BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 商品表
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  sku TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  category_id TEXT NOT NULL,
  unit_id TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  barcode TEXT,
  purchase_price REAL NOT NULL DEFAULT 0,
  sale_price REAL NOT NULL DEFAULT 0,
  min_stock REAL NOT NULL DEFAULT 0,
  max_stock REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('active', 'inactive', 'discontinued')) DEFAULT 'active',
  images TEXT, -- JSON array of image URLs
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT,
  FOREIGN KEY (unit_id) REFERENCES units(id) ON DELETE RESTRICT
);

-- 库存主表
CREATE TABLE inventory_stocks (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  current_stock REAL NOT NULL DEFAULT 0,
  available_stock REAL NOT NULL DEFAULT 0,
  reserved_stock REAL NOT NULL DEFAULT 0,
  avg_cost REAL NOT NULL DEFAULT 0,
  last_in_date DATETIME,
  last_out_date DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE,
  UNIQUE(product_id, warehouse_id)
);

-- 库存流水表
CREATE TABLE inventory_transactions (
  id TEXT PRIMARY KEY,
  transaction_no TEXT UNIQUE NOT NULL,
  product_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  transaction_type TEXT NOT NULL CHECK(transaction_type IN ('in', 'out', 'adjust')),
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  reference_type TEXT,
  reference_id TEXT,
  remark TEXT,
  operator TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE CASCADE
);

-- 供应商表
CREATE TABLE suppliers (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  payment_terms TEXT,
  credit_limit REAL NOT NULL DEFAULT 0,
  rating TEXT NOT NULL CHECK(rating IN ('A', 'B', 'C', 'D')) DEFAULT 'C',
  status TEXT NOT NULL CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 采购订单表
CREATE TABLE purchase_orders (
  id TEXT PRIMARY KEY,
  order_no TEXT UNIQUE NOT NULL,
  supplier_id TEXT NOT NULL,
  order_date DATE NOT NULL,
  expected_date DATE,
  status TEXT NOT NULL CHECK(status IN ('draft', 'confirmed', 'partial', 'completed', 'cancelled')) DEFAULT 'draft',
  total_amount REAL NOT NULL DEFAULT 0,
  discount_amount REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  final_amount REAL NOT NULL DEFAULT 0,
  remark TEXT,
  creator TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT
);

-- 采购订单明细表
CREATE TABLE purchase_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  discount_rate REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL,
  received_quantity REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('pending', 'partial', 'completed')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- 采购收货表
CREATE TABLE purchase_receipts (
  id TEXT PRIMARY KEY,
  receipt_no TEXT UNIQUE NOT NULL,
  order_id TEXT NOT NULL,
  supplier_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  receipt_date DATE NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft', 'confirmed')) DEFAULT 'draft',
  total_quantity REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  receiver TEXT NOT NULL,
  remark TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT
);

-- 采购收货明细表
CREATE TABLE purchase_receipt_items (
  id TEXT PRIMARY KEY,
  receipt_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  order_item_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  amount REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receipt_id) REFERENCES purchase_receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (order_item_id) REFERENCES purchase_order_items(id) ON DELETE RESTRICT
);

-- 客户表
CREATE TABLE customers (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  customer_type TEXT NOT NULL CHECK(customer_type IN ('individual', 'company')) DEFAULT 'individual',
  credit_limit REAL NOT NULL DEFAULT 0,
  payment_terms TEXT,
  discount_rate REAL NOT NULL DEFAULT 0,
  level TEXT NOT NULL CHECK(level IN ('VIP', 'Gold', 'Silver', 'Bronze')) DEFAULT 'Bronze',
  status TEXT NOT NULL CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 销售订单表
CREATE TABLE sales_orders (
  id TEXT PRIMARY KEY,
  order_no TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL,
  order_date DATE NOT NULL,
  delivery_date DATE,
  status TEXT NOT NULL CHECK(status IN ('draft', 'confirmed', 'shipped', 'completed', 'cancelled')) DEFAULT 'draft',
  total_amount REAL NOT NULL DEFAULT 0,
  discount_amount REAL NOT NULL DEFAULT 0,
  tax_amount REAL NOT NULL DEFAULT 0,
  final_amount REAL NOT NULL DEFAULT 0,
  payment_status TEXT NOT NULL CHECK(payment_status IN ('unpaid', 'partial', 'paid')) DEFAULT 'unpaid',
  remark TEXT,
  creator TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT
);

-- 销售订单明细表
CREATE TABLE sales_order_items (
  id TEXT PRIMARY KEY,
  order_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  discount_rate REAL NOT NULL DEFAULT 0,
  amount REAL NOT NULL,
  shipped_quantity REAL NOT NULL DEFAULT 0,
  status TEXT NOT NULL CHECK(status IN ('pending', 'partial', 'completed')) DEFAULT 'pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT
);

-- 销售出库表
CREATE TABLE sales_deliveries (
  id TEXT PRIMARY KEY,
  delivery_no TEXT UNIQUE NOT NULL,
  order_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  warehouse_id TEXT NOT NULL,
  delivery_date DATE NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('draft', 'confirmed', 'shipped', 'completed', 'cancelled')) DEFAULT 'draft',
  total_quantity REAL NOT NULL DEFAULT 0,
  total_amount REAL NOT NULL DEFAULT 0,
  delivery_person TEXT NOT NULL,
  remark TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE RESTRICT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (warehouse_id) REFERENCES warehouses(id) ON DELETE RESTRICT
);

-- 销售出库明细表
CREATE TABLE sales_delivery_items (
  id TEXT PRIMARY KEY,
  delivery_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  order_item_id TEXT NOT NULL,
  quantity REAL NOT NULL,
  unit_price REAL NOT NULL,
  amount REAL NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (delivery_id) REFERENCES sales_deliveries(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT,
  FOREIGN KEY (order_item_id) REFERENCES sales_order_items(id) ON DELETE RESTRICT
);

-- 应付账款表
CREATE TABLE accounts_payable (
  id TEXT PRIMARY KEY,
  bill_no TEXT UNIQUE NOT NULL,
  supplier_id TEXT NOT NULL,
  order_id TEXT,
  bill_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_amount REAL NOT NULL,
  paid_amount REAL NOT NULL DEFAULT 0,
  balance_amount REAL NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('unpaid', 'partial', 'paid', 'overdue')) DEFAULT 'unpaid',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE RESTRICT,
  FOREIGN KEY (order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL
);

-- 应收账款表
CREATE TABLE accounts_receivable (
  id TEXT PRIMARY KEY,
  bill_no TEXT UNIQUE NOT NULL,
  customer_id TEXT NOT NULL,
  order_id TEXT,
  bill_date DATE NOT NULL,
  due_date DATE NOT NULL,
  total_amount REAL NOT NULL,
  received_amount REAL NOT NULL DEFAULT 0,
  balance_amount REAL NOT NULL,
  status TEXT NOT NULL CHECK(status IN ('unpaid', 'partial', 'paid', 'overdue')) DEFAULT 'unpaid',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT,
  FOREIGN KEY (order_id) REFERENCES sales_orders(id) ON DELETE SET NULL
);

-- 付款记录表
CREATE TABLE payments (
  id TEXT PRIMARY KEY,
  payment_no TEXT UNIQUE NOT NULL,
  payable_id TEXT NOT NULL,
  payment_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank', 'check')),
  amount REAL NOT NULL,
  remark TEXT,
  operator TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (payable_id) REFERENCES accounts_payable(id) ON DELETE CASCADE
);

-- 收款记录表
CREATE TABLE receipts (
  id TEXT PRIMARY KEY,
  receipt_no TEXT UNIQUE NOT NULL,
  receivable_id TEXT NOT NULL,
  receipt_date DATE NOT NULL,
  payment_method TEXT NOT NULL CHECK(payment_method IN ('cash', 'bank', 'check')),
  amount REAL NOT NULL,
  remark TEXT,
  operator TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (receivable_id) REFERENCES accounts_receivable(id) ON DELETE CASCADE
);

-- 操作日志表
CREATE TABLE operation_logs (
  id TEXT PRIMARY KEY,
  operator TEXT NOT NULL,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT,
  description TEXT NOT NULL,
  ip_address TEXT,
  user_agent TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 兼容性表：库存物品表（用于向后兼容）
CREATE TABLE IF NOT EXISTS inventory_items (
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
  status TEXT CHECK(status IN ('in-stock', 'low-stock', 'out-of-stock', 'discontinued')) DEFAULT 'in-stock',
  location TEXT,
  reorder_level INTEGER DEFAULT 0,
  max_stock INTEGER DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 全局换算规则表
CREATE TABLE IF NOT EXISTS global_conversion_rules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  from_unit_id TEXT NOT NULL,
  to_unit_id TEXT NOT NULL,
  conversion_rate REAL NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT 0,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (from_unit_id) REFERENCES units(id),
  FOREIGN KEY (to_unit_id) REFERENCES units(id)
);

-- ================================================
-- 创建索引
-- ================================================

-- 产品相关索引
CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_category ON products(category_id);
CREATE INDEX idx_products_status ON products(status);

-- 分类索引
CREATE INDEX idx_categories_parent ON categories(parent_id);

-- 用户索引
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- 系统配置索引
CREATE INDEX idx_system_configs_key ON system_configs(key);
CREATE INDEX idx_system_configs_category ON system_configs(category);

-- 库存相关索引
CREATE INDEX idx_inventory_stocks_product ON inventory_stocks(product_id);
CREATE INDEX idx_inventory_stocks_warehouse ON inventory_stocks(warehouse_id);
CREATE INDEX idx_inventory_transactions_product ON inventory_transactions(product_id);
CREATE INDEX idx_inventory_transactions_warehouse ON inventory_transactions(warehouse_id);
CREATE INDEX idx_inventory_transactions_date ON inventory_transactions(created_at);
CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
CREATE INDEX idx_inventory_transactions_no ON inventory_transactions(transaction_no);

-- 供应商索引
CREATE INDEX idx_suppliers_code ON suppliers(code);
CREATE INDEX idx_suppliers_status ON suppliers(status);

-- 采购相关索引
CREATE INDEX idx_purchase_orders_no ON purchase_orders(order_no);
CREATE INDEX idx_purchase_orders_supplier ON purchase_orders(supplier_id);
CREATE INDEX idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX idx_purchase_orders_date ON purchase_orders(order_date);
CREATE INDEX idx_purchase_order_items_order ON purchase_order_items(order_id);
CREATE INDEX idx_purchase_order_items_product ON purchase_order_items(product_id);
CREATE INDEX idx_purchase_receipts_no ON purchase_receipts(receipt_no);
CREATE INDEX idx_purchase_receipts_order ON purchase_receipts(order_id);
CREATE INDEX idx_purchase_receipts_date ON purchase_receipts(receipt_date);
CREATE INDEX idx_purchase_receipt_items_receipt ON purchase_receipt_items(receipt_id);

-- 客户索引
CREATE INDEX idx_customers_code ON customers(code);
CREATE INDEX idx_customers_status ON customers(status);
CREATE INDEX idx_customers_level ON customers(level);

-- 销售相关索引
CREATE INDEX idx_sales_orders_no ON sales_orders(order_no);
CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
CREATE INDEX idx_sales_orders_status ON sales_orders(status);
CREATE INDEX idx_sales_orders_date ON sales_orders(order_date);
CREATE INDEX idx_sales_order_items_order ON sales_order_items(order_id);
CREATE INDEX idx_sales_order_items_product ON sales_order_items(product_id);
CREATE INDEX idx_sales_deliveries_no ON sales_deliveries(delivery_no);
CREATE INDEX idx_sales_deliveries_order ON sales_deliveries(order_id);
CREATE INDEX idx_sales_deliveries_customer ON sales_deliveries(customer_id);
CREATE INDEX idx_sales_deliveries_warehouse ON sales_deliveries(warehouse_id);
CREATE INDEX idx_sales_deliveries_date ON sales_deliveries(delivery_date);
CREATE INDEX idx_sales_delivery_items_delivery ON sales_delivery_items(delivery_id);
CREATE INDEX idx_sales_delivery_items_product ON sales_delivery_items(product_id);
CREATE INDEX idx_sales_delivery_items_order_item ON sales_delivery_items(order_item_id);

-- 财务相关索引
CREATE INDEX idx_accounts_payable_supplier ON accounts_payable(supplier_id);
CREATE INDEX idx_accounts_payable_status ON accounts_payable(status);
CREATE INDEX idx_accounts_payable_due_date ON accounts_payable(due_date);
CREATE INDEX idx_accounts_receivable_customer ON accounts_receivable(customer_id);
CREATE INDEX idx_accounts_receivable_status ON accounts_receivable(status);
CREATE INDEX idx_accounts_receivable_due_date ON accounts_receivable(due_date);
CREATE INDEX idx_payments_payable ON payments(payable_id);
CREATE INDEX idx_payments_date ON payments(payment_date);
CREATE INDEX idx_receipts_receivable ON receipts(receivable_id);
CREATE INDEX idx_receipts_date ON receipts(receipt_date);

-- 日志索引
CREATE INDEX idx_operation_logs_operator ON operation_logs(operator);
CREATE INDEX idx_operation_logs_action ON operation_logs(action);
CREATE INDEX idx_operation_logs_module ON operation_logs(module);
CREATE INDEX idx_operation_logs_entity ON operation_logs(entity_type, entity_id);
CREATE INDEX idx_operation_logs_date ON operation_logs(created_at);

-- 兼容性表索引
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_units_symbol ON units(symbol);
CREATE INDEX IF NOT EXISTS idx_global_conversion_from_unit ON global_conversion_rules(from_unit_id);
CREATE INDEX IF NOT EXISTS idx_global_conversion_to_unit ON global_conversion_rules(to_unit_id);
CREATE INDEX IF NOT EXISTS idx_global_conversion_category ON global_conversion_rules(category);

-- ================================================
-- 创建触发器（自动更新时间戳）
-- ================================================

-- 用户表时间戳触发器
CREATE TRIGGER update_users_timestamp AFTER UPDATE ON users
BEGIN
  UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 产品表时间戳触发器
CREATE TRIGGER update_products_timestamp AFTER UPDATE ON products
BEGIN
  UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 分类表时间戳触发器
CREATE TRIGGER update_categories_timestamp AFTER UPDATE ON categories
BEGIN
  UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 单位表时间戳触发器
CREATE TRIGGER update_units_timestamp AFTER UPDATE ON units
BEGIN
  UPDATE units SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 仓库表时间戳触发器
CREATE TRIGGER update_warehouses_timestamp AFTER UPDATE ON warehouses
BEGIN
  UPDATE warehouses SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 库存表时间戳触发器
CREATE TRIGGER update_inventory_stocks_timestamp AFTER UPDATE ON inventory_stocks
BEGIN
  UPDATE inventory_stocks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 供应商表时间戳触发器
CREATE TRIGGER update_suppliers_timestamp AFTER UPDATE ON suppliers
BEGIN
  UPDATE suppliers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 客户表时间戳触发器
CREATE TRIGGER update_customers_timestamp AFTER UPDATE ON customers
BEGIN
  UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 采购订单表时间戳触发器
CREATE TRIGGER update_purchase_orders_timestamp AFTER UPDATE ON purchase_orders
BEGIN
  UPDATE purchase_orders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 销售订单表时间戳触发器
CREATE TRIGGER update_sales_orders_timestamp AFTER UPDATE ON sales_orders
BEGIN
  UPDATE sales_orders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 销售出库表时间戳触发器
CREATE TRIGGER update_sales_deliveries_timestamp AFTER UPDATE ON sales_deliveries
BEGIN
  UPDATE sales_deliveries SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
END;

-- 库存变动时自动更新库存统计
CREATE TRIGGER update_inventory_on_transaction AFTER INSERT ON inventory_transactions
BEGIN
  -- 更新或插入库存记录
  INSERT OR REPLACE INTO inventory_stocks (
    id, product_id, warehouse_id, current_stock, available_stock, 
    reserved_stock, avg_cost, last_in_date, last_out_date, created_at, updated_at
  )
  SELECT 
    COALESCE(s.id, NEW.id || '_stock'),
    NEW.product_id,
    NEW.warehouse_id,
    COALESCE(s.current_stock, 0) + NEW.quantity,
    COALESCE(s.available_stock, 0) + NEW.quantity,
    COALESCE(s.reserved_stock, 0),
    CASE 
      WHEN NEW.transaction_type = 'in' AND NEW.quantity > 0 THEN
        (COALESCE(s.avg_cost, 0) * COALESCE(s.current_stock, 0) + NEW.unit_price * NEW.quantity) 
        / (COALESCE(s.current_stock, 0) + NEW.quantity)
      ELSE COALESCE(s.avg_cost, NEW.unit_price)
    END,
    CASE WHEN NEW.transaction_type = 'in' THEN NEW.created_at ELSE s.last_in_date END,
    CASE WHEN NEW.transaction_type = 'out' THEN NEW.created_at ELSE s.last_out_date END,
    COALESCE(s.created_at, NEW.created_at),
    NEW.created_at
  FROM (SELECT NULL) AS dummy
  LEFT JOIN inventory_stocks s ON s.product_id = NEW.product_id AND s.warehouse_id = NEW.warehouse_id;
END;

-- ================================================
-- 默认数据插入
-- ================================================

-- 插入单位数据
INSERT INTO units (id, name, symbol, precision, created_at, updated_at) VALUES
-- 数量单位
('unit-001', '个', '个', 0, datetime('now'), datetime('now')),
('unit-002', '件', '件', 0, datetime('now'), datetime('now')),
('unit-003', '套', '套', 0, datetime('now'), datetime('now')),
('unit-004', '包', '包', 0, datetime('now'), datetime('now')),
('unit-005', '箱', '箱', 0, datetime('now'), datetime('now')),
('unit-006', '盒', '盒', 0, datetime('now'), datetime('now')),
('unit-007', '瓶', '瓶', 0, datetime('now'), datetime('now')),
('unit-008', '罐', '罐', 0, datetime('now'), datetime('now')),
('unit-009', '袋', '袋', 0, datetime('now'), datetime('now')),
('unit-010', '支', '支', 0, datetime('now'), datetime('now')),
('unit-011', '打', '打', 0, datetime('now'), datetime('now')),
('unit-012', '对', '对', 0, datetime('now'), datetime('now')),
-- 重量单位
('unit-013', '克', 'g', 2, datetime('now'), datetime('now')),
('unit-014', '千克', 'kg', 3, datetime('now'), datetime('now')),
('unit-015', '吨', 't', 3, datetime('now'), datetime('now')),
('unit-016', '磅', 'lb', 2, datetime('now'), datetime('now')),
('unit-017', '两', '两', 2, datetime('now'), datetime('now')),
('unit-018', '斤', '斤', 2, datetime('now'), datetime('now')),
-- 长度单位
('unit-019', '厘米', 'cm', 2, datetime('now'), datetime('now')),
('unit-020', '米', 'm', 3, datetime('now'), datetime('now')),
('unit-021', '毫米', 'mm', 1, datetime('now'), datetime('now')),
('unit-022', '英寸', 'in', 2, datetime('now'), datetime('now')),
('unit-023', '英尺', 'ft', 2, datetime('now'), datetime('now')),
('unit-024', '分米', 'dm', 2, datetime('now'), datetime('now')),
('unit-025', '公里', 'km', 3, datetime('now'), datetime('now')),
('unit-026', '码', 'yd', 2, datetime('now'), datetime('now')),
-- 体积单位
('unit-027', '毫升', 'ml', 2, datetime('now'), datetime('now')),
('unit-028', '升', 'L', 3, datetime('now'), datetime('now')),
('unit-029', '立方厘米', 'cm³', 2, datetime('now'), datetime('now')),
('unit-030', '立方米', 'm³', 3, datetime('now'), datetime('now')),
('unit-031', '加仑', 'gal', 2, datetime('now'), datetime('now')),
-- 面积单位
('unit-032', '平方厘米', 'cm²', 2, datetime('now'), datetime('now')),
('unit-033', '平方米', 'm²', 3, datetime('now'), datetime('now')),
('unit-034', '平方英寸', 'in²', 2, datetime('now'), datetime('now')),
('unit-035', '平方英尺', 'ft²', 2, datetime('now'), datetime('now')),
-- 时间单位
('unit-036', '秒', 's', 0, datetime('now'), datetime('now')),
('unit-037', '分钟', 'min', 0, datetime('now'), datetime('now')),
('unit-038', '小时', 'h', 0, datetime('now'), datetime('now')),
('unit-039', '天', 'd', 0, datetime('now'), datetime('now')),
('unit-040', '月', 'month', 0, datetime('now'), datetime('now')),
('unit-041', '年', 'year', 0, datetime('now'), datetime('now'));

-- 插入分类数据
INSERT INTO categories (id, name, parent_id, is_active, created_at, updated_at) VALUES
('cat-001', '电子产品', NULL, 1, datetime('now'), datetime('now')),
('cat-002', '手机', 'cat-001', 1, datetime('now'), datetime('now')),
('cat-003', '电脑', 'cat-001', 1, datetime('now'), datetime('now')),
('cat-004', '家用电器', NULL, 1, datetime('now'), datetime('now')),
('cat-005', '厨房电器', 'cat-004', 1, datetime('now'), datetime('now')),
('cat-006', '清洁电器', 'cat-004', 1, datetime('now'), datetime('now')),
('cat-007', '服装鞋帽', NULL, 1, datetime('now'), datetime('now')),
('cat-008', '男装', 'cat-007', 1, datetime('now'), datetime('now')),
('cat-009', '女装', 'cat-007', 1, datetime('now'), datetime('now')),
('cat-010', '食品饮料', NULL, 1, datetime('now'), datetime('now'));

-- 插入供应商数据
INSERT INTO suppliers (id, code, name, contact_person, phone, email, address, status, created_at, updated_at) VALUES
('sup-001', 'SUP001', '华为技术有限公司', '张经理', '010-12345678', 'zhang@huawei.com', '深圳市龙岗区', 'active', datetime('now'), datetime('now')),
('sup-002', 'SUP002', '小米科技有限公司', '李经理', '010-87654321', 'li@xiaomi.com', '北京市海淀区', 'active', datetime('now'), datetime('now')),
('sup-003', 'SUP003', '美的集团股份有限公司', '王经理', '0757-12345678', 'wang@midea.com', '佛山市顺德区', 'active', datetime('now'), datetime('now')),
('sup-004', 'SUP004', '海尔智家股份有限公司', '赵经理', '0532-87654321', 'zhao@haier.com', '青岛市崂山区', 'active', datetime('now'), datetime('now')),
('sup-005', 'SUP005', '格力电器股份有限公司', '刘经理', '0756-12345678', 'liu@gree.com', '珠海市香洲区', 'active', datetime('now'), datetime('now'));

-- 插入仓库数据
INSERT INTO warehouses (id, code, name, address, manager, phone, is_default, created_at, updated_at) VALUES
('wh-001', 'WH001', '主仓库', '北京市朝阳区工业园区A座', '张经理', '010-12345678', 1, datetime('now'), datetime('now')),
('wh-002', 'WH002', '分仓库A', '上海市浦东新区物流园B区', '李经理', '021-87654321', 0, datetime('now'), datetime('now')),
('wh-003', 'WH003', '分仓库B', '广州市天河区仓储中心C栋', '王经理', '020-11223344', 0, datetime('now'), datetime('now')),
('wh-004', 'WH004', '临时仓库', '深圳市南山区临时存储点', '赵经理', '0755-88776655', 0, datetime('now'), datetime('now'));

-- 插入全局转换规则数据
INSERT INTO global_conversion_rules (id, name, from_unit_id, to_unit_id, conversion_rate, category, description, is_active, created_at, updated_at) VALUES
-- 数量转换
('rule-001', '打到个转换', 'unit-011', 'unit-001', 12, 'quantity', '1打=12个', 0, datetime('now'), datetime('now')),
('rule-002', '对到个转换', 'unit-012', 'unit-001', 2, 'quantity', '1对=2个', 0, datetime('now'), datetime('now')),
('rule-003', '箱到个转换', 'unit-005', 'unit-001', 24, 'quantity', '1箱=24个', 0, datetime('now'), datetime('now')),
('rule-004', '包到个转换', 'unit-004', 'unit-001', 12, 'quantity', '1包=12个', 0, datetime('now'), datetime('now')),
-- 重量转换
('rule-005', '千克到克转换', 'unit-014', 'unit-013', 1000, 'weight', '1千克=1000克', 0, datetime('now'), datetime('now')),
('rule-006', '吨到千克转换', 'unit-015', 'unit-014', 1000, 'weight', '1吨=1000千克', 0, datetime('now'), datetime('now')),
('rule-007', '磅到克转换', 'unit-016', 'unit-013', 453.592, 'weight', '1磅=453.592克', 0, datetime('now'), datetime('now')),
('rule-008', '斤到克转换', 'unit-018', 'unit-013', 500, 'weight', '1斤=500克', 0, datetime('now'), datetime('now')),
('rule-009', '两到克转换', 'unit-017', 'unit-013', 50, 'weight', '1两=50克', 0, datetime('now'), datetime('now')),
-- 长度转换
('rule-010', '米到厘米转换', 'unit-020', 'unit-019', 100, 'length', '1米=100厘米', 0, datetime('now'), datetime('now')),
('rule-011', '厘米到毫米转换', 'unit-019', 'unit-021', 10, 'length', '1厘米=10毫米', 0, datetime('now'), datetime('now')),
('rule-012', '分米到厘米转换', 'unit-024', 'unit-019', 10, 'length', '1分米=10厘米', 0, datetime('now'), datetime('now')),
('rule-013', '公里到米转换', 'unit-025', 'unit-020', 1000, 'length', '1公里=1000米', 0, datetime('now'), datetime('now')),
('rule-014', '英寸到厘米转换', 'unit-022', 'unit-019', 2.54, 'length', '1英寸=2.54厘米', 0, datetime('now'), datetime('now')),
('rule-015', '英尺到英寸转换', 'unit-023', 'unit-022', 12, 'length', '1英尺=12英寸', 0, datetime('now'), datetime('now')),
('rule-016', '码到英尺转换', 'unit-026', 'unit-023', 3, 'length', '1码=3英尺', 0, datetime('now'), datetime('now')),
-- 体积转换
('rule-017', '升到毫升转换', 'unit-028', 'unit-027', 1000, 'volume', '1升=1000毫升', 0, datetime('now'), datetime('now')),
('rule-018', '立方厘米到毫升转换', 'unit-029', 'unit-027', 1, 'volume', '1立方厘米=1毫升', 0, datetime('now'), datetime('now')),
('rule-019', '立方米到升转换', 'unit-030', 'unit-028', 1000, 'volume', '1立方米=1000升', 0, datetime('now'), datetime('now')),
('rule-020', '加仑到升转换', 'unit-031', 'unit-028', 3.78541, 'volume', '1加仑=3.78541升', 0, datetime('now'), datetime('now')),
-- 面积转换
('rule-021', '平方米到平方厘米转换', 'unit-033', 'unit-032', 10000, 'area', '1平方米=10000平方厘米', 0, datetime('now'), datetime('now')),
('rule-022', '平方英寸到平方厘米转换', 'unit-034', 'unit-032', 6.4516, 'area', '1平方英寸=6.4516平方厘米', 0, datetime('now'), datetime('now')),
('rule-023', '平方英尺到平方英寸转换', 'unit-035', 'unit-034', 144, 'area', '1平方英尺=144平方英寸', 0, datetime('now'), datetime('now')),
-- 时间转换
('rule-024', '分钟到秒转换', 'unit-037', 'unit-036', 60, 'time', '1分钟=60秒', 0, datetime('now'), datetime('now')),
('rule-025', '小时到分钟转换', 'unit-038', 'unit-037', 60, 'time', '1小时=60分钟', 0, datetime('now'), datetime('now')),
('rule-026', '天到小时转换', 'unit-039', 'unit-038', 24, 'time', '1天=24小时', 0, datetime('now'), datetime('now')),
('rule-027', '月到天转换', 'unit-040', 'unit-039', 30, 'time', '1月=30天', 0, datetime('now'), datetime('now')),
('rule-028', '年到月转换', 'unit-041', 'unit-040', 12, 'time', '1年=12月', 0, datetime('now'), datetime('now'));

-- 创建迁移记录表
CREATE TABLE IF NOT EXISTS migrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  version INTEGER UNIQUE NOT NULL,
  name TEXT NOT NULL,
  applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 插入迁移记录
INSERT INTO migrations (version, name) VALUES
(1, 'create_initial_tables'),
(2, 'create_inventory_tables'),
(3, 'create_supplier_and_purchase_tables'),
(4, 'create_customer_and_sales_tables'),
(5, 'create_financial_tables'),
(6, 'create_operation_logs'),
(7, 'create_sales_delivery_tables'),
(8, 'create_triggers');

-- 提交事务
COMMIT;

-- ================================================
-- 脚本执行完成
-- ================================================

-- 显示统计信息
SELECT 
  'Tables' as type, 
  COUNT(*) as count 
FROM sqlite_master 
WHERE type='table' AND name NOT LIKE 'sqlite_%'
UNION ALL
SELECT 
  'Indexes' as type, 
  COUNT(*) as count 
FROM sqlite_master 
WHERE type='index' AND name NOT LIKE 'sqlite_%'
UNION ALL
SELECT 
  'Triggers' as type, 
  COUNT(*) as count 
FROM sqlite_master 
WHERE type='trigger'
UNION ALL
SELECT 
  'Units' as type, 
  COUNT(*) as count 
FROM units
UNION ALL
SELECT 
  'Categories' as type, 
  COUNT(*) as count 
FROM categories
UNION ALL
SELECT 
  'Suppliers' as type, 
  COUNT(*) as count 
FROM suppliers
UNION ALL
SELECT 
  'Warehouses' as type, 
  COUNT(*) as count 
FROM warehouses
UNION ALL
SELECT 
  'Conversion Rules' as type, 
  COUNT(*) as count 
FROM global_conversion_rules;