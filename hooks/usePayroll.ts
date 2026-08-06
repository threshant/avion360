"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import {
  fetchPayroll,
  fetchPayrollSummary,
  processPayroll,
  updatePayrollRecord,
} from "@/services/payrollService";
import type {
  PayrollFilters,
  PayrollRecord,
  PayrollSummary,
  UpdatePayrollPayload,
} from "@/types/payroll";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";

type UsePayrollState = {
  records: PayrollRecord[];
  total: number;
  summary: PayrollSummary | null;
  loading: boolean;
  processing: boolean;
  error: string | null;
};

export function usePayroll(
  initialFilters: PayrollFilters = {},
  month?: string,
) {
  const [filters, setFilters] = useState<PayrollFilters>(initialFilters);
  const [processing, setProcessing] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const { mutate: globalMutate } = useSWRConfig();

  const currentMonth = month ?? new Date().toISOString().substring(0, 7); // "YYYY-MM"

  const effectiveMonth = filters.month ?? currentMonth;
  const listKey = swrKey("/swr/payroll", {
    ...(filters as Record<string, unknown>),
    month: effectiveMonth,
  });
  const summaryKey = swrKey("/swr/payroll/summary", { month: effectiveMonth });

  const listQuery = useSWR(listKey, () =>
    withNetworkActivity(() =>
      fetchPayroll({ ...filters, month: effectiveMonth }),
    ),
  );
  const summaryQuery = useSWR(summaryKey, () =>
    withNetworkActivity(() => fetchPayrollSummary(effectiveMonth)),
  );

  const load = async () => {
    await Promise.all([listQuery.mutate(), summaryQuery.mutate()]);
  };

  const editRecord = async (
    id: string,
    payload: UpdatePayrollPayload,
  ): Promise<PayrollRecord> => {
    const record = await withNetworkActivity(() =>
      updatePayrollRecord(id, payload),
    );
    await invalidateSWRPrefix(globalMutate, ["/swr/payroll", "/swr/dashboard"]);
    return record;
  };

  const runPayroll = async (targetMonth: string): Promise<void> => {
    setProcessing(true);
    setMutationError(null);
    try {
      await withNetworkActivity(() => processPayroll(targetMonth));
      await invalidateSWRPrefix(globalMutate, [
        "/swr/payroll",
        "/swr/dashboard",
      ]);
    } catch (err) {
      setMutationError(
        err instanceof Error ? err.message : "Payroll processing failed",
      );
      throw err;
    } finally {
      setProcessing(false);
    }
  };

  const state: UsePayrollState = {
    records: listQuery.data?.data ?? [],
    total: listQuery.data?.total ?? 0,
    summary: (summaryQuery.data as PayrollSummary | undefined) ?? null,
    loading:
      listQuery.isLoading ||
      listQuery.isValidating ||
      summaryQuery.isLoading ||
      summaryQuery.isValidating,
    processing,
    error:
      mutationError ||
      (listQuery.error instanceof Error && listQuery.error.message) ||
      (summaryQuery.error instanceof Error && summaryQuery.error.message) ||
      null,
  };

  return {
    ...state,
    filters,
    setFilters,
    refetch: load,
    editRecord,
    runPayroll,
  };
}
