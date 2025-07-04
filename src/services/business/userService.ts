import { User, UserRole, UserStatus } from '../../types/entities';
import { UserSchema, validateEntity } from '../../schemas/validation';
import { v4 as uuidv4 } from 'uuid';
import { hash, compare } from 'bcryptjs';

export class UserService {
  private users: Map<string, User> = new Map();
  private usernameIndex: Map<string, string> = new Map(); // username -> ID mapping
  private emailIndex: Map<string, string> = new Map(); // email -> ID mapping
  private phoneIndex: Map<string, string> = new Map(); // phone -> ID mapping
  private currentUser: User | null = null;

  async initialize(): Promise<void> {
    // Create default admin user if no users exist
    if (this.users.size === 0) {
      await this.createDefaultAdmin();
    }
    console.log('User service initialized');
  }

  private async createDefaultAdmin(): Promise<void> {
    const adminUser: Omit<User, 'id' | 'createdAt' | 'updatedAt'> = {
      username: 'admin',
      password: 'admin123', // Will be hashed
      nickname: '系统管理员',
      email: 'admin@system.com',
      phone: '13800138000',
      avatar: undefined,
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      lastLoginAt: new Date()
    };

    await this.create(adminUser);
    console.log('Default admin user created: username=admin, password=admin123');
  }

  async findAll(): Promise<User[]> {
    return Array.from(this.users.values()).map(user => this.sanitizeUser(user));
  }

  async findById(id: string): Promise<User | null> {
    const user = this.users.get(id);
    return user ? this.sanitizeUser(user) : null;
  }

  async findByUsername(username: string): Promise<User | null> {
    const id = this.usernameIndex.get(username.toLowerCase());
    return id ? this.findById(id) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const id = this.emailIndex.get(email.toLowerCase());
    return id ? this.findById(id) : null;
  }

  async findByPhone(phone: string): Promise<User | null> {
    const id = this.phoneIndex.get(phone);
    return id ? this.findById(id) : null;
  }

  async findByRole(role: UserRole): Promise<User[]> {
    return Array.from(this.users.values())
      .filter(user => user.role === role)
      .map(user => this.sanitizeUser(user));
  }

  async findByStatus(status: UserStatus): Promise<User[]> {
    return Array.from(this.users.values())
      .filter(user => user.status === status)
      .map(user => this.sanitizeUser(user));
  }

  async search(searchTerm: string): Promise<User[]> {
    const term = searchTerm.toLowerCase().trim();
    if (!term) return this.findAll();

    return Array.from(this.users.values())
      .filter(user => 
        user.username.toLowerCase().includes(term) ||
        user.nickname.toLowerCase().includes(term) ||
        user.email?.toLowerCase().includes(term) ||
        user.phone?.includes(term)
      )
      .map(user => this.sanitizeUser(user));
  }

  async create(userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>): Promise<User> {
    // Validate input
    const validation = validateEntity(UserSchema, userData);
    if (!validation.success) {
      throw new Error(`用户数据验证失败: ${validation.errors?.join(', ')}`);
    }

    // Check for duplicates
    await this.checkDuplicates(userData.username, userData.email, userData.phone);

    // Hash password
    const hashedPassword = await hash(userData.password, 10);

    const now = new Date();
    const user: User = {
      id: uuidv4(),
      ...userData,
      password: hashedPassword,
      username: userData.username.toLowerCase(),
      email: userData.email?.toLowerCase(),
      createdAt: now,
      updatedAt: now
    };

    this.users.set(user.id, user);
    this.updateIndexes(user);

    console.log(`User created: ${user.username} (${user.nickname})`);
    return this.sanitizeUser(user);
  }

