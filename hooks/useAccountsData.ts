"use client";

import { invalidateSWRPrefix, withNetworkActivity } from "@/lib/swr-client";
import { api } from "@/services/apiClient";
import useSWR, { useSWRConfig } from "swr";

export type AccountsVendorPayload = {
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  gstNumber?: string;
  address?: string;
  panNumber?: string;
  bankName?: string;
  bankAccount?: string;
  ifscCode?: string;
  paymentTerms?: number;
  notes?: string;
};

export type AccountsBillPayload = {
  vendorId: string;
  amount: number;
  billDate: string;
  dueDate?: string | null;
  category?: string;
  description?: string;
};

function agingBucket(
  dueDate: string,
): "Current" | "1-30" | "31-60" | "61-90" | "90+" {
  const days = Math.floor(
    (Date.now() - new Date(dueDate).getTime()) / 86400000,
  );
  if (days <= 0) return "Current";
  if (days <= 30) return "1-30";
  if (days <= 60) return "31-60";
  if (days <= 90) return "61-90";
  return "90+";
}

export function useAccountsData() {
  const { mutate: globalMutate } = useSWRConfig();

  const invoicesQuery = useSWR("/swr/accounts/invoices", () =>
    withNetworkActivity(() =>
      api.get<{ data?: Record<string, unknown>[] }>(
        "/api/invoices?pageSize=200",
      ),
    ),
  );
  const billsQuery = useSWR("/swr/accounts/vendor-bills", () =>
    withNetworkActivity(() =>
      api.get<{ data?: Record<string, unknown>[] }>(
        "/api/vendor-bills?pageSize=200",
      ),
    ),
  );
  const vendorsQuery = useSWR("/swr/accounts/vendors", () =>
    withNetworkActivity(() =>
      api.get<{ data?: Record<string, unknown>[] }>(
        "/api/vendors?pageSize=100",
      ),
    ),
  );

  const refresh = async () => {
    await Promise.all([
      invoicesQuery.mutate(),
      billsQuery.mutate(),
      vendorsQuery.mutate(),
    ]);
  };

  const createVendor = async (payload: AccountsVendorPayload) => {
    const result = await withNetworkActivity(() =>
      api.post<{ data?: Record<string, unknown> }>("/api/vendors", payload),
    );
    await invalidateSWRPrefix(globalMutate, "/swr/accounts");
    return result.data;
  };

  const updateVendor = async (id: string, payload: AccountsVendorPayload) => {
    const result = await withNetworkActivity(() =>
      api.patch<{ data?: Record<string, unknown> }>(
        `/api/vendors/${id}`,
        payload,
      ),
    );
    await invalidateSWRPrefix(globalMutate, "/swr/accounts");
    return result.data;
  };

  const createBill = async (payload: AccountsBillPayload) => {
    const result = await withNetworkActivity(() =>
      api.post<{ data?: Record<string, unknown> }>(
        "/api/vendor-bills",
        payload,
      ),
    );
    await invalidateSWRPrefix(globalMutate, "/swr/accounts");
    return result.data;
  };

  const markBillPaid = async (billId: string) => {
    await withNetworkActivity(() =>
      api.patch(`/api/vendor-bills/${billId}`, {
        status: "Paid",
        paymentDate: new Date().toISOString().slice(0, 10),
      }),
    );
    await invalidateSWRPrefix(globalMutate, "/swr/accounts");
  };

  const invoices = invoicesQuery.data?.data ?? [];
  const bills = billsQuery.data?.data ?? [];
  const vendorsRaw = vendorsQuery.data?.data ?? [];

  const outstanding = invoices.filter((i) =>
    ["Pending", "Sent", "Overdue", "Draft"].includes(
      (i.status as string) ?? "",
    ),
  );

  const arRecords = outstanding.map((i) => ({
    id: i.id as string,
    client: (i.client as string) ?? "—",
    totalAmount: Number(i.totalAmount ?? 0),
    date: (i.date as string) ?? "",
    dueDate: (i.dueDate as string) ?? "",
    status: (i.status as string) ?? "Pending",
    agingBucket: agingBucket((i.dueDate as string) ?? ""),
  }));

  const apRecords = bills.map((b) => {
    const vendor = (b.vendors as Record<string, unknown>) ?? {};
    return {
      id: b.id as string,
      vendorName: (vendor.name as string) ?? "—",
      vendorCompany: (vendor.company as string) ?? undefined,
      totalAmount: Number(b.total_amount ?? 0),
      billDate: (b.bill_date as string) ?? "",
      dueDate: (b.due_date as string) ?? undefined,
      status: (b.status as string) ?? "Unpaid",
      category: (b.category as string) ?? undefined,
    };
  });

  const vendors = vendorsRaw.map((v) => ({
    id: v.id as string,
    name: v.name as string,
    company: (v.company as string) ?? undefined,
    email: (v.email as string) ?? undefined,
    phone: (v.phone as string) ?? undefined,
    gstNumber: (v.gst_number as string) ?? undefined,
    paymentTerms: Number(v.payment_terms ?? 30),
  }));

  return {
    arRecords,
    apRecords,
    vendors,
    isLoading:
      invoicesQuery.isLoading ||
      invoicesQuery.isValidating ||
      billsQuery.isLoading ||
      billsQuery.isValidating ||
      vendorsQuery.isLoading ||
      vendorsQuery.isValidating,
    error:
      (invoicesQuery.error instanceof Error && invoicesQuery.error.message) ||
      (billsQuery.error instanceof Error && billsQuery.error.message) ||
      (vendorsQuery.error instanceof Error && vendorsQuery.error.message) ||
      null,
    refresh,
    createVendor,
    updateVendor,
    createBill,
    markBillPaid,
  };
}
