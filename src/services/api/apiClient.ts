import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/logger';
import { performanceMonitor } from '../../utils/performanceMonitor';

// 扩展Axios配置类型以支持metadata
declare module 'axios' {
  interface InternalAxiosRequestConfig {
    metadata?: {
      requestId: string;
      startTime: Date;
      logEntry: ApiLogEntry;
    };
  }
}

export interface ApiConfig {
  baseURL: string;
  timeout: number;
  headers?: Record<string, string>;
}

export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface ApiLogEntry {
  requestId: string;
  method: string;
  url: string;
  baseURL?: string;
  fullUrl: string;
  requestTime: Date;
  responseTime?: Date;
  duration?: number;
  status?: number;
  statusText?: string;
  requestHeaders?: Record<string, any>;
  responseHeaders?: Record<string, any>;
  requestData?: any;
  responseData?: any;
  error?: string;
  success: boolean;
  userAgent: string;
  userId?: string | null;
}

class ApiClient {
  private client: AxiosInstance;
  private config: ApiConfig;
  private encryptionKey: string;
  private enableApiLogging: boolean = true;
  private logSensitiveData: boolean = false;
  private currentUserId: string | null = null;

  constructor(config: ApiConfig) {
    this.config = config;
    this.encryptionKey = this.getOrCreateEncryptionKey();
    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      }
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        // Add request ID for tracking
        const requestId = uuidv4();
        config.metadata = { 
          requestId, 
          startTime: new Date(),
          logEntry: this.createInitialLogEntry(config, requestId)
        };

        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        // Log request start
        if (this.enableApiLogging) {
          this.logRequestStart(config);
        }
        
