import React from 'react';
import { InventorySummary } from '../types/inventory';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Package, DollarSign, AlertTriangle, X } from 'lucide-react';

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
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        <Card className="glass-card glass-card-hover">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-full bg-green-500/20 backdrop-blur-sm">
              <Package className="h-6 w-6 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-white/80 uppercase tracking-wide mb-1">
                Total Items
              </h3>
              <p className="text-2xl font-bold text-white truncate">
                {summary.totalItems}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card glass-card-hover">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-full bg-orange-500/20 backdrop-blur-sm">
              <DollarSign className="h-6 w-6 text-orange-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-white/80 uppercase tracking-wide mb-1">
                Total Value
              </h3>
              <p className="text-2xl font-bold text-white truncate">
                {formatCurrency(summary.totalValue)}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card glass-card-hover">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-full bg-yellow-500/20 backdrop-blur-sm">
              <AlertTriangle className="h-6 w-6 text-yellow-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-white/80 uppercase tracking-wide mb-1">
                Low Stock
              </h3>
              <p className="text-2xl font-bold text-white truncate">
                {summary.lowStockItems}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="glass-card glass-card-hover">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="p-3 rounded-full bg-red-500/20 backdrop-blur-sm">
              <X className="h-6 w-6 text-red-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-white/80 uppercase tracking-wide mb-1">
                Out of Stock
              </h3>
              <p className="text-2xl font-bold text-white truncate">
                {summary.outOfStockItems}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};