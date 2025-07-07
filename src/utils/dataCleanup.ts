// 数据清理工具
// 用于清除所有业务数据，保留基础配置数据

const DatabaseManager = require('../services/database/connection').default;

interface CleanupResult {
  success: boolean;
  message: string;
  clearedTables: string[];
  preservedTables: string[];
  errors: string[];
}

class DataCleanupManager {
  private db = DatabaseManager.getConnection();

  /**
   * 需要清理的业务数据表（按依赖关系排序，先删除子表）
   */
  private readonly BUSINESS_TABLES = [
    // 财务相关明细表
    'receipts',                    // 收款记录
    'payments',                    // 付款记录
    
    // 采购相关明细表
    'purchase_receipt_items',      // 采购收货明细
    'purchase_order_items',        // 采购订单明细
    
    // 销售相关明细表（注意：销售出库表可能不存在）
    'sales_delivery_items',        // 销售出库明细（如果存在）
    'sales_order_items',           // 销售订单明细
    
    // 库存相关表
    'inventory_transactions',      // 库存流水表
    'inventory_stocks',            // 库存主表
    
    // 主表
    'sales_deliveries',            // 销售出库表（如果存在）
    'sales_orders',                // 销售订单表
    'purchase_receipts',           // 采购收货表
    'purchase_orders',             // 采购订单表
    'accounts_receivable',         // 应收账款表
    'accounts_payable',            // 应付账款表
    
    // 日志表
    'operation_logs'               // 操作日志表
  ];

  /**
   * 需要保留的配置数据表
   */
  private readonly CONFIG_TABLES = [
    'users',                       // 用户表
    'system_configs',              // 系统配置表
    'units',                       // 计量单位表
    'categories',                  // 商品分类表
    'warehouses',                  // 仓库表
    'products',                    // 商品表
    'suppliers',                   // 供应商表
    'customers',                   // 客户表
    'migrations'                   // 迁移记录表
  ];

