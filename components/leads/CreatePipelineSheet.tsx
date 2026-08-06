"use client";

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetActionButton,
} from "@/components/ui/sheet";
import { createPipeline } from "@/services/pipelineService";
import type { CreatePipelinePayload } from "@/types/lead";
import { GripVertical, Loader2, Plus, Timer, Trash2 } from "lucide-react";
import { useState } from "react";

const STAGE_COLORS = [
  "#8b5cf6",
  "#3b82f6",
  "#f59e0b",
  "#f97316",
  "#ef4444",
  "#22c55e",
  "#6b7280",
  "#ec4899",
  "#14b8a6",
  "#6366f1",
];

const DEFAULT_STAGES = [
  { name: "New", color: STAGE_COLORS[0] },
  { name: "Contacted", color: STAGE_COLORS[1] },
  { name: "Qualified", color: STAGE_COLORS[2] },
  { name: "Proposal", color: STAGE_COLORS[3] },
  { name: "Won", color: STAGE_COLORS[5] },
  { name: "Lost", color: STAGE_COLORS[6] },
];

interface CreatePipelineSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export default function CreatePipelineSheet({
  isOpen,
  onClose,
  onCreated,
}: CreatePipelineSheetProps) {
  const [name, setName] = useState("");
  const [stages, setStages] = useState<{ name: string; color: string; sla_hours: string }[]>([
    ...DEFAULT_STAGES.map((s) => ({ ...s, sla_hours: "" })),
  ]);
  const [submitting, setSubmitting] = useState(false);

  const addStage = () => {
    setStages([
      ...stages,
      { name: "", color: STAGE_COLORS[stages.length % STAGE_COLORS.length], sla_hours: "" },
    ]);
  };

  const removeStage = (idx: number) => {
    setStages(stages.filter((_, i) => i !== idx));
  };

  const updateStage = (idx: number, field: "name" | "color" | "sla_hours", value: string) => {
    setStages(stages.map((s, i) => (i === idx ? { ...s, [field]: value } : s)));
  };

  const resetForm = () => {
    setName("");
    setStages([...DEFAULT_STAGES.map((s) => ({ ...s, sla_hours: "" }))]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || stages.filter((s) => s.name.trim()).length === 0) return;
    setSubmitting(true);
    try {
      const payload: CreatePipelinePayload = {
        name: name.trim(),
        stages: stages
          .filter((s) => s.name.trim())
          .map((s) => ({
            name: s.name.trim(),
            color: s.color,
            sla_hours: s.sla_hours ? Number(s.sla_hours) : null,
          })),
      };
      await createPipeline(payload);
      onCreated();
      resetForm();
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={(open) => { if (!open) { onClose(); } }}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle>Create Pipeline</SheetTitle>
          <SheetDescription>
            Set up a new pipeline with stages to organize your leads.
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Pipeline Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sales Pipeline"
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 placeholder-slate-400 focus:border-[#FF6B4A] focus:outline-none focus:ring-1 focus:ring-[#FF6B4A]"
            />
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <label className="text-sm font-medium text-slate-700">
                Stages *
              </label>
              <button
                type="button"
                onClick={addStage}
                className="flex items-center gap-1 text-xs font-semibold text-[#FF6B4A] hover:text-[#e55a39]"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Stage
              </button>
            </div>
            <div className="space-y-3">
              {stages.map((stage, idx) => (
                <div key={idx} className="rounded-lg border border-slate-200 p-2.5">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={stage.color}
                      onChange={(e) => updateStage(idx, "color", e.target.value)}
                      className="h-8 w-8 cursor-pointer rounded-lg border-0"
                    />
                    <input
                      type="text"
                      value={stage.name}
                      onChange={(e) => updateStage(idx, "name", e.target.value)}
                      placeholder="Stage name"
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[#FF6B4A] focus:outline-none focus:ring-1 focus:ring-[#FF6B4A]"
                    />
                    <GripVertical className="h-4 w-4 text-slate-300" />
                    {stages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStage(idx)}
                        className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="mt-2 flex items-center gap-2 pl-10">
                    <Timer className="h-3.5 w-3.5 text-slate-400" />
                    <input
                      type="number"
                      value={stage.sla_hours}
                      onChange={(e) => updateStage(idx, "sla_hours", e.target.value)}
                      placeholder="SLA (hours)"
                      min="0"
                      className="w-28 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-700 placeholder-slate-400 focus:border-[#FF6B4A] focus:outline-none focus:ring-1 focus:ring-[#FF6B4A]"
                    />
                    <span className="text-[11px] text-slate-400">hours</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <SheetFooter>
            <SheetActionButton onClick={onClose} disabled={submitting}>
              Cancel
            </SheetActionButton>
            <SheetActionButton
              type="submit"
              variant="primary"
              disabled={submitting || !name.trim() || stages.filter((s) => s.name.trim()).length === 0}
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Create Pipeline"
              )}
            </SheetActionButton>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
