import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createNotification } from "@/lib/notifications";
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
    const leadIdsParam = request.nextUrl.searchParams.get("leadIds") || "";
    const leadIds = leadIdsParam
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean);

    if (leadIds.length === 0) {
      return NextResponse.json({ data: [] }, { status: 200 });
    }

    const supabase = createServerSupabaseClient();
    const { data, error } = await supabase
      .from("lead_overrides")
      .select(
        "lead_id, assigned_to, assigned_to_name, note, reminder_at, reminder_text, kanban_column_id",
      )
      .eq("tenant_id", tenantId)
      .in("lead_id", leadIds);

    if (error) {
      throw error;
    }

    return NextResponse.json({ data: data || [] }, { status: 200 });
  } catch (error) {
    console.error("Error fetching lead overrides:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead overrides" },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json();
    const leadId = String(body.leadId || "").trim();
    const tenantId = getTenantIdFromRequest(request);

    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }

    if (!leadId) {
      return NextResponse.json(
        { error: "leadId is required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();
    const userId = getUserIdFromRequest(request);

    const upsertPayload: Record<string, unknown> = {
      lead_id: leadId,
      tenant_id: tenantId,
      updated_by: userId,
    };

    if (body.assignedTo !== undefined) {
      const assignedTo =
        body.assignedTo === null ? null : String(body.assignedTo).trim();

      if (!assignedTo) {
        upsertPayload.assigned_to = null;
        upsertPayload.assigned_to_name = null;
      } else {
        const { data: user, error: userError } = await supabase
          .from("users")
          .select("id, name")
          .eq("id", assignedTo)
          .eq("tenant_id", tenantId)
          .single();

        if (userError || !user) {
          return NextResponse.json(
            { error: "Invalid assignee selected" },
            { status: 400 },
          );
        }

        upsertPayload.assigned_to = user.id;
        upsertPayload.assigned_to_name = user.name;
      }
    }

    if (body.note !== undefined) {
      const note = body.note === null ? null : String(body.note).trim();
      upsertPayload.note = note || null;
    }

    if (body.reminderAt !== undefined) {
      const reminderAt =
        body.reminderAt === null ? null : String(body.reminderAt).trim();
      upsertPayload.reminder_at = reminderAt || null;

      const reminderText =
        body.reminderText === null || body.reminderText === undefined
          ? null
          : String(body.reminderText).trim();
      upsertPayload.reminder_text = reminderText || null;
    }

    if (body.columnId !== undefined) {
      const columnId =
        body.columnId === null ? null : String(body.columnId).trim();

      if (columnId) {
        const { data: column, error: columnError } = await supabase
          .from("lead_kanban_columns")
          .select("id")
          .eq("id", columnId)
          .eq("tenant_id", tenantId)
          .single();

        if (columnError || !column) {
          return NextResponse.json(
            { error: "Invalid kanban column selected" },
            { status: 400 },
          );
        }
      }

      upsertPayload.kanban_column_id = columnId || null;
    }

    const { data, error } = await supabase
      .from("lead_overrides")
      .upsert(upsertPayload, { onConflict: "lead_id" })
      .select(
        "lead_id, assigned_to, assigned_to_name, note, reminder_at, reminder_text, kanban_column_id",
      )
      .eq("tenant_id", tenantId)
      .single();

    if (error) {
      throw error;
    }

    if (
      body.assignedTo !== undefined &&
      data?.assigned_to &&
      data.assigned_to !== userId
    ) {
      await createNotification(supabase, {
        userId: data.assigned_to,
        tenantId,
        title: "Lead Assigned",
        message: `A lead has been assigned to you (${leadId}).`,
        category: "lead",
        eventType: "lead_assigned",
        entityType: "lead",
        entityId: leadId,
        actorUserId: userId,
        metadata: {
          leadId,
          assignedToName: data.assigned_to_name ?? null,
        },
      });
    }

    return NextResponse.json({ data }, { status: 200 });
  } catch (error) {
    console.error("Error updating lead override:", error);
    return NextResponse.json(
      { error: "Failed to update lead" },
      { status: 500 },
    );
  }
}
