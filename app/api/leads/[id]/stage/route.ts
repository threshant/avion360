import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { hasColumn } from "@/lib/schemaCompat";
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
    const { id: leadId } = await params;
    const body = await request.json();
    const stageId = String(body.stage_id || "").trim();

    if (!stageId) {
      return NextResponse.json(
        { error: "stage_id is required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    // Get the stage info
    const { data: stage, error: stageError } = await supabase
      .from("lead_stages")
      .select("id, name, color, position, pipeline_id")
      .eq("id", stageId)
      .eq("tenant_id", tenantId)
      .single();

    if (stageError || !stage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    // Update the lead
    const updates: Record<string, unknown> = {
      stage_id: stageId,
      stage_name: stage.name,
      stage_color: stage.color,
      stage_position: stage.position,
      pipeline_id: stage.pipeline_id,
    };
    // stage_entered_at only exists on deployments that applied the SLA migration
    if (await hasColumn("leads", "stage_entered_at")) {
      updates.stage_entered_at = new Date().toISOString();
    }

    const { data, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("aviontive_lead_id", leadId)
      .eq("tenant_id", tenantId)
      .select("aviontive_lead_id, stage_id, stage_name, pipeline_id")
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Failed to move lead stage:", error);
    return NextResponse.json(
      { error: "Failed to move lead stage" },
      { status: 500 },
    );
  }
}
