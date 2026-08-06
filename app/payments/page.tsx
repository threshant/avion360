"use client";

import PageHeader from "@/components/PageHeader";
import { RecordPaymentSheet } from "@/components/RecordPaymentSheet";
import CrmShell from "@/components/layout/CrmShell";
import { useClients } from "@/hooks/useClients";
import { fetchPayments } from "@/services/paymentService";
import type { Payment, PaymentMode, PaymentStatus } from "@/types/payment";
import {
  Banknote,
  ChevronLeft,
  ChevronRight,
  Landmark,
  Plus,
  Receipt,
  RefreshCw,
  Search,
  X,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return "Rs. " + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

const PAYMENT_MODES: ("All Modes" | PaymentMode)[] = [
  "All Modes",
  "Cash",
  "Bank Transfer",
  "UPI",
  "Cheque",
  "Other",
];

const PAYMENT_STATUSES: ("All Statuses" | PaymentStatus)[] = [
  "All Statuses",
  "Completed",
  "Reversed",
];

function SkeletonRow() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-6 py-3">
        <div className="crm-skeleton h-4 w-28 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <div className="crm-skeleton h-4 w-36 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <div className="crm-skeleton h-4 w-24 rounded-md" />
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
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
  const { clients, loading: clientsLoading } = useClients({ pageSize: 100 });

  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [clientId, setClientId] = useState("all");
  const [mode, setMode] = useState<"All Modes" | PaymentMode>("All Modes");
  const [status, setStatus] = useState<"All Statuses" | PaymentStatus>(
    "All Statuses",
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [showRecordPayment, setShowRecordPayment] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchPayments({
        page,
        pageSize,
        search: search.trim() || undefined,
        clientId: clientId === "all" ? undefined : clientId,
        mode: mode === "All Modes" ? undefined : mode,
        status: status === "All Statuses" ? undefined : status,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      });
      setPayments(res.data);
      setTotal(res.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load payments.",
      );
    } finally {
      setLoading(false);
    }
  }, [page, pageSize, search, clientId, mode, status, dateFrom, dateTo]);

  useEffect(() => {
    void load();
  }, [load]);

  function applyFilters() {
    setPage(1);
  }

  function clearFilters() {
    setSearch("");
    setClientId("all");
    setMode("All Modes");
    setStatus("All Statuses");
    setDateFrom("");
    setDateTo("");
    setPage(1);
  }

  const maxPages = Math.max(1, Math.ceil(total / pageSize));
  const pageTotal = payments.reduce((s, p) => s + p.amount, 0);
  const completedTotal = payments
    .filter((p) => p.status === "Completed")
    .reduce((s, p) => s + p.amount, 0);
  const onAccountCount = payments.filter((p) => !p.invoiceId).length;

  const hasFilters =
    search.trim() !== "" ||
    clientId !== "all" ||
    mode !== "All Modes" ||
    status !== "All Statuses" ||
    dateFrom !== "" ||
    dateTo !== "";

  const filterInputClass =
    "h-10 rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2";

  return (
    <CrmShell activeNav="Payments">
      <div className="space-y-5 p-4 md:p-6">
        <PageHeader
          title="Payments"
          subtitle="All cash collection records against invoices and on-account advances"
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
            onClick={() => setShowRecordPayment(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Record Payment
          </button>
        </PageHeader>

        {/* KPI cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <article className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 md:text-sm">
                  Collected (page)
                </p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {fmt(completedTotal)}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  {total} payments total
                </p>
              </div>
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
                <Banknote className="h-7 w-7" aria-hidden="true" />
              </span>
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 md:text-sm">
                  Total Amount (page)
                </p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {fmt(pageTotal)}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  {payments.length} shown
                </p>
              </div>
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-sky-500 text-white">
                <Receipt className="h-7 w-7" aria-hidden="true" />
              </span>
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 md:text-sm">On Account</p>
                <p className="mt-1 text-2xl font-bold text-indigo-600">
                  {onAccountCount}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  advance payments
                </p>
              </div>
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-indigo-500 text-white">
                <Landmark className="h-7 w-7" aria-hidden="true" />
              </span>
            </div>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-slate-500 md:text-sm">Client Filter</p>
                <p className="mt-1 truncate text-lg font-bold text-slate-900">
                  {clientId === "all"
                    ? "All clients"
                    : clients.find((c) => c.id === clientId)?.company ||
                      clients.find((c) => c.id === clientId)?.name ||
                      "Selected client"}
                </p>
                <p className="mt-1 text-xs font-medium text-slate-400">
                  {clientsLoading ? "loading…" : `${clients.length} clients`}
                </p>
              </div>
              <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-200 text-slate-500">
                <Search className="h-7 w-7" aria-hidden="true" />
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
                placeholder="Search reference, notes, invoice…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") applyFilters();
                }}
                className={`${filterInputClass} pl-9`}
              />
            </div>
            <select
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className={`${filterInputClass} appearance-none pr-8`}
            >
              <option value="all">All Clients</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.company ? `${c.name} — ${c.company}` : c.name}
                </option>
              ))}
            </select>
            <select
              value={mode}
              onChange={(e) =>
                setMode(e.target.value as "All Modes" | PaymentMode)
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
                setStatus(e.target.value as "All Statuses" | PaymentStatus)
              }
              className={`${filterInputClass} appearance-none pr-8`}
            >
              {PAYMENT_STATUSES.map((s) => (
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
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className={filterInputClass}
              title="Date to"
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
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
        </section>

        {/* Table */}
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
            <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
              <Banknote className="h-5 w-5 text-emerald-500" aria-hidden="true" />
              Payment History
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

            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 text-left">Payment ID</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Invoice</th>
                  <th className="px-4 py-3 text-left">Mode</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Amount</th>
                  <th className="px-4 py-3 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))
                ) : payments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-16 text-center text-slate-400">
                      No payments found.
                    </td>
                  </tr>
                ) : (
                  payments.map((payment) => (
                    <tr
                      key={payment.id}
                      className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-3 font-medium text-slate-700">
                        {payment.id}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {payment.clientName || "—"}
                      </td>
                      <td className="px-4 py-3">
                        {payment.invoiceId ? (
                          <span className="inline-flex items-center gap-1.5 text-slate-600">
                            <Receipt
                              className="h-3.5 w-3.5 text-slate-400"
                              aria-hidden="true"
                            />
                            {payment.invoiceId}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-indigo-600">
                            <Landmark
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            On Account
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {payment.mode}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {payment.paymentDate}
                      </td>
                      <td className="px-4 py-3 font-semibold text-emerald-600">
                        {fmt(payment.amount)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                            payment.status === "Completed"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-slate-100 text-slate-500 border border-slate-200"
                          }`}
                        >
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showRecordPayment && (
        <RecordPaymentSheet
          onClose={() => setShowRecordPayment(false)}
          clients={clients}
          onSaved={() => {
            setShowRecordPayment(false);
            void load();
          }}
        />
      )}
    </CrmShell>
  );
}
