"use client";

import PageHeader from "@/components/PageHeader";
import ConvertToLeadModal from "@/components/ConvertToLeadModal";
import CrmShell from "@/components/layout/CrmShell";
import {
  useConversationDetail,
  useConversationMessages,
  useConversations,
} from "@/hooks/useConversations";
import type { Conversation, ConversationMessage } from "@/types/conversation";
import {
  ArrowUpRight,
  Globe,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Play,
  Search,
  Send,
  User,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`crm-skeleton ${className}`} />;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ChannelSource =
  | "All"
  | "WhatsApp"
  | "Instagram"
  | "Facebook"
  | "Email"
  | "Website"
  | "Calls";

const sourceTabs: ChannelSource[] = [
  "All",
  "WhatsApp",
  "Instagram",
  "Facebook",
  "Email",
  "Website",
  "Calls",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getChannelColor(channel: string): string {
  const normalized = channel.toLowerCase();
  const colorMap: Record<string, string> = {
    whatsapp: "bg-green-500",
    instagram: "bg-pink-500",
    facebook: "bg-blue-500",
    email: "bg-purple-500",
    calls: "bg-[#FF6B4A]",
    call: "bg-[#FF6B4A]",
    website: "bg-slate-500",
  };
  return colorMap[normalized] || "bg-slate-500";
}

function InstagramLogo({ className = "" }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function ChannelIcon({ channel }: { channel: string }) {
  const normalized = channel.toLowerCase();
  const className = "h-4 w-4";

  if (normalized === "whatsapp" || normalized === "calls" || normalized === "call") {
    return <Phone className={className} aria-hidden="true" />;
  }
  if (normalized === "instagram") {
    return <InstagramLogo className={className} />;
  }
  if (normalized === "facebook") {
    return <MessageCircle className={className} aria-hidden="true" />;
  }
  if (normalized === "email") {
    return <Mail className={className} aria-hidden="true" />;
  }
  if (normalized === "website") {
    return <Globe className={className} aria-hidden="true" />;
  }
  return <MessageCircle className={className} aria-hidden="true" />;
}

function formatTime(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();

  if (isToday) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) {
    return "Yesterday";
  }

  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

function formatMessageTime(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ─── Left Panel Components ────────────────────────────────────────────────────

function ConversationRow({
  conversation,
  isSelected,
  isRead,
  onClick,
}: {
  conversation: Conversation;
  isSelected: boolean;
  isRead: boolean;
  onClick: (id: string) => void;
}) {
  const displayName =
    conversation.sender?.account_display_name ||
    conversation.sender?.display_user_name ||
    "Unknown";
  const latestMessage = conversation.latest_message?.content || "No messages";
  const unread = conversation.as_seen === false && !isRead;

  return (
    <button
      type="button"
      onClick={() => onClick(conversation.id)}
      className={`flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition ${
        isSelected
          ? "bg-[#FF6B4A]/10"
          : "hover:bg-slate-50"
      }`}
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white ${getChannelColor(
          conversation.channel_name,
        )}`}
      >
        <ChannelIcon channel={conversation.channel_name} />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className={`truncate text-sm ${isSelected ? "font-bold text-[#FF6B4A]" : "font-semibold text-slate-900"}`}>
            {displayName}
          </span>
          <div className="flex shrink-0 items-center gap-1.5">
            <span className="text-[11px] text-slate-400">
              {formatTime(conversation.last_message_at)}
            </span>
            {unread && (
              <span
                className="h-2 w-2 rounded-full bg-[#FF6B4A]"
                aria-label="Unread"
                title="Unread"
              />
            )}
          </div>
        </div>

        <p
          className={`mt-0.5 truncate text-xs ${
            unread ? "font-bold text-slate-900" : "text-slate-500"
          }`}
        >
          {latestMessage}
        </p>
      </div>
    </button>
  );
}

// ─── Right Panel Components ───────────────────────────────────────────────────

type MessageAttachment = {
  type?: string;
  payload?: { url?: string; title?: string; reel_video_id?: string };
};

function getMessageAttachment(message: ConversationMessage): MessageAttachment | null {
  const attachments = (
    message.metadata as { attachments?: MessageAttachment[] } | null
  )?.attachments;
  const first = Array.isArray(attachments) ? attachments[0] : undefined;
  if (first && typeof first === "object" && first.payload?.url) return first;
  return null;
}

function instagramEmbedUrl(url: string): string | null {
  const m = url.match(/instagram\.com\/(reel|p|tv|reels)\/([A-Za-z0-9_-]+)/);
  if (!m) return null;
  return `https://www.instagram.com/${m[1]}/${m[2]}/embed/captioned/`;
}

function InstagramReelCard({
  url,
  title,
}: {
  url: string;
  title?: string | null;
}) {
  const embedUrl = instagramEmbedUrl(url);

  return (
    <a
      href={url}
      target="_blank"
      rel="noreferrer"
      className="block w-80 overflow-hidden rounded-xl border border-slate-200 bg-white"
    >
      <div className="flex items-center gap-1.5 border-b border-slate-100 px-3 py-2">
        <InstagramLogo className="h-3.5 w-3.5 text-slate-500" />
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          Shared
        </span>
      </div>

      {embedUrl ? (
        <iframe
          src={embedUrl}
          title="Instagram post"
          loading="lazy"
          scrolling="no"
          allowFullScreen
          allowTransparency
          className="block h-72 w-full bg-slate-50"
        />
      ) : (
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-pink-100 via-fuchsia-100 to-slate-100">
          <Play className="h-8 w-8 text-pink-500" />
        </div>
      )}

      {title && (
        <p className="line-clamp-3 whitespace-pre-wrap px-3 py-2 text-xs text-slate-600">
          {title}
        </p>
      )}

      <div className="flex items-center justify-between border-t border-slate-100 px-3 py-1.5">
        <span className="text-[10px] text-slate-400">instagram.com</span>
        <span className="flex items-center gap-0.5 text-[10px] font-semibold text-sky-600">
          View on Instagram
          <ArrowUpRight className="h-3 w-3" />
        </span>
      </div>
    </a>
  );
}

function MessageBubble({ message, sending }: { message: ConversationMessage; sending?: boolean }) {
  const isUser = message.sender_type === "user";
  const attachment = getMessageAttachment(message);

  return (
    <div className={`flex w-full ${isUser ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "rounded-tl-none bg-slate-100 text-slate-800"
            : "rounded-tr-none bg-[#FF6B4A] text-white"
        } ${sending ? "opacity-70" : ""}`}
      >
        {attachment ? (
          <InstagramReelCard
            url={attachment.payload?.url ?? ""}
            title={attachment.payload?.title}
          />
        ) : (
          <p className="whitespace-pre-wrap break-words">
            {message.content ||
              message.description ||
              (message.image_url ? "Image" : "(No content)")}
          </p>
        )}
        {message.image_url && (
          <a
            href={message.image_url}
            target="_blank"
            rel="noreferrer"
            className={`mt-2 block text-xs underline ${
              isUser ? "text-sky-700" : "text-white/80"
            }`}
          >
            Open image
          </a>
        )}
        <div
          className={`mt-1 flex items-center justify-end gap-1.5 text-[11px] ${
            isUser ? "text-slate-400" : "text-white/70"
          }`}
        >
          {sending && (
            <Loader2 className="h-3 w-3 animate-spin" />
          )}
          <span>{formatMessageTime(message.created_at)}</span>
        </div>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 px-5 py-4">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange?.(!checked)}
      className={`relative inline-flex h-5 w-9 items-center rounded-full transition ${
        checked ? "bg-[#FF6B4A]" : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition ${
          checked ? "translate-x-4" : "translate-x-1"
        }`}
      />
    </button>
  );
}

function ChatPlaceholder() {
  return (
    <div className="flex h-full flex-col items-center justify-center text-slate-300">
      <MessageCircle className="mb-4 h-16 w-16" strokeWidth={1} />
      <p className="text-lg font-medium text-slate-400">
        Select a conversation to start chatting
      </p>
      <p className="mt-1 text-sm text-slate-300">
        Choose from the list on the left
      </p>
    </div>
  );
}

function ConversationInfoPanel({
  conversation,
  messages,
  meta,
}: {
  conversation: NonNullable<ReturnType<typeof useConversationDetail>["conversation"]>;
  messages: ConversationMessage[];
  meta: ReturnType<typeof useConversationMessages>["meta"];
}) {
  const displayName =
    conversation.sender?.account_display_name ||
    conversation.sender?.display_user_name ||
    "Unknown";

  const username =
    conversation.sender?.display_user_name ||
    conversation.sender?.account_user_name ||
    "—";

  const channelName = conversation.channel_name || "—";
  const totalMessages = messages.length;
  const startedOn = conversation.created_at
    ? formatDate(conversation.created_at)
    : "—";

  return (
    <div className="crm-minimal-scroll w-[280px] shrink-0 overflow-y-auto border-l border-slate-100">
      <SectionCard title="Contact">
        <div className="flex items-center gap-3">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white ${getChannelColor(
              conversation.channel_name,
            )}`}
          >
            <User className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{displayName}</p>
            <p className="truncate text-xs text-slate-400">@{username}</p>
          </div>
        </div>
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Channel</span>
            <span className="font-medium capitalize text-slate-700">{channelName}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Messages</span>
            <span className="font-medium text-slate-700">{totalMessages}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Started</span>
            <span className="font-medium text-slate-700">{startedOn}</span>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="Labels">
        <div className="flex flex-wrap gap-1.5">
          {conversation.labels && conversation.labels.length > 0 ? (
            conversation.labels.map((label) => (
              <span
                key={label.id}
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={{
                  backgroundColor: label.color ? `${label.color}20` : "#f1f5f9",
                  color: label.color || "#475569",
                }}
              >
                {label.name}
              </span>
            ))
          ) : (
            <span className="text-xs text-slate-400">No labels</span>
          )}
        </div>
      </SectionCard>

      <SectionCard title="AI Replies">
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-600">Enabled</span>
          <Toggle checked={conversation.ai_reply ?? false} />
        </div>
      </SectionCard>

      {meta?.summary && (
        <SectionCard title="Summary">
          <p className="text-xs leading-relaxed text-slate-600">{meta.summary}</p>
        </SectionCard>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConversationsPage() {
  const [activeSource, setActiveSource] = useState<ChannelSource>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [readConversationIds, setReadConversationIds] = useState<Set<string>>(() => new Set());
  const [showInfoPanel, setShowInfoPanel] = useState(true);
  const [showConvertModal, setShowConvertModal] = useState(false);

  const {
    conversations,
    loading: isLoading,
    error,
    refetch,
  } = useConversations();

  const {
    conversation,
    loading: detailLoading,
  } = useConversationDetail(selectedConversationId);

  const {
    messages,
    meta,
    loading: messagesLoading,
    sendMessage,
    isSending,
  } = useConversationMessages(selectedConversationId);

  const [replyDraft, setReplyDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedConversationId) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [selectedConversationId, messages]);

  const filteredConversations = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    const filtered = conversations.filter((conversation) => {
      const matchesSource =
        activeSource === "All" ||
        conversation.channel_name.toLowerCase() === activeSource.toLowerCase();

      if (!q) return matchesSource;

      const displayName = (
        conversation.sender?.account_display_name ||
        conversation.sender?.display_user_name ||
        ""
      ).toLowerCase();
      const username = (
        conversation.sender?.display_user_name ||
        conversation.sender?.account_user_name ||
        ""
      ).toLowerCase();
      const latestMessage = (
        conversation.latest_message?.content || ""
      ).toLowerCase();
      const labels = conversation.labels
        .map((label) => label.name.toLowerCase())
        .join(" ");

      const matchesSearch =
        displayName.includes(q) ||
        username.includes(q) ||
        latestMessage.includes(q) ||
        labels.includes(q);

      return matchesSource && matchesSearch;
    });
    return filtered.sort((a, b) => {
      const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
      const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [conversations, activeSource, searchQuery]);

  const sourceCount = (src: ChannelSource) =>
    src === "All"
      ? conversations.length
      : conversations.filter(
          (c) => c.channel_name.toLowerCase() === src.toLowerCase(),
        ).length;

  const handleSelectConversation = (id: string) => {
    setSelectedConversationId(id);
    setReadConversationIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const handleCloseChat = () => {
    setSelectedConversationId(null);
  };

  const handleSendReply = async () => {
    const content = replyDraft.trim();
    if (!content) return;

    try {
      await sendMessage(content);
      setReplyDraft("");
    } catch {
      // error is surfaced via sendError in hook
    }
  };

  const displayName =
    conversation?.sender?.account_display_name ||
    conversation?.sender?.display_user_name ||
    "Unknown";

  return (
    <CrmShell activeNav="Conversations">
      <div className="flex h-screen max-h-screen flex-col gap-0 overflow-hidden p-4 md:p-6">
        {/* ── Header ── */}
        <PageHeader
          title="Conversations"
          subtitle="Manage conversations across all channels"
          onRefresh={() => void refetch()}
        />

        {/* ── Main Layout ── */}
        <div className="mt-4 flex min-h-0 flex-1 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* ── Left Panel: Conversation List ── */}
          <div className="flex w-[360px] shrink-0 flex-col border-r border-slate-200">
            {/* Search */}
            <div className="border-b border-slate-100 p-3">
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                  <Search className="h-4 w-4" aria-hidden="true" />
                </span>
                <input
                  type="search"
                  placeholder="Search conversations..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-9 w-full rounded-lg border border-slate-200 bg-slate-50 pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#FF6B4A]/40 focus:ring-2 focus:ring-[#FF6B4A]/10"
                />
              </div>
            </div>

            {/* Source Tabs */}
            <div className="flex gap-1 overflow-x-auto border-b border-slate-100 px-2 py-1.5">
              {sourceTabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveSource(tab)}
                  className={`flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium transition ${
                    activeSource === tab
                      ? "bg-[#FF6B4A]/10 text-[#FF6B4A]"
                      : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                  }`}
                >
                  {tab}
                  <span className="text-[10px] opacity-60">
                    {sourceCount(tab)}
                  </span>
                </button>
              ))}
            </div>

            {/* Conversation List */}
            <div className="crm-minimal-scroll flex-1 overflow-y-auto">
              {isLoading ? (
                <div className="space-y-1 p-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-3">
                      <SkeletonBox className="h-10 w-10 shrink-0 rounded-full" />
                      <div className="min-w-0 flex-1 space-y-2">
                        <SkeletonBox className="h-4 w-28 rounded-md" />
                        <SkeletonBox className="h-3 w-40 rounded-md" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : error ? (
                <div className="p-4 text-center">
                  <p className="text-sm text-red-500">{error}</p>
                  <button
                    type="button"
                    onClick={() => void refetch()}
                    className="mt-2 text-xs font-semibold text-red-600 underline"
                  >
                    Try again
                  </button>
                </div>
              ) : filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                  <MessageCircle className="mb-2 h-10 w-10" strokeWidth={1} />
                  <p className="text-sm">No conversations found</p>
                </div>
              ) : (
                <div className="space-y-0.5 p-2">
                  {filteredConversations.map((conversation) => (
                    <ConversationRow
                      key={conversation.id}
                      conversation={conversation}
                      isSelected={selectedConversationId === conversation.id}
                      isRead={readConversationIds.has(conversation.id)}
                      onClick={handleSelectConversation}
                    />
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* ── Right Panel: Chat ── */}
          <div className="flex flex-1 flex-col">
            {!selectedConversationId ? (
              <ChatPlaceholder />
            ) : (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white ${getChannelColor(
                        conversation?.channel_name || "",
                      )}`}
                    >
                      <ChannelIcon channel={conversation?.channel_name || ""} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {detailLoading ? (
                          <SkeletonBox className="h-4 w-32 rounded-md" />
                        ) : (
                          displayName
                        )}
                      </p>
                      <p className="text-xs text-slate-400 capitalize">
                        {conversation?.channel_name || ""}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setShowConvertModal(true)}
                      className="flex items-center gap-1.5 rounded-lg bg-[#FF6B4A]/10 px-2.5 py-1.5 text-xs font-semibold text-[#FF6B4A] transition hover:bg-[#FF6B4A]/20"
                      title="Convert to Lead"
                    >
                      <ArrowUpRight className="h-3.5 w-3.5" />
                      Convert to Lead
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowInfoPanel(!showInfoPanel)}
                      className={`rounded-lg p-2 transition ${
                        showInfoPanel
                          ? "bg-[#FF6B4A]/10 text-[#FF6B4A]"
                          : "text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                      }`}
                      title="Toggle info panel"
                    >
                      <User className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={handleCloseChat}
                      className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                      title="Close chat"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Messages + Info Panel */}
                <div className="flex flex-1 overflow-hidden">
                  {/* Messages Area */}
                  <div className="flex flex-1 flex-col">
                    <div className="crm-minimal-scroll flex-1 overflow-y-auto px-5 py-4">
                      {messagesLoading && messages.length === 0 ? (
                        <div className="flex h-full items-center justify-center">
                          <Loader2 className="h-6 w-6 animate-spin text-[#FF6B4A]" />
                        </div>
                      ) : messages.length === 0 ? (
                        <div className="flex h-full flex-col items-center justify-center text-slate-400">
                          <MessageCircle className="mb-2 h-10 w-10" strokeWidth={1} />
                          <p className="text-sm">No messages yet</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {messages.map((message) => (
                            <MessageBubble
                              key={message.id}
                              message={message}
                              sending={message.sending}
                            />
                          ))}
                          <div ref={messagesEndRef} />
                        </div>
                      )}
                    </div>

                    {/* Reply Input */}
                    <div className="border-t border-slate-100 px-5 py-3">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Type a message..."
                          value={replyDraft}
                          onChange={(e) => setReplyDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" && !e.shiftKey) {
                              e.preventDefault();
                              void handleSendReply();
                            }
                          }}
                          disabled={isSending}
                          className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-[#FF6B4A]/40 focus:ring-2 focus:ring-[#FF6B4A]/10 disabled:bg-slate-100"
                        />
                        <button
                          type="button"
                          onClick={() => void handleSendReply()}
                          disabled={isSending || !replyDraft.trim()}
                          className="flex h-10 w-10 items-center justify-center rounded-full bg-[#FF6B4A] text-white transition hover:bg-[#e55a39] disabled:cursor-not-allowed disabled:opacity-50"
                          aria-label="Send message"
                        >
                          {isSending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Info Panel */}
                  {showInfoPanel && conversation && (
                    <ConversationInfoPanel
                      conversation={conversation}
                      messages={messages}
                      meta={meta}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {selectedConversationId && (
        <ConvertToLeadModal
          isOpen={showConvertModal}
          onClose={() => setShowConvertModal(false)}
          sourceType="conversation"
          sourceId={selectedConversationId}
          defaultTitle={
            conversation
              ? `Lead from ${conversation.sender?.account_display_name || conversation.sender?.display_user_name || "conversation"}`
              : undefined
          }
          onConverted={() => refetch()}
        />
      )}
    </CrmShell>
  );
}
