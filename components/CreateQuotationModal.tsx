"use client";

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { downloadPdf } from "@/utils/pdf/download";
import { QuotationDocument } from "@/utils/pdf/quotationPdf";
import type { InvoicingCreateQuotationPayload } from "@/hooks/useInvoicingPageData";
import type { Client } from "@/types/client";
import type { Quotation, QuotationStatus } from "@/types/invoice";
import { Download, Send, X } from "lucide-react";
import { useEffect, useState } from "react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n?: number | null) {
  if (n === undefined || n === null) return "Rs. 0";
  return "Rs. " + n.toLocaleString("en-IN");
}

// ─── Types ────────────────────────────────────────────────────────────────────

type QuotationLineItem = {
  id: string;
  product: string;
  quantity: number;
  unitPrice: number;
  imageBase64?: string;
};

export type CreateQuotationModalProps = {
  onClose: () => void;
  onCreateQuotation: (
    payload: InvoicingCreateQuotationPayload,
  ) => Promise<Quotation>;
  onUpdateQuotation?: (
    id: string,
    payload: Partial<InvoicingCreateQuotationPayload>,
  ) => Promise<Quotation>;
  onSaved: () => void;
  clients: Client[];
  initialQuotation?: Quotation;
};

// ─── Component ────────────────────────────────────────────────────────────────

