"use client";

import { Download, X } from "lucide-react";
import { useState } from "react";
import { PayslipDocument } from "@/utils/pdf/payslipPdf";
import { downloadPdf } from "@/utils/pdf/download";

export type PayslipData = {
  employeeCode: string | null;
  name: string;
  dateOfBirth: string | null;
  designation: string;
  department: string;
  joiningDate: string | null;
  workingDays: number;
  lopDays: number;
  month: string; // YYYY-MM
  basicSalary: number;
  hra: number;
  otherAllowances: number;
  totalEarnings: number;
  professionalTax: number;
  lopDeduction: number;
  otherDeductions: number;
  totalDeductions: number;
  netSalary: number;
};

function fmt(n: number) {
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function monthLabel(ym: string) {
  const [y, m] = ym.split("-");
  const d = new Date(Number(y), Number(m) - 1, 1);
  return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function numToWords(n: number): string {
  if (n === 0) return "Zero";
  const ones = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  const tens = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  function below100(num: number): string {
    if (num < 20) return ones[num];
    return tens[Math.floor(num / 10)] + (num % 10 ? " " + ones[num % 10] : "");
  }
  function below1000(num: number): string {
    if (num < 100) return below100(num);
    return (
      ones[Math.floor(num / 100)] +
      " Hundred" +
      (num % 100 ? " " + below100(num % 100) : "")
    );
  }

  const intPart = Math.floor(n);
  const decPart = Math.round((n - intPart) * 100);
  let result = "";
  if (intPart >= 100000) {
    result += below1000(Math.floor(intPart / 100000)) + " Lakh ";
  }
  if (intPart >= 1000) {
    result += below1000(Math.floor((intPart % 100000) / 1000)) + " Thousand ";
  }
  result += below1000(intPart % 1000);
  if (decPart > 0) result += " and " + below100(decPart) + " Paise";
  return result.trim();
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function PayslipModal({
  data,
  onClose,
}: {
  data: PayslipData;
  onClose: () => void;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    try {
      setIsDownloading(true);
      const doc = <PayslipDocument data={data} />;
      await downloadPdf(doc, `Payslip_${data.name}_${data.month}.pdf`);
    } catch (error) {
      console.error("Failed to generate payslip PDF:", error);
      alert("Failed to download payslip. Please try again.");
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        {/* Modal toolbar */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-3">
          <h2 className="text-base font-bold text-slate-900">
            Payslip — {monthLabel(data.month)}
          </h2>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              disabled={isDownloading}
              className="flex items-center gap-1.5 rounded-xl bg-[#FF6B4A] px-4 py-2 text-sm font-semibold text-white hover:bg-[#e55a39] disabled:opacity-50"
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              {isDownloading ? "Generating..." : "Download PDF"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Scrollable payslip */}
        <div className="overflow-y-auto p-4">
          <div>
            <div
              className="slip font-sans text-[11px] text-black"
              style={{ width: "100%", border: "1px solid #ccc" }}
            >
              {/* Header */}
              <div className="flex items-start justify-between border-b-2 border-[#1a3a5c] px-5 py-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1a3a5c]">
                    <span className="text-2xl font-black italic text-white">
                      S
                    </span>
                  </div>
                  <div>
                    <div className="text-lg font-bold tracking-widest text-[#1a3a5c]">
                      SOURCESBIZ
                    </div>
                    <div className="text-[9px] text-gray-500">
                      Connecting Materials, Creating Value.
                    </div>
                  </div>
                </div>
                <div className="text-right text-[9px] leading-5 text-gray-700">
                  <div>No. 123, 1st Floor, XYZ Complex,</div>
                  <div>Coimbatore - 641 018, Tamil Nadu, India</div>
                  <div>+91 12345 67890</div>
                  <div>hello@sourcesbiz.com</div>
                  <div>www.sourcesbiz.com</div>
                  <div className="font-semibold">GSTIN: 33ABCDE1234F1Z5</div>
                </div>
              </div>

              {/* Title */}
              <div className="bg-[#1a3a5c] py-2 text-center text-[15px] font-bold tracking-[3px] text-white">
                — SALARY SLIP —
              </div>
              <div className="border-b border-gray-300 py-1 text-center text-[11px]">
                For the Month of{" "}
                <span className="border-b border-black px-10 font-semibold">
                  {monthLabel(data.month)}
                </span>
              </div>

              {/* Employee info grid */}
              <div className="grid grid-cols-2 border-b border-gray-300">
                {[
                  ["Employee Name", data.name],
                  ["Employee ID", data.employeeCode || "—"],
                  ["Date of Birth", formatDate(data.dateOfBirth)],
                  ["Date of Joining", formatDate(data.joiningDate)],
                  ["Designation", data.designation],
                  ["Department", data.department],
                  ["Number of Working Days", String(data.workingDays)],
                  ["LOP (Days)", String(data.lopDays)],
                ].map(([label, value]) => (
                  <div
                    key={label}
                    className="flex border-b border-gray-100 px-4 py-1.5 text-[10px]"
                  >
                    <span className="w-44 shrink-0 text-gray-600">{label}</span>
                    <span className="mr-2 text-gray-400">:</span>
                    <span className="flex-1 border-b border-gray-400">
                      {value}
                    </span>
                  </div>
                ))}
              </div>

              {/* Earnings / Deductions */}
              <div className="grid grid-cols-2 border-b border-gray-300">
                {/* Earnings */}
                <div className="border-r border-gray-300">
                  <div className="bg-[#1a3a5c] py-1.5 text-center text-[11px] font-bold tracking-widest text-white">
                    EARNINGS
                  </div>
                  <div className="flex border-b border-gray-200 bg-gray-100 text-[9px] font-semibold">
                    <div className="flex-1 px-3 py-1">Particulars</div>
                    <div className="w-24 border-l border-gray-200 px-3 py-1 text-right">
                      Amount (₹)
                    </div>
                  </div>
                  {[
                    ["Basic Salary", data.basicSalary],
                    ["HRA", data.hra],
                    ["Other Allowance", data.otherAllowances],
                  ].map(([label, val]) => (
                    <div
                      key={label as string}
                      className="flex min-h-[22px] border-b border-gray-100 text-[10px]"
                    >
                      <div className="flex-1 px-3 py-1">{label as string}</div>
                      <div className="w-24 border-l border-gray-100 px-3 py-1 text-right">
                        {(val as number) > 0 ? fmt(val as number) : "XXX"}
                      </div>
                    </div>
                  ))}
                  {/* blank filler rows */}
                  {[1, 2].map((i) => (
                    <div
                      key={i}
                      className="flex min-h-[22px] border-b border-gray-100 text-[10px]"
                    >
                      <div className="flex-1 border-b border-dashed border-gray-300 px-3 py-1 text-gray-400">
                        __________ Allowance
                      </div>
                      <div className="w-24 border-l border-gray-100 px-3 py-1 text-right text-gray-400">
                        XXX
                      </div>
                    </div>
                  ))}
                  <div className="flex border-t border-gray-300 bg-gray-50 text-[10px] font-bold">
                    <div className="flex-1 px-3 py-1.5">Total Earnings (A)</div>
                    <div className="w-24 border-l border-gray-200 px-3 py-1.5 text-right">
                      {fmt(data.totalEarnings)}
                    </div>
                  </div>
                </div>

                {/* Deductions */}
                <div>
                  <div className="bg-[#1a3a5c] py-1.5 text-center text-[11px] font-bold tracking-widest text-white">
                    DEDUCTIONS
                  </div>
                  <div className="flex border-b border-gray-200 bg-gray-100 text-[9px] font-semibold">
                    <div className="flex-1 px-3 py-1">Particulars</div>
                    <div className="w-24 border-l border-gray-200 px-3 py-1 text-right">
                      Amount (₹)
                    </div>
                  </div>
                  {[
                    ["Professional Tax", data.professionalTax],
                    ["LOP Deduction", data.lopDeduction],
                    ["Other Deductions", data.otherDeductions],
                  ].map(([label, val]) => (
                    <div
                      key={label as string}
                      className="flex min-h-[22px] border-b border-gray-100 text-[10px]"
                    >
                      <div className="flex-1 px-3 py-1">{label as string}</div>
                      <div className="w-24 border-l border-gray-100 px-3 py-1 text-right">
                        {(val as number) > 0 ? fmt(val as number) : "XXX"}
                      </div>
                    </div>
                  ))}
                  {/* blank filler rows */}
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="flex min-h-[22px] border-b border-gray-100 text-[10px]"
                    >
                      <div className="flex-1 px-3 py-1"></div>
                      <div className="w-24 border-l border-gray-100 px-3 py-1 text-right text-gray-400">
                        XXX
                      </div>
                    </div>
                  ))}
                  <div className="flex border-t border-gray-300 bg-gray-50 text-[10px] font-bold">
                    <div className="flex-1 px-3 py-1.5">
                      Total Deductions (B)
                    </div>
                    <div className="w-24 border-l border-gray-200 px-3 py-1.5 text-right">
                      {fmt(data.totalDeductions)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Net Salary */}
              <div className="flex items-center border-b border-gray-300 px-4 py-2 text-[11px]">
                <span className="min-w-[160px] font-bold">
                  NET SALARY (A – B)
                </span>
                <span className="ml-4 text-[13px] font-bold">
                  ₹ {fmt(data.netSalary)}
                </span>
              </div>
              <div className="border-b border-gray-300 px-4 py-1.5 text-[10px]">
                <span className="font-semibold">Net Salary in Words: </span>
                Rupees {numToWords(Math.floor(data.netSalary))} Only
              </div>

              {/* Footer */}
              <div className="flex items-end justify-between px-4 py-3 text-[10px]">
                <div>
                  <div>Date: ___________</div>
                  <div className="mt-1">Place: Coimbatore</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">For SourcersBiz</div>
                  <div className="my-3 h-8 w-36 border-b border-black ml-auto"></div>
                  <div>Authorized Signatory</div>
                </div>
              </div>

              <div className="border-t border-gray-200 px-4 py-1.5 text-center text-[8px] text-gray-500">
                This is a computer generated payslip and does not require a
                physical signature.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
