"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import {
  createCustomer,
  deleteCustomer,
  fetchCustomerById,
  fetchCustomers,
  updateCustomer,
} from "@/services/customerService";
import type {
  CreateCustomerPayload,
  Customer,
  CustomerFilters,
  UpdateCustomerPayload,
} from "@/types/customer";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";

type UseCustomersState = {
  customers: Customer[];
  total: number;
  loading: boolean;
  error: string | null;
};

export function useCustomers(initialFilters: CustomerFilters = {}) {
  const [filters, setFilters] = useState<CustomerFilters>({
    page: 1,
    pageSize: 20,
    ...initialFilters,
  });
  const { mutate: globalMutate } = useSWRConfig();
  const key = swrKey("/swr/customers", filters as Record<string, unknown>);
  const { data, error, isLoading, isValidating, mutate } = useSWR(key, () =>
    withNetworkActivity(() => fetchCustomers(filters)),
  );

  const load = async () => mutate();

  const addCustomer = async (
    payload: CreateCustomerPayload,
  ): Promise<Customer> => {
    const customer = await withNetworkActivity(() => createCustomer(payload));
    await invalidateSWRPrefix(globalMutate, "/swr/customers");
    return customer;
  };

  const editCustomer = async (
    id: number,
    payload: UpdateCustomerPayload,
  ): Promise<Customer> => {
    const customer = await withNetworkActivity(() =>
      updateCustomer(id, payload),
    );
    await invalidateSWRPrefix(globalMutate, "/swr/customers");
    return customer;
  };

  const removeCustomer = async (id: number): Promise<void> => {
    await withNetworkActivity(() => deleteCustomer(id));
    await invalidateSWRPrefix(globalMutate, "/swr/customers");
  };

  const getById = (id: number) => fetchCustomerById(id);

  const state: UseCustomersState = {
    customers: data?.data ?? [],
    total: data?.total ?? 0,
    loading: isLoading || isValidating,
    error: error instanceof Error ? error.message : null,
  };

  return {
    ...state,
    filters,
    setFilters,
    setPage: (p: number) => setFilters((f) => ({ ...f, page: p })),
    setPageSize: (s: number) =>
      setFilters((f) => ({ ...f, pageSize: s, page: 1 })),
    nextPage: () => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 })),
    prevPage: () =>
      setFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) })),
    refetch: load,
    addCustomer,
    editCustomer,
    removeCustomer,
    getById,
  };
}
