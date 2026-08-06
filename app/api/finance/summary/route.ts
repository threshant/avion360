import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { getSystemSetting } from "@/services/systemSettingsService";
import { NextResponse } from "next/server";

// ── GET /api/finance/summary ───────────────────────────────────────────────────
// Returns KPI totals, 6-month chart data, commission status, and office expenses.

export async function GET(request: Request) {
  const tenantId = getTenantIdFromRequest(request as any);
  if (!tenantId) {
    return NextResponse.json(
      { error: "Tenant context required" },
      { status: 400 },
    );
  }
  const supabase = createServerSupabaseClient();

  // Check if credit flow is enabled
  let creditEnabled = true;
  try {
    const s = await getSystemSetting("credit_flow_enabled", tenantId);
    creditEnabled = s ? s.value === "true" : true;
  } catch {
    /* default true */
  }

  // ── KPI totals ───────────────────────────────────────────────────────────────
  let incomeQ = supabase
    .from("transactions")
    .select("amount")
    .eq("type", "Income")
    .eq("tenant_id", tenantId);
  let expenseQ = supabase
    .from("transactions")
    .select("amount")
    .eq("type", "Expense")
    .eq("tenant_id", tenantId);
  let commQ = supabase
    .from("transactions")
    .select("amount, status")
    .eq("type", "Commission")
    .eq("tenant_id", tenantId);

  if (!creditEnabled) {
    incomeQ = incomeQ.eq("is_credit", false);
    expenseQ = expenseQ.eq("is_credit", false);
    commQ = commQ.eq("is_credit", false);
  }

  const [incomeRes, expenseRes, commRes] = await Promise.all([
    incomeQ,
    expenseQ,
    commQ,
  ]);

  const totalIncome = sum(incomeRes.data ?? []);
  const totalExpenses = sum(expenseRes.data ?? []);
  const totalCommission = sum(commRes.data ?? []);
  const netBalance = totalIncome - totalExpenses;

  const commPaid = sumWhere(commRes.data ?? [], "status", "Completed");
  const commPending = sumWhere(commRes.data ?? [], "status", "Pending");
  const commProcessing = sumWhere(commRes.data ?? [], "status", "Processing");

  // ── Office expense categories ─────────────────────────────────────────────
  let officeQ = supabase
    .from("transactions")
    .select("amount, details")
    .eq("type", "Expense")
    .eq("tenant_id", tenantId);
  if (!creditEnabled) officeQ = officeQ.eq("is_credit", false);
  const { data: officeRows } = await officeQ;

  const officeExpenses = aggregateOfficeExpenses(officeRows ?? []);

  // ── 6-month chart data ────────────────────────────────────────────────────
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const fromDate = sixMonthsAgo.toISOString().slice(0, 10);

  let chartQ = supabase
    .from("transactions")
    .select("type, amount, date")
    .eq("tenant_id", tenantId)
    .gte("date", fromDate)
    .order("date", { ascending: true });
  if (!creditEnabled) chartQ = chartQ.eq("is_credit", false);
  const { data: chartRows } = await chartQ;

  const chartData = buildChartData(chartRows ?? []);

  return NextResponse.json({
    kpi: { totalIncome, totalExpenses, totalCommission, netBalance },
    commissionStatus: {
      paid: commPaid,
      pending: commPending,
      processing: commProcessing,
    },
    creditEnabled,
    officeExpenses,
    chartData,
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sum(rows: { amount: unknown }[]) {
  return rows.reduce((s, r) => s + Number(r.amount), 0);
}

function sumWhere(
  rows: { amount: unknown; status: unknown }[],
  key: string,
  val: string,
) {
  return rows
    .filter((r: Record<string, unknown>) => r[key] === val)
    .reduce((s, r) => s + Number(r.amount), 0);
}

function aggregateOfficeExpenses(
  rows: { amount: unknown; details: unknown }[],
) {
  const cats: Record<string, number> = {
    "Rent & Utilities": 0,
    "Office Supplies": 0,
    Equipment: 0,
  };
  for (const row of rows) {
    const d = String(row.details ?? "");
    if (d.includes("Rent")) cats["Rent & Utilities"] += Number(row.amount);
    else if (d.includes("Office") || d.includes("Supplies"))
      cats["Office Supplies"] += Number(row.amount);
    else if (d.includes("Equipment")) cats["Equipment"] += Number(row.amount);
    else cats["Rent & Utilities"] += Number(row.amount);
  }
  return cats;
}

function buildChartData(
  rows: { type: unknown; amount: unknown; date: unknown }[],
) {
  const months: string[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(
      d.toLocaleString("en-US", { month: "short" }) + "-" + d.getFullYear(),
    );
  }

  const income = new Array(6).fill(0);
  const expense = new Array(6).fill(0);
  const commission = new Array(6).fill(0);

  for (const row of rows) {
    const d = new Date(String(row.date));
    const label =
      d.toLocaleString("en-US", { month: "short" }) + "-" + d.getFullYear();
    const idx = months.indexOf(label);
    if (idx === -1) continue;
    const amt = Number(row.amount);
    if (row.type === "Income") income[idx] += amt;
    if (row.type === "Expense") expense[idx] += amt;
    if (row.type === "Commission") commission[idx] += amt;
  }

  return {
    months: months.map((m) => m.split("-")[0]),
    income,
    expense,
    commission,
  };
}
