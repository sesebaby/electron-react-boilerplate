import { Customer, CustomerStatus, CustomerType, CustomerLevel } from '../../types/entities';
import { CustomerSchema, validateEntity } from '../../schemas/validation';
import { v4 as uuidv4 } from 'uuid';
import { logger } from '../../utils/secureLogger';
import { ValidationError, BusinessError } from '../../utils/errors';
import userService from './userService';

export class CustomerService {
  private customers: Map<string, Customer> = new Map();
  private codeIndex: Map<string, string> = new Map(); // Code -> ID mapping

  async initialize(): Promise<void> {
    console.log('Customer service initialized');
    // 系统启动时不创建任何默认客户数据
  }

  async findAll(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async findById(id: string): Promise<Customer | null> {
    return this.customers.get(id) || null;
  }

  async findByCode(code: string): Promise<Customer | null> {
    const id = this.codeIndex.get(code);
    return id ? this.customers.get(id) || null : null;
  }

  async findByStatus(status: CustomerStatus): Promise<Customer[]> {
    return Array.from(this.customers.values()).filter(
      customer => customer.status === status
    );
  }

  async findByType(type: CustomerType): Promise<Customer[]> {
    return Array.from(this.customers.values()).filter(
      customer => customer.customerType === type
    );
  }

  async findByLevel(level: CustomerLevel): Promise<Customer[]> {
    return Array.from(this.customers.values()).filter(
      customer => customer.level === level
    );
  }

  async findActiveCustomers(): Promise<Customer[]> {
    return this.findByStatus(CustomerStatus.ACTIVE);
  }

  async findVIPCustomers(): Promise<Customer[]> {
    return this.findByLevel(CustomerLevel.VIP);
  }

  async search(searchTerm: string): Promise<Customer[]> {
    // 防御性空值检查
    if (!searchTerm || typeof searchTerm !== 'string') {
      return this.findAll();
    }
    
    const term = searchTerm.toLowerCase().trim();
    if (!term) return this.findAll();

    return Array.from(this.customers.values()).filter(customer => {
      // 空值安全的字符串比较
      const safeStringIncludes = (str: string | undefined | null, searchTerm: string): boolean => {
        return str ? str.toLowerCase().includes(searchTerm) : false;
      };
      
      return safeStringIncludes(customer.name, term) ||
             safeStringIncludes(customer.code, term) ||
             safeStringIncludes(customer.contactPerson, term) ||
             safeStringIncludes(customer.email, term) ||
             safeStringIncludes(customer.phone, term);
    });
  }

  async create(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>, currentUserId?: string): Promise<Customer> {
    // 权限检查
    if (currentUserId) {
      const hasPermission = await userService.hasPermission(currentUserId, 'customers.write');
      if (!hasPermission) {
        logger.security('Unauthorized customer creation attempt', { userId: currentUserId });
        throw new Error('无权限创建客户');
      }
    }

    // 检查编码唯一性
    if (this.codeIndex.has(data.code)) {
      throw new Error(`客户编码已存在: ${data.code}`);
    }

    const customer: Customer = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 验证数据
    const validation = validateEntity(CustomerSchema, customer);
    if (!validation.success) {
      throw new Error(`客户数据验证失败: ${validation.errors?.join(', ')}`);
    }

    this.customers.set(customer.id, customer);
    this.codeIndex.set(customer.code, customer.id);

    return customer;
  }

  async update(id: string, data: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>, currentUserId?: string): Promise<Customer> {
    // 权限检查
    if (currentUserId) {
      const hasPermission = await userService.hasPermission(currentUserId, 'customers.write');
      if (!hasPermission) {
        logger.security('Unauthorized customer update attempt', { userId: currentUserId, customerId: id });
        throw new Error('无权限修改客户信息');
      }
    }

    const existingCustomer = this.customers.get(id);
    if (!existingCustomer) {
      throw new Error(`客户不存在: ${id}`);
    }

    // 检查编码唯一性（如果更新了编码）
    if (data.code && data.code !== existingCustomer.code) {
      if (this.codeIndex.has(data.code)) {
        throw new Error(`客户编码已存在: ${data.code}`);
      }
    }

    const updatedCustomer: Customer = {
      ...existingCustomer,
      ...data,
      updatedAt: new Date()
    };

    // 验证更新后的数据
    const validation = validateEntity(CustomerSchema, updatedCustomer);
    if (!validation.success) {
      throw new Error(`客户数据验证失败: ${validation.errors?.join(', ')}`);
    }

    // 更新编码索引
    if (data.code && data.code !== existingCustomer.code) {
      this.codeIndex.delete(existingCustomer.code);
      this.codeIndex.set(data.code, id);
    }

    this.customers.set(id, updatedCustomer);
    return updatedCustomer;
  }

  async delete(id: string, currentUserId?: string): Promise<boolean> {
    // 输入验证 - 防止空值或无效ID
    if (!id || typeof id !== 'string' || id.trim() === '') {
      throw new ValidationError('无效的客户ID', { customerId: id });
    }
    
    // 权限检查
    if (currentUserId) {
      const hasPermission = await userService.hasPermission(currentUserId, 'customers.write');
      if (!hasPermission) {
        logger.security('Unauthorized customer deletion attempt', { userId: currentUserId, customerId: id });
        throw new Error('无权限删除客户');
      }
    }

    const customer = this.customers.get(id);
    if (!customer) {
      logger.warn(`Delete failed: Customer not found`, { customerId: id, userId: currentUserId });
      return false;
    }
    
    // 防御性检查 - 确保客户对象完整
    if (!customer.name || !customer.code) {
      logger.error('Customer data integrity issue', { customerId: id, customerData: customer });
      throw new Error('客户数据不完整，无法删除');
    }

    // 检查数据完整性 - 是否有关联的销售订单
    await this.checkCustomerRelationships(id, customer.name);

    // 检查客户状态 - 不能删除活跃客户（除非管理员强制）
    if (customer.status === CustomerStatus.ACTIVE) {
      logger.security('Attempted to delete active customer', { 
        customerId: id, 
        customerName: customer.name,
        userId: currentUserId 
      });
      throw new Error('无法删除活跃客户。请先将客户状态设置为非活跃状态，或联系管理员。');
    }

    this.customers.delete(id);
    this.codeIndex.delete(customer.code);
    
    logger.audit('delete', 'customer', { 
      customerId: id, 
      customerName: customer.name,
      customerCode: customer.code,
      userId: currentUserId 
    });
    
    return true;
  }

  // 数据完整性检查 - 检查客户关联关系
  private async checkCustomerRelationships(customerId: string, customerName: string): Promise<void> {
    // 模拟检查销售订单关联
    // 在实际应用中，这里会查询销售订单服务
    const hasRelatedOrders = await this.hasRelatedSalesOrders(customerId);
    
    if (hasRelatedOrders) {
      logger.warn('Delete blocked: Customer has related sales orders', { 
        customerId, 
        customerName 
      });
      throw new Error(
        `无法删除客户"${customerName}"，因为该客户存在关联的销售订单。` +
        `请先处理相关订单或联系系统管理员。`
      );
    }

    // 检查其他可能的关联数据
    const hasRelatedPayables = await this.hasRelatedAccountsReceivable(customerId);
    if (hasRelatedPayables) {
      logger.warn('Delete blocked: Customer has pending receivables', { 
        customerId, 
        customerName 
      });
      throw new Error(
        `无法删除客户"${customerName}"，因为该客户存在未结清的应收账款。` +
        `请先处理财务记录或联系财务部门。`
      );
    }
  }

  // 检查是否有关联的销售订单
  private async hasRelatedSalesOrders(customerId: string): Promise<boolean> {
    try {
      // 动态导入避免循环依赖
      const { default: salesOrderService } = await import('./salesOrderService');
      const orders = await salesOrderService.findByCustomer(customerId);
      return orders.length > 0;
    } catch (error) {
      logger.warn('Could not check sales orders relationships', { customerId, error });
      // 为安全起见，如果无法检查关系，假设存在关联
      return true;
    }
  }

  // 检查是否有关联的应收账款
  private async hasRelatedAccountsReceivable(customerId: string): Promise<boolean> {
    try {
      // 这里应该检查财务服务中的应收账款
      // 目前返回false作为占位符
      return false;
    } catch (error) {
      logger.warn('Could not check accounts receivable relationships', { customerId, error });
      return false;
    }
  }

  async validateCode(code: string, excludeId?: string): Promise<boolean> {
    const existingId = this.codeIndex.get(code);
    return !existingId || existingId === excludeId;
  }

  async updateStatus(id: string, status: CustomerStatus): Promise<Customer> {
    return this.update(id, { status });
  }

  async updateLevel(id: string, level: CustomerLevel): Promise<Customer> {
    return this.update(id, { level });
  }

  async updateCreditLimit(id: string, creditLimit: number): Promise<Customer> {
    // 增强输入验证
    if (typeof creditLimit !== 'number' || isNaN(creditLimit)) {
      throw new ValidationError('信用额度必须是有效数字', { creditLimit });
    }
    
    if (creditLimit < 0) {
      logger.warn('Attempted to set negative credit limit', {
        customerId: id,
        creditLimit
      });
      throw new ValidationError('信用额度不能为负数', { creditLimit });
    }
    
    // 设置合理的上限防止数据异常
    if (creditLimit > 10000000) {
      throw new ValidationError('信用额度超出合理范围', { creditLimit, maxLimit: 10000000 });
    }
    
    return this.update(id, { creditLimit });
  }

  async updateDiscountRate(id: string, discountRate: number): Promise<Customer> {
    // 增强输入验证
    if (typeof discountRate !== 'number' || isNaN(discountRate)) {
      throw new ValidationError('折扣率必须是有效数字', { discountRate });
    }
    
    if (discountRate < 0 || discountRate > 1) {
      logger.warn('Attempted to set invalid discount rate', {
        customerId: id,
        discountRate
      });
      throw new ValidationError('折扣率必须在0-1之间', { discountRate, validRange: '0-1' });
    }
    
    return this.update(id, { discountRate });
  }

  async bulkCreate(customers: Array<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>): Promise<{
    created: Customer[];
    errors: Array<{ index: number; error: string }>;
  }> {
    const created: Customer[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < customers.length; i++) {
      try {
        const customer = await this.create(customers[i]);
        created.push(customer);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return { created, errors };
  }

  async getCustomerStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byType: Record<CustomerType, number>;
    byLevel: Record<CustomerLevel, number>;
    totalCreditLimit: number;
    averageCreditLimit: number;
    averageDiscountRate: number;
  }> {
    const customers = await this.findAll();
    
    const byType: Record<CustomerType, number> = {
      [CustomerType.INDIVIDUAL]: 0,
      [CustomerType.COMPANY]: 0
    };

    const byLevel: Record<CustomerLevel, number> = {
      [CustomerLevel.VIP]: 0,
      [CustomerLevel.GOLD]: 0,
      [CustomerLevel.SILVER]: 0,
      [CustomerLevel.BRONZE]: 0
    };

    customers.forEach(customer => {
      byType[customer.customerType]++;
      byLevel[customer.level]++;
    });

    const totalCreditLimit = customers.reduce((sum, customer) => sum + customer.creditLimit, 0);
    const totalDiscountRate = customers.reduce((sum, customer) => sum + customer.discountRate, 0);

    return {
      total: customers.length,
      active: customers.filter(c => c.status === CustomerStatus.ACTIVE).length,
      inactive: customers.filter(c => c.status === CustomerStatus.INACTIVE).length,
      byType,
      byLevel,
      totalCreditLimit,
      averageCreditLimit: customers.length > 0 ? totalCreditLimit / customers.length : 0,
      averageDiscountRate: customers.length > 0 ? totalDiscountRate / customers.length : 0
    };
  }

  async getTopCustomersByCredit(limit: number = 10): Promise<Customer[]> {
    const customers = await this.findAll();
    return customers
      .sort((a, b) => b.creditLimit - a.creditLimit)
      .slice(0, limit);
  }

  async getCustomersByPaymentTerms(paymentTerms: string): Promise<Customer[]> {
    return Array.from(this.customers.values()).filter(
      customer => customer.paymentTerms === paymentTerms
    );
  }

  async promoteCustomerLevel(id: string): Promise<Customer> {
    const customer = await this.findById(id);
    if (!customer) {
      throw new Error(`客户不存在: ${id}`);
    }

    let newLevel: CustomerLevel;
    switch (customer.level) {
      case CustomerLevel.BRONZE:
        newLevel = CustomerLevel.SILVER;
        break;
      case CustomerLevel.SILVER:
        newLevel = CustomerLevel.GOLD;
        break;
      case CustomerLevel.GOLD:
        newLevel = CustomerLevel.VIP;
        break;
      case CustomerLevel.VIP:
        throw new Error('客户已是VIP级别，无法继续升级');
      default:
        throw new Error('无效的客户级别');
    }

    return this.updateLevel(id, newLevel);
  }

  async demoteCustomerLevel(id: string): Promise<Customer> {
    const customer = await this.findById(id);
    if (!customer) {
      throw new Error(`客户不存在: ${id}`);
    }

    let newLevel: CustomerLevel;
    switch (customer.level) {
      case CustomerLevel.VIP:
        newLevel = CustomerLevel.GOLD;
        break;
      case CustomerLevel.GOLD:
        newLevel = CustomerLevel.SILVER;
        break;
      case CustomerLevel.SILVER:
        newLevel = CustomerLevel.BRONZE;
        break;
      case CustomerLevel.BRONZE:
        throw new Error('客户已是Bronze级别，无法继续降级');
      default:
        throw new Error('无效的客户级别');
    }

    return this.updateLevel(id, newLevel);
  }

  async getCustomerPerformance(customerId: string): Promise<{
    customer: Customer;
    totalOrders: number;
    totalValue: number;
    averageOrderValue: number;
    lastOrderDate?: Date;
    // 这些数据需要与销售服务配合获取
  } | null> {
    const customer = await this.findById(customerId);
    if (!customer) {
      return null;
    }

    // TODO: 实现与销售服务的集成
    return {
      customer,
      totalOrders: 0,
      totalValue: 0,
      averageOrderValue: 0
    };
  }

  async getCustomerContacts(): Promise<Array<{
    customer: Customer;
    hasContact: boolean;
    hasPhone: boolean;
    hasEmail: boolean;
  }>> {
    const customers = await this.findAll();
    
    return customers.map(customer => ({
      customer,
      hasContact: !!customer.contactPerson,
      hasPhone: !!customer.phone,
      hasEmail: !!customer.email
    }));
  }

  async validateEmail(email: string, excludeId?: string): Promise<boolean> {
    if (!email) return true;
    
    const customers = await this.findAll();
    const existing = customers.find(c => c.email === email && c.id !== excludeId);
    return !existing;
  }

  async generateCustomerCode(): Promise<string> {
    const customers = await this.findAll();
    const maxCode = customers
      .map(c => c.code)
      .filter(code => /^CUS\d{3}$/.test(code))
      .map(code => parseInt(code.substring(3)))
      .reduce((max, num) => Math.max(max, num), 0);

    return `CUS${String(maxCode + 1).padStart(3, '0')}`;
  }

  async getCustomersByRegion(region: string): Promise<Customer[]> {
    return Array.from(this.customers.values()).filter(
      customer => customer.address?.includes(region)
    );
  }

  async calculateCustomerDiscount(customerId: string, originalAmount: number): Promise<{
    customer: Customer;
    originalAmount: number;
    discountAmount: number;
    finalAmount: number;
    discountRate: number;
  } | null> {
    const customer = await this.findById(customerId);
    if (!customer) {
      return null;
    }

    const discountAmount = originalAmount * customer.discountRate;
    const finalAmount = originalAmount - discountAmount;

    return {
      customer,
      originalAmount,
      discountAmount,
      finalAmount,
      discountRate: customer.discountRate
    };
  }

  async bulkUpdateLevels(updates: Array<{ id: string; level: CustomerLevel }>): Promise<{
    updated: Customer[];
    errors: Array<{ id: string; error: string }>;
  }> {
    const updated: Customer[] = [];
    const errors: Array<{ id: string; error: string }> = [];

    for (const { id, level } of updates) {
      try {
        const customer = await this.updateLevel(id, level);
        updated.push(customer);
      } catch (error) {
        errors.push({
          id,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return { updated, errors };
  }
}

export default new CustomerService();