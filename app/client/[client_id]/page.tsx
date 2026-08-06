"use client";

import CrmShell from "@/components/layout/CrmShell";
import { RecordPaymentSheet } from "@/components/RecordPaymentSheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchClientProfile } from "@/services/clientService";
import type { ClientProfile } from "@/types/client";
import { Banknote, Landmark } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

function currency(amount: number) {
  return `Rs. ${amount.toLocaleString("en-IN")}`;
}

function formatDate(date?: string) {
  return date ? new Date(date).toLocaleDateString("en-IN") : "-";
}

const invoiceStatusBadge: Record<
  ClientProfile["invoices"][number]["status"],
  string
> = {
  Paid: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Partially Paid": "bg-indigo-50 text-indigo-700 border border-indigo-200",
  Pending: "bg-amber-50 text-amber-700 border border-amber-200",
  Draft: "bg-slate-100 text-slate-500 border border-slate-200",
  Sent: "bg-sky-50 text-sky-700 border border-sky-200",
  Overdue: "bg-rose-50 text-rose-700 border border-rose-200",
  Cancelled: "bg-slate-100 text-slate-400 border border-slate-200",
};

const quotationStatusBadge: Record<
  ClientProfile["quotations"][number]["status"],
  string
> = {
  Pending: "bg-amber-50 text-amber-700 border border-amber-200",
  Accepted: "bg-sky-50 text-sky-700 border border-sky-200",
  Draft: "bg-slate-100 text-slate-500 border border-slate-200",
  Rejected: "bg-rose-50 text-rose-700 border border-rose-200",
  Expired: "bg-orange-50 text-orange-700 border border-orange-200",
};

const proformaStatusBadge: Record<
  ClientProfile["proformas"][number]["status"],
  string
> = {
  Draft: "bg-slate-100 text-slate-500 border border-slate-200",
  Sent: "bg-sky-50 text-sky-700 border border-sky-200",
  Accepted: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  Rejected: "bg-rose-50 text-rose-700 border border-rose-200",
  Expired: "bg-orange-50 text-orange-700 border border-orange-200",
  Converted: "bg-violet-50 text-violet-700 border border-violet-200",
};

