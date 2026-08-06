"use client";

import React from "react";

export default function AdvancedLoader() {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70 backdrop-blur-sm animate-[fadeIn_0.2s_ease]">
      <div className="flex flex-col items-center gap-4 rounded-2xl border border-slate-200 bg-white px-8 py-6 shadow-xl">
        <h1 className="text-lg font-bold text-slate-900">Sourcersbiz CRM</h1>

        <div className="h-1 w-48 overflow-hidden rounded-full bg-slate-200">
          <div className="h-full w-1/3 bg-gradient-to-r from-[#FF6B4A] to-[#e55a39] animate-[loader_1.4s_ease-in-out_infinite]" />
        </div>

        <p className="text-xs text-slate-400">Loading...</p>
      </div>

      <style jsx>{`
        @keyframes loader {
          0% {
            transform: translateX(-100%);
          }
          50% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
