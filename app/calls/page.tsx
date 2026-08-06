"use client";

import ConvertToLeadModal from "@/components/ConvertToLeadModal";
import PageHeader from "@/components/PageHeader";
import CrmShell from "@/components/layout/CrmShell";
import { useTelecmiCallInsights } from "@/hooks/useTelecmiCallInsights";
import { formatCallDateTime, formatDurationSeconds } from "@/lib/telecmi";
import { fetchTelecmiBrowserUser } from "@/services/callService";
import type { CallDirection, TelecmiCallInsightsView } from "@/types/call";
import {
  ArrowLeftRight,
  ChevronsLeft,
  ChevronsRight,
  Clock3,
  MessageSquare,
  MoreVertical,
  Phone,
  PhoneCall,
  PhoneMissed,
  Play,
  Plus,
  UserPlus,
  X,
  type LucideIcon,
} from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type PiopiyEventPayload = {
  code?: number;
  msg?: string;
  [key: string]: unknown;
};

type PiopiyClient = {
  login: (userId: string, password: string, sbcUri: string) => void;
  call: (phone: string, extraParams?: Record<string, string>) => void;
  on: (event: string, handler: (payload: PiopiyEventPayload) => void) => void;
  logout?: () => void;
};

type PiopiyConstructor = new (options: {
  name: string;
  debug: boolean;
  autoplay: boolean;
  ringTime: number;
}) => PiopiyClient;

const CALL_DISABLED_MESSAGE =
  "Call functionality is disabled for your login contact admin for further details.";

function SkeletonBox({ className = "" }: { className?: string }) {
  return <div aria-hidden="true" className={`crm-skeleton ${className}`} />;
}

const telecmiInsightTabs: Array<{
  value: TelecmiCallInsightsView;
  label: string;
}> = [
  { value: "incomingAnswered", label: "Incoming Answered" },
  { value: "incomingMissed", label: "Incoming Missed" },
  { value: "outgoingAnswered", label: "Outgoing Answered" },
  { value: "outgoingMissed", label: "Outgoing Missed" },
];

type LiveCallRow = {
  id: number;
  cmiuuid: string;
  direction: CallDirection;
  status: string;
  from_number: string;
  to_number: string;
  virtual_number: string;
  agent: string;
  created_at: string;
};

type DatePeriod =
  | "All Time"
  | "Today"
  | "Yesterday"
  | "This Week"
  | "This Month"
  | "Custom";

const datePeriods: DatePeriod[] = [
  "All Time",
  "Today",
  "Yesterday",
  "This Week",
  "This Month",
  "Custom",
];

const TELECMI_PREVIEW_LIMIT = 10;

function formatPhone(phone: string): string {
  return phone.replace(/^\+91(\d)/, "+91 $1");
}

function periodToRange(
  period: DatePeriod,
  customFrom: string,
  customTo: string,
) {
  const dayStart = (date: Date) =>
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      0,
      0,
      0,
      0,
    ).getTime();
  const dayEnd = (date: Date) =>
    new Date(
      date.getFullYear(),
      date.getMonth(),
      date.getDate(),
      23,
      59,
      59,
      999,
    ).getTime();

  const now = new Date();

  if (period === "All Time") {
    return {
      from: new Date("2020-01-01T00:00:00.000Z").getTime(),
      to: now.getTime(),
    };
  }

  if (period === "Today") return { from: dayStart(now), to: dayEnd(now) };
  if (period === "Yesterday") {
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    return { from: dayStart(yesterday), to: dayEnd(yesterday) };
  }
  if (period === "This Week") {
    const start = new Date(now);
    start.setDate(now.getDate() - now.getDay());
    return { from: dayStart(start), to: dayEnd(now) };
  }
  if (period === "This Month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: dayStart(start), to: dayEnd(now) };
  }
  if (period === "Custom") {
    return {
      from: customFrom
        ? new Date(customFrom + "T00:00:00").getTime()
        : undefined,
      to: customTo ? new Date(customTo + "T23:59:59.999").getTime() : undefined,
    };
  }

  return {};
}

