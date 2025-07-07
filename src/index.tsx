import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// 导入全局错误处理器以初始化
import './utils/globalErrorHandler';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);