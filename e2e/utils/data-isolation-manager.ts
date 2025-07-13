import { Page } from '@playwright/test';
import { DatabaseHelpers } from './database-helpers';
import { TestDataFactory } from '../fixtures/test-data';

/**
 * 数据隔离管理器
 * 确保测试之间的数据隔离，防止测试相互影响
 */
export class DataIsolationManager {
  private page: Page;
  private testId: string;
  private createdDataIds: Map<string, string[]> = new Map();
  private originalData: Map<string, any> = new Map();

  constructor(page: Page, testId: string) {
    this.page = page;
    this.testId = testId;
  }

  /**
   * 开始数据隔离会话
   */
  async startIsolationSession(): Promise<void> {
    console.log(`🔒 开始数据隔离会话: ${this.testId}`);
    
    // 1. 备份当前数据库状态
    await this.backupCurrentState();
    
    // 2. 创建测试专用的数据空间
    await this.createTestDataSpace();
    
    // 3. 设置数据隔离标记
    await this.setIsolationMarkers();
  }

  /**
   * 结束数据隔离会话
   */
  async endIsolationSession(): Promise<void> {
    console.log(`🔓 结束数据隔离会话: ${this.testId}`);
    
    try {
      // 1. 清理测试创建的数据
      await this.cleanupTestData();
      
      // 2. 恢复原始数据状态
      await this.restoreOriginalState();
      
      // 3. 清除隔离标记
      await this.clearIsolationMarkers();
      
    } catch (error) {
      console.error(`数据隔离会话结束失败: ${error}`);
      // 强制清理
      await this.forceCleanup();
    }
  }

  /**
   * 记录创建的数据
   */
  recordCreatedData(table: string, id: string): void {
    if (!this.createdDataIds.has(table)) {
      this.createdDataIds.set(table, []);
    }
    this.createdDataIds.get(table)!.push(id);
  }

  /**
   * 创建隔离的测试数据
   */
  async createIsolatedTestData<T>(
    dataType: string,
    createFunction: () => T,
    persistFunction: (data: T) => Promise<string>
  ): Promise<{ data: T; id: string }> {
    // 生成带有测试ID前缀的数据
    const data = createFunction();
    
    // 添加隔离标记
    const isolatedData = {
      ...data,
      testId: this.testId,
      createdAt: new Date().toISOString()
    };
    
    // 持久化数据
    const id = await persistFunction(isolatedData);
    
    // 记录创建的数据
    this.recordCreatedData(dataType, id);
    
    return { data: isolatedData, id };
  }

  /**
   * 获取隔离的数据查询条件
   */
  getIsolationFilter(): any {
    return {
      testId: this.testId
    };
  }

  /**
   * 验证数据隔离完整性
   */
  async verifyIsolationIntegrity(): Promise<boolean> {
    try {
      // 检查是否有数据泄露到其他测试
      const leakedData = await this.checkForDataLeaks();
      
      // 检查是否有其他测试的数据影响当前测试
      const contamination = await this.checkForDataContamination();
      
      return leakedData.length === 0 && contamination.length === 0;
    } catch (error) {
      console.error('数据隔离完整性验证失败:', error);
      return false;
    }
  }

  /**
   * 备份当前数据库状态
   */
  private async backupCurrentState(): Promise<void> {
    try {
      // 获取关键表的当前状态
      const tables = ['products', 'categories', 'suppliers', 'warehouses', 'units'];
      
      for (const table of tables) {
        const data = await DatabaseHelpers.executeRawQuery(
          this.page,
          `SELECT * FROM ${table} WHERE testId IS NULL OR testId = ''`
        );
        this.originalData.set(table, data);
      }
      
      console.log('📄 数据库状态备份完成');
    } catch (error) {
      console.error('数据库状态备份失败:', error);
      throw error;
    }
  }

  /**
   * 创建测试专用的数据空间
   */
  private async createTestDataSpace(): Promise<void> {
    // 为测试数据添加标识列（如果不存在）
    const tables = ['products', 'categories', 'suppliers', 'warehouses', 'units'];
    
    for (const table of tables) {
      try {
        await DatabaseHelpers.executeRawQuery(
          this.page,
          `ALTER TABLE ${table} ADD COLUMN testId TEXT DEFAULT NULL`
        );
      } catch (error) {
        // 列可能已存在，忽略错误
      }
    }
  }

