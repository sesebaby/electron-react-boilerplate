import React, { useState, useEffect } from 'react';
import minimalDashboardService, { MinimalDashboardOverview } from '../services/dashboard/minimalDashboardService';

const MinimalDashboard: React.FC = () => {
  const [overview, setOverview] = useState<MinimalDashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      await minimalDashboardService.initialize();
      const data = await minimalDashboardService.getOverview();
      setOverview(data);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="app-bg">
        <div className="min-h-screen flex items-center justify-center">
          <div className="glass-card p-8 text-center">
            <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-white">加载Dashboard数据中...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="app-bg">
        <div className="min-h-screen flex items-center justify-center">
          <div className="glass-card p-8 text-center">
            <p className="text-white">无法加载Dashboard数据</p>
            <button 
              onClick={loadData}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-bg">
      <div className="min-h-screen p-4">
        {/* 标题 */}
        <header className="text-center py-6">
          <h1 className="text-4xl font-bold text-gradient mb-2">
            📦 进销存管理系统
          </h1>
          <p className="text-white/80">
            Dashboard - 最小可工作版本
          </p>
        </header>

        {/* 概览卡片 */}
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <div className="glass-card p-6 text-center">
              <div className="text-3xl mb-2">📦</div>
              <h3 className="text-white font-semibold mb-1">商品总数</h3>
              <p className="text-2xl font-bold text-blue-300">{overview.totalProducts}</p>
            </div>

            <div className="glass-card p-6 text-center">
              <div className="text-3xl mb-2">🏢</div>
              <h3 className="text-white font-semibold mb-1">供应商</h3>
              <p className="text-2xl font-bold text-green-300">{overview.totalSuppliers}</p>
            </div>

            <div className="glass-card p-6 text-center">
              <div className="text-3xl mb-2">👥</div>
              <h3 className="text-white font-semibold mb-1">客户</h3>
              <p className="text-2xl font-bold text-purple-300">{overview.totalCustomers}</p>
            </div>

            <div className="glass-card p-6 text-center">
              <div className="text-3xl mb-2">🏭</div>
              <h3 className="text-white font-semibold mb-1">仓库</h3>
              <p className="text-2xl font-bold text-yellow-300">{overview.totalWarehouses}</p>
            </div>
          </div>

          {/* 系统状态 */}
          <div className="glass-card p-6 text-center">
            <h3 className="text-xl font-bold text-white mb-4">系统状态</h3>
            <div className="flex items-center justify-center space-x-2">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-green-300 font-semibold">系统运行正常</span>
            </div>
            <p className="text-white/60 mt-2 text-sm">
              最后更新: {new Date().toLocaleString('zh-CN')}
            </p>
          </div>

          {/* 操作按钮 */}
          <div className="mt-8 text-center">
            <button 
              onClick={loadData}
              className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105 mr-4"
            >
              刷新数据
            </button>
            <button 
              onClick={() => console.log('点击了完整版本按钮')}
              className="px-6 py-3 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
            >
              切换到完整版本
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MinimalDashboard;