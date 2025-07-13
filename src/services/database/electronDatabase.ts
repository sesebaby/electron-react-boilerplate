/**
 * Electron 数据库代理
 * 通过 IPC 与主进程通信来执行数据库操作
 */

declare global {
  interface Window {
    electronAPI: {
      // 数据库操作
      dbInitialize: () => Promise<any>;
      dbGetAllItems: () => Promise<any>;
      dbGetItemById: (id: string) => Promise<any>;
      dbGetItemBySku: (sku: string) => Promise<any>;
      dbCreateItem: (item: any) => Promise<any>;
      dbUpdateItem: (id: string, updates: any) => Promise<any>;
      dbDeleteItem: (id: string) => Promise<any>;
      dbSearchItems: (params: any) => Promise<any>;
      dbGetCategories: () => Promise<any>;
      dbGetAllCategories: () => Promise<any>;
      dbCreateCategory: (category: any) => Promise<any>;
      dbUpdateCategory: (id: string, updates: any) => Promise<any>;
      dbDeleteCategory: (id: string) => Promise<any>;
      dbGetSuppliers: () => Promise<any>;
      dbGetAllSuppliers: () => Promise<any>;
      dbCreateSupplier: (supplier: any) => Promise<any>;
      dbUpdateSupplier: (id: string, updates: any) => Promise<any>;
      dbDeleteSupplier: (id: string) => Promise<any>;
      dbGetWarehouses: () => Promise<any>;
      dbGetAllWarehouses: () => Promise<any>;
      dbCreateWarehouse: (warehouse: any) => Promise<any>;
      dbUpdateWarehouse: (id: string, updates: any) => Promise<any>;
      dbDeleteWarehouse: (id: string) => Promise<any>;
      dbSetDefaultWarehouse: (id: string) => Promise<any>;
      dbGetWarehouseStats: () => Promise<any>;
      dbGetUsers: () => Promise<any>;
      dbGetAllUsers: () => Promise<any>;
      dbCreateUser: (user: any) => Promise<any>;
      dbUpdateUser: (id: string, updates: any) => Promise<any>;
      dbDeleteUser: (id: string) => Promise<any>;
      dbAuthenticateUser: (username: string, password: string) => Promise<any>;
      dbGetUnits: () => Promise<any>;
      dbGetAllUnits: () => Promise<any>;
      dbCreateUnit: (unit: any) => Promise<any>;
      dbUpdateUnit: (id: string, updates: any) => Promise<any>;
      dbDeleteUnit: (id: string) => Promise<any>;
      // 额外的数据库方法
      dbGetAllInventoryStocks: () => Promise<any>;
      dbGetAllTransactions: () => Promise<any>;
      dbAddTransaction: (transaction: any) => Promise<any>;
      dbGetAllCustomers: () => Promise<any>;
      dbGetAccountsReceivable: () => Promise<any>;
      dbGetAccountsPayable: () => Promise<any>;
      dbGetPaymentRecords: () => Promise<any>;
      // 通用查询
      dbQuery: (sql: string, params?: any[]) => Promise<any>;
      dbRun: (sql: string, params?: any[]) => Promise<any>;
      dbGet: (sql: string, params?: any[]) => Promise<any>;
      dbAll: (sql: string, params?: any[]) => Promise<any>;
      // 事务
      dbBeginTransaction: () => Promise<any>;
      dbCommit: () => Promise<any>;
      dbRollback: () => Promise<any>;
      
      // 系统操作
      dbClearDatabase: (options?: any) => Promise<any>;
      dbRebuildSchema: () => Promise<any>;
      dbReimportUnits: () => Promise<any>;
      dbImportSampleData: () => Promise<any>;
      dbImportBuiltinData: () => Promise<any>;
      dbCheckHealth: () => Promise<any>;
      dbValidateIntegrity: () => Promise<any>;
      dbBackup: (path?: string) => Promise<any>;
      dbRestore: (path: string) => Promise<any>;
      dbValidateBackup: (path: string) => Promise<any>;
      dbOptimize: () => Promise<any>;
      dbGetSystemStatus: () => Promise<any>;
      dbGetBackupList: () => Promise<any>;
      dbDeleteBackup: (backupId: string) => Promise<any>;
      
      // 文件操作
      readFile: (filePath: string) => Promise<any>;
      writeFile: (filePath: string, data: any) => Promise<any>;
      checkFileExists: (filePath: string) => Promise<any>;
      mkdir: (dirPath: string, options?: any) => Promise<any>;
      stat: (filePath: string) => Promise<any>;
      readdir: (dirPath: string) => Promise<any>;
      rename: (oldPath: string, newPath: string) => Promise<any>;
      unlink: (filePath: string) => Promise<any>;
      getAppPath: (name: string) => Promise<any>;
      
      // 文件对话框
      showOpenDialog: (options: any) => Promise<any>;
      showSaveDialog: (options: any) => Promise<any>;
    };
  }
}

