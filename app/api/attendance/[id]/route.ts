import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createNotification } from "@/lib/notifications";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

function parseTimeToDb(value: string): string | null {
  if (!value || value.trim().length === 0) return null;
  const normalized = value.trim().toUpperCase();
  const match = normalized.match(/^(\d{1,2}):(\d{2})\s?(AM|PM)$/);
  if (!match) return null;

  let hours = Number(match[1]);
  const minutes = Number(match[2]);
  const suffix = match[3];

  if (suffix === "AM" && hours === 12) hours = 0;
  if (suffix === "PM" && hours < 12) hours += 12;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
}

function formatTime(value: string | null): string | null {
  if (!value) return null;
  const [hStr, mStr] = value.split(":");
  const hours = Number(hStr);
  const minutes = Number(mStr);
  const suffix = hours >= 12 ? "PM" : "AM";
  const normalizedHours = hours % 12 === 0 ? 12 : hours % 12;
  return `${String(normalizedHours).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
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

    const { id } = await params;
    const body = await request.json();
    const supabase = createServerSupabaseClient();

    const patch: Record<string, unknown> = {};
    if (body.entryTime !== undefined)
      patch.entry_time = parseTimeToDb(String(body.entryTime));
    if (body.exitTime !== undefined)
      patch.exit_time = parseTimeToDb(String(body.exitTime));
    if (body.status !== undefined) patch.status = body.status;
    if (body.notes !== undefined)
      patch.notes = String(body.notes || "").trim() || null;

    if (patch.entry_time && patch.exit_time) {
      const entryDate = new Date(`1970-01-01T${patch.entry_time as string}`);
      const exitDate = new Date(`1970-01-01T${patch.exit_time as string}`);
      const diffHours = (exitDate.getTime() - entryDate.getTime()) / 3600000;
      patch.working_hours = diffHours > 0 ? Number(diffHours.toFixed(2)) : null;
    }

    const { data, error } = await supabase
      .from("attendance_records")
      .update(patch)
      .eq("id", Number(id))
      .eq("tenant_id", tenantId)
      .select(
        "id, user_id, date, entry_time, exit_time, working_hours, status, device_id, notes, user:users!attendance_records_user_id_fkey(id, name, department, designation)",
      )
      .single();

    if (error) throw error;

    if (data?.user_id) {
      await createNotification(supabase, {
        userId: data.user_id,
        tenantId,
        title: "Attendance Record Changed",
        message: `Your attendance record for ${data.date} was updated to ${data.status}.`,
        category: "attendance",
        eventType: "attendance_updated",
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
    console.error("Failed to update attendance record:", error);
    return NextResponse.json(
      { error: "Failed to update attendance record" },
      { status: 500 },
    );
  }
}