function KpiIcon({ icon, className }: { icon: string; className?: string }) {
  const iconMap: Record<string, LucideIcon> = {
    total: Phone,
    answered: PhoneCall,
    missed: PhoneMissed,
    duration: Clock3,
  };
  const Icon = iconMap[icon] ?? MessageSquare;
  return <Icon className={className ?? "h-7 w-7"} aria-hidden="true" />;
}

function KpiCardSkeleton() {
  return (
    <article className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="w-full space-y-2.5">
          <SkeletonBox className="h-3.5 w-24 rounded-md" />
          <SkeletonBox className="h-6 w-16 rounded-lg" />
        </div>
        <SkeletonBox className="h-14 w-14 shrink-0 rounded-full" />
      </div>
    </article>
  );
}

function TableRowSkeleton() {
  return (
    <tr className="border-b border-slate-100 last:border-0">
      {Array.from({ length: 7 }).map((_, index) => (
        <td key={index} className="px-4 py-4">
          <SkeletonBox className="h-4 w-full max-w-28 rounded-md" />
        </td>
      ))}
    </tr>
  );
}

function RecordingPlayerModal({
  file,
  onClose,
}: {
  file: string;
  onClose: () => void;
}) {
  const playbackUrl = `/api/telecmi/play?file=${encodeURIComponent(file)}`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-md rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">Call Recording</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 space-y-2">
          <p className="truncate text-xs text-slate-500">{file}</p>
          <audio
            className="w-full"
            controls
            autoPlay
            preload="metadata"
            src={playbackUrl}
          >
            Your browser does not support audio playback.
          </audio>
        </div>
      </div>
    </div>
  );
}

function IncomingCallBanner({ liveCalls }: { liveCalls: LiveCallRow[] }) {
  const ringing = liveCalls.filter(
    (call) =>
      call.status?.toLowerCase().includes("ring") ||
      call.status?.toLowerCase().includes("active"),
  );

  if (ringing.length === 0) return null;

  return (
    <div className="rounded-3xl border border-green-200 bg-green-50/80 px-5 py-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-green-800">
            {ringing.length} live{" "}
            {ringing.length === 1 ? "call is" : "calls are"} ringing
          </p>
          <div className="mt-0.5 flex flex-wrap gap-2">
            {ringing.map((call) => (
              <span key={call.cmiuuid} className="text-xs text-green-700">
                {formatPhone(call.from_number || "Unknown")}
                {call.virtual_number ? ` -> ${call.virtual_number}` : ""}
              </span>
            ))}
          </div>
        </div>
        <span className="text-xs font-medium text-green-600">
          Answer on your TeleCMI softphone
        </span>
      </div>
    </div>
  );
}