export class ElectronDatabase {
  private static instance: ElectronDatabase;

  private constructor() {}

  static getInstance(): ElectronDatabase {
    if (!ElectronDatabase.instance) {
      ElectronDatabase.instance = new ElectronDatabase();
    }
    return ElectronDatabase.instance;
  }

  async initialize(): Promise<void> {
    if (!window.electronAPI) {
      throw new Error('Electron API not available. Make sure preload script is loaded.');
    }
    return window.electronAPI.dbInitialize();
  }

  // 通用查询方法
  async query(sql: string, params: any[] = []): Promise<any> {
    return window.electronAPI.dbQuery(sql, params);
  }

  async run(sql: string, params: any[] = []): Promise<any> {
    return window.electronAPI.dbRun(sql, params);
  }

  async get(sql: string, params: any[] = []): Promise<any> {
    return window.electronAPI.dbGet(sql, params);
  }

  async all(sql: string, params: any[] = []): Promise<any> {
    return window.electronAPI.dbAll(sql, params);
  }

  // 库存更新方法
  async updateInventoryStock(params: {
    productId: string;
    warehouseId?: string;
    quantity: number;
    type: 'in' | 'out' | 'adjust';
    unitPrice?: number;
    reason?: string;
  }): Promise<any> {
    // 对于简化的库存系统，我们直接更新inventory_items表
    // 在更复杂的系统中，这里会更新inventory_stocks表

    // 首先获取当前库存信息
    const currentItem = await this.getItemById(params.productId);
    if (!currentItem) {
      throw new Error(`商品不存在: ${params.productId}`);
    }

    let newQuantity: number;
    const currentStock = currentItem.stockQuantity || 0;

    switch (params.type) {
      case 'in':
        newQuantity = currentStock + Math.abs(params.quantity);
        break;
      case 'out':
        newQuantity = currentStock - Math.abs(params.quantity);
        if (newQuantity < 0) {
          throw new Error('库存不足，无法出库');
        }
        break;
      case 'adjust':
        newQuantity = params.quantity;
        if (newQuantity < 0) {
          throw new Error('调整后的库存数量不能为负数');
        }
        break;
      default:
        throw new Error(`无效的库存操作类型: ${params.type}`);
    }

    // 更新库存状态
    let status = currentItem.status;
    if (newQuantity <= 0) {
      status = 'out-of-stock';
    } else if (newQuantity <= (currentItem.reorderLevel || 0)) {
      status = 'low-stock';
    } else {
      status = 'in-stock';
    }

    // 计算新的总价值
    const unitPrice = params.unitPrice || currentItem.unitPrice || 0;
    const totalValue = newQuantity * unitPrice;

    // 更新库存项目
    const updateResult = await this.updateItem(params.productId, {
      stockQuantity: newQuantity,
      totalValue: totalValue,
      status: status,
      lastUpdated: new Date()
    });

    return {
      success: true,
      data: updateResult,
      newStockLevel: newQuantity,
      stockChange: newQuantity - currentStock
    };
  }

