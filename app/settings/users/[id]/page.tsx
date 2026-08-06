"use client";

import CrmShell from "@/components/layout/CrmShell";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useUserProfile } from "@/hooks/useUserManagement";
import { useAuth } from "@/lib/auth-context";
import type { UpdateUserPayload, UserWithPermissions } from "@/types";
import { ChevronLeft } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

function getRoleBadgeColor(role: UserWithPermissions["role"]) {
  if (role === "super_admin") return "bg-red-100 text-red-700";
  if (role === "admin") return "bg-blue-100 text-blue-700";
  if (role === "team_lead") return "bg-purple-100 text-purple-700";
  if (role === "new_user") return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-700";
}

export default function UserProfilePage() {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const userId = params?.id;
  const [savingTab, setSavingTab] = useState<string | null>(null);
  const [message, setMessage] = useState<MessageState>(null);
  const {
    user: profile,
    loading,
    error,
    updateUser,
  } = useUserProfile(
    userId ?? null,
    isAuthenticated && user?.role === "super_admin",
  );

  const [basicForm, setBasicForm] = useState<UpdateUserPayload>({});
  const [accountForm, setAccountForm] = useState<UpdateUserPayload>({});
  const [salaryForm, setSalaryForm] = useState<UpdateUserPayload>({});

  useEffect(() => {
    if (isAuthenticated && user?.role !== "super_admin") {
      router.push("/dashboard");
    }
  }, [isAuthenticated, user, router]);

  useEffect(() => {
    if (!profile) {
      return;
    }

    setBasicForm({
      name: profile.name,
      email: profile.email,
      phone: profile.phone || "",
      designation: profile.designation || "",
      department: profile.department || "",
      address: profile.address || "",
      city: profile.city || "",
      state: profile.state || "",
      country: profile.country || "",
      postal_code: profile.postal_code || "",
      date_of_birth: profile.date_of_birth || "",
      joining_date: profile.joining_date || "",
      emergency_contact_name: profile.emergency_contact_name || "",
      emergency_contact_phone: profile.emergency_contact_phone || "",
      notes: profile.notes || "",
    });

    setAccountForm({
      role: profile.role,
      is_active: profile.is_active,
      employee_code: profile.employee_code || "",
      tax_id: profile.tax_id || "",
    });

    setSalaryForm({
      salary_amount: profile.salary_amount ?? undefined,
      salary_currency: profile.salary_currency || "INR",
      salary_type: profile.salary_type || "monthly",
      payment_frequency: profile.payment_frequency || "Monthly",
      payment_method: profile.payment_method || "Bank Transfer",
      bank_account_name: profile.bank_account_name || "",
      bank_account_number: profile.bank_account_number || "",
      bank_name: profile.bank_name || "",
      bank_ifsc: profile.bank_ifsc || "",
      upi_id: profile.upi_id || "",
    });
  }, [profile]);

  useEffect(() => {
    if (!error) {
      return;
    }

    setMessage({
      type: "error",
      text: error,
    });
  }, [error]);

  const joinedAtText = useMemo(() => {
    if (!profile?.created_at) return "-";
    return new Date(profile.created_at).toLocaleString();
  }, [profile?.created_at]);

  const updateField = (
    setter: React.Dispatch<React.SetStateAction<UpdateUserPayload>>,
    field: keyof UpdateUserPayload,
    value: string | number | boolean | undefined,
  ) => {
    setter((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const saveTab = async (tabName: "basic" | "account" | "salary") => {
    if (!userId) return;

    const payloadMap: Record<typeof tabName, UpdateUserPayload> = {
      basic: basicForm,
      account: accountForm,
      salary: salaryForm,
    };

    const payload = payloadMap[tabName];

    try {
      setSavingTab(tabName);
      setMessage(null);
      await updateUser(payload);
      setMessage({
        type: "success",
        text: "Profile updated successfully.",
      });
    } catch (error) {
      console.error("Failed to update profile:", error);
      setMessage({
        type: "error",
        text: "Failed to update profile. Please try again.",
      });
    } finally {
      setSavingTab(null);
    }
  };

  if (!isAuthenticated || user?.role !== "super_admin") {
    return null;
  }

  return (
    <CrmShell activeNav="Users">
      <div className="relative z-10 min-h-screen flex-1 p-8">
        <div className="mx-auto max-w-7xl space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <button
                onClick={() => router.push("/settings/users")}
                className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-sky-700 hover:text-sky-800"
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                Back to staff directory
              </button>
              <h1 className="text-3xl font-bold text-slate-900">
                {profile?.name || "User Profile"}
              </h1>
              <p className="mt-1 text-slate-600">
                Detailed staff profile with account, access, salary, and payment
                details.
              </p>
            </div>

            {profile && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm shadow-sm">
                <div className="font-semibold text-slate-900">
                  {profile.email}
                </div>
                <div className="mt-1 flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${getRoleBadgeColor(
                      profile.role,
                    )}`}
                  >
                    {profile.role.replace("_", " ").toUpperCase()}
                  </span>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                      profile.is_active
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}
                  >
                    {profile.is_active ? "Active" : "Inactive"}
                  </span>
                </div>
                <div className="mt-2 text-xs text-slate-500">
                  Joined: {joinedAtText}
                </div>
              </div>
            )}
          </div>

          {message && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm font-semibold ${
                message.type === "success"
                  ? "border-green-200 bg-green-50 text-green-800"
                  : "border-red-200 bg-red-50 text-red-800"
              }`}
            >
              {message.text}
            </div>
          )}

          {loading ? (
            <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
              <div className="mb-3 text-slate-600">Loading profile...</div>
              <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-sky-600" />
            </div>
          ) : (
            <Tabs defaultValue="basic">
              <TabsList>
                <TabsTrigger value="basic">Basic User Details</TabsTrigger>
                <TabsTrigger value="account">Account & Roles</TabsTrigger>
                <TabsTrigger value="salary">Salary & Payments</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Basic Details
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">
                      Full Name
                    </span>
                    <input
                      value={String(basicForm.name || "")}
                      onChange={(e) =>
                        updateField(setBasicForm, "name", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">Email</span>
                    <input
                      type="email"
                      value={String(basicForm.email || "")}
                      onChange={(e) =>
                        updateField(setBasicForm, "email", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">Phone</span>
                    <input
                      value={String(basicForm.phone || "")}
                      onChange={(e) =>
                        updateField(setBasicForm, "phone", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">
                      Designation
                    </span>
                    <input
                      value={String(basicForm.designation || "")}
                      onChange={(e) =>
                        updateField(setBasicForm, "designation", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">
                      Department
                    </span>
                    <input
                      value={String(basicForm.department || "")}
                      onChange={(e) =>
                        updateField(setBasicForm, "department", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">
                      Date of Birth
                    </span>
                    <input
                      type="date"
                      value={String(basicForm.date_of_birth || "")}
                      onChange={(e) =>
                        updateField(
                          setBasicForm,
                          "date_of_birth",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">
                      Joining Date
                    </span>
                    <input
                      type="date"
                      value={String(basicForm.joining_date || "")}
                      onChange={(e) =>
                        updateField(
                          setBasicForm,
                          "joining_date",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">
                      Emergency Contact Name
                    </span>
                    <input
                      value={String(basicForm.emergency_contact_name || "")}
                      onChange={(e) =>
                        updateField(
                          setBasicForm,
                          "emergency_contact_name",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">
                      Emergency Contact Phone
                    </span>
                    <input
                      value={String(basicForm.emergency_contact_phone || "")}
                      onChange={(e) =>
                        updateField(
                          setBasicForm,
                          "emergency_contact_phone",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm md:col-span-2">
                    <span className="font-medium text-slate-700">Address</span>
                    <textarea
                      value={String(basicForm.address || "")}
                      onChange={(e) =>
                        updateField(setBasicForm, "address", e.target.value)
                      }
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">City</span>
                    <input
                      value={String(basicForm.city || "")}
                      onChange={(e) =>
                        updateField(setBasicForm, "city", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">State</span>
                    <input
                      value={String(basicForm.state || "")}
                      onChange={(e) =>
                        updateField(setBasicForm, "state", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">Country</span>
                    <input
                      value={String(basicForm.country || "")}
                      onChange={(e) =>
                        updateField(setBasicForm, "country", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">
                      Postal Code
                    </span>
                    <input
                      value={String(basicForm.postal_code || "")}
                      onChange={(e) =>
                        updateField(setBasicForm, "postal_code", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                  <label className="space-y-1 text-sm md:col-span-2">
                    <span className="font-medium text-slate-700">Notes</span>
                    <textarea
                      value={String(basicForm.notes || "")}
                      onChange={(e) =>
                        updateField(setBasicForm, "notes", e.target.value)
                      }
                      rows={3}
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => saveTab("basic")}
                    disabled={savingTab === "basic"}
                    className="rounded-lg bg-[#FF6B4A] px-4 py-2 font-semibold text-white transition hover:bg-[#e55a39] disabled:opacity-50"
                  >
                    {savingTab === "basic" ? "Saving..." : "Save Basic Details"}
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="account" className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Account and Role Settings
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">Role</span>
                    <select
                      value={String(accountForm.role || "employee")}
                      onChange={(e) =>
                        updateField(setAccountForm, "role", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      <option value="new_user">New User</option>
                      <option value="employee">Employee</option>
                      <option value="team_lead">Team Lead</option>
                      <option value="admin">Admin</option>
                      <option value="super_admin">Super Admin</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">
                      Employee Code
                    </span>
                    <input
                      value={String(accountForm.employee_code || "")}
                      onChange={(e) =>
                        updateField(
                          setAccountForm,
                          "employee_code",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">
                      Tax ID / PAN
                    </span>
                    <input
                      value={String(accountForm.tax_id || "")}
                      onChange={(e) =>
                        updateField(setAccountForm, "tax_id", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">Status</span>
                    <select
                      value={accountForm.is_active ? "active" : "inactive"}
                      onChange={(e) =>
                        updateField(
                          setAccountForm,
                          "is_active",
                          e.target.value === "active",
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => saveTab("account")}
                    disabled={savingTab === "account"}
                    className="rounded-lg bg-[#FF6B4A] px-4 py-2 font-semibold text-white transition hover:bg-[#e55a39] disabled:opacity-50"
                  >
                    {savingTab === "account"
                      ? "Saving..."
                      : "Save Account & Roles"}
                  </button>
                </div>
              </TabsContent>

              <TabsContent value="salary" className="space-y-4">
                <h2 className="text-lg font-semibold text-slate-900">
                  Salary and Payment Details
                </h2>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">
                      Salary Amount
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={salaryForm.salary_amount ?? ""}
                      onChange={(e) =>
                        updateField(
                          setSalaryForm,
                          "salary_amount",
                          e.target.value ? Number(e.target.value) : undefined,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">Currency</span>
                    <input
                      value={String(salaryForm.salary_currency || "INR")}
                      onChange={(e) =>
                        updateField(
                          setSalaryForm,
                          "salary_currency",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">
                      Salary Type
                    </span>
                    <select
                      value={String(salaryForm.salary_type || "monthly")}
                      onChange={(e) =>
                        updateField(
                          setSalaryForm,
                          "salary_type",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    >
                      <option value="monthly">Monthly</option>
                      <option value="hourly">Hourly</option>
                      <option value="annual">Annual</option>
                      <option value="contract">Contract</option>
                    </select>
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">
                      Payment Frequency
                    </span>
                    <input
                      value={String(salaryForm.payment_frequency || "Monthly")}
                      onChange={(e) =>
                        updateField(
                          setSalaryForm,
                          "payment_frequency",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">
                      Payment Method
                    </span>
                    <input
                      value={String(salaryForm.payment_method || "")}
                      onChange={(e) =>
                        updateField(
                          setSalaryForm,
                          "payment_method",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">
                      Bank Name
                    </span>
                    <input
                      value={String(salaryForm.bank_name || "")}
                      onChange={(e) =>
                        updateField(setSalaryForm, "bank_name", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">
                      Account Name
                    </span>
                    <input
                      value={String(salaryForm.bank_account_name || "")}
                      onChange={(e) =>
                        updateField(
                          setSalaryForm,
                          "bank_account_name",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">
                      Account Number
                    </span>
                    <input
                      value={String(salaryForm.bank_account_number || "")}
                      onChange={(e) =>
                        updateField(
                          setSalaryForm,
                          "bank_account_number",
                          e.target.value,
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">IFSC</span>
                    <input
                      value={String(salaryForm.bank_ifsc || "")}
                      onChange={(e) =>
                        updateField(setSalaryForm, "bank_ifsc", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>

                  <label className="space-y-1 text-sm">
                    <span className="font-medium text-slate-700">UPI ID</span>
                    <input
                      value={String(salaryForm.upi_id || "")}
                      onChange={(e) =>
                        updateField(setSalaryForm, "upi_id", e.target.value)
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-2"
                    />
                  </label>
                </div>

                <div className="flex justify-end">
                  <button
                    onClick={() => saveTab("salary")}
                    disabled={savingTab === "salary"}
                    className="rounded-lg bg-[#FF6B4A] px-4 py-2 font-semibold text-white transition hover:bg-[#e55a39] disabled:opacity-50"
                  >
                    {savingTab === "salary"
                      ? "Saving..."
                      : "Save Salary & Payments"}
                  </button>
                </div>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </CrmShell>
  );
}
