import { apiClientWrapper } from "@/lib/apiClientWrapper";
import type {
  CreatePermissionPayload,
  CreateRolePayload,
  Permission,
  Role,
  RolePermission,
  RoleWithPermissions,
  UpdatePermissionPayload,
  UpdatePermissionsPayload,
  UpdateRolePayload,
} from "@/types";

/**
 * Service for managing Roles and Permissions
 * All calls go through apiClientWrapper for safety and consistency
 */

// Helper to extract data with flexible typing
function extractData<T>(response: any): T {
  return response.data as T;
}

// ─── Roles ──────────────────────────────────────────────────────────────────

export async function getRoles(): Promise<Role[]> {
  const response = await apiClientWrapper.get("/api/rbac/roles");
  return extractData<{ roles: Role[] }>(response).roles;
}

export async function getRoleById(
  roleId: string,
): Promise<RoleWithPermissions> {
  const response = await apiClientWrapper.get(`/api/rbac/roles/${roleId}`);
  return extractData<RoleWithPermissions>(response);
}

export async function createRole(payload: CreateRolePayload): Promise<Role> {
  const response = await apiClientWrapper.post("/api/rbac/roles", payload);
  return extractData<Role>(response);
}

export async function updateRole(
  roleId: string,
  payload: UpdateRolePayload,
): Promise<Role> {
  const response = await apiClientWrapper.put(
    `/api/rbac/roles/${roleId}`,
    payload,
  );
  return extractData<Role>(response);
}

export async function deleteRole(roleId: string): Promise<void> {
  await apiClientWrapper.delete(`/api/rbac/roles/${roleId}`);
}

// ─── Permissions ────────────────────────────────────────────────────────────

export async function getPermissions(): Promise<Permission[]> {
  const response = await apiClientWrapper.get("/api/rbac/permissions");
  return extractData<{ permissions: Permission[] }>(response).permissions;
}

export async function getPermissionById(
  permissionId: string,
): Promise<Permission> {
  const response = await apiClientWrapper.get(
    `/api/rbac/permissions/${permissionId}`,
  );
  return extractData<Permission>(response);
}

export async function createPermission(
  payload: CreatePermissionPayload,
): Promise<Permission> {
  const response = await apiClientWrapper.post(
    "/api/rbac/permissions",
    payload,
  );
  return extractData<Permission>(response);
}

export async function updatePermission(
  permissionId: string,
  payload: UpdatePermissionPayload,
): Promise<Permission> {
  const response = await apiClientWrapper.put(
    `/api/rbac/permissions/${permissionId}`,
    payload,
  );
  return extractData<Permission>(response);
}

export async function deletePermission(permissionId: string): Promise<void> {
  await apiClientWrapper.delete(`/api/rbac/permissions/${permissionId}`);
}

export async function getPermissionsByCategory(
  category: string,
): Promise<Permission[]> {
  const response = await apiClientWrapper.get(
    `/api/rbac/permissions?category=${encodeURIComponent(category)}`,
  );
  return extractData<{ permissions: Permission[] }>(response).permissions;
}

// ─── Role Permissions ───────────────────────────────────────────────────────

export async function getRolePermissions(
  roleId: string,
): Promise<Permission[]> {
  const response = await apiClientWrapper.get(
    `/api/rbac/roles/${roleId}/permissions`,
  );
  return extractData<{ permissions: Permission[] }>(response).permissions;
}

export async function updateRolePermissions(
  roleId: string,
  payload: UpdatePermissionsPayload,
): Promise<RolePermission[]> {
  const response = await apiClientWrapper.put(
    `/api/rbac/roles/${roleId}/permissions`,
    payload,
  );
  return extractData<{ permissions: RolePermission[] }>(response).permissions;
}

export async function assignPermission(
  roleId: string,
  permissionId: string,
): Promise<RolePermission> {
  const response = await apiClientWrapper.post(
    `/api/rbac/roles/${roleId}/permissions/${permissionId}`,
  );
  return extractData<RolePermission>(response);
}

export async function revokePermission(
  roleId: string,
  permissionId: string,
): Promise<void> {
  await apiClientWrapper.delete(
    `/api/rbac/roles/${roleId}/permissions/${permissionId}`,
  );
}

// ─── User Permissions (based on user's role) ────────────────────────────────

export async function getUserPermissions(): Promise<Permission[]> {
  const response = await apiClientWrapper.get("/api/rbac/me/permissions");
  return extractData<{ permissions: Permission[] }>(response).permissions;
}

export async function hasPermission(permissionKey: string): Promise<boolean> {
  try {
    const response = await apiClientWrapper.get(
      `/api/rbac/me/permissions/${encodeURIComponent(permissionKey)}`,
    );
    return extractData<{ hasPermission: boolean }>(response).hasPermission;
  } catch (error) {
    console.error(`Error checking permission ${permissionKey}:`, error);
    return false;
  }
}
