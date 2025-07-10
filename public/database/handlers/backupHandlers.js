/**
 * 备份恢复处理器
 * 负责数据库备份、恢复和备份管理相关操作
 */

const { 
  successResult, 
  errorResult, 
  checkDatabaseInitialized,
  generateId,
  getCurrentTimestamp,
  validateRequiredFields
} = require('../utils/dbUtils');

const { wrapIpcHandler } = require('../utils/errorHandler');

/**
 * 设置备份恢复相关的IPC处理器
 * @param {Object} ipcMain - IPC主进程对象
 * @param {Object} db - 数据库实例
 */
function setupBackupHandlers(ipcMain, db) {

  // 确保备份表存在
  function ensureBackupTableExists() {
    try {
      if (!checkDatabaseInitialized(db)) {
        console.error('Cannot create backup table: Database not initialized');
        return false;
      }

      db.exec(`
        CREATE TABLE IF NOT EXISTS backups (
          id TEXT PRIMARY KEY,
          filename TEXT NOT NULL,
          filepath TEXT NOT NULL,
          timestamp TEXT NOT NULL,
          size INTEGER NOT NULL,
          description TEXT,
          type TEXT DEFAULT 'manual',
          created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
      `);
      return true;
    } catch (error) {
      console.error('Failed to create backup table:', error);
      return false;
    }
  }

  // 在初始化时创建备份表
  ensureBackupTableExists();

  // 创建数据库备份
  ipcMain.handle('db-backup', wrapIpcHandler(async (event, { filename, description }) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    // 确保备份表存在
    ensureBackupTableExists();

    const fs = require('fs');
    const path = require('path');
    const { app } = require('electron');

    validateRequiredFields({ filename }, ['filename']);

    // 创建备份目录
    const backupDir = path.join(app.getPath('userData'), 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    // 确保文件名有正确的扩展名
    const backupFilename = filename.endsWith('.db') ? filename : `${filename}.db`;
    const backupPath = path.join(backupDir, backupFilename);
    const currentDbPath = db.name;

    // 检查备份文件是否已存在
    if (fs.existsSync(backupPath)) {
      throw new Error('Backup file already exists');
    }

    // 创建备份
    try {
      console.log('开始创建数据库备份:', {
        source: currentDbPath,
        target: backupPath,
        filename: backupFilename,
        description
      });

      // 检查源文件是否存在
      if (!fs.existsSync(currentDbPath)) {
        throw new Error(`Source database file not found: ${currentDbPath}`);
      }

      // 使用SQLite的备份API或简单的文件复制
      fs.copyFileSync(currentDbPath, backupPath);

      // 验证备份文件
      const backupStats = fs.statSync(backupPath);
      if (backupStats.size === 0) {
        throw new Error('Backup file is empty');
      }

      console.log('备份文件创建成功:', {
        path: backupPath,
        size: backupStats.size
      });

      // 创建备份记录
      const backupInfo = {
        id: generateId(),
        filename: backupFilename,
        filepath: backupPath,
        timestamp: getCurrentTimestamp(),
        size: backupStats.size,
        description: description || 'Manual backup',
        type: 'manual'
      };

      // 备份表已在初始化时创建

      // 保存备份信息
      const stmt = db.prepare(`
        INSERT INTO backups (id, filename, filepath, timestamp, size, description, type)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      stmt.run(
        backupInfo.id,
        backupInfo.filename,
        backupInfo.filepath,
        backupInfo.timestamp,
        backupInfo.size,
        backupInfo.description,
        backupInfo.type
      );

      return successResult({
        id: backupInfo.id,
        filename: backupInfo.filename,
        filepath: backupPath,
        size: backupInfo.size,
        description: backupInfo.description,
        timestamp: backupInfo.timestamp
      });
    } catch (error) {
      console.error('数据库备份失败:', {
        filename: backupFilename,
        backupPath,
        currentDbPath,
        error: error.message,
        stack: error.stack
      });

      // 清理失败的备份文件
      if (fs.existsSync(backupPath)) {
        try {
          fs.unlinkSync(backupPath);
          console.log('已清理失败的备份文件:', backupPath);
        } catch (cleanupError) {
          console.warn('Failed to cleanup backup file:', cleanupError);
        }
      }

      // 重新抛出更详细的错误
      throw new Error(`数据库备份失败: ${error.message}`);
    }
  }, 'backup-database'));

  // 获取备份列表
  ipcMain.handle('db-get-backup-list', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    const fs = require('fs');

    // 确保备份表存在
    db.exec(`
      CREATE TABLE IF NOT EXISTS backups (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL,
        filepath TEXT NOT NULL,
        timestamp TEXT NOT NULL,
        size INTEGER NOT NULL,
        description TEXT,
        type TEXT DEFAULT 'manual',
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const stmt = db.prepare(`
      SELECT * FROM backups ORDER BY timestamp DESC
    `);

    const rows = stmt.all();

    // 验证备份文件是否仍然存在
    const backups = rows.map(row => {
      const exists = fs.existsSync(row.filepath);
      return {
        id: row.id,
        filename: row.filename,
        filepath: row.filepath,
        timestamp: new Date(row.timestamp),
        size: row.size,
        description: row.description,
        type: row.type,
        exists,
        createdAt: new Date(row.created_at || row.timestamp)
      };
    });

    return successResult(backups);
  }, 'get-backup-list'));

  // 删除备份
  ipcMain.handle('db-delete-backup', wrapIpcHandler(async (event, { backupId }) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    validateRequiredFields({ backupId }, ['backupId']);

    const fs = require('fs');

    // 获取备份信息
    const stmt = db.prepare('SELECT * FROM backups WHERE id = ?');
    const backup = stmt.get(backupId);

    if (!backup) {
      throw new Error('Backup not found');
    }

    // 删除备份文件
    if (fs.existsSync(backup.filepath)) {
      try {
        fs.unlinkSync(backup.filepath);
      } catch (error) {
        console.warn('Failed to delete backup file:', error);
        // 继续删除数据库记录
      }
    }

    // 删除数据库记录
    const deleteStmt = db.prepare('DELETE FROM backups WHERE id = ?');
    deleteStmt.run(backupId);

    return successResult({
      id: backupId,
      filename: backup.filename,
      deleted: true
    });
  }, 'delete-backup'));

  // 验证备份文件
  ipcMain.handle('db-validate-backup', wrapIpcHandler(async (event, { backupId }) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    validateRequiredFields({ backupId }, ['backupId']);

    const fs = require('fs');
    const Database = require('better-sqlite3');

    // 获取备份信息
    const stmt = db.prepare('SELECT * FROM backups WHERE id = ?');
    const backup = stmt.get(backupId);

    if (!backup) {
      throw new Error('Backup not found');
    }

    if (!fs.existsSync(backup.filepath)) {
      throw new Error('Backup file not found');
    }

    // 验证备份文件
    let testDb;
    try {
      testDb = new Database(backup.filepath, { readonly: true });

      // 测试基本查询
      const result = testDb.prepare('SELECT COUNT(*) as count FROM sqlite_master').get();
      
      // 获取表列表
      const tables = testDb.prepare(`
        SELECT name FROM sqlite_master
        WHERE type='table' AND name NOT LIKE 'sqlite_%'
      `).all();

      // 测试重要表的访问
      const tableTests = {};
      for (const table of tables) {
        try {
          const count = testDb.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
          tableTests[table.name] = {
            accessible: true,
            recordCount: count.count
          };
        } catch (error) {
          tableTests[table.name] = {
            accessible: false,
            error: error.message
          };
        }
      }

      testDb.close();

      return successResult({
        valid: true,
        filename: backup.filename,
        size: backup.size,
        timestamp: backup.timestamp,
        tables: tables.map(t => t.name),
        tableTests,
        validationTime: new Date().toISOString()
      });
    } catch (error) {
      if (testDb) {
        try {
          testDb.close();
        } catch (closeError) {
          console.warn('Failed to close test database:', closeError);
        }
      }
      
      return successResult({
        valid: false,
        error: error.message,
        filename: backup.filename,
        validationTime: new Date().toISOString()
      });
    }
  }, 'validate-backup'));

  // 恢复数据库
  ipcMain.handle('db-restore', wrapIpcHandler(async (event, { backupId, createBackupBeforeRestore = true }) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    validateRequiredFields({ backupId }, ['backupId']);

    const fs = require('fs');
    const path = require('path');

    // 获取备份信息
    const stmt = db.prepare('SELECT * FROM backups WHERE id = ?');
    const backup = stmt.get(backupId);

    if (!backup) {
      throw new Error('Backup not found');
    }

    if (!fs.existsSync(backup.filepath)) {
      throw new Error('Backup file not found');
    }

    const currentDbPath = db.name;
    let preRestoreBackupId = null;

    try {
      // 在恢复前创建当前数据库的备份
      if (createBackupBeforeRestore) {
        const preRestoreFilename = `pre_restore_${Date.now()}.db`;
        const { app } = require('electron');
        const backupDir = path.join(app.getPath('userData'), 'backups');
        const preRestoreBackupPath = path.join(backupDir, preRestoreFilename);

        fs.copyFileSync(currentDbPath, preRestoreBackupPath);

        // 记录恢复前备份
        const preRestoreBackupInfo = {
          id: generateId(),
          filename: preRestoreFilename,
          filepath: preRestoreBackupPath,
          timestamp: getCurrentTimestamp(),
          size: fs.statSync(preRestoreBackupPath).size,
          description: 'Automatic backup before restore',
          type: 'auto_pre_restore'
        };

        const preRestoreStmt = db.prepare(`
          INSERT INTO backups (id, filename, filepath, timestamp, size, description, type)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        preRestoreStmt.run(
          preRestoreBackupInfo.id,
          preRestoreBackupInfo.filename,
          preRestoreBackupInfo.filepath,
          preRestoreBackupInfo.timestamp,
          preRestoreBackupInfo.size,
          preRestoreBackupInfo.description,
          preRestoreBackupInfo.type
        );

        preRestoreBackupId = preRestoreBackupInfo.id;
      }

      // 关闭当前数据库连接
      db.close();

      // 恢复数据库
      fs.copyFileSync(backup.filepath, currentDbPath);

      // 重新打开数据库
      const Database = require('better-sqlite3');
      const newDb = new Database(currentDbPath);

      // 验证恢复的数据库
      const testQuery = newDb.prepare('SELECT COUNT(*) as count FROM sqlite_master').get();
      
      // 更新全局数据库引用（注意：这可能需要重新启动应用程序）
      // 这里只是示例，实际实现可能需要更复杂的处理
      
      newDb.close();

      return successResult({
        restored: true,
        backupId: backupId,
        filename: backup.filename,
        preRestoreBackupId,
        timestamp: new Date().toISOString(),
        message: 'Database restored successfully. Please restart the application.'
      });
    } catch (error) {
      // 恢复失败，尝试回滚
      if (preRestoreBackupId) {
        try {
          // 这里可以添加回滚逻辑
          console.warn('Restore failed, but pre-restore backup is available:', preRestoreBackupId);
        } catch (rollbackError) {
          console.error('Rollback also failed:', rollbackError);
        }
      }
      throw error;
    }
  }, 'restore-database'));

  // 创建自动备份
  ipcMain.handle('db-create-auto-backup', wrapIpcHandler(async (event, { reason = 'automatic' }) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `auto_backup_${timestamp}.db`;
    const description = `Automatic backup - ${reason}`;

    // 调用备份功能
    const backupResult = await new Promise((resolve, reject) => {
      const handler = async () => {
        try {
          const result = await setupBackupHandlers.__backup({ filename, description });
          resolve(result);
        } catch (error) {
          reject(error);
        }
      };
      handler();
    });

    return backupResult;
  }, 'create-auto-backup'));

  // 清理旧备份
  ipcMain.handle('db-cleanup-old-backups', wrapIpcHandler(async (event, { keepCount = 10, keepDays = 30 }) => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    const fs = require('fs');

    // 获取所有备份
    const stmt = db.prepare(`
      SELECT * FROM backups ORDER BY timestamp DESC
    `);
    const backups = stmt.all();

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - keepDays);

    let deletedCount = 0;
    const deletedBackups = [];

    // 删除超过保留数量的备份
    if (backups.length > keepCount) {
      const toDelete = backups.slice(keepCount);
      
      for (const backup of toDelete) {
        try {
          // 删除文件
          if (fs.existsSync(backup.filepath)) {
            fs.unlinkSync(backup.filepath);
          }
          
          // 删除数据库记录
          const deleteStmt = db.prepare('DELETE FROM backups WHERE id = ?');
          deleteStmt.run(backup.id);
          
          deletedCount++;
          deletedBackups.push({
            id: backup.id,
            filename: backup.filename,
            reason: 'exceeded_keep_count'
          });
        } catch (error) {
          console.warn(`Failed to delete backup ${backup.filename}:`, error);
        }
      }
    }

    // 删除超过保留天数的备份
    const oldBackups = backups.filter(backup => {
      const backupDate = new Date(backup.timestamp);
      return backupDate < cutoffDate;
    });

    for (const backup of oldBackups) {
      // 跳过已经删除的备份
      if (deletedBackups.find(d => d.id === backup.id)) {
        continue;
      }

      try {
        // 删除文件
        if (fs.existsSync(backup.filepath)) {
          fs.unlinkSync(backup.filepath);
        }
        
        // 删除数据库记录
        const deleteStmt = db.prepare('DELETE FROM backups WHERE id = ?');
        deleteStmt.run(backup.id);
        
        deletedCount++;
        deletedBackups.push({
          id: backup.id,
          filename: backup.filename,
          reason: 'exceeded_keep_days'
        });
      } catch (error) {
        console.warn(`Failed to delete old backup ${backup.filename}:`, error);
      }
    }

    return successResult({
      deletedCount,
      deletedBackups,
      keepCount,
      keepDays,
      cleanupTime: new Date().toISOString()
    });
  }, 'cleanup-old-backups'));

  // 获取备份统计信息
  ipcMain.handle('db-get-backup-stats', wrapIpcHandler(async () => {
    if (!checkDatabaseInitialized(db)) {
      return errorResult('Database not initialized');
    }

    const fs = require('fs');

    const stmt = db.prepare(`
      SELECT 
        COUNT(*) as totalBackups,
        SUM(size) as totalSize,
        AVG(size) as averageSize,
        MIN(timestamp) as oldestBackup,
        MAX(timestamp) as latestBackup,
        type,
        COUNT(*) as count
      FROM backups
      GROUP BY type
      ORDER BY type
    `);

    const typeStats = stmt.all();

    const totalStmt = db.prepare(`
      SELECT 
        COUNT(*) as totalBackups,
        SUM(size) as totalSize,
        AVG(size) as averageSize,
        MIN(timestamp) as oldestBackup,
        MAX(timestamp) as latestBackup
      FROM backups
    `);

    const totalStats = totalStmt.get();

    // 检查文件系统状态
    const allBackups = db.prepare('SELECT filepath FROM backups').all();
    let existingFiles = 0;
    let missingFiles = 0;

    for (const backup of allBackups) {
      if (fs.existsSync(backup.filepath)) {
        existingFiles++;
      } else {
        missingFiles++;
      }
    }

    return successResult({
      total: {
        totalBackups: totalStats.totalBackups || 0,
        totalSize: totalStats.totalSize || 0,
        averageSize: Math.round(totalStats.averageSize || 0),
        oldestBackup: totalStats.oldestBackup ? new Date(totalStats.oldestBackup) : null,
        latestBackup: totalStats.latestBackup ? new Date(totalStats.latestBackup) : null,
        existingFiles,
        missingFiles
      },
      byType: typeStats.map(stat => ({
        type: stat.type,
        count: stat.count,
        totalSize: stat.totalSize,
        averageSize: Math.round(stat.averageSize)
      }))
    });
  }, 'get-backup-stats'));

  console.log('Backup handlers registered successfully');
}

module.exports = {
  setupBackupHandlers
};