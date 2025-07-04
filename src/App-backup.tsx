import React from 'react';
import './globals.css';

const App: React.FC = () => {
  return (
    <div className="app-bg">
      <div className="relative z-10 max-w-full mx-auto px-4 h-screen flex flex-col">
        {/* 简单的测试页面 */}
        <header className="text-center py-6 flex-shrink-0">
          <h1 className="text-4xl font-bold text-gradient mb-2">
            📦 进销存管理系统
          </h1>
          <p className="text-base text-white/80">
            系统正在初始化...
          </p>
        </header>

        <main className="flex-1 flex items-center justify-center">
          <div className="glass-card p-8 text-center max-w-md">
            <div className="mb-6">
              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-2xl text-white">🚀</span>
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">
                系统测试页面
              </h2>
              <p className="text-white/70">
                正在验证基础功能...
              </p>
            </div>
            
            <div className="space-y-3">
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                <span className="text-green-300">✅ React 组件加载正常</span>
              </div>
              <div className="bg-green-500/20 border border-green-500/30 rounded-lg p-3">
                <span className="text-green-300">✅ CSS 样式加载正常</span>
              </div>
              <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg p-3">
                <span className="text-blue-300">🔄 准备加载 Dashboard...</span>
              </div>
            </div>

            <button 
              className="mt-6 px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg font-semibold hover:shadow-lg transition-all duration-300 transform hover:scale-105"
              onClick={() => {
                console.log('测试按钮点击正常');
                alert('基础功能测试正常！');
              }}
            >
              测试交互功能
            </button>
          </div>
        </main>

        <footer className="flex-shrink-0 py-4 text-center">
          <p className="text-white/60 text-sm">
            系统版本: v1.0.0-dev | 构建时间: {new Date().toLocaleString('zh-CN')}
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;