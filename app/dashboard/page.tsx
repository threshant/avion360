"use client";

import CrmShell from "@/components/layout/CrmShell";
import { fmtCompactCurrency } from "@/utils/formatting";
import {
  ShimmerCard,
  ShimmerLeadSources,
  ShimmerSummaryCard,
} from "@/components/Shimmer";
import {
  useDashboardAnalytics,
  type PeriodFilter,
} from "@/hooks/useDashboardAnalytics";
import { useAuth } from "@/lib/auth-context";
import {
  ArrowRight,
  CalendarDays,
  Check,
  ChevronDown,
  Clock3,
  DollarSign,
  Globe,
  Mail,
  MessageCircle,
  MessageSquare,
  Package,
  Phone,
  TrendingUp,
  Users,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type KpiCardConfig = {
  title: string;
  icon:
    | "users"
    | "phone"
    | "mail"
    | "dollar"
    | "trend"
    | "clock"
    | "box"
    | "calendar";
  iconBg: string;
};

type LeadSourceIcon =
  | "whatsapp"
  | "phone"
  | "email"
  | "website"
  | "walkin"
  | "instagram"
  | "facebook";

// ─── Data ─────────────────────────────────────────────────────────────────────

const kpiCardConfigs: KpiCardConfig[] = [
  { title: "Total Leads", icon: "users", iconBg: "bg-[#FF6B4A]" },
  { title: "Total Calls", icon: "phone", iconBg: "bg-cyan-500" },
  { title: "Total Quotations", icon: "mail", iconBg: "bg-indigo-500" },
  { title: "Total Invoices", icon: "dollar", iconBg: "bg-[#FF6B4A]" },
  { title: "Turnover", icon: "dollar", iconBg: "bg-cyan-600" },
  { title: "GST Collected", icon: "dollar", iconBg: "bg-indigo-600" },
  { title: "Income", icon: "trend", iconBg: "bg-[#FF6B4A]" },
  { title: "Expenses", icon: "clock", iconBg: "bg-slate-500" },
];

const periodOptions: PeriodFilter[] = [
  "Today",
  "Yesterday",
  "This Week",
  "This Month",
  "Custom",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Icon({
  name,
  className,
}: {
  name: KpiCardConfig["icon"] | "chat" | "box";
  className?: string;
}) {
  const iconMap: Record<KpiCardConfig["icon"] | "chat" | "box", LucideIcon> = {
    users: Users,
    phone: Phone,
    mail: Mail,
    dollar: DollarSign,
    trend: TrendingUp,
    clock: Clock3,
    calendar: CalendarDays,
    chat: MessageSquare,
    box: Package,
  };
  const IconComponent = iconMap[name] ?? MessageSquare;
  return <IconComponent className={className} aria-hidden="true" />;
}

function LeadSourceGlyph({
  icon,
  className,
}: {
  icon: LeadSourceIcon;
  className?: string;
}) {
  const sourceIconMap: Record<LeadSourceIcon, LucideIcon> = {
    whatsapp: MessageCircle,
    phone: Phone,
    email: Mail,
    website: Globe,
    walkin: Users,
    instagram: Globe,
    facebook: Globe,
  };
  const SourceIcon = sourceIconMap[icon] ?? Globe;
  return <SourceIcon className={className} aria-hidden="true" />;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [isPeriodMenuOpen, setIsPeriodMenuOpen] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodFilter>("Today");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const { user, loading } = useAuth();
  const {
    dashboardData,
    leadsBySource,
    loading: analyticsLoading,
    error: analyticsError,
  } = useDashboardAnalytics(selectedPeriod, customFrom, customTo);
  const periodMenuRef = useRef<HTMLDivElement | null>(null);

  // Format role for display (e.g., "super_admin" → "Super Admin")
  const roleLabel =
    user?.role
      ?.split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || "User";

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        periodMenuRef.current &&
        !periodMenuRef.current.contains(e.target as Node)
      ) {
        setIsPeriodMenuOpen(false);
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setIsPeriodMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, []);

  return (
    <CrmShell activeNav="Dashboard">
      <div className="space-y-5 p-4 md:p-6">
        {/* ── Content ── */}
        {/* KPI section */}
        <section className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="flex items-center gap-3 text-lg font-semibold text-[#1A1A1A]">
                Dashboard
                {loading || !user ? (
                  <span className="h-5 w-20 animate-pulse rounded-full bg-gray-200" />
                ) : (
                  <span className="rounded-full bg-[#FFF1EE] px-2.5 py-0.5 text-xs font-medium text-[#FF6B4A]">
                    {roleLabel}
                  </span>
                )}
              </h1>
              {loading || !user ? (
                <div className="mt-2 space-y-1.5">
                  <div className="h-3 w-48 animate-pulse rounded-md bg-gray-200" />
                  <div className="h-3 w-64 animate-pulse rounded-md bg-gray-200" />
                </div>
              ) : (
                <p className="mt-1 text-sm text-[#6B7280]">
                  Welcome back, {user?.name || "User"}! Here&apos;s what&apos;s
                  happening today.
                </p>
              )}
            </div>

            {/* Period picker */}
            <div className="flex flex-wrap items-center gap-2">
              {selectedPeriod === "Custom" && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/30"
                  />
                  <span className="text-sm text-[#6B7280]">to</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="rounded-lg border border-[#E5E7EB] px-2 py-1.5 text-sm text-[#1A1A1A] focus:outline-none focus:ring-2 focus:ring-[#FF6B4A]/30"
                  />
                </div>
              )}
              <div className="relative" ref={periodMenuRef}>
                <button
                  type="button"
                  onClick={() => setIsPeriodMenuOpen((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={isPeriodMenuOpen}
                  className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] bg-white px-3 py-2 text-sm font-medium text-[#1A1A1A] transition hover:bg-gray-50"
                >
                  <Icon name="calendar" className="h-4 w-4 text-[#6B7280]" />
                  {selectedPeriod}
                  <ChevronDown
                    className="h-3.5 w-3.5 text-[#6B7280]"
                    aria-hidden="true"
                  />
                </button>
                {isPeriodMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 z-20 mt-2 w-44 overflow-hidden rounded-xl border border-[#E5E7EB] bg-white p-1 shadow-lg"
                  >
                    {periodOptions.map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        role="menuitem"
                        onClick={() => {
                          setSelectedPeriod(opt);
                          setIsPeriodMenuOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm font-medium transition ${
                          selectedPeriod === opt
                            ? "bg-[#FFF1EE] text-[#FF6B4A]"
                            : "text-[#1A1A1A] hover:bg-gray-50"
                        }`}
                      >
                        {opt}
                        {selectedPeriod === opt && (
                          <Check className="h-4 w-4" aria-hidden="true" />
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {analyticsLoading ? (
              <>
                {[...Array(8)].map((_, i) => (
                  <ShimmerCard key={i} />
                ))}
              </>
            ) : (
              (() => {
                const fmtRs = (n: number) => fmtCompactCurrency(n);
                const kpiValues: Record<string, string> = {
                  "Total Leads": (
                    dashboardData?.totalLeads ?? 0
                  ).toLocaleString(),
                  "Total Calls": (
                    dashboardData?.totalConversations ?? 0
                  ).toLocaleString(),
                  "Total Quotations": (
                    dashboardData?.totalQuotations ?? 0
                  ).toLocaleString(),
                  "Total Invoices": (
                    dashboardData?.totalInvoices ?? 0
                  ).toLocaleString(),
                  Turnover: fmtRs(dashboardData?.turnover ?? 0),
                  "GST Collected": fmtRs(dashboardData?.gstCollected ?? 0),
                  Income: fmtRs(dashboardData?.totalIncome ?? 0),
                  Expenses: fmtRs(dashboardData?.totalExpenses ?? 0),
                };
                return kpiCardConfigs.map((card) => (
                  <article
                    key={card.title}
                    className="rounded-xl border border-[#E5E7EB] bg-white px-5 py-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm text-[#6B7280]">{card.title}</p>
                        <p className="mt-1 text-3xl font-bold tracking-tight text-[#1A1A1A]">
                          {kpiValues[card.title] ?? "—"}
                        </p>
                      </div>
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-[#FFF1EE] text-[#FF6B4A]">
                        <Icon name={card.icon} className="h-5 w-5" />
                      </span>
                    </div>
                  </article>
                ));
              })()
            )}
          </div>
        </section>

        {/* Lead Sources */}
        {analyticsLoading ? (
          <ShimmerLeadSources />
        ) : (
          <section className="rounded-xl border border-[#E5E7EB] bg-white p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold text-[#1A1A1A]">
                Lead Sources Breakdown
              </h2>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-lg border border-[#E5E7EB] px-3 py-1.5 text-sm font-medium text-[#1A1A1A] transition hover:bg-gray-50"
              >
                View All
                <ArrowRight className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-y-6 text-center sm:grid-cols-3 lg:grid-cols-4">
              {dashboardData?.channels && dashboardData.channels.length > 0 ? (
                dashboardData.channels.map((channel) => {
                  // Map channel names to icon types and colors
                  const channelConfig: Record<
                    string,
                    { icon: LeadSourceIcon; color: string }
                  > = {
                    whatsapp: { icon: "whatsapp", color: "bg-[#FF6B4A]" },
                    instagram: { icon: "instagram", color: "bg-[#FF6B4A]" },
                    facebook: { icon: "facebook", color: "bg-[#FF6B4A]" },
                    email: { icon: "email", color: "bg-[#FF6B4A]" },
                    phone: { icon: "phone", color: "bg-[#FF6B4A]" },
                    website: { icon: "website", color: "bg-[#FF6B4A]" },
                  };

                  const normalizedName = channel.channelName
                    .toLowerCase()
                    .includes("whatsapp")
                    ? "whatsapp"
                    : channel.channelName.toLowerCase().includes("instagram")
                      ? "instagram"
                      : channel.channelName.toLowerCase().includes("facebook")
                        ? "facebook"
                        : channel.channelName
                              .toLowerCase()
                              .includes("website") ||
                            channel.channelName.toLowerCase().includes("chat")
                          ? "website"
                          : channel.channelName.toLowerCase().includes("email")
                            ? "email"
                            : "phone";

                  const config = channelConfig[normalizedName] || {
                    icon: "website" as LeadSourceIcon,
                    color: "bg-[#FF6B4A]",
                  };

                  return (
                    <article key={channel.channelId}>
                      <span
                        className={`mx-auto inline-flex h-14 w-14 items-center justify-center rounded-full text-white ${config.color}`}
                      >
                        <LeadSourceGlyph
                          icon={config.icon}
                          className="h-7 w-7"
                        />
                      </span>
                      <p className="mt-3 text-sm font-medium text-[#1A1A1A]">
                        {channel.channelName}
                      </p>
                      <div className="mt-2 space-y-1">
                        <p className="text-xs text-[#6B7280]">Conversations</p>
                        <p className="text-lg font-bold text-[#1A1A1A]">
                          {channel.conversations}
                        </p>
                        <p className="text-xs text-[#6B7280] mt-2">Leads</p>
                        <p className="text-lg font-bold text-[#1A1A1A]">
                          {channel.leads}
                        </p>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="col-span-full py-8 text-center">
                  <p className="text-[#6B7280]">No channel data available</p>
                </div>
              )}
            </div>
            <div className="mt-6 rounded-xl border border-[#E5E7EB] bg-[#FFF1EE] py-5 text-center">
              <p className="text-sm text-[#6B7280]">Total Leads</p>
              <p className="mt-1 text-2xl font-bold text-[#FF6B4A]">
                {dashboardData?.totalLeads || 0}
              </p>
            </div>
          </section>
        )}

        {/* Summary cards */}
        <section className="grid gap-4 lg:grid-cols-3">
          <article className="rounded-xl border border-[#E5E7EB] bg-white p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-[#1A1A1A]">
              <Icon name="dollar" className="h-5 w-5 text-[#FF6B4A]" />
              Turnover Summary
            </h3>
            <dl className="mt-6 space-y-4 text-sm">
              {analyticsLoading ? (
                <ShimmerSummaryCard />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#6B7280]">Total Turnover</dt>
                    <dd className="font-semibold text-[#1A1A1A]">
                      {"₹" +
                        Math.round(dashboardData?.turnover ?? 0).toLocaleString(
                          "en-IN",
                        )}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#6B7280]">GST Collected</dt>
                    <dd className="font-semibold text-[#1A1A1A]">
                      {"₹" +
                        Math.round(
                          dashboardData?.gstCollected ?? 0,
                        ).toLocaleString("en-IN")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#6B7280]">Net Amount</dt>
                    <dd className="font-semibold text-[#FF6B4A]">
                      {"₹" +
                        Math.round(
                          dashboardData?.netTurnover ?? 0,
                        ).toLocaleString("en-IN")}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </article>

          <article className="rounded-xl border border-[#E5E7EB] bg-white p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-[#1A1A1A]">
              <Icon name="mail" className="h-5 w-5 text-[#FF6B4A]" />
              Invoicing Status
            </h3>
            <dl className="mt-6 space-y-4 text-sm">
              {analyticsLoading ? (
                <ShimmerSummaryCard />
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#6B7280]">Paid</dt>
                    <dd className="font-semibold text-[#22C55E]">
                      {"₹" +
                        Math.round(
                          dashboardData?.invoicingStatus?.paid ?? 0,
                        ).toLocaleString("en-IN")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#6B7280]">Pending</dt>
                    <dd className="font-semibold text-[#1A1A1A]">
                      {"₹" +
                        Math.round(
                          dashboardData?.invoicingStatus?.pending ?? 0,
                        ).toLocaleString("en-IN")}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-[#6B7280]">Overdue</dt>
                    <dd className="font-semibold text-rose-600">
                      {"₹" +
                        Math.round(
                          dashboardData?.invoicingStatus?.overdue ?? 0,
                        ).toLocaleString("en-IN")}
                    </dd>
                  </div>
                </>
              )}
            </dl>
          </article>

          <article className="rounded-xl border border-[#E5E7EB] bg-white p-6">
            <h3 className="flex items-center gap-2 text-lg font-semibold text-[#1A1A1A]">
              <Icon name="box" className="h-5 w-5 text-[#FF6B4A]" />
              Warehouse Summary
            </h3>
            <dl className="mt-6 space-y-4 text-sm">
              {analyticsLoading ? (
                <ShimmerSummaryCard />
              ) : dashboardData?.warehouseSummary &&
                dashboardData.warehouseSummary.length > 0 ? (
                dashboardData.warehouseSummary.map((w) => (
                  <div
                    key={w.name}
                    className="flex items-center justify-between"
                  >
                    <dt className="text-[#6B7280]">{w.name}</dt>
                    <dd className="font-semibold text-[#1A1A1A]">
                      {w.cbm} CBM
                    </dd>
                  </div>
                ))
              ) : (
                <p className="text-[#6B7280] text-sm">No warehouses found.</p>
              )}
            </dl>
          </article>
        </section>

        {/* Income vs Expense */}
        <section className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <h3 className="flex items-center gap-2 text-lg font-semibold text-[#1A1A1A]">
            <Icon name="trend" className="h-5 w-5 text-[#FF6B4A]" />
            Income vs Expense Snapshot
          </h3>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-[#6B7280]">Total Income</p>
              <p className="mt-2 text-2xl font-bold text-[#22C55E]">
                {"₹" +
                  Math.round(dashboardData?.totalIncome ?? 0).toLocaleString(
                    "en-IN",
                  )}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#6B7280]">Total Expenses</p>
              <p className="mt-2 text-2xl font-bold text-[#1A1A1A]">
                {"₹" +
                  Math.round(dashboardData?.totalExpenses ?? 0).toLocaleString(
                    "en-IN",
                  )}
              </p>
            </div>
            <div>
              <p className="text-sm text-[#6B7280]">Net Profit</p>
              <p className="mt-2 text-2xl font-bold text-[#FF6B4A]">
                {"₹" +
                  Math.round(dashboardData?.netProfit ?? 0).toLocaleString(
                    "en-IN",
                  )}
              </p>
            </div>
          </div>
        </section>

        {/* Charts */}
        <section className="grid gap-4 xl:grid-cols-2">
          <article className="rounded-xl border border-[#E5E7EB] bg-white p-6">
            <h3 className="text-lg font-semibold text-[#1A1A1A]">
              Revenue Trend (6 Months)
            </h3>
            <div className="mt-4">
              {analyticsLoading || !dashboardData?.revenueTrend ? (
                <div className="crm-skeleton h-[250px] w-full rounded-xl" />
              ) : (
                (() => {
                  const { months: rMonths, values: rVals } =
                    dashboardData.revenueTrend;
                  const W = 620,
                    H = 270;
                  const ML = 64,
                    MR = 30,
                    MT = 24,
                    MB = 50;
                  const iw = W - ML - MR,
                    ih = H - MT - MB;
                  const maxV = Math.max(...rVals, 1);
                  const toX = (i: number) =>
                    ML + (i / Math.max(rMonths.length - 1, 1)) * iw;
                  const toY = (v: number) => MT + ih - (v / maxV) * ih;
                  const pts = rVals
                    .map((v, i) => `${toX(i).toFixed(0)},${toY(v).toFixed(0)}`)
                    .join(" ");
                  const gridVals = [0, 0.25, 0.5, 0.75, 1].map((f) =>
                    Math.round(maxV * f),
                  );
                  return (
                    <svg viewBox={`0 0 ${W} ${H}`} className="h-[250px] w-full">
                      {gridVals.map((v) => (
                        <g key={v}>
                          <line
                            x1={ML}
                            y1={toY(v)}
                            x2={W - MR}
                            y2={toY(v)}
                            stroke="#E5E7EB"
                            strokeDasharray="6 6"
                          />
                          <text
                            x={ML - 6}
                            y={toY(v) + 4}
                            textAnchor="end"
                            fontSize="11"
                            fill="#6B7280"
                          >
                            {v === 0 ? "0" : `${Math.round(v / 1000)}k`}
                          </text>
                        </g>
                      ))}
                      <polyline
                        points={pts}
                        fill="none"
                        stroke="#FF6B4A"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      {rVals.map((v, i) => (
                        <circle
                          key={i}
                          cx={toX(i)}
                          cy={toY(v)}
                          r="4"
                          fill="#fff"
                          stroke="#FF6B4A"
                          strokeWidth="3"
                        />
                      ))}
                      {rMonths.map((m, i) => (
                        <text
                          key={m}
                          x={toX(i)}
                          y={H - 14}
                          textAnchor="middle"
                          fontSize="11"
                          fill="#6B7280"
                        >
                          {m}
                        </text>
                      ))}
                      <line
                        x1={ML}
                        y1={MT + ih}
                        x2={W - MR}
                        y2={MT + ih}
                        stroke="#E5E7EB"
                      />
                      <line
                        x1={ML}
                        y1={MT}
                        x2={ML}
                        y2={MT + ih}
                        stroke="#E5E7EB"
                      />
                    </svg>
                  );
                })()
              )}
            </div>
          </article>

          <article className="rounded-xl border border-[#E5E7EB] bg-white p-6">
            <h3 className="text-lg font-semibold text-[#1A1A1A]">
              Lead Sources Distribution
            </h3>
            {analyticsLoading ? (
              <div className="crm-skeleton mt-4 h-64 w-full rounded-xl" />
            ) : (
              (() => {
                const channels = dashboardData?.channels ?? [];
                const palette = [
                  "#FF6B4A",
                  "#22C55E",
                  "#3B82F6",
                  "#A855F7",
                  "#F59E0B",
                  "#10B981",
                  "#6366F1",
                ];
                const total = channels.reduce((s, c) => s + c.conversations, 0);
                if (channels.length === 0 || total === 0) {
                  return (
                    <div className="mt-4 flex items-center justify-center py-8 text-sm text-[#6B7280]">
                      No channel data available for this period.
                    </div>
                  );
                }
                // Build SVG donut slices
                const CX = 110,
                  CY = 110,
                  R = 85;
                let cumAngle = -Math.PI / 2;
                const slices = channels.map((ch, i) => {
                  const frac = ch.conversations / total;
                  const angle = frac * 2 * Math.PI;
                  const x1 = CX + R * Math.cos(cumAngle);
                  const y1 = CY + R * Math.sin(cumAngle);
                  cumAngle += angle;
                  const x2 = CX + R * Math.cos(cumAngle);
                  const y2 = CY + R * Math.sin(cumAngle);
                  const largeArc = angle > Math.PI ? 1 : 0;
                  return {
                    d: `M${CX} ${CY} L${x1.toFixed(2)} ${y1.toFixed(2)} A${R} ${R} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)} Z`,
                    color: palette[i % palette.length],
                    label: ch.channelName,
                    pct: Math.round(frac * 100),
                  };
                });
                return (
                  <div className="mt-4 flex flex-col items-center gap-5 lg:flex-row lg:items-start lg:justify-center">
                    <svg viewBox="0 0 220 220" className="h-56 w-56 shrink-0">
                      {slices.map((s, i) => (
                        <path key={i} d={s.d} fill={s.color} opacity={0.9} />
                      ))}
                      <circle cx={CX} cy={CY} r="38" fill="#fff" />
                      <text
                        x={CX}
                        y={CY - 6}
                        textAnchor="middle"
                        fontSize="11"
                        fill="#6B7280"
                      >
                        Total
                      </text>
                      <text
                        x={CX}
                        y={CY + 10}
                        textAnchor="middle"
                        fontSize="16"
                        fontWeight="bold"
                        fill="#1A1A1A"
                      >
                        {total}
                      </text>
                    </svg>
                    <div className="space-y-2 text-sm">
                      {slices.map((s) => (
                        <div key={s.label} className="flex items-center gap-2">
                          <span
                            className="inline-block h-3 w-3 rounded-full shrink-0"
                            style={{ background: s.color }}
                          />
                          <span className="text-[#1A1A1A]">{s.label}</span>
                          <span className="text-[#6B7280]">{s.pct}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })()
            )}
          </article>
        </section>

        {/* Recent Activities */}
        <section className="rounded-xl border border-[#E5E7EB] bg-white p-6">
          <h3 className="text-lg font-semibold text-[#1A1A1A]">
            Recent Activities
          </h3>
          <div className="mt-5 space-y-4">
            {analyticsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-4"
                >
                  <div className="flex items-center gap-4">
                    <div className="crm-skeleton h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <div className="crm-skeleton h-4 w-40 rounded-md" />
                      <div className="crm-skeleton h-3 w-24 rounded-md" />
                    </div>
                  </div>
                  <div className="crm-skeleton h-6 w-20 rounded-full" />
                </div>
              ))
            ) : dashboardData?.recentActivities &&
              dashboardData.recentActivities.length > 0 ? (
              dashboardData.recentActivities.map((item) => {
                const statusClass =
                  item.status === "completed"
                    ? "bg-green-100 text-green-700"
                    : item.status === "in_progress"
                      ? "bg-[#FFF1EE] text-[#FF6B4A]"
                      : "bg-gray-100 text-[#6B7280]";
                const label =
                  item.status === "completed"
                    ? "Completed"
                    : item.status === "in_progress"
                      ? "In Progress"
                      : "Pending";
                const dateStr = item.date
                  ? new Date(item.date).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })
                  : "";
                return (
                  <article
                    key={item.id}
                    className="flex flex-wrap items-center justify-between gap-4 rounded-xl bg-gray-50 px-4 py-4"
                  >
                    <div className="flex items-center gap-4">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-[#FFF1EE] text-[#FF6B4A]">
                        <Icon name="clock" className="h-5 w-5" />
                      </span>
                      <div>
                        <p className="text-sm font-semibold text-[#1A1A1A]">
                          {item.title}
                        </p>
                        <p className="text-xs text-[#6B7280]">{dateStr}</p>
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${statusClass}`}
                    >
                      {label}
                    </span>
                  </article>
                );
              })
            ) : (
              <p className="text-sm text-[#6B7280] py-4 text-center">
                No recent activities.
              </p>
            )}
          </div>
        </section>
      </div>
    </CrmShell>
  );
}
