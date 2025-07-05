import React, { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { User, UserRole } from '../types/entities';
import { apiClient } from '../services/api/apiClient';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshToken: () => Promise<boolean>;
  hasPermission: (permission: string) => boolean;
  hasRole: (role: UserRole) => boolean;
  sessionTimeRemaining: number;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: React.ReactNode;
}

// Session timeout in milliseconds (30 minutes)
const SESSION_TIMEOUT = 30 * 60 * 1000;
// Token refresh interval (25 minutes)
const REFRESH_INTERVAL = 25 * 60 * 1000;
// Warning time before session expires (5 minutes)
const SESSION_WARNING_TIME = 5 * 60 * 1000;

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [sessionStartTime, setSessionStartTime] = useState<number>(Date.now());
  const [lastActivity, setLastActivity] = useState<number>(Date.now());

  // Calculate session time remaining
  const sessionTimeRemaining = Math.max(0, SESSION_TIMEOUT - (Date.now() - lastActivity));

  // Update last activity on user interactions
  const updateActivity = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  // Permission checking based on role
  const rolePermissions: Record<UserRole, string[]> = {
    [UserRole.ADMIN]: ['*'], // Admin has all permissions
    [UserRole.FINANCE]: [
      'financial:read', 'financial:write', 'financial:delete',
      'accounts:read', 'accounts:write', 'payments:read', 'payments:write'
    ],
    [UserRole.PURCHASER]: [
      'purchase:read', 'purchase:write', 'purchase:delete',
      'suppliers:read', 'suppliers:write', 'inventory:read'
    ],
    [UserRole.SALESPERSON]: [
      'sales:read', 'sales:write', 'sales:delete',
      'customers:read', 'customers:write', 'inventory:read'
    ],
    [UserRole.WAREHOUSE]: [
      'inventory:read', 'inventory:write', 'inventory:adjust',
      'warehouse:read', 'warehouse:write', 'stock:read', 'stock:write'
    ]
  };

  const hasPermission = useCallback((permission: string): boolean => {
    if (!user) return false;
    const userPermissions = rolePermissions[user.role] || [];
    return userPermissions.includes('*') || userPermissions.includes(permission);
  }, [user]);

  const hasRole = useCallback((role: UserRole): boolean => {
    return user?.role === role;
  }, [user]);

  const login = useCallback(async (username: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      
      // Simulate API login call
      const response = await apiClient.post('/auth/login', {
        username: username.trim(),
        password
      });

      if (response.success && response.data.token && response.data.user) {
        // Store token securely
        apiClient.setAuthToken(response.data.token);
        
        setUser(response.data.user);
        setSessionStartTime(Date.now());
        setLastActivity(Date.now());
        
        // Log successful login (without sensitive data)
        console.log(`User logged in: ${response.data.user.id}`);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      
      // Call logout API to invalidate token on server
      await apiClient.post('/auth/logout').catch(() => {
        // Ignore logout API errors - still clear local session
      });
      
      // Clear local session data
      apiClient.clearAuthToken();
      setUser(null);
      setSessionStartTime(0);
      setLastActivity(0);
      
      console.log('User logged out');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshToken = useCallback(async (): Promise<boolean> => {
    try {
      const response = await apiClient.post('/auth/refresh');
      
      if (response.success && response.data.token) {
        apiClient.setAuthToken(response.data.token);
        setLastActivity(Date.now());
        console.log('Token refreshed successfully');
        return true;
      }
      
      // Token refresh failed - logout user
      await logout();
      return false;
    } catch (error) {
      console.error('Token refresh failed:', error);
      await logout();
      return false;
    }
  }, [logout]);

  // Auto-refresh token
  useEffect(() => {
    if (!user) return;

    const refreshInterval = setInterval(() => {
      // Only refresh if session is still active
      if (sessionTimeRemaining > SESSION_WARNING_TIME) {
        refreshToken();
      }
    }, REFRESH_INTERVAL);

    return () => clearInterval(refreshInterval);
  }, [user, refreshToken, sessionTimeRemaining]);

  // Session timeout handling
  useEffect(() => {
    if (!user) return;

    const timeoutId = setTimeout(() => {
      if (sessionTimeRemaining <= 0) {
        console.warn('Session expired');
        logout();
      }
    }, sessionTimeRemaining);

    return () => clearTimeout(timeoutId);
  }, [user, sessionTimeRemaining, logout]);

  // Session warning
  useEffect(() => {
    if (!user) return;

    if (sessionTimeRemaining <= SESSION_WARNING_TIME && sessionTimeRemaining > 0) {
      const warningId = setTimeout(() => {
        const remainingMinutes = Math.ceil(sessionTimeRemaining / 60000);
        console.warn(`Session expires in ${remainingMinutes} minutes`);
        
        // In a real app, you might show a modal here
        if (window.confirm(`Your session will expire in ${remainingMinutes} minutes. Extend session?`)) {
          updateActivity();
        }
      }, 1000);

      return () => clearTimeout(warningId);
    }
  }, [sessionTimeRemaining, user, updateActivity]);

  // Track user activity
  useEffect(() => {
    if (!user) return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
    
    events.forEach(event => {
      document.addEventListener(event, updateActivity, true);
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, updateActivity, true);
      });
    };
  }, [user, updateActivity]);

  // Initialize auth state
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        // Check for existing token
        const token = localStorage.getItem('_auth_data');
        if (token) {
          // Verify token with API
          const response = await apiClient.get('/auth/verify');
          if (response.success && response.data.user) {
            setUser(response.data.user);
            setSessionStartTime(Date.now());
            setLastActivity(Date.now());
          } else {
            // Invalid token - clear it
            apiClient.clearAuthToken();
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        apiClient.clearAuthToken();
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, []);

  const contextValue: AuthContextType = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    refreshToken,
    hasPermission,
    hasRole,
    sessionTimeRemaining
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;