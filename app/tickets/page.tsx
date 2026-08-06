"use client";

import CreateTicketModal from "@/components/tickets/CreateTicketModal";
import PageHeader from "@/components/PageHeader";
import CrmShell from "@/components/layout/CrmShell";
import { useTickets } from "@/hooks/useTickets";
import type {
  TicketCategory,
  TicketFilters,
  TicketPriority,
  TicketStatus,
} from "@/types/ticket";
import {
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  MessageSquare,
  Plus,
  Search,
  Ticket,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const STATUS_CONFIG: Record<
  TicketStatus,
  { color: string; bg: string; icon: typeof Circle }
> = {
  Open: { color: "text-blue-600", bg: "bg-blue-50", icon: Circle },
  "In Progress": { color: "text-amber-600", bg: "bg-amber-50", icon: Clock },
  Closed: { color: "text-slate-500", bg: "bg-slate-100", icon: XCircle },
  Resolved: { color: "text-green-600", bg: "bg-green-50", icon: CheckCircle2 },
};

const PRIORITY_CONFIG: Record<TicketPriority, { color: string; bg: string }> = {
  High: { color: "text-red-600", bg: "bg-red-50" },
  Medium: { color: "text-amber-600", bg: "bg-amber-50" },
  Low: { color: "text-slate-500", bg: "bg-slate-100" },
};

const CATEGORY_COLORS: Record<TicketCategory, string> = {
  General: "#6b7280",
  Bug: "#ef4444",
  "Feature Request": "#8b5cf6",
  Support: "#3b82f6",
  Task: "#f59e0b",
  Other: "#6b7280",
};

export default function TicketsPage() {
  const { tickets, total, loading, filters, setFilters, refetch } = useTickets({
    pageSize: 50,
  });
  const [showCreate, setShowCreate] = useState(false);
  const [search, setSearch] = useState(filters.search || "");

  const handleSearch = (val: string) => {
    setSearch(val);
    setFilters({ ...filters, search: val || undefined, page: 1 });
  };

  const handleFilterChange = (
    key: keyof TicketFilters,
    value: string | undefined,
  ) => {
    setFilters({ ...filters, [key]: value || undefined, page: 1 });
  };

  return (
    <CrmShell activeNav="Tickets">
      <div className="space-y-5 p-4 md:p-6">
        <PageHeader
          title="Tickets"
          subtitle={`${total} total tickets`}
          onRefresh={() => refetch()}
        >
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-[#FF6B4A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39]"
          >
            <Plus className="h-4 w-4" />
            Raise Ticket
          </button>
        </PageHeader>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              placeholder="Search tickets..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder-slate-400 focus:border-[#FF6B4A] focus:outline-none focus:ring-1 focus:ring-[#FF6B4A]"
            />
          </div>

          <select
            value={filters.status || ""}
            onChange={(e) => handleFilterChange("status", e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#FF6B4A] focus:outline-none"
          >
            <option value="">All Status</option>
            <option value="Open">Open</option>
            <option value="In Progress">In Progress</option>
            <option value="Closed">Closed</option>
            <option value="Resolved">Resolved</option>
          </select>

          <select
            value={filters.priority || ""}
            onChange={(e) => handleFilterChange("priority", e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#FF6B4A] focus:outline-none"
          >
            <option value="">All Priority</option>
            <option value="High">High</option>
            <option value="Medium">Medium</option>
            <option value="Low">Low</option>
          </select>

          <select
            value={filters.category || ""}
            onChange={(e) => handleFilterChange("category", e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:border-[#FF6B4A] focus:outline-none"
          >
            <option value="">All Categories</option>
            <option value="General">General</option>
            <option value="Bug">Bug</option>
            <option value="Feature Request">Feature Request</option>
            <option value="Support">Support</option>
            <option value="Task">Task</option>
            <option value="Other">Other</option>
          </select>
        </div>

        {/* Ticket List */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#FF6B4A]" />
          </div>
        ) : tickets.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20">
            <Ticket className="mb-3 h-12 w-12 text-slate-300" strokeWidth={1} />
            <p className="text-sm font-medium text-slate-500">No tickets found</p>
            <p className="mt-1 text-xs text-slate-400">
              {filters.search || filters.status || filters.priority
                ? "Try adjusting your filters"
                : "Raise your first ticket to get started"}
            </p>
            {!filters.search && !filters.status && !filters.priority && (
              <button
                type="button"
                onClick={() => setShowCreate(true)}
                className="mt-4 rounded-xl bg-[#FF6B4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e55a39]"
              >
                Raise Ticket
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {tickets.map((ticket) => {
              const statusCfg = STATUS_CONFIG[ticket.status];
              const priorityCfg = PRIORITY_CONFIG[ticket.priority];
              const StatusIcon = statusCfg.icon;
              return (
                <Link
                  key={ticket.id}
                  href={`/tickets/${ticket.id}`}
                  className="group flex items-start gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-[#FF6B4A]/30 hover:shadow-md"
                >
                  <div className={`mt-0.5 rounded-lg p-1.5 ${statusCfg.bg}`}>
                    <StatusIcon className={`h-4 w-4 ${statusCfg.color}`} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-slate-900 group-hover:text-[#FF6B4A]">
                          {ticket.title}
                        </h3>
                        {ticket.description && (
                          <p className="mt-0.5 truncate text-xs text-slate-400">
                            {ticket.description}
                          </p>
                        )}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[ticket.category]}18`,
                            color: CATEGORY_COLORS[ticket.category],
                          }}
                        >
                          {ticket.category}
                        </span>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${priorityCfg.bg} ${priorityCfg.color}`}
                      >
                        {ticket.priority}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusCfg.bg} ${statusCfg.color}`}
                      >
                        <StatusIcon className="h-3 w-3" />
                        {ticket.status}
                      </span>
                      {ticket.assigned_to_name && (
                        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {ticket.assigned_to_name}
                        </span>
                      )}
                      {ticket.comment_count !== undefined && ticket.comment_count > 0 && (
                        <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400">
                          <MessageSquare className="h-3 w-3" />
                          {ticket.comment_count}
                        </span>
                      )}
                      <span className="text-[10px] text-slate-300">
                        {new Date(ticket.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <CreateTicketModal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => refetch()}
      />
    </CrmShell>
  );
}
