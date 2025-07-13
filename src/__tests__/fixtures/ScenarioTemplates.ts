/**
 * 场景化测试模板
 * 提供预定义的业务场景数据集合
 */

import { BaseDomainFactory } from './BaseDomainFactory';
import { MasterDataFactory } from './MasterDataFactory';
import { InventoryDomainFactory } from './InventoryDomainFactory';
import { ReportDataFactory } from './ReportDataFactory';
import { TransactionType } from '../../types/entities';

export interface BusinessScenario {
  name: string;
  description: string;
  setup: () => any;
  cleanup?: () => void;
}

export class ScenarioTemplates extends BaseDomainFactory {

  /**
   * 新产品上架完整流程场景
   */
  static newProductLaunchScenario(): BusinessScenario {
    return {
      name: '新产品上架流程',
      description: '从创建分类、单位、仓库到产品上架的完整业务流程',
      setup: () => {
        // 清理现有数据
        this.clearAllData();

        // 1. 创建基础数据
        const category = MasterDataFactory.createCategory({
          name: '智能手机',
          description: '智能手机及配件'
        });

        const unit = MasterDataFactory.createUnit({
          name: '台',
          symbol: 'pcs',
          type: 'QUANTITY' as any,
          precision: 0
        });

        const warehouse = MasterDataFactory.createWarehouse({
          code: 'WH001',
          name: '主仓库',
          location: '北京市朝阳区',
          isDefault: true
        });

        // 2. 创建新产品
        const product = InventoryDomainFactory.createProduct({
          name: 'iPhone 15 Pro',
          sku: 'PHONE-IP15-PRO-001',
          description: 'Apple iPhone 15 Pro 256GB 深空黑色',
          categoryId: category.id,
          unitId: unit.id,
          brand: 'Apple',
          model: 'iPhone 15 Pro',
          barcode: '194253434558',
          purchasePrice: 7999,
          salePrice: 9999,
          minStock: 5,
          maxStock: 50
        });

        // 3. 创建初始库存
        const initialStock = InventoryDomainFactory.createInventoryStock({
          productId: product.id,
          warehouseId: warehouse.id,
          quantity: 20,
          reservedQuantity: 0
        });

        // 4. 创建入库事务记录
        const stockInTransaction = InventoryDomainFactory.createInventoryTransaction({
          productId: product.id,
          warehouseId: warehouse.id,
          type: TransactionType.STOCK_IN,
          quantity: 20,
          unitPrice: 7999,
          operator: 'admin',
          remark: '新产品首次入库'
        });

        return {
          category,
          unit,
          warehouse,
          product,
          initialStock,
          stockInTransaction,
          summary: {
            totalValue: 20 * 7999,
            expectedSaleValue: 20 * 9999
          }
        };
      },
      cleanup: () => {
        this.clearAllData();
      }
    };
  }

  /**
   * 库存盘点场景
   */
  static inventoryAuditScenario(): BusinessScenario {
    return {
      name: '库存盘点场景',
      description: '多产品多仓库的库存盘点和调整流程',
      setup: () => {
        this.clearAllData();

        // 创建基础数据
        const masterData = MasterDataFactory.createMasterDataSet();
        const { products, stocks } = InventoryDomainFactory.createProductCatalog(10);

        // 模拟盘点发现的差异
        const auditResults = products.map(product => {
          const productStocks = stocks.filter(s => s.productId === product.id);
          return productStocks.map(stock => {
            const systemQuantity = stock.quantity;
            const auditQuantity = Math.max(0, systemQuantity + this.randomInt(-5, 5));
            const difference = auditQuantity - systemQuantity;
            
            return {
              productId: product.id,
              productName: product.name,
              warehouseId: stock.warehouseId,
              systemQuantity,
              auditQuantity,
              difference,
              needsAdjustment: difference !== 0
            };
          });
        }).flat();

        // 生成调整事务
        const adjustmentTransactions = auditResults
          .filter(result => result.needsAdjustment)
          .map(result => 
            InventoryDomainFactory.createInventoryTransaction({
              productId: result.productId,
              warehouseId: result.warehouseId,
              type: TransactionType.STOCK_ADJUST,
              quantity: result.difference,
              unitPrice: 0, // 盘点调整不涉及价格
              operator: 'audit_user',
              remark: `库存盘点调整: 系统${result.systemQuantity}, 实盘${result.auditQuantity}`
            })
          );

        return {
          masterData,
          products,
          originalStocks: stocks,
          auditResults,
          adjustmentTransactions,
          summary: {
            totalProducts: products.length,
            totalAuditItems: auditResults.length,
            adjustmentCount: adjustmentTransactions.length,
            totalDifference: auditResults.reduce((sum, r) => sum + Math.abs(r.difference), 0)
          }
        };
      }
    };
  }

