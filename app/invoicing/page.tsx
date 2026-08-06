"use client";

import PageHeader from "@/components/PageHeader";
import CrmShell from "@/components/layout/CrmShell";
import { fmtCompactCurrency } from "@/utils/formatting";
import { InvoiceDownloadButton } from "@/components/InvoiceDownloadButton";
import { InvoiceDocument } from "@/utils/pdf/invoicePdf";
import { downloadPdf } from "@/utils/pdf/download";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

import {
  useInvoicingPageData,
  type InvoicingCreateInvoicePayload,
} from "@/hooks/useInvoicingPageData";
import type { Client } from "@/types/client";
import type {
  Invoice,
  InvoiceItem,
  InvoiceStatus,
} from "@/types/invoice";
import { RecordPaymentSheet } from "@/components/RecordPaymentSheet";
import { fetchInvoicePayments } from "@/services/paymentService";
import type { Payment } from "@/types/payment";
import {
  ChevronDown,
  CircleDollarSign,
  ClipboardList,
  Download,
  Eye,
  FileText,
  Pencil,
  Plus,
  Search,
  Send,
  Settings2,
  Trash2,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`crm-skeleton ${className}`} />;
}

function InvoiceRowSkeleton() {
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
        <SkeletonBox className="h-6 w-20 rounded-full" />
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


// Standardized types are imported from @/types/invoice

// ─── Helpers ──────────────────────────────────────────────────────────────────

const gstOptions = ["5%", "12%", "18%", "28%"];

function fmt(n?: number | null) {
  if (n === undefined || n === null) return "₹0";
  return fmtCompactCurrency(n);
}

function gstAmt(amount?: number | null, rate?: number | null) {
  if (!amount || !rate) return 0;
  return Math.round((amount * rate) / 100);
}

// ─── Badges ───────────────────────────────────────────────────────────────────

const invoiceStatusBadge: Record<InvoiceStatus, string> = {
  Paid: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  "Partially Paid": "bg-indigo-50 text-indigo-700 border border-indigo-200",
  Pending: "bg-amber-50   text-amber-700   border border-amber-200",
  Draft: "bg-slate-100  text-slate-500   border border-slate-200",
  Sent: "bg-sky-50     text-sky-700     border border-sky-200",
  Overdue: "bg-rose-50    text-rose-700    border border-rose-200",
  Cancelled: "bg-slate-100 text-slate-400 border border-slate-200",
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
  onUpdateClient?: (
    id: string,
    payload: {
      name?: string;
      email?: string;
      phone?: string;
      company?: string;
      address?: string;
      gstNumber?: string;
    },
  ) => Promise<Client>;
  onSaved: (client: Client) => void;
  initialClient?: Client;
};

function AddClientModal({
  onClose,
  onCreateClient,
  onUpdateClient,
  onSaved,
  initialClient,
}: AddClientModalProps) {
  const [name, setName] = useState(initialClient?.name ?? "");
  const [email, setEmail] = useState(initialClient?.email ?? "");
  const [phone, setPhone] = useState(initialClient?.phone ?? "");
  const [company, setCompany] = useState(initialClient?.company ?? "");
  const [address, setAddress] = useState(initialClient?.address ?? "");
  const [gstNumber, setGstNumber] = useState(initialClient?.gstNumber ?? "");
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
      if (initialClient && onUpdateClient) {
        const updated = await onUpdateClient(initialClient.id, {
          name: name.trim(),
          email,
          phone,
          company,
          address,
          gstNumber,
        });
        onSaved(updated);
      } else {
        const created = await onCreateClient({
          name: name.trim(),
          email,
          phone,
          company,
          address,
          gstNumber,
        });
        onSaved(created);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {initialClient ? "Edit Client" : "Add New Client"}
          </SheetTitle>
          <SheetDescription>
            {initialClient
              ? `Update details for ${initialClient.name}`
              : "Save client details for invoicing"}
          </SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-5">
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
                  placeholder="e.g. Reliance Industries"
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
                  placeholder="email@example.com"
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
                  placeholder="+91 98765 43210"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-semibold text-slate-700">
                  GST Number
                </label>
                <input
                  type="text"
                  placeholder="22AAAAA0000A1Z5"
                  value={gstNumber}
                  onChange={(e) => setGstNumber(e.target.value)}
                  className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Address
              </label>
              <textarea
                placeholder="Full billing address"
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 border-t border-slate-100 py-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-600"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF6B4A] py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] active:scale-95 disabled:opacity-60"
            >
              {saving
                ? "Saving..."
                : initialClient
                  ? "Update Client"
                  : "Save Client"}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

// ─── Create Invoice Modal ──────────────────────────────────────────────────────

type InvoiceLineItem = {
  id: string;
  description: string;
  hsnCode: string;
  quantity: number;
  unitPrice: number;
  imageBase64?: string;
};

type CreateInvoiceModalProps = {
  onClose: () => void;
  onCreateInvoice: (payload: InvoicingCreateInvoicePayload) => Promise<Invoice>;
  onUpdateInvoice?: (
    id: string,
    payload: Partial<InvoicingCreateInvoicePayload>,
  ) => Promise<Invoice>;
  onSaved: () => void;
  clients: Client[];
  initialInvoice?: Invoice;
  onEditClientClick?: (client: Client) => void;
  embedded?: boolean;
};

function CreateInvoiceModal({
  onClose,
  onCreateInvoice,
  onUpdateInvoice,
  onSaved,
  clients,
  initialInvoice,
  onEditClientClick,
  embedded = false,
}: CreateInvoiceModalProps) {
  const currentYear = new Date().getFullYear();
  const [clientName, setClientName] = useState(initialInvoice?.client ?? "");
  const [selectedClientId, setSelectedClientId] = useState(
    initialInvoice?.customerId ?? "",
  );
  const [invoiceNumberMode, setInvoiceNumberMode] = useState<"auto" | "manual">(
    "auto",
  );
  const [manualInvoiceId, setManualInvoiceId] = useState("");
  const [seriesPrefix, setSeriesPrefix] = useState(`INV-${currentYear}-`);
  const [seriesSuffix, setSeriesSuffix] = useState("");
  const [seriesStart, setSeriesStart] = useState(1);
  const [seriesPadding, setSeriesPadding] = useState(3);
  const [invoiceDate, setInvoiceDate] = useState(initialInvoice?.date ?? "");
  const [items, setItems] = useState<InvoiceLineItem[]>([]);
  const [gst, setGst] = useState(String(initialInvoice?.gstRate ?? 18));
  const [discountPercent, setDiscountPercent] = useState(
    initialInvoice?.discountPercentage ?? 0,
  );
  const [tdsRate, setTdsRate] = useState(initialInvoice?.tdsRate ?? 0);
  const [tcsRate, setTcsRate] = useState(initialInvoice?.tcsRate ?? 0);
  const [notes, setNotes] = useState(initialInvoice?.notes ?? "");
  const [shippingAddress, setShippingAddress] = useState(
    initialInvoice?.shippingAddress ?? "",
  );
  const [sameAsBilling, setSameAsBilling] = useState(false);
  const [currency, setCurrency] = useState(initialInvoice?.currency ?? "INR");
  const [taxType, setTaxType] = useState<"CGST_SGST" | "IGST">(
    (initialInvoice?.taxType ?? "CGST_SGST") as "CGST_SGST" | "IGST",
  );
  const [signatoryName, setSignatoryName] = useState(
    initialInvoice?.signatoryName ?? "",
  );
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const gstRef = useRef<HTMLDivElement>(null);
  const currencySymbol: Record<string, string> = {
    INR: "₹",
    USD: "$",
    EUR: "€",
    GBP: "£",
    AED: "AED",
  };
  const fmtCurrency = (n: number) =>
    (currencySymbol[currency] ?? "₹") + n.toLocaleString("en-IN");

  useEffect(() => {
    if (initialInvoice?.items?.length) {
      setItems(
        initialInvoice.items.map((item, idx) => ({
          id: String(idx + 1),
          description: item.description,
          hsnCode: item.hsnCode ?? "",
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      );
    } else {
      setItems([
        { id: "1", description: "", hsnCode: "", quantity: 1, unitPrice: 0 },
      ]);
    }
  }, []);

  // Removed unused click-outside handler for GST dropdown

  function handleClientSelect(id: string) {
    setSelectedClientId(id);
    const c = clients.find((c) => c.id === id);
    if (c) setClientName(c.company ? `${c.name} — ${c.company}` : c.name);
  }

  function handleEditSelectedClient() {
    if (!selectedClientId || !onEditClientClick) return;
    const selectedClient = clients.find((c) => c.id === selectedClientId);
    if (!selectedClient) return;
    onEditClientClick(selectedClient);
  }

  function handleItemChange(
    id: string,
    field: keyof InvoiceLineItem,
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
      { id: newId, description: "", hsnCode: "", quantity: 1, unitPrice: 0 },
    ]);
  }

  function removeItem(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }

  const subtotal = items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
  const discountAmount = Math.round((subtotal * (discountPercent || 0)) / 100);
  const taxableAmount = subtotal - discountAmount;

  const parsedGstRate = parseFloat(gst) || 0;
  const gstAmount = Math.round((taxableAmount * parsedGstRate) / 100);

  const tdsAmount = Math.round((taxableAmount * (tdsRate || 0)) / 100);
  const tcsAmount = Math.round((taxableAmount * (tcsRate || 0)) / 100);

  const total = taxableAmount + gstAmount + tdsAmount + tcsAmount;
  const autoSeriesPreview = `${seriesPrefix}${String(
    Math.max(1, seriesStart),
  ).padStart(Math.max(1, seriesPadding), "0")}${seriesSuffix}`;

  async function handleSave(status: "Draft" | "Sent") {
    setSaveError("");
    if (!clientName.trim()) {
      setSaveError("Client name is required.");
      return;
    }
    if (!invoiceDate) {
      setSaveError("Invoice date is required.");
      return;
    }
    if (
      !initialInvoice &&
      invoiceNumberMode === "manual" &&
      !manualInvoiceId.trim()
    ) {
      setSaveError("Manual invoice number is required.");
      return;
    }
    if (
      !initialInvoice &&
      invoiceNumberMode === "auto" &&
      !seriesPrefix.trim()
    ) {
      setSaveError("Series prefix is required for auto numbering.");
      return;
    }
    if (items.length === 0 || items.every((i) => !i.description.trim())) {
      setSaveError("Add at least one item with a description.");
      return;
    }
    if (subtotal <= 0) {
      setSaveError("Total amount must be greater than zero.");
      return;
    }

    const payload = {
      client: clientName.trim(),
      clientId: selectedClientId || undefined,
      invoiceNumberMode: !initialInvoice ? invoiceNumberMode : undefined,
      manualInvoiceId:
        !initialInvoice && invoiceNumberMode === "manual"
          ? manualInvoiceId.trim()
          : undefined,
      invoiceSeries:
        !initialInvoice && invoiceNumberMode === "auto"
          ? {
              prefix: seriesPrefix.trim(),
              suffix: seriesSuffix.trim() || undefined,
              start: Math.max(1, Math.trunc(seriesStart || 1)),
              padding: Math.max(1, Math.trunc(seriesPadding || 1)),
            }
          : undefined,
      date: invoiceDate,
      gstRate: parsedGstRate,
      discountPercentage: discountPercent,
      tdsRate,
      tcsRate,
      status,
      currency,
      taxType,
      signatoryName: signatoryName.trim() || undefined,
      items: items
        .filter((i) => i.description.trim())
        .map((i) => ({
          description: i.description.trim(),
          hsnCode: i.hsnCode.trim() || undefined,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          amount: i.quantity * i.unitPrice,
          ...(i.imageBase64 ? { imageBase64: i.imageBase64 } : {}),
        })),
      shippingAddress: sameAsBilling ? undefined : (shippingAddress.trim() || undefined),
      notes: notes.trim() || undefined,
    };

    setSaving(true);
    try {
      if (initialInvoice && onUpdateInvoice) {
        await onUpdateInvoice(initialInvoice.id, payload);
      } else {
        await onCreateInvoice(payload);
      }
      onSaved();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  async function handleSaveAndDownload(status: "Draft" | "Sent") {
    setSaveError("");
    if (!clientName.trim()) {
      setSaveError("Client name is required.");
      return;
    }
    if (!invoiceDate) {
      setSaveError("Invoice date is required.");
      return;
    }
    if (items.length === 0 || items.every((i) => !i.description.trim())) {
      setSaveError("Add at least one item with a description.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        client: clientName.trim(),
        clientId: selectedClientId || undefined,
        invoiceNumberMode: !initialInvoice ? invoiceNumberMode : undefined,
        manualInvoiceId:
          !initialInvoice && invoiceNumberMode === "manual"
            ? manualInvoiceId.trim()
            : undefined,
        invoiceSeries:
          !initialInvoice && invoiceNumberMode === "auto"
            ? {
                prefix: seriesPrefix.trim(),
                suffix: seriesSuffix.trim() || undefined,
                start: Math.max(1, Math.trunc(seriesStart || 1)),
                padding: Math.max(1, Math.trunc(seriesPadding || 1)),
              }
            : undefined,
        date: invoiceDate,
        gstRate: parsedGstRate,
        discountPercentage: discountPercent,
        tdsRate,
        tcsRate,
        status,
        currency,
        taxType,
        signatoryName: signatoryName.trim() || undefined,
        items: items
          .filter((i) => i.description.trim())
          .map((i) => ({
            description: i.description.trim(),
            hsnCode: i.hsnCode.trim() || undefined,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            amount: i.quantity * i.unitPrice,
            imageBase64: i.imageBase64,
          })),
        shippingAddress: sameAsBilling ? undefined : (shippingAddress.trim() || undefined),
        notes: notes.trim() || undefined,
      };

      let savedId = initialInvoice?.id ?? "";
      if (initialInvoice && onUpdateInvoice) {
        await onUpdateInvoice(initialInvoice.id, payload);
      } else {
        const created = await onCreateInvoice(payload);
        savedId = created.id;
      }

      const date = invoiceDate ? new Date(invoiceDate) : new Date();
      const clientObj = clients.find((c) => c.id === selectedClientId);

      const doc = (
        <InvoiceDocument
          data={{
            invoiceNumber: savedId,
            issueDate: date.toLocaleDateString("en-IN", {
              year: "numeric", month: "2-digit", day: "2-digit",
            }),
            clientName: clientObj?.name || clientName || "Client",
            clientPhone: clientObj?.phone,
            clientAddress: clientObj?.address,
            clientGST: clientObj?.gstNumber || "",
            clientEmail: clientObj?.email,
            shippingAddress: sameAsBilling ? (clientObj?.address ?? "") : (shippingAddress.trim() || undefined),
            items: items
              .filter((i) => i.description.trim())
              .map((i) => ({
                description: i.description.trim(),
                hsnCode: i.hsnCode.trim() || undefined,
                quantity: i.quantity,
                unitPrice: i.unitPrice,
                amount: i.quantity * i.unitPrice,
                imageBase64: i.imageBase64,
              })),
            taxRate: parsedGstRate,
            subtotal,
            tax: gstAmount,
            cgst: taxType === "CGST_SGST" ? Math.round(gstAmount / 2) : undefined,
            sgst: taxType === "CGST_SGST" ? Math.round(gstAmount / 2) : undefined,
            taxType,
            discountPercentage: discountPercent,
            discountAmount,
            currency,
            total,
            signatoryName: signatoryName.trim() || undefined,
            notes: notes.trim() || undefined,
            showImages: true,
          }}
        />
      );
      await downloadPdf(doc, `${savedId}.pdf`);

      onSaved();
      onClose();
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  }

  const formContent = (
    <>
      <SheetHeader>
        <SheetTitle>
          {initialInvoice ? "Edit Invoice" : "Create New Invoice"}
        </SheetTitle>
        <SheetDescription>
          {initialInvoice
            ? `Editing ${initialInvoice.id}`
            : "Add items and generate invoice"}
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 py-5">
        {saveError && (
          <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">
            {saveError}
          </p>
        )}

        {/* Basic Info Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600">
              1
            </span>
            Basic Information
          </h3>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Client selector */}
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <label className="text-sm font-semibold text-slate-700">
                Client *
              </label>
              {clients.length > 0 && (
                <select
                  value={selectedClientId}
                  onChange={(e) => handleClientSelect(e.target.value)}
                  className="mb-1.5 h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                >
                  <option value="">— Select existing client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                      {c.company ? ` — ${c.company}` : ""}
                    </option>
                  ))}
                </select>
              )}
              <input
                type="text"
                placeholder={
                  clients.length > 0
                    ? "Or type client name manually"
                    : "Enter client name"
                }
                value={clientName}
                onChange={(e) => {
                  setClientName(e.target.value);
                  setSelectedClientId("");
                }}
                className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
              />
              {selectedClientId && (
                <div className="mt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={handleEditSelectedClient}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-sky-200 bg-sky-50 px-3 py-1.5 text-xs font-semibold text-sky-700 transition hover:bg-sky-100"
                  >
                    <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                    Edit Selected Client Details
                  </button>
                </div>
              )}
            </div>

            <div className="sm:col-span-2 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <label className="text-sm font-semibold text-slate-700">
                  Invoice Number
                </label>
                {initialInvoice && (
                  <span className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600">
                    {initialInvoice.id}
                  </span>
                )}
              </div>

              {initialInvoice ? (
                <p className="text-xs text-slate-500">
                  Invoice number cannot be changed while editing.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => setInvoiceNumberMode("auto")}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        invoiceNumberMode === "auto"
                          ? "border-sky-400 bg-sky-50 text-sky-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      Auto Increment Series
                    </button>
                    <button
                      type="button"
                      onClick={() => setInvoiceNumberMode("manual")}
                      className={`rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                        invoiceNumberMode === "manual"
                          ? "border-sky-400 bg-sky-50 text-sky-700"
                          : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                      }`}
                    >
                      Manual Number
                    </button>
                  </div>

                  {invoiceNumberMode === "manual" ? (
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-slate-600">
                        Manual Invoice Number *
                      </label>
                      <input
                        type="text"
                        value={manualInvoiceId}
                        onChange={(e) => setManualInvoiceId(e.target.value)}
                        placeholder="e.g. INV-CUST-00045"
                        className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                      />
                    </div>
                  ) : (
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-600">
                          Prefix
                        </label>
                        <input
                          type="text"
                          value={seriesPrefix}
                          onChange={(e) => setSeriesPrefix(e.target.value)}
                          placeholder="e.g. INV-2026-"
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-600">
                          Suffix (Optional)
                        </label>
                        <input
                          type="text"
                          value={seriesSuffix}
                          onChange={(e) => setSeriesSuffix(e.target.value)}
                          placeholder="e.g. /SB"
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-600">
                          Starting Number
                        </label>
                        <input
                          type="number"
                          min="1"
                          step="1"
                          value={seriesStart}
                          onChange={(e) =>
                            setSeriesStart(Number(e.target.value))
                          }
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-semibold text-slate-600">
                          Number Padding
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="10"
                          step="1"
                          value={seriesPadding}
                          onChange={(e) =>
                            setSeriesPadding(Number(e.target.value))
                          }
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                        />
                      </div>
                      <div className="sm:col-span-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
                        Preview:{" "}
                        <span className="font-semibold text-slate-800">
                          {autoSeriesPreview}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Invoice Date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Invoice Date *
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-700 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
              />
            </div>
          </div>
        </div>

        {/* Items Section */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600">
              2
            </span>
            Invoice Items *
          </h3>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50">
                  <th className="px-4 py-3 text-left font-semibold text-slate-600">
                    Description
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 w-28">
                    HSN/SAC
                  </th>
                  <th className="px-4 py-3 text-center font-semibold text-slate-600 w-20">
                    Qty
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-600 w-16">
                    Image
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 w-24">
                    Unit Price
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-600 w-24">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center w-10"></th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => {
                  const amount = item.quantity * item.unitPrice;
                  return (
                    <tr
                      key={item.id}
                      className="border-b border-slate-100 hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          placeholder="Item description"
                          value={item.description}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "description",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-1"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="text"
                          placeholder="HSN/SAC"
                          value={item.hsnCode}
                          onChange={(e) =>
                            handleItemChange(
                              item.id,
                              "hsnCode",
                              e.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-slate-200 px-2.5 py-1.5 text-sm outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-1"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="1"
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
                      <td className="px-4 py-3 text-center">
                        {item.imageBase64 ? (
                          <div className="relative inline-flex">
                            <img
                              src={item.imageBase64}
                              alt=""
                              className="h-7 w-7 rounded border border-slate-200 object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => removeItemImage(item.id)}
                              className="absolute -right-1 -top-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-white shadow"
                              title="Remove image"
                            >
                              <X className="h-3 w-3" aria-hidden="true" />
                            </button>
                          </div>
                        ) : (
                          <label className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-sky-300 hover:text-sky-500">
                            <Plus className="h-4 w-4" />
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleItemImageUpload(item.id, file);
                                e.target.value = "";
                              }}
                            />
                          </label>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
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
                      <td className="px-4 py-3 text-right font-semibold text-slate-900">
                        {fmt(amount)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(item.id)}
                            className="inline-flex h-7 w-7 items-center justify-center rounded-lg text-slate-400 transition hover:bg-rose-50 hover:text-rose-500"
                            title="Remove item"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={addItem}
            className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2 text-sm font-semibold text-sky-600 transition hover:bg-sky-100"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add Item
          </button>
        </div>

        {/* GST and Totals */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600">
              3
            </span>
            Tax & Totals
          </h3>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Currency */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Currency
              </label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-700 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
              >
                <option value="INR">₹ INR – Indian Rupee</option>
                <option value="USD">$ USD – US Dollar</option>
                <option value="EUR">€ EUR – Euro</option>
                <option value="GBP">£ GBP – British Pound</option>
                <option value="AED">AED – UAE Dirham</option>
              </select>
            </div>

            {/* GST % */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">
                GST Rate %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={gst}
                onChange={(e) => setGst(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-700 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
              />
            </div>

            {/* Tax Type */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Tax Type
              </label>
              <div className="flex h-10 overflow-hidden rounded-xl border border-slate-200 text-sm font-semibold">
                <button
                  type="button"
                  onClick={() => setTaxType("CGST_SGST")}
                  className={`flex-1 transition ${taxType === "CGST_SGST" ? "bg-[#FF6B4A] text-white" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  CGST + SGST
                </button>
                <button
                  type="button"
                  onClick={() => setTaxType("IGST")}
                  className={`flex-1 transition ${taxType === "IGST" ? "bg-[#FF6B4A] text-white" : "text-slate-500 hover:bg-slate-50"}`}
                >
                  IGST
                </button>
              </div>
            </div>

            {/* Discount % */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">
                Discount %
              </label>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Number(e.target.value))}
                className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-700 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
              />
            </div>

            {/* TDS % */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">
                TDS %
              </label>
              <input
                type="number"
                step="0.01"
                value={tdsRate}
                onChange={(e) => setTdsRate(Number(e.target.value))}
                placeholder="e.g. -1 for deduction"
                className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-700 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
              />
            </div>

            {/* TCS % */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-slate-700">
                TCS %
              </label>
              <input
                type="number"
                step="0.01"
                value={tcsRate}
                onChange={(e) => setTcsRate(Number(e.target.value))}
                placeholder="e.g. 0.075"
                className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-700 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
              />
            </div>

            {/* Summary Card */}
            <div className="flex flex-col gap-1.5 sm:col-span-3">
              <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 p-5 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">
                    Subtotal:
                  </span>
                  <span className="font-bold text-slate-900">
                    {fmt(subtotal)}
                  </span>
                </div>
                {discountPercent > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">
                      Discount ({discountPercent}%):
                    </span>
                    <span className="font-bold text-rose-600">
                      -{fmt(discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">
                    Taxable Value:
                  </span>
                  <span className="font-bold text-slate-900">
                    {fmt(taxableAmount)}
                  </span>
                </div>
                {taxType === "CGST_SGST" ? (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">
                        CGST ({parsedGstRate / 2}%):
                      </span>
                      <span className="font-bold text-sky-600">
                        +{fmt(Math.round(gstAmount / 2))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">
                        SGST ({parsedGstRate / 2}%):
                      </span>
                      <span className="font-bold text-sky-600">
                        +{fmt(Math.round(gstAmount / 2))}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">
                      IGST ({gst}%):
                    </span>
                    <span className="font-bold text-sky-600">
                      +{fmt(gstAmount)}
                    </span>
                  </div>
                )}
                {tdsRate !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">
                      TDS ({tdsRate}%):
                    </span>
                    <span
                      className={`font-bold ${tdsRate < 0 ? "text-rose-600" : "text-emerald-600"}`}
                    >
                      {tdsRate > 0 ? "+" : ""}
                      {fmt(tdsAmount)}
                    </span>
                  </div>
                )}
                {tcsRate !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">
                      TCS ({tcsRate}%):
                    </span>
                    <span
                      className={`font-bold ${tcsRate < 0 ? "text-rose-600" : "text-emerald-600"}`}
                    >
                      {tcsRate > 0 ? "+" : ""}
                      {fmt(tcsAmount)}
                    </span>
                  </div>
                )}
                <div className="border-t border-sky-200 pt-3 flex justify-between items-center">
                  <span className="text-base font-bold text-slate-900">
                    Total Amount:
                  </span>
                  <span className="text-2xl font-black text-sky-600">
                    {fmtCurrency(total)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Signatory + Notes Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-600">
              4
            </span>
            Additional Details (Optional)
          </h3>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Authorised Signatory Name
            </label>
            <input
              type="text"
              placeholder="e.g. Rajesh Kumar"
              value={signatoryName}
              onChange={(e) => setSignatoryName(e.target.value)}
              className="h-10 w-full rounded-xl border border-slate-200 px-3.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
            />
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

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-slate-700">
              Notes
            </label>
            <textarea
              placeholder="Add any notes or terms and conditions..."
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full resize-none rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
            />
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 border-t border-slate-100 py-4 bg-slate-50">
        <button
          type="button"
          disabled={saving}
          onClick={() => handleSave("Draft")}
          className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-600 disabled:opacity-60"
        >
          {initialInvoice ? "Update as Draft" : "Save as Draft"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => handleSaveAndDownload("Sent")}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95 disabled:opacity-60"
        >
          <Download className="h-4 w-4" aria-hidden="true" />
          {saving
            ? "Saving..."
            : "Save & Download"}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={() => handleSave("Sent")}
          className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#FF6B4A] py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] active:scale-95 disabled:opacity-60"
        >
          <Send className="h-4 w-4" aria-hidden="true" />
          {saving
            ? "Saving..."
            : initialInvoice
              ? "Update & Send"
              : "Create & Send"}
        </button>
      </div>
    </>
  );

  if (embedded) return formContent;

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="max-w-4xl overflow-y-auto">
        {formContent}
      </SheetContent>
    </Sheet>
  );
}








// ─── Invoice Detail Modal ─────────────────────────────────────────────────────

type FullInvoice = Invoice & { items: InvoiceItem[] };

type InvoiceDetailSheetProps = {
  invoice: FullInvoice | null;
  onClose: () => void;
  onUpdateInvoice: (
    id: string,
    payload: Partial<InvoicingCreateInvoicePayload>,
  ) => Promise<Invoice>;
  clients: Client[];
  onEditClientClick: (client: Client) => void;
  onRecordPayment: (invoiceId: string) => void;
  defaultMode?: "view" | "edit";
  paymentsRefreshKey?: number;
};

function InvoiceDetailSheet({
  invoice,
  onClose,
  onUpdateInvoice,
  clients,
  onEditClientClick,
  onRecordPayment,
  defaultMode = "view",
  paymentsRefreshKey = 0,
}: InvoiceDetailSheetProps) {
  const [mode, setMode] = useState<"view" | "edit">(defaultMode);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [paymentsSummary, setPaymentsSummary] = useState<{
    totalAmount: number;
    paidAmount: number;
    remaining: number;
  } | null>(null);

  const modeSyncKey = `${invoice?.id}:${defaultMode}`;
  const [lastModeSyncKey, setLastModeSyncKey] = useState(modeSyncKey);
  if (modeSyncKey !== lastModeSyncKey) {
    setLastModeSyncKey(modeSyncKey);
    setMode(defaultMode);
  }

  useEffect(() => {
    const invoiceId = invoice?.id;
    if (!invoiceId) return;
    let cancelled = false;
    fetchInvoicePayments(invoiceId)
      .then((res) => {
        if (cancelled) return;
        setPayments(res.data);
        setPaymentsSummary(res.summary);
      })
      .catch(() => {
        if (cancelled) return;
        setPayments([]);
        setPaymentsSummary(null);
      });
    return () => {
      cancelled = true;
    };
  }, [invoice?.id, paymentsRefreshKey]);

  if (!invoice) return null;

  return (
    <Sheet open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <SheetContent side="right" className="max-w-3xl overflow-y-auto">
        {mode === "edit" ? (
          <CreateInvoiceModal
            embedded
            onClose={() => setMode("view")}
            onCreateInvoice={async () => invoice}
            onUpdateInvoice={onUpdateInvoice}
            onSaved={() => onClose()}
            clients={clients}
            initialInvoice={invoice}
            onEditClientClick={onEditClientClick}
          />
        ) : (
          <>
            <SheetHeader>
              <SheetTitle>Invoice Details</SheetTitle>
              <SheetDescription>ID: {invoice.id}</SheetDescription>
            </SheetHeader>

            <div className="space-y-6">
              {/* Header Info */}
              <div className="grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Client
                  </p>
                  <div className="mt-1 space-y-1 text-sm text-slate-700">
                    <p className="font-semibold text-slate-900">
                      {invoice.client ?? "N/A"}
                    </p>
                    {invoice.clientAddress && (
                      <p className="whitespace-pre-line text-xs text-slate-600">
                        {invoice.clientAddress}
                      </p>
                    )}
                    {invoice.clientPhone && (
                      <p className="text-xs text-slate-600">
                        Phone: {invoice.clientPhone}
                      </p>
                    )}
                    {invoice.clientEmail && (
                      <p className="text-xs text-slate-600">
                        Email: {invoice.clientEmail}
                      </p>
                    )}
                    {invoice.clientGST && (
                      <p className="text-xs text-slate-600">
                        GST: {invoice.clientGST}
                      </p>
                    )}
                    {invoice.shippingAddress && (
                      <div className="mt-2 border-t border-slate-200 pt-2">
                        <p className="text-xs font-semibold text-slate-500 uppercase mb-1">
                          Shipping Address
                        </p>
                        <p className="whitespace-pre-line text-xs text-slate-600">
                          {invoice.shippingAddress}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Invoice Date
                  </p>
                  <p className="mt-1 text-sm font-semibold text-slate-900">
                    {invoice.date}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-500 uppercase">
                    Status
                  </p>
                  <p className="mt-1">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-semibold ${invoiceStatusBadge[invoice.status]}`}
                    >
                      {invoice.status}
                    </span>
                  </p>
                </div>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-slate-700">
                  Invoice Items
                </h3>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                          Description
                        </th>
                        {invoice.items.some((i) => i.hsnCode) && (
                          <th className="px-4 py-3 text-left font-semibold text-slate-600 w-28">
                            HSN/SAC
                          </th>
                        )}
                        <th className="px-4 py-3 text-center font-semibold text-slate-600 w-20">
                          Qty
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 w-24">
                          Unit Price
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600 w-24">
                          Amount
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoice.items && invoice.items.length > 0 ? (
                        invoice.items.map((item, idx) => (
                          <tr
                            key={idx}
                            className="border-b border-slate-100 hover:bg-slate-50/50"
                          >
                            <td className="px-4 py-3 text-slate-900">
                              {item.description}
                            </td>
                            {invoice.items.some((i) => i.hsnCode) && (
                              <td className="px-4 py-3 text-slate-600 text-xs">
                                {item.hsnCode ?? ""}
                              </td>
                            )}
                            <td className="px-4 py-3 text-center text-slate-900">
                              {item.quantity}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-900">
                              {fmt(item.unitPrice)}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-slate-900">
                              {fmt(item.amount)}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td
                            colSpan={4}
                            className="px-4 py-8 text-center text-slate-400"
                          >
                            No items
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Summary */}
              <div className="rounded-2xl bg-gradient-to-br from-sky-50 to-blue-50 p-5 space-y-3 ml-auto w-full sm:w-96">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Subtotal:</span>
                  <span className="font-bold text-slate-900">
                    {fmt(invoice.subtotal)}
                  </span>
                </div>
                {invoice.discountPercentage > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">
                      Discount ({invoice.discountPercentage}%):
                    </span>
                    <span className="font-bold text-rose-600">
                      -{fmt(invoice.discountAmount)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600 font-medium">Taxable Value:</span>
                  <span className="font-bold text-slate-900">
                    {fmt(invoice.subtotal - invoice.discountAmount)}
                  </span>
                </div>
                {invoice.taxType === "IGST" ? (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">
                      IGST ({invoice.gstRate}%):
                    </span>
                    <span className="font-bold text-sky-600">
                      +{fmt(invoice.gstAmount)}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">
                        CGST ({invoice.gstRate / 2}%):
                      </span>
                      <span className="font-bold text-sky-600">
                        +{fmt(Math.round(invoice.gstAmount / 2))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600 font-medium">
                        SGST ({invoice.gstRate / 2}%):
                      </span>
                      <span className="font-bold text-sky-600">
                        +{fmt(Math.round(invoice.gstAmount / 2))}
                      </span>
                    </div>
                  </>
                )}
                {invoice.tdsRate !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">
                      TDS ({invoice.tdsRate}%):
                    </span>
                    <span
                      className={`font-bold ${invoice.tdsRate < 0 ? "text-rose-600" : "text-emerald-600"}`}
                    >
                      {invoice.tdsRate > 0 ? "+" : ""}
                      {fmt(invoice.tdsAmount)}
                    </span>
                  </div>
                )}
                {invoice.tcsRate !== 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600 font-medium">
                      TCS ({invoice.tcsRate}%):
                    </span>
                    <span
                      className={`font-bold ${invoice.tcsRate < 0 ? "text-rose-600" : "text-emerald-600"}`}
                    >
                      {invoice.tcsRate > 0 ? "+" : ""}
                      {fmt(invoice.tcsAmount)}
                    </span>
                  </div>
                )}
                <div className="border-t border-sky-200 pt-3 flex justify-between items-center">
                  <span className="text-base font-bold text-slate-900">
                    Total Amount:
                  </span>
                  <span className="text-2xl font-black text-sky-600">
                    {fmt(invoice.totalAmount)}
                  </span>
                </div>
              </div>

              {/* Payments */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-700">
                    Payments
                  </h3>
                  {paymentsSummary && (
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-semibold text-emerald-700 border border-emerald-200">
                        Paid {fmt(paymentsSummary.paidAmount)}
                      </span>
                      <span className="rounded-full bg-amber-50 px-2.5 py-1 font-semibold text-amber-700 border border-amber-200">
                        Remaining {fmt(paymentsSummary.remaining)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50">
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                          Date
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                          Mode
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                          Reference
                        </th>
                        <th className="px-4 py-3 text-right font-semibold text-slate-600">
                          Amount
                        </th>
                        <th className="px-4 py-3 text-left font-semibold text-slate-600">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {payments.length > 0 ? (
                        payments.map((payment) => (
                          <tr
                            key={payment.id}
                            className="border-b border-slate-100 last:border-0 hover:bg-slate-50/50"
                          >
                            <td className="px-4 py-3 text-slate-700">
                              {payment.paymentDate}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {payment.mode}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {payment.reference || "—"}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold text-emerald-600">
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
                      ) : (
                        <tr>
                          <td
                            colSpan={5}
                            className="px-4 py-8 text-center text-slate-400"
                          >
                            No payments recorded yet.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Notes */}
              {invoice.notes && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-700">Notes</h3>
                  <p className="rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700 whitespace-pre-line">
                    {invoice.notes}
                  </p>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 border-t border-slate-100 py-4 bg-slate-50">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-600"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => setMode("edit")}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-sky-300 py-2.5 text-sm font-semibold text-sky-600 transition hover:bg-sky-50"
              >
                <FileText className="h-4 w-4" aria-hidden="true" />
                Edit Invoice
              </button>
              {invoice.status !== "Draft" && invoice.status !== "Cancelled" && (
                <button
                  type="button"
                  onClick={() => onRecordPayment(invoice.id)}
                  className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-600 active:scale-95"
                >
                  <CircleDollarSign className="h-4 w-4" aria-hidden="true" />
                  Record Payment
                </button>
              )}
              <InvoiceDownloadButton
                invoice={invoice}
                className="flex-1 justify-center"
              />
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InvoicingPage() {
  const [showModal, setShowModal] = useState(false);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<FullInvoice | null>(
    null,
  );
  const [invoiceSheetMode, setInvoiceSheetMode] = useState<"view" | "edit">("view");
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusUpdatingId, setStatusUpdatingId] = useState<string | null>(null);
  const [openStatusId, setOpenStatusId] = useState<string | null>(null);
  const statusMenuRef = useRef<HTMLDivElement>(null);
  const [showRecordPayment, setShowRecordPayment] = useState(false);
  const [recordInvoiceId, setRecordInvoiceId] = useState<string | null>(null);
  const [paymentsRefreshKey, setPaymentsRefreshKey] = useState(0);

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
    invoices,
    clients,
    loading: isLoading,
    addClient,
    editClient,
    addInvoice,
    updateInvoice,
    getInvoiceById,
    removeInvoice,
    refresh: refreshInvoicing,
  } = useInvoicingPageData();

  const quickStatusOptions: InvoiceStatus[] = ["Draft", "Sent", "Paid"];

  async function handleViewInvoice(invoiceId: string) {
    try {
      const invoiceData = await getInvoiceById(invoiceId);
      setSelectedInvoice(invoiceData as FullInvoice);
      setInvoiceSheetMode("view");
    } catch {
      // handle error
    }
  }

  function handleRecordPayment(invoiceId: string) {
    setRecordInvoiceId(invoiceId);
    setShowRecordPayment(true);
  }

  async function handlePaymentSaved() {
    setShowRecordPayment(false);
    setRecordInvoiceId(null);
    await refreshInvoicing();
    if (selectedInvoice) {
      try {
        const invoiceData = await getInvoiceById(selectedInvoice.id);
        setSelectedInvoice(invoiceData as FullInvoice);
      } catch {
        // ignore
      }
    }
    setPaymentsRefreshKey((k) => k + 1);
  }

  async function handleEditInvoice(invoiceId: string) {
    try {
      const invoiceData = await getInvoiceById(invoiceId);
      setSelectedInvoice(invoiceData as FullInvoice);
      setInvoiceSheetMode("edit");
    } catch {
      // handle error
    }
  }

  async function handleQuickStatusChange(
    invoiceId: string,
    status: InvoiceStatus,
  ) {
    try {
      setStatusUpdatingId(invoiceId);
      await updateInvoice(invoiceId, { status });
    } catch {
      // silently fail
    } finally {
      setStatusUpdatingId(null);
    }
  }

  async function handleDeleteInvoice(id: string) {
    if (!confirm("Are you sure you want to delete this invoice?")) return;
    try {
      setStatusUpdatingId(id);
      await removeInvoice(id);
    } catch {
      // silently fail
    } finally {
      setStatusUpdatingId(null);
    }
  }

  const filteredInvoices = invoices.filter((inv) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      (inv.client?.toLowerCase().includes(q) ?? false) ||
      inv.id.toLowerCase().includes(q)
    );
  });

  return (
    <CrmShell activeNav="Invoices">
      <div className="space-y-5 p-4 md:p-6">
        {/* ── Page header ── */}
        <PageHeader title="Invoicing System" subtitle="Manage invoices, quotations, and billing" onRefresh={() => refreshInvoicing()}>
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-sky-300 hover:text-sky-600"
          >
            <Settings2 className="h-4 w-4" aria-hidden="true" />
            GST Settings
          </button>
          <button
            type="button"
            onClick={() => {
              setEditingClient(null);
              setShowClientModal(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-sky-200 bg-sky-50 px-4 py-2.5 text-sm font-semibold text-sky-600 shadow-sm transition hover:bg-sky-100"
          >
            <UserPlus className="h-4 w-4" aria-hidden="true" />
            Add Client
          </button>
          <button
            type="button"
            onClick={() => {
              setShowModal(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-[#FF6B4A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] active:scale-95"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            Create Invoice
          </button>
        </PageHeader>

        {/* ── Invoice List ── */}
        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
                {isLoading ? (
                  <>
                    <SkeletonBox className="h-6 w-32 rounded-lg" />
                    <SkeletonBox className="h-10 w-56 rounded-2xl" />
                  </>
                ) : (
                  <>
                    <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
                      <ClipboardList
                        className="h-5 w-5 text-slate-400"
                        aria-hidden="true"
                      />
                      Invoice List
                    </h2>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                        <Search className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <input
                        type="search"
                        placeholder="Search invoices..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="h-10 w-56 rounded-2xl border border-sky-100 bg-white pl-9 pr-4 text-sm text-slate-700 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[900px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                      <th className="px-6 py-3 text-left">Invoice ID</th>
                      <th className="px-4 py-3 text-left">Client</th>
                      <th className="px-4 py-3 text-left">Amount</th>
                      <th className="px-4 py-3 text-left">Total</th>
                      <th className="px-4 py-3 text-left">Date</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      Array.from({ length: 5 }).map((_, i) => (
                        <InvoiceRowSkeleton key={i} />
                      ))
                    ) : filteredInvoices.length === 0 ? (
                      <tr>
                        <td
                          colSpan={7}
                          className="py-16 text-center text-slate-400"
                        >
                          No invoices found.
                        </td>
                      </tr>
                    ) : (
                      filteredInvoices.map((inv) => {
                        return (
                          <tr
                            key={inv.id}
                            className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60"
                          >
                            <td className="px-6 py-3 font-semibold text-slate-700">
                              {inv.id}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {inv.customerId ? (
                                <Link
                                  href={`/client/${inv.customerId}`}
                                  className="text-sky-700 underline-offset-2 hover:underline"
                                >
                                  {inv.client || "N/A"}
                                </Link>
                              ) : (
                                inv.client || "N/A"
                              )}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-700">
                              {fmt(inv.subtotal)}
                            </td>
                            <td className="px-4 py-3 font-bold text-slate-900">
                              {fmt(inv.totalAmount)}
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {inv.date}
                            </td>
                            <td className="px-4 py-3">
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setOpenStatusId(
                                      openStatusId === `inv-${inv.id}` ? null : `inv-${inv.id}`,
                                    )
                                  }
                                  disabled={statusUpdatingId === inv.id}
                                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold disabled:opacity-60 ${invoiceStatusBadge[inv.status]}`}
                                >
                                  {inv.status}
                                  <ChevronDown className="h-3 w-3" />
                                </button>
                                {openStatusId === `inv-${inv.id}` && (
                                  <div
                                    ref={statusMenuRef}
                                    className="absolute left-0 top-full z-20 mt-1 w-36 rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                                  >
                                    {quickStatusOptions.map((s) => (
                                      <button
                                        key={s}
                                        type="button"
                                        onClick={() => {
                                          void handleQuickStatusChange(inv.id, s);
                                          setOpenStatusId(null);
                                        }}
                                        className={`flex w-full items-center px-3 py-1.5 text-xs hover:bg-slate-50 ${inv.status === s ? "font-semibold text-sky-600" : "text-slate-700"}`}
                                      >
                                        {s}
                                      </button>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleViewInvoice(inv.id)}
                                  title="View"
                                  className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 text-slate-400 transition hover:border-sky-300 hover:text-sky-600"
                                >
                                  <Eye className="h-4 w-4" aria-hidden="true" />
                                </button>
                                <ActionBtn
                                  title="Edit Invoice"
                                  onClick={() => handleEditInvoice(inv.id)}
                                >
                                  <Pencil
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                </ActionBtn>
                                {inv.customerId && (
                                  <ActionBtn
                                    title="Edit Client Details"
                                    onClick={() => {
                                      const linkedClient = clients.find(
                                        (c) => c.id === inv.customerId,
                                      );
                                      if (!linkedClient) return;
                                      setEditingClient(linkedClient);
                                      setShowClientModal(true);
                                    }}
                                  >
                                    <UserPlus
                                      className="h-4 w-4"
                                      aria-hidden="true"
                                    />
                                  </ActionBtn>
                                )}
                                <ActionBtn
                                  title="Delete Invoice"
                                  onClick={() => handleDeleteInvoice(inv.id)}
                                >
                                  <Trash2
                                    className="h-4 w-4"
                                    aria-hidden="true"
                                  />
                                </ActionBtn>
                                <InvoiceDownloadButton invoice={inv} />
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

      {showModal && (
        <CreateInvoiceModal
          onClose={() => {
            setShowModal(false);
          }}
          onCreateInvoice={addInvoice}
          onSaved={() => {
            setShowModal(false);
          }}
          clients={clients}
          onEditClientClick={(client) => {
            setEditingClient(client);
            setShowClientModal(true);
          }}
        />
      )}
      {showClientModal && (
        <AddClientModal
          onClose={() => {
            setShowClientModal(false);
            setEditingClient(null);
          }}
          onCreateClient={addClient}
          onUpdateClient={editClient}
          onSaved={() => {
            setShowClientModal(false);
            setEditingClient(null);
          }}
          initialClient={editingClient ?? undefined}
        />
      )}
      {selectedInvoice && (
        <InvoiceDetailSheet
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onUpdateInvoice={updateInvoice}
          clients={clients}
          onEditClientClick={(client) => {
            setEditingClient(client);
            setShowClientModal(true);
          }}
          onRecordPayment={handleRecordPayment}
          defaultMode={invoiceSheetMode}
          paymentsRefreshKey={paymentsRefreshKey}
        />
      )}
      {showRecordPayment && (
        <RecordPaymentSheet
          onClose={() => {
            setShowRecordPayment(false);
            setRecordInvoiceId(null);
          }}
          clients={clients}
          initialClientId={selectedInvoice?.customerId}
          initialInvoiceId={recordInvoiceId ?? undefined}
          onSaved={() => void handlePaymentSaved()}
        />
      )}
    </CrmShell>
  );
}
