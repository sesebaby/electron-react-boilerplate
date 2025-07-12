/**
 * 系统服务 - 整合用户、权限、基础设置
 * 整合服务: UserService, PermissionService, SupplierService, CustomerService
 */

import {
  User,
  UserRole,
  UserStatus,
  Supplier,
  Customer,
  CustomerStatus,
  CustomerType,
  CustomerLevel,
  SupplierStatus,
  SupplierRating,
  RolePermission
} from '../../types/entities';
import { ServiceResult, PaginatedResult, PaginationParams, BaseFilter } from './types';
import { DatabaseManager } from './database';
import { v4 as uuidv4 } from 'uuid';

// 系统过滤器
interface SystemFilter extends BaseFilter {
  status?: string;
  role?: UserRole;
  customerType?: CustomerType;
  customerLevel?: CustomerLevel;
  supplierRating?: SupplierRating;
}

// 系统统计
interface SystemStatistics {
  totalUsers: number;
  activeUsers: number;
  totalCustomers: number;
  activeCustomers: number;
  totalSuppliers: number;
  activeSuppliers: number;
  usersByRole: Record<UserRole, number>;
  customersByType: Record<CustomerType, number>;
  customersByLevel: Record<CustomerLevel, number>;
}

// 权限定义
interface Permission {
  id: string;
  module: string;
  action: string;
  description: string;
}

// 角色权限映射
interface RolePermissions {
  [UserRole.ADMIN]: string[];
  [UserRole.OPERATOR]: string[];
}

/**
 * 系统服务实现
 * 负责用户管理、权限控制、供应商和客户管理
 */
export class SystemService {
  private static instance: SystemService;
  private database: any;
  private initialized = false;
  private currentUser: User | null = null;

  // 内存缓存
  private users: Map<string, User> = new Map();
  private customers: Map<string, Customer> = new Map();
  private suppliers: Map<string, Supplier> = new Map();
  private permissions: Map<string, Permission> = new Map();

  // 索引
  private usernameIndex: Map<string, string> = new Map();
  private emailIndex: Map<string, string> = new Map();
  private customerCodeIndex: Map<string, string> = new Map();
  private supplierCodeIndex: Map<string, string> = new Map();

  // 默认权限配置
  private defaultRolePermissions: RolePermissions = {
    [UserRole.ADMIN]: ['*'], // 管理员拥有所有权限
    [UserRole.OPERATOR]: [
      'inventory.view', 'inventory.create', 'inventory.update',
      'order.view', 'order.create', 'order.update',
      'financial.view', 'financial.create', 'financial.update',
      'report.view', 'report.export',
      'customer.view', 'customer.create', 'customer.update',
      'supplier.view', 'supplier.create', 'supplier.update'
    ]
  };

  /**
   * 初始化服务
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      this.database = await DatabaseManager.getInstance();
      await this.loadData();
      await this.ensureDefaultData();
      this.initialized = true;
    } catch (error) {
      console.error('SystemService initialization failed:', error);
      throw error;
    }
  }

  /**
   * 加载数据
   */
  private async loadData(): Promise<void> {
    try {
      // 加载用户
      const users = await this.database.getAllUsers() || [];
      this.users.clear();
      this.usernameIndex.clear();
      this.emailIndex.clear();
      
      users.forEach((user: User) => {
        this.users.set(user.id, user);
        this.usernameIndex.set(user.username, user.id);
        if (user.email) {
          this.emailIndex.set(user.email, user.id);
        }
      });

      // 加载客户
      const customers = await this.database.getAllCustomers() || [];
      this.customers.clear();
      this.customerCodeIndex.clear();
      
      customers.forEach((customer: Customer) => {
        this.customers.set(customer.id, customer);
        if (customer.code) {
          this.customerCodeIndex.set(customer.code, customer.id);
        }
      });

      // 加载供应商
      const suppliers = await this.database.getAllSuppliers() || [];
      this.suppliers.clear();
      this.supplierCodeIndex.clear();
      
      suppliers.forEach((supplier: Supplier) => {
        this.suppliers.set(supplier.id, supplier);
        if (supplier.code) {
          this.supplierCodeIndex.set(supplier.code, supplier.id);
        }
      });

    } catch (error) {
      console.error('Failed to load system data:', error);
    }
  }

