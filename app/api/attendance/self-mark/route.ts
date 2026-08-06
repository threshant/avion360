import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

function parseDbTime(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;
  const match = trimmed.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:00`;
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

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
) {
  const earthRadius = 6371000;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function parseNumericSetting(value: string | null | undefined) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (!trimmed) return null;

  try {
    const parsed = JSON.parse(trimmed);
    if (typeof parsed === "number") return parsed;
    if (parsed && typeof parsed === "object") {
      if (typeof parsed.latitude === "number") return parsed.latitude;
      if (typeof parsed.longitude === "number") return parsed.longitude;
      if (typeof parsed.radiusMeters === "number") return parsed.radiusMeters;
      if (typeof parsed.radius === "number") return parsed.radius;
    }
  } catch {
    // fall back to plain numeric parsing below
  }

  const asNumber = Number(trimmed);
  return Number.isFinite(asNumber) ? asNumber : null;
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
    const latitude = Number(body.latitude);
    const longitude = Number(body.longitude);
    const accuracy = body.accuracy != null ? Number(body.accuracy) : undefined;
    const notes = body.notes ? String(body.notes).trim() : undefined;

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { error: "Valid latitude and longitude are required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();
    const { data: settingsRows, error: settingsError } = await supabase
      .from("system_settings")
      .select("key,value")
      .eq("tenant_id", tenantId)
      .in("key", [
        "ATTENDANCE_LOCATION_LAT",
        "ATTENDANCE_LOCATION_LNG",
        "ATTENDANCE_LOCATION_RADIUS",
      ]);

    if (settingsError) throw settingsError;

    const allowedLatitude = parseNumericSetting(
      settingsRows?.find((row) => row.key === "ATTENDANCE_LOCATION_LAT")?.value,
    );
    const allowedLongitude = parseNumericSetting(
      settingsRows?.find((row) => row.key === "ATTENDANCE_LOCATION_LNG")?.value,
    );
    const allowedRadius = parseNumericSetting(
      settingsRows?.find((row) => row.key === "ATTENDANCE_LOCATION_RADIUS")
        ?.value,
    );

    if (
      !Number.isFinite(allowedLatitude) ||
      !Number.isFinite(allowedLongitude) ||
      !Number.isFinite(allowedRadius)
    ) {
      return NextResponse.json(
        {
          error:
            "Attendance location is not configured yet. Please configure the office coordinates and radius first.",
        },
        { status: 400 },
      );
    }

    const distanceMeters = calculateDistanceMeters(
      latitude,
      longitude,
      allowedLatitude,
      allowedLongitude,
    );
    const isWithinRange = distanceMeters <= allowedRadius;

    const today = new Date().toISOString().split("T")[0];
    const entryTime = parseDbTime(new Date().toTimeString().slice(0, 5));
    const exitTime = null;
    const workingHours = computeWorkingHours(entryTime, exitTime);

    const payload = {
      user_id: requesterId,
      date: today,
      status: isWithinRange ? "Present" : "Absent",
      entry_time: entryTime,
      exit_time: exitTime,
      working_hours: workingHours,
      notes: notes
        ? notes
        : isWithinRange
          ? "Self-marked from approved location"
          : "Self-marked outside configured location",
      device_id: accuracy != null ? `geo:${Math.round(accuracy)}` : null,
      location_latitude: latitude,
      location_longitude: longitude,
      location_accuracy: accuracy != null ? accuracy : null,
      location_verified: isWithinRange,
      location_distance_meters: Math.round(distanceMeters),
      tenant_id: tenantId,
    };

    const { data, error } = await supabase
      .from("attendance_records")
      .upsert(payload, { onConflict: "user_id,date" })
      .select(
        "id, user_id, date, entry_time, exit_time, working_hours, status, device_id, notes, location_latitude, location_longitude, location_accuracy, location_verified, location_distance_meters, user:users!attendance_records_user_id_fkey(id, name, department, designation)",
      )
      .single();

    if (error) throw error;

    const user = Array.isArray(data.user) ? data.user[0] : data.user;

    return NextResponse.json({
      id: data.id,
      employeeId: data.user_id,
      employee: user?.name || "Unknown",
      department: user?.department || "-",
      designation: user?.designation || "-",
      date: data.date,
      entryTime: data.entry_time
        ? new Date(`1970-01-01T${data.entry_time}`).toLocaleTimeString(
            "en-IN",
            { hour: "numeric", minute: "2-digit" },
          )
        : null,
      exitTime: null,
      workingHours:
        data.working_hours === null || data.working_hours === undefined
          ? null
          : `${Number(data.working_hours).toFixed(1)}h`,
      status: data.status,
      deviceId: data.device_id || undefined,
      notes: data.notes || undefined,
      locationStatus: isWithinRange ? "verified" : "outside_location",
      locationMessage: isWithinRange
        ? `Marked successfully from your current location (${Math.round(distanceMeters)}m away from the configured office).`
        : `You are ${Math.round(distanceMeters)}m away from the configured office, so the attendance was not accepted.`,
      distanceMeters: Math.round(distanceMeters),
    });
  } catch (error) {
    console.error("Failed to self mark attendance:", error);
    return NextResponse.json(
      { error: "Failed to self mark attendance" },
      { status: 500 },
    );
  }
}
