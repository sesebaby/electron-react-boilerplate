import { Page } from '@playwright/test';
import { DatabaseHelpers } from './database-helpers';

/**
 * 测试数据清理策略
 * 提供多种数据清理方式和策略
 */
export class TestDataCleanup {
  
  /**
   * 清理策略枚举
   */
  static readonly CleanupStrategy = {
    SOFT: 'soft',           // 软删除，标记为删除但保留数据
    HARD: 'hard',           // 硬删除，物理删除数据
    ARCHIVE: 'archive',     // 归档，移动到归档表
    SELECTIVE: 'selective'  // 选择性删除，只删除特定类型的数据
  } as const;

  /**
   * 执行数据清理
   */
  static async cleanup(
    page: Page, 
    strategy: string = TestDataCleanup.CleanupStrategy.SOFT,
    options: {
      preserveUsers?: boolean;
      preserveSettings?: boolean;
      preserveSystemData?: boolean;
      testIdPattern?: string;
      olderThan?: Date;
      tables?: string[];
    } = {}
  ): Promise<void> {
    console.log(`🧹 开始执行数据清理，策略: ${strategy}`);
    
    switch (strategy) {
      case TestDataCleanup.CleanupStrategy.SOFT:
        await this.softCleanup(page, options);
        break;
      case TestDataCleanup.CleanupStrategy.HARD:
        await this.hardCleanup(page, options);
        break;
      case TestDataCleanup.CleanupStrategy.ARCHIVE:
        await this.archiveCleanup(page, options);
        break;
      case TestDataCleanup.CleanupStrategy.SELECTIVE:
        await this.selectiveCleanup(page, options);
        break;
      default:
        throw new Error(`未知的清理策略: ${strategy}`);
    }
    
    console.log('✅ 数据清理完成');
  }

  /**
   * 软删除策略
   */
  private static async softCleanup(page: Page, options: any): Promise<void> {
    const tables = options.tables || this.getCleanupTables(options);
    
    for (const table of tables) {
      try {
        // 添加删除标记列（如果不存在）
        await DatabaseHelpers.executeRawQuery(
          page,
          `ALTER TABLE ${table} ADD COLUMN deleted_at DATETIME DEFAULT NULL`
        );
      } catch {
        // 列可能已存在
      }
      
      // 标记为删除
      let whereClause = 'deleted_at IS NULL';
      const params: any[] = [];
      
      if (options.testIdPattern) {
        whereClause += ' AND (testId LIKE ? OR testId IS NULL)';
        params.push(options.testIdPattern);
      }
      
      if (options.olderThan) {
        whereClause += ' AND created_at < ?';
        params.push(options.olderThan.toISOString());
      }
      
      await DatabaseHelpers.executeRawQuery(
        page,
        `UPDATE ${table} SET deleted_at = datetime('now') WHERE ${whereClause}`,
        params
      );
    }
  }

  /**
   * 硬删除策略
   */
  private static async hardCleanup(page: Page, options: any): Promise<void> {
    const tables = options.tables || this.getCleanupTables(options);
    
    for (const table of tables) {
      let whereClause = '1=1';
      const params: any[] = [];
      
      if (options.testIdPattern) {
        whereClause += ' AND (testId LIKE ? OR testId IS NULL)';
        params.push(options.testIdPattern);
      }
      
      if (options.olderThan) {
        whereClause += ' AND created_at < ?';
        params.push(options.olderThan.toISOString());
      }
      
      // 排除系统数据
      if (options.preserveSystemData) {
        whereClause += ' AND (is_system IS NULL OR is_system = 0)';
      }
      
      await DatabaseHelpers.executeRawQuery(
        page,
        `DELETE FROM ${table} WHERE ${whereClause}`,
        params
      );
    }
  }

  /**
   * 归档策略
   */
  private static async archiveCleanup(page: Page, options: any): Promise<void> {
    const tables = options.tables || this.getCleanupTables(options);
    
    for (const table of tables) {
      const archiveTable = `${table}_archive`;
      
      // 创建归档表（如果不存在）
      await this.createArchiveTable(page, table, archiveTable);
      
      // 移动数据到归档表
      let whereClause = '1=1';
      const params: any[] = [];
      
      if (options.testIdPattern) {
        whereClause += ' AND (testId LIKE ? OR testId IS NULL)';
        params.push(options.testIdPattern);
      }
      
      if (options.olderThan) {
        whereClause += ' AND created_at < ?';
        params.push(options.olderThan.toISOString());
      }
      
      // 插入到归档表
      await DatabaseHelpers.executeRawQuery(
        page,
        `INSERT INTO ${archiveTable} SELECT *, datetime('now') as archived_at FROM ${table} WHERE ${whereClause}`,
        params
      );
      
      // 从原表删除
      await DatabaseHelpers.executeRawQuery(
        page,
        `DELETE FROM ${table} WHERE ${whereClause}`,
        params
      );
    }
  }

