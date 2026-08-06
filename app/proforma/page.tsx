"use client";

import CrmShell from "@/components/layout/CrmShell";
import { ProformaDownloadButton } from "@/components/ProformaDownloadButton";
import {
  useInvoicingPageData,
} from "@/hooks/useInvoicingPageData";
import { api } from "@/services/apiClient";
import type {
  ProformaInvoice,
  ProformaStatus,
} from "@/types/invoice";
import { ChevronDown, FileText, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`crm-skeleton ${className}`} />;
}

function ProformaRowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-6 py-3"><SkeletonBox className="h-4 w-28 rounded-md" /></td>
      <td className="px-4 py-3"><SkeletonBox className="h-4 w-32 rounded-md" /></td>
      <td className="px-4 py-3"><SkeletonBox className="h-4 w-24 rounded-md" /></td>
      <td className="px-4 py-3"><SkeletonBox className="h-4 w-24 rounded-md" /></td>
      <td className="px-4 py-3"><SkeletonBox className="h-6 w-20 rounded-full" /></td>
      <td className="px-4 py-3"><SkeletonBox className="h-7 w-20 rounded-lg" /></td>
    </tr>
  );
}

const proformaStatusBadge: Record<ProformaStatus, string> = {
  Draft: "bg-slate-100  text-slate-500   border border-slate-200",
  Sent: "bg-sky-50     text-sky-700     border border-sky-200",
  Accepted: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Rejected: "bg-rose-50    text-rose-700    border border-rose-200",
  Expired: "bg-orange-50  text-orange-700  border border-orange-200",
  Converted: "bg-violet-50  text-violet-700  border border-violet-200",
};

const proformaStatusOptions = Object.keys(proformaStatusBadge) as ProformaStatus[];

function fmt(n?: number | null) {
  if (n === undefined || n === null) return "Rs. 0";
  return "Rs. " + n.toLocaleString("en-IN");
}

function fmtDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  try {
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  } catch {
    return dateStr;
  }
}

function ActionBtn({ title, onClick, children }: { title: string; onClick?: () => void; children: React.ReactNode }) {
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

export default function ProformaPage() {
  const { proformaInvoices, loading, convertProformaToInvoice, editProforma, removeProforma } = useInvoicingPageData();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
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

  async function handleDeleteProforma(id: string) {
    if (!confirm("Are you sure you want to delete this proforma?")) return;
    setUpdatingId(id);
    try {
      await removeProforma(id);
    } catch {
      // silently fail
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleQuickStatusChange(id: string, status: ProformaStatus) {
    setUpdatingId(id);
    try {
      await api.patch(`/api/proforma-invoices/${id}`, { status });
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleConvert(id: string) {
    await convertProformaToInvoice(id);
  }

  return (
    <CrmShell activeNav="Proforma">
      <div className="space-y-5 p-4 md:p-6">
        {/* Header */}
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Proforma Invoices</h1>
            <p className="mt-1 text-slate-500">
              Manage proforma invoices generated from quotations
            </p>
          </div>
        </div>

        {/* Proforma Table */}
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
            {loading ? (
              <>
                <SkeletonBox className="h-6 w-40 rounded-lg" />
                <SkeletonBox className="h-10 w-40 rounded-xl" />
              </>
            ) : (
              <div className="flex w-full items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                  <FileText className="h-5 w-5 text-slate-400" aria-hidden="true" />
                  Proforma Invoices
                  {proformaInvoices.length > 0 && (
                    <span className="ml-1 rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-semibold text-cyan-700">
                      {proformaInvoices.length}
                    </span>
                  )}
                </h2>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 text-left">Proforma ID</th>
                  <th className="px-4 py-3 text-left">Client</th>
                  <th className="px-4 py-3 text-left">Total Amount</th>
                  <th className="px-4 py-3 text-left">Valid Until</th>
                  <th className="px-4 py-3 text-left">Due Date</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, i) => <ProformaRowSkeleton key={i} />)
                ) : proformaInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      No proforma invoices yet. Accept a quotation to create one.
                    </td>
                  </tr>
                ) : (
                  proformaInvoices.map((p) => (
                    <tr
                      key={p.id}
                      className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60"
                    >
                      <td className="px-6 py-3 font-semibold text-slate-700">
                        {p.id}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-800">
                        {p.customerId ? (
                          <Link
                            href={`/client/${p.customerId}`}
                            className="text-sky-700 underline-offset-2 hover:underline"
                          >
                            {p.client || "—"}
                          </Link>
                        ) : (
                          p.client || "—"
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900">
                        {fmt(p.totalAmount)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {fmtDate(p.validUntil)}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {fmtDate(p.dueDate)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenStatusId(
                                openStatusId === p.id ? null : p.id,
                              )
                            }
                            disabled={updatingId === p.id}
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-60 ${proformaStatusBadge[p.status] ?? "bg-slate-100 text-slate-500"}`}
                          >
                            {p.status}
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          {openStatusId === p.id && (
                            <div
                              ref={statusMenuRef}
                              className="absolute left-0 top-full z-20 mt-1 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                            >
                              {proformaStatusOptions.map((s) => (
                                <button
                                  key={s}
                                  type="button"
                                  onClick={() => {
                                    handleQuickStatusChange(p.id, s);
                                    setOpenStatusId(null);
                                  }}
                                  className={`flex w-full items-center px-3 py-1.5 text-xs hover:bg-slate-50 ${p.status === s ? "font-semibold text-sky-600" : "text-slate-700"}`}
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
                          <ActionBtn title="Edit Proforma">
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </ActionBtn>
                          <ActionBtn
                            title="Delete Proforma"
                            onClick={() => handleDeleteProforma(p.id)}
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </ActionBtn>
                          <ProformaDownloadButton proforma={p} />
                          {p.status !== "Converted" && p.status !== "Rejected" && (
                            <button
                              type="button"
                              onClick={() => handleConvert(p.id)}
                              className="flex items-center gap-1.5 rounded-xl border border-sky-200 px-3 py-1.5 text-xs font-semibold text-sky-600 transition hover:bg-sky-50"
                            >
                              <FileText className="h-3.5 w-3.5" aria-hidden="true" />
                              Raise Invoice
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
        </section>
      </div>
    </CrmShell>
  );
}
