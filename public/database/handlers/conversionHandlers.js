/**
 * 换算规则处理器
 * 负责全局换算规则和产品换算设置的 CRUD 操作
 */

const { 
  successResult, 
  errorResult, 
  checkDatabaseInitialized,
  transformRow,
  transformRows,
  buildUpdateQuery,
  generateId,
  getCurrentTimestamp,
  validateRequiredFields
} = require('../utils/dbUtils');

const { wrapIpcHandler } = require('../utils/errorHandler');

/**
 * 全局换算规则字段映射表
 */
const CONVERSION_RULE_FIELD_MAP = {
  from_unit_id: 'fromUnitId',
  to_unit_id: 'toUnitId',
  conversion_rate: 'conversionRate',
  is_active: 'isActive',
  created_at: 'createdAt',
  updated_at: 'updatedAt'
};

/**
 * 产品换算设置字段映射表
 */
const PRODUCT_CONVERSION_FIELD_MAP = {
  product_id: 'productId',
  enable_conversion: 'enableConversion',
  conversion_type: 'conversionType',
  global_rule_id: 'globalRuleId',
  custom_from_unit_id: 'customFromUnitId',
  custom_to_unit_id: 'customToUnitId',
  custom_conversion_rate: 'customConversionRate',
  custom_description: 'customDescription',
  is_active: 'isActive',
  created_at: 'createdAt',
  updated_at: 'updatedAt'
};

/**
 * 全局换算规则查询基础SQL
 */
const CONVERSION_RULE_BASE_QUERY = `
  SELECT
    id, name, from_unit_id as fromUnitId, to_unit_id as toUnitId,
    conversion_rate as conversionRate, category, description,
    is_active as isActive,
    created_at as createdAt, updated_at as updatedAt
  FROM global_conversion_rules
`;

/**
 * 产品换算设置查询基础SQL
 */
const PRODUCT_CONVERSION_BASE_QUERY = `
  SELECT
    id, product_id as productId, enable_conversion as enableConversion,
    conversion_type as conversionType, global_rule_id as globalRuleId,
    custom_from_unit_id as customFromUnitId, custom_to_unit_id as customToUnitId,
    custom_conversion_rate as customConversionRate, custom_description as customDescription,
    is_active as isActive,
    created_at as createdAt, updated_at as updatedAt
  FROM product_conversion_settings
`;

/**
 * 设置换算规则相关的IPC处理器
 * @param {Object} ipcMain - IPC主进程对象
 * @param {Object} db - 数据库实例
 */
