import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import {
  getSystemSetting,
  getSystemSettings,
} from "@/services/systemSettingsService";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const tenantId = getTenantIdFromRequest(req);
  if (!tenantId) {
    return NextResponse.json(
      { error: "Tenant context required" },
      { status: 400 },
    );
  }
  const { searchParams } = new URL(req.url);
  // from/to are YYYY-MM-DD date strings from the period picker
  const fromDate = searchParams.get("from"); // e.g. "2026-06-24"
  const toDate = searchParams.get("to"); // e.g. "2026-06-24"

  // Convert to ISO timestamps for Supabase range filters
  const fromIso = fromDate ? `${fromDate}T00:00:00.000Z` : null;
  const toIso = toDate ? `${toDate}T23:59:59.999Z` : null;

  // ── Supabase metrics ─────────────────────────────────────────────────────────
  const supabase = createServerSupabaseClient();

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const trendFrom = sixMonthsAgo.toISOString().slice(0, 10);

  // Check credit flow setting first
  let creditEnabled = true;
  try {
    const s = await getSystemSetting("credit_flow_enabled", tenantId);
    creditEnabled = s ? s.value === "true" : true;
  } catch {
    /* default true */
  }

  // Invoice count — filtered by period
  let invoiceCountQuery = supabase
    .from("invoices")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if (fromIso) invoiceCountQuery = invoiceCountQuery.gte("created_at", fromIso);
  if (toIso) invoiceCountQuery = invoiceCountQuery.lte("created_at", toIso);

  // Quotation count — filtered by period
  let quotationCountQuery = supabase
    .from("quotations")
    .select("*", { count: "exact", head: true })
    .eq("tenant_id", tenantId);
  if (fromIso)
    quotationCountQuery = quotationCountQuery.gte("created_at", fromIso);
  if (toIso) quotationCountQuery = quotationCountQuery.lte("created_at", toIso);

  // Paid invoices for turnover — filtered by invoice date
  let turnoverQuery = supabase
    .from("invoices")
    .select("total_amount, gst_amount, subtotal")
    .eq("tenant_id", tenantId)
    .eq("status", "Paid");
  if (fromDate) turnoverQuery = turnoverQuery.gte("date", fromDate);
  if (toDate) turnoverQuery = turnoverQuery.lte("date", toDate);

  // All invoices for status breakdown — filtered by period
  let invoiceStatusQuery = supabase
    .from("invoices")
    .select("status, total_amount")
    .eq("tenant_id", tenantId);
  if (fromIso)
    invoiceStatusQuery = invoiceStatusQuery.gte("created_at", fromIso);
  if (toIso) invoiceStatusQuery = invoiceStatusQuery.lte("created_at", toIso);

  // Transactions for income/expense — filtered by period
  let txnQuery = supabase
    .from("transactions")
    .select("type, amount")
    .eq("tenant_id", tenantId);
  if (!creditEnabled) txnQuery = txnQuery.eq("is_credit", false);
  if (fromIso) txnQuery = txnQuery.gte("created_at", fromIso);
  if (toIso) txnQuery = txnQuery.lte("created_at", toIso);

  // Recent tasks — always last 4 regardless of period for context
  const recentTasksQuery = supabase
    .from("tasks")
    .select("id, title, status, due_date, created_at")
    .eq("tenant_id", tenantId)
    .order("created_at", { ascending: false })
    .limit(4);

  const [
    invoiceCountRes,
    quotationCountRes,
    turnoverRes,
    invoiceStatusRes,
    warehouseRes,
    txnRes,
    revenueTrendRes,
    recentTasksRes,
  ] = await Promise.all([
    invoiceCountQuery,
    quotationCountQuery,
    turnoverQuery,
    invoiceStatusQuery,
    supabase
      .from("warehouses")
      .select("id, name, inventory_items(cbm)")
      .eq("tenant_id", tenantId),
    txnQuery,
    supabase
      .from("invoices")
      .select("date, total_amount")
      .eq("tenant_id", tenantId)
      .gte("date", trendFrom)
      .order("date", { ascending: true }),
    recentTasksQuery,
  ]);

  // KPIs from Supabase
  const totalInvoices = invoiceCountRes.count ?? 0;
  const totalQuotations = quotationCountRes.count ?? 0;

  const paidInvoices = turnoverRes.data ?? [];
  const turnover = paidInvoices.reduce((s, r) => s + Number(r.total_amount), 0);
  const gstCollected = paidInvoices.reduce(
    (s, r) => s + Number(r.gst_amount),
    0,
  );
  const netTurnover = paidInvoices.reduce((s, r) => s + Number(r.subtotal), 0);

  // Invoicing status breakdown
  const allInvoices = invoiceStatusRes.data ?? [];
  const invoicingStatus = {
    paid: allInvoices
      .filter((r) => r.status === "Paid")
      .reduce((s, r) => s + Number(r.total_amount), 0),
    pending: allInvoices
      .filter((r) => r.status === "Pending" || r.status === "Sent")
      .reduce((s, r) => s + Number(r.total_amount), 0),
    overdue: allInvoices
      .filter((r) => r.status === "Overdue")
      .reduce((s, r) => s + Number(r.total_amount), 0),
  };

  // Warehouse CBM summary (not date-filtered — current state)
  const warehouseSummary = (warehouseRes.data ?? []).map(
    (w: Record<string, unknown>) => {
      const items = (w.inventory_items as { cbm: unknown }[] | null) ?? [];
      const totalCbm = items.reduce((s, i) => s + Number(i.cbm), 0);
      return { name: w.name as string, cbm: Math.round(totalCbm * 10) / 10 };
    },
  );

  // Income / Expense totals from transactions
  const txns = txnRes.data ?? [];
  const totalIncome = txns
    .filter((t) => t.type === "Income")
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalExpenses = txns
    .filter((t) => t.type === "Expense")
    .reduce((s, t) => s + Number(t.amount), 0);
  const netProfit = totalIncome - totalExpenses;

  // Revenue trend — always 6-month rolling (not affected by period picker)
  const monthLabels = buildMonthLabels(6);
  const revenueByMonth = new Array(6).fill(0);
  for (const row of revenueTrendRes.data ?? []) {
    const idx = monthIndex(monthLabels, String(row.date));
    if (idx !== -1) revenueByMonth[idx] += Number(row.total_amount);
  }

  // Recent tasks as activities
  const recentActivities = (recentTasksRes.data ?? []).map(
    (t: Record<string, unknown>) => ({
      id: t.id,
      title: t.title,
      status: t.status,
      date: t.due_date ?? t.created_at,
    }),
  );

  // ── Aviontive API ─────────────────────────────────────────────────────────────
  let aviontiveData: {
    totalConversations: number;
    totalLeads: number;
    channels: unknown[];
  } = {
    totalConversations: 0,
    totalLeads: 0,
    channels: [],
  };

  try {
    let apiKey = process.env.AVIONTIVE_API_KEY;
    let brandId = process.env.AVIONTIVE_BRAND_ID;
    let baseUrl =
      process.env.AVIONTIVE_API_BASE_URL || "https://box.aviontive.com/api";

    try {
      const settings = await getSystemSettings(
        ["AVIONTIVE_API_KEY", "AVIONTIVE_BRAND_ID", "AVIONTIVE_API_BASE_URL"],
        tenantId,
      );
      apiKey =
        settings.find((s) => s.key === "AVIONTIVE_API_KEY")?.value || apiKey;
      brandId =
        settings.find((s) => s.key === "AVIONTIVE_BRAND_ID")?.value || brandId;
      baseUrl =
        settings.find((s) => s.key === "AVIONTIVE_API_BASE_URL")?.value ||
        baseUrl;
    } catch {
      // fall back to env
    }

    if (apiKey && brandId && baseUrl) {
      const urlObj = new URL(`${baseUrl}/analytics/dashboard/overview`);
      urlObj.searchParams.append("brand_id", brandId);
      if (fromDate) urlObj.searchParams.append("from", fromDate);
      if (toDate) urlObj.searchParams.append("to", toDate);

      const resp = await fetch(urlObj.toString(), {
        method: "GET",
        headers: { "X-API-Key": apiKey, "Content-Type": "application/json" },
      });
      if (resp.ok) {
        const json = await resp.json();
        aviontiveData = {
          totalConversations: json.data?.totalConversations ?? 0,
          totalLeads: json.data?.totalLeads ?? 0,
          channels: json.data?.channels ?? [],
        };
      }
    }
  } catch (err) {
    console.error("Aviontive API error (non-fatal):", err);
  }

  return NextResponse.json({
    data: {
      // Aviontive (period-filtered via API params)
      totalConversations: aviontiveData.totalConversations,
      totalLeads: aviontiveData.totalLeads,
      channels: aviontiveData.channels,
      // Supabase — counts (period-filtered)
      totalInvoices,
      totalQuotations,
      // Supabase — finance (period-filtered)
      turnover,
      gstCollected,
      netTurnover,
      totalIncome,
      totalExpenses,
      netProfit,
      // Supabase — invoicing status (period-filtered)
      invoicingStatus,
      // Supabase — warehouses (current state, not date-filtered)
      warehouseSummary,
      // Supabase — 6-month revenue trend (always rolling, not period-filtered)
      revenueTrend: {
        months: monthLabels.map((m) => m.split("-")[0]),
        values: revenueByMonth,
      },
      // Supabase — recent tasks/activities
      recentActivities,
    },
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function buildMonthLabels(count: number): string[] {
  const labels: string[] = [];
  const now = new Date();
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    labels.push(
      d.toLocaleString("en-US", { month: "short" }) + "-" + d.getFullYear(),
    );
  }
  return labels;
}

function monthIndex(labels: string[], dateStr: string): number {
  const d = new Date(dateStr);
  const label =
    d.toLocaleString("en-US", { month: "short" }) + "-" + d.getFullYear();
  return labels.indexOf(label);
}
