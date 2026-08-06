"use client";

import { useConversationMessages } from "@/hooks/useConversations";
import type { ConversationMessage } from "@/types/conversation";
import { ChevronLeft, Loader2, MessageCircle, Send, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

function formatMsgTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

function MessageBubble({ message }: { message: ConversationMessage }) {
  const isUser = message.sender_type === "user";

  return (
    <div className={`flex w-full ${isUser ? "justify-start" : "justify-end"}`}>
      <div
        className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${
          isUser
            ? "rounded-tl-none bg-slate-100 text-slate-800"
            : "rounded-tr-none bg-[#FF6B4A] text-white"
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
              isUser ? "text-sky-700" : "text-white/80"
            }`}
          >
            Open image
          </a>
        )}
        <p
          className={`mt-1 text-right text-[11px] ${
            isUser ? "text-slate-400" : "text-white/70"
          }`}
        >
          {formatMsgTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

interface ConversationSheetProps {
  conversationId: string;
  contactName: string;
  channelName?: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ConversationSheet({
  conversationId,
  contactName,
  channelName,
  isOpen,
  onClose,
}: ConversationSheetProps) {
  const {
    messages,
    loading: messagesLoading,
    sendMessage,
    isSending,
  } = useConversationMessages(isOpen ? conversationId : null);

  const [replyDraft, setReplyDraft] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [isOpen, messages.length]);

  const handleSend = async () => {
    const content = replyDraft.trim();
    if (!content) return;
    try {
      await sendMessage(content);
      setReplyDraft("");
    } catch {
      // error surfaced via hook
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 z-[60] bg-black/30 transition-opacity" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 z-[60] flex w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FF6B4A] text-white">
            <MessageCircle className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{contactName}</p>
            {channelName && (
              <p className="text-xs text-slate-400 capitalize">{channelName}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="crm-minimal-scroll flex-1 overflow-y-auto px-4 py-4">
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
                <MessageBubble key={message.id} message={message} />
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Reply Input */}
        <div className="border-t border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Type a message..."
              value={replyDraft}
              onChange={(e) => setReplyDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              disabled={isSending}
              className="flex-1 rounded-full border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm outline-none transition focus:border-[#FF6B4A]/40 focus:ring-2 focus:ring-[#FF6B4A]/10 disabled:bg-slate-100"
            />
            <button
              type="button"
              onClick={() => void handleSend()}
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
    </>
  );
}
