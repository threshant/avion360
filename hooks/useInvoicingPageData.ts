"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import { api } from "@/services/apiClient";
import {
  createClient,
  fetchClients,
  updateClient,
} from "@/services/clientService";
import {
  deleteInvoice,
  deleteProformaInvoice,
  deleteQuotation,
  fetchInvoices,
  fetchQuotations,
  updateQuotation,
} from "@/services/invoiceService";
import type { CreateClientPayload, UpdateClientPayload } from "@/types/client";
import type {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
  ProformaInvoice,
  ProformaListResponse,
  ProformaStatus,
  Quotation,
  QuotationStatus,
} from "@/types/invoice";
import useSWR, { useSWRConfig } from "swr";

type RaiseProformaPayload = {
  clientId?: string;
  date: string;
  status: "Draft" | "Sent";
  quotationId: string;
  subtotal: number;
  items: InvoiceItem[];
};

export type InvoicingCreateInvoicePayload = {
  client?: string;
  clientId?: string;
  invoiceNumberMode?: "auto" | "manual";
  manualInvoiceId?: string;
  invoiceSeries?: {
    prefix?: string;
    suffix?: string;
    start?: number;
    padding?: number;
  };
  date: string;
  dueDate?: string;
  gstRate: number;
  discountPercentage: number;
  tdsRate: number;
  tcsRate: number;
  status: InvoiceStatus;
  items: InvoiceItem[];
  notes?: string;
  shippingAddress?: string;
  currency?: string;
  taxType?: string;
  signatoryName?: string;
};

export type InvoicingCreateQuotationPayload = {
  clientId: string;
  date: string;
  validUntil: string;
  gstRate: number;
  status: QuotationStatus;
  items: InvoiceItem[];
  notes?: string;
  shippingAddress?: string;
};

