import type {
  Client,
  ClientListResponse,
  ClientProfileResponse,
  CreateClientPayload,
  UpdateClientPayload,
} from "@/types/client";
import { api } from "./apiClient";

const ENDPOINT = "/api/clients";

export async function fetchClients(
  filters: { search?: string; page?: number; pageSize?: number } = {},
): Promise<ClientListResponse> {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", String(filters.search));
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  const qs = params.toString() ? `?${params.toString()}` : "";
  return api.get<ClientListResponse>(`${ENDPOINT}${qs}`);
}

export async function fetchClientById(id: string): Promise<{ data: Client }> {
  return api.get<{ data: Client }>(`${ENDPOINT}/${id}`);
}

export async function createClient(
  payload: CreateClientPayload,
): Promise<{ data: Client }> {
  return api.post<{ data: Client }>(ENDPOINT, payload);
}

export async function updateClient(
  id: string,
  payload: UpdateClientPayload,
): Promise<{ data: Client }> {
  return api.patch<{ data: Client }>(`${ENDPOINT}/${id}`, payload);
}

export async function deleteClient(id: string): Promise<void> {
  return api.delete<void>(`${ENDPOINT}/${id}`);
}

export async function fetchClientProfile(
  id: string,
): Promise<ClientProfileResponse> {
  return api.get<ClientProfileResponse>(`${ENDPOINT}/${id}/profile`);
}
