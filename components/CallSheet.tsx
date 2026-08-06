"use client";

import { ChevronLeft, Phone, Play, X } from "lucide-react";

interface CallSheetProps {
  callId: string;
  leadName: string;
  leadPhone?: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function CallSheet({
  callId,
  leadName,
  leadPhone,
  isOpen,
  onClose,
}: CallSheetProps) {
  const playbackUrl = `/api/telecmi/play?file=${encodeURIComponent(callId)}`;

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
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sky-100 text-sky-600">
            <Phone className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">{leadName}</p>
            <p className="text-xs text-slate-400">Call Recording</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-4 py-5">
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sky-100">
                <Phone className="h-5 w-5 text-sky-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-slate-900">{leadName}</p>
                {leadPhone && leadPhone !== "N/A" && (
                  <p className="text-xs text-slate-500">{leadPhone}</p>
                )}
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <div className="mb-2 flex items-center gap-2">
                <Play className="h-4 w-4 text-[#FF6B4A]" />
                <p className="text-xs font-medium text-slate-500">Recording</p>
              </div>
              <audio className="w-full" controls preload="metadata" src={playbackUrl}>
                Your browser does not support audio playback.
              </audio>
            </div>

            <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-4">
              <p className="text-xs font-medium text-slate-400">Call Reference</p>
              <p className="mt-1 break-all font-mono text-xs text-slate-600">{callId}</p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
