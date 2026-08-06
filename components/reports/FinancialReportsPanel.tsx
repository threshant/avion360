"use client";

import { useFinancialReports } from "@/hooks/useFinancialReports";
import { fmtCompactCurrency } from "@/utils/formatting";
import { useState } from "react";

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`crm-skeleton ${className}`} />;
}

function fmt(n: number) {
  return fmtCompactCurrency(n, "INR ");
}

function fmtMonth(m: string) {
  const [y, mo] = m.split("-");
  const d = new Date(Number(y), Number(mo) - 1, 1);
  return d.toLocaleString("en-IN", { month: "short", year: "2-digit" });
}

function monthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 7);
}

function MiniBar({
  value,
  max,
  colorClass,
}: {
  value: number;
  max: number;
  colorClass: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
        <div
          className={`h-full rounded-full ${colorClass}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-20 text-right text-xs font-semibold text-slate-700">
        {fmt(value)}
      </span>
    </div>
  );
}

export default function FinancialReportsPanel() {
  const [activeTab, setActiveTab] = useState<"summary" | "pl" | "cashflow">(
    "summary",
  );
  const [fromMonth, setFromMonth] = useState(monthsAgo(11));
  const [toMonth, setToMonth] = useState(new Date().toISOString().slice(0, 7));
  const { summary, plData, cashFlow, isLoading, refetch } = useFinancialReports(
    fromMonth,
    toMonth,
  );

  const tabs = [
    { key: "summary" as const, label: "Summary" },
    { key: "pl" as const, label: "Profit & Loss" },
    { key: "cashflow" as const, label: "Cash Flow" },
  ];

  return (
    <div
      className="space-y-5"
      role="status"
      aria-label="Loading financial reports"
    >
      <section className="rounded-3xl border border-sky-100/90 bg-white/85 p-6 shadow-sm">
        {isLoading ? (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <SkeletonBox className="h-9 w-9 rounded-full" />
                <SkeletonBox className="h-7 w-56 rounded-xl" />
              </div>
              <SkeletonBox className="h-4 w-64 rounded-lg" />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900 md:text-2xl">
                Financial Reports
              </h2>
              <p className="mt-1.5 text-sm text-slate-500">
                Profit & Loss, cash flow statements, and financial summaries
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500">
                  From
                </label>
                <input
                  type="month"
                  value={fromMonth}
                  onChange={(e) => setFromMonth(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-500">
                  To
                </label>
                <input
                  type="month"
                  value={toMonth}
                  onChange={(e) => setToMonth(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
              </div>
              <button
                type="button"
                onClick={() => void refetch()}
                className="rounded-xl bg-[#FF6B4A] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39]"
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </section>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {isLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm"
              >
                <div className="space-y-2">
                  <SkeletonBox className="h-4 w-28 rounded-md" />
                  <SkeletonBox className="h-8 w-24 rounded-lg" />
                </div>
              </div>
            ))
          : [
              {
                label: "Total Revenue",
                value: fmt(
                  (summary?.totalIncome ?? 0) + (summary?.totalCommission ?? 0),
                ),
                color: "sky",
              },
              {
                label: "Total Expenses",
                value: fmt(summary?.totalExpense ?? 0),
                color: "rose",
              },
              {
                label: "Net Profit",
                value: fmt(summary?.netProfit ?? 0),
                color: (summary?.netProfit ?? 0) >= 0 ? "emerald" : "rose",
              },
              {
                label: "Outstanding AR",
                value: fmt(summary?.arTotal ?? 0),
                color: "amber",
              },
            ].map((card) => (
              <article
                key={card.label}
                className={`rounded-2xl border bg-white px-5 py-4 shadow-sm border-${card.color}-200`}
              >
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className={`mt-1 text-2xl font-bold text-${card.color}-600`}>
                  {card.value}
                </p>
              </article>
            ))}
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center gap-1 border-b border-slate-100 px-6 pt-4">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`relative px-4 py-2.5 text-sm font-semibold transition ${
                activeTab === tab.key
                  ? "text-sky-600 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-sky-500"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="p-6">
          {activeTab === "summary" && (
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-100 p-5">
                  <h3 className="mb-4 text-sm font-semibold text-slate-700">
                    Revenue Breakdown
                  </h3>
                  {isLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <SkeletonBox key={i} className="h-6 rounded-lg" />
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {[
                        {
                          label: "Service Income",
                          value: summary?.totalIncome ?? 0,
                          color: "bg-sky-400",
                        },
                        {
                          label: "Commission",
                          value: summary?.totalCommission ?? 0,
                          color: "bg-cyan-400",
                        },
                        {
                          label: "Total Expenses",
                          value: -(summary?.totalExpense ?? 0),
                          color: "bg-rose-400",
                        },
                      ].map((row) => (
                        <div key={row.label}>
                          <div className="mb-1 flex justify-between text-xs text-slate-500">
                            <span>{row.label}</span>
                          </div>
                          <MiniBar
                            value={Math.abs(row.value)}
                            max={
                              Math.max(
                                summary?.totalIncome ?? 0,
                                summary?.totalExpense ?? 0,
                              ) * 1.1
                            }
                            colorClass={row.color}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-100 p-5">
                  <h3 className="mb-4 text-sm font-semibold text-slate-700">
                    Net Profit
                  </h3>
                  {isLoading ? (
                    <SkeletonBox className="h-24 rounded-xl" />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-2 py-4">
                      <span
                        className={`text-4xl font-bold ${(summary?.netProfit ?? 0) >= 0 ? "text-emerald-600" : "text-rose-600"}`}
                      >
                        {fmt(summary?.netProfit ?? 0)}
                      </span>
                      <span className="text-sm text-slate-400">
                        {(summary?.netProfit ?? 0) >= 0
                          ? "Profitable period"
                          : "Loss in period"}
                      </span>
                      <span className="rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        {fromMonth} to {toMonth}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-100 p-5">
                <h3 className="mb-3 text-sm font-semibold text-slate-700">
                  Receivables Summary
                </h3>
                {isLoading ? (
                  <SkeletonBox className="h-12 rounded-xl" />
                ) : (
                  <div className="flex flex-wrap gap-4">
                    <div className="rounded-xl bg-sky-50 px-4 py-3">
                      <p className="text-xs text-slate-500">Outstanding</p>
                      <p className="text-lg font-bold text-sky-700">
                        {fmt(summary?.arTotal ?? 0)}
                      </p>
                    </div>
                    <div className="rounded-xl bg-rose-50 px-4 py-3">
                      <p className="text-xs text-slate-500">Overdue</p>
                      <p className="text-lg font-bold text-rose-700">
                        {fmt(summary?.overdueAR ?? 0)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "pl" && (
            <div className="space-y-5">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonBox key={i} className="h-10 rounded-xl" />
                  ))}
                </div>
              ) : !plData ? (
                <p className="py-12 text-center text-slate-400">
                  No data available.
                </p>
              ) : (
                <>
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    {[
                      {
                        label: "Total Income",
                        value: plData.totals.totalIncome,
                        color: "sky",
                      },
                      {
                        label: "Commission",
                        value: plData.totals.totalCommission,
                        color: "cyan",
                      },
                      {
                        label: "Total Expenses",
                        value: plData.totals.totalExpense,
                        color: "rose",
                      },
                      {
                        label: "Net Profit",
                        value: plData.totals.netProfit,
                        color:
                          plData.totals.netProfit >= 0 ? "emerald" : "rose",
                      },
                    ].map((kpi) => (
                      <div
                        key={kpi.label}
                        className={`rounded-xl border bg-white px-4 py-3 border-${kpi.color}-200`}
                      >
                        <p className="text-xs text-slate-500">{kpi.label}</p>
                        <p
                          className={`text-lg font-bold text-${kpi.color}-600`}
                        >
                          {fmt(kpi.value)}
                        </p>
                      </div>
                    ))}
                  </div>

                  <div className="overflow-x-auto rounded-2xl border border-slate-100">
                    <table className="w-full min-w-150 text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          <th className="px-4 py-3 text-left">Month</th>
                          <th className="px-4 py-3 text-right">Income</th>
                          <th className="px-4 py-3 text-right">Commission</th>
                          <th className="px-4 py-3 text-right">Expenses</th>
                          <th className="px-4 py-3 text-right">Net Profit</th>
                        </tr>
                      </thead>
                      <tbody>
                        {plData.months.map((m) => {
                          const row = plData.monthlyData[m] ?? {
                            income: 0,
                            expense: 0,
                            commission: 0,
                          };
                          const net = row.income + row.commission - row.expense;
                          return (
                            <tr
                              key={m}
                              className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                            >
                              <td className="px-4 py-3 font-semibold text-slate-700">
                                {fmtMonth(m)}
                              </td>
                              <td className="px-4 py-3 text-right text-sky-700">
                                {fmt(row.income)}
                              </td>
                              <td className="px-4 py-3 text-right text-cyan-700">
                                {fmt(row.commission)}
                              </td>
                              <td className="px-4 py-3 text-right text-rose-600">
                                {fmt(row.expense)}
                              </td>
                              <td
                                className={`px-4 py-3 text-right font-bold ${net >= 0 ? "text-emerald-700" : "text-rose-700"}`}
                              >
                                {fmt(net)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === "cashflow" && (
            <div className="space-y-5">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <SkeletonBox key={i} className="h-10 rounded-xl" />
                  ))}
                </div>
              ) : !cashFlow ? (
                <p className="py-12 text-center text-slate-400">
                  No data available.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-100">
                  <table className="w-full min-w-135 text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <th className="px-4 py-3 text-left">Month</th>
                        <th className="px-4 py-3 text-right">Cash Inflow</th>
                        <th className="px-4 py-3 text-right">Cash Outflow</th>
                        <th className="px-4 py-3 text-right">Net Cash Flow</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cashFlow.netFlow.map((row) => (
                        <tr
                          key={row.month}
                          className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                        >
                          <td className="px-4 py-3 font-semibold text-slate-700">
                            {fmtMonth(row.month)}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-700">
                            {fmt(row.inflow)}
                          </td>
                          <td className="px-4 py-3 text-right text-rose-600">
                            {fmt(row.outflow)}
                          </td>
                          <td
                            className={`px-4 py-3 text-right font-bold ${row.net >= 0 ? "text-sky-700" : "text-rose-700"}`}
                          >
                            {row.net >= 0 ? "+" : ""}
                            {fmt(row.net)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
