import {
  getTenantIdFromRequest,
  getUserIdFromRequest,
} from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
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
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const priority = searchParams.get("priority");
    const category = searchParams.get("category");
    const assignedTo = searchParams.get("assigned_to");
    const search = searchParams.get("search");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "20");

    let query = supabase
      .from("tickets")
      .select(
        `*, creator:users!tickets_created_by_fkey(name, email), assignee:users!tickets_assigned_to_fkey(name, email)`,
        { count: "exact" },
      )
      .eq("tenant_id", tenantId);

    if (status) query = query.eq("status", status);
    if (priority) query = query.eq("priority", priority);
    if (category) query = query.eq("category", category);
    if (assignedTo) query = query.eq("assigned_to", assignedTo);
    if (search)
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

    const offset = (page - 1) * pageSize;
    const { data, count, error } = await query
      .order("created_at", { ascending: false })
      .range(offset, offset + pageSize - 1);

    if (error) throw error;

    const ticketIds = (data || []).map((t) => t.id);
    const commentCounts: Record<string, number> = {};
    if (ticketIds.length > 0) {
      const { data: counts } = await supabase
        .from("ticket_comments")
        .select("ticket_id")
        .eq("tenant_id", tenantId)
        .in("ticket_id", ticketIds);
      if (counts) {
        for (const row of counts) {
          commentCounts[row.ticket_id] =
            (commentCounts[row.ticket_id] || 0) + 1;
        }
      }
    }

    const mapped = (data || []).map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      priority: t.priority,
      status: t.status,
      category: t.category,
      created_by: t.created_by,
      created_by_name: t.creator?.name ?? null,
      created_by_email: t.creator?.email ?? null,
      assigned_to: t.assigned_to,
      assigned_to_name: t.assignee?.name ?? null,
      assigned_to_email: t.assignee?.email ?? null,
      comment_count: commentCounts[t.id] || 0,
      created_at: t.created_at,
      updated_at: t.updated_at,
    }));

    return NextResponse.json({
      data: mapped,
      total: count || 0,
      page,
      pageSize,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/tickets]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
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
    const title = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const priority = body.priority || "Medium";
    const category = body.category || "General";
    const assigned_to = body.assigned_to || null;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("tickets")
      .insert({
        title,
        description,
        priority,
        category,
        assigned_to,
        created_by: userId,
        status: "Open",
        tenant_id: tenantId,
      })
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
      comment_count: 0,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };

    return NextResponse.json(ticket, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/tickets]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
