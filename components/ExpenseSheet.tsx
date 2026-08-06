"use client";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import type {
  Expense,
  ExpenseCategory,
  ExpensePaymentMode,
  CreateExpensePayload,
} from "@/types/expense";
import { CheckCircle2, Loader2, ReceiptText, X } from "lucide-react";
import { useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const EXPENSE_CATEGORIES: ExpenseCategory[] = [
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

const PAYMENT_MODES: ExpensePaymentMode[] = [
  "Cash",
  "Bank Transfer",
  "UPI",
  "Cheque",
  "Other",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().split("T")[0];
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type ExpenseSheetProps = {
  onClose: () => void;
  onSave: (payload: CreateExpensePayload) => Promise<void>;
  initialExpense?: Expense;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function ExpenseSheet({
  onClose,
  onSave,
  initialExpense,
}: ExpenseSheetProps) {
  const isEditing = Boolean(initialExpense);
  const [category, setCategory] = useState<ExpenseCategory>(
    initialExpense?.category ?? "Rent & Utilities",
  );
  const [party, setParty] = useState(initialExpense?.party ?? "");
  const [amount, setAmount] = useState(
    initialExpense ? String(initialExpense.amount) : "",
  );
  const [expenseDate, setExpenseDate] = useState(
    initialExpense?.expenseDate ?? today(),
  );
  const [paymentMode, setPaymentMode] = useState<ExpensePaymentMode>(
    initialExpense?.paymentMode ?? "Cash",
  );
  const [reference, setReference] = useState(initialExpense?.reference ?? "");
  const [description, setDescription] = useState(
    initialExpense?.description ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit() {
    setError("");

    const amountValue = Number(amount);
    if (!amountValue || amountValue <= 0) {
      setError("Please enter a valid expense amount.");
      return;
    }
    if (!party.trim()) {
      setError("Please enter who the expense was paid to.");
      return;
    }

    setSaving(true);
    try {
      await onSave({
        category,
        party: party.trim(),
        amount: amountValue,
        expenseDate: expenseDate || undefined,
        paymentMode,
        reference: reference.trim() || undefined,
        description: description.trim() || undefined,
      });
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save expense. Please try again.",
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
            <ReceiptText className="h-5 w-5 text-rose-600" aria-hidden="true" />
            {isEditing ? "Edit Expense" : "Record Expense"}
          </SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update the expense. The finance table will be kept in sync."
              : "Record an expense. It will also appear in the finance table."}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-5">
          {/* Category */}
          <div>
            <label
              htmlFor="expense-category"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Category
            </label>
            <select
              id="expense-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="h-10 w-full appearance-none rounded-xl border border-slate-200 px-3.5 pr-8 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
            >
              {EXPENSE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Paid to */}
          <div>
            <label
              htmlFor="expense-party"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Paid To
            </label>
            <input
              id="expense-party"
              type="text"
              placeholder="e.g. Vendor / supplier / landlord name"
              value={party}
              onChange={(e) => {
                setParty(e.target.value);
                setError("");
              }}
              className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
            />
          </div>

          {/* Amount */}
          <div>
            <label
              htmlFor="expense-amount"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Amount (Rs.)
            </label>
            <input
              id="expense-amount"
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
          </div>

          {/* Date + Mode */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="expense-date"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Expense Date
              </label>
              <input
                id="expense-date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
              />
            </div>
            <div>
              <label
                htmlFor="expense-mode"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
              >
                Payment Mode
              </label>
              <select
                id="expense-mode"
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as ExpensePaymentMode)}
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
              htmlFor="expense-reference"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Reference (optional)
            </label>
            <input
              id="expense-reference"
              type="text"
              placeholder="e.g. bill no. / UTR / receipt no."
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="expense-description"
              className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-500"
            >
              Description (optional)
            </label>
            <textarea
              id="expense-description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
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
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-rose-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
              )}
              {saving ? "Saving…" : isEditing ? "Save Changes" : "Record Expense"}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
