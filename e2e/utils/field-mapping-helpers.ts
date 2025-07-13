/**
 * 字段映射验证辅助工具
 * 用于E2E测试中验证字段映射的正确性
 */

import { Page } from '@playwright/test';

export class FieldMappingHelpers {
  /**
   * 验证商品列表中的字段显示
   */
  static async verifyProductListFields(page: Page) {
    const requiredFields = [
      { testId: 'product-sku', label: 'SKU' },
      { testId: 'product-name', label: '商品名称' },
      { testId: 'product-brand', label: '品牌' },
      { testId: 'product-model', label: '型号' },
      { testId: 'product-stock', label: '库存数量' },
      { testId: 'product-reserved', label: '预留数量' },
      { testId: 'product-available', label: '可用数量' },
      { testId: 'product-sale-price', label: '销售价' },
      { testId: 'product-purchase-price', label: '采购价' },
      { testId: 'product-category', label: '分类' },
      { testId: 'product-supplier', label: '供应商' },
      { testId: 'product-status', label: '状态' }
    ];
    
    const results = [];
    
    for (const field of requiredFields) {
      try {
        const element = page.locator(`[data-testid="${field.testId}"]`).first();
        const isVisible = await element.isVisible({ timeout: 5000 });
        results.push({ field: field.label, visible: isVisible });
      } catch (error) {
        results.push({ field: field.label, visible: false, error: error.message });
      }
    }
    
    return results;
  }
  
  /**
   * 验证商品详情页面的字段显示
   */
  static async verifyProductDetailFields(page: Page) {
    const detailFields = [
      { testId: 'detail-sku', label: 'SKU' },
      { testId: 'detail-name', label: '商品名称' },
      { testId: 'detail-description', label: '商品描述' },
      { testId: 'detail-brand', label: '品牌' },
      { testId: 'detail-model', label: '型号' },
      { testId: 'detail-barcode', label: '条形码' },
      { testId: 'detail-stock-quantity', label: '库存数量' },
      { testId: 'detail-reserved-quantity', label: '预留数量' },
      { testId: 'detail-available-quantity', label: '可用数量' },
      { testId: 'detail-sale-price', label: '销售价' },
      { testId: 'detail-purchase-price', label: '采购价' },
      { testId: 'detail-total-value', label: '总价值' },
      { testId: 'detail-min-stock', label: '最低库存' },
      { testId: 'detail-max-stock', label: '最高库存' },
      { testId: 'detail-category', label: '分类' },
      { testId: 'detail-supplier', label: '供应商' },
      { testId: 'detail-unit', label: '单位' },
      { testId: 'detail-location', label: '存储位置' },
      { testId: 'detail-status', label: '状态' },
      { testId: 'detail-created-at', label: '创建时间' },
      { testId: 'detail-updated-at', label: '更新时间' }
    ];
    
    const results = [];
    
    for (const field of detailFields) {
      try {
        const element = page.locator(`[data-testid="${field.testId}"]`);
        const isVisible = await element.isVisible({ timeout: 5000 });
        const value = isVisible ? await element.textContent() : null;
        results.push({ 
          field: field.label, 
          visible: isVisible, 
          value: value?.trim() || null 
        });
      } catch (error) {
        results.push({ 
          field: field.label, 
          visible: false, 
          error: error.message 
        });
      }
    }
    
    return results;
  }
  
