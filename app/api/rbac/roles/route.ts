import { getTenantIdFromRequest } from "@/lib/auth-middleware";
import { createServerSupabaseClient } from "@/lib/supabaseClient";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/rbac/roles - Get all roles
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

    const { data: roles, error } = await supabase
      .from("roles")
      .select("*")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        roles:
          roles?.map((role) => ({
            id: role.id,
            name: role.name,
            description: role.description,
            isSystem: role.is_system,
            isActive: role.is_active,
            createdAt: role.created_at,
            updatedAt: role.updated_at,
          })) || [],
      },
    });
  } catch (error) {
    console.error("Error fetching roles:", error);
    return NextResponse.json(
      { error: "Failed to fetch roles" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/rbac/roles - Create a new role
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

    // Check if user is super_admin
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
        { error: "Only super admin can create roles" },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { name, description } = body;

    if (!name || typeof name !== "string") {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const { data: role, error } = await supabase
      .from("roles")
      .insert([{ name, description, is_system: false, tenant_id: tenantId }])
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      {
        id: role.id,
        name: role.name,
        description: role.description,
        isSystem: role.is_system,
        isActive: role.is_active,
        createdAt: role.created_at,
        updatedAt: role.updated_at,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Error creating role:", error);
    return NextResponse.json(
      { error: "Failed to create role" },
      { status: 500 },
    );
  }
}
