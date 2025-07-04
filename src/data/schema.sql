-- 库存管理数据库表结构

-- 库存物品表
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

-- 库存变动记录表
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id TEXT NOT NULL,
    transaction_type TEXT CHECK(transaction_type IN ('in', 'out', 'adjust')) NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL,
    total_value REAL,
    reason TEXT,
    reference_no TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_by TEXT,
    FOREIGN KEY (item_id) REFERENCES inventory_items (id) ON DELETE CASCADE
);

-- 供应商表
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 分类表
CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES categories (id)
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON inventory_transactions(created_at);

-- 触发器：自动更新 updated_at 字段
CREATE TRIGGER IF NOT EXISTS update_inventory_timestamp 
    AFTER UPDATE ON inventory_items
    BEGIN
        UPDATE inventory_items SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

CREATE TRIGGER IF NOT EXISTS update_supplier_timestamp 
    AFTER UPDATE ON suppliers
    BEGIN
        UPDATE suppliers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;