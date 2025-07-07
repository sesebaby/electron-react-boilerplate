/**
 * 数据库状态快照工具
 * 用于捕获数据库表的状态，以便比较业务操作前后的数据变化
 */

import { electronDatabase } from '../services/database/electronDatabase';

export interface TableSnapshot {
  tableName: string;
  rowCount: number;
  data: any[];
  checksum: string;
  timestamp: Date;
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
        console.warn(`[DatabaseSnapshot] 无法捕获表 ${tableName} 的快照:`, error.message);
        // 创建空快照以保持一致性
        snapshot.tables.set(tableName, {
          tableName,
          rowCount: 0,
          data: [],
          checksum: '',
          timestamp,
          error: error.message
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
    const db = await electronDatabase.getDatabase();
    
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
      const db = await electronDatabase.getDatabase();
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
  private async saveSnapshot(snapshot: DatabaseSnapshot): Promise<void> {
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
        tables: new Map(snapshotData.tables.map(item => [item.key, item.value]))
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
    console.log(`[DatabaseSnapshot] 比较快照: ${beforeSnapshot.snapshotId} vs ${afterSnapshot.snapshotId}`);
    
    const comparison = {
      beforeSnapshot: beforeSnapshot.snapshotId,
      afterSnapshot: afterSnapshot.snapshotId,
      timeElapsed: afterSnapshot.timestamp.getTime() - beforeSnapshot.timestamp.getTime(),
      tableChanges: new Map(),
      summary: {
        tablesChanged: 0,
        totalRowsAdded: 0,
        totalRowsUpdated: 0,
        totalRowsDeleted: 0,
        dataIntegrityIssues: []
      }
    };

    // 比较每个表的变化
    for (const tableName of this.TRACKED_TABLES) {
      const beforeTable = beforeSnapshot.tables.get(tableName);
      const afterTable = afterSnapshot.tables.get(tableName);
      
      if (!beforeTable || !afterTable) {
        comparison.summary.dataIntegrityIssues.push({
          type: 'Missing Table Data',
          table: tableName,
          description: `表 ${tableName} 在快照中缺失数据`
        });
        continue;
      }

      const tableComparison = this.compareTableData(beforeTable, afterTable);
      if (tableComparison.hasChanges) {
        comparison.tableChanges.set(tableName, tableComparison);
        comparison.summary.tablesChanged++;
        comparison.summary.totalRowsAdded += tableComparison.rowsAdded;
        comparison.summary.totalRowsUpdated += tableComparison.rowsUpdated;
        comparison.summary.totalRowsDeleted += tableComparison.rowsDeleted;
      }
    }

    // 保存比较结果
    await this.saveComparison(comparison);
    
    return comparison;
  }

  /**
   * 比较单个表的数据变化
   */
  private compareTableData(beforeTable: TableSnapshot, afterTable: TableSnapshot): any {
    const comparison = {
      tableName: beforeTable.tableName,
      hasChanges: false,
      rowsAdded: 0,
      rowsUpdated: 0,
      rowsDeleted: 0,
      addedRows: [],
      updatedRows: [],
      deletedRows: [],
      checksumChanged: beforeTable.checksum !== afterTable.checksum
    };

    // 如果校验和相同，表示没有变化
    if (!comparison.checksumChanged) {
      return comparison;
    }

    comparison.hasChanges = true;

    // 创建数据映射以便比较
    const beforeMap = new Map(beforeTable.data.map(row => [row.id, row]));
    const afterMap = new Map(afterTable.data.map(row => [row.id, row]));

    // 查找新增的行
    afterMap.forEach((row, id) => {
      if (!beforeMap.has(id)) {
        comparison.addedRows.push(row);
        comparison.rowsAdded++;
      }
    });

    // 查找删除的行
    beforeMap.forEach((row, id) => {
      if (!afterMap.has(id)) {
        comparison.deletedRows.push(row);
        comparison.rowsDeleted++;
      }
    });

    // 查找更新的行
    beforeMap.forEach((beforeRow, id) => {
      const afterRow = afterMap.get(id);
      if (afterRow && JSON.stringify(beforeRow) !== JSON.stringify(afterRow)) {
        comparison.updatedRows.push({
          id,
          before: beforeRow,
          after: afterRow,
          changes: this.getRowChanges(beforeRow, afterRow)
        });
        comparison.rowsUpdated++;
      }
    });

    return comparison;
  }

  /**
   * 获取行级别的变化详情
   */
  private getRowChanges(beforeRow: any, afterRow: any): any[] {
    const changes = [];
    const allKeys = new Set([...Object.keys(beforeRow), ...Object.keys(afterRow)]);
    
    allKeys.forEach(key => {
      const beforeValue = beforeRow[key];
      const afterValue = afterRow[key];
      
      if (beforeValue !== afterValue) {
        changes.push({
          field: key,
          before: beforeValue,
          after: afterValue,
          type: this.getChangeType(beforeValue, afterValue)
        });
      }
    });
    
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
      
      const comparisonFile = path.join(comparisonDir, `${comparison.beforeSnapshot}_vs_${comparison.afterSnapshot}.json`);
      
      // 创建可序列化的比较数据
      const serializableComparison = {
        ...comparison,
        tableChanges: Array.from(comparison.tableChanges.entries()).map(([key, value]) => ({ key, value }))
      };
      
      await fs.writeFile(comparisonFile, JSON.stringify(serializableComparison, null, 2));
      console.log(`[DatabaseSnapshot] 比较结果已保存: ${comparisonFile}`);
    } catch (error) {
      console.error(`[DatabaseSnapshot] 保存比较结果失败:`, error);
    }
  }

  /**
   * 获取表中的行数
   */
  async getTableRowCount(tableName: string): Promise<number> {
    try {
      const db = await electronDatabase.getDatabase();
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
      const db = await electronDatabase.getDatabase();
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