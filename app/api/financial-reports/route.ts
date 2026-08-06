import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest } from "next/server";

// GET /api/financial-reports?type=pl|cashflow|summary&from=YYYY-MM&to=YYYY-MM
export async function GET(request: NextRequest) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const supabase = createServerSupabaseClient();
  const { searchParams } = request.nextUrl;

  const type = searchParams.get("type") ?? "summary";
  const fromDate = searchParams.get("from") ?? getMonthsAgo(11);
  const toDate = searchParams.get("to") ?? today();

  const { data: txns, error } = await supabase
    .from("transactions")
    .select("type, amount, date, details, status")
    .eq("tenant_id", tenantId)
    .gte("date", fromDate)
    .lte("date", toDate + "-31")
    .order("date", { ascending: true });

  if (error) return Response.json({ error: error.message }, { status: 500 });

  const { data: invoices } = await supabase
    .from("invoices")
    .select("status, total_amount, due_date, date")
    .eq("tenant_id", tenantId)
    .gte("date", fromDate)
    .lte("date", toDate + "-31");

  const rows = txns ?? [];
  const invRows = invoices ?? [];

  if (type === "pl") {
    return Response.json(buildPL(rows, invRows, fromDate, toDate));
  }
  if (type === "cashflow") {
    return Response.json(buildCashFlow(rows, invRows, fromDate, toDate));
  }

  // summary
  return Response.json(buildSummary(rows, invRows));
}

// ── P&L ───────────────────────────────────────────────────────────────────────

function buildPL(
  rows: { type: string; amount: number; date: string; details: string }[],
  invRows: { status: string; total_amount: number; date: string }[],
  fromDate: string,
  toDate: string,
) {
  const months = monthRange(fromDate, toDate);
  const monthlyData: Record<
    string,
    { income: number; expense: number; commission: number }
  > = {};

  for (const m of months) {
    monthlyData[m] = { income: 0, expense: 0, commission: 0 };
  }

  let totalIncome = 0;
  let totalExpense = 0;
  let totalCommission = 0;

  for (const row of rows) {
    const m = row.date.slice(0, 7);
    if (!monthlyData[m]) continue;
    const amt = Number(row.amount);
    if (row.type === "Expense") {
      monthlyData[m].expense += amt;
      totalExpense += amt;
    } else if (row.type === "Commission") {
      monthlyData[m].commission += amt;
      totalCommission += amt;
    }
  }

  for (const invoice of invRows) {
    if (invoice.status !== "Paid") continue;
    const m = String(invoice.date).slice(0, 7);
    if (!monthlyData[m]) continue;
    const amt = Number(invoice.total_amount);
    monthlyData[m].income += amt;
    totalIncome += amt;
  }

  const netProfit = totalIncome + totalCommission - totalExpense;
  const margin =
    totalIncome + totalCommission > 0
      ? ((netProfit / (totalIncome + totalCommission)) * 100).toFixed(1)
      : "0.0";

  return {
    type: "pl",
    months,
    monthlyData,
    totals: { totalIncome, totalExpense, totalCommission, netProfit },
    margin,
  };
}

// ── Cash Flow ─────────────────────────────────────────────────────────────────

function buildCashFlow(
  rows: { type: string; amount: number; date: string }[],
  invRows: { status: string; total_amount: number; date: string }[],
  fromDate: string,
  toDate: string,
) {
  const months = monthRange(fromDate, toDate);
  const inflow: Record<string, number> = {};
  const outflow: Record<string, number> = {};

  for (const m of months) {
    inflow[m] = 0;
    outflow[m] = 0;
  }

  for (const row of rows) {
    const m = row.date.slice(0, 7);
    if (!inflow[m]) continue;
    const amt = Number(row.amount);
    if (row.type === "Commission") inflow[m] += amt;
    else if (row.type === "Expense") outflow[m] += amt;
  }

  for (const invoice of invRows) {
    if (invoice.status !== "Paid") continue;
    const m = String(invoice.date).slice(0, 7);
    if (!inflow[m]) continue;
    inflow[m] += Number(invoice.total_amount);
  }

  const netFlow = months.map((m) => ({
    month: m,
    inflow: inflow[m],
    outflow: outflow[m],
    net: inflow[m] - outflow[m],
  }));

  return { type: "cashflow", months, inflow, outflow, netFlow };
}

// ── Summary ───────────────────────────────────────────────────────────────────

function buildSummary(
  rows: { type: string; amount: number; status?: string }[],
  invRows: {
    status: string;
    total_amount: number;
    due_date: string;
    date: string;
  }[],
) {
  const totalIncome = invRows
    .filter((i) => i.status === "Paid")
    .reduce((s, i) => s + Number(i.total_amount), 0);
  const totalExpense = rows
    .filter((r) => r.type === "Expense")
    .reduce((s, r) => s + Number(r.amount), 0);
  const totalCommission = rows
    .filter((r) => r.type === "Commission")
    .reduce((s, r) => s + Number(r.amount), 0);

  const todayStr = today() + "-31";
  const arTotal = invRows
    .filter((i) => ["Pending", "Sent", "Overdue"].includes(i.status))
    .reduce((s, i) => s + Number(i.total_amount), 0);
  const overdueAR = invRows
    .filter(
      (i) =>
        i.status === "Overdue" ||
        (i.due_date < todayStr && i.status !== "Paid"),
    )
    .reduce((s, i) => s + Number(i.total_amount), 0);

  return {
    type: "summary",
    totalIncome,
    totalExpense,
    totalCommission,
    netProfit: totalIncome + totalCommission - totalExpense,
    arTotal,
    overdueAR,
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function today() {
  return new Date().toISOString().slice(0, 7);
}

function getMonthsAgo(n: number) {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  return d.toISOString().slice(0, 7);
}

function monthRange(from: string, to: string): string[] {
  const months: string[] = [];
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  let y = fy;
  let m = fm;
  while (y < ty || (y === ty && m <= tm)) {
    months.push(`${y}-${String(m).padStart(2, "0")}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return months;
}
