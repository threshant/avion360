"use client";

import { swrKey, withNetworkActivity } from "@/lib/swr-client";
import { fetchTelecmiCallInsights } from "@/services/callService";
import type {
  TelecmiCallInsightsFilters,
  TelecmiCallInsightsResponse,
} from "@/types/call";
import useSWR from "swr";

export function useTelecmiCallInsights(filters: TelecmiCallInsightsFilters) {
  const key = swrKey(
    "/swr/telecmi/call-insights",
    filters as Record<string, unknown>,
  );

  const query = useSWR(key, async () => {
    return withNetworkActivity(() => fetchTelecmiCallInsights(filters));
  });

  return {
    data: (query.data as TelecmiCallInsightsResponse | undefined) ?? null,
    loading: query.isLoading || query.isValidating,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.mutate,
  };
}
