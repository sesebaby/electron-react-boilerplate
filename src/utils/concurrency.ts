// 并发控制工具

// 互斥锁实现
export class Mutex {
  private _queue: Array<(release: () => void) => void> = [];
  private _locked = false;

  async acquire(): Promise<() => void> {
    return new Promise<() => void>((resolve) => {
      this._queue.push(resolve);
      this._dispatch();
    });
  }

  private _dispatch(): void {
    if (this._locked || this._queue.length === 0) {
      return;
    }

    this._locked = true;
    const nextCallback = this._queue.shift()!;
    
    const release = () => {
      this._locked = false;
      this._dispatch();
    };

    nextCallback(release);
  }

  async withLock<T>(operation: () => Promise<T> | T): Promise<T> {
    const release = await this.acquire();
    try {
      return await operation();
    } finally {
      release();
    }
  }
}

// 信号量实现
export class Semaphore {
  private _permits: number;
  private _queue: Array<(release: () => void) => void> = [];

  constructor(permits: number) {
    this._permits = permits;
  }

  async acquire(): Promise<() => void> {
    return new Promise<() => void>((resolve) => {
      this._queue.push(resolve);
      this._dispatch();
    });
  }

  private _dispatch(): void {
    if (this._permits <= 0 || this._queue.length === 0) {
      return;
    }

    this._permits--;
    const nextCallback = this._queue.shift()!;
    
    const release = () => {
      this._permits++;
      this._dispatch();
    };

    nextCallback(release);
  }

  async withPermit<T>(operation: () => Promise<T> | T): Promise<T> {
    const release = await this.acquire();
    try {
      return await operation();
    } finally {
      release();
    }
  }
}

// 操作防抖
export class OperationDebouncer {
  private _timeouts = new Map<string, NodeJS.Timeout>();

  debounce<T extends any[]>(
    key: string,
    operation: (...args: T) => void,
    delay: number
  ): (...args: T) => void {
    return (...args: T) => {
      const existingTimeout = this._timeouts.get(key);
      if (existingTimeout) {
        clearTimeout(existingTimeout);
      }

      const timeout = setTimeout(() => {
        operation(...args);
        this._timeouts.delete(key);
      }, delay);

      this._timeouts.set(key, timeout);
    };
  }

  cancel(key: string): void {
    const timeout = this._timeouts.get(key);
    if (timeout) {
      clearTimeout(timeout);
      this._timeouts.delete(key);
    }
  }

  cancelAll(): void {
    this._timeouts.forEach((timeout) => clearTimeout(timeout));
    this._timeouts.clear();
  }
}

// 重试操作
export class RetryOperation {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxRetries = 3,
    delayMs = 1000,
    backoffMultiplier = 2
  ): Promise<T> {
    let lastError: Error;
    let delay = delayMs;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // 等待重试
        await new Promise(resolve => setTimeout(resolve, delay));
        delay *= backoffMultiplier;
      }
    }
    
    throw lastError!;
  }
}

// 并发控制管理器
export class ConcurrencyManager {
  private static _mutexes = new Map<string, Mutex>();
  private static _semaphores = new Map<string, Semaphore>();

  static getMutex(key: string): Mutex {
    if (!this._mutexes.has(key)) {
      this._mutexes.set(key, new Mutex());
    }
    return this._mutexes.get(key)!;
  }

  static getSemaphore(key: string, permits: number): Semaphore {
    if (!this._semaphores.has(key)) {
      this._semaphores.set(key, new Semaphore(permits));
    }
    return this._semaphores.get(key)!;
  }

  static async withMutex<T>(
    key: string,
    operation: () => Promise<T> | T
  ): Promise<T> {
    const mutex = this.getMutex(key);
    return mutex.withLock(operation);
  }

  static async withSemaphore<T>(
    key: string,
    permits: number,
    operation: () => Promise<T> | T
  ): Promise<T> {
    const semaphore = this.getSemaphore(key, permits);
    return semaphore.withPermit(operation);
  }
}

// 操作锁管理器
export class OperationLockManager {
  private static _locks = new Map<string, Promise<any>>();

  static async withOperationLock<T>(
    key: string,
    operation: () => Promise<T>
  ): Promise<T> {
    // 如果已经有相同的操作在进行，等待它完成
    const existingOperation = this._locks.get(key);
    if (existingOperation) {
      await existingOperation;
    }

    // 执行新操作
    const promise = operation();
    this._locks.set(key, promise);

    try {
      const result = await promise;
      return result;
    } finally {
      // 操作完成后移除锁
      this._locks.delete(key);
    }
  }

  static isOperationInProgress(key: string): boolean {
    return this._locks.has(key);
  }

  static async waitForOperation(key: string): Promise<void> {
    const operation = this._locks.get(key);
    if (operation) {
      await operation;
    }
  }
}

// 分布式锁（模拟）
export class DistributedLock {
  private static _locks = new Map<string, { owner: string; expiry: number }>();
  private _instanceId: string;

  constructor(instanceId?: string) {
    this._instanceId = instanceId || `instance-${Date.now()}-${Math.random()}`;
  }

  async acquire(key: string, ttlMs = 30000): Promise<boolean> {
    const now = Date.now();
    const existingLock = DistributedLock._locks.get(key);

    // 检查锁是否过期
    if (existingLock && existingLock.expiry > now) {
      return false; // 锁被其他实例持有
    }

    // 获取锁
    DistributedLock._locks.set(key, {
      owner: this._instanceId,
      expiry: now + ttlMs
    });

    return true;
  }

  release(key: string): boolean {
    const lock = DistributedLock._locks.get(key);
    if (!lock || lock.owner !== this._instanceId) {
      return false; // 只有锁的所有者才能释放
    }

    DistributedLock._locks.delete(key);
    return true;
  }

  async withLock<T>(
    key: string,
    operation: () => Promise<T> | T,
    ttlMs = 30000,
    maxWaitMs = 10000
  ): Promise<T> {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitMs) {
      if (await this.acquire(key, ttlMs)) {
        try {
          return await operation();
        } finally {
          this.release(key);
        }
      }
      
      // 等待一段时间后重试
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    throw new Error(`Failed to acquire lock for key: ${key}`);
  }
}