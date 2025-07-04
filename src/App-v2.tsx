import React, { useState, useEffect } from 'react';
import Dashboard from './components/Dashboard/Dashboard';
import { businessServiceManager } from './services/business';
import './globals.css';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [initStep, setInitStep] = useState('正在初始化...');

  useEffect(() => {
    initializeApp();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      setError(null);

      setInitStep('正在初始化业务服务...');
      await businessServiceManager.initialize();

      setInitStep('系统初始化完成');
      setTimeout(() => {
        setLoading(false);
      }, 1000);

    } catch (error) {
      console.error('App initialization failed:', error);
      setError(error instanceof Error ? error.message : '系统初始化失败');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app-bg">
        <div className="relative z-10 max-w-full mx-auto px-4 h-screen flex items-center justify-center">
          <div className="glass-card p-8 text-center max-w-md">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center animate-pulse">
                <span className="text-2xl text-white">🚀</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                进销存管理系统
              </h2>
              <p className="text-white/70 mb-4">
                {initStep}
              </p>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full animate-pulse" style={{width: '60%'}}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-bg">
        <div className="relative z-10 max-w-full mx-auto px-4 h-screen flex items-center justify-center">
          <div className="glass-card p-8 text-center max-w-md">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-2xl text-white">❌</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                初始化失败
              </h2>
              <p className="text-red-300 mb-4">
                {error}
              </p>
              <button 
                className="px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-300"
                onClick={initializeApp}
              >
                重试
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 成功加载后显示Dashboard
  return <Dashboard />;
};

export default App;