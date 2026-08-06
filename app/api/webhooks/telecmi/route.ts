/**
 * POST /api/webhooks/telecmi
 *
 * Receives CDR and live-event webhooks from the TeleCMI platform.
 * Configure this URL in your TeleCMI dashboard:
 *   SETTINGS → WEBHOOKS → add POST URL pointing here
 *
 * Env vars required:
 *   TELECMI_WEBHOOK_SECRET  – optional shared secret for request verification
 */

import { findActiveUserByPhone } from "@/lib/find-user-by-phone";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { mapTeleCmiCdrToCallRow } from "@/lib/telecmi";
import { NextRequest, NextResponse } from "next/server";

const CALLS_TABLE = "calls";
const EVENTS_TABLE = "telecmi_webhook_events";
const LIVE_EVENTS_TABLE = "telecmi_live_events";

// ─── Signature verification ───────────────────────────────────────────────────

function verifyWebhookSecret(req: NextRequest): boolean {
  const secret = process.env.TELECMI_WEBHOOK_SECRET;
  if (!secret) return true; // no secret configured → accept all

  const headerSecret =
    req.headers.get("x-webhook-secret") ||
    req.headers.get("x-telecmi-secret") ||
    req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  const { searchParams } = new URL(req.url);
  const querySecret = searchParams.get("secret");

  return headerSecret === secret || querySecret === secret;
}

// ─── Audit log ────────────────────────────────────────────────────────────────

async function logEvent(
  payload: Record<string, unknown>,
  processed: boolean,
  tenantId?: string | null,
  errorMessage?: string,
) {
  const supabase = createServerSupabaseClient();
  await supabase.from(EVENTS_TABLE).insert({
    event_type: String(payload.type ?? "unknown"),
    direction: String(payload.direction ?? ""),
    status: String(payload.status ?? ""),
    cmiuuid: String(payload.cmiuuid ?? ""),
    appid: payload.appid ? Number(payload.appid) : null,
    payload,
    processed,
    tenant_id: tenantId ?? null,
    error_message: errorMessage ?? null,
  });
}

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let payload: Record<string, unknown> | null = null;

  try {
    if (!verifyWebhookSecret(req)) {
      return NextResponse.json(
        { error: "Invalid webhook secret" },
        { status: 401 },
      );
    }

    payload = (await req.json()) as Record<string, unknown>;

    console.log("[POST /api/webhooks/telecmi] Webhook received:", {
      type: payload?.type,
      direction: payload?.direction,
      status: payload?.status,
      cmiuuid: payload?.cmiuuid,
    });

    if (!payload?.type) {
      return NextResponse.json(
        { error: "Missing type field" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();
    const type = String(payload.type);
    const cmiuuid = String(payload.cmiuuid ?? "");
    const agentStr = String(payload.agent ?? payload.user ?? "");
    const matchedUser = agentStr ? await findActiveUserByPhone(agentStr) : null;
    const tenantId = (matchedUser?.tenant_id as string | undefined) ?? null;

    // ── Live event: store / update in live_events table ───────────────────────
    if (type === "event") {
      const status = String(
        payload.status ?? payload.event ?? "",
      ).toLowerCase();

      if (cmiuuid) {
        if (status === "hangup" || status === "call_hangup") {
          // Remove from live events on hangup
          let deleteQuery = supabase
            .from(LIVE_EVENTS_TABLE)
            .delete()
            .eq("cmiuuid", cmiuuid);
          if (tenantId) deleteQuery = deleteQuery.eq("tenant_id", tenantId);
          await deleteQuery;
        } else {
          const liveRow = {
            cmiuuid,
            direction: String(payload.direction ?? ""),
            status: status || "ringing",
            from_number: String(payload.from ?? ""),
            to_number: String(payload.to ?? ""),
            virtual_number: String(payload.virtual_number ?? ""),
            agent: String(payload.agent ?? payload.user ?? ""),
            appid: payload.appid ? Number(payload.appid) : null,
            payload,
            tenant_id: tenantId,
            updated_at: new Date().toISOString(),
          };
          await supabase
            .from(LIVE_EVENTS_TABLE)
            .upsert(liveRow, { onConflict: "cmiuuid" });
        }
      }

      await logEvent(payload, true, tenantId);
      return NextResponse.json({ ok: true, action: "live_event_stored" });
    }

    // ── CDR event ─────────────────────────────────────────────────────────────
    if (type === "cdr" && cmiuuid) {
      // Remove from live events now that call is complete
      if (cmiuuid) {
        let deleteQuery = supabase
          .from(LIVE_EVENTS_TABLE)
          .delete()
          .eq("cmiuuid", cmiuuid);
        if (tenantId) deleteQuery = deleteQuery.eq("tenant_id", tenantId);
        await deleteQuery;
      }

      // Try to find assigned user via agent phone/id
      // TeleCMI agent format: "202_2222223" — extract just the prefix number or look up by raw id
      let assignedUserId: string | null = null;
      assignedUserId = matchedUser?.id ?? null;

      const row = mapTeleCmiCdrToCallRow(payload, assignedUserId);

      const { error } = await supabase
        .from(CALLS_TABLE)
        .upsert(
          { ...row, raw_payload: payload, tenant_id: tenantId },
          { onConflict: "telecmi_cmiuuid" },
        );

      if (error) {
        console.error(
          "[POST /api/webhooks/telecmi] Supabase upsert failed:",
          error.message,
        );
        throw error;
      }

      console.log("[POST /api/webhooks/telecmi] CDR saved:", {
        cmiuuid,
        direction: row.direction,
        call_type: row.call_type,
        status: row.status,
        phone: row.phone,
      });

      await logEvent(payload, true, tenantId);
      return NextResponse.json({ ok: true, action: "cdr_saved" });
    }

    // Unknown payload — log and acknowledge
    await logEvent(payload, false, tenantId, "Unrecognised payload shape");
    return NextResponse.json({ ok: true, action: "ignored" });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal error";
    console.error("[POST /api/webhooks/telecmi]", message, err);
    if (payload) await logEvent(payload, false, null, message).catch(() => {});
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
