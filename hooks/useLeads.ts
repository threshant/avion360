"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import {
  createLead,
  deleteLead,
  fetchAviontiveLeadById,
  fetchLeadById,
  fetchLeads,
  updateAviontiveLead,
  updateAviontiveLeadStage,
  updateLead,
} from "@/services/leadService";
import type {
  CreateLeadPayload,
  Lead,
  LeadFilters,
  UpdateLeadPayload,
} from "@/types/lead";
import { useCallback, useState } from "react";
import useSWR, { useSWRConfig } from "swr";

type UseLeadsState = {
  leads: Lead[];
  total: number;
  loading: boolean;
  error: string | null;
};

export function useLeads(initialFilters: LeadFilters = {}) {
  const [filters, setFilters] = useState<LeadFilters>({
    page: 1,
    pageSize: 20,
    ...initialFilters,
  });
  const { mutate: globalMutate } = useSWRConfig();
  const key = swrKey("/swr/leads", filters as Record<string, unknown>);
  const { data, error, isLoading, isValidating, mutate } = useSWR(key, () =>
    withNetworkActivity(() => fetchLeads(filters)),
  );

  const load = useCallback(async () => mutate(), [mutate]);

  const revalidateLeadCaches = useCallback(async () => {
    await invalidateSWRPrefix(globalMutate, [
      "/swr/leads",
      "/swr/dashboard",
      "/swr/dashboard-analytics",
    ]);
  }, [globalMutate]);

  const addLead = useCallback(
    async (payload: CreateLeadPayload): Promise<Lead> => {
      const lead = await withNetworkActivity(() => createLead(payload));
      await revalidateLeadCaches();
      return lead;
    },
    [revalidateLeadCaches],
  );

  const editLead = useCallback(
    async (id: number | string, payload: UpdateLeadPayload): Promise<Lead> => {
      const lead = await withNetworkActivity(() => updateLead(id, payload));
      await revalidateLeadCaches();
      return lead;
    },
    [revalidateLeadCaches],
  );

  const removeLead = useCallback(
    async (id: number | string): Promise<void> => {
      await withNetworkActivity(() => deleteLead(id));
      await revalidateLeadCaches();
    },
    [revalidateLeadCaches],
  );

  const getById = useCallback((id: number | string) => fetchLeadById(id), []);

  // ============================================
  // Aviontive API Methods
  // ============================================

  /**
   * Fetch a single lead from Aviontive by ID with full details
   */
  const getAviontiveLeadById = useCallback(
    async (id: string): Promise<Lead> => {
      return fetchAviontiveLeadById(id);
    },
    [],
  );

  /**
   * Update a lead's details (title, notes, amount, currency, temperature, etc.)
   */
  const editAviontiveLead = useCallback(
    async (id: string, payload: UpdateLeadPayload): Promise<Lead> => {
      const lead = await withNetworkActivity(() =>
        updateAviontiveLead(id, payload),
      );
      await revalidateLeadCaches();
      return lead;
    },
    [revalidateLeadCaches],
  );

  /**
   * Move a lead to a different stage
   */
  const moveLeadToStage = useCallback(
    async (leadId: string, stageId: string): Promise<Lead> => {
      const lead = await withNetworkActivity(() =>
        updateAviontiveLeadStage({ lead_id: leadId, stage_id: stageId }),
      );
      await revalidateLeadCaches();
      return lead;
    },
    [revalidateLeadCaches],
  );

  const state: UseLeadsState = {
    leads: data?.data ?? [],
    total: data?.total ?? 0,
    loading: isLoading || isValidating,
    error: error instanceof Error ? error.message : null,
  };

  return {
    ...state,
    filters,
    setFilters,
    // pagination helpers
    setPage: (p: number) => setFilters((f) => ({ ...f, page: p })),
    setPageSize: (s: number) =>
      setFilters((f) => ({ ...f, pageSize: s, page: 1 })),
    nextPage: () => setFilters((f) => ({ ...f, page: (f.page ?? 1) + 1 })),
    prevPage: () =>
      setFilters((f) => ({ ...f, page: Math.max(1, (f.page ?? 1) - 1) })),
    refetch: load,
    addLead,
    editLead,
    removeLead,
    getById,
    // Aviontive API methods
    getAviontiveLeadById,
    editAviontiveLead,
    moveLeadToStage,
  };
}
