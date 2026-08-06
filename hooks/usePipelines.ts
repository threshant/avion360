"use client";

import { swrKey, withNetworkActivity } from "@/lib/swr-client";
import {
  fetchPipelineById,
  fetchPipelines,
  moveLeadToStage,
  reorderStages,
} from "@/services/pipelineService";
import type { LeadPipeline, LeadStage } from "@/types/lead";
import { useCallback } from "react";
import useSWR from "swr";

export function usePipelines() {
  const key = swrKey("/swr/lead-pipelines");
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    () => withNetworkActivity(() => fetchPipelines()),
    { revalidateOnFocus: false },
  );

  return {
    pipelines: (data?.data ?? []) as (LeadPipeline & { stages: LeadStage[] })[],
    loading: isLoading || isValidating,
    error: error instanceof Error ? error.message : null,
    refetch: useCallback(() => mutate(), [mutate]),
  };
}

export function usePipelineDetail(pipelineId: string | null) {
  const key = pipelineId
    ? swrKey("/swr/lead-pipelines/detail", { id: pipelineId })
    : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    () =>
      withNetworkActivity(() =>
        fetchPipelineById(pipelineId as string),
      ),
    { revalidateOnFocus: false },
  );

  return {
    pipeline: (data?.data ?? null) as (LeadPipeline & { stages: (LeadStage & { leads: unknown[] })[] }) | null,
    loading: isLoading || isValidating,
    error: error instanceof Error ? error.message : null,
    refetch: useCallback(() => mutate(), [mutate]),
  };
}

export function useKanbanActions(pipelineId: string | null) {
  const key = pipelineId
    ? swrKey("/swr/lead-pipelines/detail", { id: pipelineId })
    : null;

  const { mutate } = useSWR(key);

  const moveLead = useCallback(
    async (leadId: string, stageId: string) => {
      await moveLeadToStage(leadId, stageId);
      await mutate();
    },
    [mutate],
  );

  const reorderPipelineStages = useCallback(
    async (stages: { id: string; position: number }[]) => {
      if (!pipelineId) return;
      await reorderStages(pipelineId, stages);
      await mutate();
    },
    [pipelineId, mutate],
  );

  return { moveLead, reorderPipelineStages };
}
