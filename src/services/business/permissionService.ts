import { UserRole, PermissionModule, PermissionAction, PermissionConfig, RolePermission } from '../../types/entities';
import { v4 as uuidv4 } from 'uuid';

export class PermissionService {
  private rolePermissions: Map<string, RolePermission> = new Map();
  
  // 默认权限配置
  private defaultPermissions: PermissionConfig[] = [
    {
      role: UserRole.ADMIN,
      permissions: {
        [PermissionModule.SYSTEM]: [
          PermissionAction.VIEW,
          PermissionAction.CREATE,
          PermissionAction.UPDATE,
          PermissionAction.DELETE,
          PermissionAction.EXPORT,
          PermissionAction.IMPORT
        ],
        [PermissionModule.INVENTORY]: [
          PermissionAction.VIEW,
          PermissionAction.CREATE,
          PermissionAction.UPDATE,
          PermissionAction.DELETE,
          PermissionAction.EXPORT,
          PermissionAction.IMPORT
        ],
        [PermissionModule.PURCHASE]: [
          PermissionAction.VIEW,
          PermissionAction.CREATE,
          PermissionAction.UPDATE,
          PermissionAction.DELETE,
          PermissionAction.EXPORT,
          PermissionAction.IMPORT
        ],
        [PermissionModule.SALES]: [
          PermissionAction.VIEW,
          PermissionAction.CREATE,
          PermissionAction.UPDATE,
          PermissionAction.DELETE,
          PermissionAction.EXPORT,
          PermissionAction.IMPORT
        ],
        [PermissionModule.FINANCE]: [
          PermissionAction.VIEW,
          PermissionAction.CREATE,
          PermissionAction.UPDATE,
          PermissionAction.DELETE,
          PermissionAction.EXPORT,
          PermissionAction.IMPORT
        ],
        [PermissionModule.REPORTS]: [
          PermissionAction.VIEW,
          PermissionAction.EXPORT
        ]
      }
    },
    {
      role: UserRole.OPERATOR,
      permissions: {
        [PermissionModule.INVENTORY]: [
          PermissionAction.VIEW,
          PermissionAction.CREATE,
          PermissionAction.UPDATE,
          PermissionAction.EXPORT
        ],
        [PermissionModule.PURCHASE]: [
          PermissionAction.VIEW,
          PermissionAction.CREATE,
          PermissionAction.UPDATE,
          PermissionAction.EXPORT
        ],
        [PermissionModule.SALES]: [
          PermissionAction.VIEW,
          PermissionAction.CREATE,
          PermissionAction.UPDATE,
          PermissionAction.EXPORT
        ],
        [PermissionModule.FINANCE]: [
          PermissionAction.VIEW,
          PermissionAction.EXPORT
        ],
        [PermissionModule.REPORTS]: [
          PermissionAction.VIEW,
          PermissionAction.EXPORT
        ]
      }
    }
  ];

  async initialize(): Promise<void> {
    console.log('Permission service initialized');
    // 初始化默认权限配置
    this.loadDefaultPermissions();
  }

