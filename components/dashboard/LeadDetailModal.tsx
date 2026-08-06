"use client";

import { useLeads } from "@/hooks/useLeads";
import {
  fetchConversationMessages,
  sendConversationMessage,
} from "@/services/conversationService";
import type {
  ConversationMessage,
  ConversationMessagesResponse,
} from "@/types/conversation";
import type { Lead, UpdateLeadPayload } from "@/types/lead";
import { Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

interface LeadDetailModalProps {
  isOpen: boolean;
  leadId: string | null;
  onClose: () => void;
  onLeadUpdated?: () => void;
}

type TemperatureValue = "cold" | "warm" | "hot";

function normalizeTemperature(
  value: string | null | undefined,
): TemperatureValue {
  const normalized = (value ?? "warm").toLowerCase();
  if (normalized === "cold" || normalized === "hot") {
    return normalized;
  }
  return "warm";
}

export default function LeadDetailModal({
  isOpen,
  leadId,
  onClose,
  onLeadUpdated,
}: LeadDetailModalProps) {
  const { getAviontiveLeadById, editAviontiveLead, moveLeadToStage } =
    useLeads();
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [formData, setFormData] = useState<Partial<UpdateLeadPayload>>({});
  const [isMessageSheetOpen, setIsMessageSheetOpen] = useState(false);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messagesError, setMessagesError] = useState<string | null>(null);
  const [conversationMeta, setConversationMeta] = useState<Omit<
    ConversationMessagesResponse["data"],
    "messages"
  > | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [replyDraft, setReplyDraft] = useState("");
  const [isSendingReply, setIsSendingReply] = useState(false);

  const conversationId =
    lead?.conversation_id ||
    (typeof lead?.conversation?.id === "string" ? lead.conversation.id : null);

  const loadConversationMessages = async () => {
    if (!conversationId) {
      setMessagesError("This lead has no linked conversation.");
      return;
    }

    setMessagesLoading(true);
    setMessagesError(null);
    try {
      const response = await fetchConversationMessages(conversationId, 50);
      setMessages(response.data.messages || []);
      setConversationMeta({
        channel_account_id: response.data.channel_account_id,
        external_user_id: response.data.external_user_id,
        channel_name: response.data.channel_name,
        summary: response.data.summary,
        ai_reply: response.data.ai_reply,
        in_leads: response.data.in_leads,
        sender: response.data.sender,
        labels: response.data.labels,
      });
    } catch (err) {
      setMessagesError(
        err instanceof Error ? err.message : "Failed to load messages",
      );
    } finally {
      setMessagesLoading(false);
    }
  };

  // Fetch lead details
  useEffect(() => {
    if (!isOpen || !leadId) {
      setLead(null);
      return;
    }

    const fetchLead = async () => {
      setLoading(true);
      setError(null);
      try {
        const leadData = await getAviontiveLeadById(leadId);
        setLead(leadData);
        setFormData({
          title: leadData.title || "",
          notes: leadData.notes || "",
          amount: leadData.amount || undefined,
          currency: leadData.currency || "USD",
          temperature: leadData.temperature || "warm",
        });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to fetch lead");
      } finally {
        setLoading(false);
      }
    };

    fetchLead();
  }, [isOpen, leadId, getAviontiveLeadById]);

  const handleSave = async () => {
    if (!lead) return;

    setSaving(true);
    setError(null);
    try {
      await editAviontiveLead(lead.id as string, formData);
      setLead((prev) =>
        prev
          ? {
              ...prev,
              ...(Object.fromEntries(
                Object.entries(formData).filter(([, v]) => v !== null),
              ) as Partial<Lead>),
            }
          : null,
      );
      setIsEditing(false);
      onLeadUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save lead");
    } finally {
      setSaving(false);
    }
  };

  const handleMoveStage = async (stageId: string) => {
    if (!lead) return;

    setSaving(true);
    setError(null);
    try {
      const updated = await moveLeadToStage(lead.id as string, stageId);
      setLead(updated);
      onLeadUpdated?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to move lead");
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
        {loading ? (
          <div className="space-y-4 p-6">
            <div className="h-8 w-48 rounded-lg bg-slate-200 animate-pulse" />
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="h-4 rounded-lg bg-slate-200 animate-pulse"
                />
              ))}
            </div>
          </div>
        ) : lead ? (
          <>
            {/* Header */}
            <div className="border-b border-slate-100 bg-linear-to-r from-sky-50 to-cyan-50 px-6 py-4 flex items-start justify-between">
              <div>
                <h2 className="text-xl font-bold text-slate-900">
                  {lead.title || lead.name || "Lead Details"}
                </h2>
                <p className="mt-1 text-sm text-slate-500">ID: {lead.id}</p>
              </div>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 transition"
              >
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            {/* Content */}
            <div className="space-y-6 p-6">
              {error && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Contact Information */}
              {lead.contact && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900">
                    Contact Information
                  </h3>
                  <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">Name</p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {lead.contact.full_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">
                        Email
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {lead.contact.email || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">
                        Phone
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {lead.contact.phone || "N/A"}
                      </p>
                    </div>
                    {lead.contact.notes && (
                      <div>
                        <p className="text-xs text-slate-500 font-medium">
                          Notes
                        </p>
                        <p className="mt-1 text-sm font-semibold text-slate-900">
                          {lead.contact.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Lead Details */}
              {!isEditing ? (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900">Lead Details</h3>
                  <div className="grid grid-cols-2 gap-4 rounded-lg bg-slate-50 p-4">
                    <div>
                      <p className="text-xs text-slate-500 font-medium">
                        Stage
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {lead.stage?.name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">
                        Temperature
                      </p>
                      <div className="mt-1">
                        <TempBadge
                          temp={normalizeTemperature(lead.temperature)}
                        />
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">
                        Amount
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {lead.amount}
                        {lead.currency ? ` ${lead.currency}` : ""}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500 font-medium">
                        Source
                      </p>
                      <p className="mt-1 text-sm font-semibold text-slate-900">
                        {lead.source || "N/A"}
                      </p>
                    </div>
                  </div>
                  {lead.notes && (
                    <div className="rounded-lg bg-slate-50 p-4">
                      <p className="text-xs text-slate-500 font-medium">
                        Notes
                      </p>
                      <p className="mt-2 text-sm text-slate-700">
                        {lead.notes}
                      </p>
                    </div>
                  )}

                  <div className="rounded-lg border border-slate-200 bg-white p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-medium text-slate-500">
                          Conversation Messages
                        </p>
                        <p className="mt-1 text-sm text-slate-700">
                          {conversationId
                            ? `Conversation ID: ${conversationId}`
                            : "No conversation linked with this lead."}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          setIsMessageSheetOpen(true);
                          await loadConversationMessages();
                        }}
                        disabled={!conversationId || messagesLoading}
                        className="rounded-lg border border-[#FDDDD6] bg-[#FFF1EE] px-3 py-2 text-xs font-semibold text-[#FF6B4A] transition hover:bg-[#FDDDD6] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {messagesLoading ? "Loading..." : "View Messages"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="font-semibold text-slate-900">
                    Edit Lead Details
                  </h3>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Title
                    </label>
                    <input
                      type="text"
                      value={formData.title || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Amount
                    </label>
                    <div className="mt-1 flex gap-2">
                      <input
                        type="number"
                        value={formData.amount || ""}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            amount: e.target.value
                              ? parseFloat(e.target.value)
                              : null,
                          }))
                        }
                        className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
                      />
                      <select
                        value={formData.currency || "USD"}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            currency: e.target.value,
                          }))
                        }
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
                      >
                        <option>USD</option>
                        <option>EUR</option>
                        <option>GBP</option>
                        <option>INR</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Temperature
                    </label>
                    <select
                      value={formData.temperature || "warm"}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          temperature: e.target.value as TemperatureValue,
                        }))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    >
                      <option value="cold">Cold</option>
                      <option value="warm">Warm</option>
                      <option value="hot">Hot</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700">
                      Notes
                    </label>
                    <textarea
                      value={formData.notes || ""}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      rows={4}
                      className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100"
                    />
                  </div>
                </div>
              )}

              {/* Stage Section */}
              {lead.stage && (
                <div className="space-y-3">
                  <h3 className="font-semibold text-slate-900">
                    Move to Stage
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { id: "stage_new", name: "New" },
                      { id: "stage_contacted", name: "Contacted" },
                      { id: "stage_qualified", name: "Qualified" },
                      { id: "stage_negotiation", name: "Negotiation" },
                      { id: "stage_won", name: "Won" },
                      { id: "stage_lost", name: "Lost" },
                    ].map((stage) => (
                      <button
                        key={stage.id}
                        onClick={() => handleMoveStage(stage.id)}
                        disabled={isSaving || stage.id === lead.stage_id}
                        className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                          stage.id === lead.stage_id
                            ? "bg-[#FF6B4A] text-white"
                            : "border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                        }`}
                      >
                        {stage.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="border-t border-slate-100 bg-slate-50 px-6 py-4 flex justify-end gap-3">
              {!isEditing ? (
                <>
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#FF6B4A] rounded-lg hover:bg-[#e55a39] transition"
                  >
                    Edit Lead
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => setIsEditing(false)}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-200 rounded-lg hover:bg-slate-50 transition disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={isSaving}
                    className="px-4 py-2 text-sm font-medium text-white bg-[#FF6B4A] rounded-lg hover:bg-[#e55a39] transition disabled:opacity-50 flex items-center gap-2"
                  >
                    {isSaving && (
                      <Loader2
                        className="h-4 w-4 animate-spin"
                        aria-hidden="true"
                      />
                    )}
                    {isSaving ? "Saving..." : "Save Changes"}
                  </button>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="p-6 text-center text-slate-500">Lead not found</div>
        )}
      </div>

      {isMessageSheetOpen && (
        <div className="fixed inset-0 z-60 bg-black/30">
          <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Message Details
                </h3>
                <p className="mt-1 text-xs text-slate-500">
                  {conversationId || "No conversation ID"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsMessageSheetOpen(false)}
                className="text-slate-400 hover:text-slate-600"
                aria-label="Close message details"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            {conversationMeta && (
              <div className="border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs text-slate-600">
                <p>
                  Channel: {conversationMeta.channel_name || "N/A"} | AI Reply:{" "}
                  {conversationMeta.ai_reply ? "Yes" : "No"}
                </p>
                <p>
                  Sender:{" "}
                  {conversationMeta.sender?.account_display_name ||
                    conversationMeta.sender?.account_user_name ||
                    "N/A"}
                </p>
              </div>
            )}

            <div className="h-[calc(100%-220px)] overflow-y-auto px-5 py-4">
              {messagesLoading ? (
                <div className="flex items-center gap-2 text-sm text-slate-500">
                  <Loader2
                    className="h-4 w-4 animate-spin"
                    aria-hidden="true"
                  />
                  Loading messages...
                </div>
              ) : messagesError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {messagesError}
                </div>
              ) : messages.length === 0 ? (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
                  No messages found.
                </div>
              ) : (
                <div className="space-y-3">
                  {messages.map((message) => {
                    const isUser = message.sender_type === "user";

                    return (
                      <div
                        key={message.id}
                        className={`flex ${isUser ? "justify-start" : "justify-end"}`}
                      >
                        <div
                          className={`max-w-[82%] rounded-xl px-3 py-2 text-sm ${
                            isUser
                              ? "border border-slate-200 bg-white text-slate-800"
                              : "bg-sky-600 text-white"
                          }`}
                        >
                          <p className="whitespace-pre-wrap wrap-break-word">
                            {message.content ||
                              message.description ||
                              "(No text content)"}
                          </p>
                          {message.image_url && (
                            <a
                              href={message.image_url}
                              target="_blank"
                              rel="noreferrer"
                              className={`mt-2 block text-xs underline ${isUser ? "text-sky-700" : "text-sky-100"}`}
                            >
                              Open image
                            </a>
                          )}
                          <p
                            className={`mt-1 text-[11px] ${
                              isUser ? "text-slate-500" : "text-sky-100"
                            }`}
                          >
                            {message.sender_type} •{" "}
                            {new Date(message.created_at).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 px-5 py-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a reply..."
                  value={replyDraft}
                  onChange={(event) => setReplyDraft(event.target.value)}
                  disabled={!conversationId || isSendingReply}
                  className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-sky-300 focus:outline-none focus:ring-2 focus:ring-sky-100 disabled:cursor-not-allowed disabled:bg-slate-100"
                />
                <button
                  type="button"
                  onClick={async () => {
                    const content = replyDraft.trim();
                    if (!conversationId || !content) return;

                    setIsSendingReply(true);
                    setMessagesError(null);
                    try {
                      await sendConversationMessage({
                        conversation_id: conversationId,
                        content,
                      });
                      setReplyDraft("");
                      await loadConversationMessages();
                    } catch (err) {
                      setMessagesError(
                        err instanceof Error
                          ? err.message
                          : "Failed to send message",
                      );
                    } finally {
                      setIsSendingReply(false);
                    }
                  }}
                  disabled={
                    !conversationId || isSendingReply || !replyDraft.trim()
                  }
                  className="rounded-lg bg-[#FF6B4A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e55a39] disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  {isSendingReply ? "Sending..." : "Send"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TempBadge({
  temp,
}: {
  temp: "cold" | "warm" | "hot" | "COLD" | "WARM" | "HOT";
}) {
  const tempLower = temp.toLowerCase() as "cold" | "warm" | "hot";
  const styles: Record<string, string> = {
    hot: "border border-red-300 bg-red-50 text-red-600",
    warm: "border border-orange-300 bg-orange-50 text-orange-500",
    cold: "border border-sky-300 bg-sky-50 text-sky-600",
  };
  const dots: Record<string, string> = {
    hot: "bg-red-500",
    warm: "bg-orange-400",
    cold: "bg-sky-500",
  };
  const displayText = temp.toUpperCase();

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold tracking-wide ${styles[tempLower]}`}
    >
      <span className={`h-2 w-2 rounded-full ${dots[tempLower]}`} />
      {displayText}
    </span>
  );
}
