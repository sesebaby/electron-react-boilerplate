/**
 * 数据库工具函数
 * 提供通用的数据库操作和数据转换功能
 */

/**
 * 标准化数据库结果返回格式
 * @param {boolean} success - 操作是否成功
 * @param {any} data - 返回的数据
 * @param {string} error - 错误信息
 * @returns {Object} 标准化的结果对象
 */
function createResult(success, data = null, error = null) {
  return {
    success,
    data,
    error
  };
}

/**
 * 创建成功结果
 * @param {any} data - 返回的数据
 * @returns {Object} 成功结果
 */
function successResult(data) {
  return createResult(true, data);
}

/**
 * 创建错误结果
 * @param {string} error - 错误信息
 * @returns {Object} 错误结果
 */
function errorResult(error) {
  return createResult(false, null, error);
}

/**
 * 检查数据库是否已初始化
 * @param {Database} db - 数据库实例
 * @returns {boolean} 是否已初始化
 */
function checkDatabaseInitialized(db) {
  return db !== null && db !== undefined;
}

/**
 * 将数据库行转换为前端格式
 * @param {Object} row - 数据库行数据
 * @param {Object} fieldMap - 字段映射表
 * @returns {Object} 转换后的数据
 */
function transformRow(row, fieldMap = {}) {
  if (!row) return null;
  
  const transformed = { ...row };
  
  // 应用字段映射
  Object.entries(fieldMap).forEach(([fromField, toField]) => {
    if (row[fromField] !== undefined) {
      transformed[toField] = row[fromField];
      if (fromField !== toField) {
        delete transformed[fromField];
      }
    }
  });
  
  // 转换布尔值
  Object.keys(transformed).forEach(key => {
    if (typeof transformed[key] === 'number' && (key.includes('is_') || key.includes('Is'))) {
      transformed[key] = Boolean(transformed[key]);
    }
  });
  
  // 转换日期
  ['createdAt', 'updatedAt', 'created_at', 'updated_at', 'lastUpdated', 'last_updated'].forEach(field => {
    if (transformed[field]) {
      transformed[field] = new Date(transformed[field]);
    }
  });
  
  return transformed;
}

/**
 * 批量转换数据库行
 * @param {Array} rows - 数据库行数组
 * @param {Object} fieldMap - 字段映射表
 * @returns {Array} 转换后的数据数组
 */
function transformRows(rows, fieldMap = {}) {
  return rows.map(row => transformRow(row, fieldMap));
}

/**
 * 构建动态更新查询
 * @param {string} tableName - 表名
 * @param {Object} updates - 更新数据
 * @param {Object} fieldMap - 字段映射表
 * @param {string} whereClause - WHERE条件
 * @returns {Object} 查询对象 {query, params}
 */
function buildUpdateQuery(tableName, updates, fieldMap = {}, whereClause = 'WHERE id = ?') {
  const updateFields = [];
  const params = [];
  
  // 反向字段映射，从前端字段名映射到数据库字段名
  const reverseFieldMap = {};
  Object.entries(fieldMap).forEach(([dbField, frontendField]) => {
    reverseFieldMap[frontendField] = dbField;
  });
  
  Object.entries(updates).forEach(([key, value]) => {
    if (value !== undefined) {
      const dbField = reverseFieldMap[key] || key;
      updateFields.push(`${dbField} = ?`);
      
      // 特殊处理布尔值
      if (typeof value === 'boolean') {
        params.push(value ? 1 : 0);
      } else {
        params.push(value);
      }
    }
  });
  
  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }
  
  // 添加更新时间
  updateFields.push('updated_at = ?');
  params.push(new Date().toISOString());
  
  const query = `UPDATE ${tableName} SET ${updateFields.join(', ')} ${whereClause}`;
  
  return { query, params };
}

/**
 * 生成UUID
 * @returns {string} UUID字符串
 */
function generateId() {
  const { v4: uuidv4 } = require('uuid');
  return uuidv4();
}

/**
 * 获取当前时间戳
 * @returns {string} ISO时间戳
 */
function getCurrentTimestamp() {
  return new Date().toISOString();
}

/**
 * 验证必需字段
 * @param {Object} data - 数据对象
 * @param {Array} requiredFields - 必需字段数组
 * @throws {Error} 缺少必需字段时抛出错误
 */
function validateRequiredFields(data, requiredFields) {
  const missingFields = requiredFields.filter(field => 
    data[field] === undefined || data[field] === null || data[field] === ''
  );
  
  if (missingFields.length > 0) {
    throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
  }
}

/**
 * 安全地执行数据库查询
 * @param {Function} queryFn - 查询函数
 * @param {string} operation - 操作描述
 * @returns {Object} 执行结果
 */
async function safeExecute(queryFn, operation = 'Database operation') {
  try {
    const result = await queryFn();
    return result;
  } catch (error) {
    console.error(`${operation} failed:`, error);
    throw error;
  }
}

module.exports = {
  createResult,
  successResult,
  errorResult,
  checkDatabaseInitialized,
  transformRow,
  transformRows,
  buildUpdateQuery,
  generateId,
  getCurrentTimestamp,
  validateRequiredFields,
  safeExecute
};