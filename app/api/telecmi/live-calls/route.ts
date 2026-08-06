/**
 * GET /api/telecmi/live-calls
 *
 * Returns currently ringing / active calls stored in telecmi_live_events.
 * The TeleCMI webhook (live events) writes to this table when calls start;
 * it cleans up on hangup. The calls dashboard polls this endpoint to show
 * the incoming-call notification banner.
 *
 * Also cleans up stale events older than 5 minutes.
 */

import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextResponse } from "next/server";

const LIVE_EVENTS_TABLE = "telecmi_live_events";
const STALE_THRESHOLD_MINUTES = 5;

export async function GET(request: Request) {
  try {
    const tenantId = getTenantIdFromRequest(request as any);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const supabase = createServerSupabaseClient();

    // Clean up stale events (calls that ended without a hangup webhook)
    const staleThreshold = new Date(
      Date.now() - STALE_THRESHOLD_MINUTES * 60 * 1000,
    ).toISOString();
    await supabase
      .from(LIVE_EVENTS_TABLE)
      .delete()
      .eq("tenant_id", tenantId)
      .lt("updated_at", staleThreshold);

    // Fetch active / ringing calls
    const { data, error } = await supabase
      .from(LIVE_EVENTS_TABLE)
      .select("*")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(20);

    if (error) throw error;

    return NextResponse.json({ liveCalls: data ?? [] });
  } catch (err: unknown) {
    const message =
      err instanceof Error ? err.message : "Failed to fetch live calls";
    console.error("[GET /api/telecmi/live-calls]", message, err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
