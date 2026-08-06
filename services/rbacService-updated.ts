/**
 * RBAC Service - Updated version using API Middleware Wrapper
 * All calls go through apiClientWrapper for safety and consistency
 */

import { apiClientWrapper, ApiClientWrapper } from "@/lib/apiClientWrapper";
import type {
  Role,
  Permission,
  RolePermission,
  RoleWithPermissions,
  CreateRolePayload,
  UpdateRolePayload,
  UpdatePermissionsPayload,
} from "@/types/rbac";

/**
 * Helper to extract data from wrapped response
 */
function extractData<T>(response: any): T {
  return ApiClientWrapper.extractData(response);
}

// ─────────────────────── Roles ───────────────────────────────────────────

/**
 * Get all available roles
 * @requires authentication
 */
export async function getRoles(): Promise<Role[]> {
  const response = await apiClientWrapper.get("/api/rbac/roles");
  const data = extractData<{ roles: Role[] }>(response);
  return data.roles;
}

/**
 * Get a specific role with its permissions
 * @requires authentication
 */
export async function getRoleById(
  roleId: string,
): Promise<RoleWithPermissions> {
  const response = await apiClientWrapper.get(`/api/rbac/roles/${roleId}`);
  return extractData<RoleWithPermissions>(response);
}

/**
 * Create a new custom role
 * @requires authentication
 * @requires super_admin role
 */
export async function createRole(payload: CreateRolePayload): Promise<Role> {
  const response = await apiClientWrapper.post("/api/rbac/roles", payload);
  return extractData<Role>(response);
}

/**
 * Update an existing role
 * @requires authentication
 * @requires super_admin role
 */
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

/**
 * Delete a custom role
 * @requires authentication
 * @requires super_admin role
 * @note Cannot delete system roles
 */
export async function deleteRole(roleId: string): Promise<void> {
  await apiClientWrapper.delete(`/api/rbac/roles/${roleId}`);
}

// ─────────────────────── Permissions ───────────────────────────────────

/**
 * Get all available permissions
 * @requires authentication
 */
export async function getPermissions(): Promise<Permission[]> {
  const response = await apiClientWrapper.get("/api/rbac/permissions");
  const data = extractData<{ permissions: Permission[] }>(response);
  return data.permissions;
}

/**
 * Get a specific permission
 * @requires authentication
 */
export async function getPermissionById(
  permissionId: string,
): Promise<Permission> {
  const response = await apiClientWrapper.get(
    `/api/rbac/permissions/${permissionId}`,
  );
  return extractData<Permission>(response);
}

/**
 * Get permissions filtered by category
 * @requires authentication
 */
export async function getPermissionsByCategory(
  category: string,
): Promise<Permission[]> {
  const response = await apiClientWrapper.get(
    `/api/rbac/permissions?category=${encodeURIComponent(category)}`,
  );
  const data = extractData<{ permissions: Permission[] }>(response);
  return data.permissions;
}

// ─────────────────────── Role Permissions ────────────────────────────

/**
 * Get all permissions assigned to a role
 * @requires authentication
 */
export async function getRolePermissions(
  roleId: string,
): Promise<Permission[]> {
  const response = await apiClientWrapper.get(
    `/api/rbac/roles/${roleId}/permissions`,
  );
  const data = extractData<{ permissions: Permission[] }>(response);
  return data.permissions;
}

/**
 * Update all permissions for a role (replace all)
 * @requires authentication
 * @requires super_admin role
 */
export async function updateRolePermissions(
  roleId: string,
  payload: UpdatePermissionsPayload,
): Promise<RolePermission[]> {
  const response = await apiClientWrapper.put(
    `/api/rbac/roles/${roleId}/permissions`,
    payload,
  );
  const data = extractData<{ permissions: RolePermission[] }>(response);
  return data.permissions;
}

/**
 * Assign a single permission to a role
 * @requires authentication
 * @requires super_admin role
 */
export async function assignPermission(
  roleId: string,
  permissionId: string,
): Promise<RolePermission> {
  const response = await apiClientWrapper.post(
    `/api/rbac/roles/${roleId}/permissions/${permissionId}`,
  );
  return extractData<RolePermission>(response);
}

/**
 * Revoke a permission from a role
 * @requires authentication
 * @requires super_admin role
 */
export async function revokePermission(
  roleId: string,
  permissionId: string,
): Promise<void> {
  await apiClientWrapper.delete(
    `/api/rbac/roles/${roleId}/permissions/${permissionId}`,
  );
}

// ─────────────────────── User Permissions ────────────────────────────

/**
 * Get all permissions for the current logged-in user
 * @requires authentication
 */
export async function getUserPermissions(): Promise<Permission[]> {
  const response = await apiClientWrapper.get("/api/rbac/me/permissions");
  const data = extractData<{ permissions: Permission[] }>(response);
  return data.permissions;
}

/**
 * Check if current user has a specific permission
 * @requires authentication
 */
export async function hasPermission(permissionKey: string): Promise<boolean> {
  try {
    const response = await apiClientWrapper.get(
      `/api/rbac/me/permissions/${encodeURIComponent(permissionKey)}`,
    );
    const data = extractData<{ hasPermission: boolean }>(response);
    return data.hasPermission;
  } catch (error) {
    console.error(`Error checking permission ${permissionKey}:`, error);
    return false;
  }
}

// ─────────────────────── Batch Operations ────────────────────────────

/**
 * Assign multiple permissions to a role at once
 * @requires authentication
 * @requires super_admin role
 */
export async function assignMultiplePermissions(
  roleId: string,
  permissionIds: string[],
): Promise<RolePermission[]> {
  const results = await Promise.all(
    permissionIds.map((id) => assignPermission(roleId, id)),
  );
  return results;
}

/**
 * Revoke multiple permissions from a role at once
 * @requires authentication
 * @requires super_admin role
 */
export async function revokeMultiplePermissions(
  roleId: string,
  permissionIds: string[],
): Promise<void> {
  await Promise.all(permissionIds.map((id) => revokePermission(roleId, id)));
}

// ─────────────────────── Error Handling ────────────────────────────

/**
 * Handle RBAC service errors with user-friendly messages
 */
export function handleRbacError(error: unknown): string {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes("authentication")) {
      return "Please log in to continue";
    }

    if (message.includes("authorization") || message.includes("forbidden")) {
      return "You don't have permission to perform this action";
    }

    if (message.includes("not found")) {
      return "The requested resource was not found";
    }

    if (message.includes("validation")) {
      return "Please check your input and try again";
    }

    return error.message;
  }

  return "An unexpected error occurred";
}
