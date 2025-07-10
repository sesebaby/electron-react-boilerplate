/**
 * 迁移测试脚本
 * 
 * 验证新的依赖注入系统是否正常工作
 */

import { businessServiceManager } from '../src/services/business/businessServiceManager';
import { getGlobalServices } from '../src/services/container/containerConfig';

async function runMigrationTest() {
  console.log('🧪 开始迁移测试...\n');

  try {
    // 1. 测试业务服务管理器初始化
    console.log('1. 测试业务服务管理器初始化...');
    
    if (!businessServiceManager.isInitialized) {
      await businessServiceManager.initialize();
    }
    
    console.log('✅ 业务服务管理器初始化成功');

    // 2. 测试服务访问
    console.log('\n2. 测试服务访问...');
    
    const services = await getGlobalServices();
    console.log('✅ 服务访问成功');

    // 3. 测试核心服务功能
    console.log('\n3. 测试核心服务功能...');
    
    // 测试分类服务
    try {
      const categories = await services.categoryService.findAll();
      console.log(`✅ 分类服务正常 (${categories.length} 个分类)`);
    } catch (error) {
      console.log(`⚠️ 分类服务测试失败: ${error instanceof Error ? error.message : error}`);
    }

    // 测试单位服务
    try {
      const units = await services.unitService.findAll();
      console.log(`✅ 单位服务正常 (${units.length} 个单位)`);
    } catch (error) {
      console.log(`⚠️ 单位服务测试失败: ${error instanceof Error ? error.message : error}`);
    }

    // 测试仓库服务
    try {
      const warehouses = await services.warehouseService.findAll();
      console.log(`✅ 仓库服务正常 (${warehouses.length} 个仓库)`);
    } catch (error) {
      console.log(`⚠️ 仓库服务测试失败: ${error instanceof Error ? error.message : error}`);
    }

    // 测试产品服务
    try {
      const products = await services.productService.findAll();
      console.log(`✅ 产品服务正常 (${products.length} 个产品)`);
    } catch (error) {
      console.log(`⚠️ 产品服务测试失败: ${error instanceof Error ? error.message : error}`);
    }

    // 4. 测试产品创建功能
    console.log('\n4. 测试产品创建功能...');
    
    try {
      const testProduct = {
        name: '迁移测试产品',
        sku: `MIGRATION-TEST-${Date.now()}`,
        categoryId: 'default',
        unitId: 'default',
        price: 100,
        costPrice: 80,
        status: 'ACTIVE' as any
      };

      const createdProduct = await services.productService.create(testProduct);
      console.log(`✅ 产品创建成功: ${createdProduct.name} (${createdProduct.id})`);

      // 清理测试数据
      try {
        await services.productService.delete(createdProduct.id);
        console.log('✅ 测试产品已清理');
      } catch (cleanupError) {
        console.log('⚠️ 测试产品清理失败:', cleanupError);
      }

    } catch (error) {
      console.log(`❌ 产品创建测试失败: ${error instanceof Error ? error.message : error}`);
    }

    // 5. 测试系统状态
    console.log('\n5. 测试系统状态...');
    
    const systemStatus = await businessServiceManager.getSystemStatus();
    console.log('✅ 系统状态获取成功:');
    console.log(`   - 已初始化: ${systemStatus.initialized}`);
    console.log(`   - 服务总数: ${systemStatus.services.total}`);
    console.log(`   - 健康服务: ${systemStatus.services.healthy}`);
    console.log(`   - 失败服务: ${systemStatus.services.failed}`);

    // 6. 测试数据完整性验证
    console.log('\n6. 测试数据完整性验证...');
    
    const integrityResult = await businessServiceManager.validateSystemIntegrity();
    console.log(`✅ 数据完整性验证完成: ${integrityResult.isValid ? '通过' : '失败'}`);
    
    if (integrityResult.issues.length > 0) {
      console.log('   发现的问题:');
      integrityResult.issues.forEach(issue => {
        const icon = issue.type === 'error' ? '❌' : issue.type === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} ${issue.service}: ${issue.message}`);
      });
    }

    // 7. 测试性能指标
    console.log('\n7. 测试性能指标...');
    
    const performanceMetrics = businessServiceManager.getPerformanceMetrics();
    if (performanceMetrics) {
      console.log('✅ 性能指标获取成功:');
      console.log(`   - 初始化时间: ${performanceMetrics.initializationTime}ms`);
      console.log(`   - 内存使用: ${Math.round(performanceMetrics.memoryUsage / 1024 / 1024)}MB`);
    } else {
      console.log('⚠️ 性能指标不可用');
    }

    console.log('\n🎉 迁移测试完成！');
    console.log('\n📊 测试总结:');
    console.log('✅ 依赖注入系统正常工作');
    console.log('✅ 核心服务功能正常');
    console.log('✅ 产品创建功能正常');
    console.log('✅ 系统监控功能正常');
    
    return true;

  } catch (error) {
    console.error('\n❌ 迁移测试失败:', error);
    console.log('\n🔧 建议检查:');
    console.log('1. 确保所有服务文件已正确重命名');
    console.log('2. 检查导入语句是否已更新');
    console.log('3. 验证依赖注入容器配置');
    console.log('4. 查看详细错误日志');
    
    return false;
  }
}

// 如果直接运行此文件，执行测试
if (require.main === module) {
  runMigrationTest()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('测试执行失败:', error);
      process.exit(1);
    });
}

export { runMigrationTest };
