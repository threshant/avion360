import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const requesterId = getUserIdFromRequest(request);
    if (!requesterId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();
    const date =
      request.nextUrl.searchParams.get("date") ||
      new Date().toISOString().split("T")[0];

    const [
      { data: users, error: usersError },
      { data: records, error: recError },
    ] = await Promise.all([
      supabase
        .from("users")
        .select("id")
        .eq("is_active", true)
        .eq("tenant_id", tenantId),
      supabase
        .from("attendance_records")
        .select("status")
        .eq("date", date)
        .eq("tenant_id", tenantId),
    ]);

    if (usersError) throw usersError;
    if (recError) throw recError;

    const summary = {
      date,
      totalEmployees: (users || []).length,
      present: 0,
      late: 0,
      absent: 0,
      onLeave: 0,
    };

    (records || []).forEach((row: any) => {
      if (row.status === "Present") summary.present += 1;
      if (row.status === "Late") summary.late += 1;
      if (row.status === "Absent") summary.absent += 1;
      if (row.status === "On Leave") summary.onLeave += 1;
    });

    return NextResponse.json(summary);
  } catch (error) {
    console.error("Failed to fetch attendance summary:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance summary" },
      { status: 500 },
    );
  }
}
