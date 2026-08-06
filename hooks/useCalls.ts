"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import {
  createCall,
  deleteCall,
  fetchCalls,
  updateCall,
} from "@/services/callService";
import type {
  CallFilters,
  CallRecord,
  CreateCallPayload,
  UpdateCallPayload,
} from "@/types/call";
import { useEffect, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

const LOG_PREFIX = "[Calls]";

type UseCallsState = {
  calls: CallRecord[];
  total: number;
  loading: boolean;
  error: string | null;
};

export function useCalls(initialFilters: CallFilters = {}) {
  const [filters, setFilters] = useState<CallFilters>(initialFilters);
  const { mutate: globalMutate } = useSWRConfig();
  const listKey = swrKey("/swr/calls", filters as Record<string, unknown>);

  const listQuery = useSWR(listKey, async () => {
    console.log(
      `${LOG_PREFIX} Fetching call records from Supabase (/api/calls)...`,
      { filters },
    );
    try {
      const result = await withNetworkActivity(() => fetchCalls(filters));
      if (result.data.length === 0) {
        console.warn(
          `${LOG_PREFIX} No call records in database yet. Waiting for Superfone webhook data.`,
          { total: result.total },
        );
      } else {
        console.log(`${LOG_PREFIX} Call records loaded from Supabase:`, {
          count: result.data.length,
          total: result.total,
          page: result.page,
        });
      }
      return result;
    } catch (err) {
      console.error(
        `${LOG_PREFIX} Failed to load call records from Supabase:`,
        err,
      );
      throw err;
    }
  });

  const load = async () => {
    await listQuery.mutate();
  };

  const addCall = async (payload: CreateCallPayload): Promise<CallRecord> => {
    const call = await withNetworkActivity(() => createCall(payload));
    await invalidateSWRPrefix(globalMutate, ["/swr/calls", "/swr/dashboard"]);
    return call;
  };

  const editCall = async (
    id: number,
    payload: UpdateCallPayload,
  ): Promise<CallRecord> => {
    const call = await withNetworkActivity(() => updateCall(id, payload));
    await invalidateSWRPrefix(globalMutate, ["/swr/calls", "/swr/dashboard"]);
    return call;
  };

  const removeCall = async (id: number): Promise<void> => {
    await withNetworkActivity(() => deleteCall(id));
    await invalidateSWRPrefix(globalMutate, ["/swr/calls", "/swr/dashboard"]);
  };

  const state: UseCallsState = {
    calls: listQuery.data?.data ?? [],
    total: listQuery.data?.total ?? 0,
    loading: listQuery.isLoading || listQuery.isValidating,
    error:
      (listQuery.error instanceof Error && listQuery.error.message) || null,
  };

  useEffect(() => {
    if (state.loading) {
      console.log(`${LOG_PREFIX} Loading calls data...`);
      return;
    }

    if (state.error) {
      console.error(`${LOG_PREFIX} Calls page data error:`, state.error);
      return;
    }

    console.log(`${LOG_PREFIX} Calls page ready — data from Supabase:`, {
      recordsShown: state.calls.length,
      totalInDb: state.total,
    });
  }, [state.loading, state.error, state.calls.length, state.total]);

  return {
    ...state,
    filters,
    setFilters,
    refetch: load,
    addCall,
    editCall,
    removeCall,
  };
}
