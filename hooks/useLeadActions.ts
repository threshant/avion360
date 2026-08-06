"use client";

import { invalidateSWRPrefix, withNetworkActivity } from "@/lib/swr-client";
import { api } from "@/services/apiClient";
import useSWR, { useSWRConfig } from "swr";

type LeadOverridePayload = {
  assignedTo?: string | null;
  note?: string | null;
  reminderAt?: string | null;
  reminderText?: string | null;
  columnId?: string | null;
};

type LeadAssignee = {
  id: string;
  name: string;
  email: string;
};

export function useLeadActions() {
  const { mutate: globalMutate } = useSWRConfig();

  const assigneesQuery = useSWR("/swr/leads/assignees", () =>
    withNetworkActivity(() =>
      api.get<{ data?: LeadAssignee[] }>("/api/leads/assignees"),
    ),
  );

  const saveOverride = async (leadId: string, payload: LeadOverridePayload) => {
    await withNetworkActivity(() =>
      api.patch("/api/leads/aviontive/overrides", {
        leadId,
        ...payload,
      }),
    );
    await invalidateSWRPrefix(globalMutate, [
      "/swr/leads",
      "/swr/aviontive-leads",
      "/swr/dashboard",
    ]);
  };

  const syncLeads = async () => {
    const result = await withNetworkActivity(() =>
      api.post<{ synced?: number; error?: string }>("/api/leads/sync", {}),
    );
    await invalidateSWRPrefix(globalMutate, [
      "/swr/leads",
      "/swr/aviontive-leads",
      "/swr/dashboard",
      "/swr/dashboard-analytics",
    ]);
    return result;
  };

  return {
    assignees: assigneesQuery.data?.data ?? [],
    assigneesLoading: assigneesQuery.isLoading || assigneesQuery.isValidating,
    saveOverride,
    syncLeads,
    refreshAssignees: assigneesQuery.mutate,
  };
}
