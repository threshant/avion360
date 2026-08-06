"use client";

import {
  invalidateSWRPrefix,
  swrKey,
  withNetworkActivity,
} from "@/lib/swr-client";
import {
  addTicketComment,
  createTicket,
  deleteTicket,
  fetchTicketComments,
  fetchTicketById,
  fetchTickets,
  updateTicket,
} from "@/services/ticketService";
import type {
  CreateTicketPayload,
  Ticket,
  TicketComment,
  TicketFilters,
  UpdateTicketPayload,
} from "@/types/ticket";
import { useState } from "react";
import useSWR, { useSWRConfig } from "swr";

type UseTicketsState = {
  tickets: Ticket[];
  total: number;
  loading: boolean;
  error: string | null;
};

export function useTickets(initialFilters: TicketFilters = {}) {
  const [filters, setFilters] = useState<TicketFilters>(initialFilters);
  const { mutate: globalMutate } = useSWRConfig();
  const key = swrKey("/swr/tickets", filters as Record<string, unknown>);
  const { data, error, isLoading, isValidating, mutate } = useSWR(key, () =>
    withNetworkActivity(() => fetchTickets(filters)),
  );

  const add = async (payload: CreateTicketPayload): Promise<Ticket> => {
    const ticket = await withNetworkActivity(() => createTicket(payload));
    await invalidateSWRPrefix(globalMutate, ["/swr/tickets"]);
    return ticket;
  };

  const edit = async (
    id: string,
    payload: UpdateTicketPayload,
  ): Promise<Ticket> => {
    const ticket = await withNetworkActivity(() => updateTicket(id, payload));
    await invalidateSWRPrefix(globalMutate, ["/swr/tickets"]);
    return ticket;
  };

  const remove = async (id: string): Promise<void> => {
    await withNetworkActivity(() => deleteTicket(id));
    await invalidateSWRPrefix(globalMutate, ["/swr/tickets"]);
  };

  const state: UseTicketsState = {
    tickets: data?.data ?? [],
    total: data?.total ?? 0,
    loading: isLoading || isValidating,
    error: error instanceof Error ? error.message : null,
  };

  return {
    ...state,
    filters,
    setFilters,
    refetch: () => mutate(),
    add,
    edit,
    remove,
  };
}

export function useTicketDetail(ticketId: string | null) {
  const key = ticketId ? swrKey("/swr/tickets/detail", { id: ticketId }) : null;
  const { mutate: globalMutate } = useSWRConfig();

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    () =>
      withNetworkActivity(() => fetchTicketById(ticketId as string)),
    { revalidateOnFocus: false },
  );

  const edit = async (payload: UpdateTicketPayload): Promise<void> => {
    if (!ticketId) return;
    await withNetworkActivity(() => updateTicket(ticketId, payload));
    await mutate();
    await invalidateSWRPrefix(globalMutate, ["/swr/tickets"]);
  };

  const remove = async (): Promise<void> => {
    if (!ticketId) return;
    await withNetworkActivity(() => deleteTicket(ticketId));
    await invalidateSWRPrefix(globalMutate, ["/swr/tickets"]);
  };

  return {
    ticket: (data?.data ?? null) as Ticket | null,
    loading: isLoading || isValidating,
    error: error instanceof Error ? error.message : null,
    refetch: () => mutate(),
    edit,
    remove,
  };
}

export function useTicketComments(ticketId: string | null) {
  const key = ticketId
    ? swrKey("/swr/ticket-comments", { ticketId })
    : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    () =>
      withNetworkActivity(() => fetchTicketComments(ticketId as string)),
    { revalidateOnFocus: false },
  );

  const addComment = async (content: string): Promise<TicketComment> => {
    if (!ticketId) throw new Error("No ticket ID");
    const comment = await withNetworkActivity(() =>
      addTicketComment(ticketId, content),
    );
    await mutate();
    return comment;
  };

  return {
    comments: (data?.data ?? []) as TicketComment[],
    loading: isLoading || isValidating,
    error: error instanceof Error ? error.message : null,
    refetch: () => mutate(),
    addComment,
  };
}
