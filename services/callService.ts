import type {
  CallFilters,
  CallListResponse,
  CallRecord,
  CreateCallPayload,
  TelecmiBrowserUserResponse,
  TelecmiCallInsightsFilters,
  TelecmiCallInsightsResponse,
  UpdateCallPayload,
} from "@/types/call";
import { api } from "./apiClient";

const ENDPOINT = "/api/calls";

function toQueryString(filters: CallFilters): string {
  const params = new URLSearchParams();
  (Object.entries(filters) as [string, string | number | undefined][]).forEach(
    ([key, value]) => {
      if (value !== undefined) params.set(key, String(value));
    },
  );
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchCalls(
  filters: CallFilters = {},
): Promise<CallListResponse> {
  return api.get<CallListResponse>(`${ENDPOINT}${toQueryString(filters)}`);
}

export async function fetchCallById(id: number): Promise<CallRecord> {
  return api.get<CallRecord>(`${ENDPOINT}/${id}`);
}

export async function fetchTelecmiCallInsights(
  filters: TelecmiCallInsightsFilters,
): Promise<TelecmiCallInsightsResponse> {
  const qs = toQueryString(filters as unknown as CallFilters);
  return api.get<TelecmiCallInsightsResponse>(
    `/api/telecmi/call-insights${qs}`,
  );
}

export async function fetchTelecmiBrowserUser(): Promise<TelecmiBrowserUserResponse> {
  return api.get<TelecmiBrowserUserResponse>("/api/telecmi/browser-user");
}

export async function createCall(
  payload: CreateCallPayload,
): Promise<CallRecord> {
  return api.post<CallRecord>(ENDPOINT, payload);
}

export async function updateCall(
  id: number,
  payload: UpdateCallPayload,
): Promise<CallRecord> {
  return api.patch<CallRecord>(`${ENDPOINT}/${id}`, payload);
}

export async function deleteCall(id: number): Promise<void> {
  return api.delete<void>(`${ENDPOINT}/${id}`);
}
