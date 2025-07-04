import { Customer, CustomerStatus, CustomerType, CustomerLevel } from '../../types/entities';
import { CustomerSchema, validateEntity } from '../../schemas/validation';
import { v4 as uuidv4 } from 'uuid';

export class CustomerService {
  private customers: Map<string, Customer> = new Map();
  private codeIndex: Map<string, string> = new Map(); // Code -> ID mapping

  async initialize(): Promise<void> {
    console.log('Customer service initialized');
    
    // 创建默认客户
    if (this.customers.size === 0) {
      await this.createDefaultCustomers();
    }
  }

  private async createDefaultCustomers(): Promise<void> {
    const defaultCustomers = [
      {
        code: 'CUS001',
        name: '优质客户A公司',
        contactPerson: '王总',
        phone: '021-11111111',
        email: 'wang@customer-a.com',
        address: '上海市黄浦区商业街88号',
        customerType: CustomerType.COMPANY,
        creditLimit: 200000,
        paymentTerms: '月结30天',
        discountRate: 0.05,
        level: CustomerLevel.VIP,
        status: CustomerStatus.ACTIVE
      },
      {
        code: 'CUS002',
        name: '李明',
        contactPerson: '李明',
        phone: '138-8888-8888',
        email: 'liming@email.com',
        address: '北京市海淀区中关村大街1号',
        customerType: CustomerType.INDIVIDUAL,
        creditLimit: 50000,
        discountRate: 0.02,
        level: CustomerLevel.GOLD,
        status: CustomerStatus.ACTIVE
      }
    ];

    for (const customerData of defaultCustomers) {
      try {
        await this.create(customerData);
      } catch (error) {
        console.warn('Failed to create default customer:', error);
      }
    }
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
    const term = searchTerm.toLowerCase().trim();
    if (!term) return this.findAll();

    return Array.from(this.customers.values()).filter(customer =>
      customer.name.toLowerCase().includes(term) ||
      customer.code.toLowerCase().includes(term) ||
      customer.contactPerson?.toLowerCase().includes(term) ||
      customer.email?.toLowerCase().includes(term) ||
      customer.phone?.toLowerCase().includes(term)
    );
  }

  async create(data: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<Customer> {
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

  async update(id: string, data: Partial<Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Customer> {
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

  async delete(id: string): Promise<boolean> {
    const customer = this.customers.get(id);
    if (!customer) {
      return false;
    }

    // 检查是否有关联的销售订单
    // TODO: 实现销售订单关联检查
    // 这里需要与SalesService配合检查

    this.customers.delete(id);
    this.codeIndex.delete(customer.code);
    return true;
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
    if (creditLimit < 0) {
      throw new Error('信用额度不能为负数');
    }
    return this.update(id, { creditLimit });
  }

  async updateDiscountRate(id: string, discountRate: number): Promise<Customer> {
    if (discountRate < 0 || discountRate > 1) {
      throw new Error('折扣率必须在0-1之间');
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