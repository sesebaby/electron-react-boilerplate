import React, { useState, useEffect, useCallback, useContext, createContext } from 'react';
import { User, UserRole, UserStatus } from '../types/entities';
import { userService } from '../services/business';
import { dialogService } from '../services/dialogService';

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
    [UserRole.OPERATOR]: [
      'inventory:read', 'inventory:write', 'inventory:adjust',
      'warehouse:read', 'warehouse:write', 'stock:read', 'stock:write',
      'purchase:read', 'purchase:write', 'suppliers:read', 'suppliers:write',
      'sales:read', 'sales:write', 'customers:read', 'customers:write',
      'financial:read', 'accounts:read', 'payments:read', 'reports:read'
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
      
      // Use UserService for authentication
      const authResult = await userService.authenticate(username.trim(), password);

      if (authResult && authResult.success && authResult.user) {
        // Transform to full User type
        const fullUser: User = {
          id: authResult.user.id,
          username: authResult.user.username,
          password: '', // Don't expose password
          nickname: authResult.user.username,
          role: UserRole.ADMIN, // Default role
          status: UserStatus.ACTIVE,
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        // Store user data in localStorage for session persistence
        localStorage.setItem('_auth_user', JSON.stringify(fullUser));
        
        setUser(fullUser);
        setSessionStartTime(Date.now());
        setLastActivity(Date.now());
        
        // Log successful login (without sensitive data)
        console.log(`User logged in: ${fullUser.id}`);
        
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
      
      // Use UserService for logout
      userService.logout();
      
      // Clear local session data
      localStorage.removeItem('_auth_user');
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
      // Since we're not using API tokens, just update activity time
      if (user) {
        setLastActivity(Date.now());
        console.log('Session refreshed successfully');
        return true;
      }
      
      // No user - logout
      await logout();
      return false;
    } catch (error) {
      console.error('Session refresh failed:', error);
      await logout();
      return false;
    }
  }, [logout, user]);

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
        
        // 使用全局弹出框服务
        dialogService.confirm(
          `您的会话将在 ${remainingMinutes} 分钟后过期。是否延长会话？`,
          () => {
            updateActivity();
          }
        );
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
        // Check for existing user data
        const userData = localStorage.getItem('_auth_user');
        if (userData) {
          try {
            const parsedUser = JSON.parse(userData);
            // Verify user still exists in the system
            const currentUser = await userService.findById(parsedUser.id);
            
            if (currentUser && (currentUser as any).status === UserStatus.ACTIVE) {
              setUser(currentUser);
              setSessionStartTime(Date.now());
              setLastActivity(Date.now());
            } else {
              // User no longer exists or is inactive - clear local data
              localStorage.removeItem('_auth_user');
            }
          } catch (parseError) {
            // Invalid user data - clear it
            localStorage.removeItem('_auth_user');
          }
        }
      } catch (error) {
        console.error('Auth initialization failed:', error);
        localStorage.removeItem('_auth_user');
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