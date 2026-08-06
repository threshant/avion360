import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import {
  createWarehouse,
  deleteWarehouse,
  fetchWarehouseById,
  fetchWarehouses,
  updateWarehouse,
} from "@/services/warehouseService";
import type {
  CreateWarehousePayload,
  UpdateWarehousePayload,
  Warehouse,
} from "@/types/warehouse";
import { useCallback, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

export function useWarehouses() {
  const [search, setSearch] = useState<string | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const { mutate: globalMutate } = useSWRConfig();

  const key = swrKey("/swr/warehouses", { search });
  const { data, isLoading, isValidating, mutate } = useSWR(key, () =>
    withNetworkActivity(() => fetchWarehouses(search)),
  );

  const load = useCallback(
    async (search?: string) => {
      setSearch(search);
      setError(null);
      return mutate(
        withNetworkActivity(() => fetchWarehouses(search)),
        { revalidate: false },
      );
    },
    [mutate],
  );

  const get = useCallback(async (id: string) => {
    setError(null);
    try {
      const response = await withNetworkActivity(() => fetchWarehouseById(id));
      return response.data;
    } catch (err) {
      const message =
        err instanceof Error ? err.message : "Failed to fetch warehouse";
      setError(message);
      throw err;
    }
  }, []);

  const create = useCallback(
    async (payload: CreateWarehousePayload) => {
      setError(null);
      try {
        const response = await withNetworkActivity(() =>
          createWarehouse(payload),
        );
        await invalidateSWRPrefix(globalMutate, [
          "/swr/warehouses",
          "/swr/dashboard",
        ]);
        return response.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to create warehouse";
        setError(message);
        throw err;
      }
    },
    [globalMutate],
  );

  const update = useCallback(
    async (id: string, payload: UpdateWarehousePayload) => {
      setError(null);
      try {
        const response = await withNetworkActivity(() =>
          updateWarehouse(id, payload),
        );
        await invalidateSWRPrefix(globalMutate, [
          "/swr/warehouses",
          "/swr/dashboard",
        ]);
        return response.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to update warehouse";
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
        await withNetworkActivity(() => deleteWarehouse(id));
        await invalidateSWRPrefix(globalMutate, [
          "/swr/warehouses",
          "/swr/dashboard",
        ]);
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to delete warehouse";
        setError(message);
        throw err;
      }
    },
    [globalMutate],
  );

  const warehouses: Warehouse[] = data?.data ?? [];
  const total = data?.total ?? 0;

  return {
    warehouses,
    total,
    isLoading: isLoading || isValidating,
    error,
    load,
    get,
    create,
    update,
    remove,
  };
}
