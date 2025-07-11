import { Page, ElectronApplication, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import path from 'path';

/**
 * E2E测试辅助工具类
 */
export class TestHelpers {
  
  /**
   * 启动Electron应用
   */
  static async launchElectronApp(): Promise<ElectronApplication> {
    const electronApp = await electron.launch({
      args: [
        path.join(__dirname, '../../public/main.js'),
        '--test-mode',
        '--test-db-path=' + path.join(__dirname, '../../test-db/inventory.db')
      ],
      timeout: 30000,
    });
    
    return electronApp;
  }
  
  /**
   * 等待应用完全加载
   */
  static async waitForAppLoad(page: Page): Promise<void> {
    // 等待系统初始化完成
    await page.waitForSelector('[data-testid="app-loaded"]', { 
      timeout: 30000,
      state: 'attached'
    });
    
    // 等待加载动画消失
    await expect(page.locator('.loading-indicator')).toBeHidden({ timeout: 10000 });
  }
  
  /**
   * 用户登录
   */
  static async login(page: Page, username: string = 'admin', password: string = '123456'): Promise<void> {
    // 等待登录页面加载
    await page.waitForSelector('[data-testid="login-form"]', { timeout: 10000 });
    
    // 填写登录信息
    await page.fill('[data-testid="username-input"]', username);
    await page.fill('[data-testid="password-input"]', password);
    
    // 点击登录按钮
    await page.click('[data-testid="login-button"]');
    
    // 等待登录成功，进入dashboard
    await page.waitForSelector('[data-testid="dashboard"]', { timeout: 15000 });
    
    console.log(`✅ 用户 ${username} 登录成功`);
  }
  
  /**
   * 导航到指定页面
   */
  static async navigateToPage(page: Page, pageName: string): Promise<void> {
    // 点击侧边栏导航
    await page.click(`[data-testid="nav-${pageName}"]`);
    
    // 等待页面加载
    await page.waitForSelector(`[data-testid="${pageName}-page"]`, { timeout: 10000 });
    
    console.log(`📄 已导航到 ${pageName} 页面`);
  }
  
  /**
   * 等待并验证成功提示
   */
  static async waitForSuccessMessage(page: Page, message?: string): Promise<void> {
    const successToast = page.locator('[data-testid="success-toast"]');
    await expect(successToast).toBeVisible({ timeout: 5000 });
    
    if (message) {
      await expect(successToast).toContainText(message);
    }
    
    // 等待提示消失
    await expect(successToast).toBeHidden({ timeout: 5000 });
  }
  
  /**
   * 等待并验证错误提示
   */
  static async waitForErrorMessage(page: Page, message?: string): Promise<void> {
    const errorToast = page.locator('[data-testid="error-toast"]');
    await expect(errorToast).toBeVisible({ timeout: 5000 });
    
    if (message) {
      await expect(errorToast).toContainText(message);
    }
  }
  
  /**
   * 填写表单字段
   */
  static async fillForm(page: Page, formData: Record<string, string>): Promise<void> {
    for (const [fieldName, value] of Object.entries(formData)) {
      const selector = `[data-testid="${fieldName}-input"], [name="${fieldName}"]`;
      await page.fill(selector, value);
    }
  }
  
  /**
   * 选择下拉框选项
   */
  static async selectOption(page: Page, selectName: string, optionValue: string): Promise<void> {
    await page.click(`[data-testid="${selectName}-select"]`);
    await page.click(`[data-testid="${selectName}-option-${optionValue}"]`);
  }
  
  /**
   * 验证表格数据
   */
  static async verifyTableData(page: Page, tableSelector: string, expectedData: string[][]): Promise<void> {
    const table = page.locator(tableSelector);
    await expect(table).toBeVisible();
    
    for (let rowIndex = 0; rowIndex < expectedData.length; rowIndex++) {
      const row = expectedData[rowIndex];
      for (let colIndex = 0; colIndex < row.length; colIndex++) {
        const cellSelector = `${tableSelector} tbody tr:nth-child(${rowIndex + 1}) td:nth-child(${colIndex + 1})`;
        await expect(page.locator(cellSelector)).toContainText(row[colIndex]);
      }
    }
  }
  
  /**
   * 等待加载完成
   */
  static async waitForLoadingComplete(page: Page): Promise<void> {
    // 等待所有加载指示器消失
    const loadingIndicators = [
      '.loading-spinner',
      '.skeleton-loader',
      '[data-testid="loading"]'
    ];
    
    for (const indicator of loadingIndicators) {
      const elements = page.locator(indicator);
      if (await elements.count() > 0) {
        await expect(elements.first()).toBeHidden({ timeout: 10000 });
      }
    }
  }
  
  /**
   * 截图保存（用于调试）
   */
  static async takeDebugScreenshot(page: Page, name: string): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `debug-${name}-${timestamp}.png`;
    await page.screenshot({ 
      path: path.join(__dirname, '../../test-results/screenshots', filename),
      fullPage: true 
    });
    console.log(`📸 调试截图已保存: ${filename}`);
  }
  
  /**
   * 生成测试数据
   */
  static generateTestData() {
    const timestamp = Date.now();
    return {
      product: {
        name: `测试商品_${timestamp}`,
        sku: `SKU_${timestamp}`,
        description: `测试商品描述_${timestamp}`,
        purchasePrice: 100.00,
        salePrice: 150.00,
        minStock: 10,
        maxStock: 100
      },
      supplier: {
        name: `测试供应商_${timestamp}`,
        code: `SUP_${timestamp}`,
        contact: '张三',
        phone: '13800138000'
      },
      customer: {
        name: `测试客户_${timestamp}`,
        code: `CUS_${timestamp}`,
        contact: '李四',
        phone: '13900139000'
      }
    };
  }
}

/**
 * 测试数据管理器
 */
export class TestDataManager {
  private static createdData: string[] = [];
  
  /**
   * 记录创建的测试数据
   */
  static recordCreatedData(id: string): void {
    this.createdData.push(id);
  }
  
  /**
   * 清理所有测试数据
   */
  static async cleanupTestData(page: Page): Promise<void> {
    // 这里可以实现清理逻辑
    // 例如：删除测试过程中创建的数据
    console.log(`🧹 清理 ${this.createdData.length} 条测试数据`);
    this.createdData = [];
  }
}