export function CreateQuotationModal({
  onClose,
  onCreateQuotation,
  onUpdateQuotation,
  onSaved,
  clients,
  initialQuotation,
}: CreateQuotationModalProps) {
  const [clientName, setClientName] = useState(initialQuotation?.client ?? "");
  const [selectedClientId, setSelectedClientId] = useState(
    String(initialQuotation?.customerId ?? ""),
  );
  const [quotationDate, setQuotationDate] = useState(
    initialQuotation?.date ?? "",
  );
  const [validUntil, setValidUntil] = useState(
    initialQuotation?.validUntil ?? "",
  );
  const [items, setItems] = useState<QuotationLineItem[]>([]);
  const [gst, setGst] = useState(String(initialQuotation?.gstRate ?? 18));
  const [notes, setNotes] = useState(initialQuotation?.notes ?? "");
  const [shippingAddress, setShippingAddress] = useState(
    initialQuotation?.shippingAddress ?? "",
  );
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    if (initialQuotation?.items?.length) {
      setItems(
        initialQuotation.items.map((item, idx) => ({
          id: String(idx + 1),
          product: item.product || item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      );
      return;
    }

    setItems([
      {
        id: "1",
        product: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  }, [initialQuotation]);

  function handleClientSelect(id: string) {
    setSelectedClientId(id);
    const c = clients.find((c) => c.id === id);
    if (c) setClientName(c.company ? `${c.name} — ${c.company}` : c.name);
    if (sameAsBilling && c?.address) {
      setShippingAddress(c.address);
    }
  }

  function handleItemChange(
    id: string,
    field: keyof QuotationLineItem,
    value: string | number,
  ) {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity" || field === "unitPrice") {
          updated.quantity = Number(
            field === "quantity" ? value : item.quantity,
          );
          updated.unitPrice = Number(
            field === "unitPrice" ? value : item.unitPrice,
          );
        }
        return updated;
      }),
    );
  }

  async function handleItemImageUpload(
    id: string,
    file: File,
  ) {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onload = () => {
      setItems((prev) =>
        prev.map((item) =>
          item.id === id
            ? { ...item, imageBase64: reader.result as string }
            : item,
        ),
      );
    };
    reader.readAsDataURL(file);
  }

  function removeItemImage(id: string) {
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, imageBase64: undefined } : item,
      ),
    );
  }

  function addItem() {
    const newId = (
      Math.max(...items.map((i) => Number(i.id)), 0) + 1
    ).toString();
    setItems((prev) => [
      ...prev,
      {
        id: newId,
        product: "",
        quantity: 1,
        unitPrice: 0,
      },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const parsedGstRate = parseFloat(gst) || 0;
  const gstAmount = Math.round((subtotal * parsedGstRate) / 100);
  const total = subtotal + gstAmount;

  async function handleSave(status: QuotationStatus) {
    setSaveError("");
    if (!selectedClientId) {
      setSaveError("Please select a client.");
      return;
    }
    if (!quotationDate) {
      setSaveError("Quotation date is required.");
      return;
    }
    if (!validUntil) {
      setSaveError("Validity date is required.");
      return;
    }
    if (items.length === 0 || items.every((i) => !i.product.trim())) {
      setSaveError("Add at least one item with a product.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        clientId: selectedClientId,
        date: quotationDate,
        validUntil,
        gstRate: parsedGstRate,
        status,
        items: items
          .filter((i) => i.product.trim())
          .map((i) => ({
            product: i.product.trim(),
            description: i.product.trim(),
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            amount: i.quantity * i.unitPrice,
            ...(i.imageBase64 ? { imageBase64: i.imageBase64 } : {}),
          })),
        shippingAddress: sameAsBilling ? undefined : (shippingAddress.trim() || undefined),
        notes: notes.trim() || undefined,
      };

      if (initialQuotation && onUpdateQuotation) {
        await onUpdateQuotation(initialQuotation.id, payload);
      } else {
        await onCreateQuotation(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAndDownload(status: QuotationStatus) {
    setSaveError("");
    if (!selectedClientId) {
      setSaveError("Please select a client.");
      return;
    }
    if (!quotationDate) {
      setSaveError("Quotation date is required.");
      return;
    }
    if (!validUntil) {
      setSaveError("Validity date is required.");
      return;
    }
    if (items.length === 0 || items.every((i) => !i.product.trim())) {
      setSaveError("Add at least one item with a product.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        clientId: selectedClientId,
        date: quotationDate,
        validUntil,
        gstRate: parsedGstRate,
        status,
        items: items
          .filter((i) => i.product.trim())
          .map((i) => ({
            product: i.product.trim(),
            description: i.product.trim(),
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            amount: i.quantity * i.unitPrice,
            ...(i.imageBase64 ? { imageBase64: i.imageBase64 } : {}),
          })),
        shippingAddress: sameAsBilling ? undefined : (shippingAddress.trim() || undefined),
        notes: notes.trim() || undefined,
      };

      let savedId = initialQuotation?.id ?? "";
      let savedNumber = initialQuotation?.quotationNumber ?? "";
      if (initialQuotation && onUpdateQuotation) {
        await onUpdateQuotation(initialQuotation.id, payload);
      } else {
        const created = await onCreateQuotation(payload);
        savedId = created.id;
        savedNumber = created.quotationNumber ?? "";
      }

      const date = quotationDate ? new Date(quotationDate) : new Date();
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = String(date.getFullYear()).slice(-2);
      const qNumber = savedNumber || initialQuotation?.id || `SBS-${day}${month}${year}`;

      const clientObj = clients.find((c) => c.id === selectedClientId);

      const doc = (
        <QuotationDocument
          data={{
            quotationNumber: qNumber,
            issueDate: date.toLocaleDateString("en-IN", {
              year: "numeric", month: "2-digit", day: "2-digit",
            }),
            clientName: clientObj?.name || clientName || "Client",
            clientPhone: clientObj?.phone,
            clientAddress: clientObj?.address,
            clientGST: clientObj?.gstNumber || "",
            shippingAddress: sameAsBilling ? (clientObj?.address ?? "") : (shippingAddress.trim() || undefined),
            items: items
              .filter((i) => i.product.trim())
              .map((i) => ({
                product: i.product.trim(),
                description: i.product.trim(),
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                amount: i.quantity * i.unitPrice,
                imageBase64: i.imageBase64,
              })),
            taxRate: parsedGstRate,
            total,
            showImages: true,
          }}
        />
      );
      await downloadPdf(doc, `${qNumber}.pdf`);

      onSaved();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="max-w-3xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {initialQuotation ? "Edit Quotation" : "Create New Quotation"}
          </SheetTitle>
          <SheetDescription>
            {initialQuotation
              ? `Editing ${initialQuotation.quotationNumber ?? initialQuotation.id}`
              : "Generate a formal quotation for a client"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-5">
          {saveError && (
            <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">
              {saveError}
            </p>
          )}

          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600">
                1
              </span>
              Client & Dates
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5 sm:col-span-2">
                <label className="text-sm font-semibold text-slate-700">
                  Client *
                </label>
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                >
                  <option value="">— Select client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` — ${c.company}` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Quotation Date *
                </label>
                <input
                  type="date"
                  value={quotationDate}
                  onChange={(e) => setQuotationDate(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-700 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  Valid Until *
                </label>
                <input
                  type="date"
                  value={validUntil}
                  onChange={(e) => setValidUntil(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-700 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600">
                2
              </span>
              Line Items *
            </h3>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-600">
                      Product / Description
                    </th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-600 w-20">
                      Qty
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 w-24">
                      Price
                    </th>
                    <th className="px-4 py-3 text-right font-semibold text-slate-600 w-24">
                      Total
                    </th>
                    <th className="px-4 py-3 text-center w-14">Image</th>
                    <th className="px-4 py-3 text-center w-10"></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          placeholder="Product / Description"
                          value={item.product}
                          onChange={(e) =>
                            handleItemChange(item.id, "product", e.target.value)
                          }
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-1"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "quantity",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-center outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-1"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "unitPrice",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm text-right outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-1"
                        />
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {fmt(item.quantity * item.unitPrice)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <label className="relative inline-flex cursor-pointer items-center justify-center">
                          <input
                            type="file"
                            accept="image/*"
                            className="sr-only"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleItemImageUpload(item.id, file);
                              e.target.value = "";
                            }}
                          />
                          {item.imageBase64 ? (
                            <div className="relative group">
                              <img
                                src={item.imageBase64}
                                alt=""
                                className="h-10 w-10 rounded-lg border border-slate-200 object-cover"
                              />
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.preventDefault();
                                  removeItemImage(item.id);
                                }}
                                className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white text-[10px] leading-none shadow hover:bg-rose-600"
                              >
                                ×
                              </button>
                            </div>
                          ) : (
                            <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-sky-300 hover:text-sky-500 transition-colors text-lg font-light">
                              +
                            </span>
                          )}
                        </label>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="text-slate-400 hover:text-rose-500"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              type="button"
              onClick={addItem}
              className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-600 transition hover:bg-sky-100"
            >
              Add Item
            </button>
          </div>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600">
                3
              </span>
              Tax & Notes
            </h3>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  GST Rate %
                </label>
                <input
                  type="number"
                  value={gst}
                  onChange={(e) => setGst(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-700 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                />
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 space-y-2">
                <div className="flex justify-between text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <span>Subtotal</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-xs font-medium text-slate-500 uppercase tracking-wider">
                  <span>GST ({parsedGstRate}%)</span>
                  <span>{fmt(gstAmount)}</span>
                </div>
                <div className="border-t border-slate-200 pt-2 flex justify-between text-sm font-bold text-slate-900">
                  <span>Total Amount</span>
                  <span className="text-sky-600">{fmt(total)}</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Billing Address
              </label>
              <p className="whitespace-pre-line rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-600">
                {clients.find((c) => c.id === selectedClientId)?.address || "No billing address available for selected client"}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-3">
                <label className="text-sm font-semibold text-slate-700">
                  Shipping Address
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={sameAsBilling}
                    onChange={(e) => {
                      setSameAsBilling(e.target.checked);
                      if (e.target.checked) {
                        const c = clients.find((c) => c.id === selectedClientId);
                        setShippingAddress(c?.address ?? "");
                      }
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
                  />
                  Same as billing address
                </label>
              </div>
              <textarea
                placeholder="Enter shipping address if different from billing address..."
                rows={2}
                value={sameAsBilling ? (clients.find((c) => c.id === selectedClientId)?.address ?? "") : shippingAddress}
                onChange={(e) => {
                  setShippingAddress(e.target.value);
                  setSameAsBilling(false);
                }}
                disabled={sameAsBilling}
                className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2 disabled:bg-slate-50 disabled:text-slate-500"
              />
            </div>

            <textarea
              placeholder="Additional notes, payment terms, or remarks..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
            />
          </div>
        </div>

        <div className="flex items-center gap-3 border-t border-slate-100 py-4 bg-slate-50">
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave("Draft")}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-600 disabled:opacity-60"
          >
            {initialQuotation ? "Update as Draft" : "Save as Draft"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSave("Pending")}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF6B4A] py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] active:scale-95 disabled:opacity-60"
          >
            <Send className="h-4 w-4" aria-hidden="true" />
            {saving
              ? "Saving..."
              : initialQuotation
                ? "Update Quotation"
                : "Create Quotation"}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => handleSaveAndDownload("Pending")}
            className="flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save & Download"}
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