function setupConversionHandlers(ipcMain, db) {
  
  // ========== 全局换算规则处理器 ==========
  
  // 获取所有全局换算规则
  ipcMain.handle('db-get-all-conversion-rules', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    const query = `${CONVERSION_RULE_BASE_QUERY} ORDER BY category, name ASC`;
    const stmt = db.prepare(query);
    const rows = stmt.all();
    
    const rules = transformRows(rows, CONVERSION_RULE_FIELD_MAP);
    return successResult(rules);
  }, 'get-all-conversion-rules'));

  // 根据ID获取换算规则
  ipcMain.handle('db-get-conversion-rule-by-id', wrapIpcHandler(async (event, { id }) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    const query = `${CONVERSION_RULE_BASE_QUERY} WHERE id = ?`;
    const stmt = db.prepare(query);
    const row = stmt.get(id);
    
    if (!row) {
      throw new Error('Conversion rule not found');
    }
    
    const rule = transformRow(row, CONVERSION_RULE_FIELD_MAP);
    return successResult(rule);
  }, 'get-conversion-rule-by-id'));

  // 创建换算规则
  ipcMain.handle('db-create-conversion-rule', wrapIpcHandler(async (event, ruleData) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields(ruleData, ['name', 'fromUnitId', 'toUnitId', 'conversionRate']);
    
    if (ruleData.conversionRate <= 0) {
      throw new Error('Conversion rate must be greater than 0');
    }
    
    const id = generateId();
    const now = getCurrentTimestamp();
    
    const stmt = db.prepare(`
      INSERT INTO global_conversion_rules
      (id, name, from_unit_id, to_unit_id, conversion_rate, category, description, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id, 
      ruleData.name, 
      ruleData.fromUnitId, 
      ruleData.toUnitId, 
      ruleData.conversionRate, 
      ruleData.category || 'general', 
      ruleData.description || '', 
      ruleData.isActive !== false ? 1 : 0, 
      now, 
      now
    );
    
    // 获取创建的规则
    const getQuery = `${CONVERSION_RULE_BASE_QUERY} WHERE id = ?`;
    const getStmt = db.prepare(getQuery);
    const row = getStmt.get(id);
    
    const createdRule = transformRow(row, CONVERSION_RULE_FIELD_MAP);
    return successResult(createdRule);
  }, 'create-conversion-rule'));

  // 更新换算规则
  ipcMain.handle('db-update-conversion-rule', wrapIpcHandler(async (event, { id, updates }) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('No valid fields to update');
    }
    
    if (updates.conversionRate !== undefined && updates.conversionRate <= 0) {
      throw new Error('Conversion rate must be greater than 0');
    }
    
    const { query, params } = buildUpdateQuery('global_conversion_rules', updates, CONVERSION_RULE_FIELD_MAP);
    params.push(id);
    
    const stmt = db.prepare(query);
    const result = stmt.run(...params);
    
    if (result.changes === 0) {
      throw new Error('Conversion rule not found');
    }
    
    return successResult(true);
  }, 'update-conversion-rule'));

  // 删除换算规则
  ipcMain.handle('db-delete-conversion-rule', wrapIpcHandler(async (event, { id }) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    // 检查是否有产品正在使用此规则
    const usageCheckStmt = db.prepare(`
      SELECT COUNT(*) as count 
      FROM product_conversion_settings 
      WHERE global_rule_id = ? AND is_active = 1
    `);
    const usageCheck = usageCheckStmt.get(id);
    
    if (usageCheck.count > 0) {
      throw new Error('Cannot delete conversion rule that is in use by products');
    }
    
    const stmt = db.prepare('DELETE FROM global_conversion_rules WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      throw new Error('Conversion rule not found');
    }
    
    return successResult(true);
  }, 'delete-conversion-rule'));

  // 搜索换算规则
  ipcMain.handle('db-search-conversion-rules', wrapIpcHandler(async (event, searchTerm) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    if (!searchTerm || typeof searchTerm !== 'string') {
      return successResult([]);
    }
    
    const query = `
      ${CONVERSION_RULE_BASE_QUERY} 
      WHERE name LIKE ? OR description LIKE ? OR category LIKE ?
      ORDER BY category, name ASC
    `;
    
    const searchPattern = `%${searchTerm}%`;
    const stmt = db.prepare(query);
    const rows = stmt.all(searchPattern, searchPattern, searchPattern);
    
    const rules = transformRows(rows, CONVERSION_RULE_FIELD_MAP);
    return successResult(rules);
  }, 'search-conversion-rules'));

  // ========== 产品换算设置处理器 ==========
  
  // 获取所有产品换算设置
  ipcMain.handle('db-get-all-product-conversions', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    const query = `${PRODUCT_CONVERSION_BASE_QUERY} ORDER BY product_id ASC`;
    const stmt = db.prepare(query);
    const rows = stmt.all();
    
    const settings = transformRows(rows, PRODUCT_CONVERSION_FIELD_MAP);
    return successResult(settings);
  }, 'get-all-product-conversions'));

  // 根据ID获取产品换算设置
  ipcMain.handle('db-get-product-conversion-by-id', wrapIpcHandler(async (event, { id }) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    const query = `${PRODUCT_CONVERSION_BASE_QUERY} WHERE id = ?`;
    const stmt = db.prepare(query);
    const row = stmt.get(id);
    
    if (!row) {
      return successResult(null);
    }
    
    const setting = transformRow(row, PRODUCT_CONVERSION_FIELD_MAP);
    return successResult(setting);
  }, 'get-product-conversion-by-id'));

  // 根据产品ID获取换算设置
  ipcMain.handle('db-get-product-conversion-by-product', wrapIpcHandler(async (event, { productId }) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ productId }, ['productId']);
    
    const query = `${PRODUCT_CONVERSION_BASE_QUERY} WHERE product_id = ?`;
    const stmt = db.prepare(query);
    const row = stmt.get(productId);
    
    if (!row) {
      return successResult(null);
    }
    
    const setting = transformRow(row, PRODUCT_CONVERSION_FIELD_MAP);
    return successResult(setting);
  }, 'get-product-conversion-by-product'));

  // 创建产品换算设置
  ipcMain.handle('db-create-product-conversion', wrapIpcHandler(async (event, settingData) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields(settingData, ['productId', 'enableConversion', 'conversionType']);
    
    // 验证换算类型
    if (!['global', 'custom'].includes(settingData.conversionType)) {
      throw new Error('Conversion type must be either "global" or "custom"');
    }
    
    // 如果是全局类型，需要globalRuleId
    if (settingData.conversionType === 'global') {
      validateRequiredFields(settingData, ['globalRuleId']);
    }
    
    // 如果是自定义类型，需要自定义换算信息
    if (settingData.conversionType === 'custom') {
      validateRequiredFields(settingData, ['customFromUnitId', 'customToUnitId', 'customConversionRate']);
      
      if (settingData.customConversionRate <= 0) {
        throw new Error('Custom conversion rate must be greater than 0');
      }
    }
    
    const id = generateId();
    const now = getCurrentTimestamp();
    
    const stmt = db.prepare(`
      INSERT INTO product_conversion_settings
      (id, product_id, enable_conversion, conversion_type, global_rule_id,
       custom_from_unit_id, custom_to_unit_id, custom_conversion_rate, custom_description,
       is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    stmt.run(
      id, 
      settingData.productId, 
      settingData.enableConversion ? 1 : 0, 
      settingData.conversionType, 
      settingData.globalRuleId || null,
      settingData.customFromUnitId || null, 
      settingData.customToUnitId || null, 
      settingData.customConversionRate || null, 
      settingData.customDescription || null,
      settingData.isActive !== false ? 1 : 0, 
      now, 
      now
    );
    
    // 获取创建的设置
    const getQuery = `${PRODUCT_CONVERSION_BASE_QUERY} WHERE id = ?`;
    const getStmt = db.prepare(getQuery);
    const row = getStmt.get(id);
    
    const createdSetting = transformRow(row, PRODUCT_CONVERSION_FIELD_MAP);
    return successResult(createdSetting);
  }, 'create-product-conversion'));

  // 更新产品换算设置
  ipcMain.handle('db-update-product-conversion', wrapIpcHandler(async (event, { id, updates }) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    if (!updates || Object.keys(updates).length === 0) {
      throw new Error('No valid fields to update');
    }
    
    // 验证换算类型
    if (updates.conversionType && !['global', 'custom'].includes(updates.conversionType)) {
      throw new Error('Conversion type must be either "global" or "custom"');
    }
    
    // 验证自定义换算率
    if (updates.customConversionRate !== undefined && updates.customConversionRate <= 0) {
      throw new Error('Custom conversion rate must be greater than 0');
    }
    
    const { query, params } = buildUpdateQuery('product_conversion_settings', updates, PRODUCT_CONVERSION_FIELD_MAP);
    params.push(id);
    
    const stmt = db.prepare(query);
    const result = stmt.run(...params);
    
    if (result.changes === 0) {
      throw new Error('Product conversion setting not found');
    }
    
    return successResult(true);
  }, 'update-product-conversion'));

  // 删除产品换算设置
  ipcMain.handle('db-delete-product-conversion', wrapIpcHandler(async (event, { id }) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    validateRequiredFields({ id }, ['id']);
    
    const stmt = db.prepare('DELETE FROM product_conversion_settings WHERE id = ?');
    const result = stmt.run(id);
    
    if (result.changes === 0) {
      throw new Error('Product conversion setting not found');
    }
    
    return successResult(true);
  }, 'delete-product-conversion'));

  // 获取换算规则统计信息
  ipcMain.handle('db-get-conversion-stats', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }
    
    const globalRulesQuery = `
      SELECT 
        COUNT(*) as totalRules,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as activeRules,
        category,
        COUNT(*) as count
      FROM global_conversion_rules
      GROUP BY category
      ORDER BY category
    `;
    
    const globalRulesStmt = db.prepare(globalRulesQuery);
    const globalRulesStats = globalRulesStmt.all();
    
    const productConversionsQuery = `
      SELECT 
        COUNT(*) as totalSettings,
        COUNT(CASE WHEN enable_conversion = 1 THEN 1 END) as enabledSettings,
        COUNT(CASE WHEN conversion_type = 'global' THEN 1 END) as globalTypeSettings,
        COUNT(CASE WHEN conversion_type = 'custom' THEN 1 END) as customTypeSettings
      FROM product_conversion_settings
    `;
    
    const productConversionsStmt = db.prepare(productConversionsQuery);
    const productConversionsStats = productConversionsStmt.get();
    
    const totalGlobalRulesQuery = `
      SELECT 
        COUNT(*) as totalRules,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) as activeRules
      FROM global_conversion_rules
    `;
    
    const totalGlobalRulesStmt = db.prepare(totalGlobalRulesQuery);
    const totalGlobalRulesStats = totalGlobalRulesStmt.get();
    
    return successResult({
      globalRules: {
        total: totalGlobalRulesStats.totalRules || 0,
        active: totalGlobalRulesStats.activeRules || 0,
        byCategory: globalRulesStats || []
      },
      productConversions: {
        total: productConversionsStats.totalSettings || 0,
        enabled: productConversionsStats.enabledSettings || 0,
        globalType: productConversionsStats.globalTypeSettings || 0,
        customType: productConversionsStats.customTypeSettings || 0
      }
    });
  }, 'get-conversion-stats'));

  console.log('Conversion handlers registered successfully');
}

module.exports = {
  setupConversionHandlers
};