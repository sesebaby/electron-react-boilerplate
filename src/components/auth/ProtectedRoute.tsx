import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import LoginPage from './LoginPage';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-gradient-to-br from-indigo-500 to-indigo-600">
        <div className="glass-card p-12 text-center max-w-md w-full mx-4">
          <div className="mb-8">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-6"></div>
            <div className="flex justify-center gap-2 mb-4">
              <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:0ms]"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:150ms]"></div>
              <div className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:300ms]"></div>
            </div>
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">验证身份中...</h2>
          <p className="text-white/90 mb-6">正在检查您的登录状态</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <LoginPage />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;