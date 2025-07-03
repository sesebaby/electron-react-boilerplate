import React from 'react';
import { InventoryItem } from '../types/inventory';
import './InventoryTable.css';

interface InventoryTableProps {
  items: InventoryItem[];
  onUpdateItem: (id: string, updates: Partial<InventoryItem>) => void;
}

export const InventoryTable: React.FC<InventoryTableProps> = ({ items, onUpdateItem }) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const formatDate = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    }).format(date);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in-stock': return '#4CAF50';
      case 'low-stock': return '#FFC107';
      case 'out-of-stock': return '#F44336';
      case 'discontinued': return '#9E9E9E';
      default: return '#2196F3';
    }
  };

  const getAvailableQuantity = (item: InventoryItem) => {
    return Math.max(0, item.stockQuantity - item.reservedQuantity);
  };

  if (items.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📦</div>
        <h3>No items found</h3>
        <p>Try adjusting your search or filters</p>
      </div>
    );
  }

  return (
    <div className="inventory-table-container">
      <div className="table-wrapper">
        <table className="inventory-table">
          <thead>
            <tr>
              <th>Item Details</th>
              <th>SKU</th>
              <th>Category</th>
              <th>Stock</th>
              <th>Available</th>
              <th>Unit Price</th>
              <th>Total Value</th>
              <th>Status</th>
              <th>Location</th>
              <th>Last Updated</th>
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="table-row">
                <td className="item-details">
                  <div className="item-name">{item.name}</div>
                  <div className="item-description">{item.description}</div>
                  <div className="item-supplier">by {item.supplier}</div>
                </td>
                <td className="sku">{item.sku}</td>
                <td className="category">{item.category}</td>
                <td className="stock-quantity">
                  <span className="quantity-badge">
                    {item.stockQuantity}
                  </span>
                  {item.reservedQuantity > 0 && (
                    <span className="reserved-info">
                      ({item.reservedQuantity} reserved)
                    </span>
                  )}
                </td>
                <td className="available-quantity">
                  <span className={`available-badge ${getAvailableQuantity(item) === 0 ? 'zero' : ''}`}>
                    {getAvailableQuantity(item)}
                  </span>
                </td>
                <td className="unit-price">{formatCurrency(item.unitPrice)}</td>
                <td className="total-value">{formatCurrency(item.totalValue)}</td>
                <td className="status">
                  <span
                    className="status-badge"
                    style={{ backgroundColor: getStatusColor(item.status) }}
                  >
                    {item.status.replace('-', ' ')}
                  </span>
                </td>
                <td className="location">{item.location}</td>
                <td className="last-updated">{formatDate(item.lastUpdated)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};