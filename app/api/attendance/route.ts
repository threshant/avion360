import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createNotification } from "@/lib/notifications";
import { parsePagination } from "@/lib/pagination";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

function formatTime(value: string | null): string | null {
  if (!value) return null;
  const [hStr, mStr] = value.split(":");
  const hours = Number(hStr);
  const minutes = Number(mStr);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(normalizedHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

function parseDbTime(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  // Supports HTML time input (HH:MM) and also AM/PM text if provided.
  const twentyFourHourMatch = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (twentyFourHourMatch) {
    const hours = Number(twentyFourHourMatch[1]);
    const minutes = Number(twentyFourHourMatch[2]);
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
    }
  }

  const amPmMatch = trimmed
    .toUpperCase()
    .match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);
  if (amPmMatch) {
    let hours = Number(amPmMatch[1]);
    const minutes = Number(amPmMatch[2]);
    const suffix = amPmMatch[3];
    if (suffix === "AM" && hours === 12) hours = 0;
    if (suffix === "PM" && hours < 12) hours += 12;
    if (hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
    }
  }

  return null;
}

function computeWorkingHours(
  entryTime: string | null,
  exitTime: string | null,
) {
  if (!entryTime || !exitTime) return null;
  const entryDate = new Date(`1970-01-01T${entryTime}`);
  const exitDate = new Date(`1970-01-01T${exitTime}`);
  const diff = (exitDate.getTime() - entryDate.getTime()) / 3600000;
  if (!Number.isFinite(diff) || diff <= 0) return null;
  return Number(diff.toFixed(2));
}

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
    const { searchParams } = request.nextUrl;
    const { page, pageSize, from, to } = parsePagination(searchParams, {
      defaultPageSize: 50,
      maxPageSize: 500,
    });

    const date = searchParams.get("date");
    const department = searchParams.get("department");
    const status = searchParams.get("status");
    const search = searchParams.get("search");

    let query = supabase
      .from("attendance_records")
      .select(
        "id, user_id, date, entry_time, exit_time, working_hours, status, device_id, notes, user:users!attendance_records_user_id_fkey(id, name, department, designation)",
        { count: "exact" },
      )
      .eq("tenant_id", tenantId)
      .order("date", { ascending: false })
      .range(from, to);

    if (date) query = query.eq("date", date);
    if (status) query = query.eq("status", status);

    if (department || search) {
      let usersQuery = supabase
        .from("users")
        .select("id")
        .eq("tenant_id", tenantId);
      if (department) usersQuery = usersQuery.eq("department", department);
      if (search)
        usersQuery = usersQuery.or(
          `name.ilike.%${search}%,email.ilike.%${search}%,designation.ilike.%${search}%,department.ilike.%${search}%`,
        );

      const { data: matchingUsers, error: usersError } = await usersQuery;
      if (usersError) throw usersError;

      const userIds = (matchingUsers || []).map((u) => u.id);
      if (userIds.length === 0) {
        return NextResponse.json({ data: [], total: 0, page, pageSize });
      }

      query = query.in("user_id", userIds);
    }

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
    console.error("Failed to fetch attendance:", error);
    return NextResponse.json(
      { error: "Failed to fetch attendance" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const userId = String(body.employeeId || "").trim();
    const date = String(body.date || "").trim();
    const status = String(body.status || "Present").trim();

    if (!userId || !date) {
      return NextResponse.json(
        { error: "employeeId and date are required" },
        { status: 400 },
      );
    }

    const entryTime = parseDbTime(body.entryTime);
    const exitTime = parseDbTime(body.exitTime);
    const workingHours = computeWorkingHours(entryTime, exitTime);

    const supabase = createServerSupabaseClient();
    const payload = {
      user_id: userId,
      date,
      status,
      entry_time: entryTime,
      exit_time: exitTime,
      working_hours: workingHours,
      notes: body.notes ? String(body.notes).trim() : null,
      device_id: body.deviceId ? String(body.deviceId).trim() : null,
      tenant_id: tenantId,
    };

    const { data, error } = await supabase
      .from("attendance_records")
      .upsert(payload, { onConflict: "user_id,date" })
      .select(
        "id, user_id, date, entry_time, exit_time, working_hours, status, device_id, notes, user:users!attendance_records_user_id_fkey(id, name, department, designation)",
      )
      .single();

    if (error) throw error;

    if (data?.user_id) {
      await createNotification(supabase, {
        userId: data.user_id,
        tenantId,
        title: "Attendance Updated",
        message: `Attendance marked for ${data.date} as ${data.status}.`,
        category: "attendance",
        eventType: "attendance_marked",
        entityType: "attendance",
        entityId: String(data.id),
        actorUserId: requesterId,
        metadata: {
          attendanceId: data.id,
          status: data.status,
          date: data.date,
        },
      });
    }

    const user = Array.isArray(data.user) ? data.user[0] : data.user;

    return NextResponse.json({
      id: data.id,
      employeeId: data.user_id,
      employee: user?.name || "Unknown",
      department: user?.department || "-",
      designation: user?.designation || "-",
      date: data.date,
      entryTime: formatTime(data.entry_time),
      exitTime: formatTime(data.exit_time),
      workingHours:
        data.working_hours === null || data.working_hours === undefined
          ? null
          : `${Number(data.working_hours).toFixed(1)}h`,
      status: data.status,
      deviceId: data.device_id || undefined,
      notes: data.notes || undefined,
    });
  } catch (error) {
    console.error("Failed to create attendance record:", error);
    return NextResponse.json(
      { error: "Failed to create attendance record" },
      { status: 500 },
    );
  }
}
