import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/rbac/permissions - Get all permissions (optionally filtered by category)
 */
export async function GET(req: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const supabase = createServerSupabaseClient();
    const { searchParams } = new URL(req.url);
    const category = searchParams.get("category");

    let query = supabase
      .from("permissions")
      .select("*")
      .eq("is_active", true)
      .eq("tenant_id", tenantId)
      .order("order_num", { ascending: true });

    if (category) {
      query = query.eq("category", category);
    }

    const { data: permissions, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        permissions:
          permissions?.map((perm) => ({
            id: perm.id,
            key: perm.key,
            label: perm.label,
            description: perm.description,
            icon: perm.icon,
            path: perm.path,
            category: perm.category,
            orderNum: perm.order_num,
            isActive: perm.is_active,
            createdAt: perm.created_at,
            updatedAt: perm.updated_at,
          })) || [],
      },
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    return NextResponse.json(
      { error: "Failed to fetch permissions" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/rbac/permissions - Create a permission
 */
export async function POST(req: NextRequest) {
  try {
    const tenantId = getTenantIdFromRequest(req);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Tenant context required" },
        { status: 400 },
      );
    }
    const supabase = createServerSupabaseClient();

    const { data: userData } = await supabase.auth.getUser();
    if (!userData.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", userData.user.id)
      .eq("tenant_id", tenantId)
      .single();

    if (currentUser?.role !== "super_admin") {
      return NextResponse.json(
        { error: "Only super admin can create permissions" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const {
      key,
      label,
      description,
      category,
      icon,
      path,
      orderNum,
      isActive,
    } = body ?? {};

    if (!key || typeof key !== "string") {
      return NextResponse.json(
        { error: "Permission key is required" },
        { status: 400 },
      );
    }

    if (!label || typeof label !== "string") {
      return NextResponse.json(
        { error: "Permission label is required" },
        { status: 400 },
      );
    }

    const { data: permission, error } = await supabase
      .from("permissions")
      .insert([
        {
          key: key.trim(),
          label: label.trim(),
          description: description ?? null,
          category: category ?? null,
          icon: icon ?? null,
          path: path ?? null,
          order_num: Number.isFinite(Number(orderNum)) ? Number(orderNum) : 0,
          is_active: typeof isActive === "boolean" ? isActive : true,
          tenant_id: tenantId,
        },
      ])
      .select("*")
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
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
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating permission:", error);
    return NextResponse.json(
      { error: "Failed to create permission" },
      { status: 500 },
    );
  }
}
