"use client";

import PageHeader from "@/components/PageHeader";
import CrmShell from "@/components/layout/CrmShell";
import { fmtCompactCurrency } from "@/utils/formatting";
import { useCustomersPageData } from "@/hooks/useCustomersPageData";
import type { Client } from "@/types/client";
import { Eye, FileText, Plus, ShoppingCart, Users, X } from "lucide-react";
import { useState } from "react";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`crm-skeleton ${className}`} />;
}

function KpiCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <SkeletonBox className="h-4 w-28 rounded-md" />
          <SkeletonBox className="h-8 w-24 rounded-lg" />
          <SkeletonBox className="h-3 w-20 rounded-md" />
        </div>
        <SkeletonBox className="h-14 w-14 shrink-0 rounded-full" />
      </div>
    </div>
  );
}

function ClientRowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-6 py-3">
        <SkeletonBox className="h-4 w-28 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-36 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-24 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-20 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-24 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-24 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <div className="flex gap-2">
          <SkeletonBox className="h-7 w-7 rounded-lg" />
          <SkeletonBox className="h-7 w-7 rounded-lg" />
        </div>
      </td>
    </tr>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return fmtCompactCurrency(n);
}

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
      className="inline-flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 transition"
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
              Save client details for future reference
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
                  placeholder="e.g. +91 9876543210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-semibold text-slate-700">
                  Address
                </label>
                <input
                  type="text"
                  placeholder="Street address"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                />
              </div>
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-semibold text-slate-700">
                  GST Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 29ABCDE1234F1Z5"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-[#FF6B4A] px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-[#e55a39] disabled:opacity-50"
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