export default function ClientProfilePage() {
  const params = useParams<{ client_id: string }>();
  const clientId = params?.client_id;
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showRecordPayment, setShowRecordPayment] = useState(false);

  const loadProfile = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);

    try {
      const response = await fetchClientProfile(clientId);
      setProfile(response.data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load client profile",
      );
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  return (
    <CrmShell activeNav="Invoices">
      <div className="space-y-6 p-4 md:p-6">
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-sky-100/90 bg-white/85 p-6 shadow-sm">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Client Profile</h1>
            <p className="mt-1 text-sm text-slate-500">
              Detailed financial and quotation history for this client.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowRecordPayment(true)}
            className="flex items-center gap-2 rounded-xl bg-emerald-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95"
          >
            <Banknote className="h-4 w-4" aria-hidden="true" />
            Record Payment
          </button>
        </section>

        {loading && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-500 shadow-sm">
            Loading client profile...
          </section>
        )}

        {!loading && error && (
          <section className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-rose-700 shadow-sm">
            {error}
          </section>
        )}

        {!loading && !error && profile && (
          <>
            <section className="grid gap-4 md:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Total Invoiced
                </p>
                <p className="mt-2 text-2xl font-bold text-slate-900">
                  {currency(profile.overview.totalInvoiced)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Total Collected
                </p>
                <p className="mt-2 text-2xl font-bold text-emerald-600">
                  {currency(profile.overview.totalPaid)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Outstanding
                </p>
                <p className="mt-2 text-2xl font-bold text-amber-600">
                  {currency(profile.overview.totalOutstanding)}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="text-xs font-semibold uppercase text-slate-500">
                  Credit Balance
                </p>
                <p className="mt-2 text-2xl font-bold text-indigo-600">
                  {currency(profile.overview.creditBalance ?? 0)}
                </p>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-slate-900">
                  {profile.client.name}
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {profile.client.company || "No company name"} |{" "}
                  {profile.client.email || "No email"}
                </p>
              </div>

              <Tabs defaultValue="overview" className="w-full">
                <TabsList>
                  <TabsTrigger value="overview">Overview</TabsTrigger>
                  <TabsTrigger value="invoices">Invoices</TabsTrigger>
                  <TabsTrigger value="payments">Payments</TabsTrigger>
                  <TabsTrigger value="quotations">Quotations</TabsTrigger>
                  <TabsTrigger value="proforma">Proforma</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="mt-4 space-y-2">
                  <p className="text-sm text-slate-700">
                    Phone: {profile.client.phone || "-"}
                  </p>
                  <p className="text-sm text-slate-700">
                    GST: {profile.client.gstNumber || "-"}
                  </p>
                  <p className="text-sm text-slate-700">
                    Address: {profile.client.address || "-"}
                  </p>
                  <p className="text-sm text-slate-700">
                    Invoices: {profile.overview.invoiceCount}
                  </p>
                  <p className="text-sm text-slate-700">
                    Quotations: {profile.overview.quotationCount}
                  </p>
                  <p className="text-sm text-slate-700">
                    Proforma: {profile.overview.proformaCount}
                  </p>
                </TabsContent>

                <TabsContent value="invoices" className="mt-4">
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full min-w-190 text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          <th className="px-6 py-3 text-left">Invoice ID</th>
                          <th className="px-4 py-3 text-left">Amount</th>
                          <th className="px-4 py-3 text-left">Paid</th>
                          <th className="px-4 py-3 text-left">Remaining</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.invoices.length === 0 ? (
                          <tr>
                            <td
                              colSpan={6}
                              className="px-6 py-10 text-center text-slate-500"
                            >
                              No invoices yet.
                            </td>
                          </tr>
                        ) : (
                          profile.invoices.map((invoice) => (
                            <tr
                              key={invoice.id}
                              className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60"
                            >
                              <td className="px-6 py-3 font-semibold text-slate-700">
                                {invoice.id}
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-900">
                                {currency(invoice.totalAmount)}
                              </td>
                              <td className="px-4 py-3 font-semibold text-emerald-600">
                                {currency(invoice.paidAmount ?? 0)}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-700">
                                {currency(invoice.remaining ?? invoice.totalAmount)}
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {formatDate(invoice.date)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${invoiceStatusBadge[invoice.status]}`}
                                >
                                  {invoice.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="payments" className="mt-4">
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full min-w-190 text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          <th className="px-6 py-3 text-left">Payment ID</th>
                          <th className="px-4 py-3 text-left">Type</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Mode</th>
                          <th className="px-4 py-3 text-left">Reference</th>
                          <th className="px-4 py-3 text-left">Amount</th>
                          <th className="px-4 py-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.payments.length === 0 ? (
                          <tr>
                            <td
                              colSpan={7}
                              className="px-6 py-10 text-center text-slate-500"
                            >
                              No payments recorded yet.
                            </td>
                          </tr>
                        ) : (
                          profile.payments.map((payment) => (
                            <tr
                              key={payment.id}
                              className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60"
                            >
                              <td className="px-6 py-3 font-semibold text-slate-700">
                                {payment.id}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {payment.source === "on_account" ? (
                                  <span className="inline-flex items-center gap-1.5">
                                    <Landmark
                                      className="h-3.5 w-3.5 text-indigo-500"
                                      aria-hidden="true"
                                    />
                                    On Account
                                  </span>
                                ) : payment.referenceId ? (
                                  payment.referenceId
                                ) : (
                                  "Invoice"
                                )}
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {formatDate(payment.date)}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {payment.mode || "-"}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {payment.reference || "-"}
                              </td>
                              <td className="px-4 py-3 font-semibold text-emerald-600">
                                {currency(payment.amount)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                                    payment.status === "Reversed"
                                      ? "bg-slate-100 text-slate-500 border border-slate-200"
                                      : "bg-emerald-50 text-emerald-700 border border-emerald-200"
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
                </TabsContent>

                <TabsContent value="quotations" className="mt-4">
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full min-w-190 text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          <th className="px-6 py-3 text-left">Quotation ID</th>
                          <th className="px-4 py-3 text-left">Amount</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Valid Until</th>
                          <th className="px-4 py-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.quotations.length === 0 ? (
                          <tr>
                            <td
                              colSpan={5}
                              className="px-6 py-10 text-center text-slate-500"
                            >
                              No quotations yet.
                            </td>
                          </tr>
                        ) : (
                          profile.quotations.map((quotation) => (
                            <tr
                              key={quotation.id}
                              className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60"
                            >
                              <td className="px-6 py-3 font-semibold text-slate-700">
                                {quotation.quotationNumber ?? quotation.id}
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-900">
                                {currency(quotation.totalAmount)}
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {formatDate(quotation.date)}
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {formatDate(quotation.validUntil)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${quotationStatusBadge[quotation.status]}`}
                                >
                                  {quotation.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>

                <TabsContent value="proforma" className="mt-4">
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full min-w-190 text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                          <th className="px-6 py-3 text-left">Proforma ID</th>
                          <th className="px-4 py-3 text-left">Amount</th>
                          <th className="px-4 py-3 text-left">Date</th>
                          <th className="px-4 py-3 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {profile.proformas.length === 0 ? (
                          <tr>
                            <td
                              colSpan={4}
                              className="px-6 py-10 text-center text-slate-500"
                            >
                              No proforma invoices yet.
                            </td>
                          </tr>
                        ) : (
                          profile.proformas.map((proforma) => (
                            <tr
                              key={proforma.id}
                              className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60"
                            >
                              <td className="px-6 py-3 font-semibold text-slate-700">
                                {proforma.id}
                              </td>
                              <td className="px-4 py-3 font-bold text-slate-900">
                                {currency(proforma.totalAmount)}
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {formatDate(proforma.date)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${proformaStatusBadge[proforma.status]}`}
                                >
                                  {proforma.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </TabsContent>
              </Tabs>
            </section>
          </>
        )}
      </div>

      {showRecordPayment && (
        <RecordPaymentSheet
          onClose={() => setShowRecordPayment(false)}
          clients={profile ? [profile.client] : []}
          initialClientId={clientId}
          onSaved={() => {
            setShowRecordPayment(false);
            void loadProfile();
          }}
        />
      )}
    </CrmShell>
  );
}
