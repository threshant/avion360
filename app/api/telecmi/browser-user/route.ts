import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
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

    const supabase = createServerSupabaseClient();
    const { data: requester, error: requesterError } = await supabase
      .from("users")
      .select("telecmi_user_id")
      .eq("id", requesterId)
      .eq("tenant_id", tenantId)
      .single();

    if (requesterError) {
      return NextResponse.json(
        { error: "Unable to load TeleCMI user mapping" },
        { status: 500 },
      );
    }

    const telecmiUserId = requester?.telecmi_user_id?.trim() || null;
    return NextResponse.json({
      enabled: Boolean(telecmiUserId),
      telecmiUserId,
    });
  } catch (error) {
    console.error("[GET /api/telecmi/browser-user]", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
