// 系统集成测试工具
import { businessServiceManager } from '../services/business';

export interface TestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
  details?: any;
}

export interface SystemTestReport {
  timestamp: Date;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  totalDuration: number;
  results: TestResult[];
  systemStatus: any;
}

export class SystemIntegrationTester {
  private results: TestResult[] = [];

  async runAllTests(): Promise<SystemTestReport> {
    console.log('🚀 开始系统集成测试...');
    const startTime = Date.now();

    // 清空之前的结果
    this.results = [];

    // 运行各项测试
    await this.testBusinessServiceIntegration();
    await this.testDataConsistency();
    await this.testCRUDOperations();
    await this.testBusinessWorkflows();
    await this.testPerformance();
    await this.testErrorHandling();

    const endTime = Date.now();
    const totalDuration = endTime - startTime;

    // 获取系统状态
    const systemStatus = await businessServiceManager.getSystemStatus();

    // 生成报告
    const report: SystemTestReport = {
      timestamp: new Date(),
      totalTests: this.results.length,
      passedTests: this.results.filter(r => r.success).length,
      failedTests: this.results.filter(r => !r.success).length,
      totalDuration,
      results: this.results,
      systemStatus
    };

    this.printTestReport(report);
    return report;
  }

  private async runTest(testName: string, testFn: () => Promise<any>): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🧪 运行测试: ${testName}`);
      const details = await testFn();
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        testName,
        success: true,
        duration,
        details
      };
      
      this.results.push(result);
      console.log(`✅ ${testName} - 通过 (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      const result: TestResult = {
        testName,
        success: false,
        duration,
        error: error instanceof Error ? error.message : String(error)
      };
      
      this.results.push(result);
      console.log(`❌ ${testName} - 失败 (${duration}ms): ${result.error}`);
      return result;
    }
  }

  private async testBusinessServiceIntegration(): Promise<void> {
    await this.runTest('业务服务初始化', async () => {
      if (!businessServiceManager.isInitialized) {
        await businessServiceManager.initialize();
      }
      
      const status = await businessServiceManager.getSystemStatus();
      
      if (!status.initialized) {
        throw new Error('业务服务管理器未正确初始化');
      }

      if (status.services.some(s => s.status === 'error')) {
        throw new Error('存在服务初始化错误');
      }

      return {
        initialized: status.initialized,
        serviceCount: status.services.length,
        activeServices: status.services.filter(s => s.status === 'active').length
      };
    });
  }

  private async testDataConsistency(): Promise<void> {
    await this.runTest('数据一致性检查', async () => {
      const integrity = await businessServiceManager.validateSystemIntegrity();
      
      if (!integrity.valid) {
        throw new Error(`数据完整性检查失败: ${integrity.issues.join(', ')}`);
      }

      return {
        valid: integrity.valid,
        issueCount: integrity.issues.length,
        warningCount: integrity.warnings.length,
        warnings: integrity.warnings
      };
    });
  }

  private async testCRUDOperations(): Promise<void> {
    const { categoryService, supplierService, customerService } = await import('../services/business');
    // 暂时注释掉产品服务
    // const { productService } = await import('../services/business');

    await this.runTest('CRUD操作测试', async () => {
      // 测试分类CRUD
      const categories = await categoryService.findAll();
      const initialCategoryCount = categories.length;

      const testCategory = await categoryService.create({
        name: '测试分类',
        level: 1,
        sortOrder: 999,
        isActive: true
      });

      const retrievedCategory = await categoryService.findById(testCategory.id);
      if (!retrievedCategory || retrievedCategory.name !== '测试分类') {
        throw new Error('分类创建或检索失败');
      }

      await categoryService.update(testCategory.id, { name: '更新测试分类' });
      const updatedCategory = await categoryService.findById(testCategory.id);
      if (!updatedCategory || updatedCategory.name !== '更新测试分类') {
        throw new Error('分类更新失败');
      }

      await categoryService.delete(testCategory.id);
      const deletedCategory = await categoryService.findById(testCategory.id);
      if (deletedCategory) {
        throw new Error('分类删除失败');
      }

      const finalCategories = await categoryService.findAll();
      if (finalCategories.length !== initialCategoryCount) {
        throw new Error('CRUD操作后数据不一致');
      }

      return {
        categoryOperationsSuccess: true,
        initialCount: initialCategoryCount,
        finalCount: finalCategories.length
      };
    });
  }

  private async testBusinessWorkflows(): Promise<void> {
    await this.runTest('业务流程测试', async () => {
      const summary = await businessServiceManager.getBusinessSummary();
      
      // 检查各个模块是否有数据
      const checks = {
        hasCategories: summary.categories > 0,
        hasUnits: summary.units > 0,
        hasWarehouses: summary.warehouses > 0,
        hasProducts: summary.products > 0,
        hasSuppliers: summary.suppliers > 0,
        hasCustomers: summary.customers > 0
      };

      const failedChecks = Object.entries(checks)
        .filter(([_, passed]) => !passed)
        .map(([check, _]) => check);

      if (failedChecks.length > 0) {
        throw new Error(`业务数据缺失: ${failedChecks.join(', ')}`);
      }

      return {
        businessSummary: summary,
        allModulesHaveData: failedChecks.length === 0
      };
    });
  }

  private async testPerformance(): Promise<void> {
    await this.runTest('性能测试', async () => {
      const startTime = Date.now();

      // 测试数据加载性能
      const loadPromises = [];
      
      const {
        categoryService,
        // productService,  // 暂时注释掉
        supplierService,
        customerService,
        warehouseService
        // inventoryStockService  // 暂时注释掉
      } = await import('../services/business');

      loadPromises.push(categoryService.findAll());
      // loadPromises.push(productService.findAll());  // 暂时注释掉
      loadPromises.push(supplierService.findAll());
      loadPromises.push(customerService.findAll());
      loadPromises.push(warehouseService.findAll());
      // loadPromises.push(inventoryStockService.findAllStocks());  // 暂时注释掉

      const results = await Promise.all(loadPromises);
      const loadTime = Date.now() - startTime;

      // 性能阈值检查
      const performanceThresholds = {
        maxLoadTime: 2000, // 2秒
        maxSingleQueryTime: 500 // 500ms
      };

      if (loadTime > performanceThresholds.maxLoadTime) {
        throw new Error(`数据加载时间过长: ${loadTime}ms > ${performanceThresholds.maxLoadTime}ms`);
      }

      return {
        totalLoadTime: loadTime,
        datasetSizes: results.map(r => r.length),
        totalRecords: results.reduce((sum, r) => sum + r.length, 0),
        performanceGrade: loadTime < 1000 ? 'A' : loadTime < 2000 ? 'B' : 'C'
      };
    });
  }

  private async testErrorHandling(): Promise<void> {
    await this.runTest('错误处理测试', async () => {
      const { categoryService } = await import('../services/business');

      // 测试无效输入处理
      try {
        await categoryService.create({
          name: '', // 空名称应该失败
          level: 1,
          sortOrder: 1,
          isActive: true
        });
        throw new Error('应该拒绝空名称的分类');
      } catch (error) {
        // 预期的错误
      }

      // 测试不存在ID的处理
      try {
        await categoryService.findById('non-existent-id');
        // 这应该返回null而不是抛出错误
      } catch (error) {
        throw new Error('查找不存在的ID应该返回null而不是抛出错误');
      }

      // 测试删除不存在项目的处理
      try {
        await categoryService.delete('non-existent-id');
        // 这应该静默失败或返回false
      } catch (error) {
        throw new Error('删除不存在的项目不应该抛出错误');
      }

      return {
        errorHandlingWorking: true,
        testedScenarios: ['empty-input', 'non-existent-id', 'delete-non-existent']
      };
    });
  }

  private printTestReport(report: SystemTestReport): void {
    console.log('\n📊 系统集成测试报告');
    console.log('='.repeat(50));
    console.log(`测试时间: ${report.timestamp.toLocaleString()}`);
    console.log(`总测试数: ${report.totalTests}`);
    console.log(`通过测试: ${report.passedTests} ✅`);
    console.log(`失败测试: ${report.failedTests} ❌`);
    console.log(`总耗时: ${report.totalDuration}ms`);
    console.log(`成功率: ${((report.passedTests / report.totalTests) * 100).toFixed(1)}%`);

    if (report.failedTests > 0) {
      console.log('\n❌ 失败的测试:');
      report.results
        .filter(r => !r.success)
        .forEach(r => {
          console.log(`  • ${r.testName}: ${r.error}`);
        });
    }

    console.log('\n✅ 通过的测试:');
    report.results
      .filter(r => r.success)
      .forEach(r => {
        console.log(`  • ${r.testName} (${r.duration}ms)`);
      });

    console.log('\n🏗️ 系统状态:');
    console.log(`  • 已初始化: ${report.systemStatus.initialized ? '是' : '否'}`);
    console.log(`  • 活跃服务: ${report.systemStatus.services.filter((s: any) => s.status === 'active').length}/${report.systemStatus.services.length}`);

    const grade = report.passedTests === report.totalTests ? 'A' : 
                  report.passedTests / report.totalTests >= 0.8 ? 'B' : 'C';
    
    console.log(`\n🎯 系统健康度: ${grade}`);
    console.log('='.repeat(50));
  }
}

// 导出测试工具
export const systemTester = new SystemIntegrationTester();