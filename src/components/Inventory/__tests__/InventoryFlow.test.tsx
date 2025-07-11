/**
 * Inventory组件集成测试
 * 测试场景：用户操作流程验证
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ProductManagement } from '../ProductManagement';
import { StockIn } from '../StockIn';
import { StockOut } from '../StockOut';
import { StockAdjust } from '../StockAdjust';

// Mock services
jest.mock('../../../services/core/InventoryService');
jest.mock('../../../hooks/useInventory');
jest.mock('../../../hooks/useAuth');

const mockInventoryService = {
  getProducts: jest.fn(),
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
  updateStock: jest.fn(),
  getCategories: jest.fn(),
  getUnits: jest.fn(),
  getWarehouses: jest.fn(),
};

const mockUseInventory = {
  products: [],
  categories: [],
  units: [],
  warehouses: [],
  loading: false,
  error: null,
  refreshProducts: jest.fn(),
  createProduct: jest.fn(),
  updateProduct: jest.fn(),
  deleteProduct: jest.fn(),
};

const mockUseAuth = {
  user: { id: 'user-1', username: 'testuser', permissions: ['inventory:read', 'inventory:write'] },
  isAuthenticated: true,
  hasPermission: jest.fn().mockReturnValue(true),
};

// Mock hooks
require('../../../hooks/useInventory').useInventory = jest.fn(() => mockUseInventory);
require('../../../hooks/useAuth').useAuth = jest.fn(() => mockUseAuth);

describe('Inventory组件集成测试 - 用户操作流程', () => {
  const user = userEvent.setup();

  beforeEach(() => {
    jest.clearAllMocks();
    
    // 设置默认的测试数据
    mockUseInventory.products = [
      {
        id: 'prod-1',
        name: '笔记本电脑',
        sku: 'NB-001',
        description: '高性能笔记本电脑',
        categoryId: 'cat-1',
        unitId: 'unit-1',
        status: 'ACTIVE',
        purchasePrice: 5000,
        salePrice: 6000,
        minStock: 10,
        maxStock: 100,
        currentStock: 50,
        isActive: true
      }
    ];

    mockUseInventory.categories = [
      { id: 'cat-1', name: '电子产品', isActive: true }
    ];

    mockUseInventory.units = [
      { id: 'unit-1', name: '台', symbol: 'pcs', isActive: true }
    ];

    mockUseInventory.warehouses = [
      { id: 'wh-1', name: '主仓库', location: '北京', isActive: true }
    ];
  });

  describe('场景1：商品管理完整流程', () => {
    it('应该支持用户查看商品列表并创建新商品', async () => {
      mockUseInventory.createProduct.mockResolvedValue({ success: true, data: { id: 'prod-2' } });

      render(<ProductManagement />);

      // 验证商品列表显示
      expect(screen.getByText('笔记本电脑')).toBeInTheDocument();
      expect(screen.getByText('NB-001')).toBeInTheDocument();

      // 查找并点击"新增商品"按钮
      const addButton = screen.getByRole('button', { name: /新增|添加|创建/i });
      await user.click(addButton);

      // 验证创建商品表单出现
      await waitFor(() => {
        expect(screen.getByLabelText(/商品名称|名称/i)).toBeInTheDocument();
      });

      // 填写商品信息
      const nameInput = screen.getByLabelText(/商品名称|名称/i);
      const skuInput = screen.getByLabelText(/SKU|编码/i);
      const descInput = screen.getByLabelText(/描述|说明/i);

      await user.type(nameInput, '台式电脑');
      await user.type(skuInput, 'PC-001');
      await user.type(descInput, '高性能台式电脑');

      // 选择分类和单位
      const categorySelect = screen.getByRole('combobox', { name: /分类/i });
      await user.click(categorySelect);
      await user.click(screen.getByText('电子产品'));

      const unitSelect = screen.getByRole('combobox', { name: /单位/i });
      await user.click(unitSelect);
      await user.click(screen.getByText('台'));

      // 填写价格信息
      const purchasePriceInput = screen.getByLabelText(/采购价|进价/i);
      const salePriceInput = screen.getByLabelText(/销售价|售价/i);

      await user.type(purchasePriceInput, '4000');
      await user.type(salePriceInput, '5000');

      // 提交表单
      const submitButton = screen.getByRole('button', { name: /确定|保存|提交/i });
      await user.click(submitButton);

      // 验证创建商品被调用
      await waitFor(() => {
        expect(mockUseInventory.createProduct).toHaveBeenCalledWith(
          expect.objectContaining({
            name: '台式电脑',
            sku: 'PC-001',
            description: '高性能台式电脑',
            categoryId: 'cat-1',
            unitId: 'unit-1',
            purchasePrice: 4000,
            salePrice: 5000
          })
        );
      });
    });

    it('应该支持用户编辑现有商品信息', async () => {
      mockUseInventory.updateProduct.mockResolvedValue({ success: true });

      render(<ProductManagement />);

      // 查找编辑按钮
      const editButton = screen.getByRole('button', { name: /编辑|修改/i });
      await user.click(editButton);

      // 等待编辑表单出现
      await waitFor(() => {
        expect(screen.getByDisplayValue('笔记本电脑')).toBeInTheDocument();
      });

      // 修改商品名称
      const nameInput = screen.getByDisplayValue('笔记本电脑');
      await user.clear(nameInput);
      await user.type(nameInput, '游戏笔记本电脑');

      // 修改价格
      const salePriceInput = screen.getByDisplayValue('6000');
      await user.clear(salePriceInput);
      await user.type(salePriceInput, '6500');

      // 提交修改
      const submitButton = screen.getByRole('button', { name: /确定|保存|更新/i });
      await user.click(submitButton);

      // 验证更新商品被调用
      await waitFor(() => {
        expect(mockUseInventory.updateProduct).toHaveBeenCalledWith(
          'prod-1',
          expect.objectContaining({
            name: '游戏笔记本电脑',
            salePrice: 6500
          })
        );
      });
    });

    it('应该显示表单验证错误', async () => {
      render(<ProductManagement />);

      // 点击新增商品
      const addButton = screen.getByRole('button', { name: /新增|添加|创建/i });
      await user.click(addButton);

      // 不填写任何信息直接提交
      await waitFor(() => {
        const submitButton = screen.getByRole('button', { name: /确定|保存|提交/i });
        user.click(submitButton);
      });

      // 验证显示错误信息
      await waitFor(() => {
        expect(screen.getByText(/商品名称不能为空|请输入商品名称/i)).toBeInTheDocument();
        expect(screen.getByText(/SKU不能为空|请输入SKU/i)).toBeInTheDocument();
      });

      // 验证创建商品未被调用
      expect(mockUseInventory.createProduct).not.toHaveBeenCalled();
    });
  });

  describe('场景2：库存操作完整流程', () => {
    it('应该支持用户执行入库操作', async () => {
      mockInventoryService.updateStock = jest.fn().mockResolvedValue({ success: true });

      render(<StockIn />);

      // 选择商品
      const productSelect = screen.getByRole('combobox', { name: /商品|产品/i });
      await user.click(productSelect);
      await user.click(screen.getByText('笔记本电脑'));

      // 选择仓库
      const warehouseSelect = screen.getByRole('combobox', { name: /仓库/i });
      await user.click(warehouseSelect);
      await user.click(screen.getByText('主仓库'));

      // 输入数量
      const quantityInput = screen.getByLabelText(/数量|入库数量/i);
      await user.type(quantityInput, '20');

      // 输入单价
      const unitPriceInput = screen.getByLabelText(/单价|价格/i);
      await user.type(unitPriceInput, '5200');

      // 输入备注
      const remarkInput = screen.getByLabelText(/备注|说明/i);
      await user.type(remarkInput, '采购入库');

      // 提交入库操作
      const submitButton = screen.getByRole('button', { name: /确定|入库|提交/i });
      await user.click(submitButton);

      // 验证入库操作被调用
      await waitFor(() => {
        expect(mockInventoryService.updateStock).toHaveBeenCalledWith({
          productId: 'prod-1',
          warehouseId: 'wh-1',
          quantity: 20,
          unitPrice: 5200,
          type: 'IN',
          reason: '采购入库'
        });
      });
    });

    it('应该支持用户执行出库操作', async () => {
      mockInventoryService.updateStock = jest.fn().mockResolvedValue({ success: true });

      render(<StockOut />);

      // 选择商品
      const productSelect = screen.getByRole('combobox', { name: /商品|产品/i });
      await user.click(productSelect);
      await user.click(screen.getByText('笔记本电脑'));

      // 选择仓库
      const warehouseSelect = screen.getByRole('combobox', { name: /仓库/i });
      await user.click(warehouseSelect);
      await user.click(screen.getByText('主仓库'));

      // 输入数量
      const quantityInput = screen.getByLabelText(/数量|出库数量/i);
      await user.type(quantityInput, '10');

      // 输入备注
      const remarkInput = screen.getByLabelText(/备注|说明/i);
      await user.type(remarkInput, '销售出库');

      // 提交出库操作
      const submitButton = screen.getByRole('button', { name: /确定|出库|提交/i });
      await user.click(submitButton);

      // 验证出库操作被调用
      await waitFor(() => {
        expect(mockInventoryService.updateStock).toHaveBeenCalledWith({
          productId: 'prod-1',
          warehouseId: 'wh-1',
          quantity: 10,
          type: 'OUT',
          reason: '销售出库'
        });
      });
    });

    it('应该支持用户执行库存调整操作', async () => {
      mockInventoryService.updateStock = jest.fn().mockResolvedValue({ success: true });

      render(<StockAdjust />);

      // 选择商品
      const productSelect = screen.getByRole('combobox', { name: /商品|产品/i });
      await user.click(productSelect);
      await user.click(screen.getByText('笔记本电脑'));

      // 选择仓库
      const warehouseSelect = screen.getByRole('combobox', { name: /仓库/i });
      await user.click(warehouseSelect);
      await user.click(screen.getByText('主仓库'));

      // 输入调整数量（负数表示减少）
      const quantityInput = screen.getByLabelText(/调整数量|数量/i);
      await user.type(quantityInput, '-5');

      // 选择调整原因
      const reasonSelect = screen.getByRole('combobox', { name: /原因|类型/i });
      await user.click(reasonSelect);
      await user.click(screen.getByText('盘亏'));

      // 输入备注
      const remarkInput = screen.getByLabelText(/备注|说明/i);
      await user.type(remarkInput, '月度盘点发现盘亏');

      // 提交调整操作
      const submitButton = screen.getByRole('button', { name: /确定|调整|提交/i });
      await user.click(submitButton);

      // 验证调整操作被调用
      await waitFor(() => {
        expect(mockInventoryService.updateStock).toHaveBeenCalledWith({
          productId: 'prod-1',
          warehouseId: 'wh-1',
          quantity: -5,
          type: 'ADJUST',
          reason: '月度盘点发现盘亏'
        });
      });
    });

    it('应该在库存不足时显示错误提示', async () => {
      // Mock库存不足错误
      mockInventoryService.updateStock = jest.fn().mockRejectedValue(
        new Error('库存不足，当前库存：50，出库数量：100')
      );

      render(<StockOut />);

      // 选择商品和仓库
      const productSelect = screen.getByRole('combobox', { name: /商品|产品/i });
      await user.click(productSelect);
      await user.click(screen.getByText('笔记本电脑'));

      const warehouseSelect = screen.getByRole('combobox', { name: /仓库/i });
      await user.click(warehouseSelect);
      await user.click(screen.getByText('主仓库'));

      // 输入超过库存的数量
      const quantityInput = screen.getByLabelText(/数量|出库数量/i);
      await user.type(quantityInput, '100');

      // 提交出库操作
      const submitButton = screen.getByRole('button', { name: /确定|出库|提交/i });
      await user.click(submitButton);

      // 验证显示错误信息
      await waitFor(() => {
        expect(screen.getByText(/库存不足/i)).toBeInTheDocument();
      });
    });
  });

  describe('场景3：数据实时更新验证', () => {
    it('应该在库存操作后刷新商品数据', async () => {
      mockInventoryService.updateStock = jest.fn().mockResolvedValue({ success: true });
      mockUseInventory.refreshProducts = jest.fn();

      render(<StockIn />);

      // 执行入库操作
      const productSelect = screen.getByRole('combobox', { name: /商品|产品/i });
      await user.click(productSelect);
      await user.click(screen.getByText('笔记本电脑'));

      const warehouseSelect = screen.getByRole('combobox', { name: /仓库/i });
      await user.click(warehouseSelect);
      await user.click(screen.getByText('主仓库'));

      const quantityInput = screen.getByLabelText(/数量|入库数量/i);
      await user.type(quantityInput, '20');

      const submitButton = screen.getByRole('button', { name: /确定|入库|提交/i });
      await user.click(submitButton);

      // 验证操作成功后刷新了数据
      await waitFor(() => {
        expect(mockUseInventory.refreshProducts).toHaveBeenCalled();
      });
    });

    it('应该显示操作成功提示', async () => {
      mockInventoryService.updateStock = jest.fn().mockResolvedValue({ 
        success: true, 
        message: '入库操作成功' 
      });

      render(<StockIn />);

      // 执行入库操作
      const productSelect = screen.getByRole('combobox', { name: /商品|产品/i });
      await user.click(productSelect);
      await user.click(screen.getByText('笔记本电脑'));

      const warehouseSelect = screen.getByRole('combobox', { name: /仓库/i });
      await user.click(warehouseSelect);
      await user.click(screen.getByText('主仓库'));

      const quantityInput = screen.getByLabelText(/数量|入库数量/i);
      await user.type(quantityInput, '20');

      const submitButton = screen.getByRole('button', { name: /确定|入库|提交/i });
      await user.click(submitButton);

      // 验证显示成功提示
      await waitFor(() => {
        expect(screen.getByText(/操作成功|入库成功/i)).toBeInTheDocument();
      });
    });
  });

  describe('场景4：权限控制验证', () => {
    it('应该根据用户权限显示/隐藏操作按钮', async () => {
      // Mock无写权限的用户
      mockUseAuth.hasPermission = jest.fn((permission) => 
        permission === 'inventory:read'
      );

      render(<ProductManagement />);

      // 验证只显示查看相关的元素，不显示编辑/删除按钮
      expect(screen.getByText('笔记本电脑')).toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /新增|添加|创建/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /编辑|修改/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /删除/i })).not.toBeInTheDocument();
    });

    it('应该在无权限时显示提示信息', async () => {
      // Mock无任何权限的用户
      mockUseAuth.hasPermission = jest.fn(() => false);

      render(<ProductManagement />);

      // 验证显示无权限提示
      expect(screen.getByText(/无权限|权限不足/i)).toBeInTheDocument();
    });
  });

  describe('场景5：加载状态处理', () => {
    it('应该在数据加载时显示加载状态', async () => {
      // Mock加载状态
      mockUseInventory.loading = true;
      mockUseInventory.products = [];

      render(<ProductManagement />);

      // 验证显示加载指示器
      expect(screen.getByText(/加载中|Loading/i)).toBeInTheDocument();
    });

    it('应该在发生错误时显示错误信息', async () => {
      // Mock错误状态
      mockUseInventory.loading = false;
      mockUseInventory.error = '获取商品数据失败';

      render(<ProductManagement />);

      // 验证显示错误信息
      expect(screen.getByText(/获取商品数据失败/i)).toBeInTheDocument();
    });
  });
});