import type { CallStatus, CallTemperature, CallType } from "@/types/call";

export type SuperfoneWebhookPayload = {
  event: string;
  superfone_number?: string;
  organization_name?: string;
  updated_key?: string;
  updated_value?: unknown;
  contact_id?: number;
  contact_first_name?: string;
  contact_last_name?: string;
  contact_phones?: { phone: string }[];
  contact_source?: string;
  contact_source_type?: string;
  contact_lead_stage_id?: number;
  contact_lead_stage_name?: string;
  contact_lead_group_id?: number;
  contact_lead_group_name?: string;
  contact_labels?: { id: number; title: string }[];
  contact_products?: { id: number; title: string }[];
  contact_assignee_user_id?: number;
  contact_business_name?: string;
  contact_additional_info?: string;
  contact_emails?: string[];
  task_id?: number;
  task_type?: string;
  task_status?: string;
  staff_first_name?: string;
  staff_last_name?: string;
  staff_phone?: string;
  cdr_id?: number;
  cdr_disposition?: string;
  cdr_duration?: number;
  cdr_call_type?: string;
  cdr_start?: string;
  cdr_answer?: string;
  cdr_end?: string;
  cdr_phone?: string;
  cdr_ringing_duration?: number;
  cdr_recording_url?: string;
  cdr_recording_status?: string;
};

export function formatDurationSeconds(seconds: number | null | undefined): string {
  if (seconds == null || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
}

export function formatCallTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function formatCallDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "—";

  const TZ = "Asia/Kolkata";

  const timeStr = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TZ,
  });

  const dateStr      = date.toLocaleDateString("en-IN", { timeZone: TZ });
  const nowStr       = new Date().toLocaleDateString("en-IN", { timeZone: TZ });
  const yd = new Date(); yd.setDate(yd.getDate() - 1);
  const yesterdayStr = yd.toLocaleDateString("en-IN", { timeZone: TZ });

  if (dateStr === nowStr) return timeStr;
  if (dateStr === yesterdayStr) return `Yesterday, ${timeStr}`;
  return (
    date.toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: TZ }) +
    ", " +
    timeStr
  );
}

export function buildCallerName(payload: SuperfoneWebhookPayload): string {
  const first = payload.contact_first_name?.trim();
  const last = payload.contact_last_name?.trim();
  const full = [first, last].filter(Boolean).join(" ");
  if (full) return full;

  const staff = [payload.staff_first_name, payload.staff_last_name]
    .filter(Boolean)
    .join(" ");
  if (staff) return staff;

  return "Unknown Caller";
}

export function extractPhone(payload: SuperfoneWebhookPayload): string {
  if (payload.cdr_phone) return payload.cdr_phone;
  const phones = payload.contact_phones ?? [];
  if (phones.length > 0 && phones[0]?.phone) return phones[0].phone;
  if (payload.staff_phone) return payload.staff_phone;
  return "";
}

export function extractTemperature(
  labels: SuperfoneWebhookPayload["contact_labels"],
): CallTemperature | null {
  const titles = (labels ?? []).map((l) => (l.title || "").toLowerCase());
  if (titles.some((t) => t.includes("hot"))) return "hot";
  if (titles.some((t) => t.includes("cold"))) return "cold";
  if (titles.some((t) => t.includes("warm"))) return "warm";
  return null;
}

export function mapDispositionToCallType(
  disposition: string | undefined,
  event: string,
): CallType {
  const d = (disposition || event || "").toLowerCase();

  if (d.includes("voicemail") || d.includes("voice_mail")) return "voicemail";
  if (d.includes("complaint")) return "complaint";
  if (d.includes("follow") || d.includes("callback")) return "followup";
  if (
    d.includes("no-answer") ||
    d.includes("no_answer") ||
    d.includes("missed") ||
    d.includes("unanswered")
  ) {
    return "missed";
  }
  if (
    d.includes("busy") ||
    d.includes("reject") ||
    d.includes("cancel") ||
    d.includes("failed")
  ) {
    return "rejected";
  }
  if (d.includes("answer") || d.includes("completed") || d.includes("connected")) {
    return "answered";
  }

  return "answered";
}

export function mapDispositionToStatus(
  disposition: string | undefined,
  event: string,
  hasEnd: boolean,
): CallStatus {
  const d = (disposition || event || "").toLowerCase();

  if (!hasEnd && (d.includes("ring") || d.includes("start") || d.includes("active"))) {
    return "Active";
  }
  if (d.includes("escalat")) return "Escalated";
  if (d.includes("voicemail") || d.includes("voice_mail")) return "Voicemail";
  if (d.includes("complaint")) return "Escalated";
  if (
    d.includes("no-answer") ||
    d.includes("no_answer") ||
    d.includes("missed") ||
    d.includes("unanswered")
  ) {
    return "Missed";
  }
  if (d.includes("no response") || d.includes("no_response")) return "No Response";
  if (
    d.includes("busy") ||
    d.includes("reject") ||
    d.includes("cancel") ||
    d.includes("failed")
  ) {
    return "Rejected";
  }

  return "Completed";
}

