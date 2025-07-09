/**
 * 事务处理器
 * 负责库存交易记录的 CRUD 操作和相关业务逻辑
 */

const { 
  successResult, 
  errorResult, 
  checkDatabaseInitialized,
  transformRow,
  transformRows,
  generateId,
  getCurrentTimestamp,
  validateRequiredFields
} = require('../utils/dbUtils');

const { wrapIpcHandler } = require('../utils/errorHandler');

/**
 * 库存交易字段映射表
 */
const TRANSACTION_FIELD_MAP = {
  item_id: 'itemId',
  transaction_type: 'transactionType',
  unit_price: 'unitPrice',
  total_amount: 'totalAmount',
  reference_number: 'referenceNumber',
  created_at: 'createdAt',
  created_by: 'createdBy'
};

/**
 * 库存交易查询基础SQL
 */
const TRANSACTION_BASE_QUERY = `
  SELECT 
    id, item_id as itemId, transaction_type as transactionType, 
    quantity, unit_price as unitPrice, total_amount as totalAmount,
    reason, reference_number as referenceNumber, notes,
    created_at as createdAt, created_by as createdBy
  FROM inventory_transactions
`;

/**
 * 有效的交易类型
 */
const VALID_TRANSACTION_TYPES = ['in', 'out', 'adjustment'];

/**
 * 设置库存交易相关的IPC处理器
 * @param {Object} ipcMain - IPC主进程对象
 * @param {Object} db - 数据库实例
 */
