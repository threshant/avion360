"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import {
  createClient,
  deleteClient,
  fetchClients,
  updateClient,
} from "@/services/clientService";
import type {
  Client,
  CreateClientPayload,
  UpdateClientPayload,
} from "@/types/client";
import { useCallback } from "react";
import useSWR, { useSWRConfig } from "swr";

type ClientFilters = {
  search?: string;
  page?: number;
  pageSize?: number;
};

export function useClients(filters: ClientFilters = {}, enabled = true) {
  const { mutate: globalMutate } = useSWRConfig();
  const key = enabled ? swrKey("/swr/clients", filters) : null;
  const query = useSWR(key, () =>
    withNetworkActivity(() => fetchClients(filters)),
  );

  const addClient = useCallback(
    async (payload: CreateClientPayload): Promise<Client> => {
      const response = await withNetworkActivity(() => createClient(payload));
      await invalidateSWRPrefix(globalMutate, [
        "/swr/clients",
        "/swr/customers",
      ]);
      return response.data;
    },
    [globalMutate],
  );

  const editClient = useCallback(
    async (id: string, payload: UpdateClientPayload): Promise<Client> => {
      const response = await withNetworkActivity(() =>
        updateClient(id, payload),
      );
      await invalidateSWRPrefix(globalMutate, [
        "/swr/clients",
        "/swr/customers",
      ]);
      return response.data;
    },
    [globalMutate],
  );

  const removeClient = useCallback(
    async (id: string) => {
      await withNetworkActivity(() => deleteClient(id));
      await invalidateSWRPrefix(globalMutate, [
        "/swr/clients",
        "/swr/customers",
      ]);
    },
    [globalMutate],
  );

  return {
    clients: query.data?.data ?? [],
    total: query.data?.total ?? 0,
    page: query.data?.page ?? filters.page ?? 1,
    pageSize: query.data?.pageSize ?? filters.pageSize ?? 20,
    maxPages: query.data?.maxPages ?? 1,
    loading: query.isLoading || query.isValidating,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.mutate,
    addClient,
    editClient,
    removeClient,
  };
}
