import { getUserIdFromRequest } from "@/lib/auth-middleware";
import {
  fetchTelecmiAgents,
  postTelecmiRestEndpoint,
  TELECMI_INSIGHTS_ENDPOINTS,
} from "@/lib/telecmi";
import type {
  TelecmiCallInsightsRecord,
  TelecmiCallInsightsResponse,
  TelecmiCallInsightsView,
} from "@/types/call";
import { NextRequest, NextResponse } from "next/server";

const VIEW_META: Record<
  TelecmiCallInsightsView,
  {
    label: string;
    endpointKey: keyof typeof TELECMI_INSIGHTS_ENDPOINTS;
  }
> = {
  incomingAnswered: {
    label: "Incoming Answered",
    endpointKey: "incomingAnswered",
  },
  incomingMissed: {
    label: "Incoming Missed",
    endpointKey: "incomingMissed",
  },
  outgoingAnswered: {
    label: "Outgoing Answered",
    endpointKey: "outgoingAnswered",
  },
  outgoingMissed: {
    label: "Outgoing Missed",
    endpointKey: "outgoingMissed",
  },
};

function parseDateParamToUtcMillis(
  value: string | null,
  fallback: number,
): number {
  if (!value) return fallback;

  if (/^\d+$/.test(value)) {
    const asNumber = Number(value);
    return Number.isFinite(asNumber) ? asNumber : fallback;
  }

  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRecord(
  record: Record<string, unknown>,
  agentNamesById: Map<string, string>,
): TelecmiCallInsightsRecord {
  const rawAgent =
    typeof record.agent === "string" && record.agent.trim().length > 0
      ? record.agent.trim()
      : null;

  return {
    cmiuid: String(record.cmiuid ?? record.cmiuuid ?? ""),
    name: String(record.name ?? "Unknown"),
    from: String(record.from ?? ""),
    to: String(record.to ?? ""),
    agent: rawAgent ? (agentNamesById.get(rawAgent) ?? rawAgent) : null,
    duration: Number(record.duration ?? 0),
    billedsec: Number(record.billedsec ?? 0),
    time: Number(record.time ?? 0),
    filename: typeof record.filename === "string" ? record.filename : null,
    record:
      typeof record.record === "string" || typeof record.record === "boolean"
        ? record.record
        : null,
    rate:
      typeof record.rate === "number" || typeof record.rate === "string"
        ? record.rate
        : null,
    notes: Array.isArray(record.notes)
      ? record.notes.flatMap((note) => {
          if (!note || typeof note !== "object") return [];
          const normalized = note as Record<string, unknown>;
          return [
            {
              msg: String(normalized.msg ?? ""),
              date: Number(normalized.date ?? 0),
              agent: String(normalized.agent ?? ""),
            },
          ];
        })
      : [],
  };
}

export async function GET(req: NextRequest) {
  try {
    const requesterId = getUserIdFromRequest(req);
    if (!requesterId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const requestedView = searchParams.get(
      "view",
    ) as TelecmiCallInsightsView | null;
    const view =
      requestedView && requestedView in VIEW_META
        ? requestedView
        : "incomingAnswered";
    const now = Date.now();
    const defaultStart = now - 24 * 60 * 60 * 1000;
    const startDate = parseDateParamToUtcMillis(
      searchParams.get("start_date") ?? searchParams.get("dateFrom"),
      defaultStart,
    );
    const endDate = parseDateParamToUtcMillis(
      searchParams.get("end_date") ?? searchParams.get("dateTo"),
      now,
    );
    const meta = VIEW_META[view];

    const requestedPage = Math.max(
      1,
      parseInt(searchParams.get("page") || "1", 10),
    );
    const requestedLimit = Math.min(
      100,
      Math.max(1, parseInt(searchParams.get("limit") || "10", 10)),
    );

    const telecmiAgents = await fetchTelecmiAgents();
    const agentNamesById = new Map(
      telecmiAgents.map((agent) => [agent.agentId, agent.fullName]),
    );

    const batch = await postTelecmiRestEndpoint(meta.endpointKey, {
      startDate,
      endDate,
      page: requestedPage,
      limit: requestedLimit,
    });

    const totalCount = Number(batch.count ?? 0);
    const batchCdr = Array.isArray(batch.cdr) ? batch.cdr : [];

    const response: TelecmiCallInsightsResponse = {
      view,
      label: meta.label,
      endpoint: TELECMI_INSIGHTS_ENDPOINTS[meta.endpointKey],
      count: totalCount,
      page: requestedPage,
      limit: requestedLimit,
      analytics: null,
      records: batchCdr.map((record) =>
        normalizeRecord(record as Record<string, unknown>, agentNamesById),
      ),
    };

    return NextResponse.json(response);
  } catch (err: unknown) {
    const message =
      err instanceof Error
        ? err.message
        : "Failed to fetch TeleCMI call insights";
    console.error("[GET /api/telecmi/call-insights]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
