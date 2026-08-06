"use client";

import type { ReactNode } from "react";
import { RefreshCw } from "lucide-react";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  onRefresh?: () => void;
  children?: ReactNode;
};

export default function PageHeader({ title, subtitle, onRefresh, children }: PageHeaderProps) {
  return (
    <div className="flex items-end justify-between gap-4 sm:flex-wrap">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        {onRefresh && (
          <button
            type="button"
            onClick={() => onRefresh()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#FF6B4A]/10 text-[#FF6B4A] transition-colors hover:bg-[#FF6B4A]/20"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        )}
        {children}
      </div>
    </div>
  );
}
