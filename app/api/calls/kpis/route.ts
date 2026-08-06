import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { formatDurationSeconds } from "@/lib/telecmi";
import type { CallKpis } from "@/types/call";
import { NextRequest, NextResponse } from "next/server";

const TABLE_NAME = "calls";

export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const { searchParams } = new URL(req.url);
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    console.log("[GET /api/calls/kpis] Fetching call KPIs from Supabase...", {
      dateFrom,
      dateTo,
    });
    const supabase = createServerSupabaseClient();

    let query = supabase
      .from(TABLE_NAME)
      .select("call_type, status, duration_seconds, cdr_start, created_at")
      .eq("tenant_id", tenantId);

    if (dateFrom) query = query.gte("cdr_start", dateFrom);
    if (dateTo) query = query.lte("cdr_start", dateTo);

    const { data, error } = await query;

    if (error) {
      console.error(
        "[GET /api/calls/kpis] Supabase query failed:",
        error.message,
        error,
      );
      throw error;
    }

    const rows = data || [];
    console.log("[GET /api/calls/kpis] Supabase data received:", {
      totalRows: rows.length,
    });

    const totalCalls = rows.length;
    const answeredCalls = rows.filter((r) => r.call_type === "answered").length;
    const missedCalls = rows.filter((r) => r.call_type === "missed").length;
    const activeCalls = rows.filter((r) => r.status === "Active").length;
    const rejectedCalls = rows.filter((r) => r.call_type === "rejected").length;
    const voicemailCalls = rows.filter(
      (r) => r.call_type === "voicemail",
    ).length;
    const complaintCalls = rows.filter(
      (r) => r.call_type === "complaint",
    ).length;
    const followupCalls = rows.filter((r) => r.call_type === "followup").length;
    const noResponseCalls = rows.filter(
      (r) => r.status === "No Response",
    ).length;

    const completedDurations = rows
      .filter((r) => (r.duration_seconds as number) > 0)
      .map((r) => r.duration_seconds as number);
    const avgSeconds =
      completedDurations.length > 0
        ? Math.round(
            completedDurations.reduce((sum, n) => sum + n, 0) /
              completedDurations.length,
          )
        : 0;

    // callsToday is only meaningful when no date filter is active
    const todayStart = (() => {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      return d.toISOString();
    })();
    const callsToday = dateFrom
      ? totalCalls
      : rows.filter((r) => {
          const ts = (r.cdr_start as string) || (r.created_at as string);
          return ts && ts >= todayStart;
        }).length;

    const kpis: CallKpis = {
      totalCalls,
      answeredCalls,
      missedCalls,
      activeCalls,
      rejectedCalls,
      voicemailCalls,
      complaintCalls,
      followupCalls,
      noResponseCalls,
      avgDuration: formatDurationSeconds(avgSeconds),
      callsToday,
    };

    console.log("[GET /api/calls/kpis] KPIs computed:", kpis);
    return NextResponse.json(kpis);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to fetch KPIs";
    console.error("[GET /api/calls/kpis]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
