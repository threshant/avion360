import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { parsePagination } from "@/lib/pagination";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

type LeadSource =
  | "WhatsApp"
  | "Calls"
  | "Email"
  | "Website"
  | "Walk-in"
  | "Instagram"
  | "Facebook";

type LeadRow = {
  aviontive_lead_id: string;
  stage_id: string | null;
  title: string | null;
  notes: string | null;
  source: string | null;
  stage_name: string | null;
  contact_full_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  channel_name: string | null;
  last_message_at: string | null;
  labels: unknown;
  temperature: string | null;
  pipeline_id: string | null;
  pipeline_name: string | null;
  conversation_id: string | null;
  call_id: string | null;
  custom_fields: Record<string, string> | null;
};

type LeadOverrideRow = {
  assigned_to_name?: string | null;
  note?: string | null;
  reminder_at?: string | null;
  reminder_text?: string | null;
  kanban_column_id?: string | null;
};

function normalizeSource(value: string | null | undefined): LeadSource {
  const source = (value || "").toLowerCase();
  const channelMap: Record<string, LeadSource> = {
    instagram: "Instagram",
    whatsapp: "WhatsApp",
    facebook: "Facebook",
    email: "Email",
    calls: "Calls",
    call: "Calls",
    walkin: "Walk-in",
    "walk-in": "Walk-in",
    website: "Website",
  };

  return channelMap[source] || "Website";
}

function normalizeTemperature(
  value: string | null | undefined,
): "HOT" | "WARM" | "COLD" {
  const temp = (value || "").toUpperCase();
  if (temp === "HOT" || temp === "WARM" || temp === "COLD") {
    return temp;
  }
  return "WARM";
}

function getStatusColor(stageName: string): string {
  const colorMap: Record<string, string> = {
    New: "text-violet-600 bg-violet-50 border-violet-200",
    Contacted: "text-blue-600 bg-blue-50 border-blue-200",
    Negotiation: "text-orange-600 bg-orange-50 border-orange-200",
    Won: "text-green-600 bg-green-50 border-green-200",
    Lost: "text-red-600 bg-red-50 border-red-200",
  };

  return colorMap[stageName] || "text-slate-600 bg-slate-50 border-slate-200";
}

function getAvatarBg(channelName: string): string {
  const bgMap: Record<string, string> = {
    instagram: "bg-pink-500",
    whatsapp: "bg-green-500",
    facebook: "bg-blue-500",
    email: "bg-purple-500",
    calls: "bg-sky-500",
    call: "bg-sky-500",
    website: "bg-slate-500",
  };

  return bgMap[channelName?.toLowerCase()] || "bg-slate-500";
}

function toTagList(labels: unknown): string[] {
  if (!Array.isArray(labels)) return [];
  return labels
    .map((label) => (typeof label === "string" ? label : ""))
    .filter(Boolean);
}

