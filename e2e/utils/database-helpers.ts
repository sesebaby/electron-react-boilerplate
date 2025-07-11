import { Page } from '@playwright/test';

/**
 * 数据库测试辅助工具
 * 专门用于测试数据库相关操作
 */
export class DatabaseHelpers {
  
  /**
   * 初始化测试数据库
   */
  static async initializeTestDatabase(page: Page): Promise<void> {
    const result = await page.evaluate(async () => {
      // @ts-ignore
      return await window.electronAPI?.dbInitialize?.();
    });

    if (!result?.success) {
      throw new Error(`数据库初始化失败: ${result?.error}`);
    }
  }

  /**
   * 清空数据库
   */
  static async clearDatabase(page: Page, options: {
    preserveUsers?: boolean;
    preserveSettings?: boolean;
  } = {}): Promise<void> {
    const result = await page.evaluate(async (opts) => {
      // @ts-ignore
      return await window.electronAPI?.dbClearDatabase?.(opts);
    }, options);

    if (!result?.success) {
      throw new Error(`数据库清空失败: ${result?.error}`);
    }
  }

  /**
   * 重建数据库架构
   */
  static async rebuildSchema(page: Page): Promise<void> {
    const result = await page.evaluate(async () => {
      // @ts-ignore
      return await window.electronAPI?.dbRebuildSchema?.();
    });

    if (!result?.success) {
      throw new Error(`数据库架构重建失败: ${result?.error}`);
    }
  }

  /**
   * 导入内置数据
   */
  static async importBuiltinData(page: Page): Promise<void> {
    const result = await page.evaluate(async () => {
      // @ts-ignore
      return await window.electronAPI?.dbImportBuiltinData?.();
    });

    if (!result?.success) {
      throw new Error(`内置数据导入失败: ${result?.error}`);
    }
  }

  /**
   * 验证数据库完整性
   */
  static async validateIntegrity(page: Page): Promise<any> {
    const result = await page.evaluate(async () => {
      // @ts-ignore
      return await window.electronAPI?.dbValidateIntegrity?.();
    });

    if (!result?.success) {
      throw new Error(`数据库完整性验证失败: ${result?.error}`);
    }

    return result.data;
  }

  /**
   * 获取表统计信息
   */
  static async getTableStats(page: Page): Promise<Record<string, number>> {
    const result = await page.evaluate(async () => {
      // @ts-ignore
      return await window.electronAPI?.dbGetTableStats?.();
    });

    if (!result?.success) {
      throw new Error(`获取表统计信息失败: ${result?.error}`);
    }

    return result.data;
  }

  /**
   * 执行原始SQL查询（仅用于测试）
   */
  static async executeRawQuery(page: Page, sql: string, params: any[] = []): Promise<any> {
    const result = await page.evaluate(async ({ sql, params }) => {
      // @ts-ignore
      return await window.electronAPI?.dbExecuteRawQuery?.(sql, params);
    }, { sql, params });

    if (!result?.success) {
      throw new Error(`SQL查询执行失败: ${result?.error}`);
    }

    return result.data;
  }

  /**
   * 创建测试商品
   */
  static async createTestProduct(page: Page, productData: any): Promise<string> {
    const result = await page.evaluate(async (data) => {
      // @ts-ignore
      return await window.electronAPI?.dbCreateItem?.(data);
    }, productData);

    if (!result?.success) {
      throw new Error(`创建测试商品失败: ${result?.error}`);
    }

    return result.data.id;
  }

  /**
   * 创建测试分类
   */
  static async createTestCategory(page: Page, categoryData: any): Promise<string> {
    const result = await page.evaluate(async (data) => {
      // @ts-ignore
      return await window.electronAPI?.dbCreateCategory?.(data);
    }, categoryData);

    if (!result?.success) {
      throw new Error(`创建测试分类失败: ${result?.error}`);
    }

    return result.data.id;
  }

