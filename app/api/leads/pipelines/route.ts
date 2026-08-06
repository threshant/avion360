import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const supabase = createServerSupabaseClient();

    const { data: pipelines, error } = await supabase
      .from("lead_pipelines")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true });

    if (error) throw error;

    const pipelineIds = (pipelines || []).map((p) => p.id);

    const { data: stages } =
      pipelineIds.length > 0
        ? await supabase
            .from("lead_stages")
            .select("*")
            .eq("tenant_id", tenantId)
            .in("pipeline_id", pipelineIds)
            .order("position", { ascending: true })
        : { data: [] };

    const { data: leadCounts } =
      pipelineIds.length > 0
        ? await supabase
            .from("leads")
            .select("pipeline_id, stage_id")
            .eq("tenant_id", tenantId)
            .in("pipeline_id", pipelineIds)
        : { data: [] };

    const stageCountMap = new Map<string, number>();
    const pipelineLeadCountMap = new Map<string, number>();

    for (const lead of leadCounts || []) {
      if (lead.pipeline_id) {
        pipelineLeadCountMap.set(
          lead.pipeline_id,
          (pipelineLeadCountMap.get(lead.pipeline_id) || 0) + 1,
        );
      }
      if (lead.pipeline_id && lead.stage_id) {
        const key = `${lead.pipeline_id}:${lead.stage_id}`;
        stageCountMap.set(key, (stageCountMap.get(key) || 0) + 1);
      }
    }

    const result = (pipelines || []).map((pipeline) => ({
      ...pipeline,
      lead_count: pipelineLeadCountMap.get(pipeline.id) || 0,
      stages: (stages || [])
        .filter((s) => s.pipeline_id === pipeline.id)
        .map((s) => ({
          ...s,
          lead_count: stageCountMap.get(`${pipeline.id}:${s.id}`) || 0,
        })),
    }));

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch pipelines:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipelines" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const body = await request.json();
    const name = String(body.name || "").trim();

    if (!name) {
      return NextResponse.json(
        { error: "Pipeline name is required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    const { data: lastPipeline } = await supabase
      .from("lead_pipelines")
      .select("position")
      .eq("tenant_id", tenantId)
      .order("position", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextPosition = (lastPipeline?.position ?? -1) + 1;

    const { data: pipeline, error: pipelineError } = await supabase
      .from("lead_pipelines")
      .insert({ name, position: nextPosition, tenant_id: tenantId })
      .select("*")
      .single();

    if (pipelineError) throw pipelineError;

    const stages = Array.isArray(body.stages) ? body.stages : [];
    let createdStages: {
      id: string;
      name: string;
      color: string | null;
      position: number;
      sla_hours: number | null;
    }[] = [];

    if (stages.length > 0) {
      const stageRows = stages.map(
        (
          s: { name: string; color?: string; sla_hours?: number | null },
          i: number,
        ) => ({
          pipeline_id: pipeline.id,
          name: String(s.name || "").trim(),
          color: s.color || null,
          sla_hours: s.sla_hours != null ? Number(s.sla_hours) : null,
          position: i,
          tenant_id: tenantId,
        }),
      );

      const { data: insertedStages, error: stagesError } = await supabase
        .from("lead_stages")
        .insert(stageRows)
        .select("id, name, color, position, sla_hours");

      if (stagesError) throw stagesError;
      createdStages = insertedStages || [];
    }

    return NextResponse.json(
      { data: { ...pipeline, stages: createdStages } },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to create pipeline:", error);
    return NextResponse.json(
      { error: "Failed to create pipeline" },
      { status: 500 },
    );
  }
}