export function useInvoicingPageData() {
  const { mutate: globalMutate } = useSWRConfig();

  const invoicesQuery = useSWR(
    swrKey("/swr/invoicing-page/invoices", { pageSize: 50 }),
    () => withNetworkActivity(() => fetchInvoices({ pageSize: 50 })),
  );

  const quotationsQuery = useSWR(
    swrKey("/swr/invoicing-page/quotations", { pageSize: 50 }),
    () => withNetworkActivity(() => fetchQuotations({ pageSize: 50 })),
  );

  const proformaQuery = useSWR(
    swrKey("/swr/invoicing-page/proforma", { pageSize: 50 }),
    () =>
      withNetworkActivity(() =>
        api.get<ProformaListResponse>("/api/proforma-invoices?pageSize=50"),
      ),
  );

  const clientsQuery = useSWR(
    swrKey("/swr/invoicing-page/clients", { pageSize: 50 }),
    () => withNetworkActivity(() => fetchClients({ pageSize: 50 })),
  );

  const addClient = async (payload: CreateClientPayload) => {
    const created = await withNetworkActivity(() => createClient(payload));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoicing-page",
      "/swr/customers-page",
      "/swr/quotations-page",
    ]);
    return created.data;
  };

  const editClient = async (id: string, payload: UpdateClientPayload) => {
    const updated = await withNetworkActivity(() => updateClient(id, payload));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoicing-page",
      "/swr/customers-page",
      "/swr/quotations-page",
    ]);
    return updated.data;
  };

  const addInvoice = async (payload: InvoicingCreateInvoicePayload) => {
    const created = await withNetworkActivity(() =>
      api.post<{ data: Invoice }>("/api/invoices", payload),
    );
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoicing-page",
      "/swr/invoices",
      "/swr/dashboard",
      "/swr/financial-reports",
    ]);
    return created.data;
  };

  const addQuotation = async (payload: InvoicingCreateQuotationPayload) => {
    const created = await withNetworkActivity(() =>
      api.post<{ data: Quotation }>("/api/quotations", payload),
    );
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoicing-page",
      "/swr/quotations",
      "/swr/dashboard",
    ]);
    return created.data;
  };

  const editQuotation = async (
    id: string,
    payload: Partial<InvoicingCreateQuotationPayload>,
  ) => {
    const updated = await withNetworkActivity(() =>
      updateQuotation(id, payload),
    );
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoicing-page",
      "/swr/quotations",
      "/swr/dashboard",
    ]);
    return updated;
  };

  const raiseProforma = async (payload: RaiseProformaPayload) => {
    const created = await withNetworkActivity(() =>
      api.post<{ data: ProformaInvoice }>("/api/proforma-invoices", payload),
    );
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoicing-page",
      "/swr/invoices",
      "/swr/dashboard",
    ]);
    return created.data;
  };

  const convertProformaToInvoice = async (proformaId: string) => {
    const converted = await withNetworkActivity(() =>
      api.post<{ data: Invoice }>(
        `/api/proforma-invoices/${proformaId}/convert`,
        {},
      ),
    );
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoicing-page",
      "/swr/invoices",
      "/swr/dashboard",
    ]);
    return converted.data;
  };

  const editProforma = async (
    id: string,
    payload: {
      status?: ProformaStatus;
      validUntil?: string;
      notes?: string;
      date?: string;
      shippingAddress?: string;
    },
  ) => {
    const updated = await withNetworkActivity(() =>
      api.patch<{ data: ProformaInvoice }>(
        `/api/proforma-invoices/${id}`,
        payload,
      ),
    );
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoicing-page",
      "/swr/invoices",
      "/swr/dashboard",
    ]);
    return updated.data;
  };

  const getInvoiceById = async (invoiceId: string) => {
    const response = await withNetworkActivity(() =>
      api.get<{ data: Invoice }>(`/api/invoices/${invoiceId}`),
    );
    return response.data;
  };

  const removeInvoice = async (id: string) => {
    await withNetworkActivity(() => deleteInvoice(id));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoicing-page",
      "/swr/invoices",
      "/swr/dashboard",
      "/swr/financial-reports",
    ]);
  };

  const removeQuotation = async (id: string) => {
    await withNetworkActivity(() => deleteQuotation(id));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoicing-page",
      "/swr/quotations",
      "/swr/dashboard",
    ]);
  };

  const removeProforma = async (id: string) => {
    await withNetworkActivity(() => deleteProformaInvoice(id));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoicing-page",
      "/swr/invoices",
      "/swr/dashboard",
    ]);
  };

  const updateInvoice = async (
    id: string,
    payload: Partial<InvoicingCreateInvoicePayload>,
  ) => {
    const updated = await withNetworkActivity(() =>
      api.patch<{ data: Invoice }>(`/api/invoices/${id}`, payload),
    );
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoicing-page",
      "/swr/invoices",
      "/swr/dashboard",
      "/swr/financial-reports",
    ]);
    return updated.data;
  };

  const refresh = async () => {
    await Promise.all([
      invoicesQuery.mutate(),
      quotationsQuery.mutate(),
      proformaQuery.mutate(),
      clientsQuery.mutate(),
    ]);
  };

  return {
    invoices: invoicesQuery.data?.data ?? [],
    quotations: quotationsQuery.data?.data ?? [],
    proformaInvoices: proformaQuery.data?.data ?? [],
    clients: clientsQuery.data?.data ?? [],
    loading:
      invoicesQuery.isLoading ||
      invoicesQuery.isValidating ||
      quotationsQuery.isLoading ||
      quotationsQuery.isValidating ||
      proformaQuery.isLoading ||
      proformaQuery.isValidating ||
      clientsQuery.isLoading ||
      clientsQuery.isValidating,
    addClient,
    editClient,
    addInvoice,
    updateInvoice,
    addQuotation,
    editQuotation,
    raiseProforma,
    editProforma,
    convertProformaToInvoice,
    getInvoiceById,
    removeInvoice,
    removeQuotation,
    removeProforma,
    refresh,
  };
}
