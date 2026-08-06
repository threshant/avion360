/**
 * TeleCMI integration helpers
 *
 * Covers:
 *  – Webhook CDR payload types (inbound missed, inbound answered, outbound)
 *  – Live event payload types (ringing, answered, hangup)
 *  – Mapping helpers for the CRM calls table
 *
 * TeleCMI API base: https://rest.telecmi.com/v2/
 * Docs: https://doc.telecmi.com/chub/
 */

import type { CallStatus, CallType } from "@/types/call";

const TELECMI_API_BASE = "https://rest.telecmi.com/v2";
const TELECMI_AGENT_API_BASE = "https://rest.telecmi.com/v3";

export const TELECMI_INSIGHTS_ENDPOINTS = {
  incomingAnswered: `${TELECMI_API_BASE}/answered`,
  incomingMissed: `${TELECMI_API_BASE}/missed`,
  outgoingAnswered: `${TELECMI_API_BASE}/out_answered`,
  outgoingMissed: `${TELECMI_API_BASE}/out_missed`,
} as const;

const TELECMI_AGENT_LIST_ENDPOINT = `${TELECMI_AGENT_API_BASE}/user/list`;

type TelecmiRestParams = {
  startDate?: number;
  endDate?: number;
  page?: number;
  limit?: number;
};

type TelecmiRestResponse = {
  code?: number;
  msg?: string;
  count?: number;
  cdr?: unknown[];
};

type TelecmiAgentListResponse = {
  code?: number;
  status?: string;
  msg?: string;
  count?: number;
  agents?: Array<Record<string, unknown>>;
};

export type TelecmiAgentRecord = {
  agentId: string;
  firstName: string;
  lastName: string;
  fullName: string;
};

function getTelecmiCredentials() {
  const appId = process.env.TELECMI_APP_ID;
  const appSecret = process.env.TELECMI_APP_SECRET;

  if (!appId || !appSecret) {
    throw new Error(
      "TeleCMI credentials not configured. Set TELECMI_APP_ID and TELECMI_APP_SECRET in env.",
    );
  }

  return { appId, appSecret };
}

export async function postTelecmiRestEndpoint(
  endpoint: keyof typeof TELECMI_INSIGHTS_ENDPOINTS,
  params: TelecmiRestParams = {},
): Promise<TelecmiRestResponse> {
  const { appId, appSecret } = getTelecmiCredentials();

  const payload: Record<string, number | string> = {
    appid: Number(appId),
    secret: appSecret,
  };

  if (typeof params.startDate === "number")
    payload.start_date = params.startDate;
  if (typeof params.endDate === "number") payload.end_date = params.endDate;
  if (typeof params.page === "number") payload.page = params.page;
  if (typeof params.limit === "number") payload.limit = params.limit;

  const response = await fetch(TELECMI_INSIGHTS_ENDPOINTS[endpoint], {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
    cache: "no-store",
  });

  let data: TelecmiRestResponse;
  try {
    data = (await response.json()) as TelecmiRestResponse;
  } catch {
    throw new Error(`TeleCMI returned a non-JSON response for ${endpoint}.`);
  }

  if (!response.ok || data.code === 400 || data.code === 404) {
    throw new Error(data.msg || `TeleCMI request failed for ${endpoint}.`);
  }

  return data;
}

export async function fetchTelecmiAgents(): Promise<TelecmiAgentRecord[]> {
  const { appId, appSecret } = getTelecmiCredentials();
  const pageSize = 100;
  let page = 1;
  let total = Number.POSITIVE_INFINITY;
  const agents: TelecmiAgentRecord[] = [];

  while ((page - 1) * pageSize < total) {
    const response = await fetch(TELECMI_AGENT_LIST_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        appid: Number(appId),
        secret: appSecret,
        page,
        limit: pageSize,
      }),
      cache: "no-store",
    });

    let data: TelecmiAgentListResponse;
    try {
      data = (await response.json()) as TelecmiAgentListResponse;
    } catch {
      throw new Error("TeleCMI returned a non-JSON response for agent list.");
    }

    if (
      !response.ok ||
      data.code === 400 ||
      data.code === 401 ||
      data.code === 500
    ) {
      throw new Error(data.msg || "TeleCMI agent list request failed.");
    }

    total = Number(data.count ?? 0);
    const pageAgents = Array.isArray(data.agents) ? data.agents : [];

    agents.push(
      ...pageAgents.flatMap((agent) => {
        const agentId = String(agent.agent_id ?? "").trim();
        if (!agentId) return [];

        const firstName = String(agent.first_name ?? "").trim();
        const lastName = String(agent.last_name ?? "").trim();
        const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

        return [
          {
            agentId,
            firstName,
            lastName,
            fullName: fullName || agentId,
          },
        ];
      }),
    );

    if (pageAgents.length < pageSize) break;
    page += 1;
  }

  return agents;
}

