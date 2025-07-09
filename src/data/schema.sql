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

-- 计量单位表
CREATE TABLE IF NOT EXISTS units (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    symbol TEXT NOT NULL UNIQUE,
    type TEXT CHECK(type IN ('quantity', 'weight', 'length', 'volume', 'area', 'time')) NOT NULL,
    precision INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
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
    category TEXT CHECK(category IN ('quantity', 'weight', 'length', 'volume', 'area', 'time')) NOT NULL,
    description TEXT NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (from_unit_id) REFERENCES units (id),
    FOREIGN KEY (to_unit_id) REFERENCES units (id),
    UNIQUE(from_unit_id, to_unit_id)
);

-- 商品换算设置表
CREATE TABLE IF NOT EXISTS product_conversion_settings (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    enable_conversion BOOLEAN NOT NULL DEFAULT 0,
    conversion_type TEXT CHECK(conversion_type IN ('global', 'custom')) NOT NULL DEFAULT 'global',
    global_rule_id TEXT,
    custom_from_unit_id TEXT,
    custom_to_unit_id TEXT,
    custom_conversion_rate REAL,
    custom_description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES inventory_items (id) ON DELETE CASCADE,
    FOREIGN KEY (global_rule_id) REFERENCES global_conversion_rules (id),
    FOREIGN KEY (custom_from_unit_id) REFERENCES units (id),
    FOREIGN KEY (custom_to_unit_id) REFERENCES units (id),
    UNIQUE(product_id)
);

-- 用户表
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL UNIQUE,
    password TEXT NOT NULL,
    nickname TEXT,
    email TEXT,
    phone TEXT,
    avatar TEXT,
    role TEXT CHECK(role IN ('admin', 'warehouse', 'purchase', 'sales', 'finance')) NOT NULL DEFAULT 'warehouse',
    status TEXT CHECK(status IN ('active', 'inactive', 'locked')) NOT NULL DEFAULT 'active',
    last_login_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 仓库表
CREATE TABLE IF NOT EXISTS warehouses (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    address TEXT,
    manager TEXT,
    phone TEXT,
    is_default BOOLEAN NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 客户表
CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    contact_person TEXT,
    phone TEXT,
    email TEXT,
    address TEXT,
    customer_type TEXT CHECK(customer_type IN ('company', 'individual')) NOT NULL DEFAULT 'company',
    credit_limit REAL DEFAULT 0,
    payment_terms TEXT,
    discount_rate REAL DEFAULT 0,
    level TEXT CHECK(level IN ('VIP', 'Gold', 'Silver', 'Bronze', 'Regular')) DEFAULT 'Regular',
    status TEXT CHECK(status IN ('active', 'inactive', 'blacklist')) NOT NULL DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory_items(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);
CREATE INDEX IF NOT EXISTS idx_inventory_status ON inventory_items(status);
CREATE INDEX IF NOT EXISTS idx_transactions_item_id ON inventory_transactions(item_id);
CREATE INDEX IF NOT EXISTS idx_transactions_date ON inventory_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_units_type ON units(type);
CREATE INDEX IF NOT EXISTS idx_units_symbol ON units(symbol);
CREATE INDEX IF NOT EXISTS idx_conversion_rules_category ON global_conversion_rules(category);
CREATE INDEX IF NOT EXISTS idx_conversion_rules_units ON global_conversion_rules(from_unit_id, to_unit_id);
CREATE INDEX IF NOT EXISTS idx_product_conversion_product ON product_conversion_settings(product_id);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_warehouses_code ON warehouses(code);
CREATE INDEX IF NOT EXISTS idx_customers_code ON customers(code);

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

-- 更新计量单位时间戳触发器
CREATE TRIGGER IF NOT EXISTS update_units_timestamp
    AFTER UPDATE ON units
    BEGIN
        UPDATE units SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- 更新全局换算规则时间戳触发器
CREATE TRIGGER IF NOT EXISTS update_conversion_rules_timestamp
    AFTER UPDATE ON global_conversion_rules
    BEGIN
        UPDATE global_conversion_rules SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- 更新商品换算设置时间戳触发器
CREATE TRIGGER IF NOT EXISTS update_product_conversion_timestamp
    AFTER UPDATE ON product_conversion_settings
    BEGIN
        UPDATE product_conversion_settings SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- 更新用户时间戳触发器
CREATE TRIGGER IF NOT EXISTS update_users_timestamp
    AFTER UPDATE ON users
    BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- 更新仓库时间戳触发器
CREATE TRIGGER IF NOT EXISTS update_warehouses_timestamp
    AFTER UPDATE ON warehouses
    BEGIN
        UPDATE warehouses SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;

-- 更新客户时间戳触发器
CREATE TRIGGER IF NOT EXISTS update_customers_timestamp
    AFTER UPDATE ON customers
    BEGIN
        UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
    END;