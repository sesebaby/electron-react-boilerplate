/**
 * 简化的数据访问层
 * 直接使用数据库连接，移除复杂的仓储抽象
 */

import { ElectronDatabase } from '../database/electronDatabase';

/**
 * 数据库实例管理
 * 使用简单的单例模式
 */
class DatabaseManager {
  private static instance: ElectronDatabase | null = null;
  private static initPromise: Promise<ElectronDatabase> | null = null;

  static async getInstance(): Promise<ElectronDatabase> {
    if (this.instance) {
      return this.instance;
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this.initialize();
    return this.initPromise;
  }

  private static async initialize(): Promise<ElectronDatabase> {
    if (!this.instance) {
      this.instance = new ElectronDatabase();
      await this.instance.initialize();
    }
    return this.instance;
  }

  static async close(): Promise<void> {
    if (this.instance) {
      await this.instance.close();
      this.instance = null;
      this.initPromise = null;
    }
  }
}

export { DatabaseManager };