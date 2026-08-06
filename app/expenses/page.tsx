"use client";

import PageHeader from "@/components/PageHeader";
import CrmShell from "@/components/layout/CrmShell";
import { ExpenseSheet } from "@/components/ExpenseSheet";
import { ApiError } from "@/services/apiClient";
import {
  createExpense,
  deleteExpense,
  fetchExpenses,
  updateExpense,
} from "@/services/expenseService";
import type {
  Expense,
  ExpenseCategory,
  ExpensePaymentMode,
  ExpenseStatus,
} from "@/types/expense";
import {
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Pencil,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return "Rs. " + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function monthRange() {
  const now = new Date();
  const from = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .getDate()
    .toString();
  const to = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${last}`;
  return { from, to };
}

const CATEGORIES: ("All Categories" | ExpenseCategory)[] = [
  "All Categories",
  "Rent & Utilities",
  "Office Supplies",
  "Equipment",
  "Salaries",
  "Travel",
  "Marketing",
  "Software & Subscriptions",
  "Legal & Professional",
  "Other",
];

const PAYMENT_MODES: ("All Modes" | ExpensePaymentMode)[] = [
  "All Modes",
  "Cash",
  "Bank Transfer",
  "UPI",
  "Cheque",
  "Other",
];

const STATUSES: ("All Statuses" | ExpenseStatus)[] = [
  "All Statuses",
  "Completed",
  "Reversed",
];

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-6 py-3">
        <div className="crm-skeleton h-4 w-24 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <div className="crm-skeleton h-4 w-28 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <div className="crm-skeleton h-4 w-36 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <div className="crm-skeleton h-4 w-20 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <div className="crm-skeleton h-4 w-24 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <div className="crm-skeleton h-4 w-20 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <div className="crm-skeleton h-4 w-20 rounded-md" />
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<"All Categories" | ExpenseCategory>(
    "All Categories",
  );
  const [mode, setMode] = useState<"All Modes" | ExpensePaymentMode>("All Modes");
  const [status, setStatus] = useState<"All Statuses" | ExpenseStatus>(
    "All Statuses",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | undefined>();
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchExpenses({
        page,
        pageSize,
        search: search.trim() || undefined,
        category: category === "All Categories" ? undefined : category,
        paymentMode: mode === "All Modes" ? undefined : mode,
        status: status === "All Statuses" ? undefined : status,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setExpenses(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load expenses.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, category, mode, status, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyFilters() {
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setCategory("All Categories");
    setMode("All Modes");
    setStatus("All Statuses");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const maxPages = Math.max(1, Math.ceil(total / pageSize));
  const pageTotal = expenses.reduce((s, e) => s + e.amount, 0);
  const completedTotal = expenses
    .filter((e) => e.status === "Completed")
    .reduce((s, e) => s + e.amount, 0);
  const reversedCount = expenses.filter((e) => e.status === "Reversed").length;
  const { from: monthFrom, to: monthTo } = monthRange();
  const monthTotal = expenses
    .filter(
      (e) => e.expenseDate >= monthFrom && e.expenseDate <= monthTo,
    )
    .reduce((s, e) => s + e.amount, 0);

  const hasFilters =
    search.trim() !== "" ||
    category !== "All Categories" ||
    mode !== "All Modes" ||
    status !== "All Statuses" ||
    dateFrom !== "" ||
    dateTo !== "";

  const filterInputClass =
    "h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2";

  async function handleSave(payload: Parameters<typeof createExpense>[0]) {
    if (editingExpense) {
      const updated = await updateExpense(editingExpense.id, payload);
      setExpenses((prev) =>
        prev.map((e) => (e.id === updated.id ? updated : e)),
      );
    } else {
      await createExpense(payload);
    }
    setSheetOpen(false);
    setEditingExpense(undefined);
    await load();
  }

  function openCreate() {
    setEditingExpense(undefined);
    setSheetOpen(true);
  }

  function openEdit(expense: Expense) {
    setEditingExpense(expense);
    setSheetOpen(true);
  }

  async function handleDelete(expense: Expense) {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    setBusyId(expense.id);
    setError(null);
    try {
      await deleteExpense(expense.id);
      await load();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.getUserFriendlyMessage()
          : "Failed to delete expense.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <CrmShell activeNav="Expenses">
      <div className="space-y-5 p-4 md:p-6">
        <PageHeader
          title="Expenses"
          subtitle="Record and track all business expenses"
          onRefresh={() => void load()}
        >
          <button
            type="button"
            onClick={() => void load()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-sky-300 hover:text-sky-600"
          >
            <RefreshCw className="h-4 w-4" aria-hidden="true" />
            Refresh
          </button>
          <button
            type="button"
            onClick={openCreate}
            className="flex items-center gap-2 rounded-xl bg-rose-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 active:scale-95"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Record Expense
          </button>
        </PageHeader>

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 md:text-sm">
                  Total (page)
                </p>
                <p className="mt-1 text-2xl font-bold text-rose-600">
                  {fmt(pageTotal)}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  {expenses.length} shown
                </p>
              </div>
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rose-500 text-white">
                <ReceiptText className="h-7 w-7" aria-hidden="true" />
              </span>
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 md:text-sm">
                  Completed (page)
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {fmt(completedTotal)}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  {total} expenses total
                </p>
              </div>
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
                <CheckCircle2 className="h-7 w-7" aria-hidden="true" />
              </span>
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 md:text-sm">This Month</p>
                <p className="mt-1 text-2xl font-bold text-indigo-600">
                  {fmt(monthTotal)}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  {monthFrom} → {monthTo}
                </p>
              </div>
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white">
                <CalendarDays className="h-7 w-7" aria-hidden="true" />
              </span>
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 md:text-sm">Reversed</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {reversedCount}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  expenses reversed
                </p>
              </div>
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                <RotateCcw className="h-7 w-7" aria-hidden="true" />
              </span>
            </div>
          </article>
        </div>

        {/* Filters */}
        <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-3 lg:grid-cols-6">
            <div className="relative lg:col-span-2">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Search className="h-4 w-4" aria-hidden="true" />
              </span>
              <input
                type="search"
                placeholder="Search party, reference, description…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilters();
                }}
                className={`${filterInputClass} pl-9`}
              />
            </div>
            <select
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as "All Categories" | ExpenseCategory)
              }
              className={`${filterInputClass} appearance-none pr-8`}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
            <select
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as "All Modes" | ExpensePaymentMode)
              }
              className={`${filterInputClass} appearance-none pr-8`}
            >
              {PAYMENT_MODES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) =>
                setStatus(e.target.value as "All Statuses" | ExpenseStatus)
              }
              className={`${filterInputClass} appearance-none pr-8`}
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className={filterInputClass}
              title="Date from"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className={`${filterInputClass} lg:col-span-2`}
                title="Date to"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={applyFilters}
                className="flex items-center gap-2 rounded-xl bg-[#FF6B4A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] active:scale-95"
              >
                <Search className="h-4 w-4" aria-hidden="true" />
                Apply Filters
              </button>
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                  Clear Filters
                </button>
              )}
            </div>
          </div>
        </section>

        {/* Table */}
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <ReceiptText
                className="h-5 w-5 text-rose-500"
                aria-hidden="true"
              />
              Expense History
            </h2>
          </div>

          <div className="overflow-x-auto">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-6 py-3">
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
                  disabled={page === 1 || loading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                  Prev
                </button>
                <span className="whitespace-nowrap px-3 text-sm text-slate-600">
                  Page {page} of {maxPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= maxPages || loading}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                  <ChevronRight className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {error && (
              <div className="border-b border-rose-100 bg-rose-50 px-6 py-3 text-sm text-rose-700">
                {error}
              </div>
            )}

            <table className="w-full min-w-[1000px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 text-left">ID</th>
                  <th className="px-4 py-3 text-left">Category</th>
                  <th className="px-4 py-3 text-left">Paid To</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Mode</th>
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))
                ) : expenses.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-16 text-center text-slate-400">
                      No expenses found.
                    </td>
                  </tr>
                ) : (
                  expenses.map((expense) => (
                    <tr
                      key={expense.id}
                      className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-3 font-medium text-slate-700">
                        {expense.id.slice(0, 8)}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700">
                          {expense.category}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {expense.party}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {expense.expenseDate}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {expense.paymentMode}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {expense.reference || "—"}
                      </td>
                      <td className="px-4 py-3 font-semibold text-rose-600">
                        {fmt(expense.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            expense.status === "Completed"
                              ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border border-slate-200 bg-slate-100 text-slate-500"
                          }`}
                        >
                          {expense.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEdit(expense)}
                            disabled={busyId !== null}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-sky-300 hover:text-sky-600 disabled:opacity-50"
                            title="Edit expense"
                          >
                            <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => void handleDelete(expense)}
                            disabled={busyId !== null}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-rose-300 hover:text-rose-600 disabled:opacity-50"
                            title="Delete expense"
                          >
                            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {sheetOpen && (
        <ExpenseSheet
          onClose={() => {
            setSheetOpen(false);
            setEditingExpense(undefined);
          }}
          onSave={handleSave}
          initialExpense={editingExpense}
        />
      )}
    </CrmShell>
  );
}
