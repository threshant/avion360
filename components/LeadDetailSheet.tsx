"use client";

import CallSheet from "@/components/CallSheet";
import ConversationSheet from "@/components/ConversationSheet";
import { useAssignees, type Assignee } from "@/hooks/useAssignees";
import type { LeadTemperature } from "@/types/lead";
import {
  ChevronDown,
  Edit3,
  Loader2,
  MessageCircle,
  Package,
  Phone,
  ShoppingBag,
  Truck,
  User,
  UserCircle,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

export interface LeadDetailData {
  id: string;
  name: string;
  temperature: string;
  source: string;
  assignedTo: string | null;
  stage_name: string | null;
  conversation_id: string | null;
  call_id: string | null;
  phone: string | null;
  email: string | null;
  notes: string | null;
  custom_fields?: {
    product_name?: string;
    whatsapp_contact?: string;
    quantity?: string;
    services?: string;
  } | null;
}

interface LeadDetailSheetProps {
  lead: LeadDetailData | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdated?: (updated: Partial<LeadDetailData>) => void;
}

function tempBadge(temp: string) {
  const upper = (temp || "").toUpperCase() as LeadTemperature;
  if (upper === "HOT") return "text-red-600 bg-red-50 border border-red-200";
  if (upper === "COLD") return "text-blue-600 bg-blue-50 border border-blue-200";
  return "text-amber-600 bg-amber-50 border border-amber-200";
}

function sourceColor(source: string) {
  const s = (source || "").toLowerCase();
  if (s === "whatsapp") return "bg-green-50 text-green-700 border border-green-200";
  if (s === "calls" || s === "call") return "bg-sky-50 text-sky-700 border border-sky-200";
  if (s === "instagram") return "bg-pink-50 text-pink-700 border border-pink-200";
  if (s === "facebook") return "bg-blue-50 text-blue-700 border border-blue-200";
  if (s === "email") return "bg-purple-50 text-purple-700 border border-purple-200";
  return "bg-slate-50 text-slate-600 border border-slate-200";
}

// ─── Editable Field ───────────────────────────────────────────────────────────

function EditableField({
  label,
  value,
  type = "text",
  onChange,
  multiline = false,
  rows = 2,
  placeholder,
}: {
  label: string;
  value: string;
  type?: string;
  onChange: (val: string) => void;
  multiline?: boolean;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-slate-400">{label}</label>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          rows={rows}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#FF6B4A]/40 focus:ring-2 focus:ring-[#FF6B4A]/10"
        />
      ) : (
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#FF6B4A]/40 focus:ring-2 focus:ring-[#FF6B4A]/10"
        />
      )}
    </div>
  );
}

// ─── Main Sheet ───────────────────────────────────────────────────────────────

