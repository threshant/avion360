"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import * as userManagementService from "@/services/userManagementService";
import type {
  CreateUserPayload,
  UpdateUserPayload,
  UpdateUserPermissionsPayload,
  UserWithPermissions,
} from "@/types";
import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";
import useSWRMutation from "swr/mutation";

type UsersResponse = Awaited<ReturnType<typeof userManagementService.getUsers>>;
type UserPermissionsResponse = Awaited<
  ReturnType<typeof userManagementService.getUserPermissions>
>;
type ShareLinkResponse = Awaited<
  ReturnType<typeof userManagementService.generateShareLink>
>;

export function useUsers(page = 1, limit = 20, enabled = true) {
  const { mutate: globalMutate } = useSWRConfig();
  const key = enabled ? swrKey("/swr/users", { page, limit }) : null;
  const query = useSWR<UsersResponse>(key, () =>
    withNetworkActivity(() => userManagementService.getUsers(page, limit)),
  );

  const createUser = useCallback(
    async (payload: CreateUserPayload) => {
      const user = await withNetworkActivity(() =>
        userManagementService.createUser(payload),
      );
      await invalidateSWRPrefix(globalMutate, "/swr/users");
      return user;
    },
    [globalMutate],
  );

  const deleteUser = useCallback(
    async (userId: string) => {
      await withNetworkActivity(() => userManagementService.deleteUser(userId));
      await invalidateSWRPrefix(globalMutate, ["/swr/users", "/swr/user"]);
    },
    [globalMutate],
  );

  const updateUser = useCallback(
    async (userId: string, payload: UpdateUserPayload) => {
      const user = await withNetworkActivity(() =>
        userManagementService.updateUser(userId, payload),
      );
      await invalidateSWRPrefix(globalMutate, ["/swr/users", "/swr/user"]);
      return user;
    },
    [globalMutate],
  );

  const toggleUserActive = useCallback(
    async (user: UserWithPermissions) => {
      if (user.is_active) {
        await withNetworkActivity(() =>
          userManagementService.deactivateUser(user.id),
        );
      } else {
        await withNetworkActivity(() =>
          userManagementService.activateUser(user.id),
        );
      }
      await invalidateSWRPrefix(globalMutate, ["/swr/users", "/swr/user"]);
    },
    [globalMutate],
  );

  return {
    users: query.data?.users ?? [],
    pagination: query.data?.pagination ?? {
      page,
      limit,
      total: 0,
      pages: 0,
    },
    loading: query.isLoading || query.isValidating,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.mutate,
    createUser,
    deleteUser,
    updateUser,
    toggleUserActive,
  };
}

export function useUserProfile(userId: string | null, enabled = true) {
  const { mutate: globalMutate } = useSWRConfig();
  const key = enabled && userId ? swrKey("/swr/user", { userId }) : null;
  const query = useSWR<UserWithPermissions>(key, () =>
    withNetworkActivity(() => userManagementService.getUserById(userId!)),
  );

  const updateUser = useCallback(
    async (payload: UpdateUserPayload) => {
      if (!userId) {
        throw new Error("User id is required");
      }

      const updated = await withNetworkActivity(() =>
        userManagementService.updateUser(userId, payload),
      );
      await query.mutate(updated, { revalidate: false });
      await invalidateSWRPrefix(globalMutate, "/swr/users");
      return updated;
    },
    [globalMutate, query, userId],
  );

  return {
    user: query.data ?? null,
    loading: query.isLoading || query.isValidating,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.mutate,
    updateUser,
  };
}

export function useUserPermissionsData(userId: string | null, enabled = true) {
  const { mutate: globalMutate } = useSWRConfig();
  const key =
    enabled && userId ? swrKey("/swr/users/permissions", { userId }) : null;
  const query = useSWR<UserPermissionsResponse>(key, () =>
    withNetworkActivity(() =>
      userManagementService.getUserPermissions(userId!),
    ),
  );

  const savePermissions = useCallback(
    async (payload: UpdateUserPermissionsPayload) => {
      if (!userId) {
        throw new Error("User id is required");
      }

      const updated = await withNetworkActivity(() =>
        userManagementService.updateUserPermissions(userId, payload),
      );
      await query.mutate(updated, { revalidate: false });
      await invalidateSWRPrefix(globalMutate, "/swr/users");
      return updated;
    },
    [globalMutate, query, userId],
  );

  return {
    permissions: query.data?.permissions ?? [],
    loading: query.isLoading || query.isValidating,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.mutate,
    savePermissions,
  };
}

export function useShareUserAccess(userId: string | null) {
  const mutation = useSWRMutation<ShareLinkResponse, Error, string | null, void>(
    userId ? swrKey("/swr/users/share", { userId }) : null,
    async () => {
      if (!userId) {
        throw new Error("User id is required");
      }

      return withNetworkActivity(() =>
        userManagementService.generateShareLink(userId),
      );
    },
  );

  return {
    shareData: mutation.data ?? null,
    loading: mutation.isMutating,
    error: mutation.error?.message ?? null,
    generateLink: mutation.trigger,
    reset: mutation.reset,
  };
}
