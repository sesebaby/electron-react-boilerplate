// 数据库迁移脚本

export interface Migration {
  version: number;
  name: string;
  up: string;
  down?: string;
}

export const migrations: Migration[] = [
  {
    version: 1,
    name: 'create_initial_tables',
    up: `
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

      -- 创建索引
      CREATE INDEX idx_products_sku ON products(sku);
      CREATE INDEX idx_products_category ON products(category_id);
      CREATE INDEX idx_products_status ON products(status);
      CREATE INDEX idx_categories_parent ON categories(parent_id);
      CREATE INDEX idx_users_username ON users(username);
      CREATE INDEX idx_users_role ON users(role);
      CREATE INDEX idx_system_configs_key ON system_configs(key);
      CREATE INDEX idx_system_configs_category ON system_configs(category);
    `,
    down: `
      DROP TABLE IF EXISTS products;
      DROP TABLE IF EXISTS categories;
      DROP TABLE IF EXISTS warehouses;
      DROP TABLE IF EXISTS units;
      DROP TABLE IF EXISTS system_configs;
      DROP TABLE IF EXISTS users;
    `
  },
  {
    version: 2,
    name: 'create_inventory_tables',
    up: `
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

      -- 创建索引
      CREATE INDEX idx_inventory_stocks_product ON inventory_stocks(product_id);
      CREATE INDEX idx_inventory_stocks_warehouse ON inventory_stocks(warehouse_id);
      CREATE INDEX idx_inventory_transactions_product ON inventory_transactions(product_id);
      CREATE INDEX idx_inventory_transactions_warehouse ON inventory_transactions(warehouse_id);
      CREATE INDEX idx_inventory_transactions_date ON inventory_transactions(created_at);
      CREATE INDEX idx_inventory_transactions_type ON inventory_transactions(transaction_type);
      CREATE INDEX idx_inventory_transactions_no ON inventory_transactions(transaction_no);
    `,
    down: `
      DROP TABLE IF EXISTS inventory_transactions;
      DROP TABLE IF EXISTS inventory_stocks;
    `
  },
  {
    version: 3,
    name: 'create_supplier_and_purchase_tables',
    up: `
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

      -- 创建索引
      CREATE INDEX idx_suppliers_code ON suppliers(code);
      CREATE INDEX idx_suppliers_status ON suppliers(status);
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
    `,
    down: `
      DROP TABLE IF EXISTS purchase_receipt_items;
      DROP TABLE IF EXISTS purchase_receipts;
      DROP TABLE IF EXISTS purchase_order_items;
      DROP TABLE IF EXISTS purchase_orders;
      DROP TABLE IF EXISTS suppliers;
    `
  },
  {
    version: 4,
    name: 'create_customer_and_sales_tables',
    up: `
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

      -- 创建索引
      CREATE INDEX idx_customers_code ON customers(code);
      CREATE INDEX idx_customers_status ON customers(status);
      CREATE INDEX idx_customers_level ON customers(level);
      CREATE INDEX idx_sales_orders_no ON sales_orders(order_no);
      CREATE INDEX idx_sales_orders_customer ON sales_orders(customer_id);
      CREATE INDEX idx_sales_orders_status ON sales_orders(status);
      CREATE INDEX idx_sales_orders_date ON sales_orders(order_date);
      CREATE INDEX idx_sales_order_items_order ON sales_order_items(order_id);
      CREATE INDEX idx_sales_order_items_product ON sales_order_items(product_id);
    `,
    down: `
      DROP TABLE IF EXISTS sales_order_items;
      DROP TABLE IF EXISTS sales_orders;
      DROP TABLE IF EXISTS customers;
    `
  },
  {
    version: 5,
    name: 'create_financial_tables',
    up: `
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

      -- 创建索引
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
    `,
    down: `
      DROP TABLE IF EXISTS receipts;
      DROP TABLE IF EXISTS payments;
      DROP TABLE IF EXISTS accounts_receivable;
      DROP TABLE IF EXISTS accounts_payable;
    `
  },
  {
    version: 6,
    name: 'create_operation_logs',
    up: `
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

      -- 创建索引
      CREATE INDEX idx_operation_logs_operator ON operation_logs(operator);
      CREATE INDEX idx_operation_logs_action ON operation_logs(action);
      CREATE INDEX idx_operation_logs_module ON operation_logs(module);
      CREATE INDEX idx_operation_logs_entity ON operation_logs(entity_type, entity_id);
      CREATE INDEX idx_operation_logs_date ON operation_logs(created_at);
    `,
    down: `
      DROP TABLE IF EXISTS operation_logs;
    `
  },
  {
    version: 7,
    name: 'create_triggers',
    up: `
      -- 自动更新 updated_at 字段的触发器
      CREATE TRIGGER update_users_timestamp AFTER UPDATE ON users
      BEGIN
        UPDATE users SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      CREATE TRIGGER update_products_timestamp AFTER UPDATE ON products
      BEGIN
        UPDATE products SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      CREATE TRIGGER update_categories_timestamp AFTER UPDATE ON categories
      BEGIN
        UPDATE categories SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      CREATE TRIGGER update_units_timestamp AFTER UPDATE ON units
      BEGIN
        UPDATE units SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      CREATE TRIGGER update_warehouses_timestamp AFTER UPDATE ON warehouses
      BEGIN
        UPDATE warehouses SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      CREATE TRIGGER update_inventory_stocks_timestamp AFTER UPDATE ON inventory_stocks
      BEGIN
        UPDATE inventory_stocks SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      CREATE TRIGGER update_suppliers_timestamp AFTER UPDATE ON suppliers
      BEGIN
        UPDATE suppliers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      CREATE TRIGGER update_customers_timestamp AFTER UPDATE ON customers
      BEGIN
        UPDATE customers SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      CREATE TRIGGER update_purchase_orders_timestamp AFTER UPDATE ON purchase_orders
      BEGIN
        UPDATE purchase_orders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;

      CREATE TRIGGER update_sales_orders_timestamp AFTER UPDATE ON sales_orders
      BEGIN
        UPDATE sales_orders SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
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
    `,
    down: `
      DROP TRIGGER IF EXISTS update_users_timestamp;
      DROP TRIGGER IF EXISTS update_products_timestamp;
      DROP TRIGGER IF EXISTS update_categories_timestamp;
      DROP TRIGGER IF EXISTS update_units_timestamp;
      DROP TRIGGER IF EXISTS update_warehouses_timestamp;
      DROP TRIGGER IF EXISTS update_inventory_stocks_timestamp;
      DROP TRIGGER IF EXISTS update_suppliers_timestamp;
      DROP TRIGGER IF EXISTS update_customers_timestamp;
      DROP TRIGGER IF EXISTS update_purchase_orders_timestamp;
      DROP TRIGGER IF EXISTS update_sales_orders_timestamp;
      DROP TRIGGER IF EXISTS update_inventory_on_transaction;
    `
  }
];