  /**
   * 确保默认数据存在
   */
  private async ensureDefaultData(): Promise<void> {
    // 确保存在管理员账户
    const adminUsers = Array.from(this.users.values()).filter(u => u.role === UserRole.ADMIN);
    if (adminUsers.length === 0) {
      await this.createDefaultAdmin();
    }
  }

  /**
   * 创建默认管理员账户
   */
  private async createDefaultAdmin(): Promise<void> {
    try {
      // 对于单机版应用，简化密码验证逻辑，直接使用明文密码
      const admin: User = {
        id: uuidv4(),
        username: 'admin',
        password: '123456', // 单机版使用明文密码
        nickname: '系统管理员',
        email: 'admin@system.com',
        role: UserRole.ADMIN,
        status: UserStatus.ACTIVE,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.database.createUser(admin);
      this.users.set(admin.id, admin);
      this.usernameIndex.set(admin.username, admin.id);
      this.emailIndex.set(admin.email!, admin.id);
    } catch (error) {
      console.error('Failed to create default admin:', error);
    }
  }

  // ==================== 用户管理 ====================

  /**
   * 创建用户
   */
  async createUser(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'> & { password: string }): Promise<ServiceResult<User>> {
    try {
      // 检查用户名是否已存在
      if (this.usernameIndex.has(userData.username)) {
        return { success: false, error: '用户名已存在' };
      }

      // 检查邮箱是否已存在
      if (userData.email && this.emailIndex.has(userData.email)) {
        return { success: false, error: '邮箱已存在' };
      }

      // 对于单机版应用，直接使用明文密码
      const user: User = {
        id: uuidv4(),
        ...userData,
        password: userData.password, // 单机版使用明文密码
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.database.createUser(user);
      
      // 更新缓存
      this.users.set(user.id, user);
      this.usernameIndex.set(user.username, user.id);
      if (user.email) {
        this.emailIndex.set(user.email, user.id);
      }

      // 返回时不包含密码
      const { password, ...userWithoutPassword } = user;
      return { success: true, data: userWithoutPassword as User };
    } catch (error) {
      return { success: false, error: `创建用户失败: ${error}` };
    }
  }

  /**
   * 用户登录
   */
  async login(username: string, password: string): Promise<ServiceResult<User>> {
    try {
      const userId = this.usernameIndex.get(username);
      if (!userId) {
        return { success: false, error: '用户名或密码错误' };
      }

      const user = this.users.get(userId);
      if (!user) {
        return { success: false, error: '用户不存在' };
      }

      if (user.status !== UserStatus.ACTIVE) {
        return { success: false, error: '账户已被禁用' };
      }

      // 对于单机版应用，简化密码验证逻辑
      if (user.password !== password) {
        return { success: false, error: '用户名或密码错误' };
      }

      // 设置当前用户
      this.currentUser = user;
      
      // 返回时不包含密码
      const { password: _, ...userWithoutPassword } = user;
      return { success: true, data: userWithoutPassword as User };
    } catch (error) {
      return { success: false, error: `登录失败: ${error}` };
    }
  }

  /**
   * 获取当前用户
   */
  getCurrentUser(): User | null {
    if (this.currentUser) {
      const { password, ...userWithoutPassword } = this.currentUser;
      return userWithoutPassword as User;
    }
    return null;
  }

  /**
   * 用户登出
   */
  logout(): void {
    this.currentUser = null;
  }

  /**
   * 获取用户列表
   */
  async getUsers(filter?: SystemFilter, pagination?: PaginationParams): Promise<ServiceResult<PaginatedResult<User>>> {
    try {
      let users = Array.from(this.users.values()).map(user => {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword as User;
      });

      // 应用过滤器
      if (filter) {
        users = users.filter(user => {
          if (filter.status && user.status !== filter.status) return false;
          if (filter.role && user.role !== filter.role) return false;
          if (filter.keyword) {
            const keyword = filter.keyword.toLowerCase();
            if (!user.username.toLowerCase().includes(keyword) &&
                !user.nickname?.toLowerCase().includes(keyword) &&
                !user.email?.toLowerCase().includes(keyword)) return false;
          }
          return true;
        });
      }

      // 分页
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      const total = users.length;
      const totalPages = Math.ceil(total / pageSize);
      const offset = (page - 1) * pageSize;
      const items = users.slice(offset, offset + pageSize);

      return {
        success: true,
        data: { items, total, page, pageSize, totalPages }
      };
    } catch (error) {
      return { success: false, error: `获取用户列表失败: ${error}` };
    }
  }

  // ==================== 权限管理 ====================

  /**
   * 检查权限
   */
  hasPermission(user: User, permission: string): boolean {
    const rolePermissions = this.defaultRolePermissions[user.role];
    
    // 管理员拥有所有权限
    if (rolePermissions.includes('*')) {
      return true;
    }

    return rolePermissions.includes(permission);
  }

  /**
   * 获取用户权限
   */
  getUserPermissions(user: User): string[] {
    return this.defaultRolePermissions[user.role] || [];
  }

  // ==================== 客户管理 ====================

  /**
   * 创建客户
   */
  async createCustomer(customerData: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<Customer>> {
    try {
      // 检查编码是否已存在
      if (customerData.code && this.customerCodeIndex.has(customerData.code)) {
        return { success: false, error: '客户编码已存在' };
      }

      const customer: Customer = {
        id: uuidv4(),
        ...customerData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.database.createCustomer(customer);
      
      // 更新缓存
      this.customers.set(customer.id, customer);
      if (customer.code) {
        this.customerCodeIndex.set(customer.code, customer.id);
      }

      return { success: true, data: customer };
    } catch (error) {
      return { success: false, error: `创建客户失败: ${error}` };
    }
  }

  /**
   * 获取客户列表
   */
  async getCustomers(filter?: SystemFilter, pagination?: PaginationParams): Promise<ServiceResult<PaginatedResult<Customer>>> {
    try {
      let customers = Array.from(this.customers.values());

      // 应用过滤器
      if (filter) {
        customers = customers.filter(customer => {
          if (filter.status && customer.status !== filter.status) return false;
          if (filter.customerType && customer.customerType !== filter.customerType) return false;
          if (filter.customerLevel && customer.level !== filter.customerLevel) return false;
          if (filter.keyword) {
            const keyword = filter.keyword.toLowerCase();
            if (!customer.name.toLowerCase().includes(keyword) &&
                !customer.code?.toLowerCase().includes(keyword) &&
                !customer.contactPerson?.toLowerCase().includes(keyword)) return false;
          }
          return true;
        });
      }

      // 分页
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      const total = customers.length;
      const totalPages = Math.ceil(total / pageSize);
      const offset = (page - 1) * pageSize;
      const items = customers.slice(offset, offset + pageSize);

      return {
        success: true,
        data: { items, total, page, pageSize, totalPages }
      };
    } catch (error) {
      return { success: false, error: `获取客户列表失败: ${error}` };
    }
  }

  // ==================== 供应商管理 ====================

  /**
   * 创建供应商
   */
  async createSupplier(supplierData: Omit<Supplier, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceResult<Supplier>> {
    try {
      // 检查编码是否已存在
      if (supplierData.code && this.supplierCodeIndex.has(supplierData.code)) {
        return { success: false, error: '供应商编码已存在' };
      }

      const supplier: Supplier = {
        id: uuidv4(),
        ...supplierData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await this.database.createSupplier(supplier);
      
      // 更新缓存
      this.suppliers.set(supplier.id, supplier);
      if (supplier.code) {
        this.supplierCodeIndex.set(supplier.code, supplier.id);
      }

      return { success: true, data: supplier };
    } catch (error) {
      return { success: false, error: `创建供应商失败: ${error}` };
    }
  }

  /**
   * 获取供应商列表
   */
  async getSuppliers(filter?: SystemFilter, pagination?: PaginationParams): Promise<ServiceResult<PaginatedResult<Supplier>>> {
    try {
      let suppliers = Array.from(this.suppliers.values());

      // 应用过滤器
      if (filter) {
        suppliers = suppliers.filter(supplier => {
          if (filter.status && supplier.status !== filter.status) return false;
          if (filter.supplierRating && supplier.rating !== filter.supplierRating) return false;
          if (filter.keyword) {
            const keyword = filter.keyword.toLowerCase();
            if (!supplier.name.toLowerCase().includes(keyword) &&
                !supplier.code?.toLowerCase().includes(keyword) &&
                !supplier.contactPerson?.toLowerCase().includes(keyword)) return false;
          }
          return true;
        });
      }

      // 分页
      const page = pagination?.page || 1;
      const pageSize = pagination?.pageSize || 20;
      const total = suppliers.length;
      const totalPages = Math.ceil(total / pageSize);
      const offset = (page - 1) * pageSize;
      const items = suppliers.slice(offset, offset + pageSize);

      return {
        success: true,
        data: { items, total, page, pageSize, totalPages }
      };
    } catch (error) {
      return { success: false, error: `获取供应商列表失败: ${error}` };
    }
  }

  // ==================== 系统统计 ====================

  /**
   * 获取系统统计信息
   */
  async getSystemStatistics(): Promise<ServiceResult<SystemStatistics>> {
    try {
      const users = Array.from(this.users.values());
      const customers = Array.from(this.customers.values());
      const suppliers = Array.from(this.suppliers.values());

      const statistics: SystemStatistics = {
        totalUsers: users.length,
        activeUsers: users.filter(u => u.status === UserStatus.ACTIVE).length,
        totalCustomers: customers.length,
        activeCustomers: customers.filter(c => c.status === CustomerStatus.ACTIVE).length,
        totalSuppliers: suppliers.length,
        activeSuppliers: suppliers.filter(s => s.status === SupplierStatus.ACTIVE).length,
        usersByRole: {} as Record<UserRole, number>,
        customersByType: {} as Record<CustomerType, number>,
        customersByLevel: {} as Record<CustomerLevel, number>
      };

      // 按角色统计用户
      for (const role of Object.values(UserRole)) {
        statistics.usersByRole[role] = users.filter(u => u.role === role).length;
      }

      // 按类型统计客户
      for (const type of Object.values(CustomerType)) {
        statistics.customersByType[type] = customers.filter(c => c.customerType === type).length;
      }

      // 按级别统计客户
      for (const level of Object.values(CustomerLevel)) {
        statistics.customersByLevel[level] = customers.filter(c => c.level === level).length;
      }

      return { success: true, data: statistics };
    } catch (error) {
      return { success: false, error: `获取系统统计失败: ${error}` };
    }
  }

  // ==================== 向后兼容的方法别名 ====================

  // 通用查询方法
  async findAll(filter?: SystemFilter, pagination?: PaginationParams): Promise<ServiceResult<PaginatedResult<any>>> {
    // 默认返回用户列表，可以根据filter类型判断
    return this.getUsers(filter, pagination);
  }

  // 供应商统计
  async getSupplierStats(): Promise<ServiceResult<any>> {
    try {
      const suppliers = Array.from(this.suppliers.values());
      const stats = {
        total: suppliers.length,
        active: suppliers.filter(s => s.status === SupplierStatus.ACTIVE).length,
        inactive: suppliers.filter(s => s.status === SupplierStatus.INACTIVE).length,
        byRating: {} as Record<SupplierRating, number>
      };

      // 按评级统计
      for (const rating of Object.values(SupplierRating)) {
        stats.byRating[rating] = suppliers.filter(s => s.rating === rating).length;
      }

      return { success: true, data: stats };
    } catch (error) {
      return { success: false, error: `获取供应商统计失败: ${error}` };
    }
  }

  // 生成供应商编码
  async generateSupplierCode(): Promise<ServiceResult<string>> {
    try {
      const suppliers = Array.from(this.suppliers.values());
      const maxCode = suppliers.reduce((max, supplier) => {
        const codeNum = parseInt(supplier.code.replace(/\D/g, ''));
        return Math.max(max, isNaN(codeNum) ? 0 : codeNum);
      }, 0);

      const newCode = `SUP${String(maxCode + 1).padStart(6, '0')}`;
      return { success: true, data: newCode };
    } catch (error) {
      return { success: false, error: `生成供应商编码失败: ${error}` };
    }
  }

  // 通用CRUD操作
  async create(data: any): Promise<ServiceResult<any>> {
    if (data.username || data.email) {
      return this.createUser(data);
    } else if (data.supplierName || data.supplierCode) {
      return this.createSupplier(data);
    } else if (data.customerName || data.customerCode) {
      return this.createCustomer(data);
    }
    return { success: false, error: '无法识别的数据类型' };
  }

  async update(id: string, data: any): Promise<ServiceResult<any>> {
    if (this.users.has(id)) {
      return this.updateUser(id, data);
    } else if (this.suppliers.has(id)) {
      return this.updateSupplier(id, data);
    } else if (this.customers.has(id)) {
      return this.updateCustomer(id, data);
    }
    return { success: false, error: '找不到指定的记录' };
  }

  async delete(id: string): Promise<ServiceResult<boolean>> {
    if (this.users.has(id)) {
      return this.deleteUser(id);
    } else if (this.suppliers.has(id)) {
      return this.deleteSupplier(id);
    } else if (this.customers.has(id)) {
      return this.deleteCustomer(id);
    }
    return { success: false, error: '找不到指定的记录' };
  }

  // 权限管理相关方法
  async getAllRoles(): Promise<ServiceResult<UserRole[]>> {
    try {
      const roles = Object.values(UserRole);
      return { success: true, data: roles };
    } catch (error) {
      return { success: false, error: `获取角色列表失败: ${error}` };
    }
  }

  async getAllModules(): Promise<ServiceResult<string[]>> {
    try {
      // Mock implementation - 实际应该从数据库获取
      const modules = [
        'inventory', 'purchase', 'sales', 'finance',
        'reports', 'system', 'dashboard'
      ];
      return { success: true, data: modules };
    } catch (error) {
      return { success: false, error: `获取模块列表失败: ${error}` };
    }
  }

  async getAllActions(): Promise<ServiceResult<string[]>> {
    try {
      // Mock implementation - 实际应该从数据库获取
      const actions = [
        'view', 'create', 'edit', 'delete',
        'approve', 'export', 'import'
      ];
      return { success: true, data: actions };
    } catch (error) {
      return { success: false, error: `获取操作列表失败: ${error}` };
    }
  }

  async getRolePermissions(roleId: string): Promise<ServiceResult<Permission[]>> {
    try {
      // Mock implementation - 实际应该从数据库获取角色权限
      const permissions: Permission[] = [];
      return { success: true, data: permissions };
    } catch (error) {
      return { success: false, error: `获取角色权限失败: ${error}` };
    }
  }

  async updateRolePermissions(roleId: string, permissions: RolePermission[]): Promise<ServiceResult<boolean>> {
    try {
      // Mock implementation - 实际应该更新数据库中的角色权限
      return { success: true, data: true };
    } catch (error) {
      return { success: false, error: `更新角色权限失败: ${error}` };
    }
  }

  // 用户密码管理
  async resetPassword(userId: string, newPassword?: string): Promise<ServiceResult<string>> {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, error: '用户不存在' };
      }

      const password = newPassword || this.generateRandomPassword();

      const updatedUser = {
        ...user,
        password: password, // 单机版使用明文密码
        updatedAt: new Date()
      };

      this.users.set(userId, updatedUser);
      return { success: true, data: password };
    } catch (error) {
      return { success: false, error: `重置密码失败: ${error}` };
    }
  }

  async changePassword(userId: string, oldPassword: string, newPassword: string): Promise<ServiceResult<boolean>> {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, error: '用户不存在' };
      }

      // 验证旧密码（明文比较）
      if (user.password !== oldPassword) {
        return { success: false, error: '原密码错误' };
      }

      // 设置新密码
      const updatedUser = {
        ...user,
        password: newPassword, // 单机版使用明文密码
        updatedAt: new Date()
      };

      this.users.set(userId, updatedUser);
      return { success: true, data: true };
    } catch (error) {
      return { success: false, error: `修改密码失败: ${error}` };
    }
  }

