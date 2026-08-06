"use client";

import { swrKey, withNetworkActivity } from "@/lib/swr-client";
import { api } from "@/services/apiClient";
import useSWR from "swr";

type ReportsAnalyticsResponse = {
  months: string[];
  revenue: number[];
  leads: number[];
};

type ReportsListResponse = {
  data: Array<{
    id: string;
    title: string;
    created_at: string;
    category: string;
  }>;
  total: number;
};

export function useReportsAnalytics(page: number, pageSize: number) {
  const analyticsQuery = useSWR("/swr/reports/analytics", () =>
    withNetworkActivity(() =>
      api.get<ReportsAnalyticsResponse>("/api/reports/analytics"),
    ),
  );

  const listKey = swrKey("/swr/reports/list", { page, pageSize });
  const listQuery = useSWR(listKey, () =>
    withNetworkActivity(() =>
      api.get<ReportsListResponse>(
        `/api/reports/list?page=${page}&pageSize=${pageSize}`,
      ),
    ),
  );

  const refetch = async () => {
    await Promise.all([analyticsQuery.mutate(), listQuery.mutate()]);
  };

  return {
    analytics: analyticsQuery.data ?? null,
    recentReports: listQuery.data?.data ?? [],
    totalReportsCount: listQuery.data?.total ?? 0,
    isLoading:
      analyticsQuery.isLoading ||
      analyticsQuery.isValidating ||
      listQuery.isLoading ||
      listQuery.isValidating,
    error:
      (analyticsQuery.error instanceof Error && analyticsQuery.error.message) ||
      (listQuery.error instanceof Error && listQuery.error.message) ||
      null,
    refetch,
  };
}
