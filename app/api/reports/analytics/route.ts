import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

// ── GET /api/reports/analytics ────────────────────────────────────────────────
// Returns 6-month revenue (from invoices) and 6-month lead counts (from invoices proxy).

export async function GET(request: Request) {
  const tenantId = getTenantIdFromRequest(request as any);
  if (!tenantId) {
    return NextResponse.json(
      { error: "Tenant context required" },
      { status: 400 },
    );
  }
  const supabase = createServerSupabaseClient();

  // Date range: start of month 5 months ago → today
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  const fromDate = sixMonthsAgo.toISOString().slice(0, 10);

  // Revenue per month from invoices
  const { data: invoiceRows, error: invErr } = await supabase
    .from("invoices")
    .select("date, total_amount, status")
    .eq("tenant_id", tenantId)
    .gte("date", fromDate)
    .order("date", { ascending: true });

  if (invErr) {
    return NextResponse.json({ error: invErr.message }, { status: 500 });
  }

  // Client count per month as a proxy for "leads converted"
  const { data: clientRows, error: clientErr } = await supabase
    .from("clients")
    .select("created_at")
    .eq("tenant_id", tenantId)
    .gte("created_at", fromDate)
    .order("created_at", { ascending: true });

  if (clientErr) {
    return NextResponse.json({ error: clientErr.message }, { status: 500 });
  }

  const months = buildMonthLabels(6);
  const revenue = new Array(6).fill(0);
  const leads = new Array(6).fill(0);

  for (const row of invoiceRows ?? []) {
    const idx = monthIndex(months, String(row.date));
    if (idx !== -1) revenue[idx] += Number(row.total_amount);
  }

  for (const row of clientRows ?? []) {
    const idx = monthIndex(months, String(row.created_at).slice(0, 10));
    if (idx !== -1) leads[idx]++;
  }

  return NextResponse.json({
    months: months.map((m) => m.split("-")[0]),
    revenue,
    leads,
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
