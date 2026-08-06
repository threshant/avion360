"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetActionButton,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useAttendance } from "@/hooks/useAttendance";
import { useAuth } from "@/lib/auth-context";
import { fetchAttendanceUsers } from "@/services/attendanceService";
import type { AttendanceUser } from "@/types/attendance";
import {
  Clock3,
  Pencil,
  RefreshCw,
  Search,
  TrendingUp,
  UserX,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`crm-skeleton ${className}`} />;
}

function KpiCardSkeleton() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <SkeletonBox className="h-4 w-28 rounded-md" />
          <SkeletonBox className="h-7 w-16 rounded-lg" />
        </div>
        <SkeletonBox className="h-14 w-14 shrink-0 rounded-full" />
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
        <SkeletonBox className="h-4 w-20 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-20 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-4 w-14 rounded-md" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-6 w-20 rounded-full" />
      </td>
      <td className="px-4 py-3">
        <SkeletonBox className="h-7 w-24 rounded-xl" />
      </td>
    </tr>
  );
}

type AttendanceStatus = "Present" | "Late" | "Absent";
type TabFilter = "All" | AttendanceStatus;

type AttendanceRecord = {
  id: number;
  employee: string;
  department: string;
  entryTime: string;
  exitTime: string;
  workingHours: string;
  status: AttendanceStatus;
};

const filterTabs: TabFilter[] = ["All", "Present", "Late", "Absent"];

const statusBadge: Record<AttendanceStatus, string> = {
  Present: "bg-green-500 text-white",
  Late: "bg-orange-500 text-white",
  Absent: "bg-red-500 text-white",
};

const statusRowBg: Record<AttendanceStatus, string> = {
  Present: "",
  Late: "bg-orange-50/40",
  Absent: "bg-red-50/40",
};

const statusDot: Record<AttendanceStatus, string> = {
  Present: "bg-green-500",
  Late: "bg-orange-500",
  Absent: "bg-red-500",
};

function KpiIcon({ icon, className }: { icon: string; className?: string }) {
  const iconMap: Record<string, LucideIcon> = {
    present: Users,
    absent: UserX,
    late: Clock3,
    hours: TrendingUp,
  };
  const Icon = iconMap[icon];
  return Icon ? (
    <Icon className={className ?? "h-7 w-7"} aria-hidden="true" />
  ) : null;
}