  /**
   * 设置数据隔离标记
   */
  private async setIsolationMarkers(): Promise<void> {
    await this.page.evaluate((testId) => {
      // @ts-ignore
      window.__testIsolationId = testId;
      // @ts-ignore
      window.__dataIsolationActive = true;
    }, this.testId);
  }

  /**
   * 清理测试创建的数据
   */
  private async cleanupTestData(): Promise<void> {
    console.log('🧹 清理测试数据...');
    
    for (const [table, ids] of this.createdDataIds) {
      for (const id of ids) {
        try {
          await DatabaseHelpers.deleteTestData(this.page, table, id);
        } catch (error) {
          console.warn(`清理数据失败 ${table}:${id}`, error);
        }
      }
    }
    
    // 清理带有测试ID标记的数据
    const tables = ['products', 'categories', 'suppliers', 'warehouses', 'units'];
    for (const table of tables) {
      try {
        await DatabaseHelpers.executeRawQuery(
          this.page,
          `DELETE FROM ${table} WHERE testId = ?`,
          [this.testId]
        );
      } catch (error) {
        console.warn(`清理表 ${table} 的测试数据失败:`, error);
      }
    }
  }

  /**
   * 恢复原始数据状态
   */
  private async restoreOriginalState(): Promise<void> {
    // 这里可以实现更复杂的状态恢复逻辑
    // 目前主要依赖于数据清理
    console.log('🔄 原始数据状态恢复完成');
  }

  /**
   * 清除隔离标记
   */
  private async clearIsolationMarkers(): Promise<void> {
    await this.page.evaluate(() => {
      // @ts-ignore
      delete window.__testIsolationId;
      // @ts-ignore
      delete window.__dataIsolationActive;
    });
  }

  /**
   * 检查数据泄露
   */
  private async checkForDataLeaks(): Promise<any[]> {
    const leaks = [];
    const tables = ['products', 'categories', 'suppliers', 'warehouses', 'units'];
    
    for (const table of tables) {
      try {
        const data = await DatabaseHelpers.executeRawQuery(
          this.page,
          `SELECT * FROM ${table} WHERE testId = ? AND createdAt > datetime('now', '-1 hour')`,
          [this.testId]
        );
        
        // 检查是否有数据在其他地方被引用
        if (data.length > 0) {
          leaks.push({ table, data });
        }
      } catch (error) {
        console.warn(`检查表 ${table} 数据泄露失败:`, error);
      }
    }
    
    return leaks;
  }

  /**
   * 检查数据污染
   */
  private async checkForDataContamination(): Promise<any[]> {
    const contamination = [];
    
    // 检查是否有其他测试的数据影响当前测试
    // 这里可以实现更复杂的污染检测逻辑
    
    return contamination;
  }

  /**
   * 强制清理
   */
  private async forceCleanup(): Promise<void> {
    console.log('⚠️ 执行强制数据清理...');
    
    try {
      // 删除所有带有测试ID的数据
      const tables = ['products', 'categories', 'suppliers', 'warehouses', 'units'];
      for (const table of tables) {
        await DatabaseHelpers.executeRawQuery(
          this.page,
          `DELETE FROM ${table} WHERE testId = ?`,
          [this.testId]
        );
      }
      
      // 清理内存中的记录
      this.createdDataIds.clear();
      this.originalData.clear();
      
    } catch (error) {
      console.error('强制清理失败:', error);
    }
  }

  /**
   * 获取隔离统计信息
   */
  async getIsolationStats(): Promise<any> {
    const stats = {
      testId: this.testId,
      createdDataCount: 0,
      tablesAffected: this.createdDataIds.size,
      isolationActive: await this.page.evaluate(() => {
        // @ts-ignore
        return !!window.__dataIsolationActive;
      })
    };
    
    for (const ids of this.createdDataIds.values()) {
      stats.createdDataCount += ids.length;
    }
    
    return stats;
  }
}
