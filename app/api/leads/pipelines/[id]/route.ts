import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { hasColumn } from "@/lib/schemaCompat";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const tenantId = getTenantIdFromRequest(_request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { data: pipeline, error: pipelineError } = await supabase
      .from("lead_pipelines")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (pipelineError || !pipeline) {
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 },
      );
    }

    const { data: stages, error: stagesError } = await supabase
      .from("lead_stages")
      .select("*")
      .eq("pipeline_id", id)
      .eq("tenant_id", tenantId)
      .order("position", { ascending: true });

    if (stagesError) throw stagesError;

    const stageIds = (stages || []).map((s) => s.id);
    const leadColumns = [
      "stage_id",
      "aviontive_lead_id",
      "title",
      "contact_full_name",
      "temperature",
      "source",
      "stage_name",
      "channel_name",
      "conversation_id",
      "call_id",
      "contact_phone",
      "contact_email",
      "notes",
    ];
    // stage_entered_at only exists on deployments that applied the SLA migration
    if (await hasColumn("leads", "stage_entered_at")) {
      leadColumns.push("stage_entered_at");
    }

    const { data: leads } =
      stageIds.length > 0
        ? await supabase
            .from("leads")
            .select(leadColumns.join(",") as "*")
            .eq("pipeline_id", id)
            .eq("tenant_id", tenantId)
        : { data: [] };

    const leadRows = (leads || []) as Record<string, unknown>[];

    // Fetch overrides for assignment and notes
    const leadIds = leadRows.map((l) => l.aviontive_lead_id).filter(Boolean);
    const { data: overrides } =
      leadIds.length > 0
        ? await supabase
            .from("lead_overrides")
            .select("lead_id, assigned_to_name, note")
            .eq("tenant_id", tenantId)
            .in("lead_id", leadIds)
        : { data: [] };

    const overrideMap = new Map((overrides || []).map((o) => [o.lead_id, o]));

    const stageLeadMap = new Map<string, unknown[]>();
    for (const lead of leadRows) {
      if (lead.stage_id) {
        const override = overrideMap.get(lead.aviontive_lead_id as string);
        const arr = stageLeadMap.get(lead.stage_id as string) || [];
        arr.push({
          id: lead.aviontive_lead_id,
          name: lead.contact_full_name || lead.title || "Unknown",
          temperature: ((lead.temperature as string) || "WARM").toUpperCase(),
          source: lead.source || lead.channel_name || "Unknown",
          assignedTo: override?.assigned_to_name || null,
          stage_name: lead.stage_name,
          conversation_id: lead.conversation_id || null,
          call_id: lead.call_id || null,
          phone: lead.contact_phone || null,
          email: lead.contact_email || null,
          notes: override?.note || lead.notes || null,
          stage_entered_at: lead.stage_entered_at || null,
        });
        stageLeadMap.set(lead.stage_id as string, arr);
      }
    }

    const result = {
      ...pipeline,
      stages: (stages || []).map((s) => ({
        ...s,
        leads: stageLeadMap.get(s.id) || [],
      })),
    };

    return NextResponse.json({ data: result }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch pipeline:", error);
    return NextResponse.json(
      { error: "Failed to fetch pipeline" },
      { status: 500 },
    );
  }
}

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
    if (body.name !== undefined) updates.name = String(body.name).trim();
    if (body.is_active !== undefined)
      updates.is_active = Boolean(body.is_active);
    if (body.position !== undefined) updates.position = Number(body.position);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("lead_pipelines")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select("*")
      .single();

    if (error) throw error;

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Failed to update pipeline:", error);
    return NextResponse.json(
      { error: "Failed to update pipeline" },
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
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { error } = await supabase
      .from("lead_pipelines")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) throw error;

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Failed to delete pipeline:", error);
    return NextResponse.json(
      { error: "Failed to delete pipeline" },
      { status: 500 },
    );
  }
}
