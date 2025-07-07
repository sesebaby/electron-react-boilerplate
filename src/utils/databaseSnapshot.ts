/**
 * 数据库状态快照工具
 * 用于捕获数据库表的状态，以便比较业务操作前后的数据变化
 */

import dbManager from '../services/database/connection';

export interface TableSnapshot {
  tableName: string;
  rowCount: number;
  data: any[];
  checksum: string;
  timestamp: Date;
  error?: string;
}

export interface IDatabaseSnapshot {
  snapshotId: string;
  testId: string;
  operation: string;
  timestamp: Date;
  tables: Map<string, TableSnapshot>;
  metadata: {
    databaseVersion: string;
    environment: string;
    userId: string;
  };
}

export class DatabaseSnapshot {
  private readonly TRACKED_TABLES = [
    'products',
    'categories',
    'suppliers',
    'customers',
    'warehouses',
    'inventory_stocks',
    'fifo_queue',
    'purchase_orders',
    'purchase_order_items',
    'purchase_receipts',
    'purchase_receipt_items',
    'sales_orders',
    'sales_order_items',
    'sales_deliveries',
    'sales_delivery_items',
    'accounts_payable',
    'accounts_receivable',
    'payments',
    'receipts',
    'stock_movements',
    'stock_transfers',
    'warehouse_stocks',
    'units',
    'unit_conversions',
    'daily_consumption',
    'users',
    'permissions',
    'system_settings'
  ];

  /**
   * 捕获数据库快照
   */
  async captureSnapshot(testId: string, operation: string): Promise<IDatabaseSnapshot> {
    const snapshotId = `${testId}_${operation}_${Date.now()}`;
    const timestamp = new Date();
    
    console.log(`[DatabaseSnapshot] 捕获快照: ${snapshotId}`);
    
    const snapshot: IDatabaseSnapshot = {
      snapshotId,
      testId,
      operation,
      timestamp,
      tables: new Map(),
      metadata: {
        databaseVersion: await this.getDatabaseVersion(),
        environment: process.env.NODE_ENV || 'development',
        userId: 'test_user'
      }
    };

    // 为每个跟踪的表创建快照
    for (const tableName of this.TRACKED_TABLES) {
      try {
        const tableSnapshot = await this.captureTableSnapshot(tableName, timestamp);
        snapshot.tables.set(tableName, tableSnapshot);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`[DatabaseSnapshot] 无法捕获表 ${tableName} 的快照:`, errorMessage);
        // 创建空快照以保持一致性
        snapshot.tables.set(tableName, {
          tableName,
          rowCount: 0,
          data: [],
          checksum: '',
          timestamp,
          error: errorMessage
        });
      }
    }

    await this.saveSnapshot(snapshot);
    console.log(`[DatabaseSnapshot] 快照捕获完成: ${snapshotId} (${snapshot.tables.size} 个表)`);
    
