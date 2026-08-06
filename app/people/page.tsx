"use client";

import CrmShell from "@/components/layout/CrmShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreateUserModal } from "@/components/users/CreateUserModal";
import {
  useAccountsData,
  type AccountsVendorPayload,
} from "@/hooks/useAccountsData";
import { useCustomersPageData } from "@/hooks/useCustomersPageData";
import { useUsers } from "@/hooks/useUserManagement";
import { useAuth } from "@/lib/auth-context";
import type { Client } from "@/types/client";
import type { UserWithPermissions } from "@/types/userManagement";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import Link from "next/link";
import { useMemo, useState } from "react";

type PeopleTab = "customers" | "vendors" | "users";

type PageFeedback = {
  type: "success" | "error";
  text: string;
};

function AddCustomerModal({
  onClose,
  onSubmit,
  initialCustomer,
  title = "Add Customer",
  subtitle = "Save customer details for future deals and invoices.",
  submitLabel = "Save Customer",
}: {
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    address?: string;
    gstNumber?: string;
  }) => Promise<void>;
  initialCustomer?: {
    name?: string;
    email?: string;
    phone?: string;
    company?: string;
    address?: string;
    gstNumber?: string;
  };
  title?: string;
  subtitle?: string;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initialCustomer?.name ?? "");
  const [email, setEmail] = useState(initialCustomer?.email ?? "");
  const [phone, setPhone] = useState(initialCustomer?.phone ?? "");
  const [company, setCompany] = useState(initialCustomer?.company ?? "");
  const [address, setAddress] = useState(initialCustomer?.address ?? "");
  const [gstNumber, setGstNumber] = useState(initialCustomer?.gstNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Customer name is required.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        email: email || undefined,
        phone: phone || undefined,
        company: company || undefined,
        address: address || undefined,
        gstNumber: gstNumber || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save customer");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">
              {error}
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Full Name *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="Customer name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Company
              </label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="Company"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                GST Number
              </label>
              <input
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="GST number"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Phone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="+91 9999999999"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Address
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="Address"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-[#FF6B4A] py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] disabled:opacity-60"
            >
              {saving ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function AddVendorModal({
  onClose,
  onSubmit,
  initialVendor,
  title = "Add Vendor",
  subtitle = "Save vendor details for payables.",
  submitLabel = "Save Vendor",
}: {
  onClose: () => void;
  onSubmit: (payload: AccountsVendorPayload) => Promise<void>;
  initialVendor?: AccountsVendorPayload;
  title?: string;
  subtitle?: string;
  submitLabel?: string;
}) {
  const [name, setName] = useState(initialVendor?.name ?? "");
  const [company, setCompany] = useState(initialVendor?.company ?? "");
  const [email, setEmail] = useState(initialVendor?.email ?? "");
  const [phone, setPhone] = useState(initialVendor?.phone ?? "");
  const [gstNumber, setGstNumber] = useState(initialVendor?.gstNumber ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Vendor name is required.");
      return;
    }

    setError("");
    setSaving(true);
    try {
      await onSubmit({
        name: name.trim(),
        company: company || undefined,
        email: email || undefined,
        phone: phone || undefined,
        gstNumber: gstNumber || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save vendor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Sheet open onOpenChange={onClose}>
      <SheetContent side="right" className="overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          <SheetDescription>{subtitle}</SheetDescription>
        </SheetHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <p className="rounded-xl bg-rose-50 px-4 py-2 text-sm text-rose-600">
              {error}
            </p>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Vendor Name *
              </label>
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="Vendor name"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Company
              </label>
              <input
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="Company"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                GST Number
              </label>
              <input
                value={gstNumber}
                onChange={(e) => setGstNumber(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="GST number"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="email@example.com"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold text-slate-500">
                Phone
              </label>
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-100"
                placeholder="+91 9999999999"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 rounded-xl bg-[#FF6B4A] py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[#e55a39] disabled:opacity-60"
            >
              {saving ? "Saving..." : submitLabel}
            </button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}

function roleBadgeClass(role: UserWithPermissions["role"]) {
  switch (role) {
    case "super_admin":
      return "bg-violet-50 text-violet-700 border-violet-200";
    case "admin":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "team_lead":
      return "bg-amber-50 text-amber-700 border-amber-200";
    case "employee":
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    default:
      return "bg-slate-100 text-slate-700 border-slate-200";
  }
}

export default function PeoplePage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<PeopleTab>("customers");
  const [feedback, setFeedback] = useState<PageFeedback | null>(null);

  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddVendorOpen, setIsAddVendorOpen] = useState(false);
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false);
  const [customerToEdit, setCustomerToEdit] = useState<Client | null>(null);
  const [vendorToEdit, setVendorToEdit] = useState<
    (AccountsVendorPayload & { id: string; paymentTerms?: number }) | null
  >(null);

  const [customersSearch, setCustomersSearch] = useState("");
  const customersQuery = useCustomersPageData(customersSearch, 1, 20);

  const accountsQuery = useAccountsData();

  const [usersSearch, setUsersSearch] = useState("");

  const isSuperAdmin = user?.role === "super_admin";
  const usersQuery = useUsers(1, 100, isSuperAdmin);
  const users = usersQuery.users;
  const usersLoading = usersQuery.loading;
  const usersError = usersQuery.error;

  const handleCreateCustomer = async (payload: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    address?: string;
    gstNumber?: string;
  }) => {
    await customersQuery.createClientRecord(payload);
    await customersQuery.refresh();
    setFeedback({ type: "success", text: "Customer added successfully." });
  };

  const handleUpdateCustomer = async (payload: {
    name: string;
    email?: string;
    phone?: string;
    company?: string;
    address?: string;
    gstNumber?: string;
  }) => {
    if (!customerToEdit) return;
    await customersQuery.updateClientRecord(customerToEdit.id, payload);
    await customersQuery.refresh();
    setFeedback({ type: "success", text: "Customer updated successfully." });
  };

  const handleCreateVendor = async (payload: AccountsVendorPayload) => {
    await accountsQuery.createVendor(payload);
    await accountsQuery.refresh();
    setFeedback({ type: "success", text: "Vendor added successfully." });
  };

  const handleUpdateVendor = async (payload: AccountsVendorPayload) => {
    if (!vendorToEdit) return;
    await accountsQuery.updateVendor(vendorToEdit.id, payload);
    await accountsQuery.refresh();
    setFeedback({ type: "success", text: "Vendor updated successfully." });
  };

  const handleUserCreated = async () => {
    await usersQuery.refetch();
    setFeedback({ type: "success", text: "User created successfully." });
  };

  const filteredUsers = useMemo(() => {
    const query = usersSearch.trim().toLowerCase();
    if (!query) return users;
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(query) ||
        u.email.toLowerCase().includes(query) ||
        u.role.toLowerCase().includes(query),
    );
  }, [users, usersSearch]);

  function openCustomerEdit(client: Client) {
    setCustomerToEdit(client);
    setIsAddCustomerOpen(true);
  }

  function openVendorEdit(
    vendor: AccountsVendorPayload & { id: string; paymentTerms?: number },
  ) {
    setVendorToEdit(vendor);
    setIsAddVendorOpen(true);
  }

  return (
    <CrmShell activeNav="Vendors">
      <div className="relative z-10 min-h-screen flex-1 p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold text-slate-900">People</h1>
            <p className="text-slate-600">
              Manage users, customers, and vendors from one unified workspace.
            </p>
          </div>

          {feedback && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm font-semibold ${
                feedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {feedback.text}
            </div>
          )}

          <Tabs
            value={tab}
            onValueChange={(value) => setTab(value as PeopleTab)}
            className="w-full"
          >
            <TabsList className="w-full justify-start gap-1 overflow-x-auto sm:w-auto">
              <TabsTrigger value="customers">Customers</TabsTrigger>
              <TabsTrigger value="vendors">Vendors</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
            </TabsList>

            <TabsContent value="customers" className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">
                    Customers
                  </h2>
                  <p className="text-sm text-slate-500">
                    Active customer records and key account information.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  <input
                    value={customersSearch}
                    onChange={(e) => setCustomersSearch(e.target.value)}
                    placeholder="Search customers..."
                    className="h-10 w-full rounded-xl border border-slate-300 px-3.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 sm:w-72"
                  />
                  <button
                    type="button"
                    onClick={() => setIsAddCustomerOpen(true)}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-[#FF6B4A] px-4 text-sm font-semibold text-white transition hover:bg-[#e55a39]"
                  >
                    Add Customer
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Total Customers</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {customersQuery.totalClientsCount}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Loaded This Page</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {customersQuery.clients.length}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Open Invoices (sample)
                  </p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {customersQuery.invoices.length}
                  </p>
                </div>
              </div>

              {customersQuery.error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {customersQuery.error}
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Company</th>
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="px-4 py-3 font-semibold">Phone</th>
                        <th className="px-4 py-3 font-semibold">GST</th>
                        <th className="px-4 py-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {customersQuery.isLoading ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            Loading customers...
                          </td>
                        </tr>
                      ) : customersQuery.clients.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            No customers found.
                          </td>
                        </tr>
                      ) : (
                        customersQuery.clients.map((client) => (
                          <tr
                            key={client.id}
                            className="border-t border-slate-100"
                          >
                            <td className="px-4 py-3 font-medium text-slate-900">
                              <Link
                                href={`/client/${encodeURIComponent(client.id)}`}
                                className="text-sky-700 underline-offset-2 hover:underline"
                              >
                                {client.name}
                              </Link>
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {client.company || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {client.email || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {client.phone || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {client.gstNumber || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              <button
                                type="button"
                                onClick={() => openCustomerEdit(client)}
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                              >
                                Edit Details
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="vendors" className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Vendors</h2>
                  <p className="text-sm text-slate-500">
                    Vendor directory used for bills, payouts, and AP tracking.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddVendorOpen(true)}
                  className="inline-flex h-10 items-center justify-center rounded-xl bg-[#FF6B4A] px-4 text-sm font-semibold text-white transition hover:bg-[#e55a39]"
                >
                  Add Vendor
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Total Vendors</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {accountsQuery.vendors.length}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Bills Tracked</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {accountsQuery.apRecords.length}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Open AR Records</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900">
                    {accountsQuery.arRecords.length}
                  </p>
                </div>
              </div>

              {accountsQuery.error && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {accountsQuery.error}
                </div>
              )}

              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Name</th>
                        <th className="px-4 py-3 font-semibold">Company</th>
                        <th className="px-4 py-3 font-semibold">Email</th>
                        <th className="px-4 py-3 font-semibold">Phone</th>
                        <th className="px-4 py-3 font-semibold">Terms</th>
                        <th className="px-4 py-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {accountsQuery.isLoading ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            Loading vendors...
                          </td>
                        </tr>
                      ) : accountsQuery.vendors.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-10 text-center text-slate-500"
                          >
                            No vendors found.
                          </td>
                        </tr>
                      ) : (
                        accountsQuery.vendors.map((vendor) => (
                          <tr
                            key={vendor.id}
                            className="border-t border-slate-100"
                          >
                            <td className="px-4 py-3 font-medium text-slate-900">
                              {vendor.name}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {vendor.company || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {vendor.email || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {vendor.phone || "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {vendor.paymentTerms
                                ? `${vendor.paymentTerms} days`
                                : "-"}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              <button
                                type="button"
                                onClick={() =>
                                  openVendorEdit({
                                    id: vendor.id,
                                    name: vendor.name,
                                    company: vendor.company,
                                    email: vendor.email,
                                    phone: vendor.phone,
                                    gstNumber: vendor.gstNumber,
                                    paymentTerms: vendor.paymentTerms,
                                  })
                                }
                                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                              >
                                Edit Details
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Users</h2>
                  <p className="text-sm text-slate-500">
                    Internal user accounts and role visibility.
                  </p>
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:items-center">
                  {isSuperAdmin && (
                    <>
                      <input
                        value={usersSearch}
                        onChange={(e) => setUsersSearch(e.target.value)}
                        placeholder="Search users..."
                        className="h-10 w-full rounded-xl border border-slate-300 px-3.5 text-sm outline-none transition focus:border-sky-400 focus:ring-2 focus:ring-sky-100 sm:w-72"
                      />
                      <button
                        type="button"
                        onClick={() => setIsCreateUserModalOpen(true)}
                    className="inline-flex h-10 items-center justify-center rounded-xl bg-[#FF6B4A] px-4 text-sm font-semibold text-white transition hover:bg-[#e55a39]"
                      >
                        Add User
                      </button>
                    </>
                  )}
                </div>
              </div>

              {!isSuperAdmin ? (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-700">
                  Only super admins can view user management data.
                </div>
              ) : usersError ? (
                <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
                  {usersError}
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Total Users</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {users.length}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Active Users</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {users.filter((u) => u.is_active).length}
                      </p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <p className="text-sm text-slate-500">Admins</p>
                      <p className="mt-1 text-2xl font-bold text-slate-900">
                        {
                          users.filter((u) =>
                            ["admin", "super_admin"].includes(u.role),
                          ).length
                        }
                      </p>
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-slate-200">
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-left text-sm">
                        <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                          <tr>
                            <th className="px-4 py-3 font-semibold">Name</th>
                            <th className="px-4 py-3 font-semibold">Email</th>
                            <th className="px-4 py-3 font-semibold">
                              Employee ID
                            </th>
                            <th className="px-4 py-3 font-semibold">Role</th>
                            <th className="px-4 py-3 font-semibold">Status</th>
                            <th className="px-4 py-3 font-semibold">Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {usersLoading ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-4 py-10 text-center text-slate-500"
                              >
                                Loading users...
                              </td>
                            </tr>
                          ) : filteredUsers.length === 0 ? (
                            <tr>
                              <td
                                colSpan={6}
                                className="px-4 py-10 text-center text-slate-500"
                              >
                                No users found.
                              </td>
                            </tr>
                          ) : (
                            filteredUsers.map((person) => (
                              <tr
                                key={person.id}
                                className="border-t border-slate-100"
                              >
                                <td className="px-4 py-3 font-medium text-slate-900">
                                  {person.name}
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {person.email}
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {person.employee_code || "-"}
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  <span
                                    className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${roleBadgeClass(person.role)}`}
                                  >
                                    {person.role.replace("_", " ")}
                                  </span>
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  {person.is_active ? "Active" : "Inactive"}
                                </td>
                                <td className="px-4 py-3 text-slate-700">
                                  <Link
                                    href={`/settings/users/${encodeURIComponent(person.id)}`}
                                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-sky-300 hover:text-sky-700"
                                  >
                                    Edit Details
                                  </Link>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>

          {isAddCustomerOpen && (
            <AddCustomerModal
              onClose={() => {
                setIsAddCustomerOpen(false);
                setCustomerToEdit(null);
              }}
              initialCustomer={customerToEdit ?? undefined}
              title={customerToEdit ? "Edit Customer" : "Add Customer"}
              subtitle={
                customerToEdit
                  ? "Update customer details and contact information."
                  : "Save customer details for future deals and invoices."
              }
              submitLabel={customerToEdit ? "Save Changes" : "Save Customer"}
              onSubmit={async (payload) => {
                try {
                  if (customerToEdit) {
                    await handleUpdateCustomer(payload);
                  } else {
                    await handleCreateCustomer(payload);
                  }
                } catch (error) {
                  setFeedback({
                    type: "error",
                    text:
                      error instanceof Error
                        ? error.message
                        : customerToEdit
                          ? "Failed to update customer."
                          : "Failed to add customer.",
                  });
                  throw error;
                }
              }}
            />
          )}

          {isAddVendorOpen && (
            <AddVendorModal
              onClose={() => {
                setIsAddVendorOpen(false);
                setVendorToEdit(null);
              }}
              initialVendor={vendorToEdit ?? undefined}
              title={vendorToEdit ? "Edit Vendor" : "Add Vendor"}
              subtitle={
                vendorToEdit
                  ? "Update vendor profile and payment details."
                  : "Save vendor details for payables."
              }
              submitLabel={vendorToEdit ? "Save Changes" : "Save Vendor"}
              onSubmit={async (payload) => {
                try {
                  if (vendorToEdit) {
                    await handleUpdateVendor(payload);
                  } else {
                    await handleCreateVendor(payload);
                  }
                } catch (error) {
                  setFeedback({
                    type: "error",
                    text:
                      error instanceof Error
                        ? error.message
                        : vendorToEdit
                          ? "Failed to update vendor."
                          : "Failed to add vendor.",
                  });
                  throw error;
                }
              }}
            />
          )}

          <CreateUserModal
            isOpen={isCreateUserModalOpen}
            onClose={() => setIsCreateUserModalOpen(false)}
            onCreateUser={usersQuery.createUser}
            onUserCreated={handleUserCreated}
          />
        </div>
      </div>
    </CrmShell>
  );
}
