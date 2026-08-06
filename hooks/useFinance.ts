"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import {
  createTransaction,
  deleteTransaction,
  fetchFinanceSummary,
  fetchTransactions,
  updateTransaction,
} from "@/services/financeService";
import type {
  CreateTransactionPayload,
  FinanceSummary,
  Transaction,
  TransactionFilters,
  UpdateTransactionPayload,
} from "@/types/finance";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";

type UseFinanceState = {
  transactions: Transaction[];
  total: number;
  summary: FinanceSummary | null;
  loading: boolean;
  error: string | null;
};

export function useFinance(
  initialFilters: TransactionFilters = {},
  period = "this_month",
) {
  const [filters, setFilters] = useState<TransactionFilters>(initialFilters);
  const { mutate: globalMutate } = useSWRConfig();

  const listKey = swrKey(
    "/swr/finance/transactions",
    filters as Record<string, unknown>,
  );
  const summaryKey = swrKey("/swr/finance/summary", { period });

  const listQuery = useSWR(listKey, () =>
    withNetworkActivity(() => fetchTransactions(filters)),
  );
  const summaryQuery = useSWR(summaryKey, () =>
    withNetworkActivity(() => fetchFinanceSummary(period)),
  );

  const load = async () => {
    await Promise.all([listQuery.mutate(), summaryQuery.mutate()]);
  };

  const addTransaction = async (
    payload: CreateTransactionPayload,
  ): Promise<Transaction> => {
    const tx = await withNetworkActivity(() => createTransaction(payload));
    await invalidateSWRPrefix(globalMutate, ["/swr/finance", "/swr/dashboard"]);
    return tx;
  };

  const editTransaction = async (
    id: string,
    payload: UpdateTransactionPayload,
  ): Promise<Transaction> => {
    const tx = await withNetworkActivity(() => updateTransaction(id, payload));
    await invalidateSWRPrefix(globalMutate, ["/swr/finance", "/swr/dashboard"]);
    return tx;
  };

  const removeTransaction = async (id: string): Promise<void> => {
    await withNetworkActivity(() => deleteTransaction(id));
    await invalidateSWRPrefix(globalMutate, ["/swr/finance", "/swr/dashboard"]);
  };

  const setPage = (p: number) => setFilters((f) => ({ ...f, page: p }));
  const setPageSize = (ps: number) =>
    setFilters((f) => ({ ...f, pageSize: ps, page: 1 }));

  const state: UseFinanceState = {
    transactions: listQuery.data?.data ?? [],
    total: listQuery.data?.total ?? 0,
    summary: (summaryQuery.data as FinanceSummary | undefined) ?? null,
    loading:
      listQuery.isLoading ||
      listQuery.isValidating ||
      summaryQuery.isLoading ||
      summaryQuery.isValidating,
    error:
      (listQuery.error instanceof Error && listQuery.error.message) ||
      (summaryQuery.error instanceof Error && summaryQuery.error.message) ||
      null,
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
    addTransaction,
    editTransaction,
    removeTransaction,
  };
}
