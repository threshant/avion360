import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

async function requireSuperAdmin(tenantId: string) {
  const supabase = createServerSupabaseClient();

  const { data: userData } = await supabase.auth.getUser();
  if (!userData.user) {
    return {
      supabase,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: currentUser } = await supabase
    .from("users")
    .select("role")
    .eq("id", userData.user.id)
    .eq("tenant_id", tenantId)
    .single();

  if (currentUser?.role !== "super_admin") {
    return {
      supabase,
      error: NextResponse.json(
        { error: "Only super admin can manage permissions" },
        { status: 403 },
      ),
    };
  }

  return { supabase, error: null as NextResponse<unknown> | null };
}

/**
 * GET /api/rbac/permissions/[id] - Get a permission
 */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const { id } = await params;
    const supabase = createServerSupabaseClient();

    const { data: permission, error } = await supabase
      .from("permissions")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .single();

    if (error || !permission) {
      return NextResponse.json(
        { error: "Permission not found" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      id: permission.id,
      key: permission.key,
      label: permission.label,
      description: permission.description,
      icon: permission.icon,
      path: permission.path,
      category: permission.category,
      orderNum: permission.order_num,
      isActive: permission.is_active,
      createdAt: permission.created_at,
      updatedAt: permission.updated_at,
    });
  } catch (error) {
    console.error("Error fetching permission:", error);
    return NextResponse.json(
      { error: "Failed to fetch permission" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/rbac/permissions/[id] - Update a permission
 */
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const { id } = await params;
    const authResult = await requireSuperAdmin(tenantId);
    if (authResult.error) return authResult.error;

    const { supabase } = authResult;
    const body = await req.json();

    const updates: Record<string, unknown> = {};
    if (body.key !== undefined) updates.key = String(body.key).trim();
    if (body.label !== undefined) updates.label = String(body.label).trim();
    if (body.description !== undefined)
      updates.description = body.description ?? null;
    if (body.category !== undefined) updates.category = body.category ?? null;
    if (body.icon !== undefined) updates.icon = body.icon ?? null;
    if (body.path !== undefined) updates.path = body.path ?? null;
    if (body.orderNum !== undefined)
      updates.order_num = Number(body.orderNum) || 0;
    if (body.isActive !== undefined) updates.is_active = Boolean(body.isActive);

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "No fields to update" },
        { status: 400 },
      );
    }

    const { data: permission, error } = await supabase
      .from("permissions")
      .update(updates)
      .eq("id", id)
      .eq("tenant_id", tenantId)
      .select("*")
      .single();

    if (error || !permission) {
      return NextResponse.json(
        { error: error?.message ?? "Permission not found" },
        { status: 500 },
      );
    }

    return NextResponse.json({
      id: permission.id,
      key: permission.key,
      label: permission.label,
      description: permission.description,
      icon: permission.icon,
      path: permission.path,
      category: permission.category,
      orderNum: permission.order_num,
      isActive: permission.is_active,
      createdAt: permission.created_at,
      updatedAt: permission.updated_at,
    });
  } catch (error) {
    console.error("Error updating permission:", error);
    return NextResponse.json(
      { error: "Failed to update permission" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/rbac/permissions/[id] - Delete a permission
 */
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const { id } = await params;
    const authResult = await requireSuperAdmin(tenantId);
    if (authResult.error) return authResult.error;

    const { supabase } = authResult;

    const { error } = await supabase
      .from("permissions")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenantId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting permission:", error);
    return NextResponse.json(
      { error: "Failed to delete permission" },
      { status: 500 },
    );
  }
}
