"use client";

import PageHeader from "@/components/PageHeader";
import { fmtCompactCurrency } from "@/utils/formatting";
import CrmShell from "@/components/layout/CrmShell";
import {
  useAccountsData,
  type AccountsBillPayload,
  type AccountsVendorPayload,
} from "@/hooks/useAccountsData";
import { Plus, X } from "lucide-react";
import { useState } from "react";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`crm-skeleton ${className}`} />;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ARRecord = {
  id: string;
  client?: string;
  totalAmount: number;
  date: string;
  dueDate: string;
  status: string;
  agingBucket: "Current" | "1-30" | "31-60" | "61-90" | "90+";
};

type APRecord = {
  id: string;
  vendorName: string;
  vendorCompany?: string;
  totalAmount: number;
  billDate: string;
  dueDate?: string;
  status: string;
  category?: string;
};

type Vendor = {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  gstNumber?: string;
  paymentTerms?: number;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return fmtCompactCurrency(n);
}

function agingBucket(dueDate: string): ARRecord["agingBucket"] {
  const days = Math.floor(
    (Date.now() - new Date(dueDate).getTime()) / 86400000,
  );
  if (days <= 0) return "Current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

const arStatusBadge: Record<string, string> = {
  Paid: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Pending: "bg-amber-50   text-amber-700   border border-amber-200",
  Sent: "bg-sky-50     text-sky-700     border border-sky-200",
  Overdue: "bg-rose-50    text-rose-700    border border-rose-200",
  Draft: "bg-slate-100  text-slate-500   border border-slate-200",
};

const apStatusBadge: Record<string, string> = {
  Unpaid: "bg-amber-50  text-amber-700   border border-amber-200",
  Paid: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Partial: "bg-sky-50    text-sky-700     border border-sky-200",
  Overdue: "bg-rose-50   text-rose-700    border border-rose-200",
  Cancelled: "bg-slate-100 text-slate-500   border border-slate-200",
};

const agingColors: Record<ARRecord["agingBucket"], string> = {
  Current: "text-emerald-700 bg-emerald-50 border border-emerald-200",
  "1-30": "text-sky-700     bg-sky-50     border border-sky-200",
  "31-60": "text-amber-700   bg-amber-50   border border-amber-200",
  "61-90": "text-orange-700  bg-orange-50  border border-orange-200",
  "90+": "text-rose-700    bg-rose-50    border border-rose-200",
};

// ─── Add Vendor Modal ─────────────────────────────────────────────────────────

function AddVendorModal({
  onClose,
  onCreateVendor,
  onSaved,
}: {
  onClose: () => void;
  onCreateVendor: (payload: AccountsVendorPayload) => Promise<unknown>;
  onSaved: () => void;
}) {
  const [name, setName] = useState("");
  const [company, setCompany] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setErr("Vendor name is required.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await onCreateVendor({ name, company, email, phone, gstNumber });
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
            <h2 className="text-lg font-bold text-slate-900">Add Vendor</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Save vendor details for payables
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
                Vendor Name *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="Vendor name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Company
              </label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="Company name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                GST Number
              </label>
              <input
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="GST number"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Phone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="+91 9999999999"
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
              {saving ? "Saving..." : "Save Vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Add Bill Modal ───────────────────────────────────────────────────────────

function AddBillModal({
  vendors,
  onClose,
  onCreateBill,
  onSaved,
}: {
  vendors: Vendor[];
  onClose: () => void;
  onCreateBill: (payload: AccountsBillPayload) => Promise<unknown>;
  onSaved: () => void;
}) {
  const [vendorId, setVendorId] = useState("");
  const [amount, setAmount] = useState("");
  const [billDate, setBillDate] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("Other");
  const [description, setDescription] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!vendorId) {
      setErr("Select a vendor.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setErr("Enter a valid amount.");
      return;
    }
    setSaving(true);
    setErr("");
    try {
      await onCreateBill({
        vendorId,
        amount: Number(amount),
        billDate,
        dueDate: dueDate || null,
        category,
        description,
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
              Add Vendor Bill
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Record a new payable
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
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Vendor *
            </label>
            <select
              value={vendorId}
              onChange={(e) => setVendorId(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
            >
              <option value="">Select vendor...</option>
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name}
                  {v.company ? ` — ${v.company}` : ""}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Amount (₹) *
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              >
                {[
                  "Maintenance",
                  "Vendor Payment",
                  "Administrative",
                  "Logistics",
                  "Utilities",
                  "Other",
                ].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Bill Date *
              </label>
              <input
                type="date"
                value={billDate}
                onChange={(e) => setBillDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Due Date
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              />
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-500">
              Description
            </label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
              placeholder="Brief description"
            />
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
              {saving ? "Saving..." : "Add Bill"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AccountsPage() {
  const [activeTab, setActiveTab] = useState<"ar" | "ap" | "vendors">("ar");
  const [showAddVendor, setShowAddVendor] = useState(false);
  const [showAddBill, setShowAddBill] = useState(false);
  const {
    arRecords,
    apRecords,
    vendors,
    isLoading,
    refresh,
    createVendor,
    createBill,
    markBillPaid,
  } = useAccountsData();

  // KPIs
  const totalAR = arRecords.reduce((s, r) => s + r.totalAmount, 0);
  const overdueAR = arRecords
    .filter((r) => r.status === "Overdue" || r.agingBucket !== "Current")
    .reduce((s, r) => s + r.totalAmount, 0);
  const totalAP = apRecords
    .filter((r) => r.status !== "Paid" && r.status !== "Cancelled")
    .reduce((s, r) => s + r.totalAmount, 0);
  const overdueAP = apRecords
    .filter((r) => r.status === "Overdue")
    .reduce((s, r) => s + r.totalAmount, 0);

  // AR aging summary
  const agingBuckets: ARRecord["agingBucket"][] = [
    "Current",
    "1-30",
    "31-60",
    "61-90",
    "90+",
  ];
  const agingSummary = agingBuckets.map((b) => ({
    label: b,
    count: arRecords.filter((r) => r.agingBucket === b).length,
    amount: arRecords
      .filter((r) => r.agingBucket === b)
      .reduce((s, r) => s + r.totalAmount, 0),
  }));

  const tabs = [
    {
      key: "ar" as const,
      label: "Accounts Receivable",
      count: arRecords.length,
    },
    {
      key: "ap" as const,
      label: "Accounts Payable",
      count: apRecords.filter((r) => r.status !== "Paid").length,
    },
    { key: "vendors" as const, label: "Vendors", count: vendors.length },
  ];

  return (
    <CrmShell activeNav="Accounts">
      <div
        role="status"
        aria-label="Loading accounts"
        className="space-y-5 p-4 md:p-6"
      >
        <PageHeader
          title="Accounts Payable & Receivable"
          subtitle="Track outstanding customer invoices and vendor bills"
          onRefresh={() => refresh()}
        >
          <button
            type="button"
            onClick={() => setShowAddBill(true)}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-sky-300 hover:text-sky-600"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Bill
          </button>
          <button
            type="button"
            onClick={() => setShowAddVendor(true)}
            className="flex items-center gap-2 rounded-xl bg-[#FF6B4A] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39]"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Vendor
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
                  label: "Total Receivable",
                  value: fmt(totalAR),
                  color: "sky",
                  desc: `${arRecords.length} outstanding`,
                },
                {
                  label: "Overdue AR",
                  value: fmt(overdueAR),
                  color: "rose",
                  desc: "Past due date",
                },
                {
                  label: "Total Payable",
                  value: fmt(totalAP),
                  color: "amber",
                  desc: `${apRecords.filter((r) => r.status !== "Paid").length} unpaid bills`,
                },
                {
                  label: "Overdue AP",
                  value: fmt(overdueAP),
                  color: "orange",
                  desc: "Past due date",
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

        {/* ── AR Aging Summary ── */}
        {!isLoading && activeTab === "ar" && (
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-4 shadow-sm">
            <h3 className="mb-3 text-sm font-semibold text-slate-700">
              AR Aging Summary
            </h3>
            <div className="flex flex-wrap gap-3">
              {agingSummary.map((b) => (
                <div
                  key={b.label}
                  className={`flex flex-col items-center rounded-xl px-4 py-2 text-center ${agingColors[b.label as ARRecord["agingBucket"]]}`}
                >
                  <span className="text-xs font-bold">{b.label}</span>
                  <span className="mt-0.5 text-sm font-semibold">
                    {fmt(b.amount)}
                  </span>
                  <span className="text-xs opacity-70">{b.count} invoices</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Tabs ── */}
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center gap-1 border-b border-slate-100 px-6 pt-4">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-1.5 rounded-t-xl px-4 py-2.5 text-sm font-semibold transition ${
                  activeTab === tab.key
                    ? "text-sky-600 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:bg-sky-500"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
                <span
                  className={`rounded-full px-1.5 py-0.5 text-xs ${activeTab === tab.key ? "bg-sky-100 text-sky-700" : "bg-slate-100 text-slate-500"}`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          <div className="overflow-x-auto">
            {/* AR Table */}
            {activeTab === "ar" && (
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-6 py-3 text-left">Invoice ID</th>
                    <th className="px-4 py-3 text-left">Client</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Invoice Date</th>
                    <th className="px-4 py-3 text-left">Due Date</th>
                    <th className="px-4 py-3 text-left">Aging</th>
                    <th className="px-4 py-3 text-left">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        {Array.from({ length: 7 }).map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <SkeletonBox className="h-4 w-24 rounded-md" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : arRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-16 text-center text-slate-400"
                      >
                        No outstanding receivables.
                      </td>
                    </tr>
                  ) : (
                    arRecords.map((r) => (
                      <tr
                        key={r.id}
                        className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-6 py-3 font-semibold text-slate-700">
                          {r.id}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {r.client}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {fmt(r.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">{r.date}</td>
                        <td className="px-4 py-3 text-slate-500">
                          {r.dueDate}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${agingColors[r.agingBucket]}`}
                          >
                            {r.agingBucket}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${arStatusBadge[r.status] ?? "bg-slate-100 text-slate-500"}`}
                          >
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* AP Table */}
            {activeTab === "ap" && (
              <table className="w-full min-w-[700px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-6 py-3 text-left">Bill ID</th>
                    <th className="px-4 py-3 text-left">Vendor</th>
                    <th className="px-4 py-3 text-left">Category</th>
                    <th className="px-4 py-3 text-left">Amount</th>
                    <th className="px-4 py-3 text-left">Bill Date</th>
                    <th className="px-4 py-3 text-left">Due Date</th>
                    <th className="px-4 py-3 text-left">Status</th>
                    <th className="px-4 py-3 text-left">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        {Array.from({ length: 8 }).map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <SkeletonBox className="h-4 w-24 rounded-md" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : apRecords.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="py-16 text-center text-slate-400"
                      >
                        No vendor bills yet.
                      </td>
                    </tr>
                  ) : (
                    apRecords.map((b) => (
                      <tr
                        key={b.id}
                        className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-6 py-3 font-semibold text-slate-700">
                          {b.id}
                        </td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">
                            {b.vendorName}
                          </p>
                          {b.vendorCompany && (
                            <p className="text-xs text-slate-400">
                              {b.vendorCompany}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {b.category ?? "—"}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {fmt(b.totalAmount)}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {b.billDate}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {b.dueDate ?? "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${apStatusBadge[b.status] ?? "bg-slate-100 text-slate-500"}`}
                          >
                            {b.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {b.status === "Unpaid" && (
                            <button
                              type="button"
                              onClick={() => markBillPaid(b.id)}
                              className="rounded-xl border border-emerald-200 px-3 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50"
                            >
                              Mark Paid
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}

            {/* Vendors Table */}
            {activeTab === "vendors" && (
              <table className="w-full min-w-[600px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    <th className="px-6 py-3 text-left">Name</th>
                    <th className="px-4 py-3 text-left">Company</th>
                    <th className="px-4 py-3 text-left">Email</th>
                    <th className="px-4 py-3 text-left">Phone</th>
                    <th className="px-4 py-3 text-left">GST Number</th>
                    <th className="px-4 py-3 text-left">Payment Terms</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                      <tr key={i} className="border-b border-slate-100">
                        {Array.from({ length: 6 }).map((__, j) => (
                          <td key={j} className="px-4 py-3">
                            <SkeletonBox className="h-4 w-24 rounded-md" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : vendors.length === 0 ? (
                    <tr>
                      <td
                        colSpan={6}
                        className="py-16 text-center text-slate-400"
                      >
                        No vendors yet.{" "}
                        <button
                          type="button"
                          onClick={() => setShowAddVendor(true)}
                          className="text-sky-600 underline underline-offset-2"
                        >
                          Add the first one
                        </button>
                      </td>
                    </tr>
                  ) : (
                    vendors.map((v) => (
                      <tr
                        key={v.id}
                        className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-6 py-3 font-semibold text-slate-800">
                          {v.name}
                        </td>
                        <td className="px-4 py-3 text-slate-600">
                          {v.company ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {v.email ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {v.phone ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {v.gstNumber ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-slate-500">
                          {v.paymentTerms ?? 30} days
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>
        </section>
      </div>

      {showAddVendor && (
        <AddVendorModal
          onClose={() => setShowAddVendor(false)}
          onCreateVendor={createVendor}
          onSaved={async () => {
            await refresh();
          }}
        />
      )}
      {showAddBill && (
        <AddBillModal
          vendors={vendors}
          onClose={() => setShowAddBill(false)}
          onCreateBill={createBill}
          onSaved={async () => {
            await refresh();
          }}
        />
      )}
    </CrmShell>
  );
}
