import React from 'react';
import { InventoryItem } from '../types/inventory';
import { Card, CardContent } from './ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Package } from 'lucide-react';

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

  const getStatusVariant = (status: string): "default" | "secondary" | "destructive" | "success" | "warning" => {
    switch (status) {
      case 'in-stock': return 'success';
      case 'low-stock': return 'warning';
      case 'out-of-stock': return 'destructive';
      case 'discontinued': return 'secondary';
      default: return 'default';
    }
  };

  const getAvailableQuantity = (item: InventoryItem) => {
    return Math.max(0, item.stockQuantity - item.reservedQuantity);
  };

  if (items.length === 0) {
    return (
      <Card className="glass-card">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center">
          <div className="p-4 rounded-full bg-white/10 backdrop-blur-sm mb-4">
            <Package className="h-16 w-16 text-white/50" />
          </div>
          <h3 className="text-xl font-semibold text-white/90 mb-2">No items found</h3>
          <p className="text-white/70">Try adjusting your search or filters</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass-card overflow-hidden">
      <div className="max-h-[60vh] overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="min-w-[300px]">Item Details</TableHead>
              <TableHead className="min-w-[140px]">SKU</TableHead>
              <TableHead className="min-w-[100px]">Category</TableHead>
              <TableHead className="min-w-[80px] text-center">Stock</TableHead>
              <TableHead className="min-w-[80px] text-center">Available</TableHead>
              <TableHead className="min-w-[100px] text-right">Unit Price</TableHead>
              <TableHead className="min-w-[100px] text-right">Total Value</TableHead>
              <TableHead className="min-w-[100px] text-center">Status</TableHead>
              <TableHead className="min-w-[120px]">Location</TableHead>
              <TableHead className="min-w-[100px]">Last Updated</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map(item => (
              <TableRow key={item.id}>
                <TableCell>
                  <div>
                    <div className="font-semibold text-white mb-1">{item.name}</div>
                    <div className="text-sm text-white/80 mb-1 leading-relaxed">{item.description}</div>
                    <div className="text-xs text-white/60 italic">by {item.supplier}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <code className="text-sm text-white/90 bg-white/10 px-2 py-1 rounded">
                    {item.sku}
                  </code>
                </TableCell>
                <TableCell className="text-white/90">{item.category}</TableCell>
                <TableCell className="text-center">
                  <Badge variant="success" className="mb-1">
                    {item.stockQuantity}
                  </Badge>
                  {item.reservedQuantity > 0 && (
                    <div className="text-xs text-white/60 mt-1">
                      ({item.reservedQuantity} reserved)
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-center">
                  <Badge 
                    variant={getAvailableQuantity(item) === 0 ? 'destructive' : 'secondary'}
                  >
                    {getAvailableQuantity(item)}
                  </Badge>
                </TableCell>
                <TableCell className="text-right font-semibold text-white/90">
                  {formatCurrency(item.unitPrice)}
                </TableCell>
                <TableCell className="text-right font-semibold text-white/90">
                  {formatCurrency(item.totalValue)}
                </TableCell>
                <TableCell className="text-center">
                  <Badge variant={getStatusVariant(item.status)}>
                    {item.status.replace('-', ' ')}
                  </Badge>
                </TableCell>
                <TableCell className="text-white/80">{item.location}</TableCell>
                <TableCell className="text-white/70 text-sm">
                  {formatDate(item.lastUpdated)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
};