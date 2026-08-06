"use client";

import CreateLeadModal from "@/components/CreateLeadModal";
import CreatePipelineSheet from "@/components/leads/CreatePipelineSheet";
import PageHeader from "@/components/PageHeader";
import CrmShell from "@/components/layout/CrmShell";
import { usePipelines } from "@/hooks/usePipelines";
import {
  deletePipeline,
  updatePipeline,
} from "@/services/pipelineService";
import {
  Check,
  Kanban,
  Loader2,
  Pencil,
  Plus,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export default function LeadsPage() {
  const { pipelines, loading, refetch } = usePipelines();
  const [showCreate, setShowCreate] = useState(false);
  const [showCreateLead, setShowCreateLead] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete pipeline "${name}"? This cannot be undone.`)) return;
    await deletePipeline(id);
    await refetch();
  };

  const startEdit = (id: string, currentName: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(id);
    setEditingName(currentName);
  };

  const cancelEdit = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setEditingId(null);
    setEditingName("");
  };

  const saveEdit = async (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const trimmed = editingName.trim();
    if (!trimmed) return;
    setSavingEdit(true);
    try {
      await updatePipeline(id, { name: trimmed });
      await refetch();
      setEditingId(null);
      setEditingName("");
    } finally {
      setSavingEdit(false);
    }
  };

  return (
    <CrmShell activeNav="Leads">
      <div className="space-y-5 p-4 md:p-6">
        <PageHeader
          title="Lead Pipelines"
          subtitle="Manage your sales pipelines and stages"
          onRefresh={() => refetch()}
        >
          <button
            type="button"
            onClick={() => setShowCreateLead(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50"
          >
            <UserPlus className="h-4 w-4" />
            New Lead
          </button>
          <button
            type="button"
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl bg-[#FF6B4A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39]"
          >
            <Plus className="h-4 w-4" />
            New Pipeline
          </button>
        </PageHeader>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#FF6B4A]" />
          </div>
        ) : pipelines.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white py-20">
            <Kanban className="mb-3 h-12 w-12 text-slate-300" strokeWidth={1} />
            <p className="text-sm font-medium text-slate-500">No pipelines yet</p>
            <p className="mt-1 text-xs text-slate-400">Create your first pipeline to organize leads</p>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="mt-4 rounded-xl bg-[#FF6B4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e55a39]"
            >
              Create Pipeline
            </button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {pipelines.map((pipeline) => {
              const isEditing = editingId === pipeline.id;
              return (
                <Link
                  key={pipeline.id}
                  href={`/leads/${pipeline.id}`}
                  className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-[#FF6B4A]/30 hover:shadow-md"
                >
                  <div className="mb-4 flex items-start justify-between">
                    <div className="min-w-0 flex-1">
                      {isEditing ? (
                        <div
                          className="flex items-center gap-1.5"
                          onClick={(e) => e.preventDefault()}
                        >
                          <input
                            type="text"
                            value={editingName}
                            onChange={(e) => setEditingName(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                void saveEdit(pipeline.id, e as unknown as React.MouseEvent);
                              } else if (e.key === "Escape") {
                                cancelEdit(e as unknown as React.MouseEvent);
                              }
                            }}
                            autoFocus
                            className="w-full rounded-lg border border-[#FF6B4A] px-2 py-1 text-base font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#FF6B4A]"
                          />
                          <button
                            type="button"
                            onClick={(e) => void saveEdit(pipeline.id, e)}
                            disabled={savingEdit}
                            className="rounded-lg p-1 text-green-600 hover:bg-green-50"
                          >
                            {savingEdit ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Check className="h-4 w-4" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={cancelEdit}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <h3 className="truncate text-base font-bold text-slate-900 group-hover:text-[#FF6B4A]">
                            {pipeline.name}
                          </h3>
                          <button
                            type="button"
                            onClick={(e) => startEdit(pipeline.id, pipeline.name, e)}
                            className="rounded-md p-0.5 text-slate-300 opacity-0 transition hover:bg-slate-100 hover:text-slate-500 group-hover:opacity-100"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <p className="mt-0.5 text-xs text-slate-400">
                        {pipeline.lead_count ?? 0} leads
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        void handleDelete(pipeline.id, pipeline.name);
                      }}
                      className="rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-500 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {(pipeline.stages || []).slice(0, 6).map((stage) => (
                      <span
                        key={stage.id}
                        className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{
                          backgroundColor: stage.color ? `${stage.color}18` : "#f1f5f9",
                          color: stage.color || "#475569",
                        }}
                      >
                        {stage.name}
                        {stage.lead_count !== undefined && stage.lead_count > 0 && (
                          <span className="ml-0.5 text-[10px] opacity-60">
                            {stage.lead_count}
                          </span>
                        )}
                      </span>
                    ))}
                    {(pipeline.stages || []).length > 6 && (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500">
                        +{(pipeline.stages || []).length - 6}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      <CreatePipelineSheet
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={() => refetch()}
      />

      <CreateLeadModal
        isOpen={showCreateLead}
        onClose={() => setShowCreateLead(false)}
        onCreated={() => refetch()}
      />
    </CrmShell>
  );
}
