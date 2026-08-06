"use client";

import { usePayroll } from "@/hooks/usePayroll";
import { fmtCompactCurrency } from "@/utils/formatting";
import {
  ArrowRight,
  ChevronDown,
  CircleDollarSign,
  Download,
  FileText,
  Search,
  TrendingDown,
  TrendingUp,
  Upload,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { PayslipModal, type PayslipData } from "../payroll/payslip-modal";

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`crm-skeleton ${className}`} />;
}

function KpiCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <SkeletonBox className="h-4 w-32 rounded-md" />
          <SkeletonBox className="h-8 w-24 rounded-lg" />
        </div>
        <SkeletonBox className="h-14 w-14 shrink-0 rounded-full" />
      </div>
    </div>
  );
}

function PayrollBreakdownSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <SkeletonBox className="mb-5 h-5 w-40 rounded-lg" />
      <div className="space-y-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between">
            <SkeletonBox className="h-4 w-36 rounded-md" />
            <SkeletonBox className="h-4 w-24 rounded-md" />
          </div>
        ))}
        <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
          <SkeletonBox className="h-5 w-28 rounded-md" />
          <SkeletonBox className="h-6 w-28 rounded-md" />
        </div>
      </div>
    </div>
  );
}

function DeptCostSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <SkeletonBox className="mb-5 h-5 w-44 rounded-lg" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex items-center justify-between rounded-xl p-3"
          >
            <div className="space-y-1.5">
              <SkeletonBox className="h-4 w-20 rounded-md" />
              <SkeletonBox className="h-3 w-16 rounded-md" />
            </div>
            <SkeletonBox className="h-5 w-20 rounded-md" />
          </div>
        ))}
      </div>
    </div>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100">
      <td className="px-6 py-3">
        <SkeletonBox className="h-4 w-36 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-24 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-10 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-20 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-16 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-16 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-16 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-20 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-8 w-24 rounded-xl" />
      </td>
    </tr>
  );
}

const months = [
  "January 2026",
  "February 2026",
  "March 2026",
  "April 2026",
  "May 2026",
  "June 2026",
  "July 2026",
  "August 2026",
  "September 2026",
  "October 2026",
  "November 2026",
  "December 2026",
];

function fmt(n: number) {
  return fmtCompactCurrency(n);
}

function monthLabelToKey(label: string): string {
  const [monthName, yearStr] = label.split(" ");
  const year = Number(yearStr);
  const monthIndex = new Date(`${monthName} 1, ${year}`).getMonth() + 1;
  return `${year}-${String(monthIndex).padStart(2, "0")}`;
}

function KpiIcon({ icon, className }: { icon: string; className?: string }) {
  const iconMap: Record<string, LucideIcon> = {
    salary: CircleDollarSign,
    overtime: TrendingUp,
    deductions: TrendingDown,
    net: Wallet,
  };
  const Icon = iconMap[icon];
  return Icon ? (
    <Icon className={className ?? "h-7 w-7"} aria-hidden="true" />
  ) : null;
}

