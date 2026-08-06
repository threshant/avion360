import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const { id: pipelineId } = await params;
    const body = await request.json();
    const name = String(body.name || "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Stage name is required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: lastStage } = await supabase
      .from("lead_stages")
      .select("position")
      .eq("pipeline_id", pipelineId)
      .eq("tenant_id", tenantId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (lastStage?.position ?? -1) + 1;

    const { data, error } = await supabase
      .from("lead_stages")
      .insert({
        pipeline_id: pipelineId,
        name,
        color: body.color || null,
        sla_hours: body.sla_hours != null ? Number(body.sla_hours) : null,
        position: nextPosition,
        tenant_id: tenantId,
      })
      .select("id, pipeline_id, name, color, position, sla_hours")
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error("Failed to create stage:", error);
    return NextResponse.json(
      { error: "Failed to create stage" },
      { status: 500 },
    );
  }
}
