"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import { api } from "@/services/apiClient";
import useSWR, { useSWRConfig } from "swr";

export type BankAccountPayload = {
  accountName: string;
  bankName: string;
  accountNumber: string;
  ifscCode?: string;
  accountType: string;
  openingBalance: number;
};

export type StatementEntryPayload = {
  date: string;
  description?: string | null;
  debit: number;
  credit: number;
  referenceNo?: string | null;
};

export function useBankReconciliationData(
  selectedAccountId: string,
  filter: "all" | "unreconciled" | "reconciled",
) {
  const { mutate: globalMutate } = useSWRConfig();

  const accountsQuery = useSWR("/swr/bank/accounts", () =>
    withNetworkActivity(() =>
      api.get<{ data?: Record<string, unknown>[] }>("/api/bank-accounts"),
    ),
  );

  const statementsKey = selectedAccountId
    ? swrKey("/swr/bank/statements", { selectedAccountId, filter })
    : null;
  const statementsQuery = useSWR(statementsKey, () =>
    withNetworkActivity(async () => {
      const params = new URLSearchParams({
        bankAccountId: selectedAccountId,
        pageSize: "100",
      });
      if (filter !== "all") {
        params.set("reconciled", filter === "reconciled" ? "true" : "false");
      }
      return api.get<{ data?: Record<string, unknown>[] }>(
        `/api/bank-statements?${params.toString()}`,
      );
    }),
  );

  const transactionsQuery = useSWR("/swr/bank/system-transactions", () =>
    withNetworkActivity(() =>
      api.get<{ data?: Record<string, unknown>[] }>(
        "/api/finance/transactions?pageSize=200",
      ),
    ),
  );

  const refresh = async () => {
    await Promise.all([
      accountsQuery.mutate(),
      statementsQuery.mutate(),
      transactionsQuery.mutate(),
    ]);
  };

  const createBankAccount = async (payload: BankAccountPayload) => {
    await withNetworkActivity(() => api.post("/api/bank-accounts", payload));
    await invalidateSWRPrefix(globalMutate, "/swr/bank");
  };

  const importStatements = async (
    bankAccountId: string,
    entries: StatementEntryPayload[],
  ) => {
    await withNetworkActivity(() =>
      api.post("/api/bank-statements", { bankAccountId, entries }),
    );
    await invalidateSWRPrefix(globalMutate, "/swr/bank");
  };

  const reconcile = async (statementId: string, transactionId: string) => {
    await withNetworkActivity(() =>
      api.post(`/api/bank-statements/${statementId}/reconcile`, {
        transactionId,
      }),
    );
    await invalidateSWRPrefix(globalMutate, "/swr/bank");
  };

  const unreconcile = async (statementId: string) => {
    await withNetworkActivity(() =>
      api.delete(`/api/bank-statements/${statementId}/reconcile`),
    );
    await invalidateSWRPrefix(globalMutate, "/swr/bank");
  };

  const bankAccounts = (accountsQuery.data?.data ?? []).map((a) => ({
    id: a.id as string,
    accountName: a.account_name as string,
    bankName: a.bank_name as string,
    accountNumber: a.account_number as string,
    accountType: a.account_type as string,
    openingBalance: Number(a.opening_balance ?? 0),
  }));

  const statements = (statementsQuery.data?.data ?? []).map((s) => ({
    id: s.id as string,
    bankAccountId: s.bank_account_id as string,
    date: s.date as string,
    description: (s.description as string) ?? undefined,
    debit: Number(s.debit ?? 0),
    credit: Number(s.credit ?? 0),
    balance: s.balance !== null ? Number(s.balance) : undefined,
    referenceNo: (s.reference_no as string) ?? undefined,
    transactionId: (s.transaction_id as string) ?? undefined,
    isReconciled: Boolean(s.is_reconciled),
  }));

  const transactions = (transactionsQuery.data?.data ?? []).map((t) => ({
    id: t.id as string,
    type: t.type as string,
    party: t.party as string,
    amount: Number(t.amount ?? 0),
    date: t.date as string,
    status: t.status as string,
    details: t.details as string,
  }));

  return {
    bankAccounts,
    statements,
    transactions,
    isLoading:
      accountsQuery.isLoading ||
      accountsQuery.isValidating ||
      statementsQuery.isLoading ||
      statementsQuery.isValidating ||
      transactionsQuery.isLoading ||
      transactionsQuery.isValidating,
    error:
      (accountsQuery.error instanceof Error && accountsQuery.error.message) ||
      (statementsQuery.error instanceof Error &&
        statementsQuery.error.message) ||
      (transactionsQuery.error instanceof Error &&
        transactionsQuery.error.message) ||
      null,
    refresh,
    createBankAccount,
    importStatements,
    reconcile,
    unreconcile,
  };
}
