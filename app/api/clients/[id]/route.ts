import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import type { Client } from "@/types/client";
import { NextRequest } from "next/server";

function toClient(row: Record<string, unknown>): Client {
  return {
    id: row.id as string,
    name: row.name as string,
    email: (row.email as string) ?? undefined,
    phone: (row.phone as string) ?? undefined,
    company: (row.company as string) ?? undefined,
    address: (row.address as string) ?? undefined,
    gstNumber: (row.gst_number as string) ?? undefined,
    businessType: (row.business_type as Client["businessType"]) ?? undefined,
    gstRate: (row.gst_rate as number) ?? undefined,
    gstAvailable: (row.gst_available as boolean) ?? true,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  };
}

type RouteContext = { params: Promise<{ id: string }> };

// ── GET /api/clients/[id] ─────────────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(_req);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .single();

  if (error) {
    return Response.json(
      { error: error.message },
      { status: error.code === "PGRST116" ? 404 : 500 },
    );
  }

  return Response.json({ data: toClient(data as Record<string, unknown>) });
}

// ── PATCH /api/clients/[id] ───────────────────────────────────────────────────

export async function PATCH(request: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(request);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();
  const body = await request.json();

  const patch: Record<string, unknown> = {};
  if (body.name !== undefined) patch.name = body.name.trim();
  if (body.email !== undefined) patch.email = body.email?.trim() ?? null;
  if (body.phone !== undefined) patch.phone = body.phone?.trim() ?? null;
  if (body.company !== undefined) patch.company = body.company?.trim() ?? null;
  if (body.address !== undefined) patch.address = body.address?.trim() ?? null;
  if (body.gstNumber !== undefined)
    patch.gst_number = body.gstNumber?.trim() ?? null;
  if (body.businessType !== undefined)
    patch.business_type = body.businessType ?? null;
  if (body.gstRate !== undefined) patch.gst_rate = body.gstRate ?? 18;
  if (body.gstAvailable !== undefined)
    patch.gst_available = body.gstAvailable ?? true;

  const { data, error } = await supabase
    .from("clients")
    .update(patch)
    .eq("id", id)
    .eq("tenant_id", tenantId)
    .select()
    .single();

  if (error) {
    return Response.json(
      { error: error.message },
      { status: error.code === "PGRST116" ? 404 : 500 },
    );
  }

  return Response.json({ data: toClient(data as Record<string, unknown>) });
}

// ── DELETE /api/clients/[id] ──────────────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const tenantId = getTenantIdFromRequest(_req);
  if (!tenantId) {
    return Response.json({ error: "Tenant context required" }, { status: 400 });
  }
  const { id } = await params;
  const supabase = createServerSupabaseClient();

  const { error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .eq("tenant_id", tenantId);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return new Response(null, { status: 204 });
}
