/**
 * 测试数据生成器
 * 用于生成真实的测试数据以验证业务逻辑
 */

export interface TestDataSpecs {
  productCount?: number;
  categoryCount?: number;
  supplierCount?: number;
  customerCount?: number;
  warehouseCount?: number;
  batchCount?: number;
  orderCount?: number;
  transactionCount?: number;
  userCount?: number;
}

export interface TestData {
  categories: any[];
  suppliers: any[];
  customers: any[];
  warehouses: any[];
  units: any[];
  products: any[];
  inventoryStocks: any[];
  fifoQueue: any[];
  purchaseOrders: any[];
  salesOrders: any[];
  accountsPayable: any[];
  accountsReceivable: any[];
  users: any[];
}

export class TestDataGenerator {
  private readonly categories = [
    '电子产品', '办公用品', '工业材料', '建筑材料', '化工原料',
    '食品饮料', '纺织用品', '机械设备', '汽车配件', '医疗器械'
  ];

  private readonly suppliers = [
    { name: '北京供应商A', region: '北京', paymentTerms: 30 },
    { name: '上海供应商B', region: '上海', paymentTerms: 60 },
    { name: '广州供应商C', region: '广州', paymentTerms: 90 },
    { name: '深圳供应商D', region: '深圳', paymentTerms: 30 },
    { name: '杭州供应商E', region: '杭州', paymentTerms: 45 }
  ];

  private readonly customers = [
    { name: '客户A公司', type: '企业', creditLimit: 50000 },
    { name: '客户B集团', type: '企业', creditLimit: 100000 },
    { name: '政府采购中心', type: '政府', creditLimit: 200000 },
    { name: '个人客户张三', type: '个人', creditLimit: 10000 },
    { name: '个人客户李四', type: '个人', creditLimit: 15000 }
  ];

  private readonly warehouses = [
    { name: '总仓库', location: '北京市朝阳区', capacity: 10000 },
    { name: '分仓A', location: '上海市浦东区', capacity: 5000 },
    { name: '分仓B', location: '广州市天河区', capacity: 3000 },
    { name: '分仓C', location: '深圳市南山区', capacity: 4000 },
    { name: '临时仓', location: '杭州市西湖区', capacity: 2000 }
  ];

  private readonly units = [
    { name: '个', symbol: 'pcs', baseUnit: true },
    { name: '箱', symbol: 'box', conversionRate: 12 },
    { name: '包', symbol: 'pack', conversionRate: 10 },
    { name: '千克', symbol: 'kg', baseUnit: true },
    { name: '吨', symbol: 't', conversionRate: 1000 }
  ];

  /**
   * 生成完整的测试数据集
   */
  async generateTestData(specs: TestDataSpecs = {}): Promise<any> {
    console.log('[TestDataGenerator] 开始生成测试数据...');
    
    const testData: TestData = {
      categories: await this.generateCategories(specs.categoryCount || 5),
      suppliers: await this.generateSuppliers(specs.supplierCount || 10),
      customers: await this.generateCustomers(specs.customerCount || 15),
      warehouses: await this.generateWarehouses(specs.warehouseCount || 3),
      units: await this.generateUnits(),
      products: [],
      inventoryStocks: [],
      fifoQueue: [],
      purchaseOrders: [],
      salesOrders: [],
      accountsPayable: [],
      accountsReceivable: [],
      users: await this.generateUsers(specs.userCount || 5)
    };

    // 生成产品数据（依赖于类别和供应商）
    testData.products = await this.generateProducts(
      specs.productCount || 50,
      testData.categories,
      testData.suppliers
    );

    // 生成库存数据（依赖于产品和仓库）
    testData.inventoryStocks = await this.generateInventoryStocks(
      testData.products,
      testData.warehouses,
      specs.batchCount || 3
    );

    // 生成FIFO队列数据
    testData.fifoQueue = await this.generateFifoQueue(testData.inventoryStocks);

    // 生成订单数据
    testData.purchaseOrders = await this.generatePurchaseOrders(
      specs.orderCount || 20,
      testData.products,
      testData.suppliers
    );

    testData.salesOrders = await this.generateSalesOrders(
      specs.orderCount || 25,
      testData.products,
      testData.customers
    );

    // 生成财务数据
    testData.accountsPayable = await this.generateAccountsPayable(testData.purchaseOrders);
    testData.accountsReceivable = await this.generateAccountsReceivable(testData.salesOrders);

    console.log('[TestDataGenerator] 测试数据生成完成');
    return testData;
  }

