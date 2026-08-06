"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import { api } from "@/services/apiClient";
import { createClient, fetchClients } from "@/services/clientService";
import { createQuotation, deleteQuotation, fetchQuotations } from "@/services/invoiceService";
import type { CreateClientPayload } from "@/types/client";
import type {
  CreateQuotationPayload,
  InvoiceItem,
  ProformaInvoice,
  QuotationStatus,
} from "@/types/invoice";
import useSWR, { useSWRConfig } from "swr";

export function useQuotationsPageData(filter: "all" | QuotationStatus) {
  const { mutate: globalMutate } = useSWRConfig();

  const clientsQuery = useSWR("/swr/quotations-page/clients", () =>
    withNetworkActivity(() => fetchClients({ pageSize: 1000 })),
  );

  const quotationsKey = swrKey("/swr/quotations-page/list", {
    filter,
    pageSize: 100,
  });
  const quotationsQuery = useSWR(quotationsKey, () =>
    withNetworkActivity(() =>
      fetchQuotations({
        pageSize: 100,
        ...(filter !== "all" ? { status: filter } : {}),
      }),
    ),
  );

  const addClient = async (payload: CreateClientPayload) => {
    const created = await withNetworkActivity(() => createClient(payload));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/quotations-page",
      "/swr/customers-page",
      "/swr/invoices",
    ]);
    return created.data;
  };

  const addQuotation = async (payload: CreateQuotationPayload) => {
    const quotation = await withNetworkActivity(() => createQuotation(payload));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/quotations-page",
      "/swr/quotations",
      "/swr/invoices",
      "/swr/dashboard",
    ]);
    return quotation;
  };

  const removeQuotation = async (id: string) => {
    await withNetworkActivity(() => deleteQuotation(id));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/quotations-page",
      "/swr/quotations",
      "/swr/invoices",
      "/swr/dashboard",
    ]);
  };

  const updateQuotationStatus = async (
    id: string,
    status: QuotationStatus,
  ) => {
    await withNetworkActivity(() =>
      api.patch(`/api/quotations/${id}`, { status }),
    );
    await invalidateSWRPrefix(globalMutate, [
      "/swr/quotations-page",
      "/swr/quotations",
      "/swr/invoices",
      "/swr/dashboard",
    ]);
  };

  const raiseProforma = async (payload: {
    clientId: string;
    date: string;
    status: "Draft";
    subtotal: number;
    gstRate: number;
    quotationId: string;
    items: InvoiceItem[];
  }) => {
    const created = await withNetworkActivity(() =>
      api.post<{ data: ProformaInvoice }>("/api/proforma-invoices", payload),
    );
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoicing-page",
      "/swr/invoices",
      "/swr/dashboard",
      "/swr/quotations-page",
      "/swr/quotations",
    ]);
    return created.data;
  };

  const refresh = async () => {
    await Promise.all([clientsQuery.mutate(), quotationsQuery.mutate()]);
  };

  return {
    clients: clientsQuery.data?.data ?? [],
    quotations: quotationsQuery.data?.data ?? [],
    loading:
      clientsQuery.isLoading ||
      clientsQuery.isValidating ||
      quotationsQuery.isLoading ||
      quotationsQuery.isValidating,
    addClient,
    addQuotation,
    removeQuotation,
    updateQuotationStatus,
    raiseProforma,
    refresh,
  };
}