export function buildAssignedToName(payload: SuperfoneWebhookPayload): string {
  const staff = [payload.staff_first_name, payload.staff_last_name]
    .filter(Boolean)
    .join(" ");
  if (staff) return staff;
  return "Unassigned";
}

export function buildIvrOption(payload: SuperfoneWebhookPayload): string {
  return (
    payload.task_type ||
    payload.contact_source ||
    payload.contact_source_type ||
    payload.contact_lead_stage_name ||
    "General"
  );
}

export function payloadToCallRow(
  payload: SuperfoneWebhookPayload,
  assignedToUserId: string | null = null,
) {
  const callerName = buildCallerName(payload);
  const phone = extractPhone(payload);
  const temperature = extractTemperature(payload.contact_labels);
  const callType = mapDispositionToCallType(
    payload.cdr_disposition,
    payload.event,
  );
  const status = mapDispositionToStatus(
    payload.cdr_disposition,
    payload.event,
    Boolean(payload.cdr_end),
  );
  const durationSeconds = payload.cdr_duration ?? 0;

  return {
    superfone_cdr_id: payload.cdr_id ?? null,
    event: payload.event,
    superfone_number: payload.superfone_number ?? null,
    organization_name: payload.organization_name ?? null,
    cdr_disposition: payload.cdr_disposition ?? null,
    cdr_duration: payload.cdr_duration ?? null,
    cdr_call_type: payload.cdr_call_type ?? null,
    cdr_start: payload.cdr_start ?? null,
    cdr_answer: payload.cdr_answer ?? null,
    cdr_end: payload.cdr_end ?? null,
    cdr_phone: payload.cdr_phone ?? null,
    cdr_ringing_duration: payload.cdr_ringing_duration ?? null,
    cdr_recording_url: payload.cdr_recording_url ?? null,
    cdr_recording_status: payload.cdr_recording_status ?? null,
    contact_id: payload.contact_id ?? null,
    contact_first_name: payload.contact_first_name ?? null,
    contact_last_name: payload.contact_last_name ?? null,
    contact_phones: payload.contact_phones ?? [],
    contact_source: payload.contact_source ?? null,
    contact_source_type: payload.contact_source_type ?? null,
    contact_lead_stage_id: payload.contact_lead_stage_id ?? null,
    contact_lead_stage_name: payload.contact_lead_stage_name ?? null,
    contact_lead_group_id: payload.contact_lead_group_id ?? null,
    contact_lead_group_name: payload.contact_lead_group_name ?? null,
    contact_labels: payload.contact_labels ?? [],
    contact_products: payload.contact_products ?? [],
    contact_assignee_user_id: payload.contact_assignee_user_id ?? null,
    contact_business_name: payload.contact_business_name ?? null,
    contact_additional_info: payload.contact_additional_info ?? null,
    contact_emails: payload.contact_emails ?? [],
    task_id: payload.task_id ?? null,
    task_type: payload.task_type ?? null,
    task_status: payload.task_status ?? null,
    staff_first_name: payload.staff_first_name ?? null,
    staff_last_name: payload.staff_last_name ?? null,
    staff_phone: payload.staff_phone ?? null,
    updated_key: payload.updated_key ?? null,
    updated_value: payload.updated_value ?? null,
    caller_name: callerName,
    company: payload.contact_business_name ?? null,
    phone,
    temperature,
    call_type: callType,
    status,
    ivr_option: buildIvrOption(payload),
    assigned_to_name: buildAssignedToName(payload),
    assigned_to_user_id: assignedToUserId,
    duration_seconds: durationSeconds,
    recording_url: payload.cdr_recording_url ?? null,
    raw_payload: payload,
  };
}

export function contactUpdateFields(payload: SuperfoneWebhookPayload) {
  return {
    contact_first_name: payload.contact_first_name ?? null,
    contact_last_name: payload.contact_last_name ?? null,
    contact_phones: payload.contact_phones ?? [],
    contact_source: payload.contact_source ?? null,
    contact_source_type: payload.contact_source_type ?? null,
    contact_lead_stage_id: payload.contact_lead_stage_id ?? null,
    contact_lead_stage_name: payload.contact_lead_stage_name ?? null,
    contact_lead_group_id: payload.contact_lead_group_id ?? null,
    contact_lead_group_name: payload.contact_lead_group_name ?? null,
    contact_labels: payload.contact_labels ?? [],
    contact_products: payload.contact_products ?? [],
    contact_assignee_user_id: payload.contact_assignee_user_id ?? null,
    contact_business_name: payload.contact_business_name ?? null,
    contact_additional_info: payload.contact_additional_info ?? null,
    contact_emails: payload.contact_emails ?? [],
    caller_name: buildCallerName(payload),
    company: payload.contact_business_name ?? null,
    phone: extractPhone(payload),
    temperature: extractTemperature(payload.contact_labels),
    updated_key: payload.updated_key ?? null,
    updated_value: payload.updated_value ?? null,
    raw_payload: payload,
  };
}
