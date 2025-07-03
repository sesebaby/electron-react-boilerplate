import React from 'react';
import { InventorySummary } from '../types/inventory';
import './Dashboard.css';

interface DashboardProps {
  summary: InventorySummary;
}

export const Dashboard: React.FC<DashboardProps> = ({ summary }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <div className="dashboard">
      <div className="dashboard-grid">
        <div className="dashboard-card total-items">
          <div className="card-icon">📦</div>
          <div className="card-content">
            <h3>Total Items</h3>
            <p className="card-value">{summary.totalItems}</p>
          </div>
        </div>

        <div className="dashboard-card total-value">
          <div className="card-icon">💰</div>
          <div className="card-content">
            <h3>Total Value</h3>
            <p className="card-value">{formatCurrency(summary.totalValue)}</p>
          </div>
        </div>

        <div className="dashboard-card low-stock">
          <div className="card-icon">⚠️</div>
          <div className="card-content">
            <h3>Low Stock</h3>
            <p className="card-value">{summary.lowStockItems}</p>
          </div>
        </div>

        <div className="dashboard-card out-of-stock">
          <div className="card-icon">❌</div>
          <div className="card-content">
            <h3>Out of Stock</h3>
            <p className="card-value">{summary.outOfStockItems}</p>
          </div>
        </div>
      </div>
    </div>
  );
};