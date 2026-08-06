"use client";

import { useReportsAnalytics } from "@/hooks/useReportsAnalytics";
import { useState } from "react";

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`crm-skeleton ${className}`} />;
}

function ChartSkeleton({ title }: { title: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <SkeletonBox className="mb-5 h-5 w-52 rounded-lg" />
      <SkeletonBox className="h-56 w-full rounded-xl" />
      <div className="mt-3 flex justify-between">
        {Array.from({ length: 6 }).map((_, i) => (
          <SkeletonBox key={i} className="h-3 w-8 rounded-md" />
        ))}
      </div>
      <p className="sr-only">{title} loading</p>
    </div>
  );
}

function ReportRowSkeleton() {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 last:border-0">
      <div className="flex items-center gap-4">
        <SkeletonBox className="h-10 w-10 shrink-0 rounded-xl" />
        <div className="space-y-1.5">
          <SkeletonBox className="h-4 w-48 rounded-md" />
          <SkeletonBox className="h-3 w-32 rounded-md" />
        </div>
      </div>
      <SkeletonBox className="h-9 w-28 rounded-xl" />
    </div>
  );
}

type ReportCategory =
  | "Sales"
  | "Leads"
  | "Calls"
  | "Finance"
  | "Inventory"
  | "HR";

function formatDate(isoStr: string): string {
  return new Date(isoStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

const categoryColor: Record<ReportCategory, string> = {
  Sales: "bg-sky-100 text-sky-700",
  Leads: "bg-emerald-100 text-emerald-700",
  Calls: "bg-amber-100 text-amber-700",
  Finance: "bg-violet-100 text-violet-700",
  Inventory: "bg-cyan-100 text-cyan-700",
  HR: "bg-rose-100 text-rose-700",
};

function RevenueLineChart({
  months,
  revenue,
}: {
  months: string[];
  revenue: number[];
}) {
  const W = 480,
    H = 240;
  const ML = 64,
    MR = 20,
    MT = 20,
    MB = 36;
  const iw = W - ML - MR;
  const ih = H - MT - MB;
  const maxVal = Math.max(...revenue, 10000);

  const toX = (i: number) => ML + (i / Math.max(months.length - 1, 1)) * iw;
  const toY = (v: number) => MT + ih - (v / maxVal) * ih;
  const makePath = (d: number[]) =>
    d
      .map(
        (v, i) =>
          `${i === 0 ? "M" : "L"} ${toX(i).toFixed(1)} ${toY(v).toFixed(1)}`,
      )
      .join(" ");

  const gridSteps = 5;
  const gridVals = Array.from({ length: gridSteps }, (_, i) =>
    Math.round((maxVal / (gridSteps - 1)) * i),
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
      <defs>
        <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.18" />
          <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0" />
        </linearGradient>
      </defs>
      {gridVals.map((v) => (
        <g key={v}>
          <line
            x1={ML}
            y1={toY(v).toFixed(1)}
            x2={W - MR}
            y2={toY(v).toFixed(1)}
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <text
            x={ML - 8}
            y={(toY(v) + 4).toFixed(1)}
            textAnchor="end"
            fontSize="10"
            fill="#94a3b8"
          >
            {v === 0 ? "0" : `${Math.round(v / 1000)}k`}
          </text>
        </g>
      ))}
      {months.map((m, i) => (
        <text
          key={m}
          x={toX(i).toFixed(1)}
          y={H - MB + 18}
          textAnchor="middle"
          fontSize="11"
          fill="#94a3b8"
        >
          {m}
        </text>
      ))}
      <path
        d={`${makePath(revenue)} L ${toX(months.length - 1).toFixed(1)} ${(MT + ih).toFixed(1)} L ${ML} ${(MT + ih).toFixed(1)} Z`}
        fill="url(#revGrad)"
      />
      <path
        d={makePath(revenue)}
        fill="none"
        stroke="#0ea5e9"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {revenue.map((v, i) => (
        <circle
          key={i}
          cx={toX(i).toFixed(1)}
          cy={toY(v).toFixed(1)}
          r="4"
          fill="white"
          stroke="#0ea5e9"
          strokeWidth="2.5"
        />
      ))}
    </svg>
  );
}

function LeadBarChart({
  months,
  leads,
}: {
  months: string[];
  leads: number[];
}) {
  const W = 480,
    H = 240;
  const ML = 40,
    MR = 20,
    MT = 20,
    MB = 36;
  const iw = W - ML - MR;
  const ih = H - MT - MB;
  const maxVal = Math.max(...leads, 10);
  const n = months.length;
  const barW = (iw / n) * 0.55;

  const toY = (v: number) => MT + ih - (v / maxVal) * ih;
  const barX = (i: number) => ML + (i / n) * iw + (iw / n - barW) / 2;

  const gridSteps = 5;
  const gridVals = Array.from({ length: gridSteps }, (_, i) =>
    Math.round((maxVal / (gridSteps - 1)) * i),
  );

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" aria-hidden="true">
      {gridVals.map((v) => (
        <g key={v}>
          <line
            x1={ML}
            y1={toY(v).toFixed(1)}
            x2={W - MR}
            y2={toY(v).toFixed(1)}
            stroke="#e2e8f0"
            strokeWidth="1"
            strokeDasharray="4 3"
          />
          <text
            x={ML - 6}
            y={(toY(v) + 4).toFixed(1)}
            textAnchor="end"
            fontSize="10"
            fill="#94a3b8"
          >
            {v}
          </text>
        </g>
      ))}
      {months.map((m, i) => (
        <text
          key={m}
          x={(barX(i) + barW / 2).toFixed(1)}
          y={H - MB + 18}
          textAnchor="middle"
          fontSize="11"
          fill="#94a3b8"
        >
          {m}
        </text>
      ))}
      {leads.map((v, i) => {
        const bh = (v / maxVal) * ih;
        return (
          <rect
            key={i}
            x={barX(i).toFixed(1)}
            y={toY(v).toFixed(1)}
            width={barW.toFixed(1)}
            height={bh.toFixed(1)}
            rx="4"
            fill="#38bdf8"
            opacity="0.82"
          />
        );
      })}
    </svg>
  );
}

export default function BusinessReportsPanel() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const { analytics, recentReports, totalReportsCount, isLoading } =
    useReportsAnalytics(page, pageSize);

  const months = analytics?.months ?? [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
  ];
  const revenue = analytics?.revenue ?? [0, 0, 0, 0, 0, 0];
  const leads = analytics?.leads ?? [0, 0, 0, 0, 0, 0];

  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {isLoading ? (
          <>
            <ChartSkeleton title="Revenue Trend" />
            <ChartSkeleton title="Lead Generation" />
          </>
        ) : (
          <>
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-slate-900">
                Revenue Trend (6 Months)
              </h2>
              <RevenueLineChart months={months} revenue={revenue} />
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-slate-900">
                New Clients per Month (6 Months)
              </h2>
              <LeadBarChart months={months} leads={leads} />
            </section>
          </>
        )}
      </div>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 py-4">
          {isLoading ? (
            <SkeletonBox className="h-6 w-36 rounded-lg" />
          ) : (
            <h2 className="text-base font-semibold text-slate-900">
              Recent Reports
            </h2>
          )}
        </div>

        {!isLoading && (
          <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-3 text-sm">
            <div className="flex items-center gap-3 text-slate-600">
              <span>Show per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(1);
                }}
                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none focus:border-sky-400"
              >
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Prev
              </button>
              <span className="px-3 text-sm text-slate-600">
                Page {page} of {Math.ceil(totalReportsCount / pageSize)}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= Math.ceil(totalReportsCount / pageSize)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}

        <div>
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <ReportRowSkeleton key={i} />
            ))
          ) : recentReports.length === 0 ? (
            <div className="py-16 text-center text-slate-400">
              No reports found.
            </div>
          ) : (
            recentReports.map((report) => (
              <div
                key={report.id}
                className="flex items-center justify-between border-b border-slate-100 px-6 py-4 last:border-0 transition hover:bg-slate-50/60"
              >
                <div>
                  <p className="font-semibold text-slate-800">{report.title}</p>
                  <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-400">
                    {formatDate(report.created_at)}
                    <span className="text-slate-300">·</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${categoryColor[report.category as ReportCategory] ?? "bg-slate-100 text-slate-700"}`}
                    >
                      {report.category}
                    </span>
                  </p>
                </div>

                <button
                  type="button"
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-sky-300 hover:text-sky-600"
                >
                  Download
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
