import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import {
  createStaff,
  deleteStaff,
  fetchStaff,
  fetchStaffById,
  updateStaff,
} from "@/services/warehouseService";
import type {
  CreateStaffPayload,
  Staff,
  UpdateStaffPayload,
} from "@/types/warehouse";
import { useCallback, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

export function useStaff() {
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const { mutate: globalMutate } = useSWRConfig();

  const key = swrKey("/swr/staff", { search });
  const { data, isLoading, isValidating, mutate } = useSWR(key, () =>
    withNetworkActivity(() => fetchStaff(search)),
  );

  const load = useCallback(
    async (search?: string) => {
      setSearch(search);
      setError(null);
      return mutate(
        withNetworkActivity(() => fetchStaff(search)),
        { revalidate: false },
      );
    },
    [mutate],
  );

  const get = useCallback(async (id: string) => {
    setError(null);
    try {
      const response = await withNetworkActivity(() => fetchStaffById(id));
      return response.data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch staff member";
      setError(message);
      throw err;
    }
  }, []);

  const create = useCallback(
    async (payload: CreateStaffPayload) => {
      setError(null);
      try {
        const response = await withNetworkActivity(() => createStaff(payload));
        await invalidateSWRPrefix(globalMutate, [
          "/swr/staff",
          "/swr/dashboard",
        ]);
        return response.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create staff member";
        setError(message);
        throw err;
      }
    },
    [globalMutate],
  );

  const update = useCallback(
    async (id: string, payload: UpdateStaffPayload) => {
      setError(null);
      try {
        const response = await withNetworkActivity(() =>
          updateStaff(id, payload),
        );
        await invalidateSWRPrefix(globalMutate, [
          "/swr/staff",
          "/swr/dashboard",
        ]);
        return response.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update staff member";
        setError(message);
        throw err;
      }
    },
    [globalMutate],
  );

  const remove = useCallback(
    async (id: string) => {
      setError(null);
      try {
        await withNetworkActivity(() => deleteStaff(id));
        await invalidateSWRPrefix(globalMutate, [
          "/swr/staff",
          "/swr/dashboard",
        ]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete staff member";
        setError(message);
        throw err;
      }
    },
    [globalMutate],
  );

  const staff: Staff[] = data?.data ?? [];
  const total = data?.total ?? 0;

  return {
    staff,
    total,
    isLoading: isLoading || isValidating,
    error: error,
    load,
    get,
    create,
    update,
    remove,
  };
}
