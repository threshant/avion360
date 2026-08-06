import { api } from "./apiClient";
import type {
  LeadPipeline,
  LeadStage,
  CreatePipelinePayload,
  ConvertToLeadPayload,
  UpdateStagePayload,
} from "@/types/lead";

export async function fetchPipelines(): Promise<{ data: LeadPipeline[] }> {
  const res = await api.get("/api/leads/pipelines");
  return res as { data: LeadPipeline[] };
}

export async function fetchPipelineById(
  id: string,
): Promise<{ data: LeadPipeline }> {
  const res = await api.get(`/api/leads/pipelines/${id}`);
  return res as { data: LeadPipeline };
}

export async function createPipeline(
  payload: CreatePipelinePayload,
): Promise<{ data: LeadPipeline }> {
  const res = await api.post("/api/leads/pipelines", payload);
  return res as { data: LeadPipeline };
}

export async function updatePipeline(
  id: string,
  payload: { name?: string; is_active?: boolean },
): Promise<{ data: LeadPipeline }> {
  const res = await api.patch(`/api/leads/pipelines/${id}`, payload);
  return res as { data: LeadPipeline };
}

export async function deletePipeline(id: string): Promise<void> {
  await api.delete(`/api/leads/pipelines/${id}`);
}

export async function createStage(
  pipelineId: string,
  payload: { name: string; color?: string },
): Promise<{ data: LeadStage }> {
  const res = await api.post(
    `/api/leads/pipelines/${pipelineId}/stages`,
    payload,
  );
  return res as { data: LeadStage };
}

export async function reorderStages(
  pipelineId: string,
  stages: { id: string; position: number }[],
): Promise<{ data: LeadStage[] }> {
  const res = await api.put(
    `/api/leads/pipelines/${pipelineId}/stages/reorder`,
    { stages },
  );
  return res as { data: LeadStage[] };
}

export async function moveLeadToStage(
  leadId: string,
  stageId: string,
): Promise<{ data: { stage_id: string; stage_name: string } }> {
  const res = await api.patch(`/api/leads/${leadId}/stage`, { stage_id: stageId });
  return res as { data: { stage_id: string; stage_name: string } };
}

export async function convertToLead(
  payload: ConvertToLeadPayload,
): Promise<{ data: { id: string; pipeline_id: string; stage_id: string } }> {
  const res = await api.post("/api/leads/convert", payload);
  return res as { data: { id: string; pipeline_id: string; stage_id: string } };
}

export async function updateStage(
  pipelineId: string,
  stageId: string,
  payload: UpdateStagePayload,
): Promise<{ data: LeadStage }> {
  const res = await api.patch(
    `/api/leads/pipelines/${pipelineId}/stages/${stageId}`,
    payload,
  );
  return res as { data: LeadStage };
}

export async function deleteStage(
  pipelineId: string,
  stageId: string,
): Promise<void> {
  await api.delete(`/api/leads/pipelines/${pipelineId}/stages/${stageId}`);
}
