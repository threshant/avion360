"use client";

import { useAssignees, type Assignee } from "@/hooks/useAssignees";
import { usePipelines } from "@/hooks/usePipelines";
import type { LeadTemperature } from "@/types/lead";
import { ChevronDown, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

interface CreateLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

const TEMPERATURES: { value: LeadTemperature; label: string }[] = [
  { value: "HOT", label: "Hot" },
  { value: "WARM", label: "Warm" },
  { value: "COLD", label: "Cold" },
];

const SERVICES = ["Logistic", "Sourcing", "Trip", "Interior"];

export default function CreateLeadModal({
  isOpen,
  onClose,
  onCreated,
}: CreateLeadModalProps) {
  const { pipelines, loading: pipelinesLoading } = usePipelines();
  const { assignees, loading: assigneesLoading } = useAssignees(isOpen);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [temperature, setTemperature] = useState<LeadTemperature>("WARM");
  const [selectedPipelineId, setSelectedPipelineId] = useState("");
  const [selectedStageId, setSelectedStageId] = useState("");
  const [notes, setNotes] = useState("");
  const [assignedTo, setAssignedTo] = useState("");
  const [productName, setProductName] = useState("");
  const [whatsappContact, setWhatsappContact] = useState("");
  const [quantity, setQuantity] = useState("");
  const [services, setServices] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const selectedPipeline = pipelines.find((p) => p.id === selectedPipelineId);
  const stages = selectedPipeline?.stages || [];

  useEffect(() => {
    if (isOpen && pipelines.length > 0 && !selectedPipelineId) {
      setSelectedPipelineId(pipelines[0].id);
    }
  }, [isOpen, pipelines, selectedPipelineId]);

  useEffect(() => {
    if (stages.length > 0 && !stages.find((s) => s.id === selectedStageId)) {
      setSelectedStageId(stages[0].id);
    }
  }, [stages, selectedStageId]);

  useEffect(() => {
    if (!isOpen) {
      setName("");
      setPhone("");
      setEmail("");
      setTemperature("WARM");
      setSelectedStageId("");
      setNotes("");
      setAssignedTo("");
      setProductName("");
      setWhatsappContact("");
      setQuantity("");
      setServices("");
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    setError("");

    try {
      const customFields: Record<string, string> = {};
      if (productName.trim()) customFields.product_name = productName.trim();
      if (whatsappContact.trim()) customFields.whatsapp_contact = whatsappContact.trim();
      if (quantity.trim()) customFields.quantity = quantity.trim();
      if (services) customFields.services = services;

      const res = await fetch("/api/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: name.trim(),
          name: name.trim(),
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          temperature,
          pipeline_id: selectedPipelineId || undefined,
          pipeline_name: selectedPipeline?.name || undefined,
          stage_id: selectedStageId || undefined,
          stage_name: stages.find((s) => s.id === selectedStageId)?.name || "New",
          notes: notes.trim() || undefined,
          source: "manual",
          assigned_to: assignedTo || undefined,
          custom_fields: Object.keys(customFields).length > 0 ? customFields : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to create lead");
      }
      onCreated?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create lead");
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-1 text-lg font-semibold text-slate-900">Create Lead</h2>
        <p className="mb-5 text-sm text-slate-500">
          Add a new lead manually
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">
              Name <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contact or company name"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#FF6B4A]/40 focus:ring-2 focus:ring-[#FF6B4A]/10"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Phone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#FF6B4A]/40 focus:ring-2 focus:ring-[#FF6B4A]/10"
            />
          </div>

          {/* Email */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#FF6B4A]/40 focus:ring-2 focus:ring-[#FF6B4A]/10"
            />
          </div>

          {/* Temperature */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Temperature</label>
            <div className="flex gap-2">
              {TEMPERATURES.map((t) => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTemperature(t.value)}
                  className={`flex-1 rounded-xl border px-3 py-2 text-sm font-medium transition ${
                    temperature === t.value
                      ? t.value === "HOT"
                        ? "border-red-300 bg-red-50 text-red-700"
                        : t.value === "COLD"
                          ? "border-blue-300 bg-blue-50 text-blue-700"
                          : "border-amber-300 bg-amber-50 text-amber-700"
                      : "border-slate-200 text-slate-500 hover:bg-slate-50"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Assign To */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Assign To</label>
            {assigneesLoading ? (
              <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ) : (
              <div className="relative">
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full appearance-none rounded-xl border border-slate-200 px-4 py-2.5 pr-8 text-sm outline-none transition focus:border-[#FF6B4A]/40 focus:ring-2 focus:ring-[#FF6B4A]/10"
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

          {/* Pipeline */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Pipeline</label>
            {pipelinesLoading ? (
              <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
            ) : (
              <select
                value={selectedPipelineId}
                onChange={(e) => {
                  setSelectedPipelineId(e.target.value);
                  setSelectedStageId("");
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#FF6B4A]/40 focus:ring-2 focus:ring-[#FF6B4A]/10"
              >
                {pipelines.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Stage */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Stage</label>
            <select
              value={selectedStageId}
              onChange={(e) => setSelectedStageId(e.target.value)}
              disabled={stages.length === 0}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#FF6B4A]/40 focus:ring-2 focus:ring-[#FF6B4A]/10 disabled:opacity-50"
            >
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          {/* Product Name */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Product Name</label>
            <input
              type="text"
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              placeholder="Product name"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#FF6B4A]/40 focus:ring-2 focus:ring-[#FF6B4A]/10"
            />
          </div>

          {/* WhatsApp Contact */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">WhatsApp Contact</label>
            <input
              type="tel"
              value={whatsappContact}
              onChange={(e) => setWhatsappContact(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#FF6B4A]/40 focus:ring-2 focus:ring-[#FF6B4A]/10"
            />
          </div>

          {/* Quantity */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Quantity</label>
            <input
              type="text"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="e.g. 100 pcs"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#FF6B4A]/40 focus:ring-2 focus:ring-[#FF6B4A]/10"
            />
          </div>

          {/* Services */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Services</label>
            <select
              value={services}
              onChange={(e) => setServices(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#FF6B4A]/40 focus:ring-2 focus:ring-[#FF6B4A]/10"
            >
              <option value="">Select a service</option>
              {SERVICES.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Notes */}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional notes (optional)"
              rows={3}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none transition focus:border-[#FF6B4A]/40 focus:ring-2 focus:ring-[#FF6B4A]/10"
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={submitting || !name.trim()}
            className="rounded-xl bg-[#FF6B4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e55a39] disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              "Create Lead"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