export default function AttendanceTabContent() {
  const [activeTab, setActiveTab] = useState<TabFilter>("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [lastSynced, setLastSynced] = useState("2 mins ago");
  const [isManualEntryOpen, setIsManualEntryOpen] = useState(false);
  const [attendanceUsers, setAttendanceUsers] = useState<AttendanceUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [manualEntryError, setManualEntryError] = useState<string | null>(null);
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [isSelfMarking, setIsSelfMarking] = useState(false);
  const [selfMarkError, setSelfMarkError] = useState<string | null>(null);
  const [selfMarkSuccess, setSelfMarkSuccess] = useState<string | null>(null);
  const { user } = useAuth();
  const todayIso = new Date().toISOString().split("T")[0];

  const {
    records,
    summary,
    loading: isLoading,
    syncing: isSyncing,
    syncFromDevice,
    addRecord,
    selfMarkAttendance,
    refetch,
  } = useAttendance({ date: todayIso, page: 1, pageSize: 500 }, todayIso);

  const [manualForm, setManualForm] = useState<{
    employeeId: string;
    date: string;
    status: "Present" | "Late" | "Absent" | "Half Day" | "On Leave";
    entryTime: string;
    exitTime: string;
    notes: string;
  }>({
    employeeId: "",
    date: todayIso,
    status: "Present",
    entryTime: "09:00",
    exitTime: "18:00",
    notes: "",
  });

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const users = await fetchAttendanceUsers();
        setAttendanceUsers(users);
      } catch (error) {
        console.error("Failed to load attendance users:", error);
      } finally {
        setLoadingUsers(false);
      }
    };

    void loadUsers();
  }, []);

  const attendanceRecords: AttendanceRecord[] = records.map((record) => ({
    id: record.id,
    employee: record.employee,
    department: record.department,
    entryTime: record.entryTime || "-",
    exitTime: record.exitTime || "-",
    workingHours: record.workingHours || "0.0h",
    status:
      record.status === "Present" ||
      record.status === "Late" ||
      record.status === "Absent"
        ? record.status
        : "Absent",
  }));

  const workingHoursAvg =
    attendanceRecords.length > 0
      ? (
          attendanceRecords.reduce((sum, row) => {
            const numeric = Number((row.workingHours || "0").replace("h", ""));
            return sum + (Number.isNaN(numeric) ? 0 : numeric);
          }, 0) / attendanceRecords.length
        ).toFixed(1)
      : "0.0";

  const kpiStats = [
    {
      label: "Present Today",
      value: String(summary?.present ?? 0),
      iconBg: "bg-green-500",
      icon: "present",
    },
    {
      label: "Absent",
      value: String(summary?.absent ?? 0),
      iconBg: "bg-red-500",
      icon: "absent",
    },
    {
      label: "Late Arrivals",
      value: String(summary?.late ?? 0),
      iconBg: "bg-orange-500",
      icon: "late",
    },
    {
      label: "Avg Working Hours",
      value: `${workingHoursAvg}h`,
      iconBg: "bg-[#FF6B4A]",
      icon: "hours",
    },
  ] as const;

  async function handleSync() {
    try {
      await syncFromDevice();
      setLastSynced("just now");
    } catch (error) {
      console.error("Attendance sync failed:", error);
    }
  }

  async function handleSelfMarkAttendance() {
    if (!user?.id) {
      setSelfMarkError("Please sign in again to self mark attendance.");
      return;
    }

    if (!("geolocation" in navigator)) {
      setSelfMarkError("Geolocation is not supported on this browser.");
      return;
    }

    try {
      setIsSelfMarking(true);
      setSelfMarkError(null);
      setSelfMarkSuccess(null);

      const position = await new Promise<GeolocationPosition>(
        (resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0,
          });
        },
      );

      const result = await selfMarkAttendance({
        latitude: position.coords.latitude,
        longitude: position.coords.longitude,
        accuracy: position.coords.accuracy,
        timestamp: new Date(position.timestamp).toISOString(),
      });

      setSelfMarkSuccess(
        result.locationMessage || "Attendance marked successfully.",
      );
      setLastSynced("just now");
      await refetch();
    } catch (error) {
      console.error("Failed to self mark attendance:", error);
      const message =
        error instanceof Error
          ? error.message
          : "Unable to mark attendance from your location.";
      setSelfMarkError(message);
    } finally {
      setIsSelfMarking(false);
    }
  }

  async function handleManualEntrySubmit() {
    if (!manualForm.employeeId) {
      setManualEntryError("Please select an employee.");
      return;
    }

    try {
      setIsSubmittingManual(true);
      setManualEntryError(null);

      await addRecord({
        employeeId: manualForm.employeeId,
        date: manualForm.date,
        status: manualForm.status,
        entryTime: manualForm.entryTime || null,
        exitTime: manualForm.exitTime || null,
        notes: manualForm.notes || undefined,
      });

      await refetch();
      setIsManualEntryOpen(false);
      setManualForm((prev) => ({
        ...prev,
        employeeId: "",
        date: todayIso,
        status: "Present",
        entryTime: "09:00",
        exitTime: "18:00",
        notes: "",
      }));
    } catch (error) {
      console.error("Failed to save manual attendance:", error);
      setManualEntryError("Failed to save attendance entry. Please try again.");
    } finally {
      setIsSubmittingManual(false);
    }
  }

  const tabCount = (tab: TabFilter) => {
    if (tab === "All") return attendanceRecords.length;
    return attendanceRecords.filter((r) => r.status === tab).length;
  };

  const filtered = attendanceRecords.filter((r) => {
    const matchesTab = activeTab === "All" || r.status === activeTab;
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !q ||
      r.employee.toLowerCase().includes(q) ||
      r.department.toLowerCase().includes(q);
    return matchesTab && matchesSearch;
  });

  const todayDate = new Date().toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="space-y-5">
      <section className="rounded-3xl border border-sky-100/90 bg-white/85 p-6 shadow-sm">
        {isLoading ? (
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <SkeletonBox className="h-9 w-9 rounded-full" />
                <SkeletonBox className="h-7 w-56 rounded-xl" />
              </div>
              <SkeletonBox className="h-4 w-64 rounded-lg" />
            </div>
            <div className="flex shrink-0 items-center gap-3">
              <SkeletonBox className="h-4 w-32 rounded-md" />
              <SkeletonBox className="h-9 w-28 rounded-xl" />
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-3 text-xl font-bold text-slate-900 md:text-2xl">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-[#FF6B4A] text-white">
                  <Clock3 className="h-5 w-5" aria-hidden="true" />
                </span>
                Attendance Management
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                Track employee attendance and working hours
              </p>
            </div>

            <div className="flex items-center gap-3">
              <span className="flex items-center gap-1.5 text-xs text-slate-400">
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
                Last synced {lastSynced}
              </span>
              <button
                type="button"
                onClick={handleSelfMarkAttendance}
                disabled={isSelfMarking}
                className="rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-60"
              >
                {isSelfMarking ? "Marking..." : "Self Mark"}
              </button>
              <button
                type="button"
                onClick={() => setIsManualEntryOpen(true)}
                className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Manual Entry
              </button>
              <button
                type="button"
                onClick={handleSync}
                disabled={isSyncing}
                className="flex items-center gap-2 rounded-xl border border-sky-300 px-4 py-2 text-sm font-semibold text-sky-600 transition hover:bg-sky-50 disabled:opacity-60"
              >
                <RefreshCw
                  className={`h-4 w-4 ${isSyncing ? "animate-spin" : ""}`}
                  aria-hidden="true"
                />
                Sync Now
              </button>
            </div>
          </div>
        )}

        <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/70 p-4 text-sm text-emerald-800">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">
                Self mark from your current location
              </p>
              <p className="mt-1 text-sm text-emerald-700">
                Your attendance will only be marked when you are within the
                configured office location radius.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-emerald-700 shadow-sm">
              {user?.name ? `Signed in as ${user.name}` : "Signed in user"}
            </span>
          </div>
          {selfMarkError ? (
            <p className="mt-3 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {selfMarkError}
            </p>
          ) : null}
          {selfMarkSuccess ? (
            <p className="mt-3 rounded-lg border border-emerald-200 bg-white/80 px-3 py-2 text-sm text-emerald-700">
              {selfMarkSuccess}
            </p>
          ) : null}
        </div>

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

      {isLoading ? (
        <div className="flex items-center gap-2 overflow-x-auto rounded-2xl border border-sky-100/90 bg-white/85 p-1.5">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonBox key={i} className="h-9 w-24 shrink-0 rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-sky-100/90 bg-white/85 p-1.5">
          {filterTabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              {tab !== "All" && (
                <span
                  className={`h-2 w-2 rounded-full ${statusDot[tab as AttendanceStatus]}`}
                />
              )}
              {tab}
              <span
                className={`text-xs ${activeTab === tab ? "text-sky-600" : "text-slate-400"}`}
              >
                ({tabCount(tab)})
              </span>
            </button>
          ))}
        </div>
      )}

      <section className="rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          {isLoading ? (
            <>
              <SkeletonBox className="h-6 w-56 rounded-lg" />
              <div className="flex items-center gap-3">
                <SkeletonBox className="h-5 w-20 rounded-full" />
                <SkeletonBox className="h-5 w-16 rounded-full" />
                <SkeletonBox className="h-5 w-20 rounded-full" />
              </div>
            </>
          ) : (
            <>
              <h2 className="text-base font-semibold text-slate-900">
                {"Today's Attendance"} - {todayDate}
              </h2>
              <div className="flex items-center gap-3 text-xs font-medium text-slate-600">
                {(["Present", "Late", "Absent"] as AttendanceStatus[]).map(
                  (s) => (
                    <span key={s} className="flex items-center gap-1.5">
                      <span
                        className={`h-2 w-2 rounded-full ${statusDot[s]}`}
                      />
                      {s}
                    </span>
                  ),
                )}
              </div>
            </>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-195 text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wide text-slate-400">
                <th className="px-6 py-3 text-left">Employee</th>
                <th className="px-4 py-3 text-left">Department</th>
                <th className="px-4 py-3 text-left">Entry Time</th>
                <th className="px-4 py-3 text-left">Exit Time</th>
                <th className="px-4 py-3 text-left">Working Hours</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-left">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-400">
                    No records found.
                  </td>
                </tr>
              ) : (
                filtered.map((record) => (
                  <tr
                    key={record.id}
                    className={`border-b border-slate-100 transition last:border-0 hover:bg-slate-50/60 ${statusRowBg[record.status]}`}
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-100 text-xs font-bold text-sky-700">
                          {record.employee
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .slice(0, 2)}
                        </span>
                        <span className="font-semibold text-slate-900">
                          {record.employee}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {record.department}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {record.entryTime}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">
                      {record.exitTime}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {record.workingHours}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center rounded-lg px-3 py-1 text-xs font-semibold ${statusBadge[record.status]}`}
                      >
                        {record.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          title="Unavailable for now"
                          className="flex h-7 w-7 cursor-not-allowed items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400 transition"
                        >
                          <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
                        </button>
                        <button
                          type="button"
                          title="Unavailable for now"
                          className="flex cursor-not-allowed items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-400 transition"
                        >
                          View
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {!isLoading && (
        <section className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border border-sky-200 bg-sky-50/60 px-6 py-5">
          <div className="flex items-center gap-4">
            <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#FF6B4A] text-white shadow-md">
              <RefreshCw className="h-6 w-6" aria-hidden="true" />
            </span>
            <div>
              <p className="text-sm font-bold text-sky-800">
                Hikvision Integration Active
              </p>
              <p className="mt-0.5 text-xs text-sky-600">
                Attendance data is automatically synced from Hikvision access
                control system every 5 minutes
              </p>
            </div>
          </div>
          <button
            type="button"
            title="Unavailable for now"
            className="shrink-0 cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-400 shadow-sm transition"
          >
            Configure
          </button>
        </section>
      )}

      <Sheet open={isManualEntryOpen} onOpenChange={setIsManualEntryOpen}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Manual Attendance Entry</SheetTitle>
            <SheetDescription>
              Add or update attendance for a user on a specific date.
            </SheetDescription>
          </SheetHeader>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Employee</span>
              <Select
                value={manualForm.employeeId}
                onValueChange={(value) =>
                  setManualForm((prev) => ({
                    ...prev,
                    employeeId: value,
                  }))
                }
                disabled={loadingUsers || isSubmittingManual}
              >
                <SelectTrigger className="rounded-lg border-slate-300">
                  <SelectValue
                    placeholder={
                      loadingUsers ? "Loading users..." : "Select employee"
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {attendanceUsers.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.name}{" "}
                      {user.department ? `- ${user.department}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Date</span>
              <input
                type="date"
                value={manualForm.date}
                onChange={(e) =>
                  setManualForm((prev) => ({ ...prev, date: e.target.value }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                disabled={isSubmittingManual}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Status</span>
              <Select
                value={manualForm.status}
                onValueChange={(value) =>
                  setManualForm((prev) => ({
                    ...prev,
                    status: value as
                      | "Present"
                      | "Late"
                      | "Absent"
                      | "Half Day"
                      | "On Leave",
                  }))
                }
                disabled={isSubmittingManual}
              >
                <SelectTrigger className="rounded-lg border-slate-300">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Present">Present</SelectItem>
                  <SelectItem value="Late">Late</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                  <SelectItem value="Half Day">Half Day</SelectItem>
                  <SelectItem value="On Leave">On Leave</SelectItem>
                </SelectContent>
              </Select>
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Entry Time</span>
              <input
                type="time"
                value={manualForm.entryTime}
                onChange={(e) =>
                  setManualForm((prev) => ({
                    ...prev,
                    entryTime: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                disabled={isSubmittingManual}
              />
            </label>

            <label className="space-y-1 text-sm">
              <span className="font-medium text-slate-700">Exit Time</span>
              <input
                type="time"
                value={manualForm.exitTime}
                onChange={(e) =>
                  setManualForm((prev) => ({
                    ...prev,
                    exitTime: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                disabled={isSubmittingManual}
              />
            </label>

            <label className="space-y-1 text-sm md:col-span-2">
              <span className="font-medium text-slate-700">Notes</span>
              <textarea
                rows={3}
                value={manualForm.notes}
                onChange={(e) =>
                  setManualForm((prev) => ({
                    ...prev,
                    notes: e.target.value,
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2"
                disabled={isSubmittingManual}
              />
            </label>
          </div>

          {manualEntryError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {manualEntryError}
            </div>
          )}

          <SheetFooter>
            <SheetActionButton
              onClick={() => setIsManualEntryOpen(false)}
              disabled={isSubmittingManual}
            >
              Cancel
            </SheetActionButton>
            <SheetActionButton
              variant="primary"
              onClick={handleManualEntrySubmit}
              disabled={isSubmittingManual}
            >
              {isSubmittingManual ? "Saving..." : "Save Entry"}
            </SheetActionButton>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
