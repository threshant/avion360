import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = {
  params: Promise<{ id: string; stageId: string }>;
};

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const { id: pipelineId, stageId } = await params;
    const body = await request.json();
    const supabase = createServerSupabaseClient();

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.color !== undefined) updates.color = body.color || null;
    if (body.sla_hours !== undefined)
      updates.sla_hours =
        body.sla_hours != null ? Number(body.sla_hours) : null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 },
      );
    }

    const { data: existing, error: fetchError } = await supabase
      .from("lead_stages")
      .select("id, pipeline_id")
      .eq("id", stageId)
      .eq("pipeline_id", pipelineId)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError || !existing) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("lead_stages")
      .update(updates)
      .eq("id", stageId)
      .eq("tenant_id", tenantId)
      .select("id, pipeline_id, name, color, position, sla_hours")
      .single();

    if (error) throw error;

    if (updates.name !== undefined || updates.color !== undefined) {
      const leadUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) leadUpdates.stage_name = updates.name;
      if (updates.color !== undefined) leadUpdates.stage_color = updates.color;

      await supabase
        .from("leads")
        .update(leadUpdates)
        .eq("stage_id", stageId)
        .eq("tenant_id", tenantId);
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Failed to update stage:", error);
    return NextResponse.json(
      { error: "Failed to update stage" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const tenantId = getTenantIdFromRequest(_request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const { id: pipelineId, stageId } = await params;
    const supabase = createServerSupabaseClient();

    const { data: stage, error: fetchError } = await supabase
      .from("lead_stages")
      .select("id, position")
      .eq("id", stageId)
      .eq("pipeline_id", pipelineId)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError || !stage) {
      return NextResponse.json({ error: "Stage not found" }, { status: 404 });
    }

    const { data: leadsInStage } = await supabase
      .from("leads")
      .select("id")
      .eq("stage_id", stageId)
      .eq("tenant_id", tenantId);

    if (leadsInStage && leadsInStage.length > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete stage with leads. Move or remove leads first.",
        },
        { status: 400 },
      );
    }

    const { error: deleteError } = await supabase
      .from("lead_stages")
      .delete()
      .eq("id", stageId)
      .eq("tenant_id", tenantId);

    if (deleteError) throw deleteError;

    const { data: remainingStages } = await supabase
      .from("lead_stages")
      .select("id")
      .eq("pipeline_id", pipelineId)
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true });

    if (remainingStages && remainingStages.length > 0) {
      const reorders = remainingStages.map((s, idx) =>
        supabase
          .from("lead_stages")
          .update({ position: idx })
          .eq("id", s.id)
          .eq("tenant_id", tenantId),
      );
      await Promise.all(reorders);
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete stage:", error);
    return NextResponse.json(
      { error: "Failed to delete stage" },
      { status: 500 },
    );
  }
}
