import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

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
    const sourceType = String(body.source_type || "").trim();
    const sourceId = String(body.source_id || "").trim();
    const pipelineId = String(body.pipeline_id || "").trim();
    const stageId = String(body.stage_id || "").trim();

    if (!sourceType || !sourceId || !pipelineId || !stageId) {
      return NextResponse.json(
        {
          error:
            "source_type, source_id, pipeline_id, and stage_id are required",
        },
        { status: 400 },
      );
    }

    if (sourceType !== "conversation" && sourceType !== "call") {
      return NextResponse.json(
        { error: "source_type must be 'conversation' or 'call'" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    // Verify pipeline and stage exist
    const { data: pipeline } = await supabase
      .from("lead_pipelines")
      .select("id, name")
      .eq("id", pipelineId)
      .eq("tenant_id", tenantId)
      .single();

    if (!pipeline) {
      return NextResponse.json(
        { error: "Pipeline not found" },
        { status: 404 },
      );
    }

    const { data: stage } = await supabase
      .from("lead_stages")
      .select("id, name, color, position")
      .eq("id", stageId)
      .eq("tenant_id", tenantId)
      .eq("pipeline_id", pipelineId)
      .single();

    if (!stage) {
      return NextResponse.json(
        { error: "Stage not found in this pipeline" },
        { status: 404 },
      );
    }

    // Check for existing lead with this source
    const existingQuery =
      sourceType === "conversation"
        ? supabase
            .from("leads")
            .select("aviontive_lead_id")
            .eq("conversation_id", sourceId)
            .eq("tenant_id", tenantId)
            .single()
        : supabase
            .from("leads")
            .select("aviontive_lead_id")
            .eq("call_id", sourceId)
            .eq("tenant_id", tenantId)
            .single();

    const { data: existing } = await existingQuery;

    if (existing) {
      return NextResponse.json(
        { error: `This ${sourceType} is already linked to a lead` },
        { status: 409 },
      );
    }

    let title = String(body.title || "").trim();
    let contactName = "";
    let contactPhone = "";
    let contactEmail = "";
    let source = sourceType === "conversation" ? "conversation" : "Calls";
    let channelName = "";

    if (sourceType === "conversation") {
      const { data: messages } = await supabase
        .from("leads")
        .select(
          "contact_full_name, contact_phone, contact_email, channel_name, external_display_name",
        )
        .eq("conversation_id", sourceId)
        .eq("tenant_id", tenantId)
        .limit(1);

      if (messages && messages.length > 0) {
        contactName =
          messages[0].contact_full_name ||
          messages[0].external_display_name ||
          "";
        contactPhone = messages[0].contact_phone || "";
        contactEmail = messages[0].contact_email || "";
        channelName = messages[0].channel_name || "";
        source = channelName || "conversation";
      }

      if (!title)
        title = contactName
          ? `Lead from ${contactName}`
          : `Lead from Conversation`;
    } else {
      if (!title) title = `Lead from Call`;
    }

    const leadId = randomUUID();
    const now = new Date().toISOString();

    const insertRow = {
      aviontive_lead_id: leadId,
      pipeline_id: pipelineId,
      pipeline_name: pipeline.name,
      stage_id: stageId,
      stage_name: stage.name,
      stage_color: stage.color,
      stage_position: stage.position,
      conversation_id: sourceType === "conversation" ? sourceId : null,
      call_id: sourceType === "call" ? sourceId : null,
      title: title || "Untitled Lead",
      notes: body.notes || null,
      source,
      temperature: (body.temperature || "WARM").toUpperCase(),
      contact_full_name: contactName || null,
      contact_phone: contactPhone || null,
      contact_email: contactEmail || null,
      channel_name: channelName || null,
      external_display_name: contactName || null,
      labels: [],
      raw_payload: body,
      custom_fields:
        body.custom_fields && typeof body.custom_fields === "object"
          ? body.custom_fields
          : null,
      last_synced_at: now,
      tenant_id: tenantId,
    };

    const { data, error } = await supabase
      .from("leads")
      .insert(insertRow)
      .select(
        "aviontive_lead_id, pipeline_id, stage_id, title, source, temperature, contact_full_name",
      )
      .single();

    if (error) throw error;

    if (typeof body.assigned_to === "string" && body.assigned_to.trim()) {
      const assigneeId = body.assigned_to.trim();
      const { data: assigneeUser } = await supabase
        .from("users")
        .select("id, name")
        .eq("id", assigneeId)
        .eq("tenant_id", tenantId)
        .single();
      if (assigneeUser) {
        await supabase.from("lead_overrides").upsert(
          {
            lead_id: leadId,
            assigned_to: assigneeId,
            assigned_to_name: assigneeUser.name,
            tenant_id: tenantId,
          },
          { onConflict: "lead_id" },
        );
      }
    }

    return NextResponse.json(
      {
        data: {
          id: data.aviontive_lead_id,
          pipeline_id: data.pipeline_id,
          stage_id: data.stage_id,
          name: data.contact_full_name || data.title,
          temperature: data.temperature,
          source: data.source,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Failed to convert to lead:", error);
    return NextResponse.json(
      { error: "Failed to convert to lead" },
      { status: 500 },
    );
  }
}
