import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { v4 as uuidv4 } from 'uuid';

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

class ApiClient {
  private client: AxiosInstance;
  private config: ApiConfig;
  private encryptionKey: string;

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
      (config) => {
        // Add auth token if available
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response: AxiosResponse) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      (error) => {
        console.error('Response Error:', error);
        
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
      console.warn('Token encryption failed, using fallback');
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
      console.warn('Token decryption failed');
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
      console.warn('Error retrieving auth token');
      this.clearAuthToken();
      return null;
    }
  }

  private handleUnauthorized() {
    // Clear auth token and redirect to login
    this.clearAuthToken();
    // Emit event or call callback for unauthorized access
    console.warn('Unauthorized access detected');
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
      console.log('Auth token stored securely');
    } catch (error) {
      console.error('Failed to store auth token');
    }
  }

  clearAuthToken() {
    localStorage.removeItem('_auth_data');
    localStorage.removeItem('auth_token'); // Remove old tokens if they exist
    console.log('Auth token cleared');
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