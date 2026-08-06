/**
 * RBAC Types - Role-Based Access Control System
 */

// ─── Roles ──────────────────────────────────────────────────────────────────

export interface Role {
  id: string;
  name: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RoleWithPermissions extends Role {
  permissions: Permission[];
}

export interface CreateRolePayload {
  name: string;
  description?: string;
}

export interface UpdateRolePayload {
  name?: string;
  description?: string;
  isActive?: boolean;
}

// ─── Permissions ────────────────────────────────────────────────────────────

export interface Permission {
  id: string;
  key: string;
  label: string;
  description?: string;
  category: string;
  icon?: string;
  path?: string;
  orderNum?: number;
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePermissionPayload {
  key: string;
  label: string;
  description?: string;
  category?: string;
  icon?: string;
  path?: string;
  orderNum?: number;
  isActive?: boolean;
}

export interface UpdatePermissionPayload {
  key?: string;
  label?: string;
  description?: string;
  category?: string;
  icon?: string;
  path?: string;
  orderNum?: number;
  isActive?: boolean;
}

// ─── Role Permissions ───────────────────────────────────────────────────────

export interface RolePermission {
  id: string;
  roleId: string;
  permissionId: string;
  createdAt: string;
}

export interface UpdatePermissionsPayload {
  roleId: string;
  permissionIds: string[];
}

// ─── User Context ───────────────────────────────────────────────────────────

export interface UserPermission {
  id: string;
  key: string;
  label: string;
  category: string;
}

export interface RoleInfo {
  id: string;
  name: string;
  key: string;
}
