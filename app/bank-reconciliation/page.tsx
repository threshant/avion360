"use client";

import PageHeader from "@/components/PageHeader";
import { fmtCompactCurrency } from "@/utils/formatting";
import CrmShell from "@/components/layout/CrmShell";
import {
  useBankReconciliationData,
  type BankAccountPayload,
  type StatementEntryPayload,
} from "@/hooks/useBankReconciliationData";
import { Building2, Plus, Upload, X } from "lucide-react";
import { useEffect, useState } from "react";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`crm-skeleton ${className}`} />;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type BankAccount = {
  id: string;
  accountName: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  openingBalance: number;
};

type BankStatement = {
  id: string;
  bankAccountId: string;
  date: string;
  description?: string;
  debit: number;
  credit: number;
  balance?: number;
  referenceNo?: string;
  transactionId?: string;
  isReconciled: boolean;
};

type SystemTransaction = {
  id: string;
  type: string;
  party: string;
  amount: number;
  date: string;
  status: string;
  details: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return fmtCompactCurrency(n);
}

// ─── Add Bank Account Modal ───────────────────────────────────────────────────

function AddBankAccountModal({
  onClose,
  onCreateAccount,
  onSaved,
}: {
  onClose: () => void;
  onCreateAccount: (payload: BankAccountPayload) => Promise<void>;
  onSaved: () => void;
}) {
  const [accountName, setAccountName] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [accountType, setAccountType] = useState("Current");
  const [openingBalance, setOpeningBalance] = useState("0");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountName || !bankName || !accountNumber) {
      setErr("Account name, bank name, and account number are required.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await onCreateAccount({
        accountName,
        bankName,
        accountNumber,
        ifscCode,
        accountType,
        openingBalance: Number(openingBalance),
      });
      onSaved();
      onClose();
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Add Bank Account
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Register a bank account for reconciliation
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-sky-300 hover:text-sky-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {err && (
            <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">
              {err}
            </p>
          )}
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Account Name *
              </label>
              <input
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="e.g. Main Current Account"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Bank Name *
              </label>
              <input
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="SBI / HDFC / ICICI"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Account Type
              </label>
              <select
                value={accountType}
                onChange={(e) => setAccountType(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              >
                <option>Current</option>
                <option>Savings</option>
                <option>OD</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Account Number *
              </label>
              <input
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="XXXX XXXX XXXX"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                IFSC Code
              </label>
              <input
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="SBIN0000123"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Opening Balance (₹)
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>
          <div className="flex gap-3 pt-2">
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
              className="flex-1 rounded-xl bg-[#FF6B4A] py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Account"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Import Statement Modal ───────────────────────────────────────────────────

function ImportStatementModal({
  bankAccounts,
  onClose,
  onImportStatements,
  onSaved,
}: {
  bankAccounts: BankAccount[];
  onClose: () => void;
  onImportStatements: (
    bankAccountId: string,
    entries: StatementEntryPayload[],
  ) => Promise<void>;
  onSaved: () => void;
}) {
  const [bankAccountId, setBankAccountId] = useState(bankAccounts[0]?.id ?? "");
  const [rows, setRows] = useState([
    { date: "", description: "", debit: "", credit: "", referenceNo: "" },
  ]);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  function addRow() {
    setRows((r) => [
      ...r,
      { date: "", description: "", debit: "", credit: "", referenceNo: "" },
    ]);
  }

  function updateRow(i: number, field: string, value: string) {
    setRows((prev) =>
      prev.map((r, idx) => (idx === i ? { ...r, [field]: value } : r)),
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bankAccountId) {
      setErr("Select a bank account.");
      return;
    }
    const valid = rows.filter(
      (r) => r.date && (Number(r.debit) > 0 || Number(r.credit) > 0),
    );
    if (!valid.length) {
      setErr("Add at least one valid transaction.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      const entries = valid.map((r) => ({
        date: r.date,
        description: r.description || null,
        debit: Number(r.debit) || 0,
        credit: Number(r.credit) || 0,
        referenceNo: r.referenceNo || null,
      }));
      await onImportStatements(bankAccountId, entries);
      onSaved();
      onClose();
    } catch (err) {
      setErr(err instanceof Error ? err.message : "Network error.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-2xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Import Bank Statement
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Manually enter bank transactions to reconcile
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:border-sky-300 hover:text-sky-600"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5">
          {err && (
            <p className="mb-3 rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">
              {err}
            </p>
          )}
          <div className="mb-4">
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Bank Account *
            </label>
            <select
              value={bankAccountId}
              onChange={(e) => setBankAccountId(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            >
              {bankAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.accountName} — {a.bankName}
                </option>
              ))}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs font-semibold uppercase text-slate-400">
                  <th className="pb-2 text-left">Date</th>
                  <th className="pb-2 pl-2 text-left">Description</th>
                  <th className="pb-2 pl-2 text-left">Debit</th>
                  <th className="pb-2 pl-2 text-left">Credit</th>
                  <th className="pb-2 pl-2 text-left">Ref No</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r, i) => (
                  <tr key={i}>
                    <td className="py-1 pr-2">
                      <input
                        type="date"
                        value={r.date}
                        onChange={(e) => updateRow(i, "date", e.target.value)}
                        className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-sky-300"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        value={r.description}
                        onChange={(e) =>
                          updateRow(i, "description", e.target.value)
                        }
                        className="h-9 w-full rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-sky-300"
                        placeholder="Description"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={r.debit}
                        onChange={(e) => updateRow(i, "debit", e.target.value)}
                        className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-sky-300"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-1 pr-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={r.credit}
                        onChange={(e) => updateRow(i, "credit", e.target.value)}
                        className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-sky-300"
                        placeholder="0"
                      />
                    </td>
                    <td className="py-1">
                      <input
                        value={r.referenceNo}
                        onChange={(e) =>
                          updateRow(i, "referenceNo", e.target.value)
                        }
                        className="h-9 w-28 rounded-lg border border-slate-200 px-2 text-sm outline-none focus:border-sky-300"
                        placeholder="REF-XXX"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            type="button"
            onClick={addRow}
            className="mt-2 text-xs font-semibold text-sky-600 underline underline-offset-2"
          >
            + Add row
          </button>
          <div className="mt-4 flex gap-3">
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
              className="flex-1 rounded-xl bg-[#FF6B4A] py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] disabled:opacity-60"
            >
              {saving ? "Importing..." : "Import Transactions"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BankReconciliationPage() {
  const [selectedAccountId, setSelectedAccountId] = useState<string>("");
  const [filter, setFilter] = useState<"all" | "unreconciled" | "reconciled">(
    "unreconciled",
  );
  const [showAddAccount, setShowAddAccount] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [matchingId, setMatchingId] = useState<string | null>(null);
  const {
    bankAccounts,
    statements,
    transactions,
    isLoading,
    refresh,
    createBankAccount,
    importStatements,
    reconcile: reconcileStatement,
    unreconcile: unreconcileStatement,
  } = useBankReconciliationData(selectedAccountId, filter);

  useEffect(() => {
    if (!selectedAccountId && bankAccounts.length > 0) {
      setSelectedAccountId(bankAccounts[0].id);
    }
  }, [bankAccounts, selectedAccountId]);

  async function reconcile(statementId: string, transactionId: string) {
    await reconcileStatement(statementId, transactionId);
    setMatchingId(null);
    await refresh();
  }

  async function unreconcile(statementId: string) {
    await unreconcileStatement(statementId);
    await refresh();
  }

  const reconciledCount = statements.filter((s) => s.isReconciled).length;
  const unreconciledCount = statements.filter((s) => !s.isReconciled).length;
  const totalCredits = statements.reduce((s, r) => s + r.credit, 0);
  const totalDebits = statements.reduce((s, r) => s + r.debit, 0);

  return (
    <CrmShell activeNav="Bank Reconciliation">
      <div
        role="status"
        aria-label="Loading bank reconciliation"
        className="space-y-5 p-4 md:p-6"
      >
        <PageHeader
          title="Bank Reconciliation"
          subtitle="Match bank statement entries with system transactions"
          onRefresh={() => refresh()}
        >
          <button
            type="button"
            onClick={() => setShowImport(true)}
            disabled={bankAccounts.length === 0}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-sky-300 hover:text-sky-600 disabled:opacity-50"
          >
            <Upload className="h-4 w-4" aria-hidden="true" />
            Import Statement
          </button>
          <button
            type="button"
            onClick={() => setShowAddAccount(true)}
            className="flex items-center gap-2 rounded-xl bg-[#FF6B4A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Bank Account
          </button>
        </PageHeader>

        {/* ── KPI Cards ── */}
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
                  label: "Bank Accounts",
                  value: String(bankAccounts.length),
                  color: "sky",
                  desc: "registered",
                },
                {
                  label: "Total Credits",
                  value: fmt(totalCredits),
                  color: "emerald",
                  desc: "bank inflows",
                },
                {
                  label: "Total Debits",
                  value: fmt(totalDebits),
                  color: "rose",
                  desc: "bank outflows",
                },
                {
                  label: "Unreconciled",
                  value: String(unreconciledCount),
                  color: "amber",
                  desc: `of ${statements.length} entries`,
                },
              ].map((card) => (
                <article
                  key={card.label}
                  className={`rounded-2xl border bg-white px-5 py-4 shadow-sm border-${card.color}-200`}
                >
                  <p className="text-xs text-slate-500">{card.label}</p>
                  <p
                    className={`mt-1 text-2xl font-bold text-${card.color}-600`}
                  >
                    {card.value}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">{card.desc}</p>
                </article>
              ))}
        </section>

        {/* ── Main content ── */}
        {bankAccounts.length === 0 && !isLoading ? (
          <section className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-sm">
            <Building2
              className="mx-auto h-12 w-12 text-slate-300"
              aria-hidden="true"
            />
            <h3 className="mt-4 text-base font-semibold text-slate-700">
              No Bank Accounts
            </h3>
            <p className="mt-1.5 text-sm text-slate-400">
              Add a bank account to start reconciliation.
            </p>
            <button
              type="button"
              onClick={() => setShowAddAccount(true)}
              className="mt-4 rounded-xl bg-[#FF6B4A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39]"
            >
              Add Bank Account
            </button>
          </section>
        ) : (
          <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-wrap items-center gap-4 border-b border-slate-100 px-6 py-4">
              <div>
                <label className="mr-2 text-xs font-semibold text-slate-500">
                  Account
                </label>
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(e.target.value)}
                  className="h-9 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                >
                  {bankAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.accountName} — {a.bankName}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex rounded-xl border border-slate-200 bg-slate-50 p-1">
                {(["all", "unreconciled", "reconciled"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${filter === f ? "bg-white text-sky-600 shadow-sm" : "text-slate-500 hover:text-slate-700"}`}
                  >
                    {f}
                  </button>
                ))}
              </div>
              <div className="ml-auto flex items-center gap-2 text-xs text-slate-500">
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">
                  {reconciledCount} reconciled
                </span>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-amber-700">
                  {unreconciledCount} pending
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[800px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-4 py-3 text-left">Description</th>
                    <th className="px-4 py-3 text-left">Ref No</th>
                    <th className="px-4 py-3 text-right">Debit</th>
                    <th className="px-4 py-3 text-right">Credit</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Match</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 6 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <SkeletonBox className="h-4 w-24 rounded-md" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : statements.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-16 text-center text-slate-400"
                      >
                        No statement entries.{" "}
                        <button
                          type="button"
                          onClick={() => setShowImport(true)}
                          className="text-sky-600 underline underline-offset-2"
                        >
                          Import a statement
                        </button>
                      </td>
                    </tr>
                  ) : (
                    statements.map((stmt) => (
                      <>
                        <tr
                          key={stmt.id}
                          className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60"
                        >
                          <td className="px-6 py-3 text-slate-600">
                            {stmt.date}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {stmt.description ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                            {stmt.referenceNo ?? "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-rose-600">
                            {stmt.debit > 0 ? fmt(stmt.debit) : "—"}
                          </td>
                          <td className="px-4 py-3 text-right text-emerald-600">
                            {stmt.credit > 0 ? fmt(stmt.credit) : "—"}
                          </td>
                          <td className="px-4 py-3">
                            {stmt.isReconciled ? (
                              <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200">
                                Reconciled
                              </span>
                            ) : (
                              <span className="rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 border border-amber-200">
                                Pending
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            {stmt.isReconciled ? (
                              <button
                                type="button"
                                onClick={() => unreconcile(stmt.id)}
                                className="text-xs text-slate-400 underline underline-offset-2 hover:text-rose-500"
                              >
                                Unmatch
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() =>
                                  setMatchingId(
                                    matchingId === stmt.id ? null : stmt.id,
                                  )
                                }
                                className="rounded-xl border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-sky-50"
                              >
                                {matchingId === stmt.id ? "Cancel" : "Match"}
                              </button>
                            )}
                          </td>
                        </tr>
                        {/* Transaction picker */}
                        {matchingId === stmt.id && (
                          <tr className="border-b border-slate-100 bg-sky-50/40">
                            <td colSpan={7} className="px-6 py-3">
                              <p className="mb-2 text-xs font-semibold text-slate-500">
                                Select matching system transaction:
                              </p>
                              <div className="max-h-48 space-y-1.5 overflow-y-auto">
                                {transactions
                                  .filter((t) => {
                                    const amt =
                                      stmt.credit > 0
                                        ? stmt.credit
                                        : stmt.debit;
                                    return Math.abs(t.amount - amt) < amt * 0.1;
                                  })
                                  .slice(0, 10)
                                  .map((t) => (
                                    <button
                                      key={t.id}
                                      type="button"
                                      onClick={() => reconcile(stmt.id, t.id)}
                                      className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs hover:border-sky-300 hover:bg-sky-50"
                                    >
                                      <span className="font-semibold text-slate-700">
                                        {t.id}
                                      </span>
                                      <span className="text-slate-500">
                                        {t.party} · {t.date}
                                      </span>
                                      <span className="font-bold text-sky-700">
                                        {fmt(t.amount)}
                                      </span>
                                    </button>
                                  ))}
                                {transactions.filter((t) => {
                                  const amt =
                                    stmt.credit > 0 ? stmt.credit : stmt.debit;
                                  return Math.abs(t.amount - amt) < amt * 0.1;
                                }).length === 0 && (
                                  <p className="text-xs text-slate-400">
                                    No close matches found. Try manual match.
                                  </p>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {showAddAccount && (
        <AddBankAccountModal
          onClose={() => setShowAddAccount(false)}
          onCreateAccount={createBankAccount}
          onSaved={async () => {
            await refresh();
          }}
        />
      )}
      {showImport && bankAccounts.length > 0 && (
        <ImportStatementModal
          bankAccounts={bankAccounts}
          onClose={() => setShowImport(false)}
          onImportStatements={importStatements}
          onSaved={async () => {
            await refresh();
          }}
        />
      )}
    </CrmShell>
  );
}