  /**
   * 选择性清理策略
   */
  private static async selectiveCleanup(page: Page, options: any): Promise<void> {
    // 只清理测试数据，保留所有系统数据
    const testTables = ['products', 'categories', 'suppliers', 'customers', 'warehouses'];
    
    for (const table of testTables) {
      // 只删除明确标记为测试数据的记录
      await DatabaseHelpers.executeRawQuery(
        page,
        `DELETE FROM ${table} WHERE testId IS NOT NULL AND testId != ''`
      );
    }
    
    // 清理临时文件和缓存
    await this.cleanupTemporaryFiles(page);
  }

  /**
   * 获取需要清理的表列表
   */
  private static getCleanupTables(options: any): string[] {
    const allTables = [
      'products', 'categories', 'suppliers', 'customers', 'warehouses',
      'purchase_orders', 'sales_orders', 'inventory_transactions',
      'accounts_payable', 'accounts_receivable', 'payments'
    ];
    
    let tables = allTables;
    
    if (options.preserveUsers) {
      tables = tables.filter(t => !['users', 'user_sessions'].includes(t));
    }
    
    if (options.preserveSettings) {
      tables = tables.filter(t => !['system_settings', 'user_preferences'].includes(t));
    }
    
    return tables;
  }

  /**
   * 创建归档表
   */
  private static async createArchiveTable(page: Page, sourceTable: string, archiveTable: string): Promise<void> {
    try {
      // 获取源表结构
      const tableInfo = await DatabaseHelpers.executeRawQuery(
        page,
        `PRAGMA table_info(${sourceTable})`
      );
      
      // 构建创建归档表的SQL
      const columns = tableInfo.map((col: any) => 
        `${col.name} ${col.type}${col.notnull ? ' NOT NULL' : ''}${col.dflt_value ? ` DEFAULT ${col.dflt_value}` : ''}`
      ).join(', ');
      
      const createSql = `
        CREATE TABLE IF NOT EXISTS ${archiveTable} (
          ${columns},
          archived_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `;
      
      await DatabaseHelpers.executeRawQuery(page, createSql);
    } catch (error) {
      console.warn(`创建归档表失败 ${archiveTable}:`, error);
    }
  }

  /**
   * 清理临时文件
   */
  private static async cleanupTemporaryFiles(page: Page): Promise<void> {
    await page.evaluate(() => {
      // 清理localStorage中的临时数据
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (key.startsWith('test_') || key.startsWith('temp_'))) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key));
      
      // 清理sessionStorage
      sessionStorage.clear();
    });
  }

  /**
   * 验证清理结果
   */
  static async verifyCleanup(page: Page, expectedCounts: Record<string, number> = {}): Promise<boolean> {
    try {
      const tables = Object.keys(expectedCounts);
      
      for (const table of tables) {
        const result = await DatabaseHelpers.executeRawQuery(
          page,
          `SELECT COUNT(*) as count FROM ${table}`
        );
        
        const actualCount = result[0]?.count || 0;
        const expectedCount = expectedCounts[table];
        
        if (actualCount !== expectedCount) {
          console.error(`表 ${table} 清理验证失败: 期望 ${expectedCount}, 实际 ${actualCount}`);
          return false;
        }
      }
      
      return true;
    } catch (error) {
      console.error('清理验证失败:', error);
      return false;
    }
  }

  /**
   * 获取清理统计信息
   */
  static async getCleanupStats(page: Page): Promise<any> {
    const tables = [
      'products', 'categories', 'suppliers', 'customers', 'warehouses',
      'purchase_orders', 'sales_orders', 'inventory_transactions'
    ];
    
    const stats: any = {
      timestamp: new Date().toISOString(),
      tables: {}
    };
    
    for (const table of tables) {
      try {
        const result = await DatabaseHelpers.executeRawQuery(
          page,
          `SELECT COUNT(*) as total, 
                  COUNT(CASE WHEN testId IS NOT NULL THEN 1 END) as test_data,
                  COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) as soft_deleted
           FROM ${table}`
        );
        
        stats.tables[table] = result[0] || { total: 0, test_data: 0, soft_deleted: 0 };
      } catch (error) {
        stats.tables[table] = { error: error.message };
      }
    }
    
    return stats;
  }

  /**
   * 定期清理任务
   */
  static async schedulePeriodicCleanup(
    page: Page,
    interval: number = 24 * 60 * 60 * 1000, // 24小时
    strategy: string = TestDataCleanup.CleanupStrategy.ARCHIVE
  ): Promise<void> {
    // 这里可以实现定期清理的逻辑
    // 在实际应用中，这可能需要与系统的任务调度器集成
    console.log(`📅 已安排定期清理任务，间隔: ${interval}ms, 策略: ${strategy}`);
  }
}
