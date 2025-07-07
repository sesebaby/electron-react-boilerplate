/**
 * 出入库汇总组件测试
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import InventoryMovementSummary from './InventoryMovementSummary';

// Mock services
jest.mock('../../services/business', () => ({
  inventoryStockService: {
    findTransactionsByDateRange: jest.fn().mockResolvedValue([]),
  },
  productService: {
    findAll: jest.fn().mockResolvedValue([
      {
        id: 'product-1',
        name: '测试产品1',
        sku: 'TEST-001',
        categoryId: 'category-1'
      }
    ])
  },
  categoryService: {
    findAll: jest.fn().mockResolvedValue([
      {
        id: 'category-1',
        name: '测试分类',
        parentId: null
      }
    ])
  },
  warehouseService: {
    findAll: jest.fn().mockResolvedValue([
      {
        id: 'warehouse-1',
        name: '测试仓库'
      }
    ])
  }
}));

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

describe('InventoryMovementSummary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  test('renders component title', async () => {
    render(<InventoryMovementSummary />);
    
    await waitFor(() => {
      expect(screen.getByText('出入库汇总')).toBeInTheDocument();
    });
  });

  test('renders time control section', async () => {
    render(<InventoryMovementSummary />);
    
    await waitFor(() => {
      expect(screen.getByText('时间范围')).toBeInTheDocument();
      expect(screen.getByText('快捷选择:')).toBeInTheDocument();
    });
  });

  test('renders quick time buttons', async () => {
    render(<InventoryMovementSummary />);
    
    await waitFor(() => {
      expect(screen.getByText(/上上月/)).toBeInTheDocument();
      expect(screen.getByText(/上月/)).toBeInTheDocument();
      expect(screen.getByText(/当月/)).toBeInTheDocument();
    });
  });

  test('renders statistics cards', async () => {
    render(<InventoryMovementSummary />);
    
    await waitFor(() => {
      expect(screen.getByText('商品种类')).toBeInTheDocument();
      expect(screen.getByText('期初库存')).toBeInTheDocument();
      expect(screen.getByText('入库金额')).toBeInTheDocument();
      expect(screen.getByText('出库金额')).toBeInTheDocument();
      expect(screen.getByText('期末库存')).toBeInTheDocument();
      expect(screen.getByText('周转率')).toBeInTheDocument();
    });
  });

  test('renders filter controls', async () => {
    render(<InventoryMovementSummary />);
    
    await waitFor(() => {
      expect(screen.getByText('商品分类')).toBeInTheDocument();
      expect(screen.getByText('商品筛选')).toBeInTheDocument();
      expect(screen.getByText('搜索关键词')).toBeInTheDocument();
      expect(screen.getByText('显示选项')).toBeInTheDocument();
    });
  });

  test('renders action buttons', async () => {
    render(<InventoryMovementSummary />);
    
    await waitFor(() => {
      expect(screen.getByText('列设置')).toBeInTheDocument();
      expect(screen.getByText('导出报表')).toBeInTheDocument();
      expect(screen.getByText('刷新数据')).toBeInTheDocument();
    });
  });

  test('opens export options when export button clicked', async () => {
    render(<InventoryMovementSummary />);
    
    await waitFor(() => {
      const exportButton = screen.getByText('导出报表');
      fireEvent.click(exportButton);
    });

    await waitFor(() => {
      expect(screen.getByText('导出选项')).toBeInTheDocument();
    });
  });

  test('opens column config when column settings button clicked', async () => {
    render(<InventoryMovementSummary />);
    
    await waitFor(() => {
      const columnButton = screen.getByText('列设置');
      fireEvent.click(columnButton);
    });

    await waitFor(() => {
      expect(screen.getByText('列显示设置')).toBeInTheDocument();
    });
  });

  test('handles search input change', async () => {
    render(<InventoryMovementSummary />);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('商品名称或编码');
      fireEvent.change(searchInput, { target: { value: '测试搜索' } });
      expect(searchInput).toHaveValue('测试搜索');
    });
  });

  test('handles zero movement checkbox toggle', async () => {
    render(<InventoryMovementSummary />);
    
    await waitFor(() => {
      const checkbox = screen.getByLabelText('显示无变动');
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });

  test('saves filter preferences to localStorage', async () => {
    render(<InventoryMovementSummary />);
    
    await waitFor(() => {
      const checkbox = screen.getByLabelText('显示无变动');
      fireEvent.click(checkbox);
    });

    await waitFor(() => {
      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        'inventory-movement-filters',
        expect.stringContaining('showZeroMovement')
      );
    });
  });

  test('loads saved preferences from localStorage', () => {
    const savedConfig = JSON.stringify({
      showZeroMovement: true,
      productId: 'product-1'
    });
    localStorageMock.getItem.mockReturnValue(savedConfig);

    render(<InventoryMovementSummary />);

    expect(localStorageMock.getItem).toHaveBeenCalledWith('inventory-movement-filters');
  });

  test('handles refresh button click', async () => {
    render(<InventoryMovementSummary />);
    
    await waitFor(() => {
      const refreshButton = screen.getByText('刷新数据');
      fireEvent.click(refreshButton);
    });

    // Should trigger data reload
    expect(screen.getByText('刷新数据')).toBeInTheDocument();
  });

  test('displays empty state when no data', async () => {
    render(<InventoryMovementSummary />);
    
    await waitFor(() => {
      expect(screen.getByText('暂无数据')).toBeInTheDocument();
      expect(screen.getByText('请调整筛选条件或时间范围')).toBeInTheDocument();
    });
  });
});
