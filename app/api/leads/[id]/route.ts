import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
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

    const updates: Record<string, unknown> = {};

    if (body.name !== undefined) {
      const name = String(body.name).trim();
      updates.contact_full_name = name || null;
      updates.title = name || null;
      updates.external_display_name = name || null;
    }
    if (body.phone !== undefined) {
      updates.contact_phone = String(body.phone).trim() || null;
    }
    if (body.email !== undefined) {
      updates.contact_email = String(body.email).trim() || null;
    }
    if (body.temperature !== undefined) {
      const temp = String(body.temperature).toUpperCase();
      if (["HOT", "WARM", "COLD"].includes(temp)) {
        updates.temperature = temp;
      }
    }
    if (body.notes !== undefined) {
      updates.notes = String(body.notes).trim() || null;
    }
    if (body.source !== undefined) {
      updates.source = String(body.source).trim() || null;
    }
    if (body.stage_name !== undefined) {
      updates.stage_name = String(body.stage_name).trim() || null;
    }
    if (body.custom_fields !== undefined) {
      updates.custom_fields =
        body.custom_fields && typeof body.custom_fields === "object"
          ? body.custom_fields
          : null;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 },
      );
    }

    updates.last_synced_at = new Date().toISOString();

    const { data, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("aviontive_lead_id", id)
      .eq("tenant_id", tenantId)
      .select(
        "aviontive_lead_id, stage_id, title, notes, source, stage_name, contact_full_name, contact_email, contact_phone, channel_name, temperature, pipeline_id, pipeline_name, conversation_id, call_id, custom_fields",
      )
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Failed to update lead:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 },
    );
  }
}
