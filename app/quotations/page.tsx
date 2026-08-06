"use client";

import CrmShell from "@/components/layout/CrmShell";
import { fmtCompactCurrency } from "@/utils/formatting";
import { CreateQuotationModal } from "@/components/CreateQuotationModal";
import { QuotationDownloadButton } from "@/components/QuotationDownloadButton";
import { useQuotationsPageData } from "@/hooks/useQuotationsPageData";
import type { Client } from "@/types/client";
import type {
  Quotation as ImportedQuotation,
  QuotationStatus as ImportedQuotationStatus,
} from "@/types/invoice";
import { CheckCircle2, ChevronDown, FileText, Plus, Trash2, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`crm-skeleton ${className}`} />;
}

function QuotationRowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-6 py-3">
        <SkeletonBox className="h-4 w-28 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-32 rounded-md" />
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
        <SkeletonBox className="h-7 w-20 rounded-lg" />
      </td>
    </tr>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n?: number | null) {
  if (n === undefined || n === null) return "Rs. 0";
  return fmtCompactCurrency(n, "Rs. ");
}

// ─── Badges ───────────────────────────────────────────────────────────────────

const quotationStatusBadge: Record<ImportedQuotationStatus, string> = {
  Pending: "bg-amber-50  text-amber-700  border border-amber-200",
  Accepted: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Draft: "bg-slate-100 text-slate-500  border border-slate-200",
  Rejected: "bg-rose-50    text-rose-700    border border-rose-200",
  Expired: "bg-orange-50  text-orange-700  border border-orange-200",
};

// ─── Action icon button ────────────────────────────────────────────────────────

function ActionBtn({
  title,
  onClick,
  children,
}: {
  title: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-sky-300 hover:text-sky-600"
    >
      {children}
    </button>
  );
}

// ─── Add Client Modal ─────────────────────────────────────────────────────────

type AddClientModalProps = {
  onClose: () => void;
  onCreateClient: (payload: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    address?: string;
    gstNumber?: string;
  }) => Promise<Client>;
  onSaved: (client: Client) => void;
};