// 迁移管理类
export class MigrationManager {
  private db: any;

  constructor(database: any) {
    this.db = database;
  }

  async initializeMigrationTable(): Promise<void> {
    const createMigrationTable = `
      CREATE TABLE IF NOT EXISTS migrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        version INTEGER UNIQUE NOT NULL,
        name TEXT NOT NULL,
        applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `;

    this.db.exec(createMigrationTable);
  }

  async getCurrentVersion(): Promise<number> {
    try {
      const result = this.db.prepare(`
        SELECT MAX(version) as version FROM migrations
      `).get();

      return result?.version || 0;
    } catch (error) {
      return 0;
    }
  }

  async runMigrations(): Promise<void> {
    await this.initializeMigrationTable();
    const currentVersion = await this.getCurrentVersion();

    console.log(`Current database version: ${currentVersion}`);

    const pendingMigrations = migrations.filter(m => m.version > currentVersion);

    if (pendingMigrations.length === 0) {
      console.log('No pending migrations');
      return;
    }

    console.log(`Running ${pendingMigrations.length} migrations...`);

    for (const migration of pendingMigrations) {
      try {
        console.log(`Applying migration ${migration.version}: ${migration.name}`);
        
        // 开始事务
        this.db.exec('BEGIN TRANSACTION;');
        
        // 执行迁移
        this.db.exec(migration.up);
        
        // 记录迁移
        this.db.prepare(`
          INSERT INTO migrations (version, name) VALUES (?, ?)
        `).run(migration.version, migration.name);
        
        // 提交事务
        this.db.exec('COMMIT;');
        
        console.log(`Migration ${migration.version} applied successfully`);
      } catch (error) {
        // 回滚事务
        this.db.exec('ROLLBACK;');
        console.error(`Migration ${migration.version} failed:`, error);
        throw error;
      }
    }

    console.log('All migrations completed successfully');
  }

  async rollbackMigration(targetVersion: number): Promise<void> {
    const currentVersion = await this.getCurrentVersion();

    if (targetVersion >= currentVersion) {
      console.log('Target version is not lower than current version');
      return;
    }

    const migrationsToRollback = migrations
      .filter(m => m.version > targetVersion && m.version <= currentVersion)
      .reverse(); // 按版本号倒序

    console.log(`Rolling back ${migrationsToRollback.length} migrations...`);

    for (const migration of migrationsToRollback) {
      if (!migration.down) {
        console.warn(`Migration ${migration.version} has no rollback script`);
        continue;
      }

      try {
        console.log(`Rolling back migration ${migration.version}: ${migration.name}`);
        
        // 开始事务
        this.db.exec('BEGIN TRANSACTION;');
        
        // 执行回滚
        this.db.exec(migration.down);
        
        // 删除迁移记录
        this.db.prepare(`
          DELETE FROM migrations WHERE version = ?
        `).run(migration.version);
        
        // 提交事务
        this.db.exec('COMMIT;');
        
        console.log(`Migration ${migration.version} rolled back successfully`);
      } catch (error) {
        // 回滚事务
        this.db.exec('ROLLBACK;');
        console.error(`Rollback of migration ${migration.version} failed:`, error);
        throw error;
      }
    }

    console.log('Rollback completed successfully');
  }
}