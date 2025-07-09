/**
 * 系统初始化服务
 * 提供系统重置和初始化功能
 */

import backupService, { BackupInfo, BackupProgress } from './database/backupService';
import { dataInitializer } from './dataInitializer';
import { businessServiceManager } from './business';

// 类型断言以确保 ElectronAPI 方法可用
declare global {
  interface Window {
    electronAPI: any;
  }
}

export interface InitializationProgress {
  stage: 'backup' | 'clearing' | 'schema' | 'data' | 'services' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
  backupInfo?: BackupInfo;
}

export interface InitializationOptions {
  createBackup: boolean;
  backupDescription?: string;
  preserveUsers: boolean;
  preserveSettings: boolean;
  importMockData: boolean;
}

export class SystemInitializationService {
  private static instance: SystemInitializationService;

  private constructor() {}

  static getInstance(): SystemInitializationService {
    if (!SystemInitializationService.instance) {
      SystemInitializationService.instance = new SystemInitializationService();
    }
    return SystemInitializationService.instance;
  }

  /**
   * 执行系统初始化
   */
  async initializeSystem(
    options: InitializationOptions,
    onProgress?: (progress: InitializationProgress) => void
  ): Promise<void> {
    let backupInfo: BackupInfo | undefined;

    try {
      // 第一步：创建备份（如果需要）
      if (options.createBackup) {
        onProgress?.({
          stage: 'backup',
          progress: 5,
          message: '正在创建数据库备份...'
        });

        backupInfo = await backupService.createBackup(
          options.backupDescription || '系统初始化前自动备份',
          (backupProgress: BackupProgress) => {
            onProgress?.({
              stage: 'backup',
              progress: Math.round(5 + (backupProgress.progress * 0.15)), // 5-20%
              message: backupProgress.message
            });
          }
        );

        onProgress?.({
          stage: 'backup',
          progress: 20,
          message: '备份创建完成',
          backupInfo
        });
      }

      // 第二步：清理数据库
      onProgress?.({
        stage: 'clearing',
        progress: 25,
        message: '正在清理数据库...'
      });

      await this.clearDatabase(options);

      onProgress?.({
        stage: 'clearing',
        progress: 40,
        message: '数据库清理完成'
      });

      // 第三步：重建数据库结构
      onProgress?.({
        stage: 'schema',
        progress: 45,
        message: '正在重建数据库结构...'
      });

      await this.rebuildSchema();

      onProgress?.({
        stage: 'schema',
        progress: 60,
        message: '数据库结构重建完成'
      });

      // 第四步：导入初始数据
      if (options.importMockData) {
        onProgress?.({
          stage: 'data',
          progress: 65,
          message: '正在导入初始数据...'
        });

        await this.importInitialData();

        onProgress?.({
          stage: 'data',
          progress: 80,
          message: '初始数据导入完成'
        });
      }

      // 第五步：重新初始化服务
      onProgress?.({
        stage: 'services',
        progress: 85,
        message: '正在重新初始化系统服务...'
      });

      await this.reinitializeServices();

      onProgress?.({
        stage: 'services',
        progress: 95,
        message: '系统服务初始化完成'
      });

      // 完成
      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: '系统初始化完成',
        backupInfo
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: '系统初始化失败',
        error: errorMessage,
        backupInfo
      });

      throw new Error(`系统初始化失败: ${errorMessage}`);
    }
  }

  /**
   * 清理数据库
   */
  private async clearDatabase(options: InitializationOptions): Promise<void> {
    try {
      if (!window.electronAPI?.dbClearDatabase) {
        throw new Error('数据库清理功能不可用');
      }

      const result = await window.electronAPI.dbClearDatabase({
        preserveUsers: options.preserveUsers,
        preserveSettings: options.preserveSettings
      });

      if (!result.success) {
        throw new Error(result.error || '数据库清理失败');
      }
    } catch (error) {
      console.error('清理数据库失败:', error);
      throw error;
    }
  }

  /**
   * 重建数据库结构
   */
  private async rebuildSchema(): Promise<void> {
    try {
      if (!window.electronAPI?.dbRebuildSchema) {
        throw new Error('数据库结构重建功能不可用');
      }

      const result = await window.electronAPI.dbRebuildSchema();

      if (!result.success) {
        throw new Error(result.error || '数据库结构重建失败');
      }
    } catch (error) {
      console.error('重建数据库结构失败:', error);
      throw error;
    }
  }

  /**
   * 导入初始数据
   */
  private async importInitialData(): Promise<void> {
    try {
      if (!window.electronAPI?.dbImportMockData) {
        throw new Error('导入初始数据功能不可用');
      }

      const result = await window.electronAPI.dbImportMockData();

      if (!result.success) {
        throw new Error(result.error || '导入初始数据失败');
      }
    } catch (error) {
      console.error('导入初始数据失败:', error);
      throw error;
    }
  }

  /**
   * 重新初始化系统服务
   */
  private async reinitializeServices(): Promise<void> {
    try {
      // 重置所有业务服务状态
      businessServiceManager.reset();
      
      // 重新初始化数据服务
      await dataInitializer.initializeData();
    } catch (error) {
      console.error('重新初始化系统服务失败:', error);
      throw error;
    }
  }

  /**
   * 获取系统状态信息
   */
  async getSystemStatus(): Promise<{
    databaseSize: number;
    tableCount: number;
    recordCount: number;
    lastBackup?: Date;
    version: string;
  }> {
    try {
      if (!window.electronAPI?.dbGetSystemStatus) {
        throw new Error('获取系统状态功能不可用');
      }

      const result = await window.electronAPI.dbGetSystemStatus();

      if (!result.success) {
        throw new Error(result.error || '获取系统状态失败');
      }

      return result.data;
    } catch (error) {
      console.error('获取系统状态失败:', error);
      throw error;
    }
  }

  /**
   * 验证系统完整性
   */
  async validateSystemIntegrity(): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    try {
      if (!window.electronAPI?.dbValidateIntegrity) {
        throw new Error('系统完整性验证功能不可用');
      }

      const result = await window.electronAPI.dbValidateIntegrity();

      if (!result.success) {
        throw new Error(result.error || '系统完整性验证失败');
      }

      return result.data;
    } catch (error) {
      console.error('系统完整性验证失败:', error);
      throw error;
    }
  }
}

export default SystemInitializationService.getInstance();