  /**
   * 生成类别数据
   */
  async generateCategories(count: number): Promise<any[]> {
    const _categories = [];
    
    for (let _i = 1; i <= count; i++) {
      categories.push({
        id: i,
        name: this.categories[i % this.categories.length],
        description: `类别${i}的描述`,
        status: 'active',
        created_at: this.randomDate(30),
        updated_at: new Date()
      });
    }
    
    return categories;
  }

  /**
   * 生成供应商数据
   */
  async generateSuppliers(count: number): Promise<any[]> {
    const _suppliers = [];
    
    for (let _i = 1; i <= count; i++) {
      const _template = this.suppliers[i % this.suppliers.length];
      suppliers.push({
        id: i,
        name: `${template.name}${i}`,
        contact_person: `联系人${i}`,
        phone: `138${String(i).padStart(8, '0')}`,
        email: `supplier${i}@example.com`,
        address: `${template.region}某某街道${i}号`,
        payment_terms: template.paymentTerms,
        status: 'active',
        created_at: this.randomDate(60),
        updated_at: new Date()
      });
    }
    
    return suppliers;
  }

  /**
   * 生成客户数据
   */
  async generateCustomers(count: number): Promise<any[]> {
    const _customers = [];
    
    for (let _i = 1; i <= count; i++) {
      const _template = this.customers[i % this.customers.length];
      customers.push({
        id: i,
        name: `${template.name}${i}`,
        contact_person: `联系人${i}`,
        phone: `139${String(i).padStart(8, '0')}`,
        email: `customer${i}@example.com`,
        address: `客户地址${i}`,
        customer_type: template.type,
        credit_limit: template.creditLimit + (i * 1000),
        status: 'active',
        created_at: this.randomDate(45),
        updated_at: new Date()
      });
    }
    
    return customers;
  }

  /**
   * 生成仓库数据
   */
  async generateWarehouses(count: number): Promise<any[]> {
    const _warehouses = [];
    
    for (let _i = 1; i <= count; i++) {
      const _template = this.warehouses[i % this.warehouses.length];
      warehouses.push({
        id: i,
        name: `${template.name}${i}`,
        location: template.location,
        capacity: template.capacity,
        current_utilization: Math.floor(template.capacity * (0.3 + Math.random() * 0.4)),
        manager: `仓库管理员${i}`,
        status: 'active',
        created_at: this.randomDate(90),
        updated_at: new Date()
      });
    }
    
    return warehouses;
  }

  /**
   * 生成单位数据
   */
  async generateUnits(): Promise<any[]> {
    return this.units.map((unit, index) => ({
      id: index + 1,
      name: unit.name,
      symbol: unit.symbol,
      is_base_unit: unit.baseUnit || false,
      conversion_rate: unit.conversionRate || 1,
      created_at: new Date(),
      updated_at: new Date()
    }));
  }

  /**
   * 生成产品数据
   */
  async generateProducts(count: number, categories: any[], suppliers: any[]): Promise<any[]> {
    const _products = [];
    
    for (let _i = 1; i <= count; i++) {
      const _category = categories[Math.floor(Math.random() * categories.length)];
      const _supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
      
      products.push({
        id: i,
        name: `产品${i}`,
        sku: `SKU${String(i).padStart(6, '0')}`,
        description: `产品${i}的详细描述`,
        category_id: category.id,
        supplier_id: supplier.id,
        unit_id: 1, // 默认使用"个"作为单位
        purchase_price: this.randomPrice(10, 500),
        sale_price: this.randomPrice(15, 750),
        minimum_stock: Math.floor(Math.random() * 50) + 10,
        maximum_stock: Math.floor(Math.random() * 500) + 100,
        status: 'active',
        created_at: this.randomDate(120),
        updated_at: new Date()
      });
    }
    
    return products;
  }