function mapLead(row: LeadRow, override?: LeadOverrideRow) {
  const source = normalizeSource(row.source || row.channel_name);
  const statusLabel = row.stage_name || "New";
  const displayName = row.contact_full_name || row.title || "Unknown";

  return {
    id: row.aviontive_lead_id,
    stageId: row.stage_id || undefined,
    pipelineId: row.pipeline_id || undefined,
    pipelineName: row.pipeline_name || undefined,
    conversationId: row.conversation_id || undefined,
    callId: row.call_id || undefined,
    name: displayName,
    company: row.contact_full_name || "N/A",
    phone: row.contact_phone || "N/A",
    email: row.contact_email || "N/A",
    country: "N/A",
    lastContact: row.last_message_at
      ? new Date(row.last_message_at).toLocaleString()
      : "Never",
    temperature: normalizeTemperature(row.temperature),
    source,
    amount: 0,
    assignedTo: override?.assigned_to_name || null,
    notes: override?.note ?? row.notes ?? "",
    reminderAt: override?.reminder_at ?? null,
    reminderText: override?.reminder_text ?? "",
    kanbanColumnId: override?.kanban_column_id ?? null,
    status: statusLabel,
    statusLabel,
    statusColor: getStatusColor(statusLabel),
    tags: toTagList(row.labels),
    avatarBg: getAvatarBg(source),
    avatarIcon: source,
    customFields: row.custom_fields || null,
  };
}

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
    const { searchParams } = request.nextUrl;
    const leadId = searchParams.get("id");

    if (leadId) {
      const { data: lead, error } = await supabase
        .from("leads")
        .select(
          "aviontive_lead_id, stage_id, title, notes, source, stage_name, contact_full_name, contact_email, contact_phone, channel_name, last_message_at, labels, temperature, custom_fields",
        )
        .eq("tenant_id", tenantId)
        .eq("aviontive_lead_id", leadId)
        .single();

      if (error || !lead) {
        return NextResponse.json({ error: "Lead not found" }, { status: 404 });
      }

      const { data: override } = await supabase
        .from("lead_overrides")
        .select(
          "assigned_to_name, note, reminder_at, reminder_text, kanban_column_id",
        )
        .eq("tenant_id", tenantId)
        .eq("lead_id", leadId)
        .single();

      return NextResponse.json({
        data: mapLead(lead as LeadRow, override || undefined),
      });
    }

    const { page, pageSize, from, to } = parsePagination(searchParams);
    const pipelineId = searchParams.get("pipeline_id");
    const stageId = searchParams.get("stage_id");

    let query = supabase
      .from("leads")
      .select(
        "aviontive_lead_id, stage_id, title, notes, source, stage_name, contact_full_name, contact_email, contact_phone, channel_name, last_message_at, labels, temperature, pipeline_id, pipeline_name, conversation_id, call_id, custom_fields",
        { count: "exact" },
      )
      .eq("tenant_id", tenantId)
      .order("updated_at_aviontive", { ascending: false, nullsFirst: false });

    if (pipelineId) {
      query = query.eq("pipeline_id", pipelineId);
    }
    if (stageId) {
      query = query.eq("stage_id", stageId);
    }

    const { data: leads, error, count } = await query.range(from, to);

    if (error) {
      throw error;
    }

    const leadIds = (leads || []).map((lead) => lead.aviontive_lead_id);
    let overridesMap = new Map<string, LeadOverrideRow>();

    if (leadIds.length > 0) {
      const { data: overrides } = await supabase
        .from("lead_overrides")
        .select(
          "lead_id, assigned_to_name, note, reminder_at, reminder_text, kanban_column_id",
        )
        .eq("tenant_id", tenantId)
        .in("lead_id", leadIds);

      overridesMap = new Map(
        (overrides || []).map((override) => [override.lead_id, override]),
      );
    }

    const mappedLeads = (leads || []).map((lead) =>
      mapLead(lead as LeadRow, overridesMap.get(lead.aviontive_lead_id)),
    );

    return NextResponse.json({
      data: mappedLeads,
      total: count || 0,
      page,
      pageSize,
    });
  } catch (error) {
    console.error("Failed to fetch local leads:", error);
    return NextResponse.json(
      { error: "Failed to fetch leads" },
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
    const body = (await request.json().catch(() => ({}))) as Record<
      string,
      unknown
    > & { contact?: Record<string, unknown> };

    const title = String(
      body.title ?? body.name ?? body.contact?.full_name ?? "",
    ).trim();
    const contactName = String(body.contact?.full_name ?? title).trim();
    const email = String(body.contact?.email ?? body.email ?? "").trim();
    const phone = String(body.contact?.phone ?? body.phone ?? "").trim();
    const serviceRequired = String(body.service_required ?? "").trim();

    if (!title && !contactName) {
      return NextResponse.json(
        { error: "Lead title or contact name is required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();
    const now = new Date().toISOString();
    const leadId = randomUUID();
    const notes = [
      body.notes ? String(body.notes).trim() : "",
      serviceRequired ? `Service Required: ${serviceRequired}` : "",
    ]
      .filter(Boolean)
      .join("\n\n")
      .trim();

    const insertRow = {
      aviontive_lead_id: leadId,
      pipeline_id:
        typeof body.pipeline_id === "string" ? body.pipeline_id : null,
      pipeline_name:
        typeof body.pipeline_name === "string" ? body.pipeline_name : null,
      stage_id: typeof body.stage_id === "string" ? body.stage_id : null,
      stage_name: typeof body.stage_name === "string" ? body.stage_name : "New",
      title: title || contactName || "Untitled Lead",
      notes: notes || null,
      source:
        typeof body.source === "string" && body.source.trim()
          ? body.source.trim()
          : "manual",
      temperature: normalizeTemperature(
        typeof body.temperature === "string" ? body.temperature : undefined,
      ),
      contact_full_name: contactName || null,
      contact_email: email || null,
      contact_phone: phone || null,
      channel_name:
        typeof body.channel_name === "string" && body.channel_name.trim()
          ? body.channel_name.trim()
          : "manual",
      external_display_name: contactName || null,
      last_message_at: null,
      labels: Array.isArray(body.labels) ? body.labels : [],
      raw_payload: body.raw_payload ?? body,
      custom_fields:
        body.custom_fields && typeof body.custom_fields === "object"
          ? body.custom_fields
          : null,
      created_at_aviontive: null,
      updated_at_aviontive: null,
      last_synced_at: now,
      tenant_id: tenantId,
    };

    const { data, error } = await supabase
      .from("leads")
      .insert(insertRow)
      .select(
        "aviontive_lead_id, stage_id, title, notes, source, stage_name, contact_full_name, contact_email, contact_phone, channel_name, last_message_at, labels, temperature, pipeline_id, pipeline_name, conversation_id, call_id",
      )
      .single();

    if (error || !data) {
      console.error("Failed to create local lead:", error);
      return NextResponse.json(
        { error: "Failed to create lead" },
        { status: 500 },
      );
    }

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

    return NextResponse.json(mapLead(data as LeadRow), { status: 201 });
  } catch (error) {
    console.error("Failed to create lead:", error);
    return NextResponse.json(
      { error: "Failed to create lead" },
      { status: 500 },
    );
  }
}