  /**
   * 月末结算场景
   */
  static monthEndClosingScenario(): BusinessScenario {
    return {
      name: '月末结算场景',
      description: '月末库存结算和报表生成场景',
      setup: () => {
        this.clearAllData();

        // 创建一个月的业务数据
        const masterData = MasterDataFactory.createMasterDataSet();
        const { products, stocks } = InventoryDomainFactory.createProductCatalog(8);

        // 生成一个月的交易历史
        const transactions: any[] = [];
        products.forEach(product => {
          masterData.warehouses.forEach(warehouse => {
            const productTransactions = InventoryDomainFactory.createTransactionHistory(
              product.id,
              warehouse.id,
              this.randomInt(5, 15)
            );
            transactions.push(...productTransactions);
          });
        });

        // 生成月度报表
        const currentDate = new Date();
        const monthlyReport = ReportDataFactory.createMonthlyReport(
          currentDate.getFullYear(),
          currentDate.getMonth() + 1
        );

        // 生成库存统计
        const inventoryStats = ReportDataFactory.createInventoryStatistics();

        // 生成预警信息
        const alerts = ReportDataFactory.createAlertData();

        return {
          masterData,
          products,
          stocks,
          transactions,
          monthlyReport,
          inventoryStats,
          alerts,
          summary: {
            transactionCount: transactions.length,
            totalInventoryValue: inventoryStats.totalValue,
            lowStockAlerts: alerts.lowStockAlerts.length,
            overStockAlerts: alerts.overStockAlerts.length
          }
        };
      }
    };
  }

  /**
   * 销售高峰期场景
   */
  static salesPeakScenario(): BusinessScenario {
    return {
      name: '销售高峰期场景',
      description: '大量出库操作和库存快速消耗的场景',
      setup: () => {
        this.clearAllData();

        const masterData = MasterDataFactory.createMasterDataSet();
        const { products, stocks } = InventoryDomainFactory.createProductCatalog(5);

        // 模拟高频出库操作
        const salesTransactions: any[] = [];
        const updatedStocks = [...stocks];

        // 在一天内生成大量销售出库
        for (let hour = 9; hour <= 18; hour++) {
          for (let i = 0; i < this.randomInt(3, 8); i++) {
            const product = this.randomChoice(products);
            const warehouse = this.randomChoice(masterData.warehouses);
            const quantity = this.randomInt(1, 10);
            
            const transaction = InventoryDomainFactory.createInventoryTransaction({
              productId: product.id,
              warehouseId: warehouse.id,
              type: TransactionType.STOCK_OUT,
              quantity,
              unitPrice: product.salePrice,
              operator: `cashier_${this.randomInt(1, 3)}`,
              remark: `销售出库_${hour}:${i.toString().padStart(2, '0')}`
            });

            // 设置具体时间
            const transactionTime = new Date();
            transactionTime.setHours(hour, this.randomInt(0, 59), 0, 0);
            transaction.createdAt = transactionTime;

            salesTransactions.push(transaction);

            // 更新库存
            const stockIndex = updatedStocks.findIndex(
              s => s.productId === product.id && s.warehouseId === warehouse.id
            );
            if (stockIndex >= 0) {
              updatedStocks[stockIndex].quantity = Math.max(0, 
                updatedStocks[stockIndex].quantity - quantity
              );
            }
          }
        }

        // 识别缺货产品
        const outOfStockProducts = products.filter(product => {
          const totalStock = updatedStocks
            .filter(s => s.productId === product.id)
            .reduce((sum, s) => sum + s.quantity, 0);
          return totalStock === 0;
        });

        // 识别低库存产品
        const lowStockProducts = products.filter(product => {
          const totalStock = updatedStocks
            .filter(s => s.productId === product.id)
            .reduce((sum, s) => sum + s.quantity, 0);
          return totalStock > 0 && totalStock < product.minStock;
        });

        return {
          masterData,
          products,
          originalStocks: stocks,
          updatedStocks,
          salesTransactions,
          outOfStockProducts,
          lowStockProducts,
          summary: {
            totalSales: salesTransactions.length,
            totalRevenue: salesTransactions.reduce((sum, t) => sum + t.totalAmount, 0),
            outOfStockCount: outOfStockProducts.length,
            lowStockCount: lowStockProducts.length,
            peakHour: this.findPeakSalesHour(salesTransactions)
          }
        };
      }
    };
  }

