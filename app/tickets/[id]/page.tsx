"use client";

import CrmShell from "@/components/layout/CrmShell";
import { useAuth } from "@/lib/auth-context";
import {
  useAssignees,
  type Assignee,
} from "@/hooks/useAssignees";
import {
  useTicketComments,
  useTicketDetail,
} from "@/hooks/useTickets";
import {
  ArrowLeft,
  CheckCircle2,
  Circle,
  Clock,
  Loader2,
  MessageSquare,
  Pencil,
  Send,
  Trash2,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

const STATUS_OPTIONS = ["Open", "In Progress", "Closed", "Resolved"] as const;
const PRIORITY_OPTIONS = ["High", "Medium", "Low"] as const;
const CATEGORY_OPTIONS = [
  "General",
  "Bug",
  "Feature Request",
  "Support",
  "Task",
  "Other",
] as const;

const STATUS_ICONS: Record<string, typeof Circle> = {
  Open: Circle,
  "In Progress": Clock,
  Closed: XCircle,
  Resolved: CheckCircle2,
};

const STATUS_COLORS: Record<string, string> = {
  Open: "text-blue-600 bg-blue-50",
  "In Progress": "text-amber-600 bg-amber-50",
  Closed: "text-slate-500 bg-slate-100",
  Resolved: "text-green-600 bg-green-50",
};

export default function TicketDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticketId = params.id as string;
  const { user } = useAuth();
  const { assignees } = useAssignees();
  const {
    ticket,
    loading,
    error,
    edit,
    remove,
  } = useTicketDetail(ticketId);
  const { comments, loading: commentsLoading, addComment } =
    useTicketComments(ticketId);

  const [commentText, setCommentText] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const isAssigned = user && ticket?.assigned_to === user.id;
  const isCreator = user && ticket?.created_by === user.id;
  const canChangeStatus = isAssigned;

  const handleAddComment = async () => {
    if (!commentText.trim()) return;
    setSubmittingComment(true);
    try {
      await addComment(commentText.trim());
      setCommentText("");
    } finally {
      setSubmittingComment(false);
    }
  };

  const startEdit = (field: string, currentValue: string) => {
    setEditingField(field);
    setEditValue(currentValue);
  };

  const cancelEdit = () => {
    setEditingField(null);
    setEditValue("");
  };

  const saveEdit = async (field: string) => {
    setSavingEdit(true);
    try {
      await edit({ [field]: editValue } as Parameters<typeof edit>[0]);
      setEditingField(null);
      setEditValue("");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    if (!canChangeStatus) return;
    await edit({ status: newStatus as "Open" | "In Progress" | "Closed" | "Resolved" });
  };

  const handleDelete = async () => {
    if (!confirm("Delete this ticket? This cannot be undone.")) return;
    await remove();
    router.push("/tickets");
  };

  return (
    <CrmShell activeNav="Tickets">
      <div className="flex h-full flex-col p-4 md:p-6">
        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <Link
            href="/tickets"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          {loading ? (
            <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : ticket ? (
            <div className="flex flex-1 items-center gap-3">
              {editingField === "title" ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void saveEdit("title");
                      else if (e.key === "Escape") cancelEdit();
                    }}
                    autoFocus
                    className="rounded-lg border border-[#FF6B4A] px-3 py-1.5 text-xl font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#FF6B4A]"
                  />
                  <button
                    type="button"
                    onClick={() => void saveEdit("title")}
                    disabled={savingEdit}
                    className="rounded-lg p-1.5 text-green-600 hover:bg-green-50"
                  >
                    {savingEdit ? <Loader2 className="h-4 w-4 animate-spin" /> : "✓"}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    ✕
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">
                    {ticket.title}
                  </h1>
                  <button
                    type="button"
                    onClick={() => startEdit("title", ticket.title)}
                    className="rounded-lg p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              )}
              {(isCreator || isAssigned) && (
                <button
                  type="button"
                  onClick={handleDelete}
                  className="ml-auto rounded-lg p-1.5 text-slate-300 transition hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          ) : null}
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#FF6B4A]" />
          </div>
        ) : !ticket ? (
          <div className="flex flex-1 items-center justify-center text-slate-400">
            Ticket not found
          </div>
        ) : (
          <div className="flex flex-1 gap-6 overflow-hidden">
            {/* Main Content */}
            <div className="flex min-w-0 flex-1 flex-col gap-5 overflow-y-auto">
              {/* Description */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-2 text-sm font-semibold text-slate-700">
                  Description
                </h3>
                {editingField === "description" ? (
                  <div className="space-y-2">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      rows={4}
                      autoFocus
                      className="w-full rounded-lg border border-[#FF6B4A] px-3 py-2 text-sm text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#FF6B4A]"
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => void saveEdit("description")}
                        disabled={savingEdit}
                        className="rounded-lg bg-green-50 px-3 py-1 text-xs font-semibold text-green-700 hover:bg-green-100"
                      >
                        {savingEdit ? "Saving..." : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={cancelEdit}
                        className="rounded-lg px-3 py-1 text-xs text-slate-500 hover:bg-slate-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="group">
                    <p className="whitespace-pre-wrap text-sm text-slate-600">
                      {ticket.description || "No description provided."}
                    </p>
                    <button
                      type="button"
                      onClick={() => startEdit("description", ticket.description)}
                      className="mt-2 text-xs text-slate-300 opacity-0 transition hover:text-slate-500 group-hover:opacity-100"
                    >
                      Edit description
                    </button>
                  </div>
                )}
              </div>

              {/* Comments */}
              <div className="rounded-xl border border-slate-200 bg-white p-5">
                <h3 className="mb-4 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <MessageSquare className="h-4 w-4" />
                  Comments ({comments.length})
                </h3>

                {commentsLoading ? (
                  <div className="flex justify-center py-4">
                    <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
                  </div>
                ) : comments.length === 0 ? (
                  <p className="py-4 text-center text-xs text-slate-400">
                    No comments yet. Be the first to comment.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {comments.map((c) => (
                      <div
                        key={c.id}
                        className="rounded-lg bg-slate-50 p-3"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-xs font-semibold text-slate-700">
                            {c.user_name || "User"}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="whitespace-pre-wrap text-sm text-slate-600">
                          {c.content}
                        </p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add Comment */}
                <div className="mt-4 flex gap-2">
                  <input
                    type="text"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        void handleAddComment();
                      }
                    }}
                    placeholder="Write a comment..."
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#FF6B4A] focus:outline-none focus:ring-1 focus:ring-[#FF6B4A]"
                  />
                  <button
                    type="button"
                    onClick={() => void handleAddComment()}
                    disabled={submittingComment || !commentText.trim()}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[#FF6B4A] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e55a39] disabled:opacity-50"
                  >
                    {submittingComment ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                    Send
                  </button>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-72 shrink-0 space-y-4">
              {/* Status */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase text-slate-500">
                  Status
                </h4>
                {canChangeStatus ? (
                  <div className="space-y-1">
                    {STATUS_OPTIONS.map((s) => {
                      const Icon = STATUS_ICONS[s];
                      const isActive = ticket.status === s;
                      return (
                        <button
                          key={s}
                          type="button"
                          onClick={() => void handleStatusChange(s)}
                          className={`flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                            isActive
                              ? `${STATUS_COLORS[s]} ring-1 ring-inset ring-current/20`
                              : "text-slate-600 hover:bg-slate-50"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {s}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold ${STATUS_COLORS[ticket.status]}`}
                  >
                    {(() => {
                      const Icon = STATUS_ICONS[ticket.status];
                      return <Icon className="h-4 w-4" />;
                    })()}
                    {ticket.status}
                  </div>
                )}
                {!canChangeStatus && ticket.status !== "Closed" && ticket.status !== "Resolved" && (
                  <p className="mt-2 text-[11px] text-slate-400">
                    Only the assigned person can change status
                  </p>
                )}
              </div>

              {/* Details */}
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 text-xs font-semibold uppercase text-slate-500">
                  Details
                </h4>
                <div className="space-y-3">
                  {/* Priority */}
                  <div>
                    <label className="text-[11px] text-slate-400">Priority</label>
                    {editingField === "priority" ? (
                      <div className="mt-1 flex items-center gap-1">
                        <select
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 rounded border border-[#FF6B4A] px-2 py-1 text-sm focus:outline-none"
                        >
                          {PRIORITY_OPTIONS.map((p) => (
                            <option key={p} value={p}>{p}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => void saveEdit("priority")}
                          className="text-xs text-green-600"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-xs text-slate-400"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit("priority", ticket.priority)}
                        className="mt-0.5 flex w-full items-center justify-between rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {ticket.priority}
                        <Pencil className="h-3 w-3 text-slate-300" />
                      </button>
                    )}
                  </div>

                  {/* Category */}
                  <div>
                    <label className="text-[11px] text-slate-400">Category</label>
                    {editingField === "category" ? (
                      <div className="mt-1 flex items-center gap-1">
                        <select
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 rounded border border-[#FF6B4A] px-2 py-1 text-sm focus:outline-none"
                        >
                          {CATEGORY_OPTIONS.map((c) => (
                            <option key={c} value={c}>{c}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => void saveEdit("category")}
                          className="text-xs text-green-600"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-xs text-slate-400"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit("category", ticket.category)}
                        className="mt-0.5 flex w-full items-center justify-between rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {ticket.category}
                        <Pencil className="h-3 w-3 text-slate-300" />
                      </button>
                    )}
                  </div>

                  {/* Assigned To */}
                  <div>
                    <label className="text-[11px] text-slate-400">Assigned To</label>
                    {editingField === "assigned_to" ? (
                      <div className="mt-1 flex items-center gap-1">
                        <select
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          className="flex-1 rounded border border-[#FF6B4A] px-2 py-1 text-sm focus:outline-none"
                        >
                          <option value="">Unassigned</option>
                          {assignees.map((a: Assignee) => (
                            <option key={a.id} value={a.id}>{a.name}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => void saveEdit("assigned_to")}
                          className="text-xs text-green-600"
                        >
                          ✓
                        </button>
                        <button
                          type="button"
                          onClick={cancelEdit}
                          className="text-xs text-slate-400"
                        >
                          ✕
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => startEdit("assigned_to", ticket.assigned_to || "")}
                        className="mt-0.5 flex w-full items-center justify-between rounded px-2 py-1 text-sm text-slate-700 hover:bg-slate-50"
                      >
                        {ticket.assigned_to_name || "Unassigned"}
                        <Pencil className="h-3 w-3 text-slate-300" />
                      </button>
                    )}
                  </div>

                  {/* Created By */}
                  <div>
                    <label className="text-[11px] text-slate-400">Created By</label>
                    <p className="mt-0.5 text-sm text-slate-700">
                      {ticket.created_by_name || "Unknown"}
                    </p>
                  </div>

                  {/* Created At */}
                  <div>
                    <label className="text-[11px] text-slate-400">Created</label>
                    <p className="mt-0.5 text-sm text-slate-700">
                      {new Date(ticket.created_at).toLocaleString()}
                    </p>
                  </div>

                  {/* Updated At */}
                  <div>
                    <label className="text-[11px] text-slate-400">Updated</label>
                    <p className="mt-0.5 text-sm text-slate-700">
                      {new Date(ticket.updated_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </CrmShell>
  );
}
