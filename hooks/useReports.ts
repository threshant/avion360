"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import {
  deleteReport,
  fetchReports,
  generateReport,
} from "@/services/reportService";
import type {
  GenerateReportPayload,
  Report,
  ReportFilters,
} from "@/types/report";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";

type UseReportsState = {
  reports: Report[];
  total: number;
  generating: boolean;
  loading: boolean;
  error: string | null;
};

export function useReports(initialFilters: ReportFilters = {}) {
  const [filters, setFilters] = useState<ReportFilters>(initialFilters);
  const [generating, setGenerating] = useState(false);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const { mutate: globalMutate } = useSWRConfig();

  const key = swrKey("/swr/reports", filters as Record<string, unknown>);
  const { data, error, isLoading, isValidating, mutate } = useSWR(key, () =>
    withNetworkActivity(() => fetchReports(filters)),
  );

  const load = async () => mutate();

  const createReport = async (
    payload: GenerateReportPayload,
  ): Promise<Report> => {
    setGenerating(true);
    setMutationError(null);
    try {
      const report = await withNetworkActivity(() => generateReport(payload));
      await invalidateSWRPrefix(globalMutate, [
        "/swr/reports",
        "/swr/dashboard",
      ]);
      return report;
    } catch (err) {
      setMutationError(
        err instanceof Error ? err.message : "Report generation failed",
      );
      throw err;
    } finally {
      setGenerating(false);
    }
  };

  const removeReport = async (id: number): Promise<void> => {
    await withNetworkActivity(() => deleteReport(id));
    await invalidateSWRPrefix(globalMutate, ["/swr/reports", "/swr/dashboard"]);
  };

  const setPage = (p: number) => setFilters((f) => ({ ...f, page: p }));
  const setPageSize = (ps: number) =>
    setFilters((f) => ({ ...f, pageSize: ps, page: 1 }));

  const state: UseReportsState = {
    reports: data?.data ?? [],
    total: data?.total ?? 0,
    generating,
    loading: isLoading || isValidating,
    error: mutationError || (error instanceof Error ? error.message : null),
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
    createReport,
    removeReport,
  };
}
