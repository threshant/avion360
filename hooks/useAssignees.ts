"use client";

import { withNetworkActivity } from "@/lib/swr-client";
import { api } from "@/services/apiClient";
import useSWR from "swr";

export type Assignee = {
  id: string;
  name: string;
  email: string;
};

export function useAssignees(enabled = true) {
  const query = useSWR(enabled ? "/swr/leads/assignees" : null, () =>
    withNetworkActivity(() =>
      api.get<{ data?: Assignee[] }>("/api/leads/assignees"),
    ),
  );

  return {
    assignees: query.data?.data ?? [],
    loading: query.isLoading || query.isValidating,
    error: query.error instanceof Error ? query.error.message : null,
    refetch: query.mutate,
  };
}
