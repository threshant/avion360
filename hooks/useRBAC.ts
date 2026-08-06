import { useAuth } from "@/lib/auth-context";
import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import * as rbacService from "@/services/rbacService";
import type { Permission, Role, RoleWithPermissions } from "@/types";
import { useCallback, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

/**
 * Hook to check if current user has a specific permission
 */
export function useHasPermission(permissionKey: string): boolean {
  const auth = useAuth();
  const { data, isLoading } = useSWR(
    auth.isAuthenticated
      ? swrKey("/swr/rbac/has-permission", { permissionKey })
      : null,
    () => withNetworkActivity(() => rbacService.hasPermission(permissionKey)),
  );

  return Boolean(data) && !isLoading;
}

/**
 * Hook to get all permissions for the current user
 * Returns cached permissions from AuthContext (fetched once at login)
 */
export function useUserPermissions() {
  const auth = useAuth();

  // Return cached permissions from auth context
  // No API calls - permissions are cached after login and stored in localStorage
  return {
    permissions: auth.permissions,
    loading: false, // Permissions are already loaded from cache/localStorage
    error: null,
  };
}

/**
 * Hook to get all roles (admin use)
 */
export function useRoles() {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    "/swr/rbac/roles",
    () => withNetworkActivity(() => rbacService.getRoles()),
  );

  return {
    roles: (data as Role[] | undefined) ?? [],
    loading: isLoading || isValidating,
    error: error instanceof Error ? error.message : null,
    refetch: mutate,
  };
}

/**
 * Hook to get a specific role with its permissions
 */
export function useRole(roleId: string | null) {
  const key = roleId ? swrKey("/swr/rbac/role", { roleId }) : null;
  const { data, error, isLoading, isValidating, mutate } = useSWR(key, () =>
    withNetworkActivity(() => rbacService.getRoleById(roleId!)),
  );

  return {
    role: (data as RoleWithPermissions | undefined) ?? null,
    loading: isLoading || isValidating,
    error: error instanceof Error ? error.message : null,
    refetch: mutate,
  };
}

/**
 * Hook to get all available permissions
 */
export function usePermissions() {
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    "/swr/rbac/permissions",
    () => withNetworkActivity(() => rbacService.getPermissions()),
  );

  return {
    permissions: (data as Permission[] | undefined) ?? [],
    loading: isLoading || isValidating,
    error: error instanceof Error ? error.message : null,
    refetch: mutate,
  };
}

/**
 * Hook to manage role creation and updates
 */
export function useRoleManagement() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate } = useSWRConfig();

  const createRole = useCallback(
    async (name: string, description?: string) => {
      try {
        setLoading(true);
        const role = await withNetworkActivity(() =>
          rbacService.createRole({ name, description }),
        );
        await invalidateSWRPrefix(mutate, "/swr/rbac");
        setError(null);
        return role;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to create role";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [mutate],
  );

  const updateRole = useCallback(
    async (roleId: string, description?: string, isActive?: boolean) => {
      try {
        setLoading(true);
        const role = await withNetworkActivity(() =>
          rbacService.updateRole(roleId, {
            description,
            isActive,
          }),
        );
        await invalidateSWRPrefix(mutate, "/swr/rbac");
        setError(null);
        return role;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update role";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [mutate],
  );

  const deleteRole = useCallback(
    async (roleId: string) => {
      try {
        setLoading(true);
        await withNetworkActivity(() => rbacService.deleteRole(roleId));
        await invalidateSWRPrefix(mutate, "/swr/rbac");
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to delete role";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [mutate],
  );

  return { createRole, updateRole, deleteRole, loading, error };
}

/**
 * Hook to manage role permissions
 */
export function useRolePermissions(roleId: string | null) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { mutate: globalMutate } = useSWRConfig();

  const key = roleId ? swrKey("/swr/rbac/role-permissions", { roleId }) : null;
  const query = useSWR(key, () =>
    withNetworkActivity(() => rbacService.getRolePermissions(roleId!)),
  );

  const assignPermission = useCallback(
    async (permissionId: string) => {
      if (!roleId) return;
      try {
        setLoading(true);
        await withNetworkActivity(() =>
          rbacService.assignPermission(roleId, permissionId),
        );
        await invalidateSWRPrefix(globalMutate, "/swr/rbac");
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to assign permission";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [globalMutate, roleId],
  );

  const revokePermission = useCallback(
    async (permissionId: string) => {
      if (!roleId) return;
      try {
        setLoading(true);
        await withNetworkActivity(() =>
          rbacService.revokePermission(roleId, permissionId),
        );
        await invalidateSWRPrefix(globalMutate, "/swr/rbac");
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to revoke permission";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [globalMutate, roleId],
  );

  const updatePermissions = useCallback(
    async (permissionIds: string[]) => {
      if (!roleId) return;
      try {
        setLoading(true);
        await withNetworkActivity(() =>
          rbacService.updateRolePermissions(roleId, {
            roleId,
            permissionIds,
          }),
        );
        await invalidateSWRPrefix(globalMutate, "/swr/rbac");
        setError(null);
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Failed to update permissions";
        setError(errorMessage);
        throw err;
      } finally {
        setLoading(false);
      }
    },
    [globalMutate, roleId],
  );

  return {
    permissions: (query.data as Permission[] | undefined) ?? [],
    loading: loading || query.isLoading || query.isValidating,
    error: error || (query.error instanceof Error ? query.error.message : null),
    assignPermission,
    revokePermission,
    updatePermissions,
    refetch: query.mutate,
  };
}
