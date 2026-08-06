"use client";

import PageHeader from "@/components/PageHeader";
import CrmShell from "@/components/layout/CrmShell";
import { fmtCompactCurrency } from "@/utils/formatting";
import { useFinanceDashboardData } from "@/hooks/useFinanceDashboardData";
import { useAuth } from "@/lib/auth-context";
import {
  BarChart3,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  LoaderCircle,
  Plus,
  Trash2,
  TrendingDown,
  TrendingUp,
  TriangleAlert,
  X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─── Cash Balance Modal ───────────────────────────────────────────────────────

function CashBalanceModal({
  onClose,
  onAddCashBalance,
  onSuccess,
}: {
  onClose: () => void;
  onAddCashBalance: (payload: {
    amount: number;
    party: string;
    date: string;
    notes: string;
  }) => Promise<void>;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState("");
  const [party, setParty] = useState("Cash Deposit");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || Number(amount) <= 0) {
      setErr("Enter a valid amount.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await onAddCashBalance({
        amount: Number(amount),
        party,
        date,
        notes,
      });
      onSuccess();
    } catch (err) {
      setErr(
        err instanceof Error ? err.message : "Network error. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-sky-100 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="flex items-center gap-2.5 text-base font-bold text-slate-900">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500 text-white">
              <Plus className="h-4 w-4" aria-hidden="true" />
            </span>
            Add Cash Balance
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Amount (₹) *
            </label>
            <input
              type="number"
              min="1"
              step="0.01"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 50000"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Source / Party
            </label>
            <input
              type="text"
              value={party}
              onChange={(e) => setParty(e.target.value)}
              placeholder="Cash Deposit"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Date *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-slate-600">
              Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional description…"
              className="w-full resize-none rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-800 outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100"
            />
          </div>

          {err && (
            <p className="rounded-xl bg-rose-50 px-4 py-2 text-xs text-rose-600">
              {err}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-600 disabled:opacity-60"
            >
              {saving ? "Saving…" : "Add Balance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`crm-skeleton ${className}`} />;
}

function KpiCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <SkeletonBox className="h-4 w-32 rounded-md" />
          <SkeletonBox className="h-8 w-24 rounded-lg" />
          <SkeletonBox className="h-3 w-28 rounded-md" />
        </div>
        <SkeletonBox className="h-14 w-14 shrink-0 rounded-full" />
      </div>
    </div>
  );
}

function ChartSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <SkeletonBox className="mb-5 h-5 w-44 rounded-lg" />
      <SkeletonBox className="h-48 w-full rounded-xl" />
      <div className="mt-4 flex items-center gap-6">
        <SkeletonBox className="h-4 w-20 rounded-md" />
        <SkeletonBox className="h-4 w-20 rounded-md" />
        <SkeletonBox className="h-4 w-24 rounded-md" />
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-6 py-3">
        <SkeletonBox className="h-4 w-20 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-6 w-20 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-36 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-24 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-24 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-6 w-20 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-32 rounded-md" />
      </td>
    </tr>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type TxnType = "Income" | "Expense" | "Commission";
type TxnStatus = "Completed" | "Pending" | "Processing";

type Transaction = {
  id: string;
  type: TxnType;
  party: string;
  amount: number;
  date: string;
  status: TxnStatus;
  details: string | null;
  invoice_id?: string | null;
};

type FinanceSummary = {
  kpi: {
    totalIncome: number;
    totalExpenses: number;
    totalCommission: number;
    netBalance: number;
  };
  commissionStatus: { paid: number; pending: number; processing: number };
  officeExpenses: Record<string, number>;
  chartData: {
    months: string[];
    income: number[];
    expense: number[];
    commission: number[];
  };
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return fmtCompactCurrency(n);
}

function polarToCartesian(cx: number, cy: number, r: number, angleDeg: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

// ─── Charts ───────────────────────────────────────────────────────────────────

function LineChart({
  months,
  income,
  expense,
  commission,
}: {
  months: string[];
  income: number[];
  expense: number[];
  commission: number[];
}) {
  const W = 480,
    H = 200;
  const ML = 58,
    MR = 16,
    MT = 16,
    MB = 32;
  const iw = W - ML - MR;
  const ih = H - MT - MB;
  const allVals = [...income, ...expense, ...commission];
  const maxVal = Math.max(...allVals, 100000);

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
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-48" aria-hidden="true">
      {gridVals.map((v) => (
        <g key={v}>
          <line
            x1={ML}
            y1={toY(v).toFixed(1)}
            x2={W - MR}
            y2={toY(v).toFixed(1)}
            stroke="#e2e8f0"
            strokeWidth="1"
          />
          <text
            x={ML - 6}
            y={(toY(v) + 4).toFixed(1)}
            textAnchor="end"
            fontSize="9"
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
          y={H - MB + 16}
          textAnchor="middle"
          fontSize="10"
          fill="#94a3b8"
        >
          {m}
        </text>
      ))}
      <path
        d={makePath(commission)}
        fill="none"
        stroke="#8b5cf6"
        strokeWidth="1.5"
        strokeDasharray="5 3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={makePath(expense)}
        fill="none"
        stroke="#ef4444"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={makePath(income)}
        fill="none"
        stroke="#10b981"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {income.map((v, i) => (
        <circle
          key={i}
          cx={toX(i).toFixed(1)}
          cy={toY(v).toFixed(1)}
          r="3.5"
          fill="#10b981"
        />
      ))}
      {expense.map((v, i) => (
        <circle
          key={i}
          cx={toX(i).toFixed(1)}
          cy={toY(v).toFixed(1)}
          r="3"
          fill="#ef4444"
        />
      ))}
      {commission.map((v, i) => (
        <circle
          key={i}
          cx={toX(i).toFixed(1)}
          cy={toY(v).toFixed(1)}
          r="2.5"
          fill="#8b5cf6"
        />
      ))}
    </svg>
  );
}

function PieChart({
  paid,
  pending,
  processing,
}: {
  paid: number;
  pending: number;
  processing: number;
}) {
  const cx = 100,
    cy = 100,
    r = 72;
  const total = paid + pending + processing || 1;
  const segments = [
    {
      value: paid,
      color: "#10b981",
      label: "Paid",
      textColor: "text-emerald-600",
    },
    {
      value: pending,
      color: "#f59e0b",
      label: "Pending",
      textColor: "text-amber-500",
    },
    {
      value: processing,
      color: "#3b82f6",
      label: "Processing",
      textColor: "text-blue-500",
    },
  ];

  let angle = 0;
  const paths = segments.map((seg) => {
    const sweep = (seg.value / total) * 360;
    const start = polarToCartesian(cx, cy, r, angle);
    const end = polarToCartesian(cx, cy, r, angle + sweep);
    const large = sweep > 180 ? "1" : "0";
    const d = `M ${cx} ${cy} L ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)} Z`;
    angle += sweep;
    return { ...seg, d };
  });

  return (
    <svg
      viewBox="0 0 200 200"
      className="h-52 w-full max-w-[220px]"
      aria-hidden="true"
    >
      {paths.map((seg) => (
        <path key={seg.label} d={seg.d} fill={seg.color} opacity="0.88" />
      ))}
      <circle cx={cx} cy={cy} r="32" fill="white" />
      <text x={cx} y={cy - 4} textAnchor="middle" fontSize="10" fill="#64748b">
        Total
      </text>
      <text
        x={cx}
        y={cy + 12}
        textAnchor="middle"
        fontSize="9"
        fill="#0f172a"
        fontWeight="600"
      >
        {fmt(total)}
      </text>
      <div />
    </svg>
  );
}

// ─── Status / Type badges ─────────────────────────────────────────────────────

const typeBadge: Record<TxnType, string> = {
  Income: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Expense: "bg-rose-50    text-rose-700    border border-rose-200",
  Commission: "bg-violet-50  text-violet-700  border border-violet-200",
};

const statusBadge: Record<TxnStatus, string> = {
  Completed: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Pending: "bg-amber-50   text-amber-700   border border-amber-200",
  Processing: "bg-blue-50    text-blue-700    border border-blue-200",
};

// ─── KPI icons ────────────────────────────────────────────────────────────────

function KpiIcon({ icon, className }: { icon: string; className?: string }) {
  const iconMap: Record<string, LucideIcon> = {
    income: TrendingUp,
    expense: TrendingDown,
    commission: CircleDollarSign,
    balance: BarChart3,
  };
  const Icon = iconMap[icon];
  return Icon ? (
    <Icon className={className ?? "h-7 w-7"} aria-hidden="true" />
  ) : null;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

const tabs = ["All Transactions", "Income", "Expenses", "Commissions"] as const;
type Tab = (typeof tabs)[number];

const allMonthOptions = [
  "All Months",
  ...Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    return d.toLocaleString("en-US", { month: "long" }) + " " + d.getFullYear();
  }),
];

export default function FinancePage() {
  const [showCashModal, setShowCashModal] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("All Transactions");
  const [selectedMonth, setSelectedMonth] = useState("All Months");
  const [selectedType, setSelectedType] = useState("All Types");
  const [showMonthDrop, setShowMonthDrop] = useState(false);
  const [showTypeDrop, setShowTypeDrop] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [showBulkDeleteConfirm, setShowBulkDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const { user } = useAuth();

  const monthRef = useRef<HTMLDivElement>(null);
  const typeRef = useRef<HTMLDivElement>(null);
  const {
    transactions,
    summary,
    creditEnabled,
    totalTransactionsCount,
    maxPages,
    isLoading,
    refetch,
    addCashBalance,
    deleteAllFinanceData,
  } = useFinanceDashboardData({
    selectedMonth,
    selectedType,
    activeTab,
    page,
    pageSize,
  });

  const handleBulkDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteAllFinanceData();
      setMessage({
        type: "success",
        text: "All finance data deleted successfully",
      });
      setShowBulkDeleteConfirm(false);
      await refetch();
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred during deletion",
      });
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [selectedMonth, selectedType, activeTab]);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (monthRef.current && !monthRef.current.contains(e.target as Node))
        setShowMonthDrop(false);
      if (typeRef.current && !typeRef.current.contains(e.target as Node))
        setShowTypeDrop(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const summaryData = (summary ?? {}) as Partial<FinanceSummary>;

  const kpi = summaryData.kpi ?? {
    totalIncome: 0,
    totalExpenses: 0,
    totalCommission: 0,
    netBalance: 0,
  };
  const chart = summaryData.chartData ?? {
    months: [],
    income: [],
    expense: [],
    commission: [],
  };
  const commStatus = summaryData.commissionStatus ?? {
    paid: 0,
    pending: 0,
    processing: 0,
  };
  const officeExp = summaryData.officeExpenses ?? {};

  const kpiCards = [
    {
      label: "Total Income",
      value: fmt(kpi.totalIncome),
      sub: "From all income transactions",
      iconBg: "bg-emerald-500",
      icon: "income",
      border: "border-emerald-200",
      subColor: "text-emerald-600",
    },
    {
      label: "Total Expenses",
      value: fmt(kpi.totalExpenses),
      sub: "All recorded expenses",
      iconBg: "bg-rose-500",
      icon: "expense",
      border: "border-rose-200",
      subColor: "text-rose-500",
    },
    {
      label: "Commissions",
      value: fmt(kpi.totalCommission),
      sub: fmt(commStatus.pending) + " pending",
      iconBg: "bg-violet-500",
      icon: "commission",
      border: "border-violet-200",
      subColor: "text-violet-500",
    },
    {
      label: "Net Balance",
      value: fmt(kpi.netBalance),
      sub: kpi.netBalance >= 0 ? "Healthy margin" : "Deficit",
      iconBg: "bg-[#FF6B4A]",
      icon: "balance",
      border: "border-[#FDDDD6]",
      subColor: "text-[#FF6B4A]",
    },
  ];

  const filtered = transactions as Transaction[];

  const officeRows = [
    {
      label: "Rent & Utilities",
      amount: officeExp["Rent & Utilities"] ?? 0,
      color: "border-sky-100 bg-sky-50",
      text: "text-sky-700",
    },
    {
      label: "Office Supplies",
      amount: officeExp["Office Supplies"] ?? 0,
      color: "border-green-100 bg-green-50",
      text: "text-green-700",
    },
    {
      label: "Equipment",
      amount: officeExp["Equipment"] ?? 0,
      color: "border-amber-100 bg-amber-50",
      text: "text-amber-700",
    },
  ];

  return (
    <CrmShell activeNav="Expenses">
      {showCashModal && (
        <CashBalanceModal
          onClose={() => setShowCashModal(false)}
          onAddCashBalance={addCashBalance}
          onSuccess={() => {
            setShowCashModal(false);
            void refetch();
          }}
        />
      )}

      {showBulkDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4 backdrop-blur-md">
          <div className="w-full max-w-md rounded-3xl border border-rose-100 bg-white p-8 shadow-2xl">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-rose-50 text-rose-500 mx-auto">
              <TriangleAlert className="h-8 w-8" aria-hidden="true" />
            </div>
            <h3 className="mb-2 text-center text-xl font-bold text-slate-900">
              Bulk Delete All Finance Data?
            </h3>
            <p className="mb-8 text-center text-sm leading-relaxed text-slate-500">
              This action will permanently delete{" "}
              <span className="font-semibold text-rose-600">
                ALL transactions, bank statements, vendor bills, and proforma
                invoices
              </span>
              . This action is destructive and cannot be reversed.
            </p>
            <div className="flex gap-4">
              <button
                disabled={isDeleting}
                onClick={() => setShowBulkDeleteConfirm(false)}
                className="flex-1 rounded-2xl border border-slate-200 py-3.5 text-sm font-bold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 active:scale-[0.98]"
              >
                Cancel
              </button>
              <button
                disabled={isDeleting}
                onClick={handleBulkDelete}
                className="flex-1 rounded-2xl bg-gradient-to-r from-rose-500 to-rose-600 py-3.5 text-sm font-bold text-white shadow-xl shadow-rose-200 transition hover:from-rose-600 hover:to-rose-700 disabled:opacity-50 active:scale-[0.98]"
              >
                {isDeleting ? (
                  <span className="flex items-center justify-center gap-2">
                    <LoaderCircle
                      className="h-4 w-4 animate-spin"
                      aria-hidden="true"
                    />
                    Deleting...
                  </span>
                ) : (
                  "Yes, Delete All"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5 p-4 md:p-6">
        {/* Messages */}
        {message && (
          <div
            className={`flex items-center justify-between rounded-2xl border px-6 py-4 text-sm font-semibold shadow-sm transition-all animate-in fade-in slide-in-from-top-4 ${
              message.type === "success"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-rose-200 bg-rose-50 text-rose-800"
            }`}
          >
            <div className="flex items-center gap-3">
              {message.type === "success" ? (
                <Check
                  className="h-5 w-5 text-emerald-500"
                  aria-hidden="true"
                />
              ) : (
                <TriangleAlert
                  className="h-5 w-5 text-rose-500"
                  aria-hidden="true"
                />
              )}
              {message.text}
            </div>
            <button
              onClick={() => setMessage(null)}
              className="opacity-60 hover:opacity-100"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        )}

        <PageHeader
          title="Finance & Accounting"
          subtitle="Manage income, expenses, and commissions"
          onRefresh={() => void refetch()}
        >
          {user?.role === "super_admin" && (
            <button
              type="button"
              onClick={() => setShowBulkDeleteConfirm(true)}
              className="group flex items-center gap-2 rounded-xl border border-rose-100 bg-rose-50/50 px-4 py-2.5 text-sm font-semibold text-rose-600 shadow-sm transition-all hover:border-rose-200 hover:bg-rose-100 active:scale-95"
            >
              <Trash2
                className="h-4 w-4 transition-transform group-hover:scale-110"
                aria-hidden="true"
              />
              Bulk Delete
            </button>
          )}
          {creditEnabled && (
            <button
              type="button"
              onClick={() => setShowCashModal(true)}
              className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Cash Balance
            </button>
          )}
        </PageHeader>

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <KpiCardSkeleton key={i} />
              ))
            : kpiCards.map((card) => (
                <article
                  key={card.label}
                  className={`rounded-2xl border bg-white px-5 py-4 shadow-sm transition hover:shadow-md ${card.border}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs text-slate-500 md:text-sm">
                        {card.label}
                      </p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {card.value}
                      </p>
                      <p
                        className={`mt-1 flex items-center gap-1 text-xs font-medium ${card.subColor}`}
                      >
                        {card.sub}
                      </p>
                    </div>
                    <span
                      className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white ${card.iconBg}`}
                    >
                      <KpiIcon icon={card.icon} className="h-7 w-7" />
                    </span>
                  </div>
                </article>
              ))}
        </div>

        {/* ── Charts ── */}
        <div className="grid gap-5 lg:grid-cols-5">
          {isLoading ? (
            <div className="lg:col-span-3">
              <ChartSkeleton />
            </div>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-3">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
                <TrendingUp
                  className="h-5 w-5 text-slate-400"
                  aria-hidden="true"
                />
                Income vs Expenses
              </h2>
              <LineChart
                months={chart.months}
                income={chart.income}
                expense={chart.expense}
                commission={chart.commission}
              />
              <div className="mt-3 flex flex-wrap items-center gap-5 text-xs">
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="inline-block h-0.5 w-6 rounded-full bg-emerald-500" />
                  income
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="inline-block h-0.5 w-6 rounded-full bg-rose-500" />
                  expense
                </span>
                <span className="flex items-center gap-1.5 text-slate-500">
                  <span className="inline-block h-0.5 w-6 rounded-full bg-violet-400" />
                  commission
                </span>
              </div>
            </section>
          )}

          {isLoading ? (
            <div className="lg:col-span-2">
              <ChartSkeleton />
            </div>
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm lg:col-span-2">
              <h2 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-900">
                <CircleDollarSign
                  className="h-5 w-5 text-slate-400"
                  aria-hidden="true"
                />
                Commission Status
              </h2>
              <div className="flex flex-col items-center gap-5 sm:flex-row lg:flex-col xl:flex-row">
                <PieChart
                  paid={commStatus.paid}
                  pending={commStatus.pending}
                  processing={commStatus.processing}
                />
                <div className="space-y-3 text-sm">
                  {[
                    {
                      label: "Paid",
                      value: commStatus.paid,
                      color: "#10b981",
                      textColor: "text-emerald-600",
                    },
                    {
                      label: "Pending",
                      value: commStatus.pending,
                      color: "#f59e0b",
                      textColor: "text-amber-500",
                    },
                    {
                      label: "Processing",
                      value: commStatus.processing,
                      color: "#3b82f6",
                      textColor: "text-blue-500",
                    },
                  ].map((seg) => (
                    <div key={seg.label} className="flex items-center gap-2.5">
                      <span
                        className="h-3 w-3 shrink-0 rounded-full"
                        style={{ backgroundColor: seg.color }}
                      />
                      <span className="text-slate-500">{seg.label}:</span>
                      <span className={`font-semibold ${seg.textColor}`}>
                        {fmt(seg.value)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}
        </div>

        {/* ── Recent Transactions ── */}
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            {isLoading ? (
              <>
                <SkeletonBox className="h-6 w-44 rounded-lg" />
                <div className="flex gap-2">
                  <SkeletonBox className="h-9 w-32 rounded-xl" />
                  <SkeletonBox className="h-9 w-28 rounded-xl" />
                </div>
              </>
            ) : (
              <>
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <ClipboardList
                    className="h-5 w-5 text-slate-400"
                    aria-hidden="true"
                  />
                  Recent Transactions
                </h2>
                <div className="flex flex-wrap items-center gap-2">
                  {/* Month filter */}
                  <div className="relative" ref={monthRef}>
                    <button
                      type="button"
                      onClick={() => setShowMonthDrop((v) => !v)}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-sky-300"
                    >
                      {selectedMonth}
                      <ChevronDown
                        className="h-4 w-4 text-slate-400"
                        aria-hidden="true"
                      />
                    </button>
                    {showMonthDrop && (
                      <div className="absolute right-0 top-full z-20 mt-1.5 w-48 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-lg">
                        {allMonthOptions.map((m) => (
                          <button
                            key={m}
                            type="button"
                            onClick={() => {
                              setSelectedMonth(m);
                              setShowMonthDrop(false);
                            }}
                            className={`w-full px-4 py-2 text-left text-sm transition hover:bg-sky-50 hover:text-sky-700 ${m === selectedMonth ? "font-semibold text-sky-600" : "text-slate-600"}`}
                          >
                            {m}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {/* Type filter */}
                  <div className="relative" ref={typeRef}>
                    <button
                      type="button"
                      onClick={() => setShowTypeDrop((v) => !v)}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-600 shadow-sm transition hover:border-sky-300"
                    >
                      {selectedType}
                      <ChevronDown
                        className="h-4 w-4 text-slate-400"
                        aria-hidden="true"
                      />
                    </button>
                    {showTypeDrop && (
                      <div className="absolute right-0 top-full z-20 mt-1.5 w-36 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-lg">
                        {["All Types", "Income", "Expense", "Commission"].map(
                          (t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => {
                                setSelectedType(t);
                                setShowTypeDrop(false);
                              }}
                              className={`w-full px-4 py-2 text-left text-sm transition hover:bg-sky-50 hover:text-sky-700 ${t === selectedType ? "font-semibold text-sky-600" : "text-slate-600"}`}
                            >
                              {t}
                            </button>
                          ),
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Tab strip */}
          {!isLoading && (
            <div className="flex border-b border-slate-100">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActiveTab(tab)}
                  className={`flex-1 px-4 py-3 text-sm font-semibold transition ${activeTab === tab ? "border-b-2 border-sky-500 text-sky-600" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {tab}
                </button>
              ))}
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            {/* Pagination controls */}
            <div className="border-b border-slate-100 px-6 py-3 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3 text-sm text-slate-600">
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
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Prev
                </button>
                <span className="text-sm text-slate-600 px-3 whitespace-nowrap">
                  Page {page} of {maxPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= maxPages}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Type</th>
                  <th className="px-4 py-3 text-left">Party</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Details</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <TableRowSkeleton key={i} />
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-16 text-center text-slate-400"
                    >
                      No transactions found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((txn) => (
                    <tr
                      key={txn.id}
                      className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-3 font-medium text-slate-700">
                        {txn.id}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${typeBadge[txn.type]}`}
                        >
                          {txn.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <span className="flex items-center gap-2">
                          {txn.party}
                          {(txn as Transaction & { is_credit?: boolean })
                            .is_credit && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                              Cash
                            </span>
                          )}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {fmt(txn.amount)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{txn.date}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusBadge[txn.status]}`}
                        >
                          {txn.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {txn.invoice_id ? (
                          <span className="flex items-center gap-1.5 text-sky-600 font-medium">
                            <ClipboardList
                              className="h-4 w-4"
                              aria-hidden="true"
                            />
                            {txn.invoice_id}
                          </span>
                        ) : (
                          <span className="text-slate-500 text-xs">
                            {txn.details ?? "—"}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer summary */}
          {!isLoading && filtered.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-3 text-xs text-slate-500">
              <span>
                {filtered.length} transaction{filtered.length !== 1 ? "s" : ""}
              </span>
              <div className="flex flex-wrap gap-4">
                <span>
                  Income:{" "}
                  <span className="font-semibold text-emerald-600">
                    {fmt(
                      filtered
                        .filter((t) => t.type === "Income")
                        .reduce((s, t) => s + t.amount, 0),
                    )}
                  </span>
                </span>
                <span>
                  Expenses:{" "}
                  <span className="font-semibold text-rose-500">
                    {fmt(
                      filtered
                        .filter((t) => t.type === "Expense")
                        .reduce((s, t) => s + t.amount, 0),
                    )}
                  </span>
                </span>
                <span>
                  Commission:{" "}
                  <span className="font-semibold text-violet-600">
                    {fmt(
                      filtered
                        .filter((t) => t.type === "Commission")
                        .reduce((s, t) => s + t.amount, 0),
                    )}
                  </span>
                </span>
              </div>
            </div>
          )}
        </section>

        {/* ── Office Expenses ── */}
        {isLoading ? (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <SkeletonBox className="mb-5 h-5 w-36 rounded-lg" />
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-100 p-4 space-y-2"
                >
                  <SkeletonBox className="h-4 w-28 rounded-md" />
                  <SkeletonBox className="h-7 w-24 rounded-lg" />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="mb-5 flex items-center gap-2 text-base font-semibold text-slate-900">
              <ClipboardList
                className="h-5 w-5 text-slate-400"
                aria-hidden="true"
              />
              Office Expenses
            </h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {officeRows.map((item) => (
                <div
                  key={item.label}
                  className={`rounded-2xl border p-5 ${item.color}`}
                >
                  <p className="text-sm text-slate-500">{item.label}</p>
                  <p className={`mt-2 text-2xl font-bold ${item.text}`}>
                    {fmt(item.amount)}
                  </p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </CrmShell>
  );
}
