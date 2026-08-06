import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function PUT(request: NextRequest, { params }: RouteParams) {
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
    const stages = body.stages as { id: string; position: number }[];

    if (!Array.isArray(stages) || stages.length === 0) {
      return NextResponse.json(
        { error: "stages array is required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const updates = stages.map((stage) =>
      supabase
        .from("lead_stages")
        .update({ position: stage.position })
        .eq("id", stage.id)
        .eq("pipeline_id", pipelineId)
        .eq("tenant_id", tenantId),
    );

    await Promise.all(updates);

    const { data, error } = await supabase
      .from("lead_stages")
      .select("*")
      .eq("pipeline_id", pipelineId)
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Failed to reorder stages:", error);
    return NextResponse.json(
      { error: "Failed to reorder stages" },
      { status: 500 },
    );
  }
}