  /**
   * 生成库存数据
   */
  async generateInventoryStocks(products: any[], warehouses: any[], batchCount: number): Promise<any[]> {
    const _inventoryStocks = [];
    const _stockId = 1;
    
    for (const product of products) {
      for (const warehouse of warehouses) {
        // 每个产品在每个仓库都有库存记录
        const _stockQuantity = Math.floor(Math.random() * 200) + 50;
        const _reservedQuantity = Math.floor(stockQuantity * 0.1); // 10%预留
        
        inventoryStocks.push({
          id: stockId++,
          product_id: product.id,
          warehouse_id: warehouse.id,
          stock_quantity: stockQuantity,
          reserved_quantity: reservedQuantity,
          available_quantity: stockQuantity - reservedQuantity,
          last_updated: this.randomDate(7),
          created_at: this.randomDate(30),
          updated_at: new Date()
        });
      }
    }
    
    return inventoryStocks;
  }

  /**
   * 生成FIFO队列数据
   */
  async generateFifoQueue(inventoryStocks: any[]): Promise<any[]> {
    const _fifoQueue = [];
    const _queueId = 1;
    
    for (const stock of inventoryStocks) {
      // 为每个库存记录生成2-4个FIFO批次
      const _batchCount = Math.floor(Math.random() * 3) + 2;
      const _remainingQuantity = stock.stock_quantity;
      
      for (let _i = 0; i < batchCount && remainingQuantity > 0; i++) {
        const _batchQuantity = i === batchCount - 1 
          ? remainingQuantity 
          : Math.floor(remainingQuantity / (batchCount - i) * (0.8 + Math.random() * 0.4));
        
        fifoQueue.push({
          id: queueId++,
          product_id: stock.product_id,
          warehouse_id: stock.warehouse_id,
          batch_number: `BATCH${stock.product_id}_${stock.warehouse_id}_${i + 1}`,
          original_quantity: batchQuantity,
          remaining_quantity: batchQuantity,
          unit_cost: this.randomPrice(8, 400),
          received_date: this.randomDate(60 - i * 15),
          created_at: this.randomDate(60 - i * 15),
          updated_at: new Date()
        });
        
        remainingQuantity -= batchQuantity;
      }
    }
    
    return fifoQueue;
  }

  /**
   * 生成采购订单数据
   */
  async generatePurchaseOrders(count: number, products: any[], suppliers: any[]): Promise<any[]> {
    const _purchaseOrders = [];
    
    for (let _i = 1; i <= count; i++) {
      const _supplier = suppliers[Math.floor(Math.random() * suppliers.length)];
      const _orderDate = this.randomDate(30);
      
      // 为每个订单选择1-5个产品
      const _orderProducts = this.selectRandomItems(products, Math.floor(Math.random() * 5) + 1);
      const _totalAmount = 0;
      
      const _orderItems = orderProducts.map((product, index) => {
        const _quantity = Math.floor(Math.random() * 100) + 10;
        const _unitPrice = product.purchase_price * (0.9 + Math.random() * 0.2); // 价格浮动
        const _itemTotal = quantity * unitPrice;
        totalAmount += itemTotal;
        
        return {
          id: i * 100 + index + 1,
          purchase_order_id: i,
          product_id: product.id,
          quantity: quantity,
          unit_price: unitPrice,
          total_price: itemTotal
        };
      });
      
      purchaseOrders.push({
        id: i,
        order_number: `PO${String(i).padStart(6, '0')}`,
        supplier_id: supplier.id,
        order_date: orderDate,
        expected_date: this.addDays(orderDate, 7 + Math.floor(Math.random() * 14)),
        status: this.randomStatus(['draft', 'pending', 'approved', 'completed']),
        total_amount: totalAmount,
        notes: `采购订单${i}的备注`,
        items: orderItems,
        created_at: orderDate,
        updated_at: new Date()
      });
    }
    
    return purchaseOrders;
  }