  async update(id: string, userData: Partial<Omit<User, 'id' | 'createdAt' | 'updatedAt' | 'password'>>): Promise<User> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      throw new Error('用户不存在');
    }

    // Check for duplicates (exclude current user)
    if (userData.username || userData.email || userData.phone) {
      await this.checkDuplicates(
        userData.username, 
        userData.email, 
        userData.phone, 
        id
      );
    }

    // Remove old indexes if needed
    this.removeFromIndexes(existingUser);

    const updatedUser: User = {
      ...existingUser,
      ...userData,
      username: userData.username ? userData.username.toLowerCase() : existingUser.username,
      email: userData.email ? userData.email.toLowerCase() : existingUser.email,
      updatedAt: new Date()
    };

    // Validate updated data
    const validation = validateEntity(UserSchema, {
      ...updatedUser,
      password: 'dummy' // Use dummy password for validation
    });
    if (!validation.success) {
      throw new Error(`用户数据验证失败: ${validation.errors?.join(', ')}`);
    }

    this.users.set(id, updatedUser);
    this.updateIndexes(updatedUser);

    console.log(`User updated: ${updatedUser.username} (${updatedUser.nickname})`);
    return this.sanitizeUser(updatedUser);
  }

  async changePassword(id: string, oldPassword: string, newPassword: string): Promise<void> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('用户不存在');
    }

    // Verify old password
    const isValidOldPassword = await compare(oldPassword, user.password);
    if (!isValidOldPassword) {
      throw new Error('原密码错误');
    }

    // Hash new password
    const hashedNewPassword = await hash(newPassword, 10);

    const updatedUser: User = {
      ...user,
      password: hashedNewPassword,
      updatedAt: new Date()
    };

    this.users.set(id, updatedUser);
    console.log(`Password changed for user: ${user.username}`);
  }

  async resetPassword(id: string, newPassword: string): Promise<void> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('用户不存在');
    }

    // Hash new password
    const hashedPassword = await hash(newPassword, 10);

    const updatedUser: User = {
      ...user,
      password: hashedPassword,
      updatedAt: new Date()
    };

    this.users.set(id, updatedUser);
    console.log(`Password reset for user: ${user.username}`);
  }

  async setStatus(id: string, status: UserStatus): Promise<User> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('用户不存在');
    }

    const updatedUser: User = {
      ...user,
      status,
      updatedAt: new Date()
    };

    this.users.set(id, updatedUser);
    console.log(`User status changed: ${user.username} -> ${status}`);
    return this.sanitizeUser(updatedUser);
  }

  async delete(id: string): Promise<void> {
    const user = this.users.get(id);
    if (!user) {
      throw new Error('用户不存在');
    }

    // Prevent deleting the last admin user
    const adminUsers = await this.findByRole(UserRole.ADMIN);
    if (user.role === UserRole.ADMIN && adminUsers.length <= 1) {
      throw new Error('无法删除最后一个管理员用户');
    }

    this.removeFromIndexes(user);
    this.users.delete(id);
    console.log(`User deleted: ${user.username}`);
  }

  // Authentication methods
  async authenticate(username: string, password: string): Promise<User | null> {
    const user = await this.findByUsernameForAuth(username);
    if (!user) {
      return null;
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new Error('用户账号已被禁用或锁定');
    }

    const isValidPassword = await compare(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    // Update last login time
    const updatedUser: User = {
      ...user,
      lastLoginAt: new Date(),
      updatedAt: new Date()
    };

    this.users.set(user.id, updatedUser);
    this.currentUser = this.sanitizeUser(updatedUser);

    console.log(`User logged in: ${user.username}`);
    return this.currentUser;
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  logout(): void {
    if (this.currentUser) {
      console.log(`User logged out: ${this.currentUser.username}`);
      this.currentUser = null;
    }
  }

  async hasPermission(userId: string, permission: string): Promise<boolean> {
    const user = this.users.get(userId);
    if (!user || user.status !== UserStatus.ACTIVE) {
      return false;
    }

    // Admin has all permissions
    if (user.role === UserRole.ADMIN) {
      return true;
    }

    // Role-based permissions
    const rolePermissions = this.getRolePermissions(user.role);
    return rolePermissions.includes(permission);
  }

  private getRolePermissions(role: UserRole): string[] {
    const permissions: Record<UserRole, string[]> = {
      [UserRole.ADMIN]: ['*'], // All permissions
      [UserRole.PURCHASER]: [
        'products.read', 'suppliers.read', 'suppliers.write',
        'purchase-orders.read', 'purchase-orders.write',
        'purchase-receipts.read', 'purchase-receipts.write',
        'accounts-payable.read', 'payments.read', 'payments.write'
      ],
      [UserRole.SALESPERSON]: [
        'products.read', 'customers.read', 'customers.write',
        'sales-orders.read', 'sales-orders.write',
        'sales-deliveries.read', 'sales-deliveries.write',
        'accounts-receivable.read', 'receipts.read', 'receipts.write'
      ],
      [UserRole.WAREHOUSE]: [
        'products.read', 'warehouses.read', 'inventory.read', 'inventory.write',
        'purchase-receipts.read', 'purchase-receipts.write',
        'sales-deliveries.read', 'sales-deliveries.write',
        'inventory-transactions.read', 'inventory-transactions.write'
      ],
      [UserRole.FINANCE]: [
        'accounts-payable.read', 'accounts-payable.write',
        'accounts-receivable.read', 'accounts-receivable.write',
        'payments.read', 'payments.write', 'receipts.read', 'receipts.write',
        'financial-reports.read'
      ]
    };

    return permissions[role] || [];
  }

  // Statistics and reporting
  async getUserStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
    locked: number;
    byRole: Record<UserRole, number>;
    recentLogins: number;
  }> {
    const users = Array.from(this.users.values());
    const total = users.length;
    const active = users.filter(u => u.status === UserStatus.ACTIVE).length;
    const inactive = users.filter(u => u.status === UserStatus.INACTIVE).length;
    const locked = users.filter(u => u.status === UserStatus.LOCKED).length;

    const byRole: Record<UserRole, number> = {
      [UserRole.ADMIN]: users.filter(u => u.role === UserRole.ADMIN).length,
      [UserRole.PURCHASER]: users.filter(u => u.role === UserRole.PURCHASER).length,
      [UserRole.SALESPERSON]: users.filter(u => u.role === UserRole.SALESPERSON).length,
      [UserRole.WAREHOUSE]: users.filter(u => u.role === UserRole.WAREHOUSE).length,
      [UserRole.FINANCE]: users.filter(u => u.role === UserRole.FINANCE).length
    };

    const recentLogins = users.filter(u => 
      u.lastLoginAt && 
      new Date().getTime() - u.lastLoginAt.getTime() < 7 * 24 * 60 * 60 * 1000
    ).length;

    return { total, active, inactive, locked, byRole, recentLogins };
  }

  // Helper methods
  private async findByUsernameForAuth(username: string): Promise<User | null> {
    const id = this.usernameIndex.get(username.toLowerCase());
    return id ? this.users.get(id) || null : null;
  }

  private sanitizeUser(user: User): User {
    const { password, ...sanitizedUser } = user;
    return sanitizedUser as User;
  }

  private async checkDuplicates(username?: string, email?: string, phone?: string, excludeId?: string): Promise<void> {
    if (username) {
      const existingByUsername = this.usernameIndex.get(username.toLowerCase());
      if (existingByUsername && existingByUsername !== excludeId) {
        throw new Error('用户名已存在');
      }
    }

    if (email) {
      const existingByEmail = this.emailIndex.get(email.toLowerCase());
      if (existingByEmail && existingByEmail !== excludeId) {
        throw new Error('邮箱已存在');
      }
    }

    if (phone) {
      const existingByPhone = this.phoneIndex.get(phone);
      if (existingByPhone && existingByPhone !== excludeId) {
        throw new Error('手机号已存在');
      }
    }
  }

  private updateIndexes(user: User): void {
    this.usernameIndex.set(user.username, user.id);
    if (user.email) {
      this.emailIndex.set(user.email, user.id);
    }
    if (user.phone) {
      this.phoneIndex.set(user.phone, user.id);
    }
  }

  private removeFromIndexes(user: User): void {
    this.usernameIndex.delete(user.username);
    if (user.email) {
      this.emailIndex.delete(user.email);
    }
    if (user.phone) {
      this.phoneIndex.delete(user.phone);
    }
  }
}

const userService = new UserService();
export default userService;