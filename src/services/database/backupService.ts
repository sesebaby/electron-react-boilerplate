/**
 * 数据库备份服务
 * 提供数据库备份和恢复功能
 */

import { format } from 'date-fns';
// 确保 ElectronAPI 类型可用
import './electronDatabase';

export interface BackupInfo {
  id: string;
  filename: string;
  filepath: string;
  timestamp: Date;
  size: number;
  description?: string;
}

export interface BackupProgress {
  stage: 'preparing' | 'backing_up' | 'compressing' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export class DatabaseBackupService {
  private static instance: DatabaseBackupService;

  private constructor() {}

  static getInstance(): DatabaseBackupService {
    if (!DatabaseBackupService.instance) {
      DatabaseBackupService.instance = new DatabaseBackupService();
    }
    return DatabaseBackupService.instance;
  }

  /**
   * 创建数据库备份
   */
  async createBackup(
    description?: string,
    onProgress?: (progress: BackupProgress) => void
  ): Promise<BackupInfo> {
    const timestamp = new Date();
    const backupId = `backup_${format(timestamp, 'yyyyMMdd_HHmmss')}`;
    const filename = `${backupId}.db`;

    try {
      // 准备阶段
      onProgress?.({
        stage: 'preparing',
        progress: 10,
        message: '正在准备备份...'
      });

      // 检查Electron API是否可用
      if (!window.electronAPI?.dbBackup) {
        throw new Error('数据库备份功能不可用：Electron API未初始化');
      }

      // 执行备份
      onProgress?.({
        stage: 'backing_up',
        progress: 30,
        message: '正在备份数据库...'
      });

      const result = await window.electronAPI.dbBackup(filename);

      if (!result.success) {
        const errorMessage = result.error || '备份失败：未知错误';
        console.error('数据库备份失败:', {
          filename,
          description,
          error: errorMessage,
          result
        });
        throw new Error(errorMessage);
      }

      // 压缩阶段
      onProgress?.({
        stage: 'compressing',
        progress: 80,
        message: '正在压缩备份文件...'
      });

      // 完成
      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: '备份完成'
      });

      const backupInfo: BackupInfo = {
        id: backupId,
        filename,
        filepath: result.filepath,
        timestamp,
        size: result.size || 0,
        description
      };

      return backupInfo;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: '备份失败',
        error: errorMessage
      });

      throw new Error(`数据库备份失败: ${errorMessage}`);
    }
  }

  /**
   * 获取备份列表
   */
  async getBackupList(): Promise<BackupInfo[]> {
    try {
      if (!window.electronAPI?.dbGetBackupList) {
        throw new Error('获取备份列表功能不可用');
      }

      const result = await window.electronAPI.dbGetBackupList();
      
      if (!result.success) {
        throw new Error(result.error || '获取备份列表失败');
      }

      return result.data || [];
    } catch (error) {
      console.error('获取备份列表失败:', error);
      throw error;
    }
  }

  /**
   * 删除备份文件
   */
  async deleteBackup(backupId: string): Promise<void> {
    try {
      if (!window.electronAPI?.dbDeleteBackup) {
        throw new Error('删除备份功能不可用');
      }

      const result = await window.electronAPI.dbDeleteBackup(backupId);
      
      if (!result.success) {
        throw new Error(result.error || '删除备份失败');
      }
    } catch (error) {
      console.error('删除备份失败:', error);
      throw error;
    }
  }

  /**
   * 恢复数据库
   */
  async restoreBackup(
    backupId: string,
    onProgress?: (progress: BackupProgress) => void
  ): Promise<void> {
    try {
      onProgress?.({
        stage: 'preparing',
        progress: 10,
        message: '正在准备恢复...'
      });

      if (!window.electronAPI?.dbRestore) {
        throw new Error('数据库恢复功能不可用');
      }

      onProgress?.({
        stage: 'backing_up',
        progress: 50,
        message: '正在恢复数据库...'
      });

      const result = await window.electronAPI.dbRestore(backupId);
      
      if (!result.success) {
        throw new Error(result.error || '恢复失败');
      }

      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: '恢复完成'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: '恢复失败',
        error: errorMessage
      });

      throw new Error(`数据库恢复失败: ${errorMessage}`);
    }
  }

  /**
   * 验证备份文件
   */
  async validateBackup(backupId: string): Promise<boolean> {
    try {
      if (!window.electronAPI?.dbValidateBackup) {
        throw new Error('验证备份功能不可用');
      }

      const result = await window.electronAPI.dbValidateBackup(backupId);
      
      return result.success && result.valid;
    } catch (error) {
      console.error('验证备份失败:', error);
      return false;
    }
  }
}

export default DatabaseBackupService.getInstance();
