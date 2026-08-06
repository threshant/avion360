"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import {
  createClient,
  fetchClients,
  updateClient,
} from "@/services/clientService";
import { fetchInvoices } from "@/services/invoiceService";
import type { CreateClientPayload, UpdateClientPayload } from "@/types/client";
import useSWR, { useSWRConfig } from "swr";

export function useCustomersPageData(
  search: string,
  page: number,
  pageSize: number,
) {
  const { mutate: globalMutate } = useSWRConfig();

  const clientsKey = swrKey("/swr/customers-page/clients", {
    search,
    page,
    pageSize,
  });

  const clientsQuery = useSWR(clientsKey, () =>
    withNetworkActivity(() => fetchClients({ search, page, pageSize })),
  );
  const invoicesQuery = useSWR("/swr/customers-page/invoices", () =>
    withNetworkActivity(() => fetchInvoices({ pageSize: 50 })),
  );

  const createClientRecord = async (payload: CreateClientPayload) => {
    const response = await withNetworkActivity(() => createClient(payload));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/customers",
      "/swr/customers-page",
      "/swr/invoices",
      "/swr/dashboard",
    ]);
    return response.data;
  };

  const updateClientRecord = async (
    id: string,
    payload: UpdateClientPayload,
  ) => {
    const response = await withNetworkActivity(() => updateClient(id, payload));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/customers",
      "/swr/customers-page",
      "/swr/invoices",
      "/swr/dashboard",
    ]);
    return response.data;
  };

  const refresh = async () => {
    await Promise.all([clientsQuery.mutate(), invoicesQuery.mutate()]);
  };

  return {
    clients: clientsQuery.data?.data ?? [],
    totalClientsCount: clientsQuery.data?.total ?? 0,
    maxPages:
      clientsQuery.data?.maxPages ??
      Math.max(1, Math.ceil((clientsQuery.data?.total ?? 0) / pageSize)),
    invoices: invoicesQuery.data?.data ?? [],
    isLoading:
      clientsQuery.isLoading ||
      clientsQuery.isValidating ||
      invoicesQuery.isLoading ||
      invoicesQuery.isValidating,
    error:
      (clientsQuery.error instanceof Error && clientsQuery.error.message) ||
      (invoicesQuery.error instanceof Error && invoicesQuery.error.message) ||
      null,
    createClientRecord,
    updateClientRecord,
    refresh,
  };
}