export default function LeadDetailSheet({
  lead,
  isOpen,
  onClose,
  onUpdated,
}: LeadDetailSheetProps) {
  const { assignees, loading: assigneesLoading } = useAssignees(isOpen);
  const [assigning, setAssigning] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  // Editable state
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editTemperature, setEditTemperature] = useState<LeadTemperature>("WARM");
  const [editNotes, setEditNotes] = useState("");
  const [editProductName, setEditProductName] = useState("");
  const [editWhatsappContact, setEditWhatsappContact] = useState("");
  const [editQuantity, setEditQuantity] = useState("");
  const [editServices, setEditServices] = useState("");

  const [showConversationSheet, setShowConversationSheet] = useState(false);
  const [showCallSheet, setShowCallSheet] = useState(false);

  // Sync editable state when lead changes or sheet opens
  useEffect(() => {
    if (lead && isOpen) {
      setEditName(lead.name || "");
      setEditPhone(lead.phone && lead.phone !== "N/A" ? lead.phone : "");
      setEditEmail(lead.email && lead.email !== "N/A" ? lead.email : "");
      setEditTemperature((lead.temperature || "WARM").toUpperCase() as LeadTemperature);
      setEditNotes(lead.notes || "");
      setEditProductName(lead.custom_fields?.product_name || "");
      setEditWhatsappContact(lead.custom_fields?.whatsapp_contact || "");
      setEditQuantity(lead.custom_fields?.quantity || "");
      setEditServices(lead.custom_fields?.services || "");
      setEditing(false);
      setShowConversationSheet(false);
      setShowCallSheet(false);
    }
  }, [isOpen, lead?.id]);

  const handleAssign = async (userId: string) => {
    if (!lead) return;
    setAssigning(true);
    try {
      const res = await fetch("/api/leads/aviontive/overrides", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, assignedTo: userId || null }),
      });
      if (!res.ok) throw new Error("Failed to assign");
      const assigneeName = assignees.find((a) => a.id === userId)?.name || null;
      onUpdated?.({ assignedTo: assigneeName });
    } catch {
      // silently fail
    } finally {
      setAssigning(false);
    }
  };

  const handleSave = async () => {
    if (!lead) return;
    setSaving(true);
    try {
      const customFields: Record<string, string> = {};
      if (editProductName.trim()) customFields.product_name = editProductName.trim();
      if (editWhatsappContact.trim()) customFields.whatsapp_contact = editWhatsappContact.trim();
      if (editQuantity.trim()) customFields.quantity = editQuantity.trim();
      if (editServices) customFields.services = editServices;

      const res = await fetch(`/api/leads/${encodeURIComponent(lead.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          phone: editPhone.trim(),
          email: editEmail.trim(),
          temperature: editTemperature,
          notes: editNotes.trim(),
          custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onUpdated?.({
        name: editName.trim() || lead.name,
        phone: editPhone.trim() || null,
        email: editEmail.trim() || null,
        temperature: editTemperature,
        notes: editNotes.trim() || null,
        custom_fields: Object.keys(customFields).length > 0 ? customFields : null,
      });
      setEditing(false);
    } catch {
      // silently fail
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen || !lead) return null;

  const currentAssignee = assignees.find((a) => a.name === lead.assignedTo);

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/30 transition-opacity" onClick={onClose} />

      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="min-w-0 flex-1">
            {editing ? (
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2 py-1 text-lg font-semibold outline-none focus:border-[#FF6B4A]/40"
              />
            ) : (
              <h2 className="truncate text-lg font-semibold text-slate-900">{lead.name}</h2>
            )}
            {lead.stage_name && (
              <p className="mt-0.5 text-sm text-slate-500">{lead.stage_name}</p>
            )}
          </div>
          <div className="ml-3 flex items-center gap-1">
            {editing ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setEditing(false);
                    setEditName(lead.name || "");
                    setEditPhone(lead.phone && lead.phone !== "N/A" ? lead.phone : "");
                    setEditEmail(lead.email && lead.email !== "N/A" ? lead.email : "");
                    setEditTemperature((lead.temperature || "WARM").toUpperCase() as LeadTemperature);
                    setEditNotes(lead.notes || "");
                    setEditProductName(lead.custom_fields?.product_name || "");
                    setEditWhatsappContact(lead.custom_fields?.whatsapp_contact || "");
                    setEditQuantity(lead.custom_fields?.quantity || "");
                    setEditServices(lead.custom_fields?.services || "");
                  }}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  <X className="h-3.5 w-3.5" />
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#FF6B4A] px-3 text-xs font-semibold text-white transition hover:bg-[#e55a39] disabled:opacity-50"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Save"}
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <Edit3 className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="crm-minimal-scroll flex-1 overflow-y-auto px-6 py-5">
          {/* Tags row */}
          <div className="mb-6 flex flex-wrap items-center gap-2">
            {editing ? (
              <div className="flex gap-1.5">
                {(["HOT", "WARM", "COLD"] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setEditTemperature(t)}
                    className={`rounded-full px-2.5 py-1 text-xs font-bold transition ${
                      editTemperature === t
                        ? t === "HOT"
                          ? "bg-red-100 text-red-700 ring-2 ring-red-300"
                          : t === "COLD"
                            ? "bg-blue-100 text-blue-700 ring-2 ring-blue-300"
                            : "bg-amber-100 text-amber-700 ring-2 ring-amber-300"
                        : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            ) : (
              <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tempBadge(lead.temperature)}`}>
                {(lead.temperature || "WARM").toUpperCase()}
              </span>
            )}
            <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${sourceColor(lead.source)}`}>
              {lead.source || "Unknown"}
            </span>
          </div>

          {/* Details */}
          <div className="space-y-4">
            {/* Assigned to */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <User className="h-4 w-4 text-slate-500" />
              </div>
              <div className="flex-1">
                <p className="mb-1 text-xs font-medium text-slate-400">Assigned to</p>
                {assigneesLoading ? (
                  <div className="h-9 w-full animate-pulse rounded-lg bg-slate-100" />
                ) : (
                  <div className="relative">
                    <select
                      value={currentAssignee?.id || ""}
                      onChange={(e) => void handleAssign(e.target.value)}
                      disabled={assigning}
                      className="w-full appearance-none rounded-xl border border-slate-200 bg-white px-3 py-2 pr-8 text-sm outline-none transition focus:border-[#FF6B4A]/40 focus:ring-2 focus:ring-[#FF6B4A]/10 disabled:opacity-50"
                    >
                      <option value="">Unassigned</option>
                      {assignees.map((a: Assignee) => (
                        <option key={a.id} value={a.id}>{a.name} ({a.email})</option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  </div>
                )}
              </div>
            </div>

            {/* Phone */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Phone className="h-4 w-4 text-slate-500" />
              </div>
              <div className="flex-1">
                {editing ? (
                  <EditableField label="Phone" value={editPhone} type="tel" onChange={setEditPhone} placeholder="+91 98765 43210" />
                ) : (
                  <>
                    <p className="text-xs font-medium text-slate-400">Phone</p>
                    <p className="text-sm font-medium text-slate-700">{lead.phone && lead.phone !== "N/A" ? lead.phone : "—"}</p>
                  </>
                )}
              </div>
            </div>

            {/* Email */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <UserCircle className="h-4 w-4 text-slate-500" />
              </div>
              <div className="flex-1">
                {editing ? (
                  <EditableField label="Email" value={editEmail} type="email" onChange={setEditEmail} placeholder="email@example.com" />
                ) : (
                  <>
                    <p className="text-xs font-medium text-slate-400">Email</p>
                    <p className="text-sm font-medium text-slate-700">{lead.email && lead.email !== "N/A" ? lead.email : "—"}</p>
                  </>
                )}
              </div>
            </div>

            {/* Notes */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                <Edit3 className="h-4 w-4 text-slate-500" />
              </div>
              <div className="flex-1">
                {editing ? (
                  <EditableField label="Notes" value={editNotes} onChange={setEditNotes} multiline rows={4} placeholder="Add notes about this lead..." />
                ) : (
                  <>
                    <p className="text-xs font-medium text-slate-400">Notes</p>
                    {lead.notes ? (
                      <p className="whitespace-pre-wrap text-sm text-slate-700">{lead.notes}</p>
                    ) : (
                      <p className="text-sm text-slate-400">No notes</p>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Custom Fields */}
          <div className="mt-6 border-t border-slate-100 pt-5">
            <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Additional Details</p>
            <div className="space-y-4">
              {/* Product Name */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <Package className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1">
                  {editing ? (
                    <EditableField label="Product Name" value={editProductName} onChange={setEditProductName} placeholder="Product name" />
                  ) : (
                    <>
                      <p className="text-xs font-medium text-slate-400">Product Name</p>
                      <p className="text-sm font-medium text-slate-700">{lead.custom_fields?.product_name || "—"}</p>
                    </>
                  )}
                </div>
              </div>

              {/* WhatsApp Contact */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <Phone className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1">
                  {editing ? (
                    <EditableField label="WhatsApp Contact" value={editWhatsappContact} type="tel" onChange={setEditWhatsappContact} placeholder="+91 98765 43210" />
                  ) : (
                    <>
                      <p className="text-xs font-medium text-slate-400">WhatsApp Contact</p>
                      <p className="text-sm font-medium text-slate-700">{lead.custom_fields?.whatsapp_contact || "—"}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Quantity */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <ShoppingBag className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1">
                  {editing ? (
                    <EditableField label="Quantity" value={editQuantity} onChange={setEditQuantity} placeholder="e.g. 100 pcs" />
                  ) : (
                    <>
                      <p className="text-xs font-medium text-slate-400">Quantity</p>
                      <p className="text-sm font-medium text-slate-700">{lead.custom_fields?.quantity || "—"}</p>
                    </>
                  )}
                </div>
              </div>

              {/* Services */}
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100">
                  <Truck className="h-4 w-4 text-slate-500" />
                </div>
                <div className="flex-1">
                  {editing ? (
                    <div>
                      <label className="mb-1 block text-xs font-medium text-slate-400">Services</label>
                      <select
                        value={editServices}
                        onChange={(e) => setEditServices(e.target.value)}
                        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm outline-none transition focus:border-[#FF6B4A]/40 focus:ring-2 focus:ring-[#FF6B4A]/10"
                      >
                        <option value="">Select a service</option>
                        <option value="Logistic">Logistic</option>
                        <option value="Sourcing">Sourcing</option>
                        <option value="Trip">Trip</option>
                        <option value="Interior">Interior</option>
                      </select>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs font-medium text-slate-400">Services</p>
                      <p className="text-sm font-medium text-slate-700">{lead.custom_fields?.services || "—"}</p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Linked source */}
          {(lead.conversation_id || lead.call_id) && (
            <div className="mt-8 border-t border-slate-100 pt-5">
              <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-400">Linked Source</p>
              <div className="flex flex-col gap-2">
                {lead.conversation_id && (
                  <button
                    type="button"
                    onClick={() => setShowConversationSheet(true)}
                    className="flex items-center gap-3 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm font-medium text-green-700 transition hover:bg-green-100"
                  >
                    <MessageCircle className="h-4 w-4" />
                    <span className="flex-1 text-left">View Conversation</span>
                  </button>
                )}
                {lead.call_id && (
                  <button
                    type="button"
                    onClick={() => setShowCallSheet(true)}
                    className="flex items-center gap-3 rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-medium text-sky-700 transition hover:bg-sky-100"
                  >
                    <Phone className="h-4 w-4" />
                    <span className="flex-1 text-left">View Call</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {lead.conversation_id && (
        <ConversationSheet
          conversationId={lead.conversation_id}
          contactName={lead.name}
          channelName={lead.source}
          isOpen={showConversationSheet}
          onClose={() => setShowConversationSheet(false)}
        />
      )}

      {lead.call_id && (
        <CallSheet
          callId={lead.call_id}
          leadName={lead.name}
          leadPhone={lead.phone}
          isOpen={showCallSheet}
          onClose={() => setShowCallSheet(false)}
        />
      )}
    </>
  );
}
