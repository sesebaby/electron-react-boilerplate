import React from 'react';
import { InventorySummary } from '../types/inventory';
import { Card, CardContent } from './ui/card';
import { Badge } from './ui/badge';
import { Clock, BarChart3, DollarSign, AlertTriangle, X, RefreshCw, User } from 'lucide-react';

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
    <Card className="glass-card w-full">
      <CardContent className="p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 lg:gap-6">
          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${
                systemStatus.status === 'error' 
                  ? 'bg-red-500 animate-pulse' 
                  : systemStatus.status === 'warning' 
                  ? 'bg-yellow-500 animate-pulse' 
                  : 'bg-green-500'
              }`} />
              <span className="text-sm font-medium text-white/90">
                System Status: {systemStatus.text}
              </span>
            </div>
            
            <Badge variant="default" className="flex items-center gap-1 text-xs">
              <BarChart3 className="h-3 w-3" />
              Items: {summary.totalItems}
            </Badge>
            
            <Badge variant="default" className="flex items-center gap-1 text-xs">
              <DollarSign className="h-3 w-3" />
              Value: ${summary.totalValue.toLocaleString()}
            </Badge>
            
            {summary.lowStockItems > 0 && (
              <Badge variant="warning" className="flex items-center gap-1 text-xs">
                <AlertTriangle className="h-3 w-3" />
                Low Stock: {summary.lowStockItems}
              </Badge>
            )}
            
            {summary.outOfStockItems > 0 && (
              <Badge variant="destructive" className="flex items-center gap-1 text-xs">
                <X className="h-3 w-3" />
                Out of Stock: {summary.outOfStockItems}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-3 sm:gap-4">
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <RefreshCw className="h-3 w-3" />
              Auto-sync: ON
            </Badge>
            
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <Clock className="h-3 w-3" />
              {currentTime}
            </Badge>
            
            <Badge variant="secondary" className="flex items-center gap-1 text-xs">
              <User className="h-3 w-3" />
              Admin User
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};