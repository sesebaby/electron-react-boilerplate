// 配置管理系统
export interface AppConfig {
  // 应用基础配置
  app: {
    name: string;
    version: string;
    environment: 'development' | 'testing' | 'production';
    debug: boolean;
  };
  
  // 数据库配置
  database: {
    defaultPath: string;
    timeout: number;
    retryAttempts: number;
    backupInterval: number;
  };
  
  // API配置
  api: {
    baseUrl: string;
    timeout: number;
    retryAttempts: number;
    maxConcurrentRequests: number;
  };
  
  // UI配置
  ui: {
    defaultTheme: string;
    pageSize: number;
    animationDuration: number;
    autoSaveInterval: number;
  };
  
  // 日志配置
  logging: {
    level: 'debug' | 'info' | 'warn' | 'error';
    maxFileSize: number;
    maxFiles: number;
    enableRemoteLogging: boolean;
  };
  
  // 安全配置
  security: {
    sessionTimeout: number;
    maxLoginAttempts: number;
    passwordMinLength: number;
    enableAuditLog: boolean;
  };
  
  // 性能配置
  performance: {
    enableVirtualization: boolean;
    maxCacheSize: number;
    debounceDelay: number;
    lazyLoadingThreshold: number;
  };
}

// 默认配置
const defaultConfig: AppConfig = {
  app: {
    name: 'Inventory Management System',
    version: '1.0.0',
    environment: (process.env.NODE_ENV as any) || 'development',
    debug: process.env.NODE_ENV !== 'production'
  },
  
  database: {
    defaultPath: process.env.DB_PATH || 'data/inventory.db',
    timeout: parseInt(process.env.DB_TIMEOUT || '5000'),
    retryAttempts: parseInt(process.env.DB_RETRY_ATTEMPTS || '3'),
    backupInterval: parseInt(process.env.DB_BACKUP_INTERVAL || '86400000') // 24小时
  },
  
  api: {
    baseUrl: process.env.API_BASE_URL || 'http://localhost:3000/api',
    timeout: parseInt(process.env.API_TIMEOUT || '10000'),
    retryAttempts: parseInt(process.env.API_RETRY_ATTEMPTS || '3'),
    maxConcurrentRequests: parseInt(process.env.API_MAX_CONCURRENT || '10')
  },
  
  ui: {
    defaultTheme: process.env.DEFAULT_THEME || 'glass-future',
    pageSize: parseInt(process.env.UI_PAGE_SIZE || '20'),
    animationDuration: parseInt(process.env.UI_ANIMATION_DURATION || '300'),
    autoSaveInterval: parseInt(process.env.UI_AUTO_SAVE_INTERVAL || '30000') // 30秒
  },
  
  logging: {
    level: (process.env.LOG_LEVEL as any) || 'info',
    maxFileSize: parseInt(process.env.LOG_MAX_FILE_SIZE || '10485760'), // 10MB
    maxFiles: parseInt(process.env.LOG_MAX_FILES || '5'),
    enableRemoteLogging: process.env.ENABLE_REMOTE_LOGGING === 'true'
  },
  
  security: {
    sessionTimeout: parseInt(process.env.SESSION_TIMEOUT || '3600000'), // 1小时
    maxLoginAttempts: parseInt(process.env.MAX_LOGIN_ATTEMPTS || '5'),
    passwordMinLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
    enableAuditLog: process.env.ENABLE_AUDIT_LOG !== 'false'
  },
  
  performance: {
    enableVirtualization: process.env.ENABLE_VIRTUALIZATION !== 'false',
    maxCacheSize: parseInt(process.env.MAX_CACHE_SIZE || '100'),
    debounceDelay: parseInt(process.env.DEBOUNCE_DELAY || '300'),
    lazyLoadingThreshold: parseInt(process.env.LAZY_LOADING_THRESHOLD || '10')
  }
};

// 配置管理器
class ConfigManager {
  private config: AppConfig;
  private listeners: Set<(config: AppConfig) => void> = new Set();

  constructor() {
    this.config = { ...defaultConfig };
    this.loadFromLocalStorage();
  }

  // 获取配置
  get(): AppConfig {
    return { ...this.config };
  }

  // 获取指定路径的配置
  getPath<T>(path: string): T | undefined {
    const keys = path.split('.');
    let current: any = this.config;
    
    for (const key of keys) {
      if (current && typeof current === 'object' && key in current) {
        current = current[key];
      } else {
        return undefined;
      }
    }
    
    return current as T;
  }

  // 更新配置
  update(updates: Partial<AppConfig>): void {
    this.config = this.mergeDeep(this.config, updates);
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  // 更新指定路径的配置
  updatePath(path: string, value: any): void {
    const keys = path.split('.');
    const updates: any = {};
    let current = updates;
    
    for (let i = 0; i < keys.length - 1; i++) {
      current[keys[i]] = {};
      current = current[keys[i]];
    }
    
    current[keys[keys.length - 1]] = value;
    this.update(updates);
  }

  // 重置配置
  reset(): void {
    this.config = { ...defaultConfig };
    this.saveToLocalStorage();
    this.notifyListeners();
  }

  // 添加配置变更监听器
  addListener(listener: (config: AppConfig) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // 从localStorage加载配置
  private loadFromLocalStorage(): void {
    try {
      const stored = localStorage.getItem('app-config');
      if (stored) {
        const storedConfig = JSON.parse(stored);
        this.config = this.mergeDeep(this.config, storedConfig);
      }
    } catch (error) {
      console.warn('Failed to load config from localStorage:', error);
    }
  }

  // 保存配置到localStorage
  private saveToLocalStorage(): void {
    try {
      localStorage.setItem('app-config', JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to save config to localStorage:', error);
    }
  }

  // 通知监听器
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.config);
      } catch (error) {
        console.error('Config listener error:', error);
      }
    });
  }

  // 深度合并对象
  private mergeDeep(target: any, source: any): any {
    const result = { ...target };
    
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = this.mergeDeep(target[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
    
    return result;
  }
}

// 全局配置实例
export const configManager = new ConfigManager();

// 便捷函数
export const getConfig = () => configManager.get();
export const getConfigPath = <T>(path: string) => configManager.getPath<T>(path);
export const updateConfig = (updates: Partial<AppConfig>) => configManager.update(updates);
export const updateConfigPath = (path: string, value: any) => configManager.updatePath(path, value);

// 环境变量验证
export const validateEnvironment = (): string[] => {
  const errors: string[] = [];
  
  // 检查必需的环境变量
  const requiredEnvVars: string[] = [
    // 可以根据需要添加必需的环境变量
  ];
  
  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      errors.push(`Missing required environment variable: ${envVar}`);
    }
  }
  
  // 验证数值型环境变量
  const numericEnvVars = [
    'DB_TIMEOUT',
    'API_TIMEOUT',
    'UI_PAGE_SIZE'
  ];
  
  for (const envVar of numericEnvVars) {
    const value = process.env[envVar];
    if (value && isNaN(Number(value))) {
      errors.push(`Invalid numeric value for environment variable ${envVar}: ${value}`);
    }
  }
  
  return errors;
};

export default configManager;