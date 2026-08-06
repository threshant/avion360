"use client";

import { swrKey, withNetworkActivity } from "@/lib/swr-client";
import {
  fetchActivityFeed,
  fetchDashboardData,
} from "@/services/dashboardService";
import type { ActivityFeedItem, DashboardData } from "@/types/dashboard";
import useSWR from "swr";

type UseDashboardState = {
  dashboard: DashboardData | null;
  activityFeed: ActivityFeedItem[];
  loading: boolean;
  error: string | null;
};

export function useDashboard(activityLimit = 20) {
  const dashboardKey = "/swr/dashboard/main";
  const feedKey = swrKey("/swr/dashboard/activity", { activityLimit });

  const dashboardQuery = useSWR(dashboardKey, () =>
    withNetworkActivity(() => fetchDashboardData()),
  );
  const feedQuery = useSWR(feedKey, () =>
    withNetworkActivity(() => fetchActivityFeed(activityLimit)),
  );

  const load = async () => {
    await Promise.all([dashboardQuery.mutate(), feedQuery.mutate()]);
  };

  const state: UseDashboardState = {
    dashboard: (dashboardQuery.data as DashboardData | undefined) ?? null,
    activityFeed: (feedQuery.data as ActivityFeedItem[] | undefined) ?? [],
    loading:
      dashboardQuery.isLoading ||
      dashboardQuery.isValidating ||
      feedQuery.isLoading ||
      feedQuery.isValidating,
    error:
      (dashboardQuery.error instanceof Error && dashboardQuery.error.message) ||
      (feedQuery.error instanceof Error && feedQuery.error.message) ||
      null,
  };

  return {
    ...state,
    refetch: load,
  };
}
