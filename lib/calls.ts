import { formatCallDateTime, formatDurationSeconds } from "@/lib/telecmi";
import type { CallRecord } from "@/types/call";

export function mapDbRowToCallRecord(row: Record<string, unknown>): CallRecord {
  const durationSeconds = (row.duration_seconds as number) ?? 0;
  const status = row.status as string;
  const duration =
    status === "Active"
      ? "In Progress"
      : formatDurationSeconds(durationSeconds);

  return {
    id: row.id as number,
    caller: (row.caller_name as string) || "Unknown Caller",
    company: (row.company as string) || null,
    phone: (row.phone as string) || "",
    temperature: (row.temperature as CallRecord["temperature"]) ?? null,
    type: row.call_type as CallRecord["type"],
    ivrOption: (row.ivr_option as string) || "General",
    assignedTo: (row.assigned_to_name as string) || "Unassigned",
    assignedToUserId: (row.assigned_to_user_id as string) || null,
    direction: (row.direction as CallRecord["direction"]) ?? "inbound",
    duration,
    time: formatCallDateTime(
      (row.cdr_start as string) || (row.created_at as string),
    ),
    status: row.status as CallRecord["status"],
    recordingUrl: (row.recording_url as string) || undefined,
    notes: (row.notes as string) || undefined,
  };
}