  /**
   * 供应商补货场景
   */
  static supplierReplenishmentScenario(): BusinessScenario {
    return {
      name: '供应商补货场景',
      description: '基于低库存预警的供应商补货流程',
      setup: () => {
        this.clearAllData();

        // 创建低库存场景
        const { products, stocks } = InventoryDomainFactory.createLowStockScenario();
        const warehouses = MasterDataFactory.createStandardWarehouses();

        // 生成补货建议
        const replenishmentSuggestions = products.map(product => {
          const totalStock = stocks
            .filter(s => s.productId === product.id)
            .reduce((sum, s) => sum + s.quantity, 0);
          
          const suggestedQuantity = product.maxStock - totalStock;
          const estimatedCost = suggestedQuantity * product.purchasePrice;

          return {
            productId: product.id,
            productName: product.name,
            currentStock: totalStock,
            minStock: product.minStock,
            maxStock: product.maxStock,
            suggestedQuantity,
            estimatedCost,
            priority: totalStock === 0 ? 'HIGH' : totalStock < product.minStock / 2 ? 'MEDIUM' : 'LOW'
          };
        });

        // 模拟采购入库
        const purchaseTransactions = replenishmentSuggestions.map(suggestion => 
          InventoryDomainFactory.createInventoryTransaction({
            productId: suggestion.productId,
            warehouseId: warehouses[0].id,
            type: TransactionType.STOCK_IN,
            quantity: suggestion.suggestedQuantity,
            unitPrice: products.find(p => p.id === suggestion.productId)?.purchasePrice || 0,
            operator: 'purchase_manager',
            remark: `紧急补货_优先级${suggestion.priority}`
          })
        );

        return {
          products,
          originalStocks: stocks,
          warehouses,
          replenishmentSuggestions,
          purchaseTransactions,
          summary: {
            lowStockProducts: products.length,
            totalReplenishmentCost: replenishmentSuggestions.reduce((sum, s) => sum + s.estimatedCost, 0),
            highPriorityItems: replenishmentSuggestions.filter(s => s.priority === 'HIGH').length
          }
        };
      }
    };
  }

  /**
   * 查找销售高峰时间
   */
  private static findPeakSalesHour(transactions: any[]): number {
    const hourlyStats = new Map<number, number>();
    
    transactions.forEach(transaction => {
      const hour = transaction.createdAt.getHours();
      hourlyStats.set(hour, (hourlyStats.get(hour) || 0) + 1);
    });

    let peakHour = 9;
    let maxTransactions = 0;
    
    hourlyStats.forEach((count, hour) => {
      if (count > maxTransactions) {
        maxTransactions = count;
        peakHour = hour;
      }
    });

    return peakHour;
  }

  /**
   * 获取所有可用的场景
   */
  static getAllScenarios(): BusinessScenario[] {
    return [
      this.newProductLaunchScenario(),
      this.inventoryAuditScenario(),
      this.monthEndClosingScenario(),
      this.salesPeakScenario(),
      this.supplierReplenishmentScenario()
    ];
  }

  /**
   * 根据名称获取场景
   */
  static getScenarioByName(name: string): BusinessScenario | null {
    const scenarios = this.getAllScenarios();
    return scenarios.find(scenario => scenario.name === name) || null;
  }

  /**
   * 执行场景并返回数据
   */
  static executeScenario(scenarioName: string): any {
    const scenario = this.getScenarioByName(scenarioName);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioName}`);
    }

    try {
      return {
        scenarioName: scenario.name,
        description: scenario.description,
        data: scenario.setup(),
        cleanup: scenario.cleanup
      };
    } catch (error) {
      if (scenario.cleanup) {
        scenario.cleanup();
      }
      throw error;
    }
  }

  /**
   * 批量执行多个场景
   */
  static executeMultipleScenarios(scenarioNames: string[]): any[] {
    return scenarioNames.map(name => this.executeScenario(name));
  }
}