"use client";

import { swrKey, withNetworkActivity } from "@/lib/swr-client";
import {
  fetchConversationById,
  fetchConversationMessages,
  fetchConversations,
  sendConversationMessage,
} from "@/services/conversationService";
import type {
  Conversation,
  ConversationDetail,
  ConversationMessage,
  ConversationMessagesResponse,
} from "@/types/conversation";
import { useCallback, useRef, useState } from "react";
import useSWR from "swr";

type PendingMessage = {
  id: `pending-${string}`;
  sender_type: "brand";
  external_user_id: null;
  content: string;
  created_at: string;
  message_type: "MESSAGE";
  image_url: null;
  description: null;
  reply_to: null;
  metadata: null;
  sending: true;
};

type UseConversationsState = {
  conversations: Conversation[];
  loading: boolean;
  error: string | null;
};

export function useConversations(brandId?: string) {
  const key = swrKey("/swr/conversations", { brand_id: brandId });
  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    () => withNetworkActivity(() => fetchConversations(brandId)),
    { revalidateOnFocus: false },
  );

  const load = useCallback(async () => mutate(), [mutate]);

  const state: UseConversationsState = {
    conversations: data?.data?.conversations ?? [],
    loading: isLoading || isValidating,
    error: error instanceof Error ? error.message : null,
  };

  return {
    ...state,
    refetch: load,
  };
}

type UseConversationDetailState = {
  conversation: ConversationDetail | null;
  loading: boolean;
  error: string | null;
};

export function useConversationDetail(conversationId: string | null) {
  const key = conversationId
    ? swrKey("/swr/conversations/detail", { id: conversationId })
    : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    () =>
      withNetworkActivity(() =>
        fetchConversationById(conversationId as string),
      ),
    { revalidateOnFocus: false },
  );

  const load = useCallback(async () => mutate(), [mutate]);

  const state: UseConversationDetailState = {
    conversation: data?.data ?? null,
    loading: isLoading || isValidating,
    error: error instanceof Error ? error.message : null,
  };

  return {
    ...state,
    refetch: load,
  };
}

type UseConversationMessagesState = {
  messages: ConversationMessage[];
  meta: Omit<ConversationMessagesResponse["data"], "messages"> | null;
  loading: boolean;
  error: string | null;
};

export function useConversationMessages(conversationId: string | null) {
  const key = conversationId
    ? swrKey("/swr/conversations/messages", { id: conversationId })
    : null;

  const { data, error, isLoading, isValidating, mutate } = useSWR(
    key,
    () =>
      withNetworkActivity(() =>
        fetchConversationMessages(conversationId as string, 50),
      ),
    { revalidateOnFocus: false },
  );

  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [pendingMessages, setPendingMessages] = useState<PendingMessage[]>([]);
  const sendingRef = useRef(false);

  const sendMessage = useCallback(
    async (content: string) => {
      if (!conversationId || !content.trim() || sendingRef.current) return;

      const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}` as const;
      const optimistic: PendingMessage = {
        id: pendingId,
        sender_type: "brand",
        external_user_id: null,
        content: content.trim(),
        created_at: new Date().toISOString(),
        message_type: "MESSAGE",
        image_url: null,
        description: null,
        reply_to: null,
        metadata: null,
        sending: true,
      };

      setPendingMessages((prev) => [...prev, optimistic]);
      sendingRef.current = true;
      setIsSending(true);
      setSendError(null);
      try {
        await sendConversationMessage({
          conversation_id: conversationId,
          content: content.trim(),
        });
        setPendingMessages((prev) => prev.filter((m) => m.id !== pendingId));
        await mutate();
      } catch (err) {
        setPendingMessages((prev) => prev.filter((m) => m.id !== pendingId));
        const message =
          err instanceof Error ? err.message : "Failed to send message";
        setSendError(message);
        throw err;
      } finally {
        sendingRef.current = false;
        setIsSending(false);
      }
    },
    [conversationId, mutate],
  );

  const allMessages: ConversationMessage[] = [
    ...(data?.data?.messages ?? []),
    ...pendingMessages,
  ];

  const state: UseConversationMessagesState = {
    messages: allMessages,
    meta: data?.data
      ? {
          channel_account_id: data.data.channel_account_id,
          external_user_id: data.data.external_user_id,
          channel_name: data.data.channel_name,
          summary: data.data.summary,
          ai_reply: data.data.ai_reply,
          in_leads: data.data.in_leads,
          sender: data.data.sender,
          labels: data.data.labels,
        }
      : null,
    loading: isLoading || isValidating,
    error: error instanceof Error ? error.message : null,
  };

  return {
    ...state,
    refetch: useCallback(async () => mutate(), [mutate]),
    sendMessage,
    isSending,
    sendError,
  };
}
