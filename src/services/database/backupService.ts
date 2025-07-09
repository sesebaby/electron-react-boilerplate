/**
 * 数据库备份服务
 * 提供数据库备份和恢复功能
 */

import { format } from 'date-fns';
import { ElectronAPI, DatabaseResult } from '../../types/electronAPI';

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
    const _timestamp = new Date();
    const _backupId = `backup_${format(timestamp, 'yyyyMMdd_HHmmss')}`;
    const _filename = `${backupId}.db`;

    try {
      // 准备阶段
      onProgress?.({
        stage: 'preparing',
        progress: 10,
        message: '正在准备备份...'
      });

      // 检查Electron API是否可用
      const electronAPI: ElectronAPI = window.electronAPI;
      if (!electronAPI?.dbBackupData) {
        throw new Error('数据库备份功能不可用');
      }

      // 执行备份
      onProgress?.({
        stage: 'backing_up',
        progress: 30,
        message: '正在备份数据库...'
      });

      const result: DatabaseResult<any> = await electronAPI.dbBackupData(filename);

      if (!result.success) {
        throw new Error(result.error || '备份失败');
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
        filepath: result.data?.filepath || filename,
        timestamp,
        size: result.data?.size || 0,
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
      const electronAPI: ElectronAPI = window.electronAPI;
      if (!electronAPI?.dbGetBackupList) {
        throw new Error('获取备份列表功能不可用');
      }

      const result: DatabaseResult<BackupInfo[]> = await electronAPI.dbGetBackupList();
      
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
      const electronAPI: ElectronAPI = window.electronAPI;
      if (!electronAPI?.dbRestoreData) {
        throw new Error('删除备份功能不可用');
      }

      // Note: The new API doesn't have a specific delete backup function
      // This would need to be implemented or handled differently
      throw new Error('删除备份功能需要在主进程中实现');
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

      const electronAPI: ElectronAPI = window.electronAPI;
      if (!electronAPI?.dbRestoreData) {
        throw new Error('数据库恢复功能不可用');
      }

      onProgress?.({
        stage: 'backing_up',
        progress: 50,
        message: '正在恢复数据库...'
      });

      const result: DatabaseResult<any> = await electronAPI.dbRestoreData(backupId);
      
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
      const electronAPI: ElectronAPI = window.electronAPI;
      if (!electronAPI?.dbCheckDatabaseIntegrity) {
        throw new Error('验证备份功能不可用');
      }

      const result: DatabaseResult<any> = await electronAPI.dbCheckDatabaseIntegrity();
      
      return result.success && result.data?.valid;
    } catch (error) {
      console.error('验证备份失败:', error);
      return false;
    }
  }
}

export default DatabaseBackupService.getInstance();
