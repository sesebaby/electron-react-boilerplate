import React, { useState, useEffect } from 'react';
import { UserRole, PermissionModule, PermissionAction, PermissionConfig, RolePermission } from '../../types/entities';
import { serviceManager } from '../../services/core';
import { GlassCard } from '../ui/FormControls';
import { Button } from '../ui/button';


interface ModuleInfo {
  module: PermissionModule;
  name: string;
  description: string;
}

interface ActionInfo {
  action: PermissionAction;
  name: string;
  description: string;
}

interface PermissionManagementProps {
  className?: string;
}

export const PermissionManagement: React.FC<PermissionManagementProps> = ({ className }) => {
  const [roles, setRoles] = useState<UserRole[]>([]);
  const [modules, setModules] = useState<ModuleInfo[]>([]);
  const [actions, setActions] = useState<ActionInfo[]>([]);
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [rolePermissions, setRolePermissions] = useState<PermissionConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 角色名称映射
  const roleNames = {
    [UserRole.ADMIN]: '管理员',
    [UserRole.OPERATOR]: '操作员'
  };

  // 角色描述映射
  const roleDescriptions = {
    [UserRole.ADMIN]: '拥有系统所有权限，可以管理用户、权限、系统设置等',
    [UserRole.OPERATOR]: '拥有业务操作权限，可以进行库存、采购、销售等日常业务操作'
  };

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [rolesResult, modulesResult, actionsResult] = await Promise.all([
        permissionService.getAllRoles(),
        permissionService.getAllModules(),
        permissionService.getAllActions()
      ]);

      const rolesData = rolesResult.success ? (rolesResult.data || []) : [];
      const modulesRawData = modulesResult.success ? (modulesResult.data || []) : [];
      const actionsRawData = actionsResult.success ? (actionsResult.data || []) : [];

      // Transform string arrays to structured objects
      const modulesData: ModuleInfo[] = Array.isArray(modulesRawData) ?
        modulesRawData.map((module: any) => ({
          module: (typeof module === 'string' ? module : module.module || 'unknown') as PermissionModule,
          name: typeof module === 'string' ? module : module.name || 'unknown',
          description: typeof module === 'string' ? `${module}模块权限` : module.description || '未知模块权限'
        })) : [];

      const actionsData: ActionInfo[] = Array.isArray(actionsRawData) ?
        actionsRawData.map((action: any) => ({
          action: (typeof action === 'string' ? action : action.action || 'unknown') as PermissionAction,
          name: typeof action === 'string' ? action : action.name || 'unknown',
          description: typeof action === 'string' ? `${action}操作权限` : action.description || '未知操作权限'
        })) : [];

      setRoles(rolesData as UserRole[]);
      setModules(modulesData);
      setActions(actionsData);

      // 默认选择第一个角色
      if (rolesData.length > 0) {
        setSelectedRole(rolesData[0]);
        const permissionsResult = await permissionService.getRolePermissions(rolesData[0]);
        const permissions = permissionsResult.success ? (permissionsResult.data || []) : [];
        // Convert Permission array to PermissionConfig if needed
        const permissionConfig = Array.isArray(permissions) && permissions.length > 0
          ? {
              role: rolesData[0],
              permissions: permissions
            } as PermissionConfig
          : null;
        setRolePermissions(permissionConfig);
      }
    } catch (error) {
      console.error('Failed to load permission data:', error);
      setMessage({ type: 'error', text: '加载权限数据失败' });
    } finally {
      setLoading(false);
    }
  };

  const handleRoleSelect = async (role: UserRole) => {
    try {
      setSelectedRole(role);
      const permissionsResult = await permissionService.getRolePermissions(role);
      const permissionsData = permissionsResult.success ? (permissionsResult.data || []) : [];
      // Convert array to PermissionConfig format
      const permissionConfig = Array.isArray(permissionsData) && permissionsData.length > 0
        ? {
            role: role,
            permissions: permissionsData
          } as PermissionConfig
        : null;
      setRolePermissions(permissionConfig);
    } catch (error) {
      console.error('Failed to load role permissions:', error);
      setMessage({ type: 'error', text: '加载角色权限失败' });
    }
  };

  const handlePermissionChange = (module: PermissionModule, action: PermissionAction, checked: boolean) => {
    if (!rolePermissions) return;

    const updatedPermissions = { ...rolePermissions };
    if (!updatedPermissions.permissions[module]) {
      updatedPermissions.permissions[module] = [];
    }

    const moduleActions = updatedPermissions.permissions[module] || [];
    if (checked) {
      if (!moduleActions.includes(action)) {
        updatedPermissions.permissions[module] = [...moduleActions, action];
      }
    } else {
      updatedPermissions.permissions[module] = moduleActions.filter(a => a !== action);
    }

    setRolePermissions(updatedPermissions);
  };

  const handleSavePermissions = async () => {
    if (!selectedRole || !rolePermissions) return;

    try {
      setSaving(true);
      // Convert permissions object to Permission array format expected by service
      const permissionArray = rolePermissions?.permissions || [];
      await permissionService.updateRolePermissions(selectedRole, permissionArray as any);
      setMessage({ type: 'success', text: '权限保存成功' });
    } catch (error) {
      console.error('Failed to save permissions:', error);
      setMessage({ type: 'error', text: '权限保存失败' });
    } finally {
      setSaving(false);
    }
  };

  const isActionAllowed = (module: PermissionModule, action: PermissionAction): boolean => {
    if (!rolePermissions) return false;
    const moduleActions = rolePermissions.permissions[module] || [];
    return moduleActions.includes(action);
  };

  if (loading) {
    return (
      <div className={`space-y-6 ${className || ''}`}>
        <GlassCard className="p-6">
          <div className="flex items-center justify-center h-64">
            <div className="text-white/80">加载中...</div>
          </div>
        </GlassCard>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className || ''}`}>
      {/* 页面标题 */}
      <GlassCard className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white">权限管理</h1>
            <p className="text-white/80 mt-1">
              管理系统角色权限，支持管理员和操作员两种角色
            </p>
          </div>
        </div>
      </GlassCard>

      {/* 消息提示 */}
      {message && (
        <GlassCard className={`p-4 ${
          message.type === 'success'
            ? 'bg-green-500/20 border-green-400/30'
            : 'bg-red-500/20 border-red-400/30'
        }`}>
          <div className="text-white">{message.text}</div>
        </GlassCard>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 角色列表 */}
        <div className="lg:col-span-1">
          <GlassCard className="p-6">
            <h2 className="text-lg font-semibold text-white mb-4">
              系统角色
            </h2>
            <div className="space-y-3">
              {roles.map(role => (
                <div
                  key={role}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedRole === role
                      ? 'border-blue-400 bg-blue-500/20'
                      : 'border-white/20 hover:border-white/30'
                  }`}
                  onClick={() => handleRoleSelect(role)}
                >
                  <div className="font-medium text-white">
                    {roleNames[role]}
                  </div>
                  <div className="text-sm text-white/70 mt-1">
                    {roleDescriptions[role]}
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        {/* 权限配置 */}
        <div className="lg:col-span-2">
          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-white">
                权限配置 {selectedRole && `- ${roleNames[selectedRole]}`}
              </h2>
              <Button
                onClick={handleSavePermissions}
                disabled={saving || !selectedRole}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                {saving ? '保存中...' : '保存权限'}
              </Button>
            </div>

            {selectedRole && rolePermissions && (
              <div className="space-y-6">
                {modules.map(moduleInfo => (
                  <div key={moduleInfo.module} className="border border-white/20 rounded-lg p-4">
                    <div className="mb-4">
                      <h3 className="font-medium text-white">
                        {moduleInfo.name}
                      </h3>
                      <p className="text-sm text-white/70 mt-1">
                        {moduleInfo.description}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {actions.map(actionInfo => (
                        <label
                          key={actionInfo.action}
                          className="flex items-center space-x-2 cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={isActionAllowed(moduleInfo.module, actionInfo.action)}
                            onChange={(e) => handlePermissionChange(
                              moduleInfo.module,
                              actionInfo.action,
                              e.target.checked
                            )}
                            className="rounded border-white/30 text-blue-600 focus:ring-blue-500 bg-white/10"
                          />
                          <span className="text-sm text-white/90">
                            {actionInfo.name}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </GlassCard>
        </div>
      </div>
    </div>
  );
};

export default PermissionManagement;