function setupTransactionHandlers(ipcMain, db) {
  
  // 获取所有库存交易记录
  ipcMain.handle('db-get-all-transactions', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    const query = `${TRANSACTION_BASE_QUERY} ORDER BY created_at DESC`;
    const stmt = db.prepare(query);
    const rows = stmt.all();
    
    const transactions = transformRows(rows, TRANSACTION_FIELD_MAP);
    return successResult(transactions);
  }, 'get-all-transactions'));

  // 根据ID获取交易记录
  ipcMain.handle('db-get-transaction-by-id', wrapIpcHandler(async (event, id) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    const query = `${TRANSACTION_BASE_QUERY} WHERE id = ?`;
    const stmt = db.prepare(query);
    const row = stmt.get(id);
    
    if (!row) {
      return successResult(null);
    }
    
    const transaction = transformRow(row, TRANSACTION_FIELD_MAP);
    return successResult(transaction);
  }, 'get-transaction-by-id'));

  // 根据物品ID获取交易记录
  ipcMain.handle('db-get-transactions-by-item', wrapIpcHandler(async (event, itemId) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ itemId }, ['itemId']);
    
    const query = `${TRANSACTION_BASE_QUERY} WHERE item_id = ? ORDER BY created_at DESC`;
    const stmt = db.prepare(query);
    const rows = stmt.all(itemId);
    
    const transactions = transformRows(rows, TRANSACTION_FIELD_MAP);
    return successResult(transactions);
  }, 'get-transactions-by-item'));

  // 添加库存交易记录
  ipcMain.handle('db-add-transaction', wrapIpcHandler(async (event, transaction) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields(transaction, ['itemId', 'transactionType', 'quantity']);
    
    // 验证交易类型
    const transactionType = transaction.transactionType || transaction.transaction_type;
    if (!VALID_TRANSACTION_TYPES.includes(transactionType)) {
      throw new Error(`Invalid transaction type. Must be one of: ${VALID_TRANSACTION_TYPES.join(', ')}`);
    }
    
    // 验证数量
    if (typeof transaction.quantity !== 'number' || transaction.quantity === 0) {
      throw new Error('Quantity must be a non-zero number');
    }
    
    const id = transaction.id || generateId();
    const now = getCurrentTimestamp();
    
    const query = `
      INSERT INTO inventory_transactions (
        id, item_id, transaction_type, quantity, unit_price, total_amount,
        reason, reference_number, notes, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const stmt = db.prepare(query);
    
    // 计算总金额
    const unitPrice = transaction.unitPrice || transaction.unit_price || 0;
    const totalAmount = transaction.totalAmount || transaction.total_amount || (Math.abs(transaction.quantity) * unitPrice);
    
    stmt.run(
      id,
      transaction.itemId || transaction.item_id,
      transactionType,
      transaction.quantity,
      unitPrice,
      totalAmount,
      transaction.reason || transaction.remark || '',
      transaction.referenceNumber || transaction.reference_no || transaction.transactionNo || '',
      transaction.notes || '',
      transaction.createdAt || transaction.created_at || now,
      transaction.createdBy || transaction.created_by || transaction.operator || 'system'
    );
    
    // 更新库存数量
    const updateStockResult = await updateInventoryStock(db, transaction.itemId || transaction.item_id, transactionType, transaction.quantity);
    
    // 获取创建的交易记录
    const getQuery = `${TRANSACTION_BASE_QUERY} WHERE id = ?`;
    const getStmt = db.prepare(getQuery);
    const row = getStmt.get(id);
    
    const createdTransaction = transformRow(row, TRANSACTION_FIELD_MAP);
    
    return successResult({
      transaction: createdTransaction,
      stockUpdated: updateStockResult.success,
      newStockLevel: updateStockResult.newStockLevel
    });
  }, 'add-transaction'));

  // 批量添加交易记录
  ipcMain.handle('db-batch-add-transactions', wrapIpcHandler(async (event, transactions) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    if (!Array.isArray(transactions) || transactions.length === 0) {
      throw new Error('Invalid transactions array');
    }
    
    const insertStmt = db.prepare(`
      INSERT INTO inventory_transactions (
        id, item_id, transaction_type, quantity, unit_price, total_amount,
        reason, reference_number, notes, created_at, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const updateStockStmt = db.prepare(`
      UPDATE inventory_items 
      SET stock_quantity = stock_quantity + ?, 
          total_value = (stock_quantity + ?) * unit_price,
          last_updated = ?
      WHERE id = ?
    `);
    
    const now = getCurrentTimestamp();
    let processedCount = 0;
    let errorCount = 0;
    const results = [];
    
    const transaction = db.transaction(() => {
      for (const txn of transactions) {
        try {
          validateRequiredFields(txn, ['itemId', 'transactionType', 'quantity']);
          
          const transactionType = txn.transactionType || txn.transaction_type;
          if (!VALID_TRANSACTION_TYPES.includes(transactionType)) {
            throw new Error(`Invalid transaction type: ${transactionType}`);
          }
          
          const id = txn.id || generateId();
          const unitPrice = txn.unitPrice || txn.unit_price || 0;
          const totalAmount = txn.totalAmount || txn.total_amount || (Math.abs(txn.quantity) * unitPrice);
          
          // 插入交易记录
          insertStmt.run(
            id,
            txn.itemId || txn.item_id,
            transactionType,
            txn.quantity,
            unitPrice,
            totalAmount,
            txn.reason || txn.remark || '',
            txn.referenceNumber || txn.reference_no || txn.transactionNo || '',
            txn.notes || '',
            txn.createdAt || txn.created_at || now,
            txn.createdBy || txn.created_by || txn.operator || 'system'
          );
          
          // 更新库存
          const stockChange = calculateStockChange(transactionType, txn.quantity);
          updateStockStmt.run(stockChange, stockChange, now, txn.itemId || txn.item_id);
          
          processedCount++;
          results.push({
            id,
            success: true,
            originalIndex: results.length
          });
        } catch (error) {
          errorCount++;
          results.push({
            success: false,
            error: error.message,
            originalIndex: results.length
          });
        }
      }
    });
    
    transaction();
    
    return successResult({
      processedCount,
      errorCount,
      totalCount: transactions.length,
      results
    });
  }, 'batch-add-transactions'));

  // 删除交易记录
  ipcMain.handle('db-delete-transaction', wrapIpcHandler(async (event, id) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    // 获取要删除的交易记录
    const getStmt = db.prepare(`${TRANSACTION_BASE_QUERY} WHERE id = ?`);
    const transaction = getStmt.get(id);
    
    if (!transaction) {
      throw new Error('Transaction not found');
    }
    
    // 删除交易记录
    const deleteStmt = db.prepare('DELETE FROM inventory_transactions WHERE id = ?');
    const result = deleteStmt.run(id);
    
    // 回滚库存变化
    if (result.changes > 0) {
      const reverseStockChange = -calculateStockChange(transaction.transactionType, transaction.quantity);
      await updateInventoryStock(db, transaction.itemId, 'adjustment', reverseStockChange);
    }
    
    return successResult(result.changes > 0);
  }, 'delete-transaction'));

  // 获取交易统计信息
  ipcMain.handle('db-get-transaction-stats', wrapIpcHandler(async (event, { startDate, endDate, itemId, transactionType } = {}) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    let whereClause = 'WHERE 1=1';
    const params = [];
    
    if (startDate) {
      whereClause += ' AND created_at >= ?';
      params.push(startDate);
    }
    
    if (endDate) {
      whereClause += ' AND created_at <= ?';
      params.push(endDate);
    }
    
    if (itemId) {
      whereClause += ' AND item_id = ?';
      params.push(itemId);
    }
    
    if (transactionType) {
      whereClause += ' AND transaction_type = ?';
      params.push(transactionType);
    }
    
    const statsQuery = `
      SELECT 
        COUNT(*) as totalTransactions,
        SUM(CASE WHEN transaction_type = 'in' THEN quantity ELSE 0 END) as totalIn,
        SUM(CASE WHEN transaction_type = 'out' THEN quantity ELSE 0 END) as totalOut,
        SUM(CASE WHEN transaction_type = 'adjustment' THEN quantity ELSE 0 END) as totalAdjustment,
        SUM(CASE WHEN transaction_type = 'in' THEN total_amount ELSE 0 END) as totalInValue,
        SUM(CASE WHEN transaction_type = 'out' THEN total_amount ELSE 0 END) as totalOutValue,
        AVG(unit_price) as averageUnitPrice,
        transaction_type,
        COUNT(*) as count
      FROM inventory_transactions
      ${whereClause}
      GROUP BY transaction_type
    `;
    
    const typeStatsStmt = db.prepare(statsQuery);
    const typeStats = typeStatsStmt.all(...params);
    
    const totalStatsQuery = `
      SELECT 
        COUNT(*) as totalTransactions,
        SUM(CASE WHEN transaction_type = 'in' THEN quantity ELSE 0 END) as totalIn,
        SUM(CASE WHEN transaction_type = 'out' THEN quantity ELSE 0 END) as totalOut,
        SUM(CASE WHEN transaction_type = 'adjustment' THEN quantity ELSE 0 END) as totalAdjustment,
        SUM(CASE WHEN transaction_type = 'in' THEN total_amount ELSE 0 END) as totalInValue,
        SUM(CASE WHEN transaction_type = 'out' THEN total_amount ELSE 0 END) as totalOutValue,
        AVG(unit_price) as averageUnitPrice
      FROM inventory_transactions
      ${whereClause}
    `;
    
    const totalStatsStmt = db.prepare(totalStatsQuery);
    const totalStats = totalStatsStmt.get(...params);
    
    return successResult({
      total: {
        totalTransactions: totalStats.totalTransactions || 0,
        totalIn: totalStats.totalIn || 0,
        totalOut: totalStats.totalOut || 0,
        totalAdjustment: totalStats.totalAdjustment || 0,
        totalInValue: totalStats.totalInValue || 0,
        totalOutValue: totalStats.totalOutValue || 0,
        averageUnitPrice: totalStats.averageUnitPrice || 0,
        netQuantity: (totalStats.totalIn || 0) - (totalStats.totalOut || 0) + (totalStats.totalAdjustment || 0)
      },
      byType: typeStats.map(stat => ({
        transactionType: stat.transaction_type,
        count: stat.count,
        totalQuantity: stat.transaction_type === 'in' ? stat.totalIn : 
                       stat.transaction_type === 'out' ? stat.totalOut : stat.totalAdjustment,
        totalValue: stat.transaction_type === 'in' ? stat.totalInValue : stat.totalOutValue
      }))
    });
  }, 'get-transaction-stats'));

  // 搜索交易记录
  ipcMain.handle('db-search-transactions', wrapIpcHandler(async (event, searchTerm) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    if (!searchTerm || typeof searchTerm !== 'string') {
      return successResult([]);
    }
    
    const query = `
      ${TRANSACTION_BASE_QUERY}
      WHERE reason LIKE ? OR reference_number LIKE ? OR notes LIKE ?
      ORDER BY created_at DESC
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const stmt = db.prepare(query);
    const rows = stmt.all(searchPattern, searchPattern, searchPattern);
    
    const transactions = transformRows(rows, TRANSACTION_FIELD_MAP);
    return successResult(transactions);
  }, 'search-transactions'));

  console.log('Transaction handlers registered successfully');
}

/**
 * 计算库存变化量
 * @param {string} transactionType - 交易类型
 * @param {number} quantity - 数量
 * @returns {number} 库存变化量
 */
function calculateStockChange(transactionType, quantity) {
  switch (transactionType) {
    case 'in':
      return Math.abs(quantity);
    case 'out':
      return -Math.abs(quantity);
    case 'adjustment':
      return quantity;
    default:
      return 0;
  }
}

/**
 * 更新库存数量
 * @param {Object} db - 数据库实例
 * @param {string} itemId - 物品ID
 * @param {string} transactionType - 交易类型
 * @param {number} quantity - 数量
 * @returns {Object} 更新结果
 */
async function updateInventoryStock(db, itemId, transactionType, quantity) {
  try {
    const stockChange = calculateStockChange(transactionType, quantity);
    
    // 获取当前库存信息
    const getCurrentStockStmt = db.prepare(`
      SELECT stock_quantity, unit_price FROM inventory_items WHERE id = ?
    `);
    const currentStock = getCurrentStockStmt.get(itemId);
    
    if (!currentStock) {
      throw new Error('Item not found');
    }
    
    const newStockLevel = currentStock.stock_quantity + stockChange;
    
    // 检查库存不能为负数（除非是调整类型）
    if (newStockLevel < 0 && transactionType !== 'adjustment') {
      throw new Error('Insufficient stock');
    }
    
    // 更新库存
    const updateStmt = db.prepare(`
      UPDATE inventory_items 
      SET stock_quantity = ?, 
          total_value = ? * unit_price,
          last_updated = ?
      WHERE id = ?
    `);
    
    const now = getCurrentTimestamp();
    updateStmt.run(newStockLevel, newStockLevel, now, itemId);
    
    return {
      success: true,
      newStockLevel,
      stockChange
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  setupTransactionHandlers,
  VALID_TRANSACTION_TYPES
};