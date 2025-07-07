import React from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole } from '../../types/entities';

interface PermissionGateProps {
  permission?: string;
  role?: UserRole;
  roles?: UserRole[];
  permissions?: string[];
  requireAll?: boolean; // If true, user must have ALL permissions/roles, otherwise ANY
  fallback?: React.ReactNode;
  children: React.ReactNode;
}

/**
 * Permission-based component that conditionally renders content based on user permissions or roles.
 * Enhances security by controlling UI access at the component level.
 */
export const PermissionGate: React.FC<PermissionGateProps> = ({
  permission,
  role,
  roles = [],
  permissions = [],
  requireAll = false,
  fallback = null,
  children
}) => {
  const { hasPermission, hasRole, isAuthenticated } = useAuth();

  // Must be authenticated
  if (!isAuthenticated) {
    return <>{fallback}</>;
  }

  // Collect all permissions and roles to check
  const allPermissions = [
    ...(permission ? [permission] : []),
    ...permissions
  ];
  
  const allRoles = [
    ...(role ? [role] : []),
    ...roles
  ];

  // Check permissions
  let hasRequiredPermissions = true;
  if (allPermissions.length > 0) {
    if (requireAll) {
      hasRequiredPermissions = allPermissions.every(p => hasPermission(p));
    } else {
      hasRequiredPermissions = allPermissions.some(p => hasPermission(p));
    }
  }

  // Check roles
  let hasRequiredRoles = true;
  if (allRoles.length > 0) {
    if (requireAll) {
      hasRequiredRoles = allRoles.every(r => hasRole(r));
    } else {
      hasRequiredRoles = allRoles.some(r => hasRole(r));
    }
  }

  // Combine permission and role checks
  const hasAccess = hasRequiredPermissions && hasRequiredRoles;

  return hasAccess ? <>{children}</> : <>{fallback}</>;
};

/**
 * Higher-order component for permission-based access control
 */
export function withPermission<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredPermission: string,
  fallback?: React.ReactNode
) {
  return function PermissionWrappedComponent(props: P) {
    return (
      <PermissionGate permission={requiredPermission} fallback={fallback}>
        <WrappedComponent {...props} />
      </PermissionGate>
    );
  };
}

/**
 * Higher-order component for role-based access control
 */
export function withRole<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  requiredRole: UserRole,
  fallback?: React.ReactNode
) {
  return function RoleWrappedComponent(props: P) {
    return (
      <PermissionGate role={requiredRole} fallback={fallback}>
        <WrappedComponent {...props} />
      </PermissionGate>
    );
  };
}

/**
 * Hook for conditional rendering based on permissions
 */
export const usePermissionCheck = () => {
  const { hasPermission, hasRole } = useAuth();

  const checkPermission = (permission: string): boolean => {
    return hasPermission(permission);
  };

  const checkRole = (role: UserRole): boolean => {
    return hasRole(role);
  };

  const checkAnyPermission = (permissions: string[]): boolean => {
    return permissions.some(p => hasPermission(p));
  };

  const checkAllPermissions = (permissions: string[]): boolean => {
    return permissions.every(p => hasPermission(p));
  };

  const checkAnyRole = (roles: UserRole[]): boolean => {
    return roles.some(r => hasRole(r));
  };

  const checkAllRoles = (roles: UserRole[]): boolean => {
    return roles.every(r => hasRole(r));
  };

  return {
    checkPermission,
    checkRole,
    checkAnyPermission,
    checkAllPermissions,
    checkAnyRole,
    checkAllRoles
  };
};

export default PermissionGate;