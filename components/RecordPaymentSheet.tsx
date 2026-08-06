"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { ApiError } from "@/services/apiClient";
import { fetchInvoices } from "@/services/invoiceService";
import { createPayment } from "@/services/paymentService";
import type { Client } from "@/types/client";
import type { Invoice, InvoiceStatus } from "@/types/invoice";
import type { PaymentMode } from "@/types/payment";
import { Banknote, CheckCircle2, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAYMENT_MODES: PaymentMode[] = [
  "Cash",
  "Bank Transfer",
  "UPI",
  "Cheque",
  "Other",
];

const OPEN_INVOICE_STATUSES: InvoiceStatus[] = [
  "Pending",
  "Sent",
  "Overdue",
  "Partially Paid",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n: number) {
  return "Rs. " + n.toLocaleString("en-IN", { maximumFractionDigits: 2 });
}

function today() {
  return new Date().toISOString().split("T")[0];
}

function clientDisplayName(client: Client) {
  return client.company ? `${client.name} — ${client.company}` : client.name;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type RecordPaymentSheetProps = {
  onClose: () => void;
  clients: Client[];
  initialClientId?: string;
  initialInvoiceId?: string;
  onSaved: () => void;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function RecordPaymentSheet({
  onClose,
  clients,
  initialClientId,
  initialInvoiceId,
  onSaved,
}: RecordPaymentSheetProps) {
  const [paymentType, setPaymentType] = useState<"invoice" | "on_account">(
    initialInvoiceId ? "invoice" : "on_account",
  );
  const [clientId, setClientId] = useState(initialClientId ?? "");
  const [invoiceId, setInvoiceId] = useState(initialInvoiceId ?? "");
  const [openInvoices, setOpenInvoices] = useState<Invoice[]>([]);
  const [loadingInvoices, setLoadingInvoices] = useState(
    Boolean(initialClientId),
  );
  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(today());
  const [mode, setMode] = useState<PaymentMode>("Cash");
  const [reference, setReference] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadOpenInvoices(forClientId: string) {
    try {
      const res = await fetchInvoices({ clientId: forClientId, pageSize: 50 });
      const open = (res.data ?? []).filter(
        (inv) =>
          OPEN_INVOICE_STATUSES.includes(inv.status) &&
          (inv.remaining ?? inv.totalAmount) > 0,
      );
      setOpenInvoices(open);
    } catch {
      setOpenInvoices([]);
    } finally {
      setLoadingInvoices(false);
    }
  }

  useEffect(() => {
    if (clientId) {
      void loadOpenInvoices(clientId);
    }
  }, [clientId]);

  const selectedInvoice = openInvoices.find((inv) => inv.id === invoiceId) ?? null;
  const remaining = selectedInvoice
    ? (selectedInvoice.remaining ?? selectedInvoice.totalAmount)
    : 0;

  function handleClientChange(id: string) {
    setClientId(id);
    setInvoiceId("");
    setError("");
    if (id) {
      setLoadingInvoices(true);
      void loadOpenInvoices(id);
    } else {
      setOpenInvoices([]);
    }
  }

  function handleTypeChange(type: "invoice" | "on_account") {
    setPaymentType(type);
    setError("");
  }

  async function handleSubmit() {
    setError("");

    if (!clientId) {
      setError("Please select a client.");
      return;
    }

    if (paymentType === "invoice" && !invoiceId) {
      setError("Please select an invoice to record payment against.");
      return;
    }

    const amountValue = Number(amount);
    if (!amountValue || amountValue <= 0) {
      setError("Please enter a valid payment amount.");
      return;
    }

    if (paymentType === "invoice") {
      if (!selectedInvoice) {
        setError("The selected invoice is no longer open for payment.");
        return;
      }
      if (amountValue > remaining) {
        setError(
          `Amount cannot exceed the remaining balance of ${fmt(remaining)}.`,
        );
        return;
      }
    }

    setSaving(true);
    try {
      await createPayment({
        clientId,
        invoiceId: paymentType === "invoice" ? invoiceId : undefined,
        amount: amountValue,
        paymentDate: paymentDate || undefined,
        mode,
        reference: reference.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onSaved();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to record payment. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Banknote className="h-5 w-5 text-emerald-600" aria-hidden="true" />
            Record Payment
          </SheetTitle>
          <SheetDescription>
            Capture a payment against an invoice or as an on-account advance.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Payment type */}
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Payment Type
            </p>
            <div className="flex rounded-xl border border-slate-200 p-1">
              <button
                type="button"
                onClick={() => handleTypeChange("invoice")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  paymentType === "invoice"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                Against Invoice
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange("on_account")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold transition ${
                  paymentType === "on_account"
                    ? "bg-emerald-500 text-white shadow-sm"
                    : "text-slate-600 hover:bg-slate-50"
                }`}
              >
                On Account
              </button>
            </div>
            <p className="mt-1.5 text-xs text-slate-400">
              {paymentType === "invoice"
                ? "Applies the payment to the selected invoice's outstanding balance."
                : "Records an advance payment stored as client credit."}
            </p>
          </div>

          {/* Client */}
          <div>
            <label
              htmlFor="payment-client"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Client
            </label>
            <select
              id="payment-client"
              value={clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="w-full appearance-none rounded-xl border border-slate-200 px-3.5 py-2.5 pr-8 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2 disabled:bg-slate-50 disabled:text-slate-400"
            >
              <option value="">Select a client…</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {clientDisplayName(c)}
                </option>
              ))}
            </select>
          </div>

          {/* Invoice (only for invoice type) */}
          {paymentType === "invoice" && (
            <div>
              <label
                htmlFor="payment-invoice"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Invoice
              </label>
              {loadingInvoices ? (
                <div className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-sm text-slate-400">
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                  Loading invoices…
                </div>
              ) : clientId && openInvoices.length === 0 ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-sm text-amber-700">
                  No open invoices for this client.
                </div>
              ) : (
                <select
                  id="payment-invoice"
                  value={invoiceId}
                  onChange={(e) => {
                    setInvoiceId(e.target.value);
                    setError("");
                  }}
                  className="w-full appearance-none rounded-xl border border-slate-200 px-3.5 py-2.5 pr-8 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                >
                  <option value="">Select an invoice…</option>
                  {openInvoices.map((inv) => (
                    <option key={inv.id} value={inv.id}>
                      {inv.id} — {fmt(inv.remaining ?? inv.totalAmount)} remaining
                    </option>
                  ))}
                </select>
              )}
              {selectedInvoice && (
                <p className="mt-1.5 text-xs text-emerald-600">
                  Outstanding balance:{" "}
                  <span className="font-semibold">{fmt(remaining)}</span>
                </p>
              )}
            </div>
          )}

          {/* Amount */}
          <div>
            <label
              htmlFor="payment-amount"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Amount (Rs.)
            </label>
            <input
              id="payment-amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError("");
              }}
              className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
            />
            {paymentType === "invoice" &&
              selectedInvoice &&
              Number(amount) > remaining && (
                <p className="mt-1.5 text-xs text-rose-600">
                  Amount exceeds the remaining balance of {fmt(remaining)}.
                </p>
              )}
          </div>

          {/* Date + Mode */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="payment-date"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Payment Date
              </label>
              <input
                id="payment-date"
                type="date"
                value={paymentDate}
                onChange={(e) => setPaymentDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
              />
            </div>
            <div>
              <label
                htmlFor="payment-mode"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Payment Mode
              </label>
              <select
                id="payment-mode"
                value={mode}
                onChange={(e) => setMode(e.target.value as PaymentMode)}
                className="h-10 w-full appearance-none rounded-xl border border-slate-200 px-3.5 pr-8 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
              >
                {PAYMENT_MODES.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Reference */}
          <div>
            <label
              htmlFor="payment-reference"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Reference (optional)
            </label>
            <input
              id="payment-reference"
              type="text"
              placeholder="e.g. UTR / cheque no. / transaction ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
            />
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="payment-notes"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Notes (optional)
            </label>
            <textarea
              id="payment-notes"
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
            />
          </div>

          {error && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {error}
            </div>
          )}

          <div className="flex items-center gap-3 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-slate-300 hover:text-slate-800 disabled:opacity-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
              Cancel
            </button>
            <button
              type="button"
              onClick={() => void handleSubmit()}
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              {saving ? "Recording…" : "Record Payment"}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
