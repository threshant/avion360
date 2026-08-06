"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  useConversationDetail,
  useConversationMessages,
} from "@/hooks/useConversations";
import type { ConversationMessage } from "@/types/conversation";
import {
  Loader2,
  Mail,
  MessageCircle,
  MessageSquare,
  Plus,
  Send,
  User,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

interface ConversationDetailSheetProps {
  conversationId: string | null;
  isOpen: boolean;
  onClose: () => void;
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

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.sender_type === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "rounded-tl-none bg-slate-100 text-slate-800"
            : "rounded-tr-none bg-sky-600 text-white"
        }`}
      >
        <p className="whitespace-pre-wrap break-words">
          {message.content ||
            message.description ||
            (message.image_url ? "Image" : "(No content)")}
        </p>
        {message.image_url && (
          <a
            href={message.image_url}
            target="_blank"
            rel="noreferrer"
            className={`mt-2 block text-xs underline ${
              isUser ? "text-sky-700" : "text-sky-100"
            }`}
          >
            Open image
          </a>
        )}
        <p
          className={`mt-1 text-right text-[11px] ${
            isUser ? "text-slate-500" : "text-sky-100"
          }`}
        >
          {formatMessageTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

function SectionCard({
  title,
  children,
  action,
}: {
  title: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="border-b border-slate-100 px-5 py-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">{title}</h4>
        {action}
      </div>
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
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
        checked ? "bg-[#FF6B4A]" : "bg-slate-200"
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${
          checked ? "translate-x-6" : "translate-x-1"
        }`}
      />
    </button>
  );
}