  /**
   * 创建测试供应商
   */
  static async createTestSupplier(page: Page, supplierData: any): Promise<string> {
    const result = await page.evaluate(async (data) => {
      // @ts-ignore
      return await window.electronAPI?.dbCreateSupplier?.(data);
    }, supplierData);

    if (!result?.success) {
      throw new Error(`创建测试供应商失败: ${result?.error}`);
    }

    return result.data.id;
  }

  /**
   * 创建测试仓库
   */
  static async createTestWarehouse(page: Page, warehouseData: any): Promise<string> {
    const result = await page.evaluate(async (data) => {
      // @ts-ignore
      return await window.electronAPI?.dbCreateWarehouse?.(data);
    }, warehouseData);

    if (!result?.success) {
      throw new Error(`创建测试仓库失败: ${result?.error}`);
    }

    return result.data.id;
  }

  /**
   * 删除测试数据
   */
  static async deleteTestData(page: Page, table: string, id: string): Promise<void> {
    const result = await page.evaluate(async ({ table, id }) => {
      // @ts-ignore
      const methodName = `dbDelete${table.charAt(0).toUpperCase() + table.slice(1)}`;
      // @ts-ignore
      return await window.electronAPI?.[methodName]?.(id);
    }, { table, id });

    if (!result?.success) {
      throw new Error(`删除测试数据失败: ${result?.error}`);
    }
  }

  /**
   * 验证数据存在
   */
  static async verifyDataExists(page: Page, table: string, id: string): Promise<boolean> {
    const result = await page.evaluate(async ({ table, id }) => {
      // @ts-ignore
      const methodName = `dbGet${table.charAt(0).toUpperCase() + table.slice(1)}`;
      // @ts-ignore
      return await window.electronAPI?.[methodName]?.(id);
    }, { table, id });

    return result?.success && result?.data;
  }

  /**
   * 等待数据库操作完成
   */
  static async waitForDatabaseOperation(page: Page, timeout: number = 10000): Promise<void> {
    await page.waitForFunction(
      () => {
        // 检查是否有正在进行的数据库操作
        // @ts-ignore
        return !window.__dbOperationInProgress;
      },
      { timeout }
    );
  }

  /**
   * 模拟数据库错误
   */
  static async simulateDatabaseError(page: Page, errorType: 'connection' | 'timeout' | 'constraint'): Promise<void> {
    await page.evaluate((type) => {
      // @ts-ignore
      window.__simulateDbError = type;
    }, errorType);
  }

  /**
   * 清除数据库错误模拟
   */
  static async clearDatabaseErrorSimulation(page: Page): Promise<void> {
    await page.evaluate(() => {
      // @ts-ignore
      delete window.__simulateDbError;
    });
  }

  /**
   * 获取数据库性能指标
   */
  static async getDatabaseMetrics(page: Page): Promise<any> {
    const result = await page.evaluate(async () => {
      // @ts-ignore
      return await window.electronAPI?.dbGetMetrics?.();
    });

    if (!result?.success) {
      throw new Error(`获取数据库性能指标失败: ${result?.error}`);
    }

    return result.data;
  }

  /**
   * 备份数据库
   */
  static async backupDatabase(page: Page, backupPath?: string): Promise<string> {
    const result = await page.evaluate(async (path) => {
      // @ts-ignore
      return await window.electronAPI?.dbBackup?.(path);
    }, backupPath);

    if (!result?.success) {
      throw new Error(`数据库备份失败: ${result?.error}`);
    }

    return result.data.backupPath;
  }

  /**
   * 恢复数据库
   */
  static async restoreDatabase(page: Page, backupPath: string): Promise<void> {
    const result = await page.evaluate(async (path) => {
      // @ts-ignore
      return await window.electronAPI?.dbRestore?.(path);
    }, backupPath);

    if (!result?.success) {
      throw new Error(`数据库恢复失败: ${result?.error}`);
    }
  }
}
