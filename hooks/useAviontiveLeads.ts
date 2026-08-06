"use client";

import { swrKey, withNetworkActivity } from "@/lib/swr-client";
import { useCallback } from "react";
import useSWR from "swr";

type UseAviontiveLeadsState = {
  leads: any[];
  total: number;
  loading: boolean;
  error: string | null;
};

export function useAviontiveLeads(
  _pipelineId?: string,
  opts?: { page?: number; pageSize?: number },
) {
  const page = opts?.page ?? 1;
  const pageSize = opts?.pageSize ?? 20;

  const key = swrKey("/swr/aviontive-leads", { page, pageSize });
  const { data, error, isLoading, isValidating, mutate } = useSWR(key, () =>
    withNetworkActivity(async () => {
      const response = await fetch(
        `/api/leads?page=${page}&pageSize=${pageSize}`,
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch leads: ${response.status}`);
      }
      return response.json();
    }),
  );

  const load = async () => mutate();

  const getById = useCallback(async (id: string) => {
    const result = await withNetworkActivity(async () => {
      const response = await fetch(`/api/leads?id=${id}`);
      if (!response.ok) {
        throw new Error(`Failed to fetch lead: ${response.status}`);
      }
      return response.json();
    });
    return result.data;
  }, []);

  const state: UseAviontiveLeadsState = {
    leads: data?.data ?? [],
    total: data?.total ?? 0,
    loading: isLoading || isValidating,
    error: error instanceof Error ? error.message : null,
  };

  return {
    ...state,
    page,
    pageSize,
    refetch: load,
    getById,
  };
}