export default function ConversationDetailSheet({
  conversationId,
  isOpen,
  onClose,
}: ConversationDetailSheetProps) {
  const { conversation, loading: detailLoading } =
    useConversationDetail(conversationId);
  const {
    messages,
    meta,
    loading: messagesLoading,
    sendMessage,
    isSending,
  } = useConversationMessages(conversationId);

  const [replyDraft, setReplyDraft] = useState("");
  const [taskDraft, setTaskDraft] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages]);

  const displayName =
    conversation?.sender?.account_display_name ||
    conversation?.sender?.display_user_name ||
    "Unknown";

  const username =
    conversation?.sender?.display_user_name ||
    conversation?.sender?.account_user_name ||
    "—";

  const channelName = conversation?.channel_name || "—";
  const totalMessages = messages.length;
  const startedOn = conversation?.created_at
    ? formatDate(conversation.created_at)
    : "—";

  const handleSendReply = async () => {
    const content = replyDraft.trim();
    if (!content) return;

    try {
      await sendMessage(content);
      setReplyDraft("");
    } catch {
      // error is surfaced via sendError in hook, kept local for UI
    }
  };

  const isLoading = detailLoading || messagesLoading;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent side="right" className="flex w-full max-w-4xl flex-col p-0">
        <div className="flex h-full flex-col">
          {/* Header */}
          <div className="border-b border-slate-200 px-5 py-4">
            <SheetHeader className="space-y-0">
              <div className="flex items-start justify-between">
                <div>
                  <SheetTitle className="text-base font-semibold text-slate-900">
                    Conversation
                  </SheetTitle>
                  <p className="text-sm text-slate-500">With {displayName}</p>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                  aria-label="Close conversation"
                >
                  <X className="h-5 w-5" aria-hidden="true" />
                </button>
              </div>
            </SheetHeader>
          </div>

          {isLoading && !conversation ? (
            <div className="flex flex-1 items-center justify-center">
              <Loader2
                className="h-6 w-6 animate-spin text-sky-600"
                aria-hidden="true"
              />
            </div>
          ) : (
            <div className="flex flex-1 overflow-hidden">
              {/* Messages column */}
              <div className="flex flex-1 flex-col border-r border-slate-200">
                <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
                  {messages.length === 0 ? (
                    <div className="flex h-full flex-col items-center justify-center text-slate-400">
                      <MessageCircle className="mb-2 h-10 w-10" />
                      <p className="text-sm">No messages yet.</p>
                    </div>
                  ) : (
                    messages.map((message) => (
                      <MessageBubble key={message.id} message={message} />
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Reply input */}
                <div className="border-t border-slate-200 px-5 py-4">
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
                      className="flex-1 rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100 disabled:bg-slate-100"
                    />
                    <button
                      type="button"
                      onClick={() => void handleSendReply()}
                      disabled={isSending || !replyDraft.trim()}
                      className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-500 text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                      aria-label="Send message"
                    >
                      {isSending ? (
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />
                      ) : (
                        <Send className="h-4 w-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* Sidebar info */}
              <div className="w-[360px] shrink-0 overflow-y-auto bg-white">
                {/* Tags */}
                <SectionCard
                  title="Tags"
                  action={
                    <button
                      type="button"
                      className="flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                      Add Label
                    </button>
                  }
                >
                  <div className="flex flex-wrap gap-2">
                    {conversation?.labels && conversation.labels.length > 0 ? (
                      conversation.labels.map((label) => (
                        <span
                          key={label.id}
                          className="rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{
                            backgroundColor: label.color
                              ? `${label.color}20`
                              : "#f1f5f9",
                            color: label.color || "#475569",
                          }}
                        >
                          {label.name}
                        </span>
                      ))
                    ) : (
                      <span className="text-sm text-slate-400">
                        No labels yet.
                      </span>
                    )}
                  </div>
                </SectionCard>

                {/* AI replies */}
                <SectionCard title="AI replies">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">
                      AI replies enabled
                    </span>
                    <Toggle checked={conversation?.ai_reply ?? false} />
                  </div>
                  <button
                    type="button"
                    className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Promote Conversation To Lead
                  </button>
                </SectionCard>

                {/* Summary */}
                <SectionCard
                  title="Summary"
                  action={
                    <span className="rounded-full bg-gradient-to-r from-pink-500 to-violet-500 px-2 py-0.5 text-[10px] font-semibold text-white">
                      AI Generated
                    </span>
                  }
                >
                  <p className="text-sm text-slate-600">
                    {conversation?.summary ||
                      meta?.summary ||
                      "No summary available yet. Send messages to generate summary."}
                  </p>
                </SectionCard>

                {/* Actions */}
                <SectionCard title="Actions">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Add a task"
                      value={taskDraft}
                      onChange={(e) => setTaskDraft(e.target.value)}
                      className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                    />
                    <button
                      type="button"
                      className="rounded-lg bg-slate-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-600 disabled:opacity-50"
                      disabled={!taskDraft.trim()}
                    >
                      Add
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">No actions yet.</p>
                </SectionCard>

                {/* Followups */}
                <SectionCard
                  title="Followups"
                  action={
                    <button
                      type="button"
                      className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-slate-800"
                    >
                      Configure
                    </button>
                  }
                >
                  <p className="text-sm text-slate-400">
                    No followups scheduled.
                  </p>
                </SectionCard>

                {/* Conversation Details */}
                <SectionCard title="Conversation Details">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Total Messages</span>
                      <span className="font-medium text-slate-900">
                        {totalMessages}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Started On</span>
                      <span className="font-medium text-slate-900">
                        {startedOn}
                      </span>
                    </div>
                  </div>
                </SectionCard>

                {/* User Details */}
                <SectionCard title="User Details">
                  <div className="space-y-3">
                    <div className="flex items-center gap-3 text-sm">
                      <User className="h-4 w-4 text-slate-400" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500">Username</p>
                        <p className="font-medium text-slate-900">{username}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <MessageSquare className="h-4 w-4 text-slate-400" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500">Full name</p>
                        <p className="font-medium text-slate-900">
                          {displayName}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Mail className="h-4 w-4 text-slate-400" />
                      <div className="flex-1">
                        <p className="text-xs text-slate-500">Channel</p>
                        <p className="font-medium capitalize text-slate-900">
                          {channelName}
                        </p>
                      </div>
                    </div>
                  </div>
                </SectionCard>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
