import { api } from "./apiClient";
import type {
  Ticket,
  TicketComment,
  TicketFilters,
  TicketListResponse,
  CreateTicketPayload,
  UpdateTicketPayload,
} from "@/types/ticket";

function buildQueryString(filters: TicketFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set("status", filters.status);
  if (filters.priority) params.set("priority", filters.priority);
  if (filters.category) params.set("category", filters.category);
  if (filters.assigned_to) params.set("assigned_to", filters.assigned_to);
  if (filters.search) params.set("search", filters.search);
  if (filters.page) params.set("page", String(filters.page));
  if (filters.pageSize) params.set("pageSize", String(filters.pageSize));
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export async function fetchTickets(
  filters: TicketFilters = {},
): Promise<TicketListResponse> {
  const qs = buildQueryString(filters);
  const res = await api.get<TicketListResponse>(`/api/tickets${qs}`);
  return res;
}

export async function fetchTicketById(
  id: string,
): Promise<{ data: Ticket }> {
  const res = await api.get<{ data: Ticket }>(`/api/tickets/${id}`);
  return res;
}

export async function createTicket(
  payload: CreateTicketPayload,
): Promise<Ticket> {
  const res = await api.post<Ticket>("/api/tickets", payload);
  return res;
}

export async function updateTicket(
  id: string,
  payload: UpdateTicketPayload,
): Promise<Ticket> {
  const res = await api.patch<Ticket>(`/api/tickets/${id}`, payload);
  return res;
}

export async function deleteTicket(id: string): Promise<void> {
  await api.delete(`/api/tickets/${id}`);
}

export async function fetchTicketComments(
  ticketId: string,
): Promise<{ data: TicketComment[] }> {
  const res = await api.get<{ data: TicketComment[] }>(
    `/api/tickets/${ticketId}/comments`,
  );
  return res;
}

export async function addTicketComment(
  ticketId: string,
  content: string,
): Promise<TicketComment> {
  const res = await api.post<TicketComment>(
    `/api/tickets/${ticketId}/comments`,
    { content },
  );
  return res;
}
