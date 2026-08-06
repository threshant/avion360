"use client";

import LeadDetailSheet, {
  type LeadDetailData,
} from "@/components/LeadDetailSheet";
import CrmShell from "@/components/layout/CrmShell";
import { useKanbanActions, usePipelineDetail } from "@/hooks/usePipelines";
import {
  updatePipeline,
  updateStage,
} from "@/services/pipelineService";
import {
  DndContext,
  DragOverlay,
  MouseSensor,
  TouchSensor,
  closestCorners,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ArrowLeft,
  Check,
  GripVertical,
  Loader2,
  MessageCircle,
  Pencil,
  Timer,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";

function formatSlaTime(enteredAt: string | null, slaHours: number | null): { label: string; status: "ok" | "warning" | "breached" } | null {
  if (!slaHours || !enteredAt) return null;
  const elapsed = (Date.now() - new Date(enteredAt).getTime()) / (1000 * 60 * 60);
  const remaining = slaHours - elapsed;
  if (remaining <= 0) {
    const overBy = Math.abs(remaining);
    return { label: `${Math.round(overBy)}h over`, status: "breached" };
  }
  if (remaining <= slaHours * 0.2) {
    return { label: `${Math.round(remaining)}h left`, status: "warning" };
  }
  return { label: `${Math.round(remaining)}h left`, status: "ok" };
}

// ─── Kanban Card ──────────────────────────────────────────────────────────────

function KanbanCard({
  lead,
  isDragging,
  onClick,
  slaHours,
}: {
  lead: {
    id: string;
    name: string;
    temperature: string;
    source: string;
    assignedTo: string | null;
    stage_entered_at?: string | null;
  };
  isDragging?: boolean;
  onClick?: () => void;
  slaHours?: number | null;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const tempColor =
    lead.temperature === "HOT"
      ? "text-red-600 bg-red-50"
      : lead.temperature === "COLD"
        ? "text-blue-600 bg-blue-50"
        : "text-amber-600 bg-amber-50";

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-drag-handle]")) return;
        onClick?.();
      }}
      className={`rounded-xl border border-slate-200 bg-white p-3 shadow-sm transition hover:shadow-md ${
        isDragging ? "opacity-50 ring-2 ring-[#FF6B4A]/40" : ""
      } ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-start gap-2">
        <button
          type="button"
          data-drag-handle
          className="mt-0.5 cursor-grab text-slate-300 hover:text-slate-500 active:cursor-grabbing"
          {...attributes}
          {...listeners}
        >
          <GripVertical className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {lead.name}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tempColor}`}>
              {lead.temperature}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {lead.source}
            </span>
          </div>
          {lead.assignedTo && (
            <div className="mt-2 flex items-center gap-1 text-[11px] text-slate-400">
              <User className="h-3 w-3" />
              {lead.assignedTo}
            </div>
          )}
          {(() => {
            const sla = formatSlaTime(lead.stage_entered_at || null, slaHours ?? null);
            if (!sla) return null;
            const slaColor =
              sla.status === "breached"
                ? "text-red-600 bg-red-50"
                : sla.status === "warning"
                  ? "text-amber-600 bg-amber-50"
                  : "text-green-600 bg-green-50";
            return (
              <div className={`mt-1.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${slaColor}`}>
                <Timer className="h-3 w-3" />
                {sla.label}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

// ─── Drag Overlay Card ────────────────────────────────────────────────────────

function DragOverlayCard({
  lead,
}: {
  lead: {
    id: string;
    name: string;
    temperature: string;
    source: string;
    assignedTo: string | null;
  };
}) {
  const tempColor =
    lead.temperature === "HOT"
      ? "text-red-600 bg-red-50"
      : lead.temperature === "COLD"
        ? "text-blue-600 bg-blue-50"
        : "text-amber-600 bg-amber-50";

  return (
    <div className="w-64 rounded-xl border-2 border-[#FF6B4A]/40 bg-white p-3 shadow-xl rotate-2">
      <div className="flex items-start gap-2">
        <GripVertical className="mt-0.5 h-4 w-4 text-[#FF6B4A]" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-900">
            {lead.name}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tempColor}`}>
              {lead.temperature}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
              {lead.source}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  stage,
  leads,
  onLeadClick,
  onEditStage,
}: {
  stage: { id: string; name: string; color: string | null; sla_hours: number | null };
  leads: { id: string; name: string; temperature: string; source: string; assignedTo: string | null; conversation_id?: string | null; call_id?: string | null; phone?: string | null; email?: string | null; notes?: string | null; stage_entered_at?: string | null }[];
  onLeadClick?: (lead: LeadDetailData) => void;
  onEditStage?: (stageId: string, name: string, color: string | null, sla_hours: number | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(stage.name);
  const [editColor, setEditColor] = useState(stage.color || "#94a3b8");
  const [editSla, setEditSla] = useState(stage.sla_hours?.toString() || "");
  const [saving, setSaving] = useState(false);

  const { setNodeRef: setDroppableRef, isOver } = useDroppable({
    id: stage.id,
  });

  const handleSave = async () => {
    const trimmed = editName.trim();
    if (!trimmed) return;
    setSaving(true);
    try {
      await onEditStage?.(stage.id, trimmed, editColor, editSla ? Number(editSla) : null);
      setEditing(false);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditName(stage.name);
    setEditColor(stage.color || "#94a3b8");
    setEditSla(stage.sla_hours?.toString() || "");
    setEditing(false);
  };

  return (
    <div
      ref={setDroppableRef}
      className={`flex w-72 shrink-0 flex-col rounded-xl transition ${
        isOver ? "bg-[#FF6B4A]/5 ring-2 ring-[#FF6B4A]/40" : ""
      }`}
    >
      <div className="mb-3 flex items-center gap-2">
        {editing ? (
          <>
            <input
              type="color"
              value={editColor}
              onChange={(e) => setEditColor(e.target.value)}
              className="h-6 w-6 cursor-pointer rounded border-0"
            />
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleSave();
                else if (e.key === "Escape") handleCancel();
              }}
              autoFocus
              className="min-w-0 flex-1 rounded border border-[#FF6B4A] px-2 py-0.5 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-[#FF6B4A]"
            />
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="rounded p-0.5 text-green-600 hover:bg-green-50"
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
            </button>
            <button
              type="button"
              onClick={handleCancel}
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </>
        ) : (
          <>
            <div
              className="h-3 w-3 cursor-pointer rounded-full"
              style={{ backgroundColor: stage.color || "#94a3b8" }}
              onClick={() => setEditing(true)}
            />
            <h3
              className="min-w-0 flex-1 cursor-pointer truncate text-sm font-semibold text-slate-700 hover:text-[#FF6B4A]"
              onClick={() => setEditing(true)}
            >
              {stage.name}
            </h3>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
              {leads.length}
            </span>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded p-0.5 text-slate-300 opacity-0 transition hover:text-slate-500 group-hover:opacity-100"
              style={{ opacity: undefined }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = "1")}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = "")}
            >
              <Pencil className="h-3 w-3" />
            </button>
          </>
        )}
      </div>
      {editing ? (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-slate-50 px-2 py-1.5">
          <Timer className="h-3.5 w-3.5 text-slate-400" />
          <input
            type="number"
            value={editSla}
            onChange={(e) => setEditSla(e.target.value)}
            placeholder="SLA"
            min="0"
            className="w-16 rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-700 placeholder-slate-400 focus:border-[#FF6B4A] focus:outline-none"
          />
          <span className="text-[10px] text-slate-400">hrs</span>
        </div>
      ) : stage.sla_hours ? (
        <div className="mb-3 flex items-center gap-1 rounded-lg bg-slate-50 px-2 py-1">
          <Timer className="h-3.5 w-3.5 text-slate-400" />
          <span className="text-[11px] font-medium text-slate-500">
            SLA: {stage.sla_hours}h
          </span>
        </div>
      ) : null}

      <div className="crm-minimal-scroll flex-1 space-y-2 overflow-y-auto rounded-xl bg-slate-50/80 p-2">
        <SortableContext
          items={leads.map((l) => l.id)}
          strategy={verticalListSortingStrategy}
        >
          {leads.map((lead) => (
            <KanbanCard
              key={lead.id}
              lead={lead}
              slaHours={stage.sla_hours}
              onClick={() =>
                onLeadClick?.({
                  id: lead.id,
                  name: lead.name,
                  temperature: lead.temperature,
                  source: lead.source,
                  assignedTo: lead.assignedTo,
                  stage_name: stage.name,
                  conversation_id: lead.conversation_id ?? null,
                  call_id: lead.call_id ?? null,
                  phone: lead.phone ?? null,
                  email: lead.email ?? null,
                  notes: lead.notes ?? null,
                })
              }
            />
          ))}
        </SortableContext>

        {leads.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-slate-300">
            <MessageCircle className="mb-1 h-6 w-6" strokeWidth={1} />
            <p className="text-xs">No leads</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PipelineKanbanPage() {
  const params = useParams();
  const pipelineId = params.id as string;

  const { pipeline, loading, error, refetch } = usePipelineDetail(pipelineId);
  const { moveLead } = useKanbanActions(pipelineId);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [selectedLead, setSelectedLead] = useState<LeadDetailData | null>(null);
  const [editingPipelineName, setEditingPipelineName] = useState(false);
  const [pipelineName, setPipelineName] = useState("");
  const [savingPipelineName, setSavingPipelineName] = useState(false);

  const sensors = useSensors(
    useSensor(MouseSensor, {
      activationConstraint: { distance: 8 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 200, tolerance: 8 },
    }),
  );

  // Build a flat map of lead -> stage for quick lookup
  const leadStageMap = useMemo(() => {
    const map = new Map<string, string>();
    if (!pipeline?.stages) return map;
    for (const stage of pipeline.stages) {
      for (const lead of stage.leads || []) {
        const leadObj = lead as { id: string };
        map.set(leadObj.id, stage.id);
      }
    }
    return map;
  }, [pipeline]);

  // Find the active lead for drag overlay
  const activeLead = useMemo(() => {
    if (!activeId || !pipeline?.stages) return null;
    for (const stage of pipeline.stages) {
      const found = (stage.leads || []).find((l) => (l as { id: string }).id === activeId);
      if (found) return found as { id: string; name: string; temperature: string; source: string; assignedTo: string | null };
    }
    return null;
  }, [activeId, pipeline]);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const leadId = String(active.id);
    const targetStageId = leadStageMap.get(String(over.id)) || String(over.id);

    // Only move if dropping onto a stage column header/id
    if (pipeline?.stages?.some((s: { id: string }) => s.id === targetStageId)) {
      const currentStageId = leadStageMap.get(leadId);
      if (currentStageId !== targetStageId) {
        await moveLead(leadId, targetStageId);
      }
    }
  };

  const startEditPipelineName = () => {
    setPipelineName(pipeline?.name || "");
    setEditingPipelineName(true);
  };

  const cancelEditPipelineName = () => {
    setEditingPipelineName(false);
    setPipelineName("");
  };

  const savePipelineName = async () => {
    const trimmed = pipelineName.trim();
    if (!trimmed || !pipeline) return;
    setSavingPipelineName(true);
    try {
      await updatePipeline(pipeline.id, { name: trimmed });
      await refetch();
      setEditingPipelineName(false);
    } finally {
      setSavingPipelineName(false);
    }
  };

  const handleEditStage = async (stageId: string, name: string, color: string | null, sla_hours: number | null) => {
    if (!pipeline) return;
    await updateStage(pipeline.id, stageId, { name, color: color ?? undefined, sla_hours });
    await refetch();
  };

  return (
    <CrmShell activeNav="Leads">
      <div className="flex h-full flex-col p-4 md:p-6">
        <div className="mb-4 flex items-center gap-3">
          <Link
            href="/leads"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          {loading ? (
            <div className="h-8 w-48 animate-pulse rounded-lg bg-slate-100" />
          ) : error ? (
            <p className="text-sm text-red-500">{error}</p>
          ) : (
            <div className="flex flex-1 items-center gap-3">
              {editingPipelineName ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pipelineName}
                    onChange={(e) => setPipelineName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") void savePipelineName();
                      else if (e.key === "Escape") cancelEditPipelineName();
                    }}
                    autoFocus
                    className="rounded-lg border border-[#FF6B4A] px-3 py-1.5 text-xl font-bold text-slate-900 focus:outline-none focus:ring-1 focus:ring-[#FF6B4A]"
                  />
                  <button
                    type="button"
                    onClick={() => void savePipelineName()}
                    disabled={savingPipelineName}
                    className="rounded-lg p-1.5 text-green-600 hover:bg-green-50"
                  >
                    {savingPipelineName ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditPipelineName}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-900">
                    {pipeline?.name || "Pipeline"}
                  </h1>
                  <button
                    type="button"
                    onClick={startEditPipelineName}
                    className="rounded-lg p-1 text-slate-300 transition hover:bg-slate-100 hover:text-slate-500"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                </div>
              )}
              <span className="text-sm text-slate-400">
                {pipeline?.stages?.length ?? 0} stages
              </span>
              <div className="flex-1" />
              <button
                type="button"
                onClick={() => void refetch()}
                className="text-sm text-slate-400 hover:text-slate-600"
              >
                Refresh
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="flex flex-1 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-[#FF6B4A]" />
          </div>
        ) : !pipeline ? (
          <div className="flex flex-1 items-center justify-center text-slate-400">
            Pipeline not found
          </div>
        ) : (
          <div className="crm-minimal-scroll flex flex-1 gap-4 overflow-x-auto pb-4">
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {pipeline.stages.map((stage: { id: string; name: string; color: string | null; sla_hours: number | null; leads?: unknown[] }) => (
                <KanbanColumn
                  key={stage.id}
                  stage={stage}
                  leads={(stage.leads || []) as { id: string; name: string; temperature: string; source: string; assignedTo: string | null; conversation_id?: string | null; call_id?: string | null; phone?: string | null; email?: string | null; notes?: string | null; stage_entered_at?: string | null }[]}
                  onLeadClick={setSelectedLead}
                  onEditStage={handleEditStage}
                />
              ))}

              <DragOverlay>
                {activeLead ? <DragOverlayCard lead={activeLead} /> : null}
              </DragOverlay>
            </DndContext>
          </div>
        )}
      </div>

      <LeadDetailSheet
        lead={selectedLead}
        isOpen={!!selectedLead}
        onClose={() => setSelectedLead(null)}
        onUpdated={(updates) => {
          if (selectedLead) {
            setSelectedLead({ ...selectedLead, ...updates });
          }
          void refetch();
        }}
      />
    </CrmShell>
  );
}