// ─── Webhook Payload Types ────────────────────────────────────────────────────

/** Inbound missed CDR  (status === 'missed', direction === 'inbound') */
export type TeleCmiInboundMissedCdr = {
  type: "cdr";
  direction: "inbound";
  status: "missed";
  virtual_number: number | string;
  cmiuuid: string;
  appid: number;
  from: number | string;
  time: number; // UTC ms timestamp
  waitedsec: number;
  hangup_reason: string;
  voicemail: boolean;
  voicename?: string;
  team?: string;
  ivr_name?: string;
  conversation_uuid?: string;
  custom?: string;
};

/** Inbound answered CDR (status === 'answered', direction === 'inbound') */
export type TeleCmiInboundAnsweredCdr = {
  type: "cdr";
  direction: "inbound";
  status: "answered";
  virtual_number: number | string;
  cmiuuid: string;
  appid: number;
  from: number | string;
  to?: number | string;
  time: number;
  duration?: number; // total seconds from ring
  answeredsec?: number; // billable / answered seconds
  billedsec?: number;
  agent?: string;
  hangup_reason?: string;
  record?: string | boolean;
  filename?: string;
  team?: string;
  ivr_name?: string;
  conversation_uuid?: string;
  custom?: string;
};

/** Outbound answered CDR */
export type TeleCmiOutboundAnsweredCdr = {
  type: "cdr";
  direction: "outbound";
  status: "answered";
  virtual_number: number | string;
  call_id?: string;
  cmiuuid: string;
  appid: number;
  to: number | string;
  user?: string; // agent user id e.g. "202_2222223"
  time: number;
  answeredsec?: number;
  hangup_reason?: string;
  request_id?: string;
  extra_params?: string;
  record?: boolean | string;
  filename?: string;
  custom?: string;
  leg?: "a" | "b";
};

/** Outbound missed/unanswered CDR */
export type TeleCmiOutboundMissedCdr = {
  type: "cdr";
  direction: "outbound";
  status: "missed" | "no-answer" | "busy" | "failed";
  virtual_number: number | string;
  cmiuuid: string;
  appid: number;
  to: number | string;
  user?: string;
  time: number;
  hangup_reason?: string;
  request_id?: string;
  custom?: string;
};

/** Live event — call ringing / answered / hangup */
export type TeleCmiLiveEvent = {
  type: "event";
  event?: string; // e.g. "call_ringing", "call_answered", "call_hangup"
  direction?: "inbound" | "outbound";
  status?: string;
  virtual_number?: number | string;
  cmiuuid?: string;
  from?: number | string;
  to?: number | string;
  agent?: string;
  appid?: number;
  time?: number;
  custom?: string;
};

export type TeleCmiWebhookPayload =
  | TeleCmiInboundMissedCdr
  | TeleCmiInboundAnsweredCdr
  | TeleCmiOutboundAnsweredCdr
  | TeleCmiOutboundMissedCdr
  | TeleCmiLiveEvent
  | Record<string, unknown>; // fallback for unknown shapes

// ─── Format Helpers ───────────────────────────────────────────────────────────

