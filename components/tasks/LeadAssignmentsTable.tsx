"use client";

import { useAviontiveLeads } from "@/hooks/useAviontiveLeads";
import { useAuth } from "@/lib/auth-context";

type LeadAssignment = {
  id: string;
  name: string;
  company: string;
  source: string;
  statusLabel: string;
  assignedTo: string | null;
  lastContact: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  temperature: string;
  stage_name: string | null;
  conversation_id: string | null;
  call_id: string | null;
  custom_fields?: {
    product_name?: string;
    whatsapp_contact?: string;
    quantity?: string;
    services?: string;
  } | null;
};

export default function LeadAssignmentsTable({
  onLeadClick,
}: {
  onLeadClick?: (lead: LeadAssignment) => void;
}) {
  const { user } = useAuth();
  const { leads, loading, error, refetch } = useAviontiveLeads(undefined, {
    page: 1,
    pageSize: 100,
  });

  const mappedLeads: LeadAssignment[] = (leads ?? []).map((lead) => ({
    id: String(lead.id ?? ""),
    name: String(lead.name ?? "Unknown"),
    company: String(lead.company ?? "N/A"),
    source: String(lead.source ?? "N/A"),
    statusLabel: String(lead.statusLabel ?? "N/A"),
    assignedTo: lead.assignedTo ? String(lead.assignedTo) : null,
    lastContact: String(lead.lastContact ?? "Never"),
    phone: lead.phone && lead.phone !== "N/A" ? String(lead.phone) : null,
    email: lead.email && lead.email !== "N/A" ? String(lead.email) : null,
    notes: lead.notes ? String(lead.notes) : null,
    temperature: String(lead.temperature ?? "WARM"),
    stage_name: String(lead.statusLabel ?? null),
    conversation_id: null,
    call_id: null,
    custom_fields: lead.customFields || null,
  }));

  const assignedLeads = mappedLeads.filter(
    (lead) => lead.assignedTo && lead.assignedTo === user?.name,
  );

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">
        Loading lead assignments...
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-300 bg-red-50 p-4 text-sm text-red-700">
        Failed to load lead assignments: {error}
      </div>
    );
  }

  if (assignedLeads.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-slate-300 p-8 text-center text-slate-500">
        No assigned leads found.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
      <table className="w-full min-w-200 text-sm">
        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
          <tr>
            <th className="px-4 py-3 text-left">Lead</th>
            <th className="px-4 py-3 text-left">Company</th>
            <th className="px-4 py-3 text-left">Assigned To</th>
            <th className="px-4 py-3 text-left">Source</th>
            <th className="px-4 py-3 text-left">Stage</th>
            <th className="px-4 py-3 text-left">Last Contact</th>
          </tr>
        </thead>
        <tbody>
          {assignedLeads.map((lead) => (
            <tr
              key={lead.id}
              onClick={() => onLeadClick?.(lead)}
              className={`border-t border-slate-100 transition hover:bg-slate-50/60 ${onLeadClick ? "cursor-pointer" : ""}`}
            >
              <td className="px-4 py-3 font-medium text-slate-900">
                {lead.name}
              </td>
              <td className="px-4 py-3 text-slate-700">{lead.company}</td>
              <td className="px-4 py-3 text-slate-700">{lead.assignedTo}</td>
              <td className="px-4 py-3 text-slate-700">{lead.source}</td>
              <td className="px-4 py-3 text-slate-700">{lead.statusLabel}</td>
              <td className="px-4 py-3 text-slate-700">{lead.lastContact}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
