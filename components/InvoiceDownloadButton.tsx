"use client";

import type { Invoice } from "@/types/invoice";
import { InvoiceDocument } from "@/utils/pdf/invoicePdf";
import { downloadPdf } from "@/utils/pdf/download";
import { Download } from "lucide-react";
import { useState } from "react";

interface InvoiceDownloadButtonProps {
  invoice: Invoice & { client?: string };
  className?: string;
}

export function InvoiceDownloadButton({
  invoice,
  className = "",
}: InvoiceDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsLoading(true);

      const doc = (
        <InvoiceDocument
          data={{
            invoiceNumber: invoice.id,
            issueDate: new Date(invoice.date).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }),
            clientName: invoice.client || invoice.customerId || "Client",
            clientPhone: invoice.clientPhone,
            clientEmail: invoice.clientEmail,
            clientAddress: invoice.clientAddress,
            clientGST: invoice.clientGST,
            shippingAddress: invoice.shippingAddress,
            items: invoice.items.map((it) => ({ ...it, hsnCode: it.hsnCode })),
            subtotal: invoice.subtotal,
            tax: invoice.gstAmount,
            taxRate: invoice.gstRate,
            discountPercentage: invoice.discountPercentage,
            discountAmount: invoice.discountAmount,
            total: invoice.totalAmount,
            notes: invoice.notes,
            taxType: invoice.taxType ?? "CGST_SGST",
            currency: invoice.currency ?? "INR",
            signatoryName: invoice.signatoryName,
          }}
        />
      );

      await downloadPdf(doc, `${invoice.id}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      alert("Failed to download invoice. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm font-medium text-sky-600 transition hover:border-sky-300 hover:bg-sky-100 disabled:opacity-50 ${className}`}
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      {isLoading ? "Generating..." : "Download"}
    </button>
  );
}
