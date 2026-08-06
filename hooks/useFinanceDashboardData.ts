"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import { api } from "@/services/apiClient";
import useSWR, { useSWRConfig } from "swr";

type FinanceFilters = {
  selectedMonth: string;
  selectedType: string;
  activeTab: "All Transactions" | "Income" | "Expenses" | "Commissions";
  page: number;
  pageSize: number;
};

export function useFinanceDashboardData(filters: FinanceFilters) {
  const { mutate: globalMutate } = useSWRConfig();

  const key = swrKey(
    "/swr/finance/dashboard",
    filters as Record<string, unknown>,
  );

  const query = useSWR(key, async () =>
    withNetworkActivity(async () => {
      const params = new URLSearchParams();
      if (filters.selectedMonth !== "All Months") {
        params.set("month", filters.selectedMonth);
      }
      if (filters.selectedType !== "All Types") {
        params.set("type", filters.selectedType);
      }
      if (filters.activeTab === "Income") params.set("type", "Income");
      if (filters.activeTab === "Expenses") params.set("type", "Expense");
      if (filters.activeTab === "Commissions") params.set("type", "Commission");
      params.set("page", String(filters.page));
      params.set("pageSize", String(filters.pageSize));

      const [transactions, summary, creditFlow] = await Promise.all([
        api.get<{ data?: unknown[]; total?: number; maxPages?: number }>(
          `/api/finance/transactions?${params.toString()}`,
        ),
        api.get<Record<string, unknown>>("/api/finance/summary"),
        api.get<{ enabled?: boolean }>("/api/settings/credit-flow"),
      ]);

      return {
        transactions: transactions.data ?? [],
        total: transactions.total ?? 0,
        maxPages:
          (transactions.maxPages ??
            Math.ceil((transactions.total ?? 0) / filters.pageSize)) ||
          1,
        summary,
        creditEnabled: creditFlow.enabled ?? true,
      };
    }),
  );

  const addCashBalance = async (payload: {
    amount: number;
    party: string;
    date: string;
    notes: string;
  }) => {
    await withNetworkActivity(() =>
      api.post("/api/finance/transactions", {
        type: "Income",
        party: payload.party || "Cash Deposit",
        amount: payload.amount,
        date: payload.date,
        status: "Completed",
        details: payload.notes || "Manual cash balance entry",
        is_credit: true,
      }),
    );
    await invalidateSWRPrefix(globalMutate, [
      "/swr/finance",
      "/swr/dashboard",
      "/swr/settings",
    ]);
  };

  const deleteAllFinanceData = async () => {
    await withNetworkActivity(() => api.delete("/api/finance/transactions"));
    await invalidateSWRPrefix(globalMutate, [
      "/swr/finance",
      "/swr/dashboard",
      "/swr/settings",
    ]);
  };

  return {
    transactions: query.data?.transactions ?? [],
    totalTransactionsCount: query.data?.total ?? 0,
    maxPages: query.data?.maxPages ?? 1,
    summary: query.data?.summary ?? null,
    creditEnabled: query.data?.creditEnabled ?? true,
    isLoading: query.isLoading || query.isValidating,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.mutate,
    addCashBalance,
    deleteAllFinanceData,
  };
}