export default function CustomersPage() {
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const {
    clients,
    totalClientsCount,
    maxPages,
    invoices,
    isLoading,
    createClientRecord,
    refresh,
  } = useCustomersPageData(search, page, pageSize);

  async function handleClientSaved(_newClient: Client) {
    setPage(1);
    await refresh();
  }

  // Filter clients based on search
  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search),
  );

  // Get invoices for a client
  function getClientInvoices(clientId: string) {
    return invoices.filter((inv) => inv.customerId === clientId);
  }

  // Calculate total revenue for client
  function getClientRevenue(clientId: string) {
    return getClientInvoices(clientId).reduce((sum, inv) => {
      const total = inv.totalAmount || 0;
      return sum + total;
    }, 0);
  }

  // KPI Cards
  const totalClients = totalClientsCount || clients.length;
  const totalInvoices = invoices.length;
  const totalRevenue = invoices.reduce((sum, inv) => {
    const total = inv.totalAmount || 0;
    return sum + total;
  }, 0);
  const avgClientRevenue = totalClients > 0 ? totalRevenue / totalClients : 0;

  return (
    <CrmShell activeNav="Clients">
      <div className="space-y-6 p-4 md:p-6">
        <PageHeader title="Customers" subtitle="View and manage all your customers and their invoices" onRefresh={() => refresh()}>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex h-11 w-fit items-center justify-center gap-2 rounded-xl bg-[#FF6B4A] px-6 text-sm font-semibold text-white transition hover:bg-[#e55a39] active:scale-95"
          >
            <Plus className="h-5 w-5" aria-hidden="true" />
            Add Customer
          </button>
        </PageHeader>

        {/* ── KPI Cards ── */}
        <div className="grid gap-4 md:grid-cols-4">
          {isLoading ? (
            <>
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
              <KpiCardSkeleton />
            </>
          ) : (
            <>
              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase text-slate-500">
                      Total Customers
                    </p>
                    <p className="text-3xl font-bold text-slate-900">
                      {totalClients}
                    </p>
                    <p className="text-xs text-slate-400">Active clients</p>
                  </div>
                  <div className="inline-flex rounded-full bg-blue-50 p-3">
                    <Users
                      className="h-6 w-6 text-blue-600"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase text-slate-500">
                      Total Invoices
                    </p>
                    <p className="text-3xl font-bold text-slate-900">
                      {totalInvoices}
                    </p>
                    <p className="text-xs text-slate-400">All invoices</p>
                  </div>
                  <div className="inline-flex rounded-full bg-emerald-50 p-3">
                    <FileText
                      className="h-6 w-6 text-emerald-600"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase text-slate-500">
                      Total Revenue
                    </p>
                    <p className="text-3xl font-bold text-slate-900">
                      {fmt(totalRevenue)}
                    </p>
                    <p className="text-xs text-slate-400">All invoices</p>
                  </div>
                  <div className="inline-flex rounded-full bg-amber-50 p-3">
                    <ShoppingCart
                      className="h-6 w-6 text-amber-600"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-medium uppercase text-slate-500">
                      Avg Revenue
                    </p>
                    <p className="text-3xl font-bold text-slate-900">
                      {fmt(avgClientRevenue)}
                    </p>
                    <p className="text-xs text-slate-400">Per customer</p>
                  </div>
                  <div className="inline-flex rounded-full bg-rose-50 p-3">
                    <ShoppingCart
                      className="h-6 w-6 text-rose-600"
                      aria-hidden="true"
                    />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Customers Table ── */}
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <h2 className="text-lg font-semibold text-slate-900">
                Customers
                {!isLoading && (
                  <span className="ml-2 inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-center text-xs font-bold text-sky-700">
                    {totalClients}
                  </span>
                )}
              </h2>
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Search by name, email, or phone..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="h-10 max-w-xs rounded-xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                />
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-md border border-slate-200 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Prev
                </button>
                <span className="text-sm whitespace-nowrap">
                  Page {page} of {maxPages}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= maxPages}
                  className="rounded-md border border-slate-200 px-3 py-1 text-sm disabled:opacity-50"
                >
                  Next
                </button>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(Number(e.target.value));
                    setPage(1);
                  }}
                  className="h-9 rounded-lg border border-slate-200 px-2 text-sm outline-none"
                >
                  <option value={10}>10 / page</option>
                  <option value={20}>20 / page</option>
                  <option value={50}>50 / page</option>
                </select>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100">
                  <th className="px-6 py-3 text-left font-semibold text-slate-600">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Company
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Phone
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">
                    Invoices
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600">
                    Revenue
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <>
                    <ClientRowSkeleton />
                    <ClientRowSkeleton />
                    <ClientRowSkeleton />
                  </>
                ) : filteredClients.length === 0 ? (
                  <tr className="border-b border-slate-100">
                    <td
                      colSpan={7}
                      className="px-6 py-8 text-center text-slate-500"
                    >
                      {clients.length === 0
                        ? "No customers yet. Start by adding a new customer."
                        : "No customers match your search."}
                    </td>
                  </tr>
                ) : (
                  filteredClients.map((client) => {
                    const clientInvoices = getClientInvoices(client.id);
                    const revenue = getClientRevenue(client.id);
                    return (
                      <tr
                        key={client.id}
                        className="border-b border-slate-100 transition hover:bg-slate-50"
                      >
                        <td className="px-6 py-4">
                          <span className="font-medium text-slate-900">
                            {client.name}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-slate-600">
                            {client.company || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-slate-600">
                            {client.email || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className="text-slate-600">
                            {client.phone || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-center">
                          <span className="inline-flex h-6 items-center justify-center rounded-full bg-sky-100 px-3 text-xs font-semibold text-sky-700">
                            {clientInvoices.length}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <span className="font-semibold text-emerald-600">
                            {fmt(revenue)}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex justify-center gap-1">
                            <ActionBtn title="Unavailable for now">
                              <Eye className="h-4 w-4" aria-hidden="true" />
                            </ActionBtn>
                            <ActionBtn title="Unavailable for now">
                              <FileText
                                className="h-4 w-4"
                                aria-hidden="true"
                              />
                            </ActionBtn>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onCreateClient={createClientRecord}
          onSaved={handleClientSaved}
        />
      )}
    </CrmShell>
  );
}
