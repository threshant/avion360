/**
 * POST /api/telecmi/click-to-call
 *
 * Initiates a Click-To-Call via TeleCMI.
 * TeleCMI rings the agent's registered softphone first; once answered,
 * it connects to the destination number.
 *
 * Env vars required:
 *   TELECMI_APP_ID      – your TeleCMI app ID
 *   TELECMI_APP_SECRET  – your TeleCMI app secret
 *
 * Authentication: Uses HTTP Basic Auth with app credentials.
 *
 * TeleCMI API ref: https://doc.telecmi.com/chub/docs/click-to-call
 */

import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

const TELECMI_C2C_URL = "https://rest.telecmi.com/v2/webrtc/click2call";
const TELECMI_USER_NOT_CONFIGURED_MESSAGE =
  "Calling function is not configured for your user id.";

export async function POST(req: NextRequest) {
  try {
    const requesterId = getUserIdFromRequest(req);
    if (!requesterId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }

    const body = (await req.json()) as {
      to: string;
      callerid?: string;
      extra_params?: Record<string, string>;
    };

    if (!body.to?.trim()) {
      return NextResponse.json(
        { error: "Destination number (to) is required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();
    const { data: requester, error: requesterError } = await supabase
      .from("users")
      .select("telecmi_user_id")
      .eq("id", requesterId)
      .eq("tenant_id", tenantId)
      .single();

    if (requesterError) {
      return NextResponse.json(
        { error: "Unable to validate TeleCMI user mapping" },
        { status: 500 },
      );
    }

    const telecmiUserId = requester?.telecmi_user_id?.trim();
    if (!telecmiUserId) {
      return NextResponse.json(
        {
          error: TELECMI_USER_NOT_CONFIGURED_MESSAGE,
          code: "TELECMI_USER_NOT_CONFIGURED",
        },
        { status: 400 },
      );
    }

    // Get app credentials from environment
    const appSecret = process.env.TELECMI_APP_SECRET;

    if (!appSecret) {
      return NextResponse.json(
        {
          error:
            "TeleCMI credentials not configured. Set TELECMI_APP_SECRET in env.",
        },
        { status: 503 },
      );
    }

    const telecmiPayload: Record<string, unknown> = {
      user_id: telecmiUserId,
      secret: appSecret,
      to: Number(body.to.replace(/\D/g, "")), // strip non-digits
      extra_params: body.extra_params ?? {
        crm: true,
        initiated_by: requesterId,
      },
      webrtc: true,
      followme: false,
    };

    if (body.callerid) {
      telecmiPayload.callerid = Number(body.callerid.replace(/\D/g, ""));
    }

    const resp = await fetch(TELECMI_C2C_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(telecmiPayload),
    });

    const data = (await resp.json()) as {
      code: number;
      msg?: string;
      request_id?: string;
    };

    if (data.code !== 200) {
      console.error("[POST /api/telecmi/click-to-call] TeleCMI error:", data);
      return NextResponse.json(
        { error: data.msg ?? "TeleCMI rejected the request", code: data.code },
        { status: 422 },
      );
    }

    console.log("[POST /api/telecmi/click-to-call] Call initiated:", {
      to: body.to,
      request_id: data.request_id,
    });

    return NextResponse.json({
      ok: true,
      request_id: data.request_id,
      msg: data.msg,
    });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to initiate call";
    console.error("[POST /api/telecmi/click-to-call]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
