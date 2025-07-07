/**
 * 并发管理器
 * 用于处理并发操作和互斥锁
 */

/**
 * 互斥锁实现
 */
class Mutex {
  private locked = false;
  private waitingQueue: Array<() => void> = [];

  async acquire(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.locked) {
        this.locked = true;
        resolve();
      } else {
        this.waitingQueue.push(resolve);
      }
    });
  }

  release(): void {
    if (this.waitingQueue.length > 0) {
      const next = this.waitingQueue.shift();
      if (next) {
        next();
      }
    } else {
      this.locked = false;
    }
  }

  isLocked(): boolean {
    return this.locked;
  }
}

/**
 * 并发管理器类
 */
export class ConcurrencyManager {
  private static mutexes = new Map<string, Mutex>();

  /**
   * 获取或创建互斥锁
   */
  private static getMutex(key: string): Mutex {
    if (!this.mutexes.has(key)) {
      this.mutexes.set(key, new Mutex());
    }
    return this.mutexes.get(key)!;
  }

  /**
   * 使用互斥锁执行操作
   */
  static async withMutex<T>(key: string, operation: () => Promise<T>): Promise<T> {
    const mutex = this.getMutex(key);
    
    await mutex.acquire();
    try {
      return await operation();
    } finally {
      mutex.release();
    }
  }

  /**
   * 检查锁是否被占用
   */
  static isLocked(key: string): boolean {
    const mutex = this.mutexes.get(key);
    return mutex ? mutex.isLocked() : false;
  }

  /**
   * 清理未使用的锁
   */
  static cleanup(): void {
    for (const [key, mutex] of this.mutexes.entries()) {
      if (!mutex.isLocked()) {
        this.mutexes.delete(key);
      }
    }
  }

  /**
   * 获取当前锁的数量
   */
  static getLockCount(): number {
    return this.mutexes.size;
  }
}

export default ConcurrencyManager;