  private loadDefaultPermissions(): void {
    this.defaultPermissions.forEach(config => {
      Object.entries(config.permissions).forEach(([module, actions]) => {
        const permission: RolePermission = {
          id: uuidv4(),
          role: config.role,
          module: module as PermissionModule,
          actions: actions || [],
          description: this.getPermissionDescription(config.role, module as PermissionModule),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        this.rolePermissions.set(`${config.role}-${module}`, permission);
      });
    });
  }

  private getPermissionDescription(role: UserRole, module: PermissionModule): string {
    const _roleNames = {
      [UserRole.ADMIN]: '管理员',
      [UserRole.OPERATOR]: '操作员'
    };

    const _moduleNames = {
      [PermissionModule.SYSTEM]: '系统管理',
      [PermissionModule.INVENTORY]: '库存管理',
      [PermissionModule.PURCHASE]: '采购管理',
      [PermissionModule.SALES]: '销售管理',
      [PermissionModule.FINANCE]: '财务管理',
      [PermissionModule.REPORTS]: '报表分析'
    };

    return `${roleNames[role]}对${moduleNames[module]}模块的权限`;
  }

  // 获取所有角色
  async getAllRoles(): Promise<UserRole[]> {
    return [UserRole.ADMIN, UserRole.OPERATOR];
  }

  // 获取角色的权限配置
  async getRolePermissions(role: UserRole): Promise<PermissionConfig> {
    const permissions: { [key in PermissionModule]?: PermissionAction[] } = {};
    
    Object.values(PermissionModule).forEach(module => {
      const _key = `${role}-${module}`;
      const _permission = this.rolePermissions.get(key);
      if (permission) {
        permissions[module] = permission.actions;
      }
    });

    return { role, permissions };
  }

  // 更新角色权限
  async updateRolePermissions(role: UserRole, permissions: { [key in PermissionModule]?: PermissionAction[] }): Promise<void> {
    Object.entries(permissions).forEach(([module, actions]) => {
      const _key = `${role}-${module}`;
      const _existing = this.rolePermissions.get(key);
      
      if (existing) {
        existing.actions = actions || [];
        existing.updatedAt = new Date();
      } else {
        const permission: RolePermission = {
          id: uuidv4(),
          role,
          module: module as PermissionModule,
          actions: actions || [],
          description: this.getPermissionDescription(role, module as PermissionModule),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        this.rolePermissions.set(key, permission);
      }
    });
  }

  // 检查用户是否有特定权限
  async hasPermission(userRole: UserRole, module: PermissionModule, action: PermissionAction): Promise<boolean> {
    const _key = `${userRole}-${module}`;
    const _permission = this.rolePermissions.get(key);
    return permission ? permission.actions.includes(action) : false;
  }

  // 获取所有权限模块
  async getAllModules(): Promise<Array<{ module: PermissionModule; name: string; description: string }>> {
    return [
      {
        module: PermissionModule.SYSTEM,
        name: '系统管理',
        description: '用户管理、权限管理、系统设置、操作日志'
      },
      {
        module: PermissionModule.INVENTORY,
        name: '库存管理',
        description: '库存概览、商品管理、分类管理、仓库管理、入库出库'
      },
      {
        module: PermissionModule.PURCHASE,
        name: '采购管理',
        description: '供应商管理、采购订单、采购收货'
      },
      {
        module: PermissionModule.SALES,
        name: '销售管理',
        description: '客户管理、销售订单、销售出库'
      },
      {
        module: PermissionModule.FINANCE,
        name: '财务管理',
        description: '应付账款、应收账款、付款记录、收款记录'
      },
      {
        module: PermissionModule.REPORTS,
        name: '报表分析',
        description: '库存报表、销售报表、采购报表、财务报表'
      }
    ];
  }

  // 获取所有权限操作
  async getAllActions(): Promise<Array<{ action: PermissionAction; name: string; description: string }>> {
    return [
      {
        action: PermissionAction.VIEW,
        name: '查看',
        description: '查看数据和信息'
      },
      {
        action: PermissionAction.CREATE,
        name: '创建',
        description: '创建新的数据记录'
      },
      {
        action: PermissionAction.UPDATE,
        name: '更新',
        description: '修改现有数据记录'
      },
      {
        action: PermissionAction.DELETE,
        name: '删除',
        description: '删除数据记录'
      },
      {
        action: PermissionAction.EXPORT,
        name: '导出',
        description: '导出数据到文件'
      },
      {
        action: PermissionAction.IMPORT,
        name: '导入',
        description: '从文件导入数据'
      }
    ];
  }

  // 获取权限统计
  async getPermissionStats(): Promise<{
    totalRoles: number;
    totalModules: number;
    totalActions: number;
  }> {
    const _roles = await this.getAllRoles();
    const _modules = await this.getAllModules();
    const _actions = await this.getAllActions();

    return {
      totalRoles: roles.length,
      totalModules: modules.length,
      totalActions: actions.length
    };
  }
}

export default new PermissionService();
