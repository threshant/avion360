"use client";

import type { ProformaInvoice } from "@/types/invoice";
import { InvoiceDocument } from "@/utils/pdf/invoicePdf";
import { downloadPdf } from "@/utils/pdf/download";
import { Download } from "lucide-react";
import { useState } from "react";

interface ProformaDownloadButtonProps {
  proforma: ProformaInvoice;
  className?: string;
}

export function ProformaDownloadButton({
  proforma,
  className = "",
}: ProformaDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsLoading(true);

      const doc = (
        <InvoiceDocument
          data={{
            invoiceNumber: proforma.id,
            invoiceNumberLabel: "Purchase Order No:",
            issueDateLabel: "Proforma Date",
            documentTitle: "Proforma Invoice",
            issueDate: new Date(proforma.date).toLocaleDateString("en-IN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }),
            dueDate: proforma.dueDate
              ? new Date(proforma.dueDate).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "2-digit",
                  day: "2-digit",
                })
              : undefined,
            clientName: proforma.client || proforma.customerId || "Client",
            clientPhone: proforma.clientPhone,
            clientEmail: proforma.clientEmail,
            clientAddress: proforma.clientAddress,
            clientGST: proforma.clientGST,
            shippingAddress: proforma.shippingAddress,
            items: proforma.items.map((it) => ({ ...it, hsnCode: it.hsnCode })),
            subtotal: proforma.subtotal,
            tax: proforma.gstAmount,
            taxRate: proforma.gstRate,
            discountPercentage: proforma.discountPercentage,
            discountAmount: proforma.discountAmount,
            total: proforma.totalAmount,
            notes: proforma.notes,
          }}
        />
      );

      await downloadPdf(doc, `${proforma.id}.pdf`);
    } catch (error) {
      console.error("Failed to generate proforma PDF:", error);
      alert("Failed to download proforma invoice. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 rounded-lg border border-cyan-200 bg-cyan-50 px-3 py-2 text-sm font-medium text-cyan-700 transition hover:border-cyan-300 hover:bg-cyan-100 disabled:opacity-50 ${className}`}
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      {isLoading ? "Generating..." : "Download"}
    </button>
  );
}