function DialerPanel({
  onClose,
  onToast,
  onDial,
  canCall,
  initialNumber,
}: {
  onClose: () => void;
  onToast: (message: string) => void;
  onDial: (number: string) => Promise<{ ok: boolean; msg: string }>;
  canCall: boolean;
  initialNumber: string;
}) {
  const [number, setNumber] = useState("");
  const [calling, setCalling] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; msg: string } | null>(
    null,
  );

  const keys = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "*", "0", "#"];

  useEffect(() => {
    setNumber(initialNumber);
  }, [initialNumber]);

  async function dial() {
    if (!number.trim()) return;
    if (!canCall) {
      onToast(CALL_DISABLED_MESSAGE);
      return;
    }

    setCalling(true);
    setResult(null);
    try {
      const callResult = await onDial(number.trim());
      setResult(callResult);
    } catch (error) {
      setResult({
        ok: false,
        msg: error instanceof Error ? error.message : "Call failed",
      });
    } finally {
      setCalling(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full max-w-sm rounded-3xl bg-white p-5 shadow-2xl">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900">TeleCMI Dialer</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:bg-slate-50"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
        <div className="mt-4 space-y-4">
          <input
            type="tel"
            value={number}
            onChange={(event) => setNumber(event.target.value)}
            placeholder="Enter mobile number"
            className="h-12 w-full rounded-2xl border border-slate-200 px-4 text-center text-lg font-semibold tracking-wide outline-none ring-sky-300 focus:border-sky-300 focus:ring-2"
          />
          <div className="grid grid-cols-3 gap-2">
            {keys.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => setNumber((value) => value + key)}
                className="rounded-2xl border border-slate-200 px-4 py-3 text-base font-semibold text-slate-700 hover:border-sky-200 hover:bg-sky-50"
              >
                {key}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setNumber((value) => value.slice(0, -1))}
              className="flex-1 rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Backspace
            </button>
            <button
              type="button"
              onClick={dial}
              disabled={calling || !number.trim() || !canCall}
              className="flex-1 rounded-2xl bg-green-500 px-4 py-3 text-sm font-semibold text-white hover:bg-green-600 disabled:opacity-60"
            >
              {calling ? "Calling..." : "Call"}
            </button>
          </div>
          {result && (
            <p
              className={`rounded-2xl px-4 py-3 text-sm ${result.ok ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}
            >
              {result.msg}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function CallsPage() {
  const [activeInsightView, setActiveInsightView] =
    useState<TelecmiCallInsightsView>("incomingAnswered");
  const [datePeriod, setDatePeriod] = useState<DatePeriod>("All Time");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [telecmiPage, setTelecmiPage] = useState(1);
  const [telecmiPageSize, setTelecmiPageSize] = useState(TELECMI_PREVIEW_LIMIT);
  const [showDialer, setShowDialer] = useState(false);
  const [dialerNumber, setDialerNumber] = useState("");
  const [activeRecordingFile, setActiveRecordingFile] = useState<string | null>(
    null,
  );
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [convertCallRecord, setConvertCallRecord] = useState<{
    id: string;
    callerName: string;
  } | null>(null);
  const [liveCalls, setLiveCalls] = useState<LiveCallRow[]>([]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isTelecmiReady, setIsTelecmiReady] = useState(false);
  const telecmiClientRef = useRef<PiopiyClient | null>(null);

  const selectedRange = useMemo(
    () => periodToRange(datePeriod, customFrom, customTo),
    [datePeriod, customFrom, customTo],
  );

  useEffect(() => {
    setTelecmiPage(1);
  }, [activeInsightView, datePeriod, customFrom, customTo]);

  const {
    data: telecmiInsights,
    loading: telecmiLoading,
    error: telecmiError,
    refetch: refetchTelecmi,
  } = useTelecmiCallInsights({
    view: activeInsightView,
    dateFrom: selectedRange.from,
    dateTo: selectedRange.to,
    page: telecmiPage,
    limit: telecmiPageSize,
  });

  const telecmiTotalRecords = telecmiInsights?.count ?? 0;
  const telecmiTotalPages = Math.max(
    1,
    Math.ceil(telecmiTotalRecords / telecmiPageSize),
  );
  const safePage = Math.min(telecmiPage, telecmiTotalPages);
  const pageNumbers = useMemo(() => {
    const pages: (number | "...")[] = [];
    if (telecmiTotalPages <= 7) {
      for (let i = 1; i <= telecmiTotalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (safePage > 3) pages.push("...");
      const start = Math.max(2, safePage - 1);
      const end = Math.min(telecmiTotalPages - 1, safePage + 1);
      for (let i = start; i <= end; i++) pages.push(i);
      if (safePage < telecmiTotalPages - 2) pages.push("...");
      pages.push(telecmiTotalPages);
    }
    return pages;
  }, [safePage, telecmiTotalPages]);
  const telecmiStartRecord =
    telecmiTotalRecords > 0 ? (safePage - 1) * telecmiPageSize + 1 : 0;
  const telecmiEndRecord =
    telecmiTotalRecords > 0
      ? Math.min(safePage * telecmiPageSize, telecmiTotalRecords)
      : 0;

  useEffect(() => {
    if (telecmiPage > telecmiTotalPages) {
      setTelecmiPage(telecmiTotalPages);
    }
  }, [telecmiTotalPages, telecmiPage]);

  useEffect(() => {
    const poll = async () => {
      try {
        const response = await fetch("/api/telecmi/live-calls");
        if (!response.ok) return;
        const json = await response.json();
        setLiveCalls(json.liveCalls ?? []);
      } catch {
        setLiveCalls([]);
      }
    };

    poll();
    const id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  useEffect(() => {
    if (!openActionMenuId) return;
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest("[data-action-menu]")) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [openActionMenuId]);

  useEffect(() => {
    let disposed = false;

    const initTelecmiBrowserSdk = async () => {
      try {
        const browserUser = await fetchTelecmiBrowserUser();
        const telecmiUserId = browserUser.telecmiUserId?.trim();

        if (!telecmiUserId) {
          setIsTelecmiReady(false);
          setToastMessage(CALL_DISABLED_MESSAGE);
          return;
        }

        const browserSecret =
          process.env.NEXT_PUBLIC_TELECMI_APP_SECRET?.trim();
        if (!browserSecret) {
          setIsTelecmiReady(false);
          setToastMessage(
            "Call functionality is not configured. Contact admin.",
          );
          return;
        }

        const sbcUri =
          process.env.NEXT_PUBLIC_TELECMI_SBC_URI?.trim() ||
          "sbcind.telecmi.com";

        const piopiyModule = await import("piopiyjs");
        const PIOPIY = (piopiyModule.default ??
          piopiyModule) as unknown as PiopiyConstructor;

        if (disposed) return;

        const telecmiClient = new PIOPIY({
          name: "CRM User",
          debug: false,
          autoplay: true,
          ringTime: 60,
        });

        telecmiClientRef.current = telecmiClient;

        telecmiClient.on("login", (payload) => {
          if (disposed) return;
          if (payload.code === 200) {
            setIsTelecmiReady(true);
          }
        });

        telecmiClient.on("loginFailed", () => {
          if (disposed) return;
          setIsTelecmiReady(false);
          setToastMessage(
            "Unable to login to TeleCMI browser SDK. Contact admin.",
          );
        });

        telecmiClient.on("error", () => {
          if (disposed) return;
          setIsTelecmiReady(false);
        });

        telecmiClient.login(telecmiUserId, browserSecret, sbcUri);
      } catch (error) {
        console.error(
          "[calls] Failed to initialize TeleCMI browser SDK",
          error,
        );
        if (disposed) return;
        setIsTelecmiReady(false);
        setToastMessage("Call functionality is not available right now.");
      }
    };

    initTelecmiBrowserSdk();

    return () => {
      disposed = true;
      if (telecmiClientRef.current?.logout) {
        telecmiClientRef.current.logout();
      }
      telecmiClientRef.current = null;
      setIsTelecmiReady(false);
    };
  }, []);

  const dialWithSdk = useCallback(
    async (phoneNumber: string) => {
      const cleaned = phoneNumber.replace(/\D/g, "");

      if (!cleaned) {
        return { ok: false, msg: "Enter a valid phone number." };
      }

      if (!isTelecmiReady || !telecmiClientRef.current) {
        return { ok: false, msg: "Call functionality is disabled right now." };
      }

      try {
        telecmiClientRef.current.call(cleaned, {
          source: "crm",
          initiated_from: "browser_sdk",
        });
        return {
          ok: true,
          msg: "Call initiated from TeleCMI browser SDK.",
        };
      } catch (error) {
        return {
          ok: false,
          msg: error instanceof Error ? error.message : "Call failed",
        };
      }
    },
    [isTelecmiReady],
  );

  const topStats = useMemo(() => {
    if (!telecmiInsights) return [];

    const records = telecmiInsights.records;
    const avgDuration =
      records.length > 0
        ? Math.round(
            records.reduce((sum, record) => sum + record.duration, 0) /
              records.length,
          )
        : 0;

    return [
      {
        label: `${telecmiInsights.label} Count`,
        value: String(telecmiInsights.count),
        iconBg: "bg-[#FF6B4A]",
        icon: "total",
      },
      {
        label: "Loaded",
        value: String(records.length),
        iconBg: "bg-indigo-500",
        icon: "answered",
      },
      {
        label: "Avg Duration",
        value: formatDurationSeconds(avgDuration),
        iconBg: "bg-green-500",
        icon: "duration",
      },
      {
        label: "With Notes",
        value: String(
          records.filter((record) => record.notes.length > 0).length,
        ),
        iconBg: "bg-rose-500",
        icon: "missed",
      },
    ];
  }, [telecmiInsights]);

  const isIncomingView =
    activeInsightView === "incomingAnswered" ||
    activeInsightView === "incomingMissed";

  return (
    <CrmShell activeNav="Calls">
      {toastMessage && (
        <div className="fixed right-4 top-4 z-60 max-w-sm rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 shadow-lg">
          {toastMessage}
        </div>
      )}

      <div className="space-y-5 p-4 md:p-6">
        {liveCalls.length > 0 && <IncomingCallBanner liveCalls={liveCalls} />}

        <PageHeader
          title="TeleCMI Calls"
          subtitle="Live call analytics and CDR records from TeleCMI only."
          onRefresh={() => refetchTelecmi()}
        >
          <button
            type="button"
            onClick={() => {
              setDialerNumber("");
              setShowDialer(true);
            }}
            className="flex items-center gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 shadow-sm transition hover:bg-green-100 active:scale-95"
          >
            <PhoneCall className="h-4 w-4" aria-hidden="true" />
            <Plus className="-ml-1 h-3.5 w-3.5" aria-hidden="true" />
            Dialer
          </button>
        </PageHeader>
        {telecmiError && (
          <p className="mt-2 text-sm text-red-600">{telecmiError}</p>
        )}

        <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-sky-100/90 bg-sky-50/80 p-1.5">
            {telecmiInsightTabs.map((tab) => (
              <button
                key={tab.value}
                type="button"
                onClick={() => setActiveInsightView(tab.value)}
                className={`flex shrink-0 items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition ${activeInsightView === tab.value ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700"}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {telecmiLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <KpiCardSkeleton key={index} />
                ))
              : topStats.map((stat) => (
                  <article
                    key={stat.label}
                    className="rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm transition hover:border-sky-200 hover:shadow-md"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-xs text-slate-500 md:text-sm">
                          {stat.label}
                        </p>
                        <p className="mt-1 text-lg font-semibold text-slate-900 md:text-xl">
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

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 overflow-x-auto rounded-2xl border border-sky-100/90 bg-sky-50/50 p-1.5">
              {datePeriods.map((period) => (
                <button
                  key={period}
                  type="button"
                  onClick={() => setDatePeriod(period)}
                  className={`flex shrink-0 items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold transition ${datePeriod === period ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:text-slate-700"}`}
                >
                  {period}
                </button>
              ))}
            </div>
            {datePeriod === "Custom" && (
              <div className="flex items-center gap-1.5">
                <input
                  type="date"
                  value={customFrom}
                  onChange={(event) => setCustomFrom(event.target.value)}
                  className="h-10 rounded-xl border border-sky-100 bg-white px-3 text-sm outline-none ring-sky-300 focus:border-sky-300 focus:ring-2"
                />
                <span className="text-sm text-slate-400">to</span>
                <input
                  type="date"
                  value={customTo}
                  onChange={(event) => setCustomTo(event.target.value)}
                  className="h-10 rounded-xl border border-sky-100 bg-white px-3 text-sm outline-none ring-sky-300 focus:border-sky-300 focus:ring-2"
                />
              </div>
            )}
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="text-base font-semibold text-slate-900">
                {
                  telecmiInsightTabs.find(
                    (tab) => tab.value === activeInsightView,
                  )?.label
                }
              </h2>
            </div>
            <div className="p-5">
              {telecmiLoading ? (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-220 text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                        <th className="px-4 py-3">Caller</th>
                        <th className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5">
                            <ArrowLeftRight
                              className="h-3.5 w-3.5"
                              aria-hidden="true"
                            />
                            {isIncomingView ? "From Number" : "To Number"}
                          </span>
                        </th>
                        <th className="px-4 py-3">Time</th>
                        <th className="px-4 py-3">Agent</th>
                        <th className="px-4 py-3">Duration</th>
                        <th className="px-4 py-3">Notes</th>
                        <th className="px-4 py-3">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 4 }).map((_, index) => (
                        <TableRowSkeleton key={index} />
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : telecmiInsights && telecmiInsights.records.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-slate-600">
                      Showing {telecmiStartRecord}-{telecmiEndRecord} of{" "}
                      {telecmiTotalRecords} records.
                    </p>
                    <p className="text-xs text-slate-500">
                      {telecmiInsights.endpoint}
                    </p>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-220 text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                          <th className="px-4 py-3">Caller</th>
                          <th className="px-4 py-3">From / To</th>
                          <th className="px-4 py-3">Time</th>
                          <th className="px-4 py-3">Agent</th>
                          <th className="px-4 py-3">Duration</th>
                          <th className="px-4 py-3">Notes</th>
                          <th className="px-4 py-3">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(telecmiInsights?.records ?? []).map((record) => {
                          const hasName =
                            !!record.name &&
                            record.name.trim() !== "" &&
                            record.name.toLowerCase() !== "unknown";
                          const callerName = hasName
                            ? record.name
                            : isIncomingView
                              ? record.from
                              : record.to;
                          const callerNumber = isIncomingView
                            ? record.from
                            : record.to;

                          return (
                            <tr
                              key={record.cmiuid}
                              className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60"
                            >
                              <td className="px-4 py-4 align-top">
                                <div className="font-semibold text-slate-900">
                                  {callerName}
                                </div>
                                {hasName && callerNumber && (
                                  <div className="mt-0.5 text-xs text-slate-500">
                                    {formatPhone(callerNumber)}
                                  </div>
                                )}
                                <div className="mt-1 text-xs text-slate-500">
                                  Billed{" "}
                                  {formatDurationSeconds(record.billedsec)}
                                </div>
                              </td>
                              <td className="px-4 py-4 align-top text-slate-600">
                                <div>{callerNumber}</div>
                                <div className="mt-1 text-xs text-slate-500">
                                  {isIncomingView
                                    ? `to ${record.to}`
                                    : `from ${record.from}`}
                                </div>
                              </td>
                              <td className="px-4 py-4 align-top text-slate-600">
                                {formatCallDateTime(
                                  new Date(record.time).toISOString(),
                                )}
                              </td>
                              <td className="px-4 py-4 align-top text-slate-600">
                                {record.agent ?? "Unassigned agent"}
                              </td>
                              <td className="px-4 py-4 align-top">
                                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">
                                  {formatDurationSeconds(record.duration)}
                                </span>
                              </td>
                              <td className="px-4 py-4 align-top text-slate-600">
                                <div className="max-w-64 text-sm">
                                  {record.notes[0]?.msg || "-"}
                                </div>
                              </td>
                              <td className="px-4 py-4 align-top">
                                <div className="relative" data-action-menu>
                                  <button
                                    type="button"
                                    title="Actions"
                                    onClick={() =>
                                      setOpenActionMenuId(
                                        openActionMenuId === record.cmiuid
                                          ? null
                                          : record.cmiuid,
                                      )
                                    }
                                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 transition hover:bg-slate-50 hover:text-slate-600"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </button>

                                  {openActionMenuId === record.cmiuid && (
                                    <div className="absolute right-0 top-full z-30 mt-1 w-48 rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
                                      {record.filename && (
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActiveRecordingFile(record.filename);
                                            setOpenActionMenuId(null);
                                          }}
                                          className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                                        >
                                          <Play className="h-4 w-4 text-[#FF6B4A]" />
                                          Play Recording
                                        </button>
                                      )}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setConvertCallRecord({
                                            id: record.cmiuid,
                                            callerName: callerName,
                                          });
                                          setOpenActionMenuId(null);
                                        }}
                                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                                      >
                                        <UserPlus className="h-4 w-4 text-[#FF6B4A]" />
                                        Convert to Lead
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setDialerNumber(callerNumber ?? "");
                                          setShowDialer(true);
                                          setOpenActionMenuId(null);
                                        }}
                                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
                                      >
                                        <Phone className="h-4 w-4 text-green-600" />
                                        Dial
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span>Show per page:</span>
                      <select
                        value={String(telecmiPageSize)}
                        onChange={(event) => {
                          setTelecmiPageSize(Number(event.target.value));
                          setTelecmiPage(1);
                        }}
                        className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm"
                      >
                        <option value="10">10</option>
                        <option value="20">20</option>
                        <option value="50">50</option>
                      </select>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          setTelecmiPage((page) => Math.max(1, page - 1))
                        }
                        disabled={safePage === 1}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-sm font-medium text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronsLeft className="h-4 w-4" aria-hidden="true" />
                      </button>
                      {pageNumbers.map((p, idx) =>
                        p === "..." ? (
                          <span
                            key={`ellipsis-${idx}`}
                            className="inline-flex h-9 w-9 items-center justify-center text-sm text-slate-400"
                          >
                            ...
                          </span>
                        ) : (
                          <button
                            key={p}
                            type="button"
                            onClick={() => setTelecmiPage(p)}
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-lg text-sm font-medium transition ${
                              p === safePage
                                ? "bg-[#FF6B4A] text-white shadow-sm"
                                : "border border-slate-200 text-slate-600 hover:bg-white"
                            }`}
                          >
                            {p}
                          </button>
                        ),
                      )}
                      <button
                        type="button"
                        onClick={() => setTelecmiPage((page) => page + 1)}
                        disabled={safePage >= telecmiTotalPages}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-sm font-medium text-slate-600 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <ChevronsRight
                          className="h-4 w-4"
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-slate-600">
                  <div>
                    <p className="font-semibold text-slate-900">
                      {telecmiInsights?.label ?? "TeleCMI Records"}
                    </p>
                    <p className="mt-1">
                      No records returned by TeleCMI for the selected date
                      range.
                    </p>
                  </div>
                  <p className="text-xs text-slate-500">
                    {telecmiInsights?.endpoint}
                  </p>
                </div>
              )}
            </div>
          </div>
      </div>

      {showDialer && (
        <DialerPanel
          onClose={() => setShowDialer(false)}
          onToast={(message) => setToastMessage(message)}
          onDial={dialWithSdk}
          canCall={isTelecmiReady}
          initialNumber={dialerNumber}
        />
      )}

      {activeRecordingFile && (
        <RecordingPlayerModal
          file={activeRecordingFile}
          onClose={() => setActiveRecordingFile(null)}
        />
      )}

      <ConvertToLeadModal
        isOpen={!!convertCallRecord}
        onClose={() => setConvertCallRecord(null)}
        sourceType="call"
        sourceId={convertCallRecord?.id ?? ""}
        defaultTitle={
          convertCallRecord ? `Lead from ${convertCallRecord.callerName}` : ""
        }
        onConverted={() => {
          setToastMessage("Lead created successfully");
          setConvertCallRecord(null);
        }}
      />
    </CrmShell>
  );
}