    return snapshot;
  }

  /**
   * 捕获单个表的快照
   */
  private async captureTableSnapshot(tableName: string, timestamp: Date): Promise<TableSnapshot> {
    const db = dbManager.getConnection();
    
    // 获取表数据
    const data = await db.all(`SELECT * FROM ${tableName} ORDER BY id`);
    const rowCount = data.length;
    
    // 计算数据校验和
    const checksum = this.calculateChecksum(data);
    
    return {
      tableName,
      rowCount,
      data,
      checksum,
      timestamp
    };
  }

  /**
   * 获取数据库版本
   */
  private async getDatabaseVersion(): Promise<string> {
    try {
      const db = dbManager.getConnection();
      const result = await db.get('SELECT value FROM system_settings WHERE key = "database_version"');
      return result?.value || '1.0.0';
    } catch (error) {
      return '1.0.0';
    }
  }

  /**
   * 计算数据校验和
   */
  private calculateChecksum(data: any[]): string {
    const dataString = JSON.stringify(data, Object.keys(data).sort());
    let hash = 0;
    for (let i = 0; i < dataString.length; i++) {
      const char = dataString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return hash.toString(16);
  }

  /**
   * 保存快照到文件
   */
  private async saveSnapshot(snapshot: IDatabaseSnapshot): Promise<void> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const snapshotDir = path.join(process.cwd(), 'tests', 'snapshots');
      await fs.mkdir(snapshotDir, { recursive: true });
      
      const snapshotFile = path.join(snapshotDir, `${snapshot.snapshotId}.json`);
      
      // 创建可序列化的快照数据
      const serializableSnapshot = {
        ...snapshot,
        tables: Array.from(snapshot.tables.entries()).map(([key, value]) => ({ key, value }))
      };
      
      await fs.writeFile(snapshotFile, JSON.stringify(serializableSnapshot, null, 2));
      console.log(`[DatabaseSnapshot] 快照已保存: ${snapshotFile}`);
    } catch (error) {
      console.error(`[DatabaseSnapshot] 保存快照失败:`, error);
    }
  }

  /**
   * 加载快照文件
   */
  async loadSnapshot(snapshotId: string): Promise<IDatabaseSnapshot | null> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const snapshotFile = path.join(process.cwd(), 'tests', 'snapshots', `${snapshotId}.json`);
      const data = await fs.readFile(snapshotFile, 'utf8');
      const snapshotData = JSON.parse(data);
      
      // 恢复 Map 结构
      const snapshot: IDatabaseSnapshot = {
        ...snapshotData,
        tables: new Map(snapshotData.tables.map((item: { key: string; value: TableSnapshot }) => [item.key, item.value]))
      };
      
      return snapshot;
    } catch (error) {
      console.error(`[DatabaseSnapshot] 加载快照失败:`, error);
      return null;
    }
  }

  /**
   * 比较两个快照的差异
   */
  async compareSnapshots(beforeSnapshot: IDatabaseSnapshot, afterSnapshot: IDatabaseSnapshot): Promise<any> {
    const comparisonTime = new Date();
    const summary: { type: string; table: string; description: string; details?: any }[] = [];
    const tables: { [key: string]: any } = {};

    console.log(`[DatabaseSnapshot] 开始比较快照: ${beforeSnapshot.snapshotId} vs ${afterSnapshot.snapshotId}`);

    // 比较每个表的变化
    for (const tableName of this.TRACKED_TABLES) {
      const beforeTable = beforeSnapshot.tables.get(tableName);
      const afterTable = afterSnapshot.tables.get(tableName);
      
      if (!beforeTable || !afterTable) {
        summary.push({
          type: 'Missing Table Data',
          table: tableName,
          description: `表 ${tableName} 在快照中缺失数据`
        });
        continue;
      }

      const tableComparison = this.compareTableData(beforeTable, afterTable);
      if (tableComparison.added.length > 0 || tableComparison.removed.length > 0 || tableComparison.modified.length > 0) {
        tables[tableName] = tableComparison;
        summary.push({
          type: 'Table Changes',
          table: tableName,
          description: `表 ${tableName} 有变化`,
          details: tableComparison
        });
      }
    }

    return {
      id: `comp_${beforeSnapshot.snapshotId}_${afterSnapshot.snapshotId}`,
      beforeSnapshotId: beforeSnapshot.snapshotId,
      afterSnapshotId: afterSnapshot.snapshotId,
      comparisonTime,
      summary,
      tables
    };
  }

  /**
   * 比较两个表的快照数据
   */
  private compareTableData(beforeTable: TableSnapshot, afterTable: TableSnapshot): { added: any[], removed: any[], modified: any[] } {
    const beforeDataMap = new Map(beforeTable.data.map(row => [row.id, row]));
    const afterDataMap = new Map(afterTable.data.map(row => [row.id, row]));
    
    const tableChanges: { added: any[], removed: any[], modified: { id: any; before: any; after: any; changes: any[] }[] } = {
      added: [],
      removed: [],
      modified: []
    };

    // 检查新增和修改
    for (const [id, afterRow] of afterDataMap.entries()) {
      if (!beforeDataMap.has(id)) {
        tableChanges.added.push(afterRow);
      }
    }

    // 检查删除
    for (const [id, beforeRow] of beforeDataMap.entries()) {
      if (!afterDataMap.has(id)) {
        tableChanges.removed.push(beforeRow);
      }
    }

    // 检查更新的行
    for (const [id, beforeRow] of beforeDataMap.entries()) {
      const afterRow = afterDataMap.get(id);
      if (afterRow && JSON.stringify(beforeRow) !== JSON.stringify(afterRow)) {
        tableChanges.modified.push({
          id,
          before: beforeRow,
          after: afterRow,
          changes: this.getRowChanges(beforeRow, afterRow)
        });
      }
    }

    return tableChanges;
  }

  /**
   * 比较两行数据的变化
   */
  private getRowChanges(beforeRow: any, afterRow: any): { field: string, before: any, after: any, changeType: string }[] {
    const changes: { field: string, before: any, after: any, changeType: string }[] = [];
    const allKeys = new Set([...Object.keys(beforeRow), ...Object.keys(afterRow)]);

    for (const key of allKeys) {
      const beforeValue = beforeRow[key];
      const afterValue = afterRow[key];
      
      if (beforeValue !== afterValue) {
        changes.push({
          field: key,
          before: beforeValue,
          after: afterValue,
          changeType: this.getChangeType(beforeValue, afterValue)
        });
      }
    }
    
    return changes;
  }

  /**
   * 获取变化类型
   */
  private getChangeType(beforeValue: any, afterValue: any): string {
    if (beforeValue === null || beforeValue === undefined) {
      return 'added';
    }
    if (afterValue === null || afterValue === undefined) {
      return 'removed';
    }
    return 'modified';
  }

  /**
   * 保存比较结果
   */
  private async saveComparison(comparison: any): Promise<void> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const comparisonDir = path.join(process.cwd(), 'tests', 'comparisons');
      await fs.mkdir(comparisonDir, { recursive: true });
      
      const comparisonFile = path.join(comparisonDir, `${comparison.id}.json`);
      
      // 处理Map等不易序列化的数据结构
      const serializableComparison = {
        ...comparison,
        tables: Object.fromEntries(
          Object.entries(comparison.tables).map(([key, value]: [string, any]) => [
            key,
            {
              ...value,
              // 如果有更复杂的内部结构需要序列化，在这里处理
            }
          ])
        )
      };

      await fs.writeFile(comparisonFile, JSON.stringify(serializableComparison, null, 2));
      console.log(`[DatabaseSnapshot] 比较结果已保存: ${comparisonFile}`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[DatabaseSnapshot] 保存比较结果失败:`, errorMessage);
    }
  }

  /**
   * 获取表中的行数
   */
  async getTableRowCount(tableName: string): Promise<number> {
    try {
      const db = dbManager.getConnection();
      const result = await db.get(`SELECT COUNT(*) as count FROM ${tableName}`);
      return result?.count || 0;
    } catch (error) {
      console.error(`[DatabaseSnapshot] 获取表 ${tableName} 行数失败:`, error);
      return 0;
    }
  }

  /**
   * 检查表是否存在
   */
  async tableExists(tableName: string): Promise<boolean> {
    try {
      const db = dbManager.getConnection();
      const result = await db.get(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`, [tableName]);
      return !!result;
    } catch (error) {
      console.error(`[DatabaseSnapshot] 检查表 ${tableName} 是否存在失败:`, error);
      return false;
    }
  }

  /**
   * 获取所有跟踪的表
   */
  getTrackedTables(): string[] {
    return [...this.TRACKED_TABLES];
  }

  /**
   * 清理旧的快照文件
   */
  async cleanupOldSnapshots(retentionDays: number = 7): Promise<void> {
    try {
      const fs = require('fs').promises;
      const path = require('path');
      
      const snapshotDir = path.join(process.cwd(), 'tests', 'snapshots');
      const files = await fs.readdir(snapshotDir);
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      let deletedCount = 0;
      
      for (const file of files) {
        if (file.endsWith('.json')) {
          const filePath = path.join(snapshotDir, file);
          const stats = await fs.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            await fs.unlink(filePath);
            deletedCount++;
          }
        }
      }
      
      console.log(`[DatabaseSnapshot] 清理了 ${deletedCount} 个过期快照文件`);
    } catch (error) {
      console.error(`[DatabaseSnapshot] 清理快照文件失败:`, error);
    }
  }
}