export default function PayrollTabContent() {
  const [selectedMonth, setSelectedMonth] = useState("March 2026");
  const [searchQuery, setSearchQuery] = useState("");
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  const [payslipData, setPayslipData] = useState<PayslipData | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const selectedMonthKey = monthLabelToKey(selectedMonth);
  const {
    records: payrollRecords,
    loading: isLoading,
    runPayroll,
    processing,
    refetch,
  } = usePayroll({ month: selectedMonthKey }, selectedMonthKey);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowMonthDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const filtered = payrollRecords.filter((r) => {
    const q = searchQuery.toLowerCase();
    return (
      !q ||
      r.name.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q)
    );
  });

  async function handleExcelUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadLoading(true);
    setUploadMsg(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("month", selectedMonthKey);
      const res = await fetch("/api/attendance/upload-excel", {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Upload failed");
      const unmatched = json.unmatched?.length
        ? ` (${json.unmatched.length} unmatched: ${json.unmatched.join(", ")})`
        : "";
      setUploadMsg(
        `✓ Imported ${json.processed} employees for ${selectedMonthKey}.${unmatched} Re-process payroll to apply LOP deductions.`,
      );
      await refetch();
    } catch (err) {
      setUploadMsg(
        "✗ " + (err instanceof Error ? err.message : "Upload failed"),
      );
    } finally {
      setUploadLoading(false);
      if (uploadRef.current) uploadRef.current.value = "";
    }
  }

  const totalSalary = filtered.reduce((s, r) => s + r.totalEarnings, 0);
  const totalOvertime = filtered.reduce((s, r) => s + r.overtime, 0);
  const totalBonus = filtered.reduce((s, r) => s + r.bonus, 0);
  const totalDeductions = filtered.reduce((s, r) => s + r.totalDeductions, 0);
  const netExpense = filtered.reduce((s, r) => s + r.netSalary, 0);

  const deptMap = new Map<string, { count: number; total: number }>();
  for (const r of filtered) {
    const net = r.baseSalary + r.overtime + r.bonus - r.deductions;
    const prev = deptMap.get(r.department) ?? { count: 0, total: 0 };
    deptMap.set(r.department, {
      count: prev.count + 1,
      total: prev.total + net,
    });
  }
  const deptBreakdown = Array.from(deptMap.entries()).map(([dept, data]) => ({
    dept,
    ...data,
  }));

  const deptColors: Record<string, string> = {
    Sales: "bg-sky-50 border border-sky-100",
    Marketing: "bg-green-50 border border-green-100",
    Support: "bg-cyan-50 border border-cyan-100",
    HR: "bg-orange-50 border border-orange-100",
    Finance: "bg-amber-50 border border-amber-100",
    IT: "bg-violet-50 border border-violet-100",
  };

  const kpiStats = [
    {
      label: "Total Salary Payout",
      value: fmt(totalSalary),
      iconBg: "bg-[#FF6B4A]",
      icon: "salary",
    },
    {
      label: "Overtime Cost",
      value: fmt(totalOvertime),
      iconBg: "bg-green-500",
      icon: "overtime",
    },
    {
      label: "Total Deductions",
      value: fmt(totalDeductions),
      iconBg: "bg-orange-500",
      icon: "deductions",
    },
    {
      label: "Net Expense",
      value: fmt(netExpense),
      iconBg: "bg-cyan-500",
      icon: "net",
    },
  ];

  return (
    <>
      <div className="space-y-5">
        <section className="rounded-3xl border border-sky-100/90 bg-white/85 p-6 shadow-sm">
          {isLoading ? (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <SkeletonBox className="h-9 w-9 rounded-full" />
                  <SkeletonBox className="h-7 w-56 rounded-xl" />
                </div>
                <SkeletonBox className="h-4 w-60 rounded-lg" />
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <SkeletonBox className="h-10 w-40 rounded-xl" />
                <SkeletonBox className="h-10 w-32 rounded-xl" />
                <SkeletonBox className="h-10 w-36 rounded-xl" />
              </div>
            </div>
          ) : (
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <h1 className="flex items-center gap-3 text-xl font-bold text-slate-900 md:text-2xl">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FF6B4A] text-white">
                    <CircleDollarSign className="h-5 w-5" aria-hidden="true" />
                  </span>
                  Payroll Management
                </h1>
                <p className="mt-1.5 text-sm text-slate-500">
                  Manage employee salaries and payroll
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="relative" ref={dropdownRef}>
                  <button
                    type="button"
                    onClick={() => setShowMonthDropdown((v) => !v)}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-sky-300"
                  >
                    {selectedMonth}
                    <ChevronDown
                      className="h-4 w-4 text-slate-400"
                      aria-hidden="true"
                    />
                  </button>
                  {showMonthDropdown && (
                    <div className="absolute right-0 top-full z-20 mt-1.5 w-44 overflow-hidden rounded-2xl border border-slate-200 bg-white py-1.5 shadow-lg">
                      {months.map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => {
                            setSelectedMonth(m);
                            setShowMonthDropdown(false);
                          }}
                          className={`w-full px-4 py-2 text-left text-sm transition hover:bg-sky-50 hover:text-sky-700 ${
                            m === selectedMonth
                              ? "font-semibold text-sky-600"
                              : "text-slate-600"
                          }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-sky-300 hover:text-sky-600">
                  <Upload className="h-4 w-4" aria-hidden="true" />
                  {uploadLoading ? "Uploading..." : "Upload Attendance"}
                  <input
                    ref={uploadRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    className="sr-only"
                    onChange={handleExcelUpload}
                    disabled={uploadLoading}
                  />
                </label>

                <button
                  type="button"
                  className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 shadow-sm transition hover:border-sky-300 hover:text-sky-600"
                >
                  <Download className="h-4 w-4" aria-hidden="true" />
                  Export Report
                </button>

                <button
                  type="button"
                  onClick={async () => {
                    try {
                      await runPayroll(selectedMonthKey);
                      await refetch();
                    } catch (error) {
                      console.error("Payroll processing failed:", error);
                    }
                  }}
                  disabled={processing}
                  className="flex items-center gap-2 rounded-xl bg-[#FF6B4A] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] active:scale-95"
                >
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  {processing ? "Processing..." : "Process Payroll"}
                </button>
              </div>
            </div>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {isLoading
              ? Array.from({ length: 4 }).map((_, i) => (
                  <KpiCardSkeleton key={i} />
                ))
              : kpiStats.map((stat) => (
                  <article
                    key={stat.label}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-sky-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500 md:text-sm">
                          {stat.label}
                        </p>
                        <p className="mt-1 text-2xl font-bold text-slate-900">
                          {stat.value}
                        </p>
                      </div>
                      <span
                        className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-white ${stat.iconBg}`}
                      >
                        <KpiIcon icon={stat.icon} className="h-7 w-7" />
                      </span>
                    </div>
                  </article>
                ))}
          </div>
        </section>

        {uploadMsg && (
          <div
            className={`rounded-2xl px-4 py-3 text-sm font-medium ${uploadMsg.startsWith("✓") ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-700 border border-red-200"}`}
          >
            {uploadMsg}
            <button
              type="button"
              onClick={() => setUploadMsg(null)}
              className="ml-3 text-xs underline opacity-70 hover:opacity-100"
            >
              dismiss
            </button>
          </div>
        )}

        {isLoading ? (
          <SkeletonBox className="h-11 w-full rounded-2xl" />
        ) : (
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
              <Search className="h-4 w-4" aria-hidden="true" />
            </span>
            <input
              type="search"
              placeholder="Search by employee name or department..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-11 w-full rounded-2xl border border-sky-100 bg-white pl-10 pr-4 text-sm text-slate-700 outline-none ring-sky-300 transition focus:border-sky-300 focus:ring-2"
            />
          </div>
        )}

        <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-100 px-6 py-4">
            {isLoading ? (
              <SkeletonBox className="h-6 w-72 rounded-lg" />
            ) : (
              <h2 className="text-base font-semibold text-slate-900">
                Employee Salary Details - {selectedMonth}
              </h2>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-225 text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  <th className="px-6 py-3 text-left">Employee</th>
                  <th className="px-4 py-3 text-left">Department</th>
                  <th className="px-4 py-3 text-left">Working Days</th>
                  <th className="px-4 py-3 text-left">Base Salary</th>
                  <th className="px-4 py-3 text-left">Overtime</th>
                  <th className="px-4 py-3 text-left">Bonus</th>
                  <th className="px-4 py-3 text-left">Deductions</th>
                  <th className="px-4 py-3 text-left">Net Salary</th>
                  <th className="px-4 py-3 text-left">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRowSkeleton key={i} />
                  ))
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      className="py-16 text-center text-slate-400"
                    >
                      No records found.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60"
                      >
                        <td className="px-6 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                              {r.name
                                .split(" ")
                                .map((n) => n[0])
                                .join("")
                                .slice(0, 2)}
                            </span>
                            <span className="font-semibold text-slate-900">
                              {r.name}
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-3 text-slate-500">
                          {r.department}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-700">
                          {r.workingDays}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-800">
                          {fmt(r.baseSalary)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-green-600">
                          {r.overtime > 0 ? `+${fmt(r.overtime)}` : "+₹0"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-green-600">
                          {r.bonus > 0 ? `+${fmt(r.bonus)}` : "+₹0"}
                        </td>
                        <td className="px-4 py-3 font-semibold text-red-500">
                          -{fmt(r.deductions)}
                        </td>
                        <td className="px-4 py-3 font-bold text-slate-900">
                          {fmt(r.netSalary)}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            type="button"
                            onClick={() =>
                              setPayslipData({
                                employeeCode: r.employeeCode,
                                name: r.name,
                                dateOfBirth: r.dateOfBirth,
                                designation: r.designation,
                                department: r.department,
                                joiningDate: r.joiningDate,
                                workingDays: r.workingDays,
                                lopDays: r.lopDays,
                                month: r.month,
                                basicSalary: r.basicSalary,
                                hra: r.hra,
                                otherAllowances: r.otherAllowances,
                                totalEarnings: r.totalEarnings,
                                professionalTax: r.professionalTax,
                                lopDeduction: r.lopDeduction,
                                otherDeductions: r.otherDeductions,
                                totalDeductions: r.totalDeductions,
                                netSalary: r.netSalary,
                              })
                            }
                            className="flex items-center gap-1.5 rounded-xl border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-sky-300 hover:text-sky-600"
                          >
                            <FileText
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            Payslip
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {!isLoading && filtered.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-slate-50/60 px-6 py-3 text-xs text-slate-500">
              <span>
                {filtered.length} employee{filtered.length !== 1 ? "s" : ""}
              </span>
              <div className="flex flex-wrap items-center gap-4">
                <span>
                  Total Base:{" "}
                  <span className="font-semibold text-slate-700">
                    {fmt(filtered.reduce((s, r) => s + r.baseSalary, 0))}
                  </span>
                </span>
                <span>
                  Total Overtime:{" "}
                  <span className="font-semibold text-green-600">
                    {fmt(filtered.reduce((s, r) => s + r.overtime, 0))}
                  </span>
                </span>
                <span>
                  Total Deductions:{" "}
                  <span className="font-semibold text-red-500">
                    {fmt(filtered.reduce((s, r) => s + r.deductions, 0))}
                  </span>
                </span>
                <span>
                  Net Payroll:{" "}
                  <span className="font-bold text-sky-600">
                    {fmt(filtered.reduce((s, r) => s + r.netSalary, 0))}
                  </span>
                </span>
              </div>
            </div>
          )}
        </section>

        <div className="grid gap-5 lg:grid-cols-2">
          {isLoading ? (
            <PayrollBreakdownSkeleton />
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-base font-semibold text-slate-900">
                Payroll Breakdown
              </h2>
              <div className="space-y-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-sky-500 font-medium">
                    Total Base Salary
                  </span>
                  <span className="font-semibold text-slate-800">
                    {fmt(totalSalary)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-green-500 font-medium">
                    Total Overtime
                  </span>
                  <span className="font-semibold text-green-600">
                    +{fmt(totalOvertime)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-green-500 font-medium">
                    Total Bonus
                  </span>
                  <span className="font-semibold text-green-600">
                    +{fmt(totalBonus)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-orange-500 font-medium">
                    Total Deductions
                  </span>
                  <span className="font-semibold text-red-500">
                    -{fmt(totalDeductions)}
                  </span>
                </div>
                <div className="border-t border-slate-100 pt-4 flex items-center justify-between">
                  <span className="text-base font-bold text-slate-900">
                    Net Payable
                  </span>
                  <span className="text-xl font-bold text-sky-600">
                    {fmt(netExpense)}
                  </span>
                </div>
              </div>
            </section>
          )}

          {isLoading ? (
            <DeptCostSkeleton />
          ) : (
            <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="mb-5 text-base font-semibold text-slate-900">
                Department Wise Cost
              </h2>
              <div className="space-y-3">
                {deptBreakdown.map(({ dept, count, total }) => (
                  <div
                    key={dept}
                    className={`flex items-center justify-between rounded-xl px-4 py-3 ${deptColors[dept] ?? "bg-slate-50 border border-slate-100"}`}
                  >
                    <div>
                      <p className="font-semibold text-slate-800 text-sm">
                        {dept}
                      </p>
                      <p className="text-xs text-slate-500">
                        {count} employee{count !== 1 ? "s" : ""}
                      </p>
                    </div>
                    <span className="font-bold text-slate-800 text-sm">
                      {fmt(total)}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>

      {payslipData && (
        <PayslipModal data={payslipData} onClose={() => setPayslipData(null)} />
      )}
    </>
  );
}