  /**
   * 生成销售订单数据
   */
  async generateSalesOrders(count: number, products: any[], customers: any[]): Promise<any[]> {
    const _salesOrders = [];
    
    for (let _i = 1; i <= count; i++) {
      const _customer = customers[Math.floor(Math.random() * customers.length)];
      const _orderDate = this.randomDate(30);
      
      // 为每个订单选择1-4个产品
      const _orderProducts = this.selectRandomItems(products, Math.floor(Math.random() * 4) + 1);
      const _totalAmount = 0;
      
      const _orderItems = orderProducts.map((product, index) => {
        const _quantity = Math.floor(Math.random() * 50) + 5;
        const _unitPrice = product.sale_price * (0.9 + Math.random() * 0.2); // 价格浮动
        const _itemTotal = quantity * unitPrice;
        totalAmount += itemTotal;
        
        return {
          id: i * 100 + index + 1,
          sales_order_id: i,
          product_id: product.id,
          quantity: quantity,
          unit_price: unitPrice,
          total_price: itemTotal
        };
      });
      
      salesOrders.push({
        id: i,
        order_number: `SO${String(i).padStart(6, '0')}`,
        customer_id: customer.id,
        order_date: orderDate,
        delivery_date: this.addDays(orderDate, 3 + Math.floor(Math.random() * 10)),
        status: this.randomStatus(['draft', 'pending', 'approved', 'completed']),
        total_amount: totalAmount,
        notes: `销售订单${i}的备注`,
        items: orderItems,
        created_at: orderDate,
        updated_at: new Date()
      });
    }
    
    return salesOrders;
  }

  /**
   * 生成应付账款数据
   */
  async generateAccountsPayable(purchaseOrders: any[]): Promise<any[]> {
    const accountsPayable: any[] = [];
    
    purchaseOrders.forEach((order, index) => {
      if (order.status === 'completed' || order.status === 'approved') {
        const _paidAmount = Math.random() > 0.5 
          ? order.total_amount * (0.3 + Math.random() * 0.7)
          : 0;
        
        accountsPayable.push({
          id: index + 1,
          purchase_order_id: order.id,
          supplier_id: order.supplier_id,
          total_amount: order.total_amount,
          paid_amount: paidAmount,
          remaining_amount: order.total_amount - paidAmount,
          due_date: this.addDays(order.order_date, order.supplier?.payment_terms || 30),
          status: paidAmount >= order.total_amount ? 'paid' : paidAmount > 0 ? 'partial' : 'pending',
          created_at: order.order_date,
          updated_at: new Date()
        });
      }
    });
    
    return accountsPayable;
  }

  /**
   * 生成应收账款数据
   */
  async generateAccountsReceivable(salesOrders: any[]): Promise<any[]> {
    const accountsReceivable: any[] = [];
    
    salesOrders.forEach((order, index) => {
      if (order.status === 'completed' || order.status === 'approved') {
        const _receivedAmount = Math.random() > 0.4 
          ? order.total_amount * (0.2 + Math.random() * 0.8)
          : 0;
        
        accountsReceivable.push({
          id: index + 1,
          sales_order_id: order.id,
          customer_id: order.customer_id,
          total_amount: order.total_amount,
          received_amount: receivedAmount,
          remaining_amount: order.total_amount - receivedAmount,
          due_date: this.addDays(order.order_date, 30 + Math.floor(Math.random() * 30)),
          status: receivedAmount >= order.total_amount ? 'received' : receivedAmount > 0 ? 'partial' : 'pending',
          created_at: order.order_date,
          updated_at: new Date()
        });
      }
    });
    
    return accountsReceivable;
  }

