import type {
  CreateLeadPayload,
  Lead,
  LeadFilters,
  LeadListResponse,
  LeadResponse,
  UpdateLeadPayload,
  UpdateLeadStagePayload,
} from "@/types/lead";
import { api } from "./apiClient";

// Placeholder endpoint — swap when the real backend is ready.
const ENDPOINT = "/api/leads";
const AVIONTIVE_ENDPOINT = "/api/leads/aviontive";

/** Build a query string from LeadFilters, skipping undefined values. */
function toQueryString(filters: LeadFilters): string {
  const params = new URLSearchParams();
  (Object.entries(filters) as [string, string | number | undefined][]).forEach(
    ([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    },
  );
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchLeads(
  filters: LeadFilters = {},
): Promise<LeadListResponse> {
  return api.get<LeadListResponse>(`${ENDPOINT}${toQueryString(filters)}`);
}

export async function fetchLeadById(id: number | string): Promise<Lead> {
  return api.get<Lead>(`${ENDPOINT}/${id}`);
}

export async function createLead(payload: CreateLeadPayload): Promise<Lead> {
  return api.post<Lead>(ENDPOINT, payload);
}

export async function createAviontiveLead(
  payload: Record<string, unknown>,
): Promise<Lead> {
  const response = await api.post<Lead>(AVIONTIVE_ENDPOINT, payload);
  return response;
}

export async function updateLead(
  id: number | string,
  payload: UpdateLeadPayload,
): Promise<Lead> {
  return api.patch<Lead>(`${ENDPOINT}/${id}`, payload);
}

export async function deleteLead(id: number | string): Promise<void> {
  return api.delete<void>(`${ENDPOINT}/${id}`);
}

// ============================================
// Aviontive API Methods
// ============================================

/**
 * GET /api/leads/leads/:id
 * Retrieves a single lead by ID with full details (lead sheet).
 * Includes linked conversation, contact, stage, labels, tasks, amount, currency, and temperature.
 */
export async function fetchAviontiveLeadById(id: string): Promise<Lead> {
  const response = await api.get<LeadResponse<Lead>>(
    `${AVIONTIVE_ENDPOINT}/${id}`,
  );
  return response.data || response;
}

/**
 * PATCH /api/leads/leads/:id
 * Updates a lead's details — title, notes, amount, currency, temperature, contact, and/or stage.
 */
export async function updateAviontiveLead(
  id: string,
  payload: UpdateLeadPayload,
): Promise<Lead> {
  const response = await api.patch<LeadResponse<Lead>>(
    `${AVIONTIVE_ENDPOINT}/${id}`,
    payload,
  );
  return response.data || response;
}

/**
 * PATCH /api/leads/leads
 * Updates a lead's stage (move between pipeline stages).
 */
export async function updateAviontiveLeadStage(
  payload: UpdateLeadStagePayload,
): Promise<Lead> {
  const response = await api.patch<LeadResponse<Lead>>(
    AVIONTIVE_ENDPOINT,
    payload,
  );
  return response.data || response;
}
