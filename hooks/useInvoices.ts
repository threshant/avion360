"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import {
  convertQuotationToInvoice,
  createInvoice,
  createQuotation,
  deleteInvoice,
  deleteQuotation,
  fetchInvoices,
  fetchQuotations,
  updateInvoice,
  updateQuotation,
} from "@/services/invoiceService";
import type {
  CreateInvoicePayload,
  CreateQuotationPayload,
  Invoice,
  InvoiceFilters,
  Quotation,
  QuotationFilters,
  UpdateInvoicePayload,
  UpdateQuotationPayload,
} from "@/types/invoice";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";

type UseInvoicesState = {
  invoices: Invoice[];
  invoiceTotal: number;
  quotations: Quotation[];
  quotationTotal: number;
  loading: boolean;
  error: string | null;
};

export function useInvoices(
  invoiceFilters: InvoiceFilters = {},
  quotationFilters: QuotationFilters = {},
) {
  const [iFilters, setIFilters] = useState<InvoiceFilters>(invoiceFilters);
  const [qFilters, setQFilters] = useState<QuotationFilters>(quotationFilters);
  const { mutate: globalMutate } = useSWRConfig();

  const invoicesKey = swrKey(
    "/swr/invoices",
    iFilters as Record<string, unknown>,
  );
  const quotationsKey = swrKey(
    "/swr/quotations",
    qFilters as Record<string, unknown>,
  );

  const invoicesQuery = useSWR(invoicesKey, () =>
    withNetworkActivity(() => fetchInvoices(iFilters)),
  );
  const quotationsQuery = useSWR(quotationsKey, () =>
    withNetworkActivity(() => fetchQuotations(qFilters)),
  );

  const load = async () => {
    await Promise.all([invoicesQuery.mutate(), quotationsQuery.mutate()]);
  };

  // Invoice mutations
  const addInvoice = async (
    payload: CreateInvoicePayload,
  ): Promise<Invoice> => {
    const inv = await withNetworkActivity(() => createInvoice(payload));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoices",
      "/swr/quotations",
      "/swr/dashboard",
    ]);
    return inv;
  };

  const editInvoice = async (
    id: string,
    payload: UpdateInvoicePayload,
  ): Promise<Invoice> => {
    const inv = await withNetworkActivity(() => updateInvoice(id, payload));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoices",
      "/swr/quotations",
      "/swr/dashboard",
    ]);
    return inv;
  };

  const removeInvoice = async (id: string): Promise<void> => {
    await withNetworkActivity(() => deleteInvoice(id));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoices",
      "/swr/quotations",
      "/swr/dashboard",
    ]);
  };

  // Quotation mutations
  const addQuotation = async (
    payload: CreateQuotationPayload,
  ): Promise<Quotation> => {
    const quot = await withNetworkActivity(() => createQuotation(payload));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoices",
      "/swr/quotations",
      "/swr/dashboard",
    ]);
    return quot;
  };

  const editQuotation = async (
    id: string,
    payload: UpdateQuotationPayload,
  ): Promise<Quotation> => {
    const quot = await withNetworkActivity(() => updateQuotation(id, payload));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoices",
      "/swr/quotations",
      "/swr/dashboard",
    ]);
    return quot;
  };

  const removeQuotation = async (id: string): Promise<void> => {
    await withNetworkActivity(() => deleteQuotation(id));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoices",
      "/swr/quotations",
      "/swr/dashboard",
    ]);
  };

  const promoteToInvoice = async (quotationId: string): Promise<Invoice> => {
    const inv = await withNetworkActivity(() =>
      convertQuotationToInvoice(quotationId),
    );
    await invalidateSWRPrefix(globalMutate, [
      "/swr/invoices",
      "/swr/quotations",
      "/swr/dashboard",
    ]);
    return inv;
  };

  const state: UseInvoicesState = {
    invoices: invoicesQuery.data?.data ?? [],
    invoiceTotal: invoicesQuery.data?.total ?? 0,
    quotations: quotationsQuery.data?.data ?? [],
    quotationTotal: quotationsQuery.data?.total ?? 0,
    loading:
      invoicesQuery.isLoading ||
      invoicesQuery.isValidating ||
      quotationsQuery.isLoading ||
      quotationsQuery.isValidating,
    error:
      (invoicesQuery.error instanceof Error && invoicesQuery.error.message) ||
      (quotationsQuery.error instanceof Error &&
        quotationsQuery.error.message) ||
      null,
  };

  return {
    ...state,
    invoiceFilters: iFilters,
    setInvoiceFilters: setIFilters,
    quotationFilters: qFilters,
    setQuotationFilters: setQFilters,
    refetch: load,
    addInvoice,
    editInvoice,
    removeInvoice,
    addQuotation,
    editQuotation,
    removeQuotation,
    promoteToInvoice,
  };
}