  /**
   * 检查表是否存在
   */
  private async tableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.db.get(`
        SELECT name FROM sqlite_master 
        WHERE type='table' AND name=?
      `, [tableName]);
      return !!result;
    } catch (error) {
      console.warn(`检查表 ${tableName} 是否存在时出错:`, error);
      return false;
    }
  }

  /**
   * 获取表中的记录数
   */
  private async getTableRowCount(tableName: string): Promise<number> {
    try {
      const result = await this.db.get(`SELECT COUNT(*) as count FROM ${tableName}`);
      return result?.count || 0;
    } catch (error) {
      console.warn(`获取表 ${tableName} 记录数时出错:`, error);
      return 0;
    }
  }

  /**
   * 清理单个表
   */
  private async clearTable(tableName: string): Promise<{ success: boolean; error?: string }> {
    try {
      const exists = await this.tableExists(tableName);
      if (!exists) {
        console.log(`表 ${tableName} 不存在，跳过清理`);
        return { success: true };
      }

      const beforeCount = await this.getTableRowCount(tableName);
      console.log(`清理表 ${tableName}，清理前记录数: ${beforeCount}`);

      if (beforeCount === 0) {
        console.log(`表 ${tableName} 已经为空，跳过清理`);
        return { success: true };
      }

      // 删除表中所有数据
      await this.db.run(`DELETE FROM ${tableName}`);
      
      // 重置自增ID（如果有的话）
      await this.db.run(`DELETE FROM sqlite_sequence WHERE name = ?`, [tableName]);

      const afterCount = await this.getTableRowCount(tableName);
      console.log(`表 ${tableName} 清理完成，清理后记录数: ${afterCount}`);

      return { success: true };
    } catch (error) {
      const errorMsg = `清理表 ${tableName} 失败: ${error instanceof Error ? error.message : '未知错误'}`;
      console.error(errorMsg);
      return { success: false, error: errorMsg };
    }
  }

  /**
   * 执行完整的数据清理
   */
  async cleanupAllBusinessData(): Promise<CleanupResult> {
    const result: CleanupResult = {
      success: true,
      message: '',
      clearedTables: [],
      preservedTables: [],
      errors: []
    };

    console.log('🧹 开始清理业务数据...');
    console.log(`计划清理 ${this.BUSINESS_TABLES.length} 个业务数据表`);
    console.log(`保留 ${this.CONFIG_TABLES.length} 个配置数据表`);

    try {
      // 开始事务
      await this.db.run('BEGIN TRANSACTION');

      // 临时禁用外键约束
      await this.db.run('PRAGMA foreign_keys = OFF');

      // 清理业务数据表
      for (const tableName of this.BUSINESS_TABLES) {
        const clearResult = await this.clearTable(tableName);
        
        if (clearResult.success) {
          result.clearedTables.push(tableName);
        } else {
          result.errors.push(clearResult.error || `清理表 ${tableName} 失败`);
          result.success = false;
        }
      }

      // 重新启用外键约束
      await this.db.run('PRAGMA foreign_keys = ON');

      if (result.success) {
        // 提交事务
        await this.db.run('COMMIT');
        result.message = `成功清理 ${result.clearedTables.length} 个业务数据表`;
        console.log('✅ 数据清理完成');
      } else {
        // 回滚事务
        await this.db.run('ROLLBACK');
        result.message = `数据清理失败，已回滚。错误数: ${result.errors.length}`;
        console.error('❌ 数据清理失败，已回滚');
      }

      // 记录保留的表
      for (const tableName of this.CONFIG_TABLES) {
        const exists = await this.tableExists(tableName);
        if (exists) {
          result.preservedTables.push(tableName);
        }
      }

    } catch (error) {
      // 确保回滚事务
      try {
        await this.db.run('ROLLBACK');
      } catch (rollbackError) {
        console.error('回滚事务失败:', rollbackError);
      }

      const errorMsg = `数据清理过程中发生严重错误: ${error instanceof Error ? error.message : '未知错误'}`;
      result.success = false;
      result.message = errorMsg;
      result.errors.push(errorMsg);
      console.error('💥 数据清理过程中发生严重错误:', error);
    }

    return result;
  }

  /**
   * 验证清理结果
   */
  async validateCleanupResult(): Promise<{
    businessTablesEmpty: boolean;
    configTablesPreserved: boolean;
    details: { tableName: string; rowCount: number; expected: 'empty' | 'preserved' }[];
  }> {
    const details: { tableName: string; rowCount: number; expected: 'empty' | 'preserved' }[] = [];
    let businessTablesEmpty = true;
    let configTablesPreserved = true;

    console.log('🔍 验证清理结果...');

    // 检查业务数据表是否为空
    for (const tableName of this.BUSINESS_TABLES) {
      const exists = await this.tableExists(tableName);
      if (exists) {
        const rowCount = await this.getTableRowCount(tableName);
        details.push({ tableName, rowCount, expected: 'empty' });
        
        if (rowCount > 0) {
          businessTablesEmpty = false;
          console.warn(`⚠️  业务数据表 ${tableName} 仍有 ${rowCount} 条记录`);
        } else {
          console.log(`✅ 业务数据表 ${tableName} 已清空`);
        }
      }
    }

    // 检查配置数据表是否保留
    for (const tableName of this.CONFIG_TABLES) {
      const exists = await this.tableExists(tableName);
      if (exists) {
        const rowCount = await this.getTableRowCount(tableName);
        details.push({ tableName, rowCount, expected: 'preserved' });
        console.log(`📋 配置数据表 ${tableName} 保留 ${rowCount} 条记录`);
      } else {
        configTablesPreserved = false;
        console.warn(`⚠️  配置数据表 ${tableName} 不存在`);
      }
    }

    return {
      businessTablesEmpty,
      configTablesPreserved,
      details
    };
  }

  /**
   * 生成清理报告
   */
  generateCleanupReport(result: CleanupResult, validation: any): string {
    const report = [
      '📊 数据清理报告',
      '=' .repeat(50),
      '',
      `清理状态: ${result.success ? '✅ 成功' : '❌ 失败'}`,
      `清理消息: ${result.message}`,
      '',
      `已清理的业务数据表 (${result.clearedTables.length}):`,
      ...result.clearedTables.map(table => `  - ${table}`),
      '',
      `保留的配置数据表 (${result.preservedTables.length}):`,
      ...result.preservedTables.map(table => `  - ${table}`),
      ''
    ];

    if (result.errors.length > 0) {
      report.push(`错误信息 (${result.errors.length}):`);
      report.push(...result.errors.map(error => `  - ${error}`));
      report.push('');
    }

    report.push('验证结果:');
    report.push(`  业务数据表已清空: ${validation.businessTablesEmpty ? '✅' : '❌'}`);
    report.push(`  配置数据表已保留: ${validation.configTablesPreserved ? '✅' : '❌'}`);
    report.push('');

    report.push('详细统计:');
    validation.details.forEach((detail: any) => {
      const status = detail.expected === 'empty' 
        ? (detail.rowCount === 0 ? '✅' : '❌')
        : (detail.rowCount > 0 ? '✅' : '⚠️');
      report.push(`  ${status} ${detail.tableName}: ${detail.rowCount} 条记录 (期望: ${detail.expected})`);
    });

    return report.join('\n');
  }
}

// 导出单例实例
const dataCleanupManager = new DataCleanupManager();

module.exports = { DataCleanupManager, dataCleanupManager };
