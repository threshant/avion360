"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import {
  bulkUploadStock,
  createInventoryItem,
  deleteInventoryItem,
  fetchInventory,
  updateInventoryItem,
} from "@/services/inventoryService";
import type {
  CreateInventoryPayload,
  InventoryFilters,
  InventoryItem,
  StockUploadPayload,
  StockUploadResponse,
  UpdateInventoryPayload,
} from "@/types/inventory";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";

type UseInventoryState = {
  items: InventoryItem[];
  total: number;
  maxPages: number;
  loading: boolean;
  uploading: boolean;
  error: string | null;
};

export function useInventory(initialFilters: InventoryFilters = {}) {
  const [filters, setFilters] = useState<InventoryFilters>(initialFilters);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const { mutate: globalMutate } = useSWRConfig();

  const key = swrKey("/swr/inventory", filters as Record<string, unknown>);
  const { data, error, isLoading, isValidating, mutate } = useSWR(key, () =>
    withNetworkActivity(() => fetchInventory(filters)),
  );

  const load = async () => mutate();

  const addItem = async (
    payload: CreateInventoryPayload,
  ): Promise<InventoryItem> => {
    const response = await withNetworkActivity(() =>
      createInventoryItem(payload),
    );
    await invalidateSWRPrefix(globalMutate, [
      "/swr/inventory",
      "/swr/dashboard",
    ]);
    return response.data;
  };

  const editItem = async (
    id: string,
    payload: UpdateInventoryPayload,
  ): Promise<InventoryItem> => {
    const response = await withNetworkActivity(() =>
      updateInventoryItem(id, payload),
    );
    await invalidateSWRPrefix(globalMutate, [
      "/swr/inventory",
      "/swr/dashboard",
    ]);
    return response.data;
  };

  const removeItem = async (id: string): Promise<void> => {
    await withNetworkActivity(() => deleteInventoryItem(id));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/inventory",
      "/swr/dashboard",
    ]);
  };

  const uploadStock = async (
    payload: StockUploadPayload,
  ): Promise<StockUploadResponse> => {
    setUploading(true);
    setUploadError(null);
    try {
      const result = await withNetworkActivity(() => bulkUploadStock(payload));
      await invalidateSWRPrefix(globalMutate, [
        "/swr/inventory",
        "/swr/dashboard",
      ]);
      return result;
    } catch (err) {
      setUploadError(
        err instanceof Error ? err.message : "Stock upload failed",
      );
      throw err;
    } finally {
      setUploading(false);
    }
  };

  const setPage = (p: number) => setFilters((f) => ({ ...f, page: p }));
  const setPageSize = (ps: number) =>
    setFilters((f) => ({ ...f, pageSize: ps, page: 1 }));

  const state: UseInventoryState = {
    items: data?.data ?? [],
    total: data?.total ?? 0,
    maxPages:
      data?.maxPages ??
      Math.max(1, Math.ceil((data?.total ?? 0) / (filters.pageSize ?? 20))),
    loading: isLoading || isValidating,
    uploading,
    error: uploadError || (error instanceof Error ? error.message : null),
  };

  return {
    ...state,
    filters,
    setFilters,
    page: filters.page ?? 1,
    pageSize: filters.pageSize ?? 20,
    setPage,
    setPageSize,
    refetch: load,
    addItem,
    editItem,
    removeItem,
    uploadStock,
  };
}
