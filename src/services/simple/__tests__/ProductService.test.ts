/**
 * ProductService 单元测试
 * 验证轻量级产品服务的功能正确性
 */

import { ProductService, ServiceResult } from '../ProductService';
import { Product, ProductStatus } from '../../../types/entities';

// Mock window.electronAPI
const mockElectronAPI = {
  dbGetAllProducts: jest.fn(),
  dbGetProduct: jest.fn(),
  dbGetProductBySKU: jest.fn(),
  dbGetProductByBarcode: jest.fn(),
  dbCreateProduct: jest.fn(),
  dbUpdateProduct: jest.fn(),
  dbDeleteProduct: jest.fn(),
  dbCheckProductHasStock: jest.fn(),
  dbCheckProductHasOrders: jest.fn(),
};

// 设置全局mock
(global as any).window = {
  electronAPI: mockElectronAPI
};

describe('ProductService', () => {
  let productService: ProductService;

  beforeEach(() => {
    productService = new ProductService();
    jest.clearAllMocks();
  });

  describe('getProducts', () => {
    const mockProducts: Product[] = [
      {
        id: '1',
        name: '测试商品1',
        sku: 'TEST001',
        description: '测试描述1',
        categoryId: 'cat1',
        unitId: 'unit1',
        costPrice: 10,
        salePrice: 15,
        barcode: '123456789',
        status: ProductStatus.ACTIVE,
        minStock: 5,
        maxStock: 100,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: '2',
        name: '测试商品2',
        sku: 'TEST002',
        description: '测试描述2',
        categoryId: 'cat2',
        unitId: 'unit1',
        costPrice: 20,
        salePrice: 30,
        barcode: '987654321',
        status: ProductStatus.INACTIVE,
        minStock: 10,
        maxStock: 200,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    test('should return all products when no filter is provided', async () => {
      mockElectronAPI.dbGetAllProducts.mockResolvedValue(mockProducts);

      const result = await productService.getProducts();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProducts);
      expect(mockElectronAPI.dbGetAllProducts).toHaveBeenCalledTimes(1);
    });

    test('should filter products by category', async () => {
      mockElectronAPI.dbGetAllProducts.mockResolvedValue(mockProducts);

      const result = await productService.getProducts({ categoryId: 'cat1' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].categoryId).toBe('cat1');
    });

    test('should filter products by status', async () => {
      mockElectronAPI.dbGetAllProducts.mockResolvedValue(mockProducts);

      const result = await productService.getProducts({ status: ProductStatus.ACTIVE });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].status).toBe(ProductStatus.ACTIVE);
    });

    test('should search products by name and SKU', async () => {
      mockElectronAPI.dbGetAllProducts.mockResolvedValue(mockProducts);

      const result = await productService.getProducts({ search: 'TEST001' });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].sku).toBe('TEST001');
    });

    test('should handle pagination', async () => {
      mockElectronAPI.dbGetAllProducts.mockResolvedValue(mockProducts);

      const result = await productService.getProducts({ limit: 1, offset: 0 });

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
    });

    test('should handle database errors', async () => {
      mockElectronAPI.dbGetAllProducts.mockRejectedValue(new Error('Database error'));

      const result = await productService.getProducts();

      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
    });
  });

  describe('getProduct', () => {
    const mockProduct: Product = {
      id: '1',
      name: '测试商品',
      sku: 'TEST001',
      description: '测试描述',
      categoryId: 'cat1',
      unitId: 'unit1',
      costPrice: 10,
      salePrice: 15,
      barcode: '123456789',
      status: ProductStatus.ACTIVE,
      minStock: 5,
      maxStock: 100,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    test('should return product when found', async () => {
      mockElectronAPI.dbGetProduct.mockResolvedValue(mockProduct);

      const result = await productService.getProduct('1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockProduct);
      expect(mockElectronAPI.dbGetProduct).toHaveBeenCalledWith('1');
    });

    test('should return error when product not found', async () => {
      mockElectronAPI.dbGetProduct.mockResolvedValue(null);

      const result = await productService.getProduct('999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('产品不存在');
    });

    test('should return error when id is empty', async () => {
      const result = await productService.getProduct('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('产品ID不能为空');
    });
  });

  describe('createProduct', () => {
    const createProductData = {
      name: '新商品',
      sku: 'NEW001',
      description: '新商品描述',
      categoryId: 'cat1',
      unitId: 'unit1',
      costPrice: 10,
      salePrice: 15
    };

    test('should create product successfully', async () => {
      mockElectronAPI.dbGetProductBySKU.mockResolvedValue(null);
      mockElectronAPI.dbGetProductByBarcode.mockResolvedValue(null);
      mockElectronAPI.dbCreateProduct.mockResolvedValue({
        ...createProductData,
        id: 'new-id',
        createdAt: new Date(),
        updatedAt: new Date()
      });

      const result = await productService.createProduct(createProductData);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('新商品');
      expect(mockElectronAPI.dbCreateProduct).toHaveBeenCalled();
    });

    test('should reject when name is empty', async () => {
      const result = await productService.createProduct({
        ...createProductData,
        name: ''
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('商品名称不能为空');
    });

    test('should reject when SKU is empty', async () => {
      const result = await productService.createProduct({
        ...createProductData,
        sku: ''
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SKU不能为空');
    });

    test('should reject when SKU already exists', async () => {
      mockElectronAPI.dbGetProductBySKU.mockResolvedValue({ id: 'existing-id' });

      const result = await productService.createProduct(createProductData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('SKU "NEW001" 已存在');
    });

    test('should reject when barcode already exists', async () => {
      mockElectronAPI.dbGetProductBySKU.mockResolvedValue(null);
      mockElectronAPI.dbGetProductByBarcode.mockResolvedValue({ id: 'existing-id' });

      const result = await productService.createProduct({
        ...createProductData,
        barcode: '123456789'
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe('条形码 "123456789" 已存在');
    });
  });

  describe('updateProduct', () => {
    const existingProduct: Product = {
      id: '1',
      name: '原商品',
      sku: 'OLD001',
      description: '原描述',
      categoryId: 'cat1',
      unitId: 'unit1',
      costPrice: 10,
      salePrice: 15,
      barcode: '123456789',
      status: ProductStatus.ACTIVE,
      minStock: 5,
      maxStock: 100,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    test('should update product successfully', async () => {
      mockElectronAPI.dbGetProduct.mockResolvedValue(existingProduct);
      mockElectronAPI.dbUpdateProduct.mockResolvedValue({
        ...existingProduct,
        name: '更新后的商品'
      });

      const result = await productService.updateProduct('1', { name: '更新后的商品' });

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('更新后的商品');
      expect(mockElectronAPI.dbUpdateProduct).toHaveBeenCalled();
    });

    test('should reject when product not found', async () => {
      mockElectronAPI.dbGetProduct.mockResolvedValue(null);

      const result = await productService.updateProduct('999', { name: '新名称' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('产品不存在');
    });

    test('should reject when updating to existing SKU', async () => {
      mockElectronAPI.dbGetProduct.mockResolvedValue(existingProduct);
      mockElectronAPI.dbGetProductBySKU.mockResolvedValue({ id: 'other-id' });

      const result = await productService.updateProduct('1', { sku: 'EXISTING_SKU' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('SKU "EXISTING_SKU" 已存在');
    });
  });

  describe('deleteProduct', () => {
    const existingProduct: Product = {
      id: '1',
      name: '待删除商品',
      sku: 'DELETE001',
      description: '待删除描述',
      categoryId: 'cat1',
      unitId: 'unit1',
      costPrice: 10,
      salePrice: 15,
      barcode: '123456789',
      status: ProductStatus.ACTIVE,
      minStock: 5,
      maxStock: 100,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    test('should delete product successfully', async () => {
      mockElectronAPI.dbGetProduct.mockResolvedValue(existingProduct);
      mockElectronAPI.dbCheckProductHasStock.mockResolvedValue(false);
      mockElectronAPI.dbCheckProductHasOrders.mockResolvedValue(false);
      mockElectronAPI.dbDeleteProduct.mockResolvedValue(true);

      const result = await productService.deleteProduct('1');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
      expect(mockElectronAPI.dbDeleteProduct).toHaveBeenCalledWith('1');
    });

    test('should reject when product not found', async () => {
      mockElectronAPI.dbGetProduct.mockResolvedValue(null);

      const result = await productService.deleteProduct('999');

      expect(result.success).toBe(false);
      expect(result.error).toBe('产品不存在');
    });

    test('should reject when product has stock', async () => {
      mockElectronAPI.dbGetProduct.mockResolvedValue(existingProduct);
      mockElectronAPI.dbCheckProductHasStock.mockResolvedValue(true);

      const result = await productService.deleteProduct('1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('商品有库存，无法删除');
    });

    test('should reject when product has orders', async () => {
      mockElectronAPI.dbGetProduct.mockResolvedValue(existingProduct);
      mockElectronAPI.dbCheckProductHasStock.mockResolvedValue(false);
      mockElectronAPI.dbCheckProductHasOrders.mockResolvedValue(true);

      const result = await productService.deleteProduct('1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('商品有关联订单，无法删除');
    });
  });

  describe('validateSKU', () => {
    test('should return true for unique SKU', async () => {
      mockElectronAPI.dbGetProductBySKU.mockResolvedValue(null);

      const result = await productService.validateSKU('UNIQUE001');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    test('should return false for existing SKU', async () => {
      mockElectronAPI.dbGetProductBySKU.mockResolvedValue({ id: 'existing-id' });

      const result = await productService.validateSKU('EXISTING001');

      expect(result.success).toBe(true);
      expect(result.data).toBe(false);
    });

    test('should return true when SKU exists but belongs to excluded product', async () => {
      mockElectronAPI.dbGetProductBySKU.mockResolvedValue({ id: 'excluded-id' });

      const result = await productService.validateSKU('EXISTING001', 'excluded-id');

      expect(result.success).toBe(true);
      expect(result.data).toBe(true);
    });

    test('should reject empty SKU', async () => {
      const result = await productService.validateSKU('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('SKU不能为空');
    });
  });
});
