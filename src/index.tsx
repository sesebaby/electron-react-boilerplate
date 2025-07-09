/// <reference path="./types/electron.d.ts" />
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 导入全局错误处理器以初始化
import './utils/globalErrorHandler';

// 导入用户操作追踪器以初始化
import './utils/userActionLogger';

// 导入性能监控器以初始化
import './utils/performanceMonitor';

const _root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

_root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);