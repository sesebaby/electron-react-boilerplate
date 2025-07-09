import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';

interface VirtualizedListProps<T> {
  items: T[];
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  overscan?: number;
  className?: string;
}

export function VirtualizedList<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  className = ''
}: VirtualizedListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const _scrollElementRef = useRef<HTMLDivElement>(null);

  const _handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const _visibleRange = useMemo(() => {
    const _startIndex = Math.floor(scrollTop / itemHeight);
    const _endIndex = Math.min(
      startIndex + Math.ceil(containerHeight / itemHeight),
      items.length - 1
    );

    return {
      start: Math.max(0, startIndex - overscan),
      end: Math.min(items.length - 1, endIndex + overscan)
    };
  }, [scrollTop, itemHeight, containerHeight, items.length, overscan]);

  const _visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end + 1);
  }, [items, visibleRange]);

  const _totalHeight = items.length * itemHeight;
  const _offsetY = visibleRange.start * itemHeight;

  return (
    <div
      ref={scrollElementRef}
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map((item, index) => 
            renderItem(item, visibleRange.start + index)
          )}
        </div>
      </div>
    </div>
  );
}

// 专门用于库存列表的虚拟化组件
interface VirtualizedInventoryTableProps<T> {
  items: T[];
  renderRow: (item: T, index: number) => React.ReactNode;
  headerComponent?: React.ReactNode;
  footerComponent?: React.ReactNode;
  itemHeight?: number;
  containerHeight?: number;
  className?: string;
}

export function VirtualizedInventoryTable<T>({
  items,
  renderRow,
  headerComponent,
  footerComponent,
  itemHeight = 80,
  containerHeight = 600,
  className = ''
}: VirtualizedInventoryTableProps<T>) {
  return (
    <div className={`flex flex-col ${className}`}>
      {headerComponent && (
        <div className="flex-shrink-0">
          {headerComponent}
        </div>
      )}
      
      <VirtualizedList
        items={items}
        itemHeight={itemHeight}
        containerHeight={containerHeight}
        renderItem={renderRow}
        className="flex-1"
      />
      
      {footerComponent && (
        <div className="flex-shrink-0">
          {footerComponent}
        </div>
      )}
    </div>
  );
}

// 简单的虚拟化网格组件
interface VirtualizedGridProps<T> {
  items: T[];
  itemsPerRow: number;
  itemHeight: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  gap?: number;
  className?: string;
}

export function VirtualizedGrid<T>({
  items,
  itemsPerRow,
  itemHeight,
  containerHeight,
  renderItem,
  gap = 16,
  className = ''
}: VirtualizedGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  
  const _handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const _rowHeight = itemHeight + gap;
  const _totalRows = Math.ceil(items.length / itemsPerRow);
  
  const _visibleRange = useMemo(() => {
    const _startRow = Math.floor(scrollTop / rowHeight);
    const _endRow = Math.min(
      startRow + Math.ceil(containerHeight / rowHeight),
      totalRows - 1
    );

    return {
      start: Math.max(0, startRow - 2),
      end: Math.min(totalRows - 1, endRow + 2)
    };
  }, [scrollTop, rowHeight, containerHeight, totalRows]);

  const _visibleItems = useMemo(() => {
    const _startIndex = visibleRange.start * itemsPerRow;
    const _endIndex = Math.min((visibleRange.end + 1) * itemsPerRow, items.length);
    return items.slice(startIndex, endIndex);
  }, [items, visibleRange, itemsPerRow]);

  const _totalHeight = totalRows * rowHeight;
  const _offsetY = visibleRange.start * rowHeight;

  return (
    <div
      className={`overflow-auto ${className}`}
      style={{ height: containerHeight }}
      onScroll={handleScroll}
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div 
          style={{ 
            transform: `translateY(${offsetY}px)`,
            display: 'grid',
            gridTemplateColumns: `repeat(${itemsPerRow}, 1fr)`,
            gap: `${gap}px`
          }}
        >
          {visibleItems.map((item, index) => 
            renderItem(item, visibleRange.start * itemsPerRow + index)
          )}
        </div>
      </div>
    </div>
  );
}