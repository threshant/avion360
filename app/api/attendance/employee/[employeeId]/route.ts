import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { parsePagination } from "@/lib/pagination";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

function formatTime(value: string | null): string | null {
  if (!value) return null;
  const [hStr, mStr] = value.split(":");
  const hours = Number(hStr);
  const minutes = Number(mStr);
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(normalizedHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> },
) {
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

    const { employeeId } = await params;
    const supabase = createServerSupabaseClient();
    const { page, pageSize, from, to } = parsePagination(
      request.nextUrl.searchParams,
      {
        defaultPageSize: 50,
        maxPageSize: 500,
      },
    );
    const date = request.nextUrl.searchParams.get("date");

    let query = supabase
      .from("attendance_records")
      .select(
        "id, user_id, date, entry_time, exit_time, working_hours, status, device_id, notes, user:users!attendance_records_user_id_fkey(id, name, department, designation)",
        { count: "exact" },
      )
      .eq("user_id", employeeId)
      .eq("tenant_id", tenantId)
      .order("date", { ascending: false })
      .range(from, to);

    if (date) query = query.eq("date", date);

    const { data, count, error } = await query;
    if (error) throw error;

    const mapped = (data || []).map((row: any) => ({
      id: row.id,
      employeeId: row.user_id,
      employee: row.user?.name || "Unknown",
      department: row.user?.department || "-",
      designation: row.user?.designation || "-",
      date: row.date,
      entryTime: formatTime(row.entry_time),
      exitTime: formatTime(row.exit_time),
      workingHours:
        row.working_hours === null || row.working_hours === undefined
          ? null
          : `${Number(row.working_hours).toFixed(1)}h`,
      status: row.status,
      deviceId: row.device_id || undefined,
      notes: row.notes || undefined,
    }));

    return NextResponse.json({
      data: mapped,
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Failed to fetch attendance by employee:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance by employee" },
      { status: 500 },
    );
  }
}
