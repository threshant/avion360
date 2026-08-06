export type ConversationMessage = {
  id: number | string;
  sender_type: "user" | "brand" | "bot" | string;
  external_user_id: string | null;
  content: string | null;
  created_at: string;
  message_type: "MESSAGE" | "IMAGE" | "POST" | string;
  image_url: string | null;
  description: string | null;
  reply_to: number | null;
  metadata: Record<string, unknown> | null;
  sending?: boolean;
};

export type ConversationStage = {
  id: string;
  label: string;
  description: string | null;
  color: string | null;
};

export type ConversationLabel = {
  id: string;
  name: string;
  category: string | null;
  color: string | null;
  description: string | null;
};

export type ConversationSender = {
  display_user_name: string | null;
  account_display_name: string | null;
  account_dp_url: string | null;
  account_user_name?: string | null;
};

export type ConversationLatestMessage = {
  content: string | null;
  sender_type: string;
  created_at: string;
};

export type Conversation = {
  id: string;
  brand_id: string;
  channel_account_id: string;
  external_user_id: string;
  created_at: string;
  last_message_at: string | null;
  system_state_id: string | null;
  stage: ConversationStage | null;
  summary: string | null;
  ai_reply: boolean;
  as_seen?: boolean;
  latest_message: ConversationLatestMessage | null;
  sender: ConversationSender | null;
  channel_id: string;
  channel_name: string;
  lead_id: string | null;
  is_promoted_to_lead: boolean;
  labels: ConversationLabel[];
};

export type ConversationDetail = Conversation;

export type ConversationListResponse = {
  data: {
    conversations: Conversation[];
  };
};

export type ConversationDetailResponse = {
  data: ConversationDetail;
};

export type ConversationMessagesResponse = {
  data: {
    messages: ConversationMessage[];
    channel_account_id: string | null;
    external_user_id: string | null;
    channel_name: string | null;
    summary: string | null;
    ai_reply: boolean;
    in_leads: boolean;
    sender: ConversationSender | null;
    labels: string[] | ConversationLabel[];
  };
};

export type SendConversationMessagePayload = {
  conversation_id: string;
  content: string;
};
