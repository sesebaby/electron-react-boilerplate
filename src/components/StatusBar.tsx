import React from 'react';
import { InventorySummary } from '../types/inventory';
import './StatusBar.css';

interface StatusBarProps {
  summary: InventorySummary;
}

export const StatusBar: React.FC<StatusBarProps> = ({ summary }) => {
  const getCurrentTime = () => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    }).format(new Date());
  };

  const [currentTime, setCurrentTime] = React.useState(getCurrentTime());

  React.useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(getCurrentTime());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const getSystemStatus = () => {
    if (summary.outOfStockItems > 0) return { status: 'error', text: 'Critical Issues' };
    if (summary.lowStockItems > 0) return { status: 'warning', text: 'Attention Needed' };
    return { status: 'success', text: 'All Systems Normal' };
  };

  const systemStatus = getSystemStatus();

  return (
    <div className="status-bar">
      <div className="status-bar-left">
        <div className="status-item">
          <span className={`status-dot ${systemStatus.status === 'error' ? 'error' : systemStatus.status === 'warning' ? 'warning' : ''}`}></span>
          <span>System Status: {systemStatus.text}</span>
        </div>
        <div className="status-item">
          <span>📊</span>
          <span>Items: {summary.totalItems}</span>
        </div>
        <div className="status-item">
          <span>💰</span>
          <span>Value: ${summary.totalValue.toLocaleString()}</span>
        </div>
        {summary.lowStockItems > 0 && (
          <div className="status-item">
            <span>⚠️</span>
            <span>Low Stock: {summary.lowStockItems}</span>
          </div>
        )}
        {summary.outOfStockItems > 0 && (
          <div className="status-item">
            <span>❌</span>
            <span>Out of Stock: {summary.outOfStockItems}</span>
          </div>
        )}
      </div>

      <div className="status-bar-right">
        <div className="status-item">
          <span>🔄</span>
          <span>Auto-sync: ON</span>
        </div>
        <div className="status-item">
          <span>🕒</span>
          <span>{currentTime}</span>
        </div>
        <div className="status-item">
          <span>👤</span>
          <span>Admin User</span>
        </div>
      </div>
    </div>
  );
};