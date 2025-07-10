/**
 * 系统初始化服务
 * 提供系统重置和初始化功能
 */

import { dataInitializer } from './dataInitializer';
import { businessServiceManager } from './business/businessServiceManager';

// 类型断言以确保 ElectronAPI 方法可用
declare global {
  interface Window {
    electronAPI: any;
  }
}

export interface InitializationProgress {
  stage: 'clearing' | 'schema' | 'data' | 'services' | 'completed' | 'error';
  progress: number;
  message: string;
  error?: string;
}

export interface InitializationOptions {
  preserveUsers: boolean;
  preserveSettings: boolean;
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
    try {

      // 第一步：清理数据库
      onProgress?.({
        stage: 'clearing',
        progress: 10,
        message: '正在清理数据库...'
      });

      await this.clearDatabase(options);

      onProgress?.({
        stage: 'clearing',
        progress: 30,
        message: '数据库清理完成'
      });

      // 第二步：重建数据库结构
      onProgress?.({
        stage: 'schema',
        progress: 35,
        message: '正在重建数据库结构...'
      });

      await this.rebuildSchema();

      onProgress?.({
        stage: 'schema',
        progress: 50,
        message: '数据库结构重建完成'
      });

      // 第三步：导入内置初始数据
      onProgress?.({
        stage: 'data',
        progress: 55,
        message: '正在导入初始数据...'
      });

      await this.importBuiltinData();

      onProgress?.({
        stage: 'data',
        progress: 75,
        message: '初始数据导入完成'
      });

      // 第四步：重新初始化服务
      onProgress?.({
        stage: 'services',
        progress: 80,
        message: '正在重新初始化系统服务...'
      });

      await this.reinitializeServices(onProgress);

      onProgress?.({
        stage: 'services',
        progress: 95,
        message: '系统服务初始化完成'
      });

      // 完成
      onProgress?.({
        stage: 'completed',
        progress: 100,
        message: '系统初始化完成'
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      
      onProgress?.({
        stage: 'error',
        progress: 0,
        message: '系统初始化失败',
        error: errorMessage
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
   * 导入内置初始数据
   */
  private async importBuiltinData(): Promise<void> {
    try {
      if (!window.electronAPI?.dbImportBuiltinData) {
        throw new Error('导入内置数据功能不可用');
      }

      const result = await window.electronAPI.dbImportBuiltinData();

      if (!result.success) {
        throw new Error(result.error || '导入内置数据失败');
      }
    } catch (error) {
      console.error('导入内置数据失败:', error);
      throw error;
    }
  }

  /**
   * 重新初始化系统服务
   */
  private async reinitializeServices(onProgress?: (progress: InitializationProgress) => void): Promise<void> {
    try {
      console.log('开始重新初始化系统服务...');

      // 重置所有业务服务状态
      businessServiceManager.reset();
      dataInitializer.reset();

      // 重新初始化数据服务（使用新的依赖注入系统）
      await dataInitializer.initializeData({
        forceReinitialize: true
      }, (progress) => {
        // 将数据初始化进度转换为系统初始化进度
        onProgress?.({
          stage: 'services',
          progress: 85 + (progress.progress * 0.1), // 85-95%
          message: `服务初始化: ${progress.message}`
        });
      });

      // 验证服务状态
      const systemStatus = await businessServiceManager.getSystemStatus();
      if (!systemStatus.initialized) {
        throw new Error('业务服务管理器初始化失败');
      }

      if (systemStatus.services.failed > 0) {
        console.warn(`${systemStatus.services.failed} 个服务初始化失败，但系统继续运行`);
      }

      // 验证数据完整性
      const integrityResult = await businessServiceManager.validateSystemIntegrity();
      if (!integrityResult.isValid) {
        const errorIssues = integrityResult.issues.filter(issue => issue.type === 'error');
        if (errorIssues.length > 0) {
          console.warn('发现数据完整性问题:', errorIssues);
        }
      }

      console.log('系统服务重新初始化完成');
      console.log(`- 总服务数: ${systemStatus.services.total}`);
      console.log(`- 健康服务: ${systemStatus.services.healthy}`);
      console.log(`- 失败服务: ${systemStatus.services.failed}`);

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