        return config;
      },
      (error) => {
        // Log request error
        if (this.enableApiLogging) {
          this.logRequestError(error);
        }
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        // Log successful response
        if (this.enableApiLogging) {
          this.logResponseSuccess(response);
        }
        return response;
      },
      (error) => {
        // Log response error
        if (this.enableApiLogging) {
          this.logResponseError(error);
        }
        
        if (error.response?.status === 401) {
          // Handle unauthorized access
          this.handleUnauthorized();
        }
        
        return Promise.reject(this.formatError(error));
      }
    );
  }

  private getOrCreateEncryptionKey(): string {
    let key = sessionStorage.getItem('_app_key');
    if (!key) {
      key = uuidv4().replace(/-/g, '');
      sessionStorage.setItem('_app_key', key);
    }
    return key;
  }

  private encryptToken(token: string): string {
    try {
      const encrypted = btoa(token + '|' + this.encryptionKey.slice(0, 8));
      return encrypted;
    } catch (error) {
      logger.warn('Token encryption failed, using fallback');
      return btoa(token);
    }
  }

  private decryptToken(encryptedToken: string): string | null {
    try {
      const decoded = atob(encryptedToken);
      const parts = decoded.split('|');
      if (parts.length === 2 && parts[1] === this.encryptionKey.slice(0, 8)) {
        return parts[0];
      }
      // Fallback for old tokens
      return decoded.includes('|') ? null : decoded;
    } catch (error) {
      logger.warn('Token decryption failed');
      return null;
    }
  }

  private getAuthToken(): string | null {
    try {
      const encryptedToken = localStorage.getItem('_auth_data');
      if (!encryptedToken) {
        return null;
      }
      return this.decryptToken(encryptedToken);
    } catch (error) {
      logger.warn('Error retrieving auth token');
      this.clearAuthToken();
      return null;
    }
  }

  /**
   * 创建初始日志条目
   */
  private createInitialLogEntry(config: InternalAxiosRequestConfig, requestId: string): ApiLogEntry {
    const fullUrl = `${config.baseURL || this.config.baseURL}${config.url}`;
    
    return {
      requestId,
      method: (config.method || 'GET').toUpperCase(),
      url: config.url || '',
      baseURL: config.baseURL || this.config.baseURL,
      fullUrl,
      requestTime: new Date(),
      requestHeaders: this.sanitizeHeaders(config.headers),
      requestData: this.logSensitiveData ? config.data : this.sanitizeRequestData(config.data),
      success: false,
      userAgent: navigator.userAgent,
      userId: this.currentUserId
    };
  }

  /**
   * 记录请求开始
   */
  private logRequestStart(config: InternalAxiosRequestConfig): void {
    const logEntry = config.metadata?.logEntry;
    if (!logEntry) return;

    // 开始性能监控
    performanceMonitor.startApiCall(
      logEntry.requestId,
      logEntry.fullUrl,
      logEntry.method
    );

    logger.info(`API Request Started: ${logEntry.method} ${logEntry.fullUrl}`, {
      requestId: logEntry.requestId,
      method: logEntry.method,
      url: logEntry.fullUrl,
      headers: logEntry.requestHeaders,
      data: logEntry.requestData,
      userId: this.currentUserId
    }, 'ApiClient');
  }

  /**
   * 记录请求错误
   */
  private logRequestError(error: any): void {
    logger.error('API Request Error (before sending)', {
      error: error.message || 'Unknown request error',
      stack: error.stack,
      userId: this.currentUserId
    }, 'ApiClient');
  }

  /**
   * 记录响应成功
   */
  private logResponseSuccess(response: AxiosResponse): void {
    const config = response.config;
    const startTime = config.metadata?.startTime;
    const requestId = config.metadata?.requestId;
    const endTime = new Date();
    const duration = startTime ? endTime.getTime() - startTime.getTime() : undefined;

    const logEntry: ApiLogEntry = {
      requestId: requestId || 'unknown',
      method: (config.method || 'GET').toUpperCase(),
      url: config.url || '',
      baseURL: config.baseURL || this.config.baseURL,
      fullUrl: `${config.baseURL || this.config.baseURL}${config.url}`,
      requestTime: startTime || endTime,
      responseTime: endTime,
      duration,
      status: response.status,
      statusText: response.statusText,
      requestHeaders: this.sanitizeHeaders(config.headers),
      responseHeaders: this.sanitizeHeaders(response.headers),
      requestData: this.logSensitiveData ? config.data : this.sanitizeRequestData(config.data),
      responseData: this.logSensitiveData ? response.data : this.sanitizeResponseData(response.data),
      success: true,
      userAgent: navigator.userAgent,
      userId: this.currentUserId
    };

    // 结束性能监控
    if (requestId && duration !== undefined) {
      performanceMonitor.endApiCall(
        requestId,
        logEntry.fullUrl,
        logEntry.method,
        response.status,
        this.getResponseSize(response)
      );
    }

    logger.info(`API Request Success: ${logEntry.method} ${logEntry.fullUrl} (${duration}ms)`, logEntry, 'ApiClient');
  }

  /**
   * 记录响应错误
   */
  private logResponseError(error: any): void {
    const config = error.config;
    const response = error.response;
    const startTime = config?.metadata?.startTime;
    const requestId = config?.metadata?.requestId;
    const endTime = new Date();
    const duration = startTime ? endTime.getTime() - startTime.getTime() : undefined;

    const logEntry: ApiLogEntry = {
      requestId: requestId || 'unknown',
      method: (config?.method || 'GET').toUpperCase(),
      url: config?.url || '',
      baseURL: config?.baseURL || this.config.baseURL,
      fullUrl: config ? `${config.baseURL || this.config.baseURL}${config.url}` : 'unknown',
      requestTime: startTime || endTime,
      responseTime: endTime,
      duration,
      status: response?.status,
      statusText: response?.statusText,
      requestHeaders: config ? this.sanitizeHeaders(config.headers) : undefined,
      responseHeaders: response ? this.sanitizeHeaders(response.headers) : undefined,
      requestData: config && this.logSensitiveData ? config.data : this.sanitizeRequestData(config?.data),
      responseData: response && this.logSensitiveData ? response.data : this.sanitizeResponseData(response?.data),
      error: this.formatErrorMessage(error),
      success: false,
      userAgent: navigator.userAgent,
      userId: this.currentUserId
    };

    // 结束性能监控
    if (requestId && duration !== undefined) {
      performanceMonitor.endApiCall(
        requestId,
        logEntry.fullUrl,
        logEntry.method,
        response?.status || 0,
        response ? this.getResponseSize({ data: response.data, headers: response.headers } as any) : 0
      );
    }

    logger.error(`API Request Failed: ${logEntry.method} ${logEntry.fullUrl} (${duration}ms)`, logEntry, 'ApiClient');
  }

  /**
   * 清理敏感头信息
   */
  private sanitizeHeaders(headers: any): Record<string, any> {
    if (!headers) return {};
    
    const sanitized = { ...headers };
    const sensitiveKeys = ['authorization', 'auth', 'cookie', 'set-cookie', 'x-api-key', 'x-auth-token'];
    
    for (const key of sensitiveKeys) {
      const lowerKey = key.toLowerCase();
      for (const headerKey of Object.keys(sanitized)) {
        if (headerKey.toLowerCase() === lowerKey) {
          sanitized[headerKey] = '[REDACTED]';
        }
      }
    }
    
    return sanitized;
  }

  /**
   * 清理请求数据中的敏感信息
   */
  private sanitizeRequestData(data: any): any {
    if (!data) return data;
    
    if (typeof data !== 'object') return '[DATA]';
    
    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'token', 'auth', 'secret', 'key', 'pin', 'ssn', 'credit'];
    
    for (const key of sensitiveKeys) {
      if (sanitized[key] !== undefined) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * 清理响应数据中的敏感信息
   */
  private sanitizeResponseData(data: any): any {
    if (!data) return data;
    
    // 限制响应数据大小
    const dataStr = JSON.stringify(data);
    if (dataStr.length > 10000) {
      return '[LARGE_RESPONSE]';
    }
    
    if (typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'token', 'auth', 'secret', 'key', 'pin', 'ssn', 'credit'];
    
    for (const key of sensitiveKeys) {
      if (sanitized[key] !== undefined) {
        sanitized[key] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * 格式化错误消息
   */
  private formatErrorMessage(error: any): string {
    if (error.response) {
      return `${error.response.status} ${error.response.statusText}: ${error.response.data?.message || 'Request failed'}`;
    } else if (error.request) {
      return 'Network error: No response from server';
    } else {
      return error.message || 'Unknown error';
    }
  }

  private handleUnauthorized() {
    // Clear auth token and redirect to login
    this.clearAuthToken();
    // Emit event or call callback for unauthorized access
    logger.warn('Unauthorized access detected, clearing tokens', {
      userId: this.currentUserId,
      url: window.location.href
    }, 'ApiClient');
  }

  private formatError(error: any): Error {
    if (error.response) {
      // Server responded with error status
      const message = error.response.data?.message || error.response.statusText || 'Request failed';
      return new Error(`${error.response.status}: ${message}`);
    } else if (error.request) {
      // Request was made but no response received
      return new Error('Network error: No response from server');
    } else {
      // Something else happened
      return new Error(error.message || 'Request failed');
    }
  }

  async get<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.get(url, config);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        data: null as any,
        error: error instanceof Error ? error.message : 'GET request failed'
      };
    }
  }

  async post<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.post(url, data, config);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        data: null as any,
        error: error instanceof Error ? error.message : 'POST request failed'
      };
    }
  }

  async put<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.put(url, data, config);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        data: null as any,
        error: error instanceof Error ? error.message : 'PUT request failed'
      };
    }
  }

  async delete<T = any>(url: string, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.delete(url, config);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        data: null as any,
        error: error instanceof Error ? error.message : 'DELETE request failed'
      };
    }
  }

  async patch<T = any>(url: string, data?: any, config?: AxiosRequestConfig): Promise<ApiResponse<T>> {
    try {
      const response = await this.client.patch(url, data, config);
      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      return {
        success: false,
        data: null as any,
        error: error instanceof Error ? error.message : 'PATCH request failed'
      };
    }
  }

  setAuthToken(token: string) {
    try {
      const encryptedToken = this.encryptToken(token);
      localStorage.setItem('_auth_data', encryptedToken);
      logger.info('Auth token stored securely', { userId: this.currentUserId }, 'ApiClient');
    } catch (error) {
      logger.error('Failed to store auth token', { 
        error: error instanceof Error ? error.message : 'Unknown error',
        userId: this.currentUserId 
      }, 'ApiClient');
    }
  }

  clearAuthToken() {
    localStorage.removeItem('_auth_data');
    localStorage.removeItem('auth_token'); // Remove old tokens if they exist
    logger.info('Auth token cleared', { userId: this.currentUserId }, 'ApiClient');
  }

  /**
   * 获取响应大小（字节）
   */
  private getResponseSize(response: AxiosResponse): number {
    try {
      // 尝试从Content-Length头获取
      const contentLength = response.headers?.['content-length'];
      if (contentLength) {
        return parseInt(contentLength, 10);
      }
      
      // 估算响应数据大小
      if (response.data) {
        if (typeof response.data === 'string') {
          return new Blob([response.data]).size;
        } else if (typeof response.data === 'object') {
          return new Blob([JSON.stringify(response.data)]).size;
        }
      }
      
      return 0;
    } catch (error) {
      return 0;
    }
  }

  /**
   * 设置当前用户ID（用于日志记录）
   */
  setUserId(userId: string | null): void {
    this.currentUserId = userId;
    logger.info('API Client user ID updated', { userId }, 'ApiClient');
  }

  /**
   * 获取当前用户ID
   */
  getUserId(): string | null {
    return this.currentUserId;
  }

  /**
   * 启用/禁用API日志记录
   */
  setApiLogging(enabled: boolean): void {
    this.enableApiLogging = enabled;
    logger.info(`API logging ${enabled ? 'enabled' : 'disabled'}`, { 
      userId: this.currentUserId 
    }, 'ApiClient');
  }

  /**
   * 启用/禁用敏感数据日志记录
   */
  setSensitiveDataLogging(enabled: boolean): void {
    this.logSensitiveData = enabled;
    logger.warn(`Sensitive data logging ${enabled ? 'enabled' : 'disabled'}`, { 
      userId: this.currentUserId,
      warning: enabled ? 'This may expose sensitive information in logs' : undefined
    }, 'ApiClient');
  }

  /**
   * 获取API日志配置
   */
  getLoggingConfig(): {
    enableApiLogging: boolean;
    logSensitiveData: boolean;
    userId: string | null;
  } {
    return {
      enableApiLogging: this.enableApiLogging,
      logSensitiveData: this.logSensitiveData,
      userId: this.currentUserId
    };
  }

  updateConfig(newConfig: Partial<ApiConfig>) {
    this.config = { ...this.config, ...newConfig };
    
    // Update axios instance defaults
    if (newConfig.baseURL) {
      this.client.defaults.baseURL = newConfig.baseURL;
    }
    if (newConfig.timeout) {
      this.client.defaults.timeout = newConfig.timeout;
    }
    if (newConfig.headers) {
      this.client.defaults.headers = {
        ...this.client.defaults.headers,
        ...newConfig.headers
      };
    }
  }

  getConfig(): ApiConfig {
    return { ...this.config };
  }
}

// Default API client instance
const defaultConfig: ApiConfig = {
  baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Accept': 'application/json'
  }
};

export const apiClient = new ApiClient(defaultConfig);
export default ApiClient;