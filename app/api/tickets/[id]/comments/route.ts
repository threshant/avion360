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
    const { id: ticketId } = await params;
    const supabase = createServerSupabaseClient();

    const { data, error } = await supabase
      .from("ticket_comments")
      .select("*, user:users!ticket_comments_user_id_fkey(name, email)")
      .eq("ticket_id", ticketId)
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: true });

    if (error) throw error;

    const comments = (data || []).map((c) => ({
      id: c.id,
      ticket_id: c.ticket_id,
      user_id: c.user_id,
      user_name: c.user?.name ?? null,
      user_email: c.user?.email ?? null,
      content: c.content,
      created_at: c.created_at,
    }));

    return NextResponse.json({ data: comments });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[GET /api/tickets/[id]/comments]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const { id: ticketId } = await params;
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
    const content = String(body.content || "").trim();

    if (!content) {
      return NextResponse.json(
        { error: "Comment content is required" },
        { status: 400 },
      );
    }

    const supabase = createServerSupabaseClient();

    // Verify ticket exists
    const { data: ticket, error: ticketError } = await supabase
      .from("tickets")
      .select("id")
      .eq("id", ticketId)
      .eq("tenant_id", tenantId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json({ error: "Ticket not found" }, { status: 404 });
    }

    const { data, error } = await supabase
      .from("ticket_comments")
      .insert({
        ticket_id: ticketId,
        user_id: userId,
        content,
        tenant_id: tenantId,
      })
      .select("*, user:users!ticket_comments_user_id_fkey(name, email)")
      .single();

    if (error) throw error;

    const comment = {
      id: data.id,
      ticket_id: data.ticket_id,
      user_id: data.user_id,
      user_name: data.user?.name ?? null,
      user_email: data.user?.email ?? null,
      content: data.content,
      created_at: data.created_at,
    };

    return NextResponse.json(comment, { status: 201 });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[POST /api/tickets/[id]/comments]", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
