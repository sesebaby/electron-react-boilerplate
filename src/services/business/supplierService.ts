import { Supplier, SupplierStatus, SupplierRating } from '../../types/entities';
import { SupplierSchema, validateEntity } from '../../schemas/validation';
import { v4 as uuidv4 } from 'uuid';
import { seedSuppliers } from '../../database/seedData';

export class SupplierService {
  private suppliers: Map<string, Supplier> = new Map();
  private codeIndex: Map<string, string> = new Map(); // Code -> ID mapping

  async initialize(): Promise<void> {
    console.log('Supplier service initialized');
    // 初始化供应商数据
    for (const supplier of seedSuppliers) {
      this.suppliers.set(supplier.id, supplier);
      this.codeIndex.set(supplier.code, supplier.id);
    }
    console.log(`Initialized ${seedSuppliers.length} suppliers`);
  }

  async findAll(): Promise<Supplier[]> {
    return Array.from(this.suppliers.values());
  }

  async findById(id: string): Promise<Supplier | null> {
    return this.suppliers.get(id) || null;
  }

  async findByCode(code: string): Promise<Supplier | null> {
    const id = this.codeIndex.get(code);
    return id ? this.suppliers.get(id) || null : null;
  }

  async findByStatus(status: SupplierStatus): Promise<Supplier[]> {
    return Array.from(this.suppliers.values()).filter(
      supplier => supplier.status === status
    );
  }

  async findByRating(rating: SupplierRating): Promise<Supplier[]> {
    return Array.from(this.suppliers.values()).filter(
      supplier => supplier.rating === rating
    );
  }

  async findActiveSuppliers(): Promise<Supplier[]> {
    return this.findByStatus(SupplierStatus.ACTIVE);
  }

  async search(searchTerm: string): Promise<Supplier[]> {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return this.findAll();

    return Array.from(this.suppliers.values()).filter(supplier =>
      supplier.name.toLowerCase().includes(term) ||
      supplier.code.toLowerCase().includes(term) ||
      supplier.contactPerson?.toLowerCase().includes(term) ||
      supplier.email?.toLowerCase().includes(term) ||
      supplier.phone?.toLowerCase().includes(term)
    );
  }

