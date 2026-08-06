"use client";

import type { Quotation } from "@/types/invoice";
import { QuotationDocument } from "@/utils/pdf/quotationPdf";
import { downloadPdf } from "@/utils/pdf/download";
import { Download } from "lucide-react";
import { useState } from "react";

interface QuotationDownloadButtonProps {
  quotation: Partial<Quotation> & {
    id: string;
    client: string;
    amount?: number;
    validUntil?: string;
    status?: string;
  };
  className?: string;
}

export function QuotationDownloadButton({
  quotation,
  className = "",
}: QuotationDownloadButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    try {
      setIsLoading(true);

      const date = quotation.date ? new Date(quotation.date) : new Date();
      const day = String(date.getDate()).padStart(2, "0");
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const year = String(date.getFullYear()).slice(-2);
      const quotationNumber = `SBS-${day}${month}${year}`;

      const doc = (
        <QuotationDocument
          data={{
            quotationNumber,
            issueDate: date.toLocaleDateString("en-IN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
            }),
            clientName: quotation.client || "Client",
            clientPhone: quotation.clientPhone,
            clientAddress: quotation.clientAddress,
            clientGST: quotation.clientGST || "",
            shippingAddress: quotation.shippingAddress,
            items: quotation.items || [],
            taxRate: quotation.gstRate || 18,
            total: quotation.totalAmount || quotation.amount || 0,
          }}
        />
      );

      await downloadPdf(doc, `${quotationNumber}.pdf`);
    } catch (error) {
      console.error("Failed to generate quotation PDF:", error);
      alert("Failed to download quotation. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleDownload}
      disabled={isLoading}
      className={`inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-3 py-2 text-sm font-medium text-purple-600 transition hover:border-purple-300 hover:bg-purple-100 disabled:opacity-50 ${className}`}
    >
      <Download className="h-4 w-4" aria-hidden="true" />
      {isLoading ? "Generating..." : "Download"}
    </button>
  );
}