  // 创建库存交易记录
  async createInventoryTransaction(params: {
    productId: string;
    warehouseId?: string;
    type: 'in' | 'out' | 'adjust';
    quantity: number;
    unitPrice?: number;
    totalAmount?: number;
    referenceNo?: string;
    reason?: string;
    operator?: string;
  }): Promise<any> {
    const transactionData = {
      id: this.generateId(),
      itemId: params.productId,
      transactionType: params.type === 'in' ? 'purchase' : params.type === 'out' ? 'sale' : 'adjustment',
      quantity: params.quantity,
      unitPrice: params.unitPrice || 0,
      totalAmount: params.totalAmount || (params.quantity * (params.unitPrice || 0)),
      referenceNumber: params.referenceNo || '',
      notes: params.reason || '',
      createdBy: params.operator || 'system',
      createdAt: new Date().toISOString()
    };

    // 使用现有的交易记录创建方法
    return window.electronAPI.dbAddTransaction(transactionData);
  }

  // 生成ID的辅助方法
  private generateId(): string {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // 事务支持
  async beginTransaction(): Promise<any> {
    return window.electronAPI.dbBeginTransaction();
  }

  async commit(): Promise<any> {
    return window.electronAPI.dbCommit();
  }

  async rollback(): Promise<any> {
    return window.electronAPI.dbRollback();
  }

  // 库存项目
  async getAllItems(): Promise<any> {
    return window.electronAPI.dbGetAllItems();
  }

  async getItemById(id: string): Promise<any> {
    return window.electronAPI.dbGetItemById(id);
  }

  async getItemBySku(sku: string): Promise<any> {
    return window.electronAPI.dbGetItemBySku(sku);
  }

  async createItem(item: any): Promise<any> {
    return window.electronAPI.dbCreateItem(item);
  }

  async updateItem(id: string, updates: any): Promise<any> {
    return window.electronAPI.dbUpdateItem(id, updates);
  }

  async deleteItem(id: string): Promise<any> {
    return window.electronAPI.dbDeleteItem(id);
  }

  async searchItems(params: any): Promise<any> {
    return window.electronAPI.dbSearchItems(params);
  }

  // 分类
  async getCategories(): Promise<any> {
    const result = await window.electronAPI.dbGetCategories();
    return result.success ? result.data : [];
  }

  async getAllCategories(): Promise<any> {
    const result = await window.electronAPI.dbGetAllCategories();
    return result.success ? result.data : [];
  }

  async createCategory(category: any): Promise<any> {
    return window.electronAPI.dbCreateCategory(category);
  }

  async updateCategory(id: string, updates: any): Promise<any> {
    return window.electronAPI.dbUpdateCategory(id, updates);
  }

  async deleteCategory(id: string): Promise<any> {
    return window.electronAPI.dbDeleteCategory(id);
  }

  // 供应商
  async getSuppliers(): Promise<any> {
    const result = await window.electronAPI.dbGetSuppliers();
    return result.success ? result.data : [];
  }

  async getAllSuppliers(): Promise<any> {
    const result = await window.electronAPI.dbGetAllSuppliers();
    return result.success ? result.data : [];
  }

  async createSupplier(supplier: any): Promise<any> {
    return window.electronAPI.dbCreateSupplier(supplier);
  }

  async updateSupplier(id: string, updates: any): Promise<any> {
    return window.electronAPI.dbUpdateSupplier(id, updates);
  }

  async deleteSupplier(id: string): Promise<any> {
    return window.electronAPI.dbDeleteSupplier(id);
  }

  // 仓库
  async getWarehouses(): Promise<any> {
    return window.electronAPI.dbGetWarehouses();
  }

  async getAllWarehouses(): Promise<any> {
    const result = await window.electronAPI.dbGetAllWarehouses();
    return result.success ? result.data : [];
  }

  async createWarehouse(warehouse: any): Promise<any> {
    return window.electronAPI.dbCreateWarehouse(warehouse);
  }

  async updateWarehouse(id: string, updates: any): Promise<any> {
    return window.electronAPI.dbUpdateWarehouse(id, updates);
  }

  async deleteWarehouse(id: string): Promise<any> {
    return window.electronAPI.dbDeleteWarehouse(id);
  }

  async setDefaultWarehouse(id: string): Promise<any> {
    return window.electronAPI.dbSetDefaultWarehouse(id);
  }

  async getWarehouseStats(): Promise<any> {
    return window.electronAPI.dbGetWarehouseStats();
  }

  // 用户
  async getUsers(): Promise<any> {
    return window.electronAPI.dbGetUsers();
  }

  async getAllUsers(): Promise<any> {
    const result = await window.electronAPI.dbGetAllUsers();
    return result.success ? result.data : [];
  }

  async createUser(user: any): Promise<any> {
    return window.electronAPI.dbCreateUser(user);
  }

  async updateUser(id: string, updates: any): Promise<any> {
    return window.electronAPI.dbUpdateUser(id, updates);
  }

  async deleteUser(id: string): Promise<any> {
    return window.electronAPI.dbDeleteUser(id);
  }

  // 单位
  async getUnits(): Promise<any> {
    return window.electronAPI.dbGetUnits();
  }

  async getAllUnits(): Promise<any> {
    const result = await window.electronAPI.dbGetAllUnits();
    return result.success ? result.data : [];
  }

  async createUnit(unit: any): Promise<any> {
    return window.electronAPI.dbCreateUnit(unit);
  }

  async updateUnit(id: string, updates: any): Promise<any> {
    return window.electronAPI.dbUpdateUnit(id, updates);
  }

  async deleteUnit(id: string): Promise<any> {
    return window.electronAPI.dbDeleteUnit(id);
  }

  // 产品
  async getAllProducts(): Promise<any> {
    const result = await window.electronAPI.dbGetAllItems();
    return result.success ? result.data : [];
  }

  // 库存
  async getAllInventoryStocks(): Promise<any> {
    const result = await window.electronAPI.dbGetAllInventoryStocks();
    return result.success ? result.data : [];
  }

  // 交易记录
  async getInventoryTransactions(): Promise<any> {
    const result = await window.electronAPI.dbGetAllTransactions();
    return result.success ? result.data : [];
  }

  // 客户
  async getAllCustomers(): Promise<any> {
    const result = await window.electronAPI.dbGetAllCustomers();
    return result.success ? result.data : [];
  }

  // 财务相关方法
  async getAccountsReceivable(): Promise<any> {
    const result = await window.electronAPI.dbGetAccountsReceivable();
    return result.success ? result.data : [];
  }

  async getAccountsPayable(): Promise<any> {
    const result = await window.electronAPI.dbGetAccountsPayable();
    return result.success ? result.data : [];
  }

  async getPaymentRecords(): Promise<any> {
    const result = await window.electronAPI.dbGetPaymentRecords();
    return result.success ? result.data : [];
  }

  // 销售订单相关方法
  async createSalesOrder(order: any): Promise<any> {
    // 使用通用的数据库操作方法
    const sql = `
      INSERT INTO sales_orders (
        id, order_no, customer_id, order_date, delivery_date, status,
        total_amount, discount_amount, tax_amount, final_amount,
        payment_status, remark, creator, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      order.id, order.orderNo, order.customerId, order.orderDate.toISOString(),
      order.deliveryDate?.toISOString() || null, order.status,
      order.totalAmount, order.discountAmount, order.taxAmount, order.finalAmount,
      order.paymentStatus, order.remark || '', order.creator, order.isActive ? 1 : 0,
      order.createdAt.toISOString(), order.updatedAt.toISOString()
    ];

    return this.run(sql, params);
  }

  async updateSalesOrder(id: string, updates: any): Promise<any> {
    const setClause = [];
    const params = [];

    if (updates.status !== undefined) {
      setClause.push('status = ?');
      params.push(updates.status);
    }
    if (updates.paymentStatus !== undefined) {
      setClause.push('payment_status = ?');
      params.push(updates.paymentStatus);
    }
    if (updates.totalAmount !== undefined) {
      setClause.push('total_amount = ?');
      params.push(updates.totalAmount);
    }
    if (updates.finalAmount !== undefined) {
      setClause.push('final_amount = ?');
      params.push(updates.finalAmount);
    }
    if (updates.updatedAt !== undefined) {
      setClause.push('updated_at = ?');
      params.push(updates.updatedAt.toISOString());
    }

    if (setClause.length === 0) {
      return { success: true };
    }

    params.push(id);
    const sql = `UPDATE sales_orders SET ${setClause.join(', ')} WHERE id = ?`;

    return this.run(sql, params);
  }

  async insertSalesOrderItem(item: any): Promise<any> {
    const sql = `
      INSERT INTO sales_order_items (
        id, order_id, product_id, quantity, unit_price, discount_rate,
        amount, shipped_quantity, status, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      item.id, item.orderId, item.productId, item.quantity, item.unitPrice,
      item.discountRate || 0, item.amount,
      item.deliveredQuantity || 0, item.status,
      item.createdAt.toISOString(), item.updatedAt.toISOString()
    ];

    return this.run(sql, params);
  }

  async updateSalesOrderItem(id: string, updates: any): Promise<any> {
    const setClause = [];
    const params = [];

    if (updates.deliveredQuantity !== undefined) {
      setClause.push('shipped_quantity = ?');
      params.push(updates.deliveredQuantity);
    }
    if (updates.status !== undefined) {
      setClause.push('status = ?');
      params.push(updates.status);
    }
    if (updates.updatedAt !== undefined) {
      setClause.push('updated_at = ?');
      params.push(updates.updatedAt.toISOString());
    }

    if (setClause.length === 0) {
      return { success: true };
    }

    params.push(id);
    const sql = `UPDATE sales_order_items SET ${setClause.join(', ')} WHERE id = ?`;

    return this.run(sql, params);
  }

  // 销售发货单相关方法
  async createSalesDelivery(delivery: any): Promise<any> {
    const sql = `
      INSERT INTO sales_deliveries (
        id, order_id, delivery_no, customer_id, warehouse_id, status,
        delivery_date, total_quantity, total_amount, delivery_person,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      delivery.id, delivery.orderId, delivery.deliveryNo, delivery.customerId,
      delivery.warehouseId, delivery.status, delivery.deliveryDate.toISOString(),
      delivery.totalQuantity, delivery.totalAmount, delivery.deliveryPerson || delivery.deliverer || '',
      delivery.createdAt.toISOString(), delivery.updatedAt.toISOString()
    ];

    return this.run(sql, params);
  }

  async updateSalesDelivery(id: string, updates: any): Promise<any> {
    const setClause = [];
    const params = [];

    if (updates.status !== undefined) {
      setClause.push('status = ?');
      params.push(updates.status);
    }
    if (updates.totalAmount !== undefined) {
      setClause.push('total_amount = ?');
      params.push(updates.totalAmount);
    }
    if (updates.totalQuantity !== undefined) {
      setClause.push('total_quantity = ?');
      params.push(updates.totalQuantity);
    }
    if (updates.updatedAt !== undefined) {
      setClause.push('updated_at = ?');
      params.push(updates.updatedAt.toISOString());
    }

    if (setClause.length === 0) {
      return { success: true };
    }

    params.push(id);
    const sql = `UPDATE sales_deliveries SET ${setClause.join(', ')} WHERE id = ?`;

    return this.run(sql, params);
  }

  async insertSalesDeliveryItem(item: any): Promise<any> {
    const sql = `
      INSERT INTO sales_delivery_items (
        id, delivery_id, order_item_id, product_id, quantity,
        unit_price, amount, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const params = [
      item.id, item.deliveryId, item.orderItemId, item.productId,
      item.quantity, item.unitPrice, item.amount,
      item.createdAt.toISOString(), item.updatedAt.toISOString()
    ];

    return this.run(sql, params);
  }

  // 用户认证
  async authenticateUser(username: string, password: string): Promise<any> {
    const result = await window.electronAPI.dbAuthenticateUser(username, password);
    return result;
  }
}

export default ElectronDatabase.getInstance();