  /**
   * 生成用户数据
   */
  async generateUsers(count: number): Promise<any[]> {
    const _users = [];
    const _roles = ['admin', 'manager', 'operator', 'viewer'];
    
    for (let _i = 1; i <= count; i++) {
      users.push({
        id: i,
        username: `user${i}`,
        email: `user${i}@company.com`,
        full_name: `用户${i}`,
        role: roles[Math.floor(Math.random() * roles.length)],
        department: `部门${Math.floor(i / 2) + 1}`,
        status: 'active',
        last_login: this.randomDate(7),
        created_at: this.randomDate(180),
        updated_at: new Date()
      });
    }
    
    return users;
  }

  /**
   * 生成库存测试数据
   */
  async generateInventoryTestData(specs: any): Promise<any> {
    const _categories = await this.generateCategories(2);
    const _suppliers = await this.generateSuppliers(2);
    const _warehouses = await this.generateWarehouses(specs.warehouseCount || 2);
    const _products = await this.generateProducts(specs.productCount || 5, categories, suppliers);
    const _inventoryStocks = await this.generateInventoryStocks(products, warehouses, specs.batchCount || 3);
    const _fifoQueue = await this.generateFifoQueue(inventoryStocks);
    
    return {
      categories,
      suppliers,
      warehouses,
      products,
      inventoryStocks,
      fifoQueue
    };
  }

  /**
   * 生成采购测试数据
   */
  async generatePurchaseTestData(specs: any): Promise<any> {
    const _categories = await this.generateCategories(3);
    const _suppliers = await this.generateSuppliers(specs.supplierCount || 3);
    const _products = await this.generateProducts(specs.productCount || 10, categories, suppliers);
    const _purchaseOrders = await this.generatePurchaseOrders(specs.orderCount || 5, products, suppliers);
    
    return {
      categories,
      suppliers,
      products,
      purchaseOrders
    };
  }

  /**
   * 生成销售测试数据
   */
  async generateSalesTestData(specs: any): Promise<any> {
    const _categories = await this.generateCategories(3);
    const _suppliers = await this.generateSuppliers(3);
    const _customers = await this.generateCustomers(specs.customerCount || 5);
    const _products = await this.generateProducts(specs.productCount || 15, categories, suppliers);
    const _salesOrders = await this.generateSalesOrders(specs.orderCount || 8, products, customers);
    
    return {
      categories,
      suppliers,
      customers,
      products,
      salesOrders
    };
  }

  /**
   * 生成多仓库测试数据
   */
  async generateMultiWarehouseTestData(specs: any): Promise<any> {
    const _categories = await this.generateCategories(2);
    const _suppliers = await this.generateSuppliers(3);
    const _warehouses = await this.generateWarehouses(specs.warehouseCount || 5);
    const _products = await this.generateProducts(specs.productCount || 20, categories, suppliers);
    const _inventoryStocks = await this.generateInventoryStocks(products, warehouses, 2);
    
    return {
      categories,
      suppliers,
      warehouses,
      products,
      inventoryStocks,
      transfers: this.generateStockTransfers(specs.transferCount || 10, inventoryStocks)
    };
  }

  /**
   * 生成财务测试数据
   */
  async generateFinancialTestData(specs: any): Promise<any> {
    const _categories = await this.generateCategories(2);
    const _suppliers = await this.generateSuppliers(5);
    const _customers = await this.generateCustomers(8);
    const _products = await this.generateProducts(30, categories, suppliers);
    const _purchaseOrders = await this.generatePurchaseOrders(specs.transactionCount || 25, products, suppliers);
    const _salesOrders = await this.generateSalesOrders(specs.transactionCount || 30, products, customers);
    const _accountsPayable = await this.generateAccountsPayable(purchaseOrders);
    const _accountsReceivable = await this.generateAccountsReceivable(salesOrders);
    
    return {
      categories,
      suppliers,
      customers,
      products,
      purchaseOrders,
      salesOrders,
      accountsPayable,
      accountsReceivable,
      payments: this.generatePayments(specs.paymentCount || 25, accountsPayable),
      receipts: this.generateReceipts(specs.receiptCount || 30, accountsReceivable)
    };
  }