  async create(data: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<Supplier> {
    // 检查编码唯一性
    if (this.codeIndex.has(data.code)) {
      throw new Error(`供应商编码已存在: ${data.code}`);
    }

    const supplier: Supplier = {
      ...data,
      id: uuidv4(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // 验证数据
    const validation = validateEntity(SupplierSchema, supplier);
    if (!validation.success) {
      throw new Error(`供应商数据验证失败: ${validation.errors?.join(', ')}`);
    }

    this.suppliers.set(supplier.id, supplier);
    this.codeIndex.set(supplier.code, supplier.id);

    return supplier;
  }

  async update(id: string, data: Partial<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Supplier> {
    const existingSupplier = this.suppliers.get(id);
    if (!existingSupplier) {
      throw new Error(`供应商不存在: ${id}`);
    }

    // 检查编码唯一性（如果更新了编码）
    if (data.code && data.code !== existingSupplier.code) {
      if (this.codeIndex.has(data.code)) {
        throw new Error(`供应商编码已存在: ${data.code}`);
      }
    }

    const updatedSupplier: Supplier = {
      ...existingSupplier,
      ...data,
      updatedAt: new Date()
    };

    // 验证更新后的数据
    const validation = validateEntity(SupplierSchema, updatedSupplier);
    if (!validation.success) {
      throw new Error(`供应商数据验证失败: ${validation.errors?.join(', ')}`);
    }

    // 更新编码索引
    if (data.code && data.code !== existingSupplier.code) {
      this.codeIndex.delete(existingSupplier.code);
      this.codeIndex.set(data.code, id);
    }

    this.suppliers.set(id, updatedSupplier);
    return updatedSupplier;
  }

  async delete(id: string): Promise<boolean> {
    const supplier = this.suppliers.get(id);
    if (!supplier) {
      return false;
    }

    // 检查是否有关联的采购订单
    // TODO: 实现采购订单关联检查
    // 这里需要与PurchaseService配合检查

    this.suppliers.delete(id);
    this.codeIndex.delete(supplier.code);
    return true;
  }

  async validateCode(code: string, excludeId?: string): Promise<boolean> {
    const existingId = this.codeIndex.get(code);
    return !existingId || existingId === excludeId;
  }

  async updateStatus(id: string, status: SupplierStatus): Promise<Supplier> {
    return this.update(id, { status });
  }

  async updateRating(id: string, rating: SupplierRating): Promise<Supplier> {
    return this.update(id, { rating });
  }

  async bulkCreate(suppliers: Array<Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>>): Promise<{
    created: Supplier[];
    errors: Array<{ index: number; error: string }>;
  }> {
    const created: Supplier[] = [];
    const errors: Array<{ index: number; error: string }> = [];

    for (let i = 0; i < suppliers.length; i++) {
      try {
        const supplier = await this.create(suppliers[i]);
        created.push(supplier);
      } catch (error) {
        errors.push({
          index: i,
          error: error instanceof Error ? error.message : '未知错误'
        });
      }
    }

    return { created, errors };
  }

  async getSupplierStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    byRating: Record<SupplierRating, number>;
    totalCreditLimit: number;
    averageCreditLimit: number;
  }> {
    const suppliers = await this.findAll();
    const byRating: Record<SupplierRating, number> = {
      [SupplierRating.A]: 0,
      [SupplierRating.B]: 0,
      [SupplierRating.C]: 0,
      [SupplierRating.D]: 0
    };

    suppliers.forEach(supplier => {
      byRating[supplier.rating]++;
    });

    const totalCreditLimit = suppliers.reduce((sum, supplier) => sum + supplier.creditLimit, 0);

    return {
      total: suppliers.length,
      active: suppliers.filter(s => s.status === SupplierStatus.ACTIVE).length,
      inactive: suppliers.filter(s => s.status === SupplierStatus.INACTIVE).length,
      byRating,
      totalCreditLimit,
      averageCreditLimit: suppliers.length > 0 ? totalCreditLimit / suppliers.length : 0
    };
  }

  async getTopSuppliersByCredit(limit: number = 10): Promise<Supplier[]> {
    const suppliers = await this.findAll();
    return suppliers
      .sort((a, b) => b.creditLimit - a.creditLimit)
      .slice(0, limit);
  }

  async getSuppliersByPaymentTerms(paymentTerms: string): Promise<Supplier[]> {
    return Array.from(this.suppliers.values()).filter(
      supplier => supplier.paymentTerms === paymentTerms
    );
  }

  async updateCreditLimit(id: string, newLimit: number): Promise<Supplier> {
    if (newLimit < 0) {
      throw new Error('信用额度不能为负数');
    }

    return this.update(id, { creditLimit: newLimit });
  }

  async getSupplierPerformance(supplierId: string): Promise<{
    supplier: Supplier;
    totalOrders: number;
    totalValue: number;
    averageOrderValue: number;
    onTimeDeliveryRate: number;
    // 这些数据需要与采购服务配合获取
  } | null> {
    const supplier = await this.findById(supplierId);
    if (!supplier) {
      return null;
    }

    // TODO: 实现与采购服务的集成
    return {
      supplier,
      totalOrders: 0,
      totalValue: 0,
      averageOrderValue: 0,
      onTimeDeliveryRate: 0
    };
  }

  async getSupplierContacts(): Promise<Array<{
    supplier: Supplier;
    hasContact: boolean;
    hasPhone: boolean;
    hasEmail: boolean;
  }>> {
    const suppliers = await this.findAll();
    
    return suppliers.map(supplier => ({
      supplier,
      hasContact: !!supplier.contactPerson,
      hasPhone: !!supplier.phone,
      hasEmail: !!supplier.email
    }));
  }

  async validateEmail(email: string, excludeId?: string): Promise<boolean> {
    if (!email) return true;
    
    const suppliers = await this.findAll();
    const existing = suppliers.find(s => s.email === email && s.id !== excludeId);
    return !existing;
  }

  async generateSupplierCode(): Promise<string> {
    const suppliers = await this.findAll();
    const maxCode = suppliers
      .map(s => s.code)
      .filter(code => /^SUP\d{3}$/.test(code))
      .map(code => parseInt(code.substring(3)))
      .reduce((max, num) => Math.max(max, num), 0);

    return `SUP${String(maxCode + 1).padStart(3, '0')}`;
  }

  async getSuppliersByRegion(region: string): Promise<Supplier[]> {
    return Array.from(this.suppliers.values()).filter(
      supplier => supplier.address?.includes(region)
    );
  }
}

export default new SupplierService();