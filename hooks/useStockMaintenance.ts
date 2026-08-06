import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import {
  fetchStockMaintenance,
  recordStockChange,
} from "@/services/stockMaintenanceService";
import type {
  CreateStockMaintenancePayload,
  StockMaintenance,
} from "@/types/stockMaintenance";
import { useCallback, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

export function useStockMaintenance(inventoryItemId?: string) {
  const [selectedItemId, setSelectedItemId] = useState<string | undefined>(
    inventoryItemId,
  );
  const [error, setError] = useState<string | null>(null);
  const { mutate: globalMutate } = useSWRConfig();

  const activeItemId = selectedItemId || inventoryItemId;
  const key = activeItemId
    ? swrKey("/swr/stock-maintenance", { inventoryItemId: activeItemId })
    : null;

  const { data, isLoading, isValidating, mutate } = useSWR(key, () =>
    withNetworkActivity(() => fetchStockMaintenance(activeItemId!)),
  );

  const load = useCallback(
    async (itemId?: string) => {
      if (!itemId && !inventoryItemId) {
        setError("Inventory item ID is required");
        return;
      }

      const id = itemId || inventoryItemId;
      setSelectedItemId(id);
      setError(null);
      return mutate(
        withNetworkActivity(() => fetchStockMaintenance(id!)),
        { revalidate: false },
      );
    },
    [inventoryItemId, mutate],
  );

  const record = useCallback(
    async (itemId: string, payload: CreateStockMaintenancePayload) => {
      setError(null);
      try {
        const response = await withNetworkActivity(() =>
          recordStockChange(itemId, payload),
        );
        await invalidateSWRPrefix(globalMutate, [
          "/swr/stock-maintenance",
          "/swr/inventory",
          "/swr/dashboard",
        ]);
        return response.data;
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Failed to record stock change";
        setError(message);
        throw err;
      }
    },
    [globalMutate],
  );

  const history: StockMaintenance[] = data?.data ?? [];
  const total = data?.total ?? 0;

  return {
    history,
    total,
    isLoading: isLoading || isValidating,
    error,
    load,
    record,
  };
}