export function formatDurationSeconds(
  seconds: number | null | undefined,
): string {
  if (seconds == null || seconds <= 0) return "0:00";
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${String(secs).padStart(2, "0")}`;
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
  const dateStr = date.toLocaleDateString("en-IN", { timeZone: TZ });
  const nowStr = new Date().toLocaleDateString("en-IN", { timeZone: TZ });
  const yd = new Date();
  yd.setDate(yd.getDate() - 1);
  const yStr = yd.toLocaleDateString("en-IN", { timeZone: TZ });

  if (dateStr === nowStr) return timeStr;
  if (dateStr === yStr) return `Yesterday, ${timeStr}`;
  return (
    date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      timeZone: TZ,
    }) +
    ", " +
    timeStr
  );
}

// ─── CDR → Call Row Mapper ────────────────────────────────────────────────────

type CallRow = {
  telecmi_cmiuuid: string;
  event: string;
  direction: string | null;
  virtual_number: string | null;
  caller_name: string;
  phone: string;
  call_type: CallType;
  status: CallStatus;
  cdr_start: string | null;
  duration_seconds: number;
  billedsec: number;
  recording_url: string | null;
  hangup_reason: string | null;
  waitedsec: number;
  voicemail_enabled: boolean;
  voicename: string | null;
  team_name: string | null;
  ivr_name: string | null;
  telecmi_agent: string | null;
  raw_payload: Record<string, unknown>;
  ivr_option: string;
  assigned_to_user_id: string | null;
};

export function mapTeleCmiCdrToCallRow(
  payload: Record<string, unknown>,
  assignedUserId: string | null = null,
): CallRow {
  const direction = String(payload.direction ?? "inbound");
  const status = String(payload.status ?? "").toLowerCase();
  const cmiuuid = String(payload.cmiuuid ?? "");
  const fromNum = String(payload.from ?? payload.to ?? "");
  const toNum = String(payload.to ?? payload.from ?? "");
  const ts = typeof payload.time === "number" ? payload.time : null;
  const isoTime = ts ? new Date(ts).toISOString() : null;

  // Derive CRM call_type
  let callType: CallType = "answered";
  if (status === "missed" || status === "no-answer") callType = "missed";
  else if (status === "busy" || status === "rejected" || status === "failed")
    callType = "rejected";
  else if (payload.voicemail === true) callType = "voicemail";
  else if (status === "answered") callType = "answered";

  // Derive CRM status
  let crmStatus: CallStatus = "Completed";
  if (callType === "missed") crmStatus = "Missed";
  if (callType === "rejected") crmStatus = "Rejected";
  if (callType === "voicemail") crmStatus = "Voicemail";

  // Duration: prefer answeredsec > billedsec > duration
  const durationSeconds = Number(
    payload.answeredsec ?? payload.billedsec ?? payload.duration ?? 0,
  );
  const billedsec = Number(payload.billedsec ?? payload.answeredsec ?? 0);

  // Phone number (caller for inbound, destination for outbound)
  const phone = direction === "inbound" ? fromNum : toNum;

  // Recording filename
  const filename = (payload.filename as string) ?? null;
  const recordingUrl = filename ? `https://rec.telecmi.com/${filename}` : null;

  const agent = (payload.agent ?? payload.user ?? "") as string;
  const ivrName = (payload.ivr_name ?? "") as string;
  const team = (payload.team ?? "") as string;

  return {
    telecmi_cmiuuid: cmiuuid,
    event:
      payload.type === "cdr"
        ? `CDR_${direction.toUpperCase()}_${status.toUpperCase()}`
        : "LIVE_EVENT",
    direction,
    virtual_number: String(payload.virtual_number ?? ""),
    caller_name: "Unknown Caller",
    phone,
    call_type: callType,
    status: crmStatus,
    cdr_start: isoTime,
    duration_seconds: durationSeconds,
    billedsec,
    recording_url: recordingUrl,
    hangup_reason: (payload.hangup_reason as string) ?? null,
    waitedsec: Number(payload.waitedsec ?? 0),
    voicemail_enabled: payload.voicemail === true,
    voicename: (payload.voicename as string) ?? null,
    team_name: team || null,
    ivr_name: ivrName || null,
    telecmi_agent: agent || null,
    raw_payload: payload,
    ivr_option:
      ivrName || team || (direction === "outbound" ? "Outbound" : "Inbound"),
    assigned_to_user_id: assignedUserId,
  };
}