  // 用户状态管理
  async setStatus(userId: string, status: UserStatus): Promise<ServiceResult<boolean>> {
    try {
      const user = this.users.get(userId);
      if (!user) {
        return { success: false, error: '用户不存在' };
      }

      const updatedUser = {
        ...user,
        status,
        updatedAt: new Date()
      };

      this.users.set(userId, updatedUser);
      return { success: true, data: true };
    } catch (error) {
      return { success: false, error: `设置用户状态失败: ${error}` };
    }
  }

  // ==================== 缺失的方法实现 ====================

  async updateUser(id: string, updateData: Partial<User>): Promise<ServiceResult<User>> {
    try {
      const existingUser = this.users.get(id);
      if (!existingUser) {
        return {
          success: false,
          error: '用户不存在'
        };
      }

      const updatedUser: User = {
        ...existingUser,
        ...updateData,
        updatedAt: new Date()
      };

      await this.database.updateUser(id, updatedUser);
      this.users.set(id, updatedUser);

      return {
        success: true,
        data: updatedUser
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新用户失败'
      };
    }
  }

  async deleteUser(id: string): Promise<ServiceResult<boolean>> {
    try {
      const user = this.users.get(id);
      if (!user) {
        return {
          success: false,
          error: '用户不存在'
        };
      }

      await this.database.deleteUser(id);
      this.users.delete(id);

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除用户失败'
      };
    }
  }

  async updateSupplier(id: string, updateData: Partial<Supplier>): Promise<ServiceResult<Supplier>> {
    try {
      const existingSupplier = this.suppliers.get(id);
      if (!existingSupplier) {
        return {
          success: false,
          error: '供应商不存在'
        };
      }

      const updatedSupplier: Supplier = {
        ...existingSupplier,
        ...updateData,
        updatedAt: new Date()
      };

      await this.database.updateSupplier(id, updatedSupplier);
      this.suppliers.set(id, updatedSupplier);

      return {
        success: true,
        data: updatedSupplier
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新供应商失败'
      };
    }
  }

  async deleteSupplier(id: string): Promise<ServiceResult<boolean>> {
    try {
      const supplier = this.suppliers.get(id);
      if (!supplier) {
        return {
          success: false,
          error: '供应商不存在'
        };
      }

      await this.database.deleteSupplier(id);
      this.suppliers.delete(id);

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除供应商失败'
      };
    }
  }

  async updateCustomer(id: string, updateData: Partial<Customer>): Promise<ServiceResult<Customer>> {
    try {
      const existingCustomer = this.customers.get(id);
      if (!existingCustomer) {
        return {
          success: false,
          error: '客户不存在'
        };
      }

      const updatedCustomer: Customer = {
        ...existingCustomer,
        ...updateData,
        updatedAt: new Date()
      };

      await this.database.updateCustomer(id, updatedCustomer);
      this.customers.set(id, updatedCustomer);

      return {
        success: true,
        data: updatedCustomer
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '更新客户失败'
      };
    }
  }

  async deleteCustomer(id: string): Promise<ServiceResult<boolean>> {
    try {
      const customer = this.customers.get(id);
      if (!customer) {
        return {
          success: false,
          error: '客户不存在'
        };
      }

      await this.database.deleteCustomer(id);
      this.customers.delete(id);

      return {
        success: true,
        data: true
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '删除客户失败'
      };
    }
  }

  // ==================== 用户认证相关方法 ====================

  async authenticateUser(username: string, password: string): Promise<ServiceResult<User>> {
    try {
      // 使用数据库认证
      const authResult = await this.database.authenticateUser(username, password);

      if (!authResult.success) {
        return {
          success: false,
          error: authResult.error || '用户认证失败'
        };
      }

      const userData = authResult.data;

      // 转换为 User 类型
      const user: User = {
        id: userData.id,
        username: userData.username,
        password: '', // 不暴露密码
        nickname: userData.nickname || userData.username,
        email: userData.email,
        phone: userData.phone,
        avatar: userData.avatar,
        role: userData.role as UserRole,
        status: userData.status as UserStatus,
        lastLoginAt: userData.lastLoginAt,
        createdAt: userData.createdAt,
        updatedAt: userData.updatedAt
      };

      // 更新缓存
      this.users.set(user.id, user);
      this.usernameIndex.set(user.username, user.id);
      if (user.email) {
        this.emailIndex.set(user.email, user.id);
      }

      return {
        success: true,
        data: user
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '用户认证失败'
      };
    }
  }

  async getUser(id: string): Promise<ServiceResult<User>> {
    try {
      const user = this.users.get(id);
      if (!user) {
        return {
          success: false,
          error: '用户不存在'
        };
      }

      return {
        success: true,
        data: user
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : '获取用户失败'
      };
    }
  }

  // 辅助方法
  private generateRandomPassword(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let password = '';
    for (let i = 0; i < 8; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  }

  /**
   * 获取单例实例
   */
  static getInstance(): SystemService {
    if (!SystemService.instance) {
      SystemService.instance = new SystemService();
    }
    return SystemService.instance;
  }
}