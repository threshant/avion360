import type {
  ConversationDetailResponse,
  ConversationListResponse,
  ConversationMessagesResponse,
  SendConversationMessagePayload,
} from "@/types/conversation";
import { api } from "./apiClient";

const CONVERSATIONS_ENDPOINT = "/api/conversations";
const CONVERSATION_MESSAGES_ENDPOINT = "/api/conversations/messages";

export async function fetchConversations(
  brandId?: string,
): Promise<ConversationListResponse> {
  const query = new URLSearchParams();
  if (brandId) {
    query.set("brand_id", brandId);
  }
  const qs = query.toString();
  return api.get<ConversationListResponse>(
    `${CONVERSATIONS_ENDPOINT}${qs ? `?${qs}` : ""}`,
  );
}

export async function fetchConversationById(
  conversationId: string,
): Promise<ConversationDetailResponse> {
  return api.get<ConversationDetailResponse>(
    `${CONVERSATIONS_ENDPOINT}?id=${encodeURIComponent(conversationId)}`,
  );
}

export async function fetchConversationMessages(
  conversationId: string,
  limit = 50,
): Promise<ConversationMessagesResponse> {
  const query = new URLSearchParams({
    conversation_id: conversationId,
    limit: String(limit),
  });

  return api.get<ConversationMessagesResponse>(
    `${CONVERSATION_MESSAGES_ENDPOINT}?${query.toString()}`,
  );
}

export async function sendConversationMessage(
  payload: SendConversationMessagePayload,
): Promise<void> {
  await api.post<unknown>(CONVERSATION_MESSAGES_ENDPOINT, payload);
}
