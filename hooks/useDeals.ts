"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import {
  createDeal,
  deleteDeal,
  fetchDealById,
  fetchDeals,
  updateDeal,
} from "@/services/dealService";
import type {
  CreateDealPayload,
  Deal,
  DealFilters,
  UpdateDealPayload,
} from "@/types/deal";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";

type UseDealsState = {
  deals: Deal[];
  total: number;
  loading: boolean;
  error: string | null;
};

export function useDeals(initialFilters: DealFilters = {}) {
  const [filters, setFilters] = useState<DealFilters>(initialFilters);
  const { mutate: globalMutate } = useSWRConfig();
  const key = swrKey("/swr/deals", filters as Record<string, unknown>);
  const { data, error, isLoading, isValidating, mutate } = useSWR(key, () =>
    withNetworkActivity(() => fetchDeals(filters)),
  );

  const load = async () => mutate();

  const addDeal = async (payload: CreateDealPayload): Promise<Deal> => {
    const deal = await withNetworkActivity(() => createDeal(payload));
    await invalidateSWRPrefix(globalMutate, "/swr/deals");
    return deal;
  };

  const editDeal = async (
    id: number,
    payload: UpdateDealPayload,
  ): Promise<Deal> => {
    const deal = await withNetworkActivity(() => updateDeal(id, payload));
    await invalidateSWRPrefix(globalMutate, "/swr/deals");
    return deal;
  };

  const removeDeal = async (id: number): Promise<void> => {
    await withNetworkActivity(() => deleteDeal(id));
    await invalidateSWRPrefix(globalMutate, "/swr/deals");
  };

  const getById = (id: number) => fetchDealById(id);

  const state: UseDealsState = {
    deals: data?.data ?? [],
    total: data?.total ?? 0,
    loading: isLoading || isValidating,
    error: error instanceof Error ? error.message : null,
  };

  return {
    ...state,
    filters,
    setFilters,
    refetch: load,
    addDeal,
    editDeal,
    removeDeal,
    getById,
  };
}