function AddClientModal({
  onClose,
  onCreateClient,
  onSaved,
}: AddClientModalProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [company, setCompany] = useState("");
  const [address, setAddress] = useState("");
  const [gstNumber, setGstNumber] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Client name is required.");
      return;
    }

    setSaving(true);
    try {
      const created = await onCreateClient({
        name: name.trim(),
        email,
        phone,
        company,
        address,
        gstNumber,
      });
      onSaved(created);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
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
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-sky-900/10">
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Add New Client</h2>
            <p className="mt-0.5 text-sm text-slate-500">
              Save client details for quotations
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

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 px-6 py-5">
            {error && (
              <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">
                {error}
              </p>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  placeholder="e.g. rahul@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Phone
                </label>
                <input
                  type="tel"
                  placeholder="e.g. +91 8668191780"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Company
                </label>
                <input
                  type="text"
                  placeholder="e.g. Acme Corp"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-semibold text-slate-700">
                  Address
                </label>
                <textarea
                  placeholder="Street address"
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-semibold text-slate-700">
                  GST Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 33AFPFS2192K1ZI"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-[#FF6B4A] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#e55a39] disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Client"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuotationsPage() {
  const [showAddClient, setShowAddClient] = useState(false);
  const [showQuotationModal, setShowQuotationModal] = useState(false);
  const [filter, setFilter] = useState<"all" | ImportedQuotationStatus>("all");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [raisingProformaId, setRaisingProformaId] = useState<string | null>(null);
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openStatusId) return;
    const handler = (e: MouseEvent) => {
      if (statusMenuRef.current && !statusMenuRef.current.contains(e.target as Node)) {
        setOpenStatusId(null);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [openStatusId]);

  const {
    clients,
    quotations,
    loading,
    addClient,
    addQuotation,
    removeQuotation,
    updateQuotationStatus,
    raiseProforma,
  } = useQuotationsPageData(filter);

  async function handleDeleteQuotation(id: string) {
    if (!confirm("Are you sure you want to delete this quotation?")) return;
    setUpdatingId(id);
    try {
      await removeQuotation(id);
    } catch {
      // silently fail
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleQuickStatusChange(id: string, status: ImportedQuotationStatus) {
    setUpdatingId(id);
    try {
      await updateQuotationStatus(id, status);
    } catch {
      alert("Failed to update quotation status. Please try again.");
    } finally {
      setUpdatingId(null);
    }
  }

  const filteredQuotations = quotations;
  const totalAmount = quotations.reduce((sum, q) => sum + q.totalAmount, 0);
  const acceptedAmount = quotations
    .filter((q) => q.status === "Accepted")
    .reduce((sum, q) => sum + q.totalAmount, 0);

  async function handleRaiseProforma(quotation: ImportedQuotation) {
    if (!quotation.customerId) {
      alert("This quotation has no linked client. Cannot raise a proforma.");
      return;
    }
    setRaisingProformaId(quotation.id);
    try {
      await raiseProforma({
        quotationId: quotation.id,
        clientId: quotation.customerId,
        date: new Date().toISOString().slice(0, 10),
        status: "Draft",
        subtotal: quotation.subtotal,
        gstRate: quotation.gstRate,
        items: quotation.items,
      });
      alert("Proforma raised successfully.");
    } catch (err) {
      alert(
        err instanceof Error && err.message
          ? err.message
          : "Failed to raise proforma. Please try again.",
      );
    } finally {
      setRaisingProformaId(null);
    }
  }

  const handleAddQuotation = () => {
    setShowQuotationModal(false);
  };

  const handleAddClient = (client: Client) => {
    setShowAddClient(false);
  };

  return (
    <CrmShell activeNav="Quotations">
      <div className="space-y-5 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4 sm:flex-wrap">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Quotations</h1>
            <p className="mt-1 text-slate-500">
              Manage and track your business quotations
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setShowAddClient(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              Add Client
            </button>
            <button
              onClick={() => setShowQuotationModal(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-[#FF6B4A] px-4 py-2 text-sm font-medium text-white transition hover:bg-[#e55a39]"
            >
              <Plus className="h-4 w-4" aria-hidden="true" />
              New Quotation
            </button>
          </div>
        </div>

        {/* KPI Cards */}
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Total Quotations</p>
                <p className="text-2xl font-bold text-slate-900">
                  {quotations.length}
                </p>
              </div>
              <div className="rounded-full bg-sky-100 p-3 text-sky-600">
                <FileText className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Total Value</p>
                <p className="text-2xl font-bold text-slate-900">
                  {fmt(totalAmount)}
                </p>
              </div>
              <div className="rounded-full bg-emerald-100 p-3 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-start justify-between">
              <div className="space-y-2">
                <p className="text-sm text-slate-500">Accepted</p>
                <p className="text-2xl font-bold text-slate-900">
                  {fmt(acceptedAmount)}
                </p>
              </div>
              <div className="rounded-full bg-purple-100 p-3 text-purple-600">
                <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter("all")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              filter === "all"
                  ? "bg-[#FF6B4A] text-white"
                : "border border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            All
          </button>
          {(
            ["Draft", "Pending", "Accepted", "Rejected", "Expired"] as const
          ).map((status) => (
            <button
              key={status}
              onClick={() => setFilter(status)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                filter === status
                ? "bg-[#FF6B4A] text-white"
                  : "border border-slate-200 text-slate-600 hover:border-slate-300"
              }`}
            >
              {status}
            </button>
          ))}
        </div>

        {/* Quotations Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-slate-600">
                  QUOTATION
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  CLIENT
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  DATE
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  AMOUNT
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  STATUS
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">
                  ACTION
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <QuotationRowSkeleton key={i} />
                ))
              ) : filteredQuotations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center">
                    <p className="text-slate-500">
                      No quotations found. Create your first quotation!
                    </p>
                  </td>
                </tr>
              ) : (
                filteredQuotations.map((q) => (
                  <tr
                    key={q.id}
                    className="border-b border-slate-100 transition hover:bg-slate-50"
                  >
                    <td className="px-6 py-3 text-sm font-medium text-slate-900">
                      {q.quotationNumber ?? q.id}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {q.client}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-600">
                      {new Date(q.date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {fmt(q.totalAmount)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() =>
                            setOpenStatusId(
                              openStatusId === q.id ? null : q.id,
                            )
                          }
                          disabled={updatingId === q.id}
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium disabled:opacity-60 ${
                            quotationStatusBadge[q.status as ImportedQuotationStatus]
                          }`}
                        >
                          {q.status}
                          <ChevronDown className="h-3 w-3" />
                        </button>
                        {openStatusId === q.id && (
                          <div
                            ref={statusMenuRef}
                            className="absolute left-0 top-full z-20 mt-1 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                          >
                            {Object.keys(quotationStatusBadge).map((s) => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => {
                                  void handleQuickStatusChange(q.id, s as ImportedQuotationStatus);
                                  setOpenStatusId(null);
                                }}
                                className={`flex w-full items-center px-3 py-1.5 text-xs hover:bg-slate-50 ${q.status === s ? "font-semibold text-sky-600" : "text-slate-700"}`}
                              >
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          title="Delete Quotation"
                          onClick={() => handleDeleteQuotation(q.id)}
                          className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-rose-300 hover:text-rose-600"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden="true" />
                        </button>
                        <QuotationDownloadButton quotation={q} />
                        {q.status === "Accepted" && (
                          <button
                            type="button"
                            onClick={() => handleRaiseProforma(q)}
                            disabled={raisingProformaId === q.id}
                            className="flex items-center gap-1.5 rounded-xl border border-cyan-200 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-50 disabled:opacity-60"
                          >
                            <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                            {raisingProformaId === q.id ? "Raising..." : "Raise Proforma"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modals */}
      {showAddClient && (
        <AddClientModal
          onClose={() => setShowAddClient(false)}
          onCreateClient={addClient}
          onSaved={handleAddClient}
        />
      )}
      {showQuotationModal && (
        <CreateQuotationModal
          clients={clients}
          onClose={() => setShowQuotationModal(false)}
          onCreateQuotation={addQuotation}
          onSaved={handleAddQuotation}
        />
      )}
    </CrmShell>
  );
}
