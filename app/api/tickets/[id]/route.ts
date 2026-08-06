import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const tenantId = getTenantIdFromRequest(_req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("tickets")
      .select(
        `*, creator:users!tickets_created_by_fkey(name, email), assignee:users!tickets_assigned_to_fkey(name, email)`,
      )
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const ticket = {
      id: data.id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      category: data.category,
      created_by: data.created_by,
      created_by_name: data.creator?.name ?? null,
      created_by_email: data.creator?.email ?? null,
      assigned_to: data.assigned_to,
      assigned_to_name: data.assignee?.name ?? null,
      assigned_to_email: data.assignee?.email ?? null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return NextResponse.json({ data: ticket });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/tickets/[id]]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }

    const body = await req.json();
    const supabase = createServerSupabaseClient();

    // Fetch current ticket to check assignee-only status change
    const { data: current, error: fetchError } = await supabase
      .from("tickets")
      .select("assigned_to, status")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    // Enforce: only the assigned person can close or resolve
    if (
      body.status &&
      (body.status === "Closed" || body.status === "Resolved")
    ) {
      if (current.assigned_to !== userId) {
        return NextResponse.json(
          {
            error: "Only the assigned person can close or resolve this ticket",
          },
          { status: 403 },
        );
      }
    }

    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = String(body.title).trim();
    if (body.description !== undefined)
      updates.description = String(body.description).trim();
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.status !== undefined) updates.status = body.status;
    if (body.category !== undefined) updates.category = body.category;
    if (body.assigned_to !== undefined)
      updates.assigned_to = body.assigned_to || null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No updates provided" },
        { status: 400 },
      );
    }

    const { data, error } = await supabase
      .from("tickets")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select(
        `*, creator:users!tickets_created_by_fkey(name, email), assignee:users!tickets_assigned_to_fkey(name, email)`,
      )
      .single();

    if (error) throw error;

    const ticket = {
      id: data.id,
      title: data.title,
      description: data.description,
      priority: data.priority,
      status: data.status,
      category: data.category,
      created_by: data.created_by,
      created_by_name: data.creator?.name ?? null,
      created_by_email: data.creator?.email ?? null,
      assigned_to: data.assigned_to,
      assigned_to_name: data.assignee?.name ?? null,
      assigned_to_email: data.assignee?.email ?? null,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return NextResponse.json(ticket);
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[PATCH /api/tickets/[id]]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const userId = getUserIdFromRequest(req);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    // Only creator or assigned person can delete
    const { data: current, error: fetchError } = await supabase
      .from("tickets")
      .select("created_by, assigned_to")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (fetchError || !current) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    if (current.created_by !== userId && current.assigned_to !== userId) {
      return NextResponse.json(
        { error: "Only the creator or assignee can delete this ticket" },
        { status: 403 },
      );
    }

    const { error } = await supabase
      .from("tickets")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);
    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[DELETE /api/tickets/[id]]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
