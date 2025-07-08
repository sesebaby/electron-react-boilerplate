import React, { useMemo, useCallback } from 'react';
import { InventoryItem } from '../types/inventory';
import { Card, CardContent } from './ui/card';
import { 
  Table, 
  TableContainer,
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow,
  TableEmpty,
  TableLoading
} from './ui/table';
import { Badge } from './ui/badge';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from './ui/pagination';
import { Package } from 'lucide-react';

interface InventoryTableProps {
  items: InventoryItem[];
  onUpdateItem: (id: string, updates: Partial<InventoryItem>) => void;
  // Pagination props
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  // Loading state
  loading?: boolean;
  // Table container height
  height?: string | number;
}

export const InventoryTable: React.FC<InventoryTableProps> = React.memo(({ 
  items, 
  onUpdateItem,
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  loading = false,
  height = "600px"
}) => {
  // 缓存格式化器以避免重复创建
  const currencyFormatter = useMemo(() => new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }), []);

  const dateFormatter = useMemo(() => new Intl.DateTimeFormat('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  }), []);

  const formatCurrency = useCallback((amount: number) => {
    return currencyFormatter.format(amount);
  }, [currencyFormatter]);

  const formatDate = useCallback((date: Date) => {
    return dateFormatter.format(date);
  }, [dateFormatter]);

  const getStatusVariant = useCallback((status: string): "default" | "secondary" | "destructive" | "success" | "warning" => {
    switch (status) {
      case 'in-stock': return 'success';
      case 'low-stock': return 'warning';
      case 'out-of-stock': return 'destructive';
      case 'discontinued': return 'secondary';
      default: return 'default';
    }
  }, []);

  const getAvailableQuantity = useCallback((item: InventoryItem) => {
    return Math.max(0, item.stockQuantity - item.reservedQuantity);
  }, []);

  // 加载状态
  if (loading) {
    return (
      <Card className="glass-card h-full">
        <CardContent className="p-0 h-full">
          <TableLoading message="加载库存数据中..." />
        </CardContent>
      </Card>
    );
  }

  // 空状态
  if (items.length === 0) {
    return (
      <Card className="glass-card h-full">
        <CardContent className="p-0 h-full">
          <TableEmpty
            icon={<Package className="h-16 w-16" />}
            message="暂无库存数据"
            description="请尝试调整搜索条件或筛选器"
          />
        </CardContent>
      </Card>
    );
  }

  const renderPaginationItems = useMemo(() => {
    const items = [];
    const showEllipsis = totalPages > 7;
    
    if (showEllipsis) {
      // Show first page
      items.push(
        <PaginationItem key={1}>
          <PaginationLink
            onClick={() => onPageChange(1)}
            isActive={currentPage === 1}
          >
            1
          </PaginationLink>
        </PaginationItem>
      );
      
      // Show ellipsis if needed
      if (currentPage > 3) {
        items.push(
          <PaginationItem key="ellipsis1">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      
      // Show current page and neighbors
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => onPageChange(i)}
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
      
      // Show ellipsis if needed
      if (currentPage < totalPages - 2) {
        items.push(
          <PaginationItem key="ellipsis2">
            <PaginationEllipsis />
          </PaginationItem>
        );
      }
      
      // Show last page
      if (totalPages > 1) {
        items.push(
          <PaginationItem key={totalPages}>
            <PaginationLink
              onClick={() => onPageChange(totalPages)}
              isActive={currentPage === totalPages}
            >
              {totalPages}
            </PaginationLink>
          </PaginationItem>
        );
      }
    } else {
      // Show all pages if total is small
      for (let i = 1; i <= totalPages; i++) {
        items.push(
          <PaginationItem key={i}>
            <PaginationLink
              onClick={() => onPageChange(i)}
              isActive={currentPage === i}
            >
              {i}
            </PaginationLink>
          </PaginationItem>
        );
      }
    }
    
    return items;
  }, [totalPages, currentPage, onPageChange]);

  return (
    <Card className="glass-card h-full max-h-full flex flex-col overflow-hidden">
      <CardContent className="p-0 flex-1 flex flex-col min-h-0 max-h-full">
        {/* 单一表格结构 - 使用 TableContainer */}
        <TableContainer height={height} className="flex-1">
          <Table stickyHeader minWidth="1200px">
            {/* 固定表头 */}
            <TableHeader sticky>
              <TableRow>
                <TableHead 
                  fixed 
                  fixedPosition="left" 
                  fixedOffset={0}
                  className="min-w-[300px] bg-white/10 backdrop-blur-lg"
                >
                  商品详情
                </TableHead>
                <TableHead className="min-w-[140px]">SKU</TableHead>
                <TableHead className="min-w-[100px]">分类</TableHead>
                <TableHead className="min-w-[80px] text-center">库存</TableHead>
                <TableHead className="min-w-[80px] text-center">可用</TableHead>
                <TableHead className="min-w-[100px] text-right">单价</TableHead>
                <TableHead className="min-w-[100px] text-right">总价值</TableHead>
                <TableHead className="min-w-[100px] text-center">状态</TableHead>
                <TableHead className="min-w-[120px]">位置</TableHead>
                <TableHead className="min-w-[100px]">最后更新</TableHead>
              </TableRow>
            </TableHeader>

            {/* 表体内容 */}
            <TableBody>
              {items.map(item => (
                <TableRow key={item.id}>
                  <TableCell 
                    fixed 
                    fixedPosition="left" 
                    fixedOffset={0}
                    className="min-w-[300px]"
                  >
                    <div>
                      <div className="font-semibold text-white mb-1">{item.name}</div>
                      <div className="text-sm text-white/80 mb-1 leading-relaxed">{item.description}</div>
                      <div className="text-xs text-white/60 italic">供应商: {item.supplier}</div>
                    </div>
                  </TableCell>
                  <TableCell className="min-w-[140px]">
                    <code className="text-sm text-white/90 bg-white/10 px-2 py-1 rounded">
                      {item.sku}
                    </code>
                  </TableCell>
                  <TableCell className="min-w-[100px]">{item.category}</TableCell>
                  <TableCell className="min-w-[80px] text-center">
                    <Badge variant="success" className="mb-1">
                      {item.stockQuantity}
                    </Badge>
                    {item.reservedQuantity > 0 && (
                      <div className="text-xs text-white/60 mt-1">
                        ({item.reservedQuantity} 预留)
                      </div>
                    )}
                  </TableCell>
                  <TableCell className="min-w-[80px] text-center">
                    <Badge 
                      variant={getAvailableQuantity(item) === 0 ? 'destructive' : 'secondary'}
                    >
                      {getAvailableQuantity(item)}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-[100px] text-right font-semibold">
                    {formatCurrency(item.unitPrice)}
                  </TableCell>
                  <TableCell className="min-w-[100px] text-right font-semibold">
                    {formatCurrency(item.totalValue)}
                  </TableCell>
                  <TableCell className="min-w-[100px] text-center">
                    <Badge variant={getStatusVariant(item.status)}>
                      {item.status.replace('-', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="min-w-[120px]">{item.location}</TableCell>
                  <TableCell className="min-w-[100px] text-sm">
                    {formatDate(item.lastUpdated)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
        
        {/* 分页部分 */}
        <div className="flex-shrink-0 border-t border-white/20 bg-white/5 backdrop-blur-sm">
          <div className="flex flex-col md:flex-row items-center justify-between px-2 md:px-4 py-2 md:py-3 gap-2">
            <div className="text-xs md:text-sm text-white/70 text-center md:text-left">
              显示第 {((currentPage - 1) * itemsPerPage) + 1} 到 {Math.min(currentPage * itemsPerPage, totalItems)} 条，共 {totalItems} 条记录
            </div>
            
            <div className="flex items-center justify-center md:justify-end">
              {totalPages > 1 && (
                <Pagination>
                  <PaginationContent>
                    <PaginationItem>
                      <PaginationPrevious 
                        onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                        className={`${
                          currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                        }`}
                      />
                    </PaginationItem>
                    
                    {renderPaginationItems}
                    
                    <PaginationItem>
                      <PaginationNext 
                        onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
                        className={`${
                          currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                        }`}
                      />
                    </PaginationItem>
                  </PaginationContent>
                </Pagination>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
});