  /**
   * 验证表单字段的完整性
   */
  static async verifyFormFields(page: Page, formSelector: string) {
    const formFields = [
      { name: 'name', label: '商品名称', required: true },
      { name: 'sku', label: 'SKU', required: true },
      { name: 'description', label: '商品描述', required: false },
      { name: 'brand', label: '品牌', required: false },
      { name: 'model', label: '型号', required: false },
      { name: 'barcode', label: '条形码', required: false },
      { name: 'stockQuantity', label: '库存数量', required: true },
      { name: 'reservedQuantity', label: '预留数量', required: false },
      { name: 'salePrice', label: '销售价', required: true },
      { name: 'purchasePrice', label: '采购价', required: true },
      { name: 'minStock', label: '最低库存', required: false },
      { name: 'maxStock', label: '最高库存', required: false },
      { name: 'categoryId', label: '分类', required: false },
      { name: 'supplierId', label: '供应商', required: false },
      { name: 'unitId', label: '单位', required: false },
      { name: 'location', label: '存储位置', required: false },
      { name: 'status', label: '状态', required: true }
    ];
    
    const results = [];
    
    for (const field of formFields) {
      try {
        const fieldElement = page.locator(`${formSelector} [name="${field.name}"]`);
        const isVisible = await fieldElement.isVisible({ timeout: 5000 });
        const isRequired = field.required ? await fieldElement.getAttribute('required') !== null : false;
        
        results.push({
          field: field.label,
          name: field.name,
          visible: isVisible,
          required: field.required,
          actuallyRequired: isRequired
        });
      } catch (error) {
        results.push({
          field: field.label,
          name: field.name,
          visible: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * 验证数据完整性
   */
  static async verifyDataIntegrity(page: Page, expectedData: any) {
    const verificationResults = {
      sku: null,
      name: null,
      stockQuantity: null,
      reservedQuantity: null,
      availableQuantity: null,
      salePrice: null,
      purchasePrice: null,
      minStock: null,
      maxStock: null,
      category: null,
      supplier: null,
      status: null,
      calculatedFields: {
        availableQuantityCorrect: false,
        totalValueCorrect: false
      }
    };
    
    try {
      // 验证基本字段
      verificationResults.sku = await this.getFieldValue(page, 'detail-sku');
      verificationResults.name = await this.getFieldValue(page, 'detail-name');
      verificationResults.stockQuantity = await this.getFieldValue(page, 'detail-stock-quantity');
      verificationResults.reservedQuantity = await this.getFieldValue(page, 'detail-reserved-quantity');
      verificationResults.availableQuantity = await this.getFieldValue(page, 'detail-available-quantity');
      verificationResults.salePrice = await this.getFieldValue(page, 'detail-sale-price');
      verificationResults.purchasePrice = await this.getFieldValue(page, 'detail-purchase-price');
      verificationResults.minStock = await this.getFieldValue(page, 'detail-min-stock');
      verificationResults.maxStock = await this.getFieldValue(page, 'detail-max-stock');
      verificationResults.category = await this.getFieldValue(page, 'detail-category');
      verificationResults.supplier = await this.getFieldValue(page, 'detail-supplier');
      verificationResults.status = await this.getFieldValue(page, 'detail-status');
      
      // 验证计算字段
      const stockQty = parseInt(verificationResults.stockQuantity || '0');
      const reservedQty = parseInt(verificationResults.reservedQuantity || '0');
      const availableQty = parseInt(verificationResults.availableQuantity || '0');
      
      verificationResults.calculatedFields.availableQuantityCorrect = 
        availableQty === (stockQty - reservedQty);
      
      const totalValue = await this.getFieldValue(page, 'detail-total-value');
      const salePrice = parseFloat(verificationResults.salePrice || '0');
      const expectedTotalValue = stockQty * salePrice;
      
      verificationResults.calculatedFields.totalValueCorrect = 
        Math.abs(parseFloat(totalValue || '0') - expectedTotalValue) < 0.01;
      
    } catch (error) {
      console.error('验证数据完整性时发生错误:', error);
    }
    
    return verificationResults;
  }
  
  /**
   * 获取字段值
   */
  private static async getFieldValue(page: Page, testId: string): Promise<string | null> {
    try {
      const element = page.locator(`[data-testid="${testId}"]`);
      const isVisible = await element.isVisible({ timeout: 3000 });
      return isVisible ? await element.textContent() : null;
    } catch (error) {
      return null;
    }
  }
  
  /**
   * 验证搜索结果的字段映射
   */
  static async verifySearchResultFields(page: Page, searchTerm: string) {
    const results = [];
    const productRows = page.locator('[data-testid="product-row"]');
    const count = await productRows.count();
    
    for (let i = 0; i < count; i++) {
      const row = productRows.nth(i);
      
      const sku = await row.locator('[data-testid="product-sku"]').textContent();
      const name = await row.locator('[data-testid="product-name"]').textContent();
      const brand = await row.locator('[data-testid="product-brand"]').textContent();
      const model = await row.locator('[data-testid="product-model"]').textContent();
      
      const matchesSearch = 
        sku?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        brand?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        model?.toLowerCase().includes(searchTerm.toLowerCase());
      
      results.push({
        index: i,
        sku: sku?.trim(),
        name: name?.trim(),
        brand: brand?.trim(),
        model: model?.trim(),
        matchesSearch
      });
    }
    
    return results;
  }
  
  /**
   * 验证批量操作的字段映射
   */
  static async verifyBatchOperationFields(page: Page, operation: string) {
    const fieldMappings = {
      'update-price': [
        { name: 'salePrice', label: '销售价' },
        { name: 'purchasePrice', label: '采购价' }
      ],
      'update-stock': [
        { name: 'stockQuantity', label: '库存数量' },
        { name: 'minStock', label: '最低库存' },
        { name: 'maxStock', label: '最高库存' }
      ],
      'update-category': [
        { name: 'categoryId', label: '分类' }
      ],
      'update-supplier': [
        { name: 'supplierId', label: '供应商' }
      ]
    };
    
    const expectedFields = fieldMappings[operation] || [];
    const results = [];
    
    for (const field of expectedFields) {
      try {
        const element = page.locator(`[name="${field.name}"]`);
        const isVisible = await element.isVisible({ timeout: 5000 });
        results.push({
          field: field.label,
          name: field.name,
          visible: isVisible
        });
      } catch (error) {
        results.push({
          field: field.label,
          name: field.name,
          visible: false,
          error: error.message
        });
      }
    }
    
    return results;
  }
  
  /**
   * 生成字段映射验证报告
   */
  static generateFieldMappingReport(verificationResults: any[]) {
    const report = {
      totalFields: verificationResults.length,
      visibleFields: verificationResults.filter(r => r.visible).length,
      missingFields: verificationResults.filter(r => !r.visible),
      fieldDetails: verificationResults
    };
    
    return report;
  }
}