  /**
   * 生成库存转移记录
   */
  private generateStockTransfers(count: number, inventoryStocks: any[]): any[] {
    const _transfers = [];
    
    for (let _i = 1; i <= count; i++) {
      const _fromStock = inventoryStocks[Math.floor(Math.random() * inventoryStocks.length)];
      const _toStock = inventoryStocks.find(s => 
        s.product_id === fromStock.product_id && s.warehouse_id !== fromStock.warehouse_id
      );
      
      if (toStock) {
        const _transferQuantity = Math.floor(Math.random() * 20) + 5;
        
        transfers.push({
          id: i,
          product_id: fromStock.product_id,
          from_warehouse_id: fromStock.warehouse_id,
          to_warehouse_id: toStock.warehouse_id,
          quantity: transferQuantity,
          transfer_date: this.randomDate(15),
          status: this.randomStatus(['pending', 'completed']),
          notes: `转移记录${i}`,
          created_at: this.randomDate(15),
          updated_at: new Date()
        });
      }
    }
    
    return transfers;
  }

  /**
   * 生成付款记录
   */
  private generatePayments(count: number, accountsPayable: any[]): any[] {
    const _payments = [];
    
    for (let _i = 1; i <= count; i++) {
      const _payable = accountsPayable[Math.floor(Math.random() * accountsPayable.length)];
      const _paymentAmount = Math.min(
        payable.remaining_amount,
        this.randomPrice(1000, payable.total_amount)
      );
      
      payments.push({
        id: i,
        accounts_payable_id: payable.id,
        payment_amount: paymentAmount,
        payment_date: this.randomDate(30),
        payment_method: this.randomStatus(['bank_transfer', 'cash', 'check']),
        reference_number: `PAY${String(i).padStart(6, '0')}`,
        notes: `付款记录${i}`,
        created_at: this.randomDate(30),
        updated_at: new Date()
      });
    }
    
    return payments;
  }

  /**
   * 生成收款记录
   */
  private generateReceipts(count: number, accountsReceivable: any[]): any[] {
    const _receipts = [];
    
    for (let _i = 1; i <= count; i++) {
      const _receivable = accountsReceivable[Math.floor(Math.random() * accountsReceivable.length)];
      const _receiptAmount = Math.min(
        receivable.remaining_amount,
        this.randomPrice(500, receivable.total_amount)
      );
      
      receipts.push({
        id: i,
        accounts_receivable_id: receivable.id,
        receipt_amount: receiptAmount,
        receipt_date: this.randomDate(30),
        receipt_method: this.randomStatus(['bank_transfer', 'cash', 'check']),
        reference_number: `REC${String(i).padStart(6, '0')}`,
        notes: `收款记录${i}`,
        created_at: this.randomDate(30),
        updated_at: new Date()
      });
    }
    
    return receipts;
  }

  // 工具方法

  /**
   * 生成随机日期
   */
  private randomDate(daysBack: number): Date {
    const _now = new Date();
    const _randomDays = Math.floor(Math.random() * daysBack);
    const _randomHours = Math.floor(Math.random() * 24);
    const _randomMinutes = Math.floor(Math.random() * 60);
    
    const _date = new Date(now);
    date.setDate(date.getDate() - randomDays);
    date.setHours(randomHours, randomMinutes, 0, 0);
    
    return date;
  }

  /**
   * 添加天数到日期
   */
  private addDays(date: Date, days: number): Date {
    const _result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  }

  /**
   * 生成随机价格
   */
  private randomPrice(min: number, max: number): number {
    return Math.round((min + Math.random() * (max - min)) * 100) / 100;
  }

  /**
   * 从数组中随机选择项目
   */
  private selectRandomItems<T>(array: T[], count: number): T[] {
    const _shuffled = [...array].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, Math.min(count, array.length));
  }

  /**
   * 随机选择状态
   */
  private randomStatus(statuses: string[]): string {
    return statuses[Math.floor(Math.random() * statuses.length)];